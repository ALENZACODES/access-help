import { describe, expect, it } from 'vitest';
import {
  MAX_AREA_LENGTH,
  MAX_OSM_CHARS,
  MAX_OSM_ELEMENTS,
  MAX_PLACE_NAME,
  OPEN_LICENCES,
  OSM_LICENCE,
  OSM_SOURCE,
  PLACE_KINDS,
  TAG_RULES,
  areaFromTags,
  cleanTags,
  convertOsm,
  decodeXml,
  dropSuperseded,
  effectiveInfo,
  effectiveStatus,
  kindFromTags,
  mergeRecords,
  nameFromTags,
  osmDay,
  osmPlaceId,
  osmToPlaces,
  osmUrl,
  readOsm,
  readOsmXml,
  readTags,
  recordDateSpan,
  recordsFromCsv,
  recordsToCsv,
  tallyByFeature,
  validateProvenance,
  xmlAttributes,
  type OsmElement,
  type Place,
} from './index';
import { TERMS } from './plainTerms';

const today = '2026-11-19';
const node = (id: number, tags: Record<string, string>, timestamp?: string): Record<string, unknown> => ({ type: 'node', id, lat: 43.6, lon: -79.4, tags, ...(timestamp === undefined ? {} : { timestamp }) });
const overpass = (elements: unknown[], base?: string): string => JSON.stringify({ version: 0.6, generator: 'Overpass API', ...(base === undefined ? {} : { osm3s: { timestamp_osm_base: base } }), elements });
const feature = (ref: string, properties: Record<string, unknown>): Record<string, unknown> => ({ type: 'Feature', id: ref, properties: { '@id': ref, ...properties }, geometry: { type: 'Point', coordinates: [-79.4, 43.6] } });
const geojson = (features: unknown[]): string => JSON.stringify({ type: 'FeatureCollection', features });
const el = (tags: Record<string, string>, o: Partial<OsmElement> = {}): OsmElement => ({ type: 'node', id: 1, tags, date: '2026-10-01', ...o });
const statuses = (tags: Record<string, string>): string[] => readTags(tags).claims.map((c) => `${c.termId}:${c.status}`);

describe('reading the day of a timestamp', () => {
  it('takes the day of a timestamp or of a plain date', () => {
    expect(osmDay('2026-10-01T12:34:56Z')).toBe('2026-10-01');
    expect(osmDay('2026-10-01T12:34:56+00:00')).toBe('2026-10-01');
    expect(osmDay('2026-10-01')).toBe('2026-10-01');
  });
  it('gives null for anything else', () => {
    for (const value of ['', '2026-02-30T00:00:00Z', '2026-10-01 noon', '01/10/2026', 'yesterday', 20261001, null, undefined, {}]) expect(osmDay(value), String(value)).toBeNull();
  });
});

describe('cleanTags', () => {
  it('keeps text tags, trimmed, and drops everything else', () => {
    expect(cleanTags({ name: '  Main   Library ', ramp: 'yes', level: 2, empty: '  ', ' ': 'x', nested: { a: 'b' }, '@id': 'node/1' })).toEqual({ name: 'Main Library', ramp: 'yes' });
  });
  it('gives no tags for something that is not a set of tags', () => {
    for (const raw of [null, undefined, 'x', 3, ['a']]) expect(cleanTags(raw)).toEqual({});
  });
});

describe('readOsm: refusing what is not map data', () => {
  const problem = (text: string): readonly string[] => readOsm(text).problems;
  it('says why', () => {
    expect(problem('')).toEqual(['empty']);
    expect(problem('  \n ')).toEqual(['empty']);
    expect(problem('{not json')).toEqual(['not-json']);
    expect(problem('<html><body>hello</body></html>')).toEqual(['not-map-data']);
    expect(problem('<?xml version="1.0"?><gpx></gpx>')).toEqual(['not-map-data']);
    expect(problem('[]')).toEqual(['not-map-data']);
    expect(problem('"text"')).toEqual(['not-map-data']);
    expect(problem('{"elements":"many"}')).toEqual(['not-map-data']);
    expect(problem('{"type":"Feature","properties":{}}')).toEqual(['not-map-data']);
    expect(problem('{"type":"FeatureCollection"}')).toEqual(['not-map-data']);
  });
  it('refuses too much text and too many elements', () => {
    expect(problem(' '.repeat(MAX_OSM_CHARS) + '{}')).toEqual(['too-large']);
    expect(problem(overpass(Array.from({ length: MAX_OSM_ELEMENTS + 1 }, (_, i) => node(i + 1, {}))))).toEqual(['too-many-elements']);
    expect(problem(overpass(Array.from({ length: MAX_OSM_ELEMENTS }, (_, i) => node(i + 1, {}))))).toEqual([]);
  });
  it('reads nothing when there is a problem', () => {
    expect(readOsm('{not json')).toEqual({ elements: [], problems: ['not-json'], format: null, skipped: 0 });
  });
});

