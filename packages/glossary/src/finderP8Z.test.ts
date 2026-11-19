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
const pick = (m: M, value: string): void => m.root.fire('change', { id: 'gl-sview', value });
const TRANSIT_ROW = '<tr><th scope="row">Hall</th><td>Ramp</td><td data-status="absent">reported as not available</td><td>OGL-Canada-2.0</td><td>2025-03-04</td><td>Tier unknown</td></tr>';

describe('what is still unknown', () => {
  it('is a closed panel that looks at every feature until some are chosen', () => {
    const html = mount().root.innerHTML;
    expect(html).toContain('<details class="gl-gaps-panel"><summary>What is still unknown</summary><div data-gl-gaps>');
    expect(html).toContain('<p class="gl-note">This looks at every feature.</p>');
    expect(html).toContain('<p role="status">30 features are unknown, in 4 places.</p>');
    expect(html).toContain('<strong>Café Nord: 8 of 8 unknown</strong>');
    expect(html).toContain('<li data-reason="disagree">Ramp (sources disagree)</li>');
    expect(html).toContain('<li data-reason="not-usable">Grab bar (a record that cannot be used)</li>');
  });
  it('is in French, with the token', () => {
    const html = mount({ lang: 'fr' }).root.innerHTML;
    expect(html).toContain('<summary>Ce qui est encore UNKNOWN</summary>');
    expect(html).toContain('30 caractéristiques sont UNKNOWN, dans 4 lieux.');
  });
  it('follows the features the person chooses', () => {
    const m = mount();
    m.root.fire('change', { id: 'gl-f-ramp', checked: true });
    const html = region(m.root, '[data-gl-gaps]');
    expect(html).toContain('This looks at the 1 feature you chose.');
    expect(html).toContain('<p role="status">3 features are unknown, in 3 places.</p>');
    expect(html).not.toContain('Library');
    expect(html).toContain('<strong>Hall: 1 of 1 unknown</strong>');
  });
  it('shows the place in the list when Show is pressed', () => {
    const m = mount();
    press(m, 'gl-gapshow-2');
    expect(m.root.querySelector('#gl-pq').value).toBe('Pool');
    press(m, 'gl-gapshow-99');
    expect(m.root.querySelector('#gl-pq').value).toBe('Pool');
  });
  it('has the save button only when the host takes files, and saves what is looked at', () => {
    expect(mount().root.innerHTML).not.toContain('gl-gaps-export');
    const exports: ExportFile[] = [];
    const m = mount({ exports });
    m.root.fire('change', { id: 'gl-f-ramp', checked: true });
    press(m, 'gl-gaps-export');
    expect(exports).toHaveLength(1);
    expect(exports[0]?.filename).toBe('still-unknown-en.txt');
    expect(exports[0]?.mime).toBe('text/plain;charset=utf-8');
    expect(exports[0]?.text).toContain('Made on 2026-11-15.');
    expect(exports[0]?.text).toContain('This looks at the 1 feature you chose.');
    expect(exports[0]?.text).toContain('Hall: 1 of 1 unknown\n- Ramp (sources disagree)');
  });
  it('follows the records as they change', () => {
    const m = mount({ records: [] });
    press(m, 'gl-rrm-3-1');
    expect(m.root.innerHTML).toContain('<p role="status">29 features are unknown, in 4 places.</p>');
    press(m, 'gl-undo');
    expect(m.root.innerHTML).toContain('<p role="status">30 features are unknown, in 4 places.</p>');
  });
  it('reports only what the counted records say when a source is left out', () => {
    const m = mount();
    m.root.fire('change', { id: 'gl-rv-src-1', checked: false });
    expect(m.root.innerHTML).toContain('<p role="status">29 features are unknown, in 4 places.</p>');
  });
});

