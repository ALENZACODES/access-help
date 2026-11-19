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
const choose = (m: M, value: string): void => m.root.fire('change', { id: 'gl-fview', value });
const HALL_RAMP = '<tr><th scope="row">Hall</th><td data-status="conflict">sources disagree</td><td>2</td><td>2026-10-01</td></tr>';

describe('older records', () => {
  it('is a closed panel with the counts and the older records', () => {
    const html = mount().root.innerHTML;
    expect(html).toContain('<details class="gl-recages-panel"><summary>Older records</summary><div data-gl-recages>');
    expect(html).toContain('<ul class="gl-agecounts"><li>3 records are from the last year.</li><li>1 record is between one and two years old.</li></ul>');
    expect(html).toContain('<li data-age="aging">Hall, Ramp: reported as not available. Transit agency, dated 2025-03-04. <button type="button" class="gl-btn" id="gl-ageshow-3" aria-label="Show Hall in the list">Show</button></li>');
  });
  it('is in French', () => {
    const html = mount({ lang: 'fr' }).root.innerHTML;
    expect(html).toContain('<summary>Fiches plus anciennes</summary>');
    expect(html).toContain('<li>1 fiche date d’un à deux ans.</li>');
    expect(html).toContain('Demandez au lieu avant d’y aller.');
  });
  it('shows the place in the list when Show is pressed', () => {
    const m = mount();
    press(m, 'gl-ageshow-3');
    expect(m.root.querySelector('#gl-pq').value).toBe('Hall');
    expect(region(m.root, '[data-gl-presults]')).not.toContain('Library');
    press(m, 'gl-ageshow-99');
    expect(m.root.querySelector('#gl-pq').value).toBe('Hall');
  });
  it('has the save button only when the host takes files, and saves the list as text', () => {
    expect(mount().root.innerHTML).not.toContain('gl-recages-export');
    const exports: ExportFile[] = [];
    const m = mount({ exports });
    press(m, 'gl-recages-export');
    expect(exports).toHaveLength(1);
    expect(exports[0]?.filename).toBe('older-records-en.txt');
    expect(exports[0]?.mime).toBe('text/plain;charset=utf-8');
    expect(exports[0]?.text).toContain('Made on 2026-11-15.');
    expect(exports[0]?.text).toContain('- Hall, Ramp: reported as not available. Transit agency, dated 2025-03-04.');
  });
  it('follows the records as they change', () => {
    const m = mount({ records: [] });
    press(m, 'gl-rrm-3-1');
    expect(m.root.innerHTML).toContain('No record that can be reported is more than a year old.');
    expect(m.root.innerHTML).not.toContain('gl-ageshow-');
    press(m, 'gl-undo');
    expect(m.root.innerHTML).toContain('id="gl-ageshow-3"');
  });
  it('counts every record held, also when a source is left out of the count', () => {
    const m = mount();
    m.root.fire('change', { id: 'gl-rv-src-1', checked: false });
    expect(m.root.innerHTML).toContain('<li>1 record is between one and two years old.</li>');
  });
});

describe('one feature in every place', () => {
  it('is a closed panel with a list of features and a prompt', () => {
    const html = mount().root.innerHTML;
    expect(html).toContain('<details class="gl-fview-panel"><summary>One feature in every place</summary><label for="gl-fview">Feature to look at</label>');
    expect(html).toContain('<option value="" selected>Choose a feature</option>');
    expect(html).toContain('<div data-gl-fview><p class="gl-note">Choose a feature to see what is reported for it in each place.</p></div>');
  });
  it('draws only the table when a feature is chosen, so the list keeps the focus', () => {
    const m = mount();
    const before = m.root.innerHTML;
    choose(m, 'ramp');
    expect(m.root.innerHTML).toBe(before);
    const html = region(m.root, '[data-gl-fview]');
    expect(html).toContain('<p role="status">Places where it is reported as available: 1. Reported as not available: 0. Where it is unknown: 3.</p>');
    expect(html).toContain('<tr><th scope="row">Library</th><td data-status="present">reported as available</td><td>1</td><td>2026-10-01</td></tr>');
    expect(html).toContain(HALL_RAMP);
    expect(html).toContain('<tr><th scope="row">Pool</th><td data-status="unknown">unknown</td><td>0</td><td>No record</td></tr>');
  });
  it('is in French, with the token', () => {
    const m = mount({ lang: 'fr' });
    choose(m, 'ramp');
    expect(region(m.root, '[data-gl-fview]')).toContain('Où elle est UNKNOWN\u00a0: 3.');
    expect(region(m.root, '[data-gl-fview]')).toContain('<td data-status="conflict">les sources ne concordent pas</td>');
  });
  it('goes back to the prompt for no feature or one the glossary does not know', () => {
    const m = mount();
    choose(m, 'ramp');
    choose(m, 'not-a-term');
    expect(region(m.root, '[data-gl-fview]')).toContain('Choose a feature to see');
    choose(m, 'elevator');
    choose(m, '');
    expect(region(m.root, '[data-gl-fview]')).toContain('Choose a feature to see');
  });
  it('ignores an event with no value, and the same choice twice', () => {
    const m = mount();
    choose(m, 'ramp');
    m.root.querySelector('[data-gl-fview]').innerHTML = 'kept';
    m.root.fire('change', { id: 'gl-fview' });
    choose(m, 'ramp');
    expect(region(m.root, '[data-gl-fview]')).toBe('kept');
  });
  it('keeps the choice when the page is drawn again, and follows the records', () => {
    const m = mount({ records: [] });
    choose(m, 'ramp');
    press(m, 'gl-rrm-3-1');
    const html = m.root.innerHTML;
    expect(html).toContain('<option value="ramp" selected>Ramp</option>');
    expect(html).toContain('<tr><th scope="row">Hall</th><td data-status="present">reported as available</td><td>1</td><td>2026-10-01</td></tr>');
    press(m, 'gl-undo');
    expect(m.root.innerHTML).toContain(HALL_RAMP);
  });
  it('reports only what the counted records say when a source is left out', () => {
    const m = mount();
    choose(m, 'ramp');
    m.root.fire('change', { id: 'gl-rv-src-1', checked: false });
    expect(m.root.innerHTML).toContain('<tr><th scope="row">Hall</th><td data-status="present">reported as available</td><td>1</td><td>2026-10-01</td></tr>');
  });
  it('saves the table as text only when a feature is chosen and the host takes files', () => {
    const exports: ExportFile[] = [];
    const m = mount({ exports });
    press(m, 'gl-fview-export');
    expect(exports).toHaveLength(0);
    choose(m, 'ramp');
    expect(region(m.root, '[data-gl-fview]')).toContain('id="gl-fview-export">Save this table as text</button>');
    press(m, 'gl-fview-export');
    expect(exports).toHaveLength(1);
    expect(exports[0]?.filename).toBe('feature-ramp-en.txt');
    expect(exports[0]?.text).toContain('One feature in every place: Ramp\nMade on 2026-11-15.');
    expect(exports[0]?.text).toContain('- Hall: sources disagree. 2 records, the newest dated 2026-10-01.');
    const plain = mount();
    choose(plain, 'ramp');
    expect(region(plain.root, '[data-gl-fview]')).not.toContain('gl-fview-export');
    press(plain, 'gl-fview-export');
    expect(spoken(plain.root)).toBe('');
  });
});