describe('readOsm: an Overpass export', () => {
  it('reads nodes, ways and relations with their tags and the day they last changed', () => {
    const read = readOsm(overpass([node(1, { name: 'Library', ramp: 'yes' }, '2026-10-01T10:00:00Z'), { type: 'way', id: 2, nodes: [1, 2], tags: { name: 'Hall' } }, { type: 'relation', id: 3, members: [], tags: {} }]));
    expect(read.format).toBe('overpass');
    expect(read.problems).toEqual([]);
    expect(read.elements).toEqual([
      { type: 'node', id: 1, tags: { name: 'Library', ramp: 'yes' }, date: '2026-10-01' },
      { type: 'way', id: 2, tags: { name: 'Hall' } },
      { type: 'relation', id: 3, tags: {} },
    ]);
  });
  it('reads the date of the export', () => {
    expect(readOsm(overpass([], '2026-11-01T00:00:00Z')).baseDate).toBe('2026-11-01');
    expect('baseDate' in readOsm(overpass([]))).toBe(false);
    expect('baseDate' in readOsm(overpass([], 'soon'))).toBe(false);
  });
  it('leaves out entries that are not elements, and an element that comes twice', () => {
    const read = readOsm(overpass([node(1, { name: 'A' }), node(1, { name: 'A again' }), { type: 'area', id: 5 }, { type: 'node', id: -1 }, { type: 'node', id: 1.5 }, { type: 'node' }, null, 'x', node(2, {})]));
    expect(read.elements.map((e) => `${e.type}/${e.id}`)).toEqual(['node/1', 'node/2']);
    expect(read.elements[0]?.tags.name).toBe('A');
    expect(read.skipped).toBe(7);
  });
  it('tells a node and a way with the same number apart', () => {
    const read = readOsm(overpass([node(7, {}), { type: 'way', id: 7, tags: {} }]));
    expect(read.elements).toHaveLength(2);
    expect(read.skipped).toBe(0);
  });
  it('reads an element with no tags as having none', () => {
    expect(readOsm(overpass([{ type: 'node', id: 4 }])).elements).toEqual([{ type: 'node', id: 4, tags: {} }]);
  });
});

describe('readOsm: GeoJSON made from map data', () => {
  it('reads features whose tags are their properties', () => {
    const read = readOsm(geojson([feature('node/11', { name: 'Library', ramp: 'yes', '@timestamp': '2026-10-01T10:00:00Z' }), feature('way/12', { name: 'Hall' })]));
    expect(read.format).toBe('geojson');
    expect(read.elements).toEqual([
      { type: 'node', id: 11, tags: { name: 'Library', ramp: 'yes' }, date: '2026-10-01' },
      { type: 'way', id: 12, tags: { name: 'Hall' } },
    ]);
  });
  it('reads features that keep their tags and date apart', () => {
    const read = readOsm(geojson([{ type: 'Feature', id: 'node/21', properties: { type: 'node', id: 21, tags: { name: 'Pool', elevator: 'no' }, meta: { timestamp: '2026-09-09T00:00:00Z' } }, geometry: null }]));
    expect(read.elements).toEqual([{ type: 'node', id: 21, tags: { name: 'Pool', elevator: 'no' }, date: '2026-09-09' }]);
  });
  it('leaves out features that do not say which element they are', () => {
    const read = readOsm(geojson([{ type: 'Feature', properties: { name: 'Nowhere' }, geometry: null }, feature('area/3', {}), feature('node/x', {}), { type: 'Point' }, feature('node/31', { name: 'Kept' })]));
    expect(read.elements.map((e) => e.id)).toEqual([31]);
    expect(read.skipped).toBe(4);
  });
});

