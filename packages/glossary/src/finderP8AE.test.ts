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
const change = (m: M, id: string, value: string): void => m.root.fire('change', { id, value });
const results = (m: M): string => region(m.root, '[data-gl-presults]');
const filter = (m: M): string => region(m.root, '[data-gl-if]');
const setForm = (m: M, values: Record<string, string>): void => {
  for (const [field, value] of Object.entries(values)) m.root.querySelector(`#gl-pi-${field}`).value = value;
};
const GOOD = { kind: 'recreation', area: 'Lakeside', source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };

describe('the kind and area on each place', () => {
  it('shows a line under each place when some place holds a kind or an area', () => {
    const html = mount().root.innerHTML;
    expect(html).toContain('<p class="gl-note gl-placeinfo" data-kind="library" data-area="known">Kind of place: Library. Area: Riverside. Source: City open data, dated 2026-10-01.</p>');
    expect(html).toContain('data-kind="unknown" data-area="unknown">Kind of place: Unknown. Area: Unknown.</p>');
    expect(html.match(/class="gl-note gl-placeinfo"/g)).toHaveLength(4);
  });
  it('says why when a kind or an area is held without a usable source', () => {
    expect(mount().root.innerHTML).toContain('Kind of place: Unknown. Area: Unknown. A kind or an area is held for this place, but it has no usable source. It is shown as Unknown.');
  });
  it('shows no such line, and no lists to narrow by, when no place holds one', () => {
    const html = mount({ places: bare }).root.innerHTML;
    expect(html).not.toContain('gl-placeinfo');
    expect(html).toContain('<div data-gl-if></div>');
    expect(html).toContain('No place has a kind or an area yet.');
  });
  it('is in French, with the token', () => {
    const html = mount({ lang: 'fr' }).root.innerHTML;
    expect(html).toContain('Type de lieu\u00a0: Bibliothèque. Secteur\u00a0: Riverside. Source\u00a0: City open data, date du 2026-10-01.');
    expect(html).toContain('Type de lieu\u00a0: UNKNOWN. Secteur\u00a0: UNKNOWN.');
  });
});

describe('narrowing the list by kind and area', () => {
  it('offers each kind and area that can be reported, with its number of places', () => {
    const html = mount().root.innerHTML;
    expect(html).toContain('<option value="library">Library (1)</option><option value="cafe">Coffee shop (1)</option><option value="unknown">Kind unknown (2)</option>');
    expect(html).toContain('<option value="0">Riverside (2)</option><option value="unknown">Area unknown (2)</option>');
  });
  it('narrows the results to a kind, says how many are left, and keeps the focus on the list', () => {
    const m = mount();
    change(m, 'gl-if-kind', 'library');
    expect(results(m)).toContain('Library');
    expect(results(m)).not.toContain('Café Nord');
    expect(results(m)).not.toContain('>Hall<');
    expect(filter(m)).toContain('<option value="library" selected>Library (1)</option>');
    expect(filter(m)).toContain('<p role="status" data-gl-if-status>1 of 4 places are of this kind and in this area.</p>');
    expect(spoken(m.root)).toBe('1 of 4 places are of this kind and in this area.');
    expect(m.root.querySelector('#gl-if-kind').focused).toBe(1);
  });
  it('narrows to an area, joining names that differ only by case', () => {
    const m = mount();
    change(m, 'gl-if-area', '0');
    expect(results(m)).toContain('Library');
    expect(results(m)).toContain('Café Nord');
    expect(results(m)).not.toContain('Pool');
    expect(spoken(m.root)).toBe('2 of 4 places are of this kind and in this area.');
  });
  it('narrows by both at once', () => {
    const m = mount();
    change(m, 'gl-if-area', '0');
    change(m, 'gl-if-kind', 'cafe');
    expect(results(m)).toContain('Café Nord');
    expect(results(m)).not.toContain('Library');
    expect(filter(m)).toContain('1 of 4 places');
  });
  it('can show only the places whose kind is unknown, so they are never lost', () => {
    const m = mount();
    change(m, 'gl-if-kind', 'unknown');
    expect(results(m)).toContain('Pool');
    expect(results(m)).toContain('Hall');
    expect(results(m)).not.toContain('Library');
    expect(spoken(m.root)).toBe('2 of 4 places are of this kind and in this area.');
  });
  it('shows every place again when the choice is cleared', () => {
    const m = mount();
    change(m, 'gl-if-kind', 'library');
    expect(filter(m)).toContain('id="gl-if-clear"');
    press(m, 'gl-if-clear');
    expect(results(m)).toContain('Café Nord');
    expect(filter(m)).not.toContain('id="gl-if-clear"');
    expect(spoken(m.root)).toBe('Every kind and area is shown.');
    change(m, 'gl-if-kind', 'cafe');
    change(m, 'gl-if-kind', '');
    expect(results(m)).toContain('Library');
  });
  it('ignores a choice that is not in the list, and an event with no value', () => {
    const m = mount();
    change(m, 'gl-if-kind', 'castle');
    change(m, 'gl-if-area', '9');
    m.root.fire('change', { id: 'gl-if-kind' });
    expect(results(m)).toContain('Library');
    expect(results(m)).toContain('Hall');
  });
  it('works together with the name search and the chosen features', () => {
    const m = mount();
    change(m, 'gl-if-area', '0');
    m.root.fire('input', { id: 'gl-pq', value: 'caf' });
    expect(results(m)).toContain('Caf');
    expect(results(m)).not.toContain('Library');
  });
  it('goes back to every place when the chosen kind is no longer held', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    change(m, 'gl-if-kind', 'library');
    press(m, removePlaceId(0));
    expect(records).toHaveLength(1);
    expect(records[0]?.map((p) => p.id)).toEqual(['cafe', 'pool', 'hall']);
    const html = m.root.innerHTML;
    expect(html).not.toContain('Library (1)');
    expect(html).toContain('<option value="" selected>Any kind of place</option><option value="cafe">Coffee shop (1)</option>');
    expect(html).toContain('<h3 id="place-0-cafe">');
  });
  it('follows the choices about which records count: a source left out makes its kinds unknown', () => {
    const m = mount();
    m.root.fire('change', { id: 'gl-rv-src-0', checked: false });
    const html = m.root.innerHTML;
    expect(html).not.toContain('<option value="library">');
    expect(html).toContain('<option value="cafe">Coffee shop (1)</option><option value="unknown">Kind unknown (3)</option>');
  });
  it('is in French', () => {
    const m = mount({ lang: 'fr' });
    change(m, 'gl-if-kind', 'library');
    expect(filter(m)).toContain('<option value="library" selected>Bibliothèque (1)</option>');
    expect(spoken(m.root)).toBe('1 lieux sur 4 sont de ce type et dans ce secteur.');
  });
});

