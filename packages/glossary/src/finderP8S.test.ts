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
  { id: 'hall', name: 'Hall', claims: [yes('elevator'), { termId: 'ramp', status: 'absent', provenance: transit }, { termId: 'grab-bar', status: 'present' }] },
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
const spokenText = (root: Root): string => region(root, '[data-gl-announce]');
const pickTier = (m: M, value: string): void => m.root.fire('change', { id: 'gl-rv-tier', value });
const box = (m: M, i: number, checked: boolean): void => m.root.fire('change', { id: `gl-rv-src-${i}`, checked });
const KEY = 'glossary-record-view';

describe('which records to count', () => {
  it('has a panel with the tier choices and a check box for each source, all counted', () => {
    const html = mount().root.innerHTML;
    expect(html).toContain('class="gl-recordview-panel"');
    expect(html).toContain('<option value="all" selected>Every record</option>');
    expect(html).toContain('id="gl-rv-src-0" checked> <label for="gl-rv-src-0">City open data</label>');
    expect(html).toContain('id="gl-rv-src-1" checked> <label for="gl-rv-src-1">Transit agency</label>');
    expect(html).toContain('Every record is counted.');
    expect(html).toContain('<div data-gl-rvnote></div>');
  });
  it('leaves out a source: its records are no longer reported, and the page says so', () => {
    const m = mount();
    box(m, 0, false);
    expect(m.root.innerHTML).toContain('<summary>Sources for Library <span class="gl-note">(0 records)</span></summary>');
    expect(m.root.innerHTML).toContain('<p class="gl-note" data-gl-rv-note>2 records are left out of this list.</p>');
    expect(m.root.innerHTML).toContain('2 records are left out. They are still on this device.');
    expect(spokenText(m.root)).toBe('Leaving out records from City open data.');
    expect(m.root.querySelector('#gl-rv-src-0').focused).toBe(1);
  });
  it('keeps the choice on the device and uses it on the next visit', () => {
    const store = new Mem();
    const a = mount({ store });
    box(a, 0, false);
    expect(JSON.parse(store.getItem(KEY) ?? '{}')).toEqual({ tier: 'all', hiddenSources: ['City open data'] });
    const b = mount({ store });
    expect(b.root.innerHTML).toContain('<summary>Sources for Library <span class="gl-note">(0 records)</span></summary>');
    expect(b.root.innerHTML).toContain('id="gl-rv-src-0"> <label for="gl-rv-src-0">City open data</label>');
  });
  it('counts the source again', () => {
    const m = mount();
    box(m, 0, false);
    box(m, 0, true);
    expect(m.root.innerHTML).toContain('<summary>Sources for Library <span class="gl-note">(1 record)</span></summary>');
    expect(spokenText(m.root)).toBe('Counting records from City open data.');
    expect(m.root.innerHTML).toContain('<div data-gl-rvnote></div>');
  });
  it('counts only Tier 1 records', () => {
    const m = mount();
    pickTier(m, 'tier-1');
    expect(m.root.innerHTML).toContain('<option value="tier-1" selected>Only Tier 1 records</option>');
    expect(m.root.innerHTML).toContain('1 record is left out of this list.');
    expect(m.root.innerHTML).not.toContain('<td>Transit agency</td>');
    expect(spokenText(m.root)).toBe('Now counting: Only Tier 1 records.');
    expect(m.root.querySelector('#gl-rv-tier').focused).toBe(1);
  });
  it('still lists every source and every problem while records are left out', () => {
    const m = mount();
    box(m, 1, false);
    expect(m.root.innerHTML).toContain('<p role="status">2 sources</p>');
    expect(m.root.innerHTML).toContain('<li><strong>Transit agency</strong>');
    expect(m.root.innerHTML).toContain('Hall, Ramp: No tier is given.');
  });
  it('saves every record, also the ones left out', () => {
    const files: ExportFile[] = [];
    const m = mount({ exports: files });
    pickTier(m, 'tier-1');
    press(m, 'gl-records-export');
    expect(files[0]?.text).toContain('hall,Hall,ramp,absent,Transit agency,OGL-Canada-2.0,2025-03-04,,');
  });
  it('counts every record again with one button', () => {
    const m = mount();
    box(m, 0, false);
    pickTier(m, 'shown');
    expect(m.root.innerHTML).toContain('id="gl-rv-reset"');
    press(m, 'gl-rv-reset');
    expect(m.root.innerHTML).toContain('Every record is counted.');
    expect(m.root.innerHTML).not.toContain('gl-rv-reset');
    expect(spokenText(m.root)).toBe('Counting every record again.');
    expect(JSON.parse(m.store.getItem(KEY) ?? '{}')).toEqual({ tier: 'all', hiddenSources: [] });
  });
  it('ignores a choice it does not know, a source that is not there, and a change to the same value', () => {
    const m = mount();
    pickTier(m, 'gold');
    box(m, 9, false);
    box(m, 0, true);
    press(m, 'gl-rv-reset');
    expect(m.store.getItem(KEY)).toBeNull();
    expect(spokenText(m.root)).toBe('');
  });
  it('hides the remove buttons while records are left out, so the wrong record cannot be removed', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    expect(m.root.innerHTML).toContain('gl-rrm-3-1');
    box(m, 0, false);
    expect(m.root.innerHTML).not.toContain('gl-rrm-');
    expect(m.root.innerHTML).not.toContain('gl-prm-');
    press(m, 'gl-rrm-3-1');
    press(m, 'gl-prm-0');
    expect(got).toEqual([]);
  });
  it('adds a typed record to every record held, not only the counted ones', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    box(m, 0, false);
    for (const [k, value] of Object.entries({ name: 'Library', feature: 'elevator', status: 'absent', source: 'Town list', licence: 'CC-BY-4.0', date: '2026-11-01', tier: '' })) {
      m.root.querySelector(`#gl-rec-${k}`).value = value;
    }
    press(m, 'gl-rec-add');
    expect(got[0]?.[0]?.claims.map((c) => c.provenance?.source)).toEqual(['City open data', 'Town list']);
  });
  it('applies the choice to a table that is loaded later', () => {
    const m = mount({ records: [] });
    pickTier(m, 'tier-1');
    m.root.querySelector('#gl-records-text').value = `${HEAD}\nn,New,ramp,present,Town list,CC-BY-4.0,2026-11-01,,\n`;
    press(m, 'gl-records-load');
    expect(m.root.innerHTML).toContain('<summary>Sources for New <span class="gl-note">(0 records)</span></summary>');
    expect(m.root.innerHTML).toContain('1 record is left out of this list.');
  });
  it('is reset by forget', () => {
    const m = mount();
    box(m, 0, false);
    press(m, 'gl-forget');
    press(m, 'gl-forget-sure');
    expect(JSON.parse(m.store.getItem(KEY) ?? '{}')).toEqual({ tier: 'all', hiddenSources: [] });
    m.finder.setLang('en');
    expect(m.root.innerHTML).toContain('Every record is counted.');
  });
  it('ignores a stored choice that cannot be read', () => {
    const store = new Mem();
    store.setItem(KEY, 'nope');
    expect(mount({ store }).root.innerHTML).toContain('Every record is counted.');
  });
  it('is French in French', () => {
    const m = mount({ lang: 'fr' });
    expect(m.root.innerHTML).toContain('Quelles fiches compter');
    pickTier(m, 'shown');
    expect(spokenText(m.root)).toBe('Fiches comptées\u00a0: Seulement les fiches avec un niveau.');
  });
});

describe('guide to the table of records', () => {
  it('is not shown when the host takes neither files nor records', () => {
    expect(mount().root.innerHTML).not.toContain('class="gl-guide"');
  });
  it('is shown, closed, when the host takes records or files', () => {
    expect(mount({ records: [] }).root.innerHTML).toContain('<details class="gl-guide"><summary>How to fill in a table of records</summary>');
    expect(mount({ exports: [] }).root.innerHTML).toContain('<dt><code>place_id</code>');
  });
  it('saves an empty table only with a host that takes files', () => {
    const none = mount({ records: [] });
    expect(none.root.innerHTML).not.toContain('gl-records-template');
    press(none, 'gl-records-template');
    const files: ExportFile[] = [];
    const m = mount({ exports: files });
    press(m, 'gl-records-template');
    expect(files).toEqual([{ text: `${HEAD}\r\n`, filename: 'records-template.csv', mime: 'text/csv;charset=utf-8' }]);
  });
  it('is French in French', () => {
    expect(mount({ lang: 'fr', records: [] }).root.innerHTML).toContain('Comment remplir un tableau de fiches');
  });
});
