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
const type = (m: M, id: string, value: string): void => m.root.fire('input', { id, value });
const CSV = (rows: string[]): string => [HEAD, ...rows].join('\n');
const load = (m: M, text: string): void => {
  m.root.querySelector('#gl-records-text').value = text;
  press(m, 'gl-records-load');
};

describe('where sources disagree', () => {
  it('is a closed panel that lists both sides of each disagreement', () => {
    const html = mount().root.innerHTML;
    expect(html).toContain('<details class="gl-disagree-panel"><summary>Where sources disagree</summary><div data-gl-disagree>');
    expect(html).toContain('<p role="status">Sources disagree about 1 feature. It is in 1 place.</p>');
    expect(html).toContain('<strong>Hall, Ramp</strong>');
    expect(html).toContain('<li data-status="present">City open data, dated 2026-10-01: reported as available. Licence: CC0-1.0. Tier 1.</li>');
    expect(html).toContain('<li data-status="absent">Transit agency, dated 2025-03-04: reported as not available. Licence: OGL-Canada-2.0. Tier unknown.</li>');
  });
  it('is in French', () => {
    const html = mount({ lang: 'fr' }).root.innerHTML;
    expect(html).toContain('<summary>Là où les sources ne concordent pas</summary>');
    expect(html).toContain('Les sources ne concordent pas pour 1 caractéristique. Elle se trouve dans 1 lieu.');
    expect(html).toContain('Nous signalons ces caractéristiques comme UNKNOWN.');
  });
  it('shows the place in the list when Show is pressed', () => {
    const m = mount();
    press(m, 'gl-disshow-3');
    expect(m.root.querySelector('#gl-pq').value).toBe('Hall');
    expect(m.root.querySelector('#gl-pq').focused).toBe(1);
    expect(region(m.root, '[data-gl-presults]')).toContain('Hall');
    expect(region(m.root, '[data-gl-presults]')).not.toContain('Library');
  });
  it('does nothing for a Show button with no place', () => {
    const m = mount();
    press(m, 'gl-disshow-99');
    expect(m.root.querySelector('#gl-pq').value).toBe('');
  });
  it('has the save button only when the host takes files, and saves every disagreement as text', () => {
    expect(mount().root.innerHTML).not.toContain('gl-disagree-export');
    const exports: ExportFile[] = [];
    const m = mount({ exports });
    expect(m.root.innerHTML).toContain('id="gl-disagree-export">Save this list as text</button>');
    press(m, 'gl-disagree-export');
    expect(exports).toHaveLength(1);
    expect(exports[0]?.filename).toBe('sources-disagree-en.txt');
    expect(exports[0]?.mime).toBe('text/plain;charset=utf-8');
    expect(exports[0]?.text).toContain('Made on 2026-11-15.');
    expect(exports[0]?.text).toContain('Hall, Ramp\n- City open data, dated 2026-10-01: reported as available.');
  });
  it('saves nothing when the host takes no files', () => {
    const m = mount();
    press(m, 'gl-disagree-export');
    expect(spoken(m.root)).toBe('');
  });
  it('goes away when one side is removed, and comes back when that is undone', () => {
    const m = mount({ records: [] });
    press(m, 'gl-rrm-3-3');
    expect(m.root.innerHTML).toContain('No sources disagree in the records.');
    expect(m.root.innerHTML).not.toContain('gl-disshow-');
    press(m, 'gl-undo');
    expect(m.root.innerHTML).toContain('<strong>Hall, Ramp</strong>');
  });
  it('follows a loaded table', () => {
    const m = mount({ records: [] });
    load(m, CSV(['depot,Depot,ramp,present,City open data,CC0-1.0,2026-10-01,tier-1,', 'depot,Depot,ramp,absent,Transit agency,OGL-Canada-2.0,2025-03-04,,']));
    const html = m.root.innerHTML;
    expect(html).toContain('<strong>Depot, Ramp</strong>');
    expect(html).not.toContain('<strong>Hall, Ramp</strong>');
  });
  it('lists every place held, also when a source is left out of the count', () => {
    const m = mount();
    m.root.fire('change', { id: 'gl-rv-src-1', checked: false });
    expect(m.root.innerHTML).toContain('<strong>Hall, Ramp</strong>');
  });
});

