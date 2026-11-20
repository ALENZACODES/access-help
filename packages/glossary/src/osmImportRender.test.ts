import { describe, expect, it } from 'vitest';
import { findBannedCopy } from '../../../qa/src/audit/copy';
import {
  MAX_OSM_ELEMENTS,
  MAX_OSM_ROWS_SHOWN,
  OSM_IDS,
  OSM_RECORDS_FILENAME,
  OSM_UI,
  TAG_RULES,
  auditHtml,
  frenchIssues,
  lintClaims,
  lintCopy,
  osmDatesText,
  osmLeftOut,
  renderOsmTally,
  osmProblemText,
  osmRecordLines,
  osmStatusText,
  osmToPlaces,
  plainLanguageIssues,
  readabilityIssues,
  renderOsmPanel,
  renderOsmResult,
  renderOsmTags,
  type Lang,
  type OsmCounts,
  type OsmProblem,
  type OsmResult,
} from './index';

const today = '2026-11-19';
const node = (id: number, tags: Record<string, string>): Record<string, unknown> => ({ type: 'node', id, tags, timestamp: '2026-10-01T10:00:00Z' });
const data = (elements: unknown[]): string => JSON.stringify({ elements });
const good = osmToPlaces(
  data([
    node(1, { name: 'Library', ramp: 'yes', 'toilets:wheelchair': 'no' }),
    node(2, { name: 'Café <b>', automatic_door: 'button' }),
    node(3, { name: 'Bench', wheelchair: 'yes' }),
    node(4, { ramp: 'yes' }),
    node(5, { name: 'Hall', ramp: 'yes', 'ramp:wheelchair': 'no', elevator: 'yes' }),
    { type: 'node', id: 6, tags: { name: 'Pool', elevator: 'no' } },
    'junk',
  ]),
  today,
);
const empty = osmToPlaces(data([node(3, { name: 'Bench', wheelchair: 'yes' })]), today);
const bad = (problem: OsmProblem): OsmResult => ({ ...osmToPlaces('', today), problems: [problem] });
const counts = (o: Partial<OsmCounts> = {}): OsmCounts => ({ elements: 0, places: 0, records: 0, noFeatureTags: 0, generalOnly: 0, noName: 0, noDate: 0, conflicts: 0, ...o });

describe('the words for a check', () => {
  it('says how many elements were read and what came of them', () => {
    expect(osmStatusText(good, 'en')).toBe('Elements read from the data: 6. Places with records: 3. Records made: 4.');
    expect(osmStatusText(good, 'fr')).toBe('Éléments lus dans les données\u00a0: 6. Lieux avec des fiches\u00a0: 3. Fiches créées\u00a0: 4.');
  });
  it('says so when no record could be made', () => {
    expect(osmStatusText(empty, 'en')).toBe('Elements read from the data: 1. No record could be made from this data.');
  });
  it('gives the reason when the data could not be read', () => {
    expect(osmStatusText(bad('not-json'), 'en')).toBe('This text could not be read as data. Nothing was read.');
    expect(osmProblemText(['empty', 'not-json'], 'en')).toBe('Paste map data first.');
    expect(osmProblemText(['too-many-elements'], 'en')).toBe(`There are more than ${MAX_OSM_ELEMENTS} elements. Export a smaller area.`);
    expect(osmProblemText([], 'en')).toBe('');
    expect(osmProblemText(['not-map-data'], 'fr')).toBe('Ces données ne sont pas des données cartographiques que cette page peut lire. Rien n’a été lu.');
  });
  it('lists each reason something was left out, and only the reasons that happened', () => {
    expect(osmLeftOut(good.counts, good.skipped, 'en')).toEqual([
      'Elements with no tag about a feature: 1.',
      'Of those, elements with only a general wheelchair tag: 1.',
      'Elements with no name: 1.',
      'Elements with no usable date: 1.',
      'Features with two tags that disagree: 1.',
      'Entries that are not map elements, or that came twice: 1.',
    ]);
    expect(osmLeftOut(counts(), 0, 'en')).toEqual([]);
    expect(osmLeftOut(counts({ noName: 2 }), 0, 'en')).toEqual(['Elements with no name: 2.']);
  });
  it('is clean French', () => {
    for (const line of osmLeftOut(good.counts, good.skipped, 'fr')) expect(frenchIssues(line), line).toEqual([]);
    expect(osmLeftOut(good.counts, good.skipped, 'fr')[2]).toBe('Éléments sans nom\u00a0: 1.');
  });
  it('words the records as the list does', () => {
    expect(osmRecordLines(good.places[0] as OsmResult['places'][number], 'en')).toEqual(['Ramp: reported as available.', 'Accessible washroom: reported as not available.']);
    expect(osmRecordLines(good.places[1] as OsmResult['places'][number], 'fr')).toEqual(['Porte automatique\u00a0: signalé comme disponible.']);
  });
});

