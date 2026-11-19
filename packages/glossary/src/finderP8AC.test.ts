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
const toggle = (m: M, className: string, open: boolean): void => m.root.fire('toggle', { tagName: 'DETAILS', className, open });
const tidy = (m: M): string => region(m.root, '[data-gl-tidy]');
const GRAB = 'aria-label="Remove the record: Grab bar, Unknown"';
const TRANSIT = 'aria-label="Remove the record: Ramp, Transit agency"';

describe('tidying the records', () => {
  it('is offered only when the host keeps records', () => {
    expect(mount().root.innerHTML).not.toContain('gl-tidy-panel');
    const html = mount({ records: [] }).root.innerHTML;
    expect(html).toContain('<details class="gl-tidy-panel"><summary>Tidy the records</summary><div data-gl-tidy>');
    expect(html).toContain('<li data-tidy="not-usable"><span>1 record cannot be reported.</span> <button type="button" class="gl-btn" id="gl-tidy-not-usable">');
    expect(html).toContain('<li data-tidy="old"><span>0 records are more than two years old.</span></li>');
    expect(html).toContain('<li data-tidy="empty-places"><span>2 places have no records.</span>');
  });
  it('removes the records that cannot be reported, tells the host, and offers Undo', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    expect(m.root.innerHTML).toContain(GRAB);
    press(m, 'gl-tidy-not-usable');
    const html = m.root.innerHTML;
    expect(html).not.toContain(GRAB);
    expect(html).toContain('<p role="status" data-gl-tidy-msg>Removed 1 record from 1 place.</p>');
    expect(html).toContain('id="gl-undo">Undo: tidy the records</button>');
    expect(html).toContain('Removed the records that cannot be reported.');
    expect(html).toContain('<span>0 records cannot be reported.</span></li>');
    expect(spoken(m.root)).toBe('Removed 1 record from 1 place.');
    expect(m.root.querySelector('#gl-undo').focused).toBe(1);
    expect(records).toHaveLength(1);
    expect(records[0]?.find((p) => p.id === 'hall')?.claims).toHaveLength(3);
  });
  it('brings the records back when the step is undone', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    press(m, 'gl-tidy-not-usable');
    press(m, 'gl-undo');
    expect(m.root.innerHTML).toContain(GRAB);
    expect(records[records.length - 1]?.find((p) => p.id === 'hall')?.claims).toHaveLength(4);
  });
  it('counts a source only after it is chosen, redrawing only the panel', () => {
    const m = mount({ records: [] });
    const before = m.root.innerHTML;
    expect(before).toContain('Choose a source to see how many records come from it.');
    m.root.fire('change', { id: 'gl-tidy-src', value: '1' });
    expect(m.root.innerHTML).toBe(before);
    expect(tidy(m)).toContain('<option value="1" selected>Transit agency</option>');
    expect(tidy(m)).toContain('<span>1 record comes from this source.</span> <button type="button" class="gl-btn" id="gl-tidy-source">Remove every record from this source</button>');
    expect(m.root.querySelector('#gl-tidy-src').focused).toBe(1);
  });
  it('removes every record of the chosen source and names it in the list of changes', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    m.root.fire('change', { id: 'gl-tidy-src', value: '1' });
    press(m, 'gl-tidy-source');
    const html = m.root.innerHTML;
    expect(html).not.toContain(TRANSIT);
    expect(html).toContain('Removed every record from the source: Transit agency.');
    expect(html).toContain('<select id="gl-tidy-src" class="gl-select"><option value="" selected>Choose a source</option><option value="0">City open data</option></select>');
    expect(records[0]?.flatMap((p) => p.claims).some((c) => c.provenance?.source === 'Transit agency')).toBe(false);
    press(m, 'gl-undo');
    expect(m.root.innerHTML).toContain(TRANSIT);
  });
  it('does nothing for the source button when no source is chosen', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    press(m, 'gl-tidy-source');
    expect(records).toHaveLength(0);
    expect(tidy(m)).toContain('<p role="status" data-gl-tidy-msg>There was nothing to remove.</p>');
    expect(spoken(m.root)).toBe('There was nothing to remove.');
  });
  it('ignores a source value that is not in the list, and an event with no value', () => {
    const m = mount({ records: [] });
    m.root.fire('change', { id: 'gl-tidy-src', value: '9' });
    m.root.fire('change', { id: 'gl-tidy-src' });
    expect(tidy(m)).toBe('');
  });
  it('removes the places with no records', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    press(m, 'gl-tidy-empty-places');
    expect(records[0]?.map((p) => p.id)).toEqual(['lib', 'hall']);
    expect(m.root.innerHTML).toContain('<p role="status" data-gl-tidy-msg>Removed 2 places.</p>');
    expect(m.root.innerHTML).toContain('Removed the places with no records.');
    press(m, 'gl-undo');
    expect(records[records.length - 1]?.map((p) => p.id)).toEqual(['lib', 'cafe', 'pool', 'hall']);
  });
  it('says so when a kind has nothing to remove, and tells the host nothing', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    press(m, 'gl-tidy-old');
    expect(records).toHaveLength(0);
    expect(tidy(m)).toContain('There was nothing to remove.');
    expect(m.root.innerHTML).not.toContain('id="gl-undo"');
  });
  it('is not offered while a source is left out of the count', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    m.root.fire('change', { id: 'gl-rv-src-0', checked: false });
    expect(m.root.innerHTML).not.toContain('gl-tidy-panel');
    press(m, 'gl-tidy-not-usable');
    expect(records).toHaveLength(0);
  });
  it('does nothing for a host that does not keep records', () => {
    const m = mount();
    press(m, 'gl-tidy-not-usable');
    expect(m.root.innerHTML).toContain('Grab bar');
    expect(spoken(m.root)).toBe('');
  });
  it('removes exact copies of a record and keeps the first one', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    expect(m.root.innerHTML).toContain('<li data-tidy="duplicates"><span>0 records are exact copies of another record.</span></li>');
    const row = 'depot,Depot,ramp,present,City open data,CC0-1.0,2026-10-01,tier-1,';
    m.root.querySelector('#gl-records-text').value = [RECORD_COLUMNS.join(','), row, row, 'depot,Depot,elevator,absent,City open data,CC0-1.0,2026-10-01,tier-1,'].join('\n');
    press(m, 'gl-records-load');
    expect(m.root.innerHTML).toContain('<span>1 record is an exact copy of another record.</span> <button type="button" class="gl-btn" id="gl-tidy-duplicates">Remove the exact copies</button>');
    press(m, 'gl-tidy-duplicates');
    expect(m.root.innerHTML).toContain('<p role="status" data-gl-tidy-msg>Removed 1 record from 1 place.</p>');
    expect(m.root.innerHTML).toContain('Removed the records that were exact copies.');
    expect(records[records.length - 1]?.[0]?.claims.map((c) => c.termId)).toEqual(['ramp', 'elevator']);
    press(m, 'gl-undo');
    expect(records[records.length - 1]?.[0]?.claims).toHaveLength(3);
  });
  it('is in French', () => {
    const m = mount({ records: [], lang: 'fr' });
    expect(m.root.innerHTML).toContain('<summary>Ranger les fiches</summary>');
    press(m, 'gl-tidy-not-usable');
    expect(m.root.innerHTML).toContain('1 fiche retirée de 1 lieu.');
    expect(m.root.innerHTML).toContain('id="gl-undo">Annuler\u00a0: ranger les fiches</button>');
  });
});