describe('finding a record', () => {
  it('is a closed panel with a labelled box and a prompt', () => {
    const html = mount().root.innerHTML;
    expect(html).toContain('<details class="gl-recsearch"><summary>Find a record</summary><label for="gl-rsq">Words to find in the records</label>');
    expect(html).toContain('<div data-gl-rsr><p class="gl-note">Type a word to search the records.</p></div>');
  });
  it('redraws only the matches while the person types', () => {
    const m = mount();
    const before = m.root.innerHTML;
    type(m, 'gl-rsq', 'transit');
    expect(m.root.innerHTML).toBe(before);
    const html = region(m.root, '[data-gl-rsr]');
    expect(html).toContain('1 record has those words.');
    expect(html).toContain('Hall. Ramp: reported as not available. Source: Transit agency. Licence: OGL-Canada-2.0. Dated: 2025-03-04. Tier unknown.');
  });
  it('says so when no record has the words', () => {
    const m = mount({ lang: 'fr' });
    type(m, 'gl-rsq', 'zzz');
    expect(region(m.root, '[data-gl-rsr]')).toBe('<p class="gl-note" role="status">Aucune fiche ne contient ces mots.</p>');
  });
  it('goes back to the prompt when the box is emptied', () => {
    const m = mount();
    type(m, 'gl-rsq', 'hall');
    type(m, 'gl-rsq', '');
    expect(region(m.root, '[data-gl-rsr]')).toContain('Type a word to search the records.');
  });
  it('finds a record that cannot be used, shown as unknown', () => {
    const m = mount();
    type(m, 'gl-rsq', 'grab bar hall');
    expect(region(m.root, '[data-gl-rsr]')).toContain('<li data-status="unknown">Hall. Grab bar: unknown. Source: Unknown.');
  });
  it('shows the place in the list when Show is pressed', () => {
    const m = mount();
    type(m, 'gl-rsq', 'library');
    expect(region(m.root, '[data-gl-rsr]')).toContain('id="gl-rshow-0" aria-label="Show Library in the list">Show</button>');
    press(m, 'gl-rshow-0');
    expect(m.root.querySelector('#gl-pq').value).toBe('Library');
    expect(region(m.root, '[data-gl-presults]')).not.toContain('Hall');
  });
  it('keeps what was typed when the page is drawn again', () => {
    const m = mount({ records: [] });
    type(m, 'gl-rsq', 'transit');
    press(m, 'gl-rrm-0-0');
    expect(m.root.innerHTML).toContain('id="gl-rsq" class="gl-input" type="search" autocomplete="off" spellcheck="false" aria-describedby="gl-rsq-hint" value="transit">');
    expect(m.root.innerHTML).toContain('1 record has those words.');
  });
  it('follows the records as they change', () => {
    const m = mount({ records: [] });
    type(m, 'gl-rsq', 'transit');
    press(m, 'gl-rrm-3-1');
    expect(m.root.innerHTML).toContain('No records have those words.');
    press(m, 'gl-undo');
    expect(m.root.innerHTML).toContain('1 record has those words.');
  });
  it('does not draw the matches again when the same text comes twice, so a Show button being pressed is not replaced', () => {
    const m = mount();
    type(m, 'gl-rsq', 'library');
    m.root.querySelector('[data-gl-rsr]').innerHTML = 'kept';
    m.root.fire('change', { id: 'gl-rsq', value: 'library' });
    expect(region(m.root, '[data-gl-rsr]')).toBe('kept');
    m.root.fire('input', { id: 'gl-rsq', value: 'library hall' });
    expect(region(m.root, '[data-gl-rsr]')).toContain('No records have those words.');
  });
  it('does the same for the search of notes', () => {
    const m = mount();
    m.root.fire('input', { id: 'gl-nsq', value: 'quiet' });
    m.root.querySelector('[data-gl-nsr]').innerHTML = 'kept';
    m.root.fire('change', { id: 'gl-nsq', value: 'quiet' });
    expect(region(m.root, '[data-gl-nsr]')).toBe('kept');
  });
  it('reads only the first 100 characters typed', () => {
    const m = mount();
    type(m, 'gl-rsq', `${'x '.repeat(50)}library`);
    expect(region(m.root, '[data-gl-rsr]')).toContain('No records have those words.');
  });
  it('ignores an event with no value', () => {
    const m = mount();
    type(m, 'gl-rsq', 'hall');
    m.root.fire('input', { id: 'gl-rsq' });
    expect(region(m.root, '[data-gl-rsr]')).toContain('4 records have those words.');
  });
  it('searches every record held, also when a source is left out of the count', () => {
    const m = mount();
    m.root.fire('change', { id: 'gl-rv-src-1', checked: false });
    type(m, 'gl-rsq', 'transit');
    expect(region(m.root, '[data-gl-rsr]')).toContain('1 record has those words.');
  });
});