describe('readOsm: the export of the map site', () => {
  const xml = (body: string, rootAttrs = ''): string => `<?xml version="1.0" encoding="UTF-8"?>\n<osm version="0.6" generator="CGImap"${rootAttrs}>\n${body}\n</osm>`;
  it('reads nodes, ways and relations with their tags and the day they last changed', () => {
    const read = readOsm(
      xml(
        ' <node id="1" visible="true" version="3" timestamp="2026-10-01T10:00:00Z" lat="43.6" lon="-79.4">\n  <tag k="name" v="Library"/>\n  <tag k="ramp" v="yes"/>\n </node>\n' +
          ' <node id="2" lat="43.6" lon="-79.4"/>\n <way id="3" timestamp="2026-09-01T00:00:00Z">\n  <nd ref="1"/>\n  <nd ref="2"/>\n  <tag k="name" v="Hall"/>\n </way>\n' +
          ' <relation id="4">\n  <member type="node" ref="1" role=""/>\n  <tag k="type" v="site"/>\n </relation>',
      ),
    );
    expect(read.format).toBe('xml');
    expect(read.problems).toEqual([]);
    expect(read.skipped).toBe(0);
    expect(read.elements).toEqual([
      { type: 'node', id: 1, tags: { name: 'Library', ramp: 'yes' }, date: '2026-10-01' },
      { type: 'node', id: 2, tags: {} },
      { type: 'way', id: 3, tags: { name: 'Hall' }, date: '2026-09-01' },
      { type: 'relation', id: 4, tags: { type: 'site' } },
    ]);
  });
  it('does not take a member of a relation for an element', () => {
    const read = readOsmXml(xml(' <relation id="4"><member type="node" ref="77" role=""/><member type="way" ref="78" role=""/></relation>'));
    expect(read.elements.map((e) => `${e.type}/${e.id}`)).toEqual(['relation/4']);
  });
  it('decodes names with special characters, in double or single quotes', () => {
    const read = readOsmXml(xml(` <node id="1"><tag k="name" v="Fish &amp; Chips &quot;Nord&quot; &lt;1&gt; caf&#233; &#x2603;"/><tag k='note' v='it&apos;s here'/></node>`));
    expect(read.elements[0]?.tags).toEqual({ name: 'Fish & Chips "Nord" <1> café ☃', note: "it's here" });
  });
  it('leaves an entity it does not know as written', () => {
    expect(decodeXml('a &nbsp; b &#0; c &#xD800; d &amp;amp; e')).toBe('a &nbsp; b &#0; c &#xD800; d &amp; e');
    expect(decodeXml('plain')).toBe('plain');
  });
  it('reads attributes, keeping the first of a name written twice', () => {
    expect(xmlAttributes(` id="5" name='a b' k = "x" id="6" data-x="1"`)).toEqual({ id: '5', name: 'a b', k: 'x', 'data-x': '1' });
    expect(xmlAttributes('')).toEqual({});
    expect(xmlAttributes('toString="x"')).toEqual({ toString: 'x' });
  });
  it('keeps the first of a tag written twice, and ignores a tag with no key or no value', () => {
    const read = readOsmXml(xml(' <node id="1"><tag k="ramp" v="yes"/><tag k="ramp" v="no"/><tag k="elevator"/><tag v="x"/></node>'));
    expect(read.elements[0]?.tags).toEqual({ ramp: 'yes' });
  });
  it('leaves out an element with no usable number, and one that comes twice', () => {
    const read = readOsmXml(xml(' <node id="1"/>\n <node id="1"><tag k="name" v="again"/></node>\n <node id="-4"/>\n <node/>\n <way id="x"></way>\n <node id="2"/>'));
    expect(read.elements.map((e) => e.id)).toEqual([1, 2]);
    expect(read.skipped).toBe(4);
  });
  it('reads the date of the export from Overpass', () => {
    expect(readOsmXml(xml(' <meta osm_base="2026-11-01T00:00:00Z"/>\n <node id="1"/>')).baseDate).toBe('2026-11-01');
    expect('baseDate' in readOsmXml(xml(' <node id="1"/>'))).toBe(false);
  });
  it('reads an export with no elements as none', () => {
    expect(readOsm('<osm version="0.6"></osm>')).toEqual({ elements: [], problems: [], format: 'xml', skipped: 0 });
    expect(readOsm('  \n<osm/>').elements).toEqual([]);
  });
  it('refuses too many elements', () => {
    const many = Array.from({ length: MAX_OSM_ELEMENTS + 1 }, (_, i) => `<node id="${i + 1}"/>`).join('');
    expect(readOsmXml(xml(many)).problems).toEqual(['too-many-elements']);
  });
  it('gives the same places as the same data from Overpass', () => {
    const fromXml = osmToPlaces(xml(' <node id="1" timestamp="2026-10-01T10:00:00Z"><tag k="name" v="Library"/><tag k="amenity" v="library"/><tag k="ramp" v="yes"/></node>'), today);
    const fromJson = osmToPlaces(overpass([node(1, { name: 'Library', amenity: 'library', ramp: 'yes' }, '2026-10-01T10:00:00Z')]), today);
    expect(fromXml.format).toBe('xml');
    expect(fromXml.places).toEqual(fromJson.places);
    expect(fromXml.counts).toEqual(fromJson.counts);
  });
  it('treats markup inside a value as text', () => {
    const read = readOsmXml(xml(' <node id="1"><tag k="name" v="&lt;script&gt;alert(1)&lt;/script&gt;"/></node>'));
    expect(read.elements[0]?.tags.name).toBe('<script>alert(1)</script>');
  });
});