describe('every place and feature in one table', () => {
  it('is a closed panel with every feature until some are chosen', () => {
    const html = mount().root.innerHTML;
    expect(html).toContain('<details class="gl-matrix-panel"><summary>Every place and feature in one table</summary><div data-gl-matrix>');
    expect(html).toContain('<p class="gl-note">The table shows every feature.</p>');
    expect(html).toContain('<p role="status">Cells where a feature is reported as available: 2. Reported as not available: 0. Where it is unknown: 30.</p>');
    expect(html).toContain('<td data-status="conflict">sources disagree</td>');
  });
  it('follows the features the person chooses', () => {
    const m = mount();
    m.root.fire('change', { id: 'gl-f-ramp', checked: true });
    const html = region(m.root, '[data-gl-matrix]');
    expect(html).toContain('The table shows the 1 feature you chose.');
    expect(html).toContain('<thead><tr><th scope="col">Place</th><th scope="col">Ramp</th></tr></thead>');
    expect(html).toContain('<tr><th scope="row">Library</th><td data-status="present">reported as available</td></tr>');
  });
  it('reports only what the counted records say when a source is left out', () => {
    const m = mount();
    m.root.fire('change', { id: 'gl-f-ramp', checked: true });
    expect(region(m.root, '[data-gl-matrix]')).toContain('<tr><th scope="row">Hall</th><td data-status="conflict">sources disagree</td></tr>');
    m.root.fire('change', { id: 'gl-rv-src-1', checked: false });
    expect(m.root.innerHTML).toContain('<tr><th scope="row">Hall</th><td data-status="present">reported as available</td></tr>');
  });
  it('saves the table for a spreadsheet when the host takes files', () => {
    expect(mount().root.innerHTML).not.toContain('gl-matrix-export');
    const exports: ExportFile[] = [];
    const m = mount({ exports });
    m.root.fire('change', { id: 'gl-f-ramp', checked: true });
    press(m, 'gl-matrix-export');
    expect(exports).toHaveLength(1);
    expect(exports[0]?.filename).toBe('places-and-features-en.csv');
    expect(exports[0]?.mime).toBe('text/csv;charset=utf-8');
    expect(exports[0]?.text).toBe(
      'Place,Ramp\r\nLibrary,reported as available\r\nCafé Nord,unknown\r\nPool,unknown\r\nHall,sources disagree\r\n' +
        'Places where it is reported as available,1\r\nPlaces where it is reported as not available,0\r\nPlaces where it is unknown,3\r\n',
    );
  });
  it('is in French, with the token', () => {
    const html = mount({ lang: 'fr' }).root.innerHTML;
    expect(html).toContain('<summary>Tous les lieux et caractéristiques dans un tableau</summary>');
    expect(html).toContain('Où elle est UNKNOWN\u00a0: 30.');
  });
});

