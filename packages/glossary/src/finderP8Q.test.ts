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

describe('records to look at', () => {
  it('has a panel that lists each record with a problem and why', () => {
    const html = mount().root.innerHTML;
    expect(html).toContain('class="gl-problems-panel"');
    expect(html).toContain('<p role="status">2 records have a problem. 1 of them cannot be used. It is shown as unknown.</p>');
    expect(html).toContain('<li data-usable="yes">Hall, Ramp: No tier is given.');
    expect(html).toContain('<li data-usable="no">Hall, Grab bar: No source is given.</li>');
  });
  it('has one Show button for a place with two problems, and it shows the place', () => {
    const m = mount();
    expect(m.root.innerHTML.match(/id="gl-pshow-3"/g)).toHaveLength(1);
    press(m, 'gl-pshow-3');
    expect(m.root.querySelector('#gl-pq').value).toBe('Hall');
    expect(m.root.querySelector('#gl-pq').focused).toBe(1);
  });
  it('ignores a Show for a place that is not there', () => {
    const m = mount();
    press(m, 'gl-pshow-99');
    expect(m.root.querySelector('#gl-pq').value).toBe('');
  });
  it('saves the list as text only with a host that takes files', () => {
    const none = mount();
    expect(none.root.innerHTML).not.toContain('gl-problems-export');
    press(none, 'gl-problems-export');
    const files: ExportFile[] = [];
    const m = mount({ exports: files });
    press(m, 'gl-problems-export');
    expect(files[0]?.filename).toBe('records-to-look-at-en.txt');
    expect(files[0]?.text).toContain('Made on 2026-11-15.');
    expect(files[0]?.text).toContain('- Hall, Grab bar: No source is given.');
  });
  it('follows the places when a table is loaded', () => {
    const m = mount({ records: [] });
    m.root.querySelector('#gl-records-text').value = `${RECORD_COLUMNS.join(',')}\na,A,ramp,present,City open data,CC0-1.0,2026-10-01,tier-1,\n`;
    press(m, 'gl-records-load');
    expect(m.root.innerHTML).toContain('Nothing to look at in the records.');
  });
  it('is redrawn with the rest of the page', () => {
    const m = mount();
    m.root.fire('change', { id: 'gl-f-ramp', checked: true });
    expect(region(m.root, '[data-gl-problems]')).toContain('2 records have a problem.');
  });
  it('is French in French', () => {
    const files: ExportFile[] = [];
    const m = mount({ lang: 'fr', exports: files });
    expect(m.root.innerHTML).toContain('Fiches à examiner');
    expect(m.root.innerHTML).toContain('Hall, Rampe\u00a0: Aucun niveau n’est donné.');
    press(m, 'gl-problems-export');
    expect(files[0]?.filename).toBe('records-to-look-at-fr.txt');
  });
  it('says nothing about the places themselves', () => {
    const m = mount();
    m.root.fire('change', { id: 'gl-f-ramp', checked: true });
    expect(region(m.root, '[data-gl-problems]')).toContain('Hall, Ramp');
    expect(region(m.root, '[data-gl-problems]')).not.toMatch(/accessible/i);
  });
});