describe('the panel of places by kind and area', () => {
  it('counts the places of each kind and area', () => {
    const html = mount().root.innerHTML;
    expect(html).toContain('<details class="gl-info-panel"><summary>Places by kind and area</summary><div data-gl-info>');
    expect(html).toContain('<p role="status">2 of 4 places have a kind or an area that can be reported.</p>');
    expect(html).toContain('<tr data-row="library"><th scope="row">Library</th><td>1</td></tr>');
    expect(html).toContain('<tr data-row="known"><th scope="row">Riverside</th><td>2</td></tr>');
    expect(html).toContain('<tr data-row="unknown"><th scope="row">Unknown</th><td>2</td></tr>');
  });
  it('has the form only when the host keeps records', () => {
    expect(mount().root.innerHTML).not.toContain('data-gl-pi');
    expect(mount({ records: [] }).root.innerHTML).toContain('<div data-gl-pi><h4>Set the kind and area of a place</h4>');
  });
});

describe('setting the kind and area of a place', () => {
  it('fills the form with what the chosen place holds, redrawing only the form', () => {
    const m = mount({ records: [] });
    const before = m.root.innerHTML;
    change(m, 'gl-pi-place', '0');
    expect(m.root.innerHTML).toBe(before);
    const form = region(m.root, '[data-gl-pi]');
    expect(form).toContain('<option value="0" selected>Library</option>');
    expect(form).toContain('<option value="library" selected>Library</option>');
    expect(form).toContain('id="gl-pi-area" class="gl-input" maxlength="120" autocomplete="off" value="Riverside">');
    expect(form).toContain('id="gl-pi-remove"');
    expect(m.root.querySelector('#gl-pi-place').focused).toBe(1);
  });
  it('saves a kind and area with a source, tells the host, and offers Undo', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    change(m, 'gl-pi-place', '2');
    setForm(m, GOOD);
    press(m, 'gl-pi-save');
    const html = m.root.innerHTML;
    expect(html).toContain('Kind of place: Pool or arena. Area: Lakeside. Source: City open data, dated 2026-10-01.');
    expect(html).toContain('<p role="status" data-gl-pi-msg>Saved the kind and area of Pool.</p>');
    expect(html).toContain('id="gl-undo">Undo: kind and area</button>');
    expect(html).toContain('Set the kind and area of Pool.');
    expect(html).toContain('<option value="recreation">Pool or arena (1)</option>');
    expect(spoken(m.root)).toBe('Saved the kind and area of Pool.');
    expect(records).toHaveLength(1);
    expect(records[0]?.[2]?.info).toEqual({ kind: 'recreation', area: 'Lakeside', provenance: { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' } });
    expect(m.root.querySelector('#gl-undo').focused).toBe(1);
  });
  it('takes the kind and area away again when the step is undone', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    change(m, 'gl-pi-place', '2');
    setForm(m, GOOD);
    press(m, 'gl-pi-save');
    press(m, 'gl-undo');
    expect(m.root.innerHTML).not.toContain('Lakeside');
    expect('info' in (records[records.length - 1]?.[2] as Place)).toBe(false);
  });
  it('saves nothing without a source, an open licence and a real date, and says what to fix', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    change(m, 'gl-pi-place', '2');
    setForm(m, { ...GOOD, source: '', licence: '', date: '2030-01-01' });
    press(m, 'gl-pi-save');
    const form = region(m.root, '[data-gl-pi]');
    expect(form).toContain('<div id="gl-pi-errors" role="alert"><p>There are 3 things to fix before this can be saved.</p>');
    expect(form).toContain('<li>The date cannot be after today.</li>');
    expect(form).toContain('value="Lakeside"');
    expect(form).toContain('<option value="2" selected>Pool</option>');
    expect(spoken(m.root)).toBe('There are 3 things to fix before this can be saved.');
    expect(records).toHaveLength(0);
    expect(m.root.innerHTML).not.toContain('id="gl-undo"');
  });
  it('asks for a place when none is chosen', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    setForm(m, GOOD);
    press(m, 'gl-pi-save');
    expect(region(m.root, '[data-gl-pi]')).toContain('<p role="status" data-gl-pi-msg>Choose a place first.</p>');
    expect(records).toHaveLength(0);
  });
  it('says so when the place already has this kind and area', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    change(m, 'gl-pi-place', '0');
    setForm(m, { kind: 'library', area: 'Riverside', source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' });
    press(m, 'gl-pi-save');
    expect(region(m.root, '[data-gl-pi]')).toContain('The place already has this kind and area.');
    expect(records).toHaveLength(0);
  });
  it('removes the kind and area of a place, and Undo brings them back', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    change(m, 'gl-pi-place', '0');
    press(m, 'gl-pi-remove');
    expect(m.root.innerHTML).toContain('<p role="status" data-gl-pi-msg>Removed the kind and area of Library.</p>');
    expect(m.root.innerHTML).toContain('Removed the kind and area of Library.');
    expect('info' in (records[0]?.[0] as Place)).toBe(false);
    expect(records[0]?.[0]?.claims).toHaveLength(1);
    press(m, 'gl-undo');
    expect(records[records.length - 1]?.[0]?.info?.kind).toBe('library');
  });
  it('keeps the kind and area in the table of records, so they survive a reload', () => {
    const exports: ExportFile[] = [];
    const m = mount({ records: [], exports });
    press(m, 'gl-records-export');
    expect(exports[0]?.text.split('\r\n')[0]).toBe([...RECORD_COLUMNS, 'place_kind', 'place_area'].join(','));
    expect(exports[0]?.text).toContain('lib,Library,,,City open data,CC0-1.0,2026-10-01,tier-1,,library,Riverside');
  });
  it('does nothing while a source is left out of the count, and for a host that keeps no records', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    change(m, 'gl-pi-place', '2');
    m.root.fire('change', { id: 'gl-rv-src-1', checked: false });
    expect(m.root.innerHTML).not.toContain('data-gl-pi');
    setForm(m, GOOD);
    press(m, 'gl-pi-save');
    press(m, 'gl-pi-remove');
    expect(records).toHaveLength(0);
    const plain = mount();
    press(plain, 'gl-pi-save');
    expect(spoken(plain.root)).toBe('');
  });
  it('ignores a place that is not in the list', () => {
    const m = mount({ records: [] });
    change(m, 'gl-pi-place', '44');
    change(m, 'gl-pi-place', 'x');
    expect(region(m.root, '[data-gl-pi]')).toBe('');
  });
  it('is in French', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records, lang: 'fr' });
    change(m, 'gl-pi-place', '2');
    setForm(m, GOOD);
    press(m, 'gl-pi-save');
    expect(m.root.innerHTML).toContain('Type et secteur enregistrés pour Pool.');
    expect(m.root.innerHTML).toContain('id="gl-undo">Annuler\u00a0: type et secteur</button>');
    expect(m.root.innerHTML).toContain('Type de lieu\u00a0: Piscine ou aréna. Secteur\u00a0: Lakeside.');
  });
});