describe('map data that changed since it was last brought in', () => {
  const at = (date: string, ramp: string, id = 1): Place[] => [...convertOsm({ elements: [el({ name: 'Library', ramp, elevator: 'yes' }, { id, date })] }, today).places];
  const other: Place = { id: 'hall', name: 'Hall', claims: [{ termId: 'ramp', status: 'present', provenance: { source: 'City open data', licence: 'CC0-1.0', date: '2020-01-01' } }] };
  it('takes out the older record of the same element and feature', () => {
    const held = [...at('2026-06-01', 'yes'), other];
    const result = dropSuperseded(held, at('2026-10-01', 'no'));
    expect(result.replaced).toBe(2);
    expect(result.places[0]?.claims).toEqual([]);
    expect(result.places[1]).toBe(other);
    const merged = mergeRecords(result.places, at('2026-10-01', 'no'));
    expect(merged.places[0]?.claims.map((c) => `${c.termId}:${c.status}:${c.provenance?.date}`)).toEqual(['ramp:absent:2026-10-01', 'elevator:present:2026-10-01']);
  });
  it('keeps a record that the new data does not give again', () => {
    const held = at('2026-06-01', 'yes');
    const incoming = [...convertOsm({ elements: [el({ name: 'Library', elevator: 'yes' }, { date: '2026-10-01' })] }, today).places];
    const result = dropSuperseded(held, incoming);
    expect(result.replaced).toBe(1);
    expect(result.places[0]?.claims.map((c) => c.termId)).toEqual(['ramp']);
  });
  it('replaces nothing when the data is the same or older, and returns the same list', () => {
    const held = at('2026-06-01', 'yes');
    expect(dropSuperseded(held, at('2026-06-01', 'no'))).toEqual({ places: held, replaced: 0 });
    expect(dropSuperseded(held, at('2026-01-01', 'no')).places).toBe(held);
    expect(dropSuperseded(held, []).places).toBe(held);
    expect(dropSuperseded([], at('2026-06-01', 'yes'))).toEqual({ places: [], replaced: 0 });
  });
  it('never touches a record from another source, or from another element', () => {
    const cityOnLib: Place = { ...(at('2026-06-01', 'yes')[0] as Place), claims: [{ termId: 'ramp', status: 'present', provenance: { source: 'City open data', licence: 'CC0-1.0', date: '2020-01-01', url: 'https://www.openstreetmap.org/node/1' } }] };
    expect(dropSuperseded([cityOnLib, other], at('2026-10-01', 'no')).replaced).toBe(0);
    expect(dropSuperseded(at('2026-06-01', 'yes', 2), at('2026-10-01', 'no', 1)).replaced).toBe(0);
    const unsourced: Place = { id: 'osm-node-1', name: 'Library', claims: [{ termId: 'ramp', status: 'present' }] };
    expect(dropSuperseded([unsourced], at('2026-10-01', 'no')).places[0]).toBe(unsourced);
  });
  it('does not change the lists it was given', () => {
    const held = at('2026-06-01', 'yes');
    const incoming = at('2026-10-01', 'no');
    const before = JSON.stringify([held, incoming]);
    dropSuperseded(held, incoming);
    expect(JSON.stringify([held, incoming])).toBe(before);
  });
});

