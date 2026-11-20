import { describe, expect, it } from 'vitest';
import {
  RECORD_COLUMNS,
  buildDataset,
  mountPlaceFinder,
  type ExportFile,
  type FeatureClaim,
  type FinderElement,
  type FinderRoot,
  type IndexStore,
  type Lang,
  type Place,
  type Provenance,
  removePlaceId,
} from './index';

const prov: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const transit: Provenance = { source: 'Transit agency', licence: 'OGL-Canada-2.0', date: '2025-03-04' };
const yes = (termId: string): FeatureClaim => ({ termId, status: 'present', provenance: prov });
const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [yes('ramp')], info: { kind: 'library', area: 'Riverside', provenance: prov } },
  { id: 'cafe', name: 'Café Nord', claims: [], info: { kind: 'cafe', area: 'riverside', provenance: transit } },
  { id: 'pool', name: 'Pool', claims: [] },
  { id: 'hall', name: 'Hall', claims: [yes('elevator'), { termId: 'ramp', status: 'absent', provenance: transit }, { termId: 'grab-bar', status: 'present' }, yes('ramp')], info: { area: 'Old Town' } },
];
const bare: Place[] = places.map(({ info: _info, ...rest }) => rest);
const today = '2026-11-15';
const HEAD = RECORD_COLUMNS.join(',');

class El implements FinderElement {
  innerHTML = '';
  checked = false;
  value = '';
  focused = 0;
  focus(): void {
    this.focused += 1;
  }
}
type Listener = (e: { readonly target: unknown }) => void;
class Root implements FinderRoot {
  innerHTML = '';
  readonly els = new Map<string, El>();
  readonly handlers = new Map<string, Listener[]>();
  querySelector(selector: string): El {
    let el = this.els.get(selector);
    if (el === undefined) {
      el = new El();
      this.els.set(selector, el);
    }
    return el;
  }
  addEventListener(type: string, listener: Listener): void {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), listener]);
  }
  fire(type: string, target: unknown): void {
    for (const h of this.handlers.get(type) ?? []) h({ target });
  }
}
class Mem implements IndexStore {
  readonly m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
}
interface Opts {
  lang?: Lang;
  records?: (readonly Place[])[];
  listSource?: Provenance;
  store?: Mem;
  exports?: ExportFile[];
  places?: readonly Place[];
}
const mount = (o: Opts = {}) => {
  const root = new Root();
  const store = o.store ?? new Mem();
  const finder = mountPlaceFinder(root, {
    lang: o.lang ?? 'en',
    places: o.places ?? places,
    today,
    store,
    ...(o.exports === undefined ? {} : { onExport: (f: ExportFile) => o.exports?.push(f) }),
    ...(o.records === undefined ? {} : { onRecords: (p: readonly Place[]) => o.records?.push(p) }),
    ...(o.listSource === undefined ? {} : { dataset: buildDataset(places.slice(0, 3), o.listSource, today).dataset }),
  });
  return { root, finder, store };
};
type M = ReturnType<typeof mount>;
const region = (root: Root, selector: string): string => root.querySelector(selector).innerHTML;
const spoken = (root: Root): string => region(root, '[data-gl-announce]');
const save = (m: M, ...indexes: number[]): void => {
  for (const i of indexes) m.root.fire('click', { id: `gl-save-${i}` });
};
const press = (m: M, id: string): void => m.root.fire('click', { id });
const osm = (m: M): string => region(m.root, '[data-gl-osm]');
const node = (id: number, tags: Record<string, string>): Record<string, unknown> => ({ type: 'node', id, tags, timestamp: '2026-10-01T10:00:00Z' });
const DATA = JSON.stringify({
  osm3s: { timestamp_osm_base: '2026-11-01T00:00:00Z' },
  elements: [
    node(1, { name: 'Riverside Library', amenity: 'library', 'addr:city': 'Riverside', ramp: 'yes', 'toilets:wheelchair': 'no' }),
    node(2, { name: 'Corner Shop', shop: 'books', automatic_door: 'button' }),
    node(3, { name: 'Bench', wheelchair: 'yes' }),
  ],
});
const paste = (m: M, text: string): void => {
  m.root.querySelector('#gl-osm-text').value = text;
};