describe('what the records add up to', () => {
  it('says how the records are dated', () => {
    expect(osmDatesText(good.places, 'en')).toBe('Every record is dated 2026-10-01.');
    expect(osmDatesText(good.places, 'fr')).toBe('Chaque fiche porte la date du 2026-10-01.');
    expect(osmDatesText([], 'en')).toBe('');
    const two = osmToPlaces(JSON.stringify({ elements: [node(1, { name: 'A', ramp: 'yes' }), { type: 'node', id: 2, timestamp: '2024-05-06T00:00:00Z', tags: { name: 'B', ramp: 'no' } }] }), today);
    expect(osmDatesText(two.places, 'en')).toBe('The records are dated from 2024-05-06 to 2026-10-01.');
    expect(osmDatesText(two.places, 'fr')).toBe('Les fiches portent des dates du 2024-05-06 au 2026-10-01.');
  });
  it('counts the records for each feature in a small table with headers', () => {
    const html = renderOsmTally(good.places, 'en');
    expect(html).toContain('<caption>Records made for each feature</caption><thead><tr><th scope="col">Feature</th><th scope="col">Reported as available</th><th scope="col">Reported as not available</th></tr></thead>');
    expect(html.match(/<tr data-feature="/g)).toHaveLength(TAG_RULES.length);
    expect(html).toContain('<tr data-feature="ramp"><th scope="row">Ramp</th><td>1</td><td>0</td></tr>');
    expect(html).toContain('<tr data-feature="accessible-washroom"><th scope="row">Accessible washroom</th><td>0</td><td>1</td></tr>');
    expect(html).toContain('<tr data-feature="accessible-parking"><th scope="row">Accessible parking</th><td>0</td><td>0</td></tr>');
  });
  it('is French, and is part of the outcome of a check', () => {
    expect(renderOsmTally(good.places, 'fr')).toContain('<caption>Fiches créées pour chaque caractéristique</caption>');
    const html = renderOsmResult({ lang: 'en', result: good, canExport: false });
    expect(html).toContain('data-gl-osm-tally');
    expect(html.indexOf('data-gl-osm-tally')).toBeLessThan(html.indexOf('The places and the records that would be added'));
    expect(renderOsmResult({ lang: 'en', result: empty, canExport: false })).not.toContain('data-gl-osm-tally');
  });
});

describe('renderOsmTags', () => {
  it('lists every tag that is read beside its feature, as the tag is written in the data', () => {
    const html = renderOsmTags('en');
    expect(html.startsWith('<h4>Tags this page reads</h4><ul class="gl-osm-tags">')).toBe(true);
    expect(html.match(/<li>/g)).toHaveLength(TAG_RULES.length);
    expect(html).toContain('<li><code>ramp</code>, <code>ramp:wheelchair</code>: Ramp</li>');
    expect(html).toContain('<li><code>automatic_door</code>: Automatic door</li>');
    for (const rule of TAG_RULES) for (const key of rule.keys) expect(html).toContain(`<code>${key}</code>`);
  });
  it('is French, with the same tag names', () => {
    const html = renderOsmTags('fr');
    expect(html).toContain('<h4>Étiquettes que cette page lit</h4>');
    expect(html).toContain('<li><code>elevator</code>\u00a0: Ascenseur</li>');
  });
});

describe('renderOsmResult', () => {
  const view = (o: Partial<Parameters<typeof renderOsmResult>[0]> = {}): string => renderOsmResult({ lang: 'en', result: good, canExport: true, ...o });
  it('is empty before anything is checked, or only a message', () => {
    expect(view({ result: null })).toBe('');
    expect(view({ result: null, message: 'Added 2 records <x>.' })).toBe('<p role="status" data-gl-osm-msg>Added 2 records &lt;x&gt;.</p>');
  });
  it('shows a problem as an alert, with no table and no buttons', () => {
    const html = view({ result: bad('not-map-data') });
    expect(html).toBe('<p role="alert" data-gl-osm-problem>This data is not map data this page can read. Nothing was read.</p>');
  });
  it('gives a status, what was left out, the places with their records, and the buttons', () => {
    const html = view();
    expect(html.startsWith('<p role="status" data-gl-osm-status>Elements read from the data: 6. Places with records: 3. Records made: 4.</p><p data-gl-osm-dates>Every record is dated 2026-10-01.</p><h4>What was left out, and why</h4><ul data-gl-osm-left><li>Elements with no tag about a feature: 1.</li>')).toBe(true);
    expect(html).toContain('<caption>The places and the records that would be added</caption><thead><tr><th scope="col">Place</th><th scope="col">Records</th></tr></thead>');
    expect(html).toContain('<tr><th scope="row">Library</th><td>Ramp: reported as available.<br>Accessible washroom: reported as not available.</td></tr>');
    expect(html).toContain('<tr><th scope="row">Hall</th><td>Elevator: reported as available.</td></tr>');
    expect(html.endsWith(`<div class="gl-actions"><button type="button" class="gl-btn" id="${OSM_IDS.add}">Add these records to the records held</button><button type="button" class="gl-btn" id="${OSM_IDS.save}">Save these records as a table</button></div>`)).toBe(true);
  });
  it('escapes names from the data', () => {
    const html = view();
    expect(html).toContain('<th scope="row">Café &lt;b&gt;</th>');
    expect(html).not.toContain('<b>');
  });
  it('has no table and no buttons when no record could be made, and still says why', () => {
    const html = view({ result: empty });
    expect(html).toContain('No record could be made from this data.');
    expect(html).toContain('Of those, elements with only a general wheelchair tag: 1.');
    expect(html).not.toContain('<table');
    expect(html).not.toContain(OSM_IDS.add);
  });
  it('has no list of what was left out when nothing was', () => {
    const all = osmToPlaces(data([node(1, { name: 'Library', ramp: 'yes' })]), today);
    expect(view({ result: all })).not.toContain('data-gl-osm-left');
  });
  it('offers to save a table only when the host can save files', () => {
    expect(view({ canExport: false })).toContain(OSM_IDS.add);
    expect(view({ canExport: false })).not.toContain(OSM_IDS.save);
    expect(OSM_RECORDS_FILENAME).toBe('open-map-records.csv');
  });
  it('shows a limited number of places and says the rest would be added too', () => {
    const many = osmToPlaces(data(Array.from({ length: MAX_OSM_ROWS_SHOWN + 3 }, (_, i) => node(i + 1, { name: `Place ${i}`, ramp: 'yes' }))), today);
    const html = view({ result: many });
    expect(html.match(/<tr><th scope="row">/g)).toHaveLength(MAX_OSM_ROWS_SHOWN);
    expect(html).toContain('<p class="gl-note" data-gl-osm-more>3 more places are not shown here. They would be added too.</p>');
    expect(view({ result: many, limit: MAX_OSM_ROWS_SHOWN + 2 })).toContain('1 more place is not shown here. It would be added too.');
    expect(view()).not.toContain('data-gl-osm-more');
  });
  it('says how many older records would give way to newer ones, when some would', () => {
    expect(view({ replaces: 1 })).toContain('<p data-gl-osm-replaces>1 older record from the same map element would be replaced by a newer one.</p>');
    expect(view({ replaces: 3 })).toContain('3 older records from the same map elements would be replaced by newer ones.');
    expect(view({ replaces: 0 })).not.toContain('data-gl-osm-replaces');
    expect(view({ lang: 'fr', replaces: 2 })).toContain('2 fiches plus anciennes des mêmes éléments de carte seraient remplacées par des plus récentes.');
    expect(view({ result: empty, replaces: 2 })).not.toContain('data-gl-osm-replaces');
  });
  it('never calls a place accessible, whatever the tags say', () => {
    for (const lang of ['en', 'fr'] as const) {
      const html = view({ lang }).replace(/Accessible (washroom|parking)|Toilettes accessibles|Stationnement accessible|data-feature="[a-z-]+"/g, '');
      expect(html).not.toMatch(/accessible/i);
    }
  });
  it('is French, and passes the HTML audit in both languages for every outcome', () => {
    expect(view({ lang: 'fr' })).toContain('<caption>Les lieux et les fiches qui seraient ajoutés</caption>');
    expect(view({ lang: 'fr' })).toContain('>Ajouter ces fiches aux fiches gardées</button>');
    for (const lang of ['en', 'fr'] as const) {
      for (const result of [good, empty, bad('too-large'), null]) {
        const html = `<div lang="${lang}"><h3>t</h3>${view({ lang, result, message: 'm' })}</div>`;
        expect(auditHtml(html, 'osm-result'), lang).toEqual([]);
      }
    }
  });
});

describe('renderOsmPanel', () => {
  const panel = (lang: Lang = 'en'): string => renderOsmPanel({ lang, result: null, canExport: true });
  it('says what it does, that it stays on the device, and whose data it is', () => {
    const html = panel();
    expect(html).toContain('<p>Paste data exported from OpenStreetMap. This page reads a few tags about features and turns them into records. It does not go online.</p>');
    expect(html).toContain('<p>Each record keeps OpenStreetMap contributors as its source, under the ODbL-1.0 licence.</p>');
    expect(html).toContain('<p class="gl-note">A general wheelchair tag is not used. It does not say which feature is there.</p>');
    expect(html).toContain('<p class="gl-note">The page reads an export from the OpenStreetMap site, an Overpass export, or GeoJSON made from one.</p>');
  });
  it('has a labelled box, a button to check, and a place for the outcome', () => {
    const html = panel();
    expect(html).toContain(`<label for="${OSM_IDS.text}">Map data, pasted as text</label><textarea id="${OSM_IDS.text}" class="gl-textarea" rows="6" spellcheck="false" autocomplete="off"></textarea>`);
    expect(html).toContain(`id="${OSM_IDS.check}">Check this map data</button>`);
    expect(html.endsWith('<div data-gl-osm></div>')).toBe(true);
  });
  it('is French and passes the HTML audit in both languages', () => {
    expect(panel('fr')).toContain('Chaque fiche garde OpenStreetMap contributors comme source, sous la licence ODbL-1.0.');
    for (const lang of ['en', 'fr'] as const) {
      expect(auditHtml(`<div lang="${lang}"><h3>t</h3>${renderOsmPanel({ lang, result: good, canExport: true })}</div>`, 'osm-panel'), lang).toEqual([]);
    }
  });
});

describe('OSM_UI', () => {
  const texts = (lang: Lang): string[] => {
    const ui = OSM_UI[lang];
    return [
      ui.heading, ui.intro, ui.licence('OpenStreetMap contributors', 'ODbL-1.0'), ui.general, ui.tagsHeading, ui.textLabel, ui.formats, ui.check, ui.add, ui.save, ...Object.values(ui.problems), ui.read(6), ui.made(3, 4), ui.nothing,
      ui.leftHeading, ...Object.values(ui.left).map((f) => f(2)), ui.caption, ui.colPlace, ui.colRecords, ui.more(1), ui.more(4), ui.replaces(1), ui.replaces(3), ui.replaced(1), ui.replaced(3), ui.dates('2026-10-01', '2026-10-01'), ui.dates('2024-05-06', '2026-10-01'), ui.tallyCaption, ui.colFeature, ui.colAvailable, ui.colNotAvailable,
    ];
  };
  it('has the same keys in both languages, at every level', () => {
    const keys = (x: object): string[] => Object.entries(x).flatMap(([k, v]) => (typeof v === 'object' && v !== null ? keys(v).map((s) => `${k}.${s}`) : [k]));
    expect(keys(OSM_UI.fr)).toEqual(keys(OSM_UI.en));
  });
  it('passes the copy rules and the shared audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of texts(lang)) {
        expect(lintCopy(text), text).toEqual([]);
        expect(lintClaims(text), text).toEqual([]);
        expect(findBannedCopy(text, 'osm'), text).toEqual([]);
        expect(plainLanguageIssues(text), text).toEqual([]);
        expect(readabilityIssues(text, lang), text).toEqual([]);
        if (lang === 'fr') expect(frenchIssues(text), text).toEqual([]);
      }
    }
  });
  it('does not say the map data is complete, current or checked by this app', () => {
    for (const lang of ['en', 'fr'] as const) for (const text of texts(lang)) expect(text).not.toMatch(/complete|complet|up to date|à jour|checked by|live/i);
  });
});