describe('panels stay open when the page is drawn again', () => {
  it('draws a panel open again after the records change', () => {
    const m = mount({ records: [] });
    toggle(m, 'gl-tidy-panel', true);
    toggle(m, 'gl-matrix-panel', true);
    press(m, 'gl-tidy-not-usable');
    expect(m.root.innerHTML).toContain('<details class="gl-tidy-panel" open><summary>Tidy the records</summary>');
    expect(m.root.innerHTML).toContain('<details class="gl-matrix-panel" open>');
    expect(m.root.innerHTML).toContain('<details class="gl-gaps-panel"><summary>');
  });
  it('draws it closed again after the person closes it', () => {
    const m = mount({ records: [] });
    toggle(m, 'gl-tidy-panel', true);
    toggle(m, 'gl-tidy-panel', false);
    press(m, 'gl-tidy-not-usable');
    expect(m.root.innerHTML).toContain('<details class="gl-tidy-panel"><summary>');
  });
  it('keeps the panels open across a change of language', () => {
    const m = mount({ records: [] });
    toggle(m, 'gl-snapshots-panel', true);
    m.finder.setLang('fr');
    expect(m.root.innerHTML).toContain('<details class="gl-snapshots-panel" open><summary>Copies des fiches</summary>');
  });
  it('never opens blocks that share a class, such as the records of each place', () => {
    const m = mount({ records: [] });
    toggle(m, 'gl-records', true);
    press(m, 'gl-tidy-not-usable');
    expect(m.root.innerHTML).not.toContain('<details class="gl-records" open>');
  });
  it('ignores toggle events that are not from a finder panel', () => {
    const m = mount({ records: [] });
    m.root.fire('toggle', { tagName: 'DIV', className: 'gl-tidy-panel', open: true });
    m.root.fire('toggle', { id: 'x' });
    m.root.fire('toggle', null);
    press(m, 'gl-tidy-not-usable');
    expect(m.root.innerHTML).toContain('<details class="gl-tidy-panel"><summary>');
  });
  it('does not redraw anything when a panel is opened', () => {
    const m = mount({ records: [] });
    const before = m.root.innerHTML;
    toggle(m, 'gl-tidy-panel', true);
    expect(m.root.innerHTML).toBe(before);
  });
});