describe('the panel for open map data', () => {
  it('is there only for a host that keeps records', () => {
    expect(mount().root.innerHTML).not.toContain('gl-osm-panel');
    const html = mount({ records: [] }).root.innerHTML;
    expect(html).toContain('<details class="gl-osm-panel"><summary>Bring in open map data</summary><p>Paste data exported from OpenStreetMap.');
    expect(html).toContain('<label for="gl-osm-text">Map data, pasted as text</label>');
    expect(html).toContain('<div data-gl-osm></div>');
  });
  it('is in French', () => {
    expect(mount({ records: [], lang: 'fr' }).root.innerHTML).toContain('<summary>Importer des données cartographiques ouvertes</summary>');
  });
});

describe('checking pasted map data', () => {
  it('shows what would be added and why the rest is left out, and changes nothing', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    const before = m.root.innerHTML;
    paste(m, DATA);
    press(m, 'gl-osm-check');
    const html = osm(m);
    expect(html).toContain('<p role="status" data-gl-osm-status>Elements read from the data: 3. Places with records: 2. Records made: 3.</p>');
    expect(html).toContain('<li>Of those, elements with only a general wheelchair tag: 1.</li>');
    expect(html).toContain('<tr><th scope="row">Riverside Library</th><td>Ramp: reported as available.<br>Accessible washroom: reported as not available.</td></tr>');
    expect(html).toContain('id="gl-osm-add"');
    expect(html).not.toContain('gl-osm-save');
    expect(spoken(m.root)).toBe('Elements read from the data: 3. Places with records: 2. Records made: 3.');
    expect(m.root.querySelector('#gl-osm-check').focused).toBe(1);
    expect(records).toHaveLength(0);
    expect(m.root.innerHTML).toBe(before);
  });
  it('says what is wrong with text that is not map data', () => {
    const m = mount({ records: [] });
    press(m, 'gl-osm-check');
    expect(osm(m)).toBe('<p role="alert" data-gl-osm-problem>Paste map data first.</p>');
    paste(m, '<html></html>');
    press(m, 'gl-osm-check');
    expect(osm(m)).toContain('This data is not map data this page can read. Nothing was read.');
    paste(m, 'nope{');
    press(m, 'gl-osm-check');
    expect(osm(m)).toContain('This text could not be read as data. Nothing was read.');
    paste(m, '{"hello":1}');
    press(m, 'gl-osm-check');
    expect(spoken(m.root)).toBe('This data is not map data this page can read. Nothing was read.');
  });
  it('says so when the data has nothing about a feature', () => {
    const m = mount({ records: [] });
    paste(m, JSON.stringify({ elements: [node(3, { name: 'Bench', wheelchair: 'yes' })] }));
    press(m, 'gl-osm-check');
    expect(osm(m)).toContain('No record could be made from this data.');
    expect(osm(m)).not.toContain('gl-osm-add');
  });
  it('does nothing for a host that keeps no records', () => {
    const m = mount();
    paste(m, DATA);
    press(m, 'gl-osm-check');
    press(m, 'gl-osm-add');
    expect(spoken(m.root)).toBe('');
    expect(m.finder.getSeen()).toEqual([]);
  });
  it('is in French', () => {
    const m = mount({ records: [], lang: 'fr' });
    paste(m, DATA);
    press(m, 'gl-osm-check');
    expect(spoken(m.root)).toBe('Éléments lus dans les données\u00a0: 3. Lieux avec des fiches\u00a0: 2. Fiches créées\u00a0: 3.');
    expect(osm(m)).toContain('<td>Porte automatique\u00a0: signalé comme disponible.</td>');
  });
});