describe('one source, every record', () => {
  it('is a closed panel with a list of sources and a prompt', () => {
    const html = mount().root.innerHTML;
    expect(html).toContain('<details class="gl-sview-panel"><summary>One source, every record</summary><label for="gl-sview">Source to look at</label>');
    expect(html).toContain('<option value="" selected>Choose a source</option><option value="0">City open data</option><option value="1">Transit agency</option>');
    expect(html).toContain('<div data-gl-sview><p class="gl-note">Choose a source to see every record that comes from it.</p></div>');
  });
  it('draws only the table when a source is chosen, so the list keeps the focus', () => {
    const m = mount();
    const before = m.root.innerHTML;
    pick(m, '1');
    expect(m.root.innerHTML).toBe(before);
    const html = region(m.root, '[data-gl-sview]');
    expect(html).toContain('<p role="status">1 record, in 1 place. Dated 2025-03-04.</p>');
    expect(html).toContain(TRANSIT_ROW);
  });
  it('is in French', () => {
    const m = mount({ lang: 'fr' });
    pick(m, '0');
    expect(region(m.root, '[data-gl-sview]')).toContain('<p role="status">3 fiches, dans 2 lieux. Date du 2026-10-01.</p>');
    expect(region(m.root, '[data-gl-sview]')).toContain('<caption>Toutes les fiches de cette source\u00a0: City open data</caption>');
  });
  it('goes back to the prompt for no source or a value that is not in the list', () => {
    const m = mount();
    pick(m, '1');
    pick(m, '7');
    expect(region(m.root, '[data-gl-sview]')).toContain('Choose a source to see');
    pick(m, '0');
    pick(m, '');
    expect(region(m.root, '[data-gl-sview]')).toContain('Choose a source to see');
  });
  it('ignores an event with no value, and the same choice twice', () => {
    const m = mount();
    pick(m, '1');
    m.root.querySelector('[data-gl-sview]').innerHTML = 'kept';
    m.root.fire('change', { id: 'gl-sview' });
    pick(m, '1');
    expect(region(m.root, '[data-gl-sview]')).toBe('kept');
  });
  it('keeps the choice when the page is drawn again, and follows the records', () => {
    const m = mount({ records: [] });
    pick(m, '0');
    press(m, 'gl-rrm-0-0');
    const html = m.root.innerHTML;
    expect(html).toContain('<option value="0" selected>City open data</option>');
    expect(html).toContain('<p role="status">2 records, in 1 place. Dated 2026-10-01.</p>');
  });
  it('goes back to the prompt when the last record of the source is removed, and returns on undo', () => {
    const m = mount({ records: [] });
    pick(m, '1');
    press(m, 'gl-rrm-3-1');
    expect(m.root.innerHTML).toContain('<option value="" selected>Choose a source</option><option value="0">City open data</option></select>');
    expect(m.root.innerHTML).not.toContain('Every record from this source');
    press(m, 'gl-undo');
    expect(m.root.innerHTML).toContain('<option value="1" selected>Transit agency</option>');
    expect(m.root.innerHTML).toContain(TRANSIT_ROW);
  });
  it('lists the records held, also when the source is left out of the count', () => {
    const m = mount();
    pick(m, '1');
    m.root.fire('change', { id: 'gl-rv-src-1', checked: false });
    expect(m.root.innerHTML).toContain(TRANSIT_ROW);
  });
  it('saves the table as text only when a source is chosen and the host takes files', () => {
    const exports: ExportFile[] = [];
    const m = mount({ exports });
    press(m, 'gl-sview-export');
    expect(exports).toHaveLength(0);
    pick(m, '1');
    expect(region(m.root, '[data-gl-sview]')).toContain('id="gl-sview-export">Save this table as text</button>');
    press(m, 'gl-sview-export');
    expect(exports).toHaveLength(1);
    expect(exports[0]?.filename).toBe('source-records-en.txt');
    expect(exports[0]?.text).toContain('Every record from this source: Transit agency\nMade on 2026-11-15.');
    expect(exports[0]?.text).toContain('- Hall, Ramp: reported as not available. Licence: OGL-Canada-2.0. Dated: 2025-03-04. Tier unknown.');
    const plain = mount();
    pick(plain, '1');
    expect(region(plain.root, '[data-gl-sview]')).not.toContain('gl-sview-export');
    press(plain, 'gl-sview-export');
    expect(spoken(plain.root)).toBe('');
  });
});
