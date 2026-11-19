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
} from './index';

const prov: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const transit: Provenance = { source: 'Transit agency', licence: 'OGL-Canada-2.0', date: '2025-03-04' };
const yes = (termId: string): FeatureClaim => ({ termId, status: 'present', provenance: prov });
const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [yes('ramp')] },
  { id: 'cafe', name: 'Café Nord', claims: [] },
  { id: 'pool', name: 'Pool', claims: [] },
  { id: 'hall', name: 'Hall', claims: [yes('elevator'), { termId: 'ramp', status: 'absent', provenance: transit }, { termId: 'grab-bar', status: 'present' }, yes('ramp')] },
];
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
}
const mount = (o: Opts = {}) => {
  const root = new Root();
  const store = o.store ?? new Mem();
  const finder = mountPlaceFinder(root, {
    lang: o.lang ?? 'en',
    places,
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
const pickA = (m: M, value: string): void => m.root.fire('change', { id: 'gl-sca', value });
const pickB = (m: M, value: string): void => m.root.fire('change', { id: 'gl-scb', value });
const DIFFER = '<tr data-outcome="differ"><th scope="row">Hall</th><td>Ramp</td><td data-side="present">reported as available</td><td data-side="absent">reported as not available</td><td>They differ</td></tr>';
const PROMPT = 'Choose two different sources to see where they agree and where they differ.';

describe('compare two sources', () => {
  it('is a closed panel with two lists of sources and a prompt', () => {
    const html = mount().root.innerHTML;
    expect(html).toContain('<details class="gl-sc-panel"><summary>Compare two sources</summary><label for="gl-sca">First source</label>');
    expect(html).toContain('<label for="gl-scb">Second source</label><select id="gl-scb" class="gl-select"><option value="" selected>Choose a source</option><option value="0">City open data</option><option value="1">Transit agency</option></select>');
    expect(html).toContain(`<div data-gl-sc><p class="gl-note">${PROMPT}</p></div>`);
  });
  it('keeps the prompt until two different sources are chosen', () => {
    const m = mount();
    pickA(m, '0');
    expect(region(m.root, '[data-gl-sc]')).toContain(PROMPT);
    pickB(m, '0');
    expect(region(m.root, '[data-gl-sc]')).toContain(PROMPT);
  });
  it('draws only the comparison when the sources are chosen, so the lists keep the focus', () => {
    const m = mount();
    const before = m.root.innerHTML;
    pickA(m, '0');
    pickB(m, '1');
    expect(m.root.innerHTML).toBe(before);
    const html = region(m.root, '[data-gl-sc]');
    expect(html).toContain('<p role="status">Both sources report on the same feature in 1 case. They differ in 1 case. 2 features are reported only by City open data.</p>');
    expect(html).toContain(DIFFER);
    expect(html).toContain('<tr data-outcome="only-a"><th scope="row">Library</th><td>Ramp</td><td data-side="present">reported as available</td><td data-side="none">no record</td><td>Only the first source</td></tr>');
    expect(html.match(/<tr data-outcome=/g)).toHaveLength(3);
  });
  it('swaps the sides when the lists are swapped', () => {
    const m = mount();
    pickA(m, '1');
    pickB(m, '0');
    const html = region(m.root, '[data-gl-sc]');
    expect(html).toContain('<th scope="col">Transit agency</th><th scope="col">City open data</th>');
    expect(html).toContain('<td data-side="absent">reported as not available</td><td data-side="present">reported as available</td><td>They differ</td>');
    expect(html).toContain('2 features are reported only by City open data.');
  });
  it('is in French, with the token', () => {
    const m = mount({ lang: 'fr' });
    pickA(m, '0');
    pickB(m, '1');
    const html = region(m.root, '[data-gl-sc]');
    expect(html).toContain('Elles diffèrent dans 1 cas.');
    expect(html).toContain('la caractéristique est signalée comme UNKNOWN.');
  });
  it('goes back to the prompt when a list is emptied or given a value that is not in it', () => {
    const m = mount();
    pickA(m, '0');
    pickB(m, '1');
    pickB(m, '');
    expect(region(m.root, '[data-gl-sc]')).toContain(PROMPT);
    pickB(m, '1');
    pickA(m, '44');
    expect(region(m.root, '[data-gl-sc]')).toContain(PROMPT);
  });
  it('ignores an event with no value, and the same choice twice', () => {
    const m = mount();
    pickA(m, '0');
    pickB(m, '1');
    m.root.querySelector('[data-gl-sc]').innerHTML = 'kept';
    m.root.fire('change', { id: 'gl-sca' });
    pickA(m, '0');
    pickB(m, '1');
    expect(region(m.root, '[data-gl-sc]')).toBe('kept');
  });
  it('keeps the choices when the page is drawn again, and follows the records', () => {
    const m = mount({ records: [] });
    pickA(m, '0');
    pickB(m, '1');
    press(m, 'gl-rrm-0-0');
    const html = m.root.innerHTML;
    expect(html).toContain('<select id="gl-sca" class="gl-select"><option value="">Choose a source</option><option value="0" selected>City open data</option>');
    expect(html).toContain(DIFFER);
    expect(html).toContain('1 feature is reported only by City open data.');
    expect(html).not.toContain('<th scope="row">Library</th><td>Ramp</td><td data-side');
  });
  it('says two sources are needed when one of them has no record left, and returns on undo', () => {
    const m = mount({ records: [] });
    pickA(m, '0');
    pickB(m, '1');
    press(m, 'gl-rrm-3-1');
    expect(m.root.innerHTML).toContain('You need records from two sources to compare them.');
    press(m, 'gl-undo');
    expect(m.root.innerHTML).toContain(DIFFER);
  });
  it('compares the records held, also when a source is left out of the count', () => {
    const m = mount();
    pickA(m, '0');
    pickB(m, '1');
    m.root.fire('change', { id: 'gl-rv-src-1', checked: false });
    expect(m.root.innerHTML).toContain(DIFFER);
  });
  it('saves the comparison as text only when there is one and the host takes files', () => {
    const exports: ExportFile[] = [];
    const m = mount({ exports });
    press(m, 'gl-sc-export');
    pickA(m, '0');
    press(m, 'gl-sc-export');
    expect(exports).toHaveLength(0);
    pickB(m, '1');
    expect(region(m.root, '[data-gl-sc]')).toContain('id="gl-sc-export">Save this table as text</button>');
    press(m, 'gl-sc-export');
    expect(exports).toHaveLength(1);
    expect(exports[0]?.filename).toBe('two-sources-en.txt');
    expect(exports[0]?.mime).toBe('text/plain;charset=utf-8');
    expect(exports[0]?.text).toContain('Two sources compared: City open data, Transit agency\nMade on 2026-11-15.');
    expect(exports[0]?.text).toContain('- Hall, Ramp: They differ. City open data: reported as available. Transit agency: reported as not available.');
    const plain = mount();
    pickA(plain, '0');
    pickB(plain, '1');
    expect(region(plain.root, '[data-gl-sc]')).not.toContain('gl-sc-export');
    press(plain, 'gl-sc-export');
    expect(spoken(plain.root)).toBe('');
  });
});

describe('records by licence', () => {
  it('is a closed panel with a row for each licence and the records with no source', () => {
    const html = mount().root.innerHTML;
    expect(html).toContain('<details class="gl-licences-panel"><summary>Records by licence</summary><div data-gl-licences>');
    expect(html).toContain('<tr data-open="yes"><th scope="row">CC0-1.0</th><td>Yes</td><td>3</td><td>3</td><td>2</td><td>1</td></tr>');
    expect(html).toContain('<tr data-open="yes"><th scope="row">OGL-Canada-2.0</th><td>Yes</td><td>1</td><td>1</td><td>1</td><td>1</td></tr>');
    expect(html).toContain('<p class="gl-note">1 more record has no source at all.</p>');
  });
  it('is in French', () => {
    const html = mount({ lang: 'fr' }).root.innerHTML;
    expect(html).toContain('<summary>Fiches par licence</summary>');
    expect(html).toContain('<td>Oui</td>');
    expect(html).toContain('1 autre fiche n’a aucune provenance.');
  });
  it('follows the records as they change', () => {
    const m = mount({ records: [] });
    press(m, 'gl-rrm-3-1');
    expect(m.root.innerHTML).not.toContain('<th scope="row">OGL-Canada-2.0</th>');
    press(m, 'gl-undo');
    expect(m.root.innerHTML).toContain('<th scope="row">OGL-Canada-2.0</th>');
  });
  it('saves the table as text when the host takes files', () => {
    expect(mount().root.innerHTML).not.toContain('gl-licences-export');
    const exports: ExportFile[] = [];
    const m = mount({ exports });
    press(m, 'gl-licences-export');
    expect(exports[0]?.filename).toBe('records-by-licence-en.txt');
    expect(exports[0]?.text).toContain('- CC0-1.0: records held 3, records that can be reported 3. It is an open licence we accept.');
    expect(exports[0]?.text).toContain('Made on 2026-11-15.');
  });
});

describe('records by year', () => {
  it('is a closed panel with the span of dates and a row for each year', () => {
    const html = mount().root.innerHTML;
    expect(html).toContain('<details class="gl-years-panel"><summary>Records by year</summary><div data-gl-years>');
    expect(html).toContain('<p role="status">The dates run from 2025-03-04 to 2026-10-01.</p>');
    expect(html).toContain('<tr><th scope="row">2026</th><td>3</td><td>3</td><td>0</td><td>2</td><td>1</td></tr><tr><th scope="row">2025</th><td>1</td><td>0</td><td>1</td><td>1</td><td>1</td></tr>');
  });
  it('follows the records as they change', () => {
    const m = mount({ records: [] });
    press(m, 'gl-rrm-3-1');
    expect(m.root.innerHTML).toContain('<p role="status">Every record is dated 2026-10-01.</p>');
    expect(m.root.innerHTML).not.toContain('<th scope="row">2025</th>');
  });
  it('saves the table as text when the host takes files', () => {
    expect(mount().root.innerHTML).not.toContain('gl-years-export');
    const exports: ExportFile[] = [];
    const m = mount({ exports, lang: 'fr' });
    press(m, 'gl-years-export');
    expect(exports[0]?.filename).toBe('records-by-year-fr.txt');
    expect(exports[0]?.text).toContain('- 2025\u00a0: fiches 1. Signalé comme disponible\u00a0: 0. Signalé comme non disponible\u00a0: 1.');
  });
});

describe('summary of the records', () => {
  const row = (key: string, label: string, value: string): string => `<tr data-count="${key}"><th scope="row">${label}</th><td>${value}</td></tr>`;
  it('is a closed panel with the counts', () => {
    const html = mount().root.innerHTML;
    expect(html).toContain('<details class="gl-report-panel"><summary>Summary of the records</summary><div data-gl-report>');
    expect(html).toContain(row('places', 'Places', '4'));
    expect(html).toContain(row('held', 'Records held', '5'));
    expect(html).toContain(row('usable', 'Records that can be reported', '4'));
    expect(html).toContain(row('notUsable', 'Records that cannot be reported', '1'));
    expect(html).toContain(row('disagreements', 'Features where sources disagree', '1'));
    expect(html).toContain(row('older', 'Records more than a year old', '1'));
    expect(html).toContain(row('sources', 'Sources', '2'));
    expect(html).toContain(row('licences', 'Open licences in use', '2'));
    expect(html).toContain(row('unknownPairs', 'Features with nothing to report, across the places', '30'));
    expect(html).toContain(row('unknownPercent', 'Share of features that are unknown', '94 percent'));
  });
  it('agrees with the other panels on the same page', () => {
    const html = mount().root.innerHTML;
    expect(html).toContain('30 features are unknown, in 4 places.');
    expect(html).toContain('Sources disagree about 1 feature.');
    expect(html).toContain('94 percent of the features are unknown.');
  });
  it('is in French, with the token', () => {
    const html = mount({ lang: 'fr' }).root.innerHTML;
    expect(html).toContain(row('unknownPercent', 'Part des caractéristiques qui sont UNKNOWN', '94 pour cent'));
    expect(html).toContain('Ils ne notent aucun lieu.');
  });
  it('follows the records as they change', () => {
    const m = mount({ records: [] });
    press(m, 'gl-rrm-3-1');
    expect(m.root.innerHTML).toContain(row('held', 'Records held', '4'));
    expect(m.root.innerHTML).toContain(row('disagreements', 'Features where sources disagree', '0'));
    expect(m.root.innerHTML).toContain(row('sources', 'Sources', '1'));
    press(m, 'gl-undo');
    expect(m.root.innerHTML).toContain(row('held', 'Records held', '5'));
  });
  it('counts every record held, also when a source is left out of the count', () => {
    const m = mount();
    m.root.fire('change', { id: 'gl-rv-src-1', checked: false });
    expect(m.root.innerHTML).toContain(row('usable', 'Records that can be reported', '4'));
  });
  it('saves the summary as text when the host takes files', () => {
    expect(mount().root.innerHTML).not.toContain('gl-report-export');
    const exports: ExportFile[] = [];
    const m = mount({ exports });
    press(m, 'gl-report-export');
    expect(exports).toHaveLength(1);
    expect(exports[0]?.filename).toBe('records-summary-en.txt');
    expect(exports[0]?.text).toContain('Summary of the records\nMade on 2026-11-15.');
    expect(exports[0]?.text).toContain('- Records held: 5\n- Records that can be reported: 4\n');
  });
});