describe('adding the records made from map data', () => {
  it('adds the places after the places held, each record with its source, licence, date and link', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    paste(m, DATA);
    press(m, 'gl-osm-add');
    expect(records).toHaveLength(1);
    const next = records[0] as readonly Place[];
    expect(next.map((p) => p.id)).toEqual(['lib', 'cafe', 'pool', 'hall', 'osm-node-1', 'osm-node-2']);
    expect(next.slice(0, 4)).toEqual(places);
    const provenance = { source: 'OpenStreetMap contributors', licence: 'ODbL-1.0', date: '2026-10-01', url: 'https://www.openstreetmap.org/node/1' };
    expect(next[4]).toEqual({
      id: 'osm-node-1',
      name: 'Riverside Library',
      claims: [{ termId: 'ramp', status: 'present', provenance }, { termId: 'accessible-washroom', status: 'absent', provenance }],
      info: { kind: 'library', area: 'Riverside', provenance },
    });
  });
  it('shows the new places in the list, says what was added, and offers Undo', () => {
    const m = mount({ records: [] });
    paste(m, DATA);
    press(m, 'gl-osm-add');
    const html = m.root.innerHTML;
    expect(html).toContain('id="place-4-osm-node-1"');
    expect(html).toContain('OpenStreetMap contributors');
    expect(html).toContain('Kind of place: Library. Area: Riverside. Source: OpenStreetMap contributors, dated 2026-10-01.');
    expect(html).toContain('<option value="library">Library (2)</option>');
    expect(html).toContain('id="gl-undo">Undo: load table</button>');
    expect(html).toContain(`<div data-gl-osm><p role="status" data-gl-osm-msg>${spoken(m.root)}</p></div>`);
    expect(spoken(m.root)).toContain('3');
    expect(m.root.querySelector('#gl-undo').focused).toBe(1);
  });
  it('never brings in the general wheelchair tag', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    paste(m, DATA);
    press(m, 'gl-osm-add');
    expect(records[0]?.some((p) => p.name === 'Bench')).toBe(false);
    expect(JSON.stringify(records[0])).not.toContain('wheelchair');
  });
  it('goes back to the records held before when the step is undone', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    paste(m, DATA);
    press(m, 'gl-osm-add');
    press(m, 'gl-undo');
    expect(records[records.length - 1]).toEqual(places);
    expect(m.root.innerHTML).not.toContain('id="place-4-osm-node-1"');
  });
  it('adds nothing the second time, and says so', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    paste(m, DATA);
    press(m, 'gl-osm-add');
    const first = spoken(m.root);
    paste(m, DATA);
    press(m, 'gl-osm-add');
    expect(records).toHaveLength(1);
    expect(spoken(m.root)).not.toBe(first);
    expect(osm(m)).toContain('data-gl-osm-msg');
    expect(m.root.querySelector('#gl-osm-check').focused).toBe(1);
  });
  it('adds nothing for data with a problem or with no records, and shows why', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    paste(m, 'nope');
    press(m, 'gl-osm-add');
    expect(osm(m)).toContain('role="alert"');
    paste(m, JSON.stringify({ elements: [node(3, { name: 'Bench', wheelchair: 'yes' })] }));
    press(m, 'gl-osm-add');
    expect(osm(m)).toContain('No record could be made from this data.');
    expect(records).toHaveLength(0);
    expect(m.root.innerHTML).not.toContain('id="gl-undo"');
  });
  it('does nothing while a source is left out of the count', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    m.root.fire('change', { id: 'gl-rv-src-0', checked: false });
    paste(m, DATA);
    press(m, 'gl-osm-add');
    expect(records).toHaveLength(0);
  });
  it('is written in the list of changes', () => {
    const m = mount({ records: [] });
    paste(m, DATA);
    press(m, 'gl-osm-add');
    expect(m.root.innerHTML).toMatch(/2026-11-15: [^<]*3 records/);
  });
  it('is in French', () => {
    const m = mount({ records: [], lang: 'fr' });
    paste(m, DATA);
    press(m, 'gl-osm-add');
    expect(m.root.innerHTML).toContain('Type de lieu\u00a0: Bibliothèque. Secteur\u00a0: Riverside. Source\u00a0: OpenStreetMap contributors, date du 2026-10-01.');
  });
});

describe('map data in other shapes, and map data that changed', () => {
  const XML = '<?xml version="1.0" encoding="UTF-8"?>\n<osm version="0.6" generator="CGImap">\n <node id="1" lat="43.6" lon="-79.4" timestamp="2026-10-01T10:00:00Z">\n  <tag k="name" v="Riverside Library"/>\n  <tag k="ramp" v="yes"/>\n </node>\n</osm>';
  it('reads the export of the map site', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    paste(m, XML);
    press(m, 'gl-osm-check');
    expect(osm(m)).toContain('Elements read from the data: 1. Places with records: 1. Records made: 1.');
    press(m, 'gl-osm-add');
    expect(records[0]?.[4]?.claims).toEqual([{ termId: 'ramp', status: 'present', provenance: { source: 'OpenStreetMap contributors', licence: 'ODbL-1.0', date: '2026-10-01', url: 'https://www.openstreetmap.org/node/1' } }]);
  });
  it('replaces an older record from the same map element with the newer one, and says so first', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    paste(m, XML);
    press(m, 'gl-osm-add');
    const newer = XML.replace('2026-10-01T10:00:00Z', '2026-11-10T08:00:00Z').replace('v="yes"', 'v="no"');
    paste(m, newer);
    press(m, 'gl-osm-check');
    expect(osm(m)).toContain('<p data-gl-osm-replaces>1 older record from the same map element would be replaced by a newer one.</p>');
    expect(records).toHaveLength(1);
    paste(m, newer);
    press(m, 'gl-osm-add');
    expect(records).toHaveLength(2);
    expect(records[1]?.[4]?.claims).toEqual([{ termId: 'ramp', status: 'absent', provenance: { source: 'OpenStreetMap contributors', licence: 'ODbL-1.0', date: '2026-11-10', url: 'https://www.openstreetmap.org/node/1' } }]);
    expect(spoken(m.root)).toContain('1 older record was replaced by a newer one.');
    expect(records[1]?.slice(0, 4)).toEqual(places);
  });
  it('puts the older record back when that step is undone', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    paste(m, XML);
    press(m, 'gl-osm-add');
    paste(m, XML.replace('2026-10-01T10:00:00Z', '2026-11-10T08:00:00Z').replace('v="yes"', 'v="no"'));
    press(m, 'gl-osm-add');
    press(m, 'gl-undo');
    expect(records[records.length - 1]?.[4]?.claims[0]).toMatchObject({ status: 'present', provenance: { date: '2026-10-01' } });
  });
});