describe('what the records made add up to', () => {
  const places = convertOsm(
    {
      elements: [
        el({ name: 'A', ramp: 'yes', elevator: 'no' }, { id: 1, date: '2026-10-01' }),
        el({ name: 'B', ramp: 'no', automatic_door: 'button' }, { id: 2, date: '2025-02-03' }),
        el({ name: 'C', ramp: 'yes' }, { id: 3, date: '2026-11-19' }),
      ],
    },
    today,
  ).places;
  it('counts the records for each feature a tag is read for, in the order of the rules', () => {
    const tally = tallyByFeature(places);
    expect(tally.map((t) => t.termId)).toEqual(TAG_RULES.map((r) => r.termId));
    expect(tally.find((t) => t.termId === 'ramp')).toEqual({ termId: 'ramp', available: 2, notAvailable: 1 });
    expect(tally.find((t) => t.termId === 'elevator')).toEqual({ termId: 'elevator', available: 0, notAvailable: 1 });
    expect(tally.find((t) => t.termId === 'accessible-parking')).toEqual({ termId: 'accessible-parking', available: 0, notAvailable: 0 });
    expect(tally.reduce((n, t) => n + t.available + t.notAvailable, 0)).toBe(5);
  });
  it('counts nothing for no places, and does not count a record that says unknown', () => {
    expect(tallyByFeature([]).every((t) => t.available === 0 && t.notAvailable === 0)).toBe(true);
    expect(tallyByFeature([{ id: 'x', name: 'X', claims: [{ termId: 'ramp', status: 'unknown' }] }]).find((t) => t.termId === 'ramp')).toEqual({ termId: 'ramp', available: 0, notAvailable: 0 });
  });
  it('finds the oldest and the newest date', () => {
    expect(recordDateSpan(places)).toEqual({ oldest: '2025-02-03', newest: '2026-11-19' });
    expect(recordDateSpan(places.slice(0, 1))).toEqual({ oldest: '2026-10-01', newest: '2026-10-01' });
    expect(recordDateSpan([])).toBeNull();
    expect(recordDateSpan([{ id: 'x', name: 'X', claims: [{ termId: 'ramp', status: 'present' }, { termId: 'elevator', status: 'present', provenance: { source: 's', licence: 'CC0-1.0', date: 'soon' } }] }])).toBeNull();
  });
});