describe('what a check adds up to', () => {
  it('says how the records are dated and counts them for each feature', () => {
    const m = mount({ records: [] });
    paste(m, DATA);
    press(m, 'gl-osm-check');
    expect(osm(m)).toContain('<p data-gl-osm-dates>Every record is dated 2026-10-01.</p>');
    expect(osm(m)).toContain('<tr data-feature="ramp"><th scope="row">Ramp</th><td>1</td><td>0</td></tr>');
    expect(osm(m)).toContain('<tr data-feature="accessible-washroom"><th scope="row">Accessible washroom</th><td>0</td><td>1</td></tr>');
    expect(osm(m)).not.toContain('data-gl-osm-replaces');
  });
  it('reads GeoJSON made from map data, and uses the date of each feature', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    const feature = (ref: string, properties: Record<string, string>): Record<string, unknown> => ({ type: 'Feature', id: ref, properties: { '@id': ref, ...properties }, geometry: null });
    paste(m, JSON.stringify({ type: 'FeatureCollection', features: [feature('way/7', { name: 'Arena', leisure: 'ice_rink', elevator: 'yes', '@timestamp': '2025-12-24T00:00:00Z' }), feature('node/8', { name: 'Kiosk', ramp: 'limited' })] }));
    press(m, 'gl-osm-check');
    expect(osm(m)).toContain('Elements read from the data: 2. Places with records: 1. Records made: 1.');
    expect(osm(m)).toContain('Every record is dated 2025-12-24.');
    press(m, 'gl-osm-add');
    expect(records[0]?.[4]).toMatchObject({ id: 'osm-way-7', name: 'Arena', info: { kind: 'recreation' } });
    expect(records[0]?.[4]?.claims[0]?.provenance?.url).toBe('https://www.openstreetmap.org/way/7');
  });
  it('keeps a feature unknown when its tag is not a plain yes or no', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    paste(m, JSON.stringify({ elements: [node(4, { name: 'Kiosk', ramp: 'limited', elevator: 'yes' })] }));
    press(m, 'gl-osm-add');
    expect(records[0]?.[4]?.claims.map((c) => c.termId)).toEqual(['elevator']);
  });
});

describe('saving the records made from map data', () => {
  it('saves them as a table that reads back to the same records', () => {
    const exports: ExportFile[] = [];
    const m = mount({ records: [], exports });
    paste(m, DATA);
    press(m, 'gl-osm-check');
    expect(osm(m)).toContain('id="gl-osm-save">Save these records as a table</button>');
    press(m, 'gl-osm-save');
    expect(exports).toHaveLength(1);
    expect(exports[0]?.filename).toBe('open-map-records.csv');
    const lines = (exports[0]?.text ?? '').split('\r\n');
    expect(lines[0]).toBe(`${HEAD},place_kind,place_area`);
    expect(lines).toContain('osm-node-1,Riverside Library,ramp,present,OpenStreetMap contributors,ODbL-1.0,2026-10-01,,https://www.openstreetmap.org/node/1,,');
    expect(lines).toContain('osm-node-1,Riverside Library,,,OpenStreetMap contributors,ODbL-1.0,2026-10-01,,https://www.openstreetmap.org/node/1,library,Riverside');
  });
  it('saves nothing when the box holds nothing to save', () => {
    const exports: ExportFile[] = [];
    const m = mount({ records: [], exports });
    paste(m, 'nope');
    press(m, 'gl-osm-save');
    expect(exports).toHaveLength(0);
  });
});