describe('the tags that are read', () => {
  it('are each about a feature of the glossary, and never about two', () => {
    const ids = TAG_RULES.map((r) => r.termId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(TERMS.some((t) => t.id === id), id).toBe(true);
    for (const rule of TAG_RULES) expect(rule.keys.length).toBeGreaterThan(0);
  });
  it('do not cover the clear width of a door or grab bars', () => {
    const ids = TAG_RULES.map((r) => r.termId);
    expect(ids).not.toContain('clear-door-width');
    expect(ids).not.toContain('grab-bar');
  });
  it('read a plain yes or no', () => {
    expect(statuses({ ramp: 'yes', elevator: 'no', 'toilets:wheelchair': 'yes', automatic_door: 'no' })).toEqual(['automatic-door:absent', 'ramp:present', 'elevator:absent', 'accessible-washroom:present']);
    expect(statuses({ ramp: 'YES' })).toEqual(['ramp:present']);
  });
  it('make no record for a value that is not a plain yes or no', () => {
    for (const value of ['limited', 'unknown', 'maybe', 'designated', '']) {
      expect(statuses({ ramp: value, elevator: value, 'toilets:wheelchair': value }), value).toEqual([]);
    }
  });
  it('read how a door opens by itself', () => {
    for (const value of ['yes', 'button', 'motion', 'floor', 'continuous', 'slowdown_button']) expect(statuses({ automatic_door: value }), value).toEqual(['automatic-door:present']);
    expect(statuses({ automatic_door: 'no' })).toEqual(['automatic-door:absent']);
    expect(statuses({ automatic_door: 'broken' })).toEqual([]);
  });
  it('read reserved parking as a count or as yes or no', () => {
    expect(statuses({ 'capacity:disabled': '2' })).toEqual(['accessible-parking:present']);
    expect(statuses({ 'capacity:disabled': '0' })).toEqual(['accessible-parking:absent']);
    expect(statuses({ 'capacity:disabled': 'yes' })).toEqual(['accessible-parking:present']);
    expect(statuses({ 'capacity:disabled': 'no' })).toEqual(['accessible-parking:absent']);
    expect(statuses({ 'capacity:disabled': 'some' })).toEqual([]);
    expect(statuses({ parking_space: 'disabled' })).toEqual(['accessible-parking:present']);
    expect(statuses({ parking_space: 'normal' })).toEqual([]);
  });
  it('read a count of steps only on an entrance', () => {
    expect(statuses({ entrance: 'main', step_count: '0' })).toEqual(['step-free-entrance:present']);
    expect(statuses({ entrance: 'yes', step_count: '3' })).toEqual(['step-free-entrance:absent']);
    expect(statuses({ step_count: '0' })).toEqual([]);
    expect(statuses({ highway: 'steps', step_count: '12' })).toEqual([]);
    expect(statuses({ entrance: 'main', step_count: 'few' })).toEqual([]);
  });
  it('never turn the general wheelchair tag into a record about a place', () => {
    for (const value of ['yes', 'no', 'limited', 'designated']) {
      expect(statuses({ wheelchair: value }), value).toEqual([]);
      expect(statuses({ wheelchair: value, amenity: 'library', name: 'Library' }), value).toEqual([]);
    }
  });
  it('read the wheelchair tag of an element that is itself a washroom', () => {
    expect(statuses({ amenity: 'toilets', wheelchair: 'yes' })).toEqual(['accessible-washroom:present']);
    expect(statuses({ amenity: 'toilets', wheelchair: 'no' })).toEqual(['accessible-washroom:absent']);
    expect(statuses({ amenity: 'toilets', wheelchair: 'limited' })).toEqual([]);
  });
  it('make no record when two tags of one element disagree, and count it', () => {
    expect(readTags({ ramp: 'yes', 'ramp:wheelchair': 'no' })).toEqual({ claims: [], conflicts: 1 });
    expect(readTags({ ramp: 'yes', 'ramp:wheelchair': 'yes' })).toEqual({ claims: [{ termId: 'ramp', status: 'present' }], conflicts: 0 });
    expect(readTags({ ramp: 'limited', 'ramp:wheelchair': 'no' })).toEqual({ claims: [{ termId: 'ramp', status: 'absent' }], conflicts: 0 });
    expect(readTags({ amenity: 'toilets', wheelchair: 'yes', 'toilets:wheelchair': 'no', elevator: 'yes' })).toEqual({ claims: [{ termId: 'elevator', status: 'present' }], conflicts: 1 });
  });
  it('give at most one answer for each feature, in the order of the rules', () => {
    const all = readTags({ entrance: 'main', step_count: '0', automatic_door: 'button', ramp: 'yes', elevator: 'yes', 'toilets:wheelchair': 'yes', 'capacity:disabled': '1' });
    expect(all.claims.map((c) => c.termId)).toEqual(TAG_RULES.map((r) => r.termId));
    expect(readTags({})).toEqual({ claims: [], conflicts: 0 });
  });
});

describe('the name, kind and town of an element', () => {
  it('takes the name, then the English or French name', () => {
    expect(nameFromTags({ name: ' Main  Library ', 'name:fr': 'Bibliothèque' })).toBe('Main Library');
    expect(nameFromTags({ 'name:en': 'Library', 'name:fr': 'Bibliothèque' })).toBe('Library');
    expect(nameFromTags({ 'name:fr': 'Bibliothèque' })).toBe('Bibliothèque');
    expect(nameFromTags({ amenity: 'library' })).toBe('');
  });
  it('leaves out a name that is too long, and does not cut it', () => {
    expect(nameFromTags({ name: 'x'.repeat(MAX_PLACE_NAME) })).toHaveLength(MAX_PLACE_NAME);
    expect(nameFromTags({ name: 'x'.repeat(MAX_PLACE_NAME + 1) })).toBe('');
  });
  it('names a kind from this app’s list', () => {
    const cases: [Record<string, string>, string | null][] = [
      [{ amenity: 'library' }, 'library'],
      [{ amenity: 'community_centre' }, 'community-centre'],
      [{ amenity: 'fast_food' }, 'restaurant'],
      [{ amenity: 'townhall' }, 'government'],
      [{ amenity: 'hospital' }, 'health-centre'],
      [{ amenity: 'cinema' }, 'theatre'],
      [{ amenity: 'place_of_worship' }, 'worship'],
      [{ shop: 'supermarket' }, 'grocery'],
      [{ shop: 'books' }, 'shop'],
      [{ leisure: 'park' }, 'park'],
      [{ leisure: 'swimming_pool' }, 'recreation'],
      [{ tourism: 'hotel' }, 'hotel'],
      [{ railway: 'station' }, 'transit'],
      [{ public_transport: 'station' }, 'transit'],
      [{ amenity: 'bench' }, null],
      [{ shop: 'vacant' }, null],
      [{ shop: 'no' }, null],
      [{ tourism: 'viewpoint' }, null],
      [{ amenity: 'constructor' }, null],
      [{ amenity: 'toString' }, null],
      [{}, null],
    ];
    for (const [tags, kind] of cases) expect(kindFromTags(tags), JSON.stringify(tags)).toBe(kind);
  });
  it('only names kinds that exist, and never guesses "other"', () => {
    const kinds = new Set<string>(PLACE_KINDS);
    for (const amenity of ['library', 'cafe', 'restaurant', 'pub', 'pharmacy', 'bank', 'school', 'college', 'university', 'courthouse', 'post_office', 'clinic', 'doctors', 'theatre', 'bus_station']) {
      const kind = kindFromTags({ amenity });
      expect(kind !== null && kinds.has(kind), amenity).toBe(true);
      expect(kind).not.toBe('other');
    }
  });
  it('prefers the amenity when an element has several such tags', () => {
    expect(kindFromTags({ amenity: 'cafe', shop: 'books' })).toBe('cafe');
    expect(kindFromTags({ amenity: 'bench', shop: 'books' })).toBe('shop');
  });
  it('takes the town from the address, when it fits', () => {
    expect(areaFromTags({ 'addr:city': '  Richmond   Hill ' })).toBe('Richmond Hill');
    expect(areaFromTags({ 'addr:city': 'x'.repeat(MAX_AREA_LENGTH) })).toHaveLength(MAX_AREA_LENGTH);
    expect(areaFromTags({ 'addr:city': 'x'.repeat(MAX_AREA_LENGTH + 1) })).toBe('');
    expect(areaFromTags({ 'addr:street': 'Main Street' })).toBe('');
  });
  it('makes an id and a link from the kind of element and its number', () => {
    expect(osmPlaceId({ type: 'node', id: 123 })).toBe('osm-node-123');
    expect(osmPlaceId({ type: 'way', id: 123 })).toBe('osm-way-123');
    expect(osmUrl({ type: 'relation', id: 9 })).toBe('https://www.openstreetmap.org/relation/9');
  });
});

describe('convertOsm', () => {
  const lib = el({ name: 'Library', amenity: 'library', 'addr:city': 'Riverside', ramp: 'yes', 'toilets:wheelchair': 'no', wheelchair: 'yes' }, { id: 1 });
  it('makes a place with one record for each tag that is read', () => {
    const { places, counts } = convertOsm({ elements: [lib] }, today);
    const provenance = { source: 'OpenStreetMap contributors', licence: 'ODbL-1.0', date: '2026-10-01', url: 'https://www.openstreetmap.org/node/1' };
    expect(places).toEqual([
      { id: 'osm-node-1', name: 'Library', claims: [{ termId: 'ramp', status: 'present', provenance }, { termId: 'accessible-washroom', status: 'absent', provenance }], info: { kind: 'library', area: 'Riverside', provenance } },
    ]);
    expect(counts).toEqual({ elements: 1, places: 1, records: 2, noFeatureTags: 0, generalOnly: 0, noName: 0, noDate: 0, conflicts: 0 });
  });
  it('gives every record a source, an open licence, a date and a link that the list accepts', () => {
    expect(OSM_SOURCE).toBe('OpenStreetMap contributors');
    expect((OPEN_LICENCES as readonly string[]).includes(OSM_LICENCE)).toBe(true);
    const place = convertOsm({ elements: [lib] }, today).places[0] as Place;
    for (const claim of place.claims) {
      expect(validateProvenance(claim.provenance, today)).toEqual([]);
      expect(effectiveStatus(claim)).toBe(claim.status);
      expect('tier' in (claim.provenance as object)).toBe(false);
    }
    expect(effectiveInfo(place)).toMatchObject({ kind: 'library', area: 'Riverside' });
  });
  it('keeps a place without a kind or a town free of both', () => {
    const place = convertOsm({ elements: [el({ name: 'Somewhere', ramp: 'no' })] }, today).places[0] as Place;
    expect('info' in place).toBe(false);
    const townOnly = convertOsm({ elements: [el({ name: 'Somewhere', ramp: 'no', 'addr:city': 'Riverside' })] }, today).places[0] as Place;
    expect(townOnly.info).toMatchObject({ area: 'Riverside' });
    expect('kind' in (townOnly.info as object)).toBe(false);
  });
  it('leaves out an element with no tag about a feature, and counts those with only the general tag', () => {
    const { places, counts } = convertOsm({ elements: [el({ name: 'Cafe', wheelchair: 'yes' }, { id: 1 }), el({ name: 'Bench' }, { id: 2 }), el({ name: 'Shop', wheelchair: 'limited', ramp: 'limited' }, { id: 3 })] }, today);
    expect(places).toEqual([]);
    expect(counts).toMatchObject({ elements: 3, places: 0, records: 0, noFeatureTags: 3, generalOnly: 2 });
  });
  it('leaves out an element with no name, or a name that is too long', () => {
    const { places, counts } = convertOsm({ elements: [el({ ramp: 'yes' }, { id: 1 }), el({ ramp: 'yes', name: 'x'.repeat(MAX_PLACE_NAME + 1) }, { id: 2 }), el({ ramp: 'yes', name: 'Kept' }, { id: 3 })] }, today);
    expect(places.map((p) => p.name)).toEqual(['Kept']);
    expect(counts.noName).toBe(2);
  });
  it('uses the date of the export for an element with no date of its own', () => {
    const undated: OsmElement = { type: 'node', id: 5, tags: { name: 'Hall', elevator: 'yes' } };
    expect(convertOsm({ elements: [undated], baseDate: '2026-11-01' }, today).places[0]?.claims[0]?.provenance?.date).toBe('2026-11-01');
    expect(convertOsm({ elements: [{ ...undated, date: '2026-01-05' }], baseDate: '2026-11-01' }, today).places[0]?.claims[0]?.provenance?.date).toBe('2026-01-05');
  });
  it('leaves out an element when no date up to today is known, and never makes one up', () => {
    const undated: OsmElement = { type: 'node', id: 5, tags: { name: 'Hall', elevator: 'yes' } };
    const none = convertOsm({ elements: [undated] }, today);
    expect(none.places).toEqual([]);
    expect(none.counts.noDate).toBe(1);
    expect(convertOsm({ elements: [{ ...undated, date: '2026-11-20' }] }, today).counts.noDate).toBe(1);
    expect(convertOsm({ elements: [undated], baseDate: '2027-01-01' }, today).counts.noDate).toBe(1);
    expect(convertOsm({ elements: [{ ...undated, date: today }] }, today).places).toHaveLength(1);
  });
  it('counts features with tags that disagree, and still keeps the other records of the element', () => {
    const { places, counts } = convertOsm({ elements: [el({ name: 'Hall', ramp: 'yes', 'ramp:wheelchair': 'no', elevator: 'yes' })] }, today);
    expect(places[0]?.claims.map((c) => c.termId)).toEqual(['elevator']);
    expect(counts.conflicts).toBe(1);
    const only = convertOsm({ elements: [el({ name: 'Hall', wheelchair: 'yes', ramp: 'yes', 'ramp:wheelchair': 'no' })] }, today);
    expect(only.counts).toMatchObject({ places: 0, noFeatureTags: 1, generalOnly: 0, conflicts: 1 });
  });
  it('accounts for every element', () => {
    const elements = [lib, el({ name: 'Cafe', wheelchair: 'yes' }, { id: 2 }), el({ ramp: 'yes' }, { id: 3 }), { type: 'node' as const, id: 4, tags: { name: 'Hall', ramp: 'yes' } }];
    const { counts } = convertOsm({ elements }, today);
    expect(counts.places + counts.noFeatureTags + counts.noName + counts.noDate).toBe(counts.elements);
  });
  it('gives nothing for no elements', () => {
    expect(convertOsm({ elements: [] }, today)).toEqual({ places: [], counts: { elements: 0, places: 0, records: 0, noFeatureTags: 0, generalOnly: 0, noName: 0, noDate: 0, conflicts: 0 } });
  });
});

describe('osmToPlaces', () => {
  const text = overpass(
    [
      node(1, { name: 'Library', amenity: 'library', ramp: 'yes' }, '2026-10-01T10:00:00Z'),
      node(2, { name: 'Café, "Nord"', automatic_door: 'button' }),
      node(3, { name: 'Bench', wheelchair: 'yes' }),
      node(1, { name: 'Library again', ramp: 'no' }),
    ],
    '2026-11-01T00:00:00Z',
  );
  it('reads and converts in one step', () => {
    const result = osmToPlaces(text, today);
    expect(result.problems).toEqual([]);
    expect(result.format).toBe('overpass');
    expect(result.skipped).toBe(1);
    expect(result.places.map((p) => p.id)).toEqual(['osm-node-1', 'osm-node-2']);
    expect(result.counts).toMatchObject({ elements: 3, places: 2, records: 2, noFeatureTags: 1, generalOnly: 1 });
  });
  it('gives the reason and no places for text that is not map data', () => {
    const result = osmToPlaces('nope', today);
    expect(result.problems).toEqual(['not-json']);
    expect(result.places).toEqual([]);
    expect(result.counts.elements).toBe(0);
  });
  it('makes places that survive the table of records, source and link included', () => {
    const result = osmToPlaces(text, today);
    const back = recordsFromCsv(recordsToCsv(result.places));
    expect(back.problems).toEqual([]);
    expect(back.rejected).toEqual([]);
    expect(back.places).toEqual(result.places);
  });
  it('adds nothing the second time the same data is brought in', () => {
    const result = osmToPlaces(text, today);
    const once = mergeRecords([], result.places);
    expect(once.addedRecords).toBe(2);
    const twice = mergeRecords(once.places, osmToPlaces(text, today).places);
    expect(twice.places).toBe(once.places);
    expect(twice.sameRecords).toBe(2);
  });
  it('reads the same places from GeoJSON', () => {
    const fromGeo = osmToPlaces(geojson([feature('node/1', { name: 'Library', amenity: 'library', ramp: 'yes', '@timestamp': '2026-10-01T10:00:00Z' })]), today);
    expect(fromGeo.format).toBe('geojson');
    expect(fromGeo.places).toEqual([osmToPlaces(text, today).places[0]]);
  });
});
