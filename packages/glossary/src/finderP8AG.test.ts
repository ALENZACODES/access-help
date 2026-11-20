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
const walk = (m: M): string => region(m.root, '[data-gl-steps-walk]');
const over = (m: M): string => region(m.root, '[data-gl-steps-over]');
const order = (html: string): string[] => [...html.matchAll(/<tr><th scope="row">([^<]+)<\/th>/g)].map((x) => x[1] as string);
const overOf = (html: string): string => html.slice(html.indexOf('<div data-gl-steps-over>'), html.indexOf('</table>', html.indexOf('<div data-gl-steps-over>')));
const sawRamp = (m: M, place: string, what: string): void => {
  for (const [field, value] of Object.entries({ place, feature: 'ramp', what, date: '2026-11-14', note: '' })) m.root.querySelector(`#gl-seen-${field}`).value = value;
  press(m, 'gl-seen-save');
};

describe('the panel for a visit, step by step', () => {
  it('is part of the page: what it is, a list of places, and the table of every place', () => {
    const html = mount().root.innerHTML;
    expect(html).toContain(
      '<details class="gl-steps-panel"><summary>A visit, step by step</summary><p>Choose a place to see what the records report for each step of a visit. The steps do not say how easy a place is to use.</p>' +
        '<div data-gl-steps-walk><label for="gl-steps-place">Place for the steps</label><select id="gl-steps-place" class="gl-select"><option value="" selected>Choose a place</option><option value="0">Library</option>',
    );
    expect(html).toContain('<div data-gl-steps-over><h4>How much is known, place by place</h4>');
    expect(html).not.toContain('gl-steps-title');
  });
  it('asks for places when none are loaded', () => {
    const html = mount({ places: [] }).root.innerHTML;
    expect(html).toContain('<div data-gl-steps-walk><p class="gl-note">Load places to see a visit step by step.</p></div><div data-gl-steps-over></div>');
  });
  it('is in French', () => {
    const html = mount({ lang: 'fr' }).root.innerHTML;
    expect(html).toContain('<summary>Une visite, étape par étape</summary>');
    expect(html).toContain('<label for="gl-steps-place">Lieu pour les étapes</label>');
  });
});

describe('choosing a place for the steps', () => {
  it('sets out the visit, redrawing only that part, and keeps the focus on the list', () => {
    const m = mount();
    const before = m.root.innerHTML;
    change(m, 'gl-steps-place', '0');
    expect(m.root.innerHTML).toBe(before);
    const html = walk(m);
    expect(html).toContain('<option value="0" selected>Library</option>');
    expect(html).toContain('<h4 id="gl-steps-title" tabindex="-1">A visit to Library, step by step</h4><p role="status">Features on this visit that are still Unknown: 7 of 8.</p><p data-gl-steps-first>The information first runs short at this step: Arriving.</p>');
    expect(html).toContain('<li data-state="available">Ramp: reported as available. Source: City open data, dated 2026-10-01.</li>');
    expect(m.root.querySelector('#gl-steps-place').focused).toBe(1);
    expect(spoken(m.root)).toBe('');
  });
  it('reports a feature the sources disagree about as unknown, and says why', () => {
    const m = mount();
    change(m, 'gl-steps-place', '3');
    expect(walk(m)).toContain('<li data-state="disagree">Ramp: Unknown, because the sources disagree.</li>');
    expect(walk(m)).toContain('<li data-state="unknown">Grab bar: Unknown.</li>');
    expect(walk(m)).toContain('<li data-state="available">Elevator: reported as available.');
  });
  it('goes back to the list alone when no place is chosen, and ignores a place that is not there', () => {
    const m = mount();
    change(m, 'gl-steps-place', '0');
    change(m, 'gl-steps-place', '');
    expect(walk(m)).not.toContain('gl-steps-title');
    change(m, 'gl-steps-place', '44');
    change(m, 'gl-steps-place', 'x');
    m.root.fire('change', { id: 'gl-steps-place' });
    expect(walk(m)).toContain('<option value="" selected>Choose a place</option>');
  });
  it('is in French with the token', () => {
    const m = mount({ lang: 'fr' });
    change(m, 'gl-steps-place', '1');
    expect(walk(m)).toContain('Une visite à Café Nord, étape par étape');
    expect(walk(m)).toContain('Caractéristiques de cette visite qui restent UNKNOWN\u00a0: 8 sur 8.');
    expect(walk(m)).toContain('<li data-state="unknown">Rampe\u00a0: UNKNOWN.</li>');
  });
});

describe('setting a second place beside the first', () => {
  it('offers the other places once a place is chosen', () => {
    const m = mount();
    expect(walk(m)).not.toContain('gl-steps-other');
    change(m, 'gl-steps-place', '0');
    expect(walk(m)).toContain('<label for="gl-steps-other">Compare with another place</label><select id="gl-steps-other" class="gl-select"><option value="" selected>No other place</option><option value="1">Café Nord</option><option value="2">Pool</option><option value="3">Hall</option></select>');
  });
  it('sets the two visits side by side, says how they differ, and keeps the focus on the list', () => {
    const m = mount();
    change(m, 'gl-steps-place', '0');
    change(m, 'gl-steps-other', '3');
    const html = walk(m);
    expect(html).toContain('<option value="3" selected>Hall</option>');
    expect(html).toContain('<h5 id="gl-steps-compare-title">Library and Hall, side by side</h5><p role="status" data-gl-steps-compare>Features where the records differ between the two places: 2 of 8. Features that are Unknown for both places: 6.</p>');
    expect(html).toContain('<tr data-differs="true"><th scope="row">Ramp</th><td data-state="available"><strong>Reported as available</strong></td><td data-state="disagree"><strong>Unknown, because the sources disagree</strong></td></tr>');
    expect(html).toContain('A visit to Library, step by step');
    expect(spoken(m.root)).toBe('Features where the records differ between the two places: 2 of 8. Features that are Unknown for both places: 6.');
    expect(m.root.querySelector('#gl-steps-other').focused).toBe(1);
  });
  it('goes back to one place, and ignores the place itself or a place that is not there', () => {
    const m = mount();
    change(m, 'gl-steps-place', '0');
    change(m, 'gl-steps-other', '3');
    change(m, 'gl-steps-other', '');
    expect(walk(m)).not.toContain('gl-steps-compare-title');
    for (const value of ['0', '9', 'x']) {
      change(m, 'gl-steps-other', value);
      expect(walk(m), value).not.toContain('gl-steps-compare-title');
    }
  });
  it('does nothing before a first place is chosen', () => {
    const m = mount();
    change(m, 'gl-steps-other', '3');
    expect(walk(m)).toBe('');
    expect(spoken(m.root)).toBe('');
  });
  it('starts again when another first place is chosen', () => {
    const m = mount();
    change(m, 'gl-steps-place', '0');
    change(m, 'gl-steps-other', '3');
    change(m, 'gl-steps-place', '1');
    expect(walk(m)).toContain('<option value="" selected>No other place</option><option value="0">Library</option>');
    expect(walk(m)).not.toContain('gl-steps-compare-title');
    press(m, 'gl-steps-see-0');
    change(m, 'gl-steps-other', '3');
    press(m, 'gl-steps-see-0');
    expect(walk(m)).toContain('Library and Hall, side by side');
  });
  it('adds the two visits side by side to the saved text', () => {
    const exports: ExportFile[] = [];
    const m = mount({ exports });
    change(m, 'gl-steps-place', '0');
    change(m, 'gl-steps-other', '3');
    press(m, 'gl-steps-export');
    const text = exports[0]?.text ?? '';
    expect(text.startsWith('A visit to Library, step by step\n')).toBe(true);
    expect(text).toContain('\n\nLibrary and Hall, side by side\nFeatures where the records differ between the two places: 2 of 8.');
    expect(text.endsWith('- Accessible washroom: Library: Unknown. Hall: Unknown.\n')).toBe(true);
  });
  it('is in French', () => {
    const m = mount({ lang: 'fr' });
    change(m, 'gl-steps-place', '0');
    change(m, 'gl-steps-other', '1');
    expect(walk(m)).toContain('Library et Café Nord, côte à côte');
    expect(spoken(m.root)).toBe('Caractéristiques où les fiches diffèrent entre les deux lieux\u00a0: 1 sur 8. Caractéristiques qui sont UNKNOWN pour les deux lieux\u00a0: 7.');
  });
});

describe('the steps follow the rest of the page', () => {
  it('mark a must-have as soon as the person chooses one', () => {
    const m = mount();
    change(m, 'gl-steps-place', '0');
    m.root.fire('change', { id: 'gl-must-elevator', checked: true });
    expect(walk(m)).toContain('<li data-state="unknown">Elevator: Unknown. This is one of your must-haves.</li>');
    expect(walk(m)).toContain('<h5>Must-haves the records do not report as available</h5><ul data-steps-list="must"><li>Elevator: Unknown.</li></ul>');
  });
  it('set what the person saw beside the feature, without changing what the records report', () => {
    const m = mount();
    change(m, 'gl-steps-place', '0');
    sawRamp(m, '0', 'not-there');
    expect(walk(m)).toContain('<li data-state="available">Ramp: reported as available. Source: City open data, dated 2026-10-01. You saw for yourself on 2026-11-14: it was not there.</li>');
    expect(walk(m)).toContain('<h5>Where what you saw differs from the records</h5><ul data-steps-list="differs"><li>Ramp: reported as available.');
    expect(walk(m)).toContain('Features on this visit that are still Unknown: 7 of 8.');
  });
  it('keep a feature unknown when only the person saw it', () => {
    const m = mount();
    change(m, 'gl-steps-place', '1');
    sawRamp(m, '1', 'there');
    expect(walk(m)).toContain('<li data-state="unknown">Ramp: Unknown. You saw for yourself on 2026-11-14: it was there.</li>');
    expect(walk(m)).toContain('still Unknown: 8 of 8.');
    expect(over(m)).toContain('<tr><th scope="row">Café Nord</th><td data-unknown="2">0 of 2 known</td>');
  });
  it('follow the choices about which records count', () => {
    const m = mount();
    change(m, 'gl-steps-place', '0');
    m.root.fire('change', { id: 'gl-rv-src-0', checked: false });
    expect(m.root.innerHTML).toContain('<li data-state="unknown">Ramp: Unknown.</li>');
    expect(m.root.innerHTML).toContain('still Unknown: 8 of 8.');
  });
  it('start again from the list when the places change', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    change(m, 'gl-steps-place', '1');
    press(m, removePlaceId(0));
    expect(m.root.innerHTML).toContain('<div data-gl-steps-walk><label for="gl-steps-place">Place for the steps</label><select id="gl-steps-place" class="gl-select"><option value="" selected>Choose a place</option><option value="0">Café Nord</option>');
    expect(order(overOf(m.root.innerHTML))).toEqual(['Hall', 'Café Nord', 'Pool']);
  });
});

describe('the table of every place', () => {
  it('lists the places with the most known for the whole visit first', () => {
    const html = mount().root.innerHTML;
    const table = overOf(html);
    expect(order(table)).toEqual(['Hall', 'Library', 'Café Nord', 'Pool']);
    expect(table).toContain('<option value="visit" selected>Most known for the whole visit</option>');
    expect(table).toContain('<p role="status">Places listed: 4. Places where nothing is Unknown: 0. Places where everything is Unknown: 2.</p>');
    expect(table).toContain('<tr><th scope="row">Library</th><td data-unknown="2">0 of 2 known</td><td data-unknown="3">1 of 4 known</td><td data-unknown="2">0 of 2 known</td><td data-unknown="3">0 of 3 known</td><td data-unknown="7">1 of 8 known</td>');
  });
  it('can be ordered by name or by one step, redrawing only the table', () => {
    const m = mount();
    const before = m.root.innerHTML;
    change(m, 'gl-steps-sort', 'name');
    expect(order(over(m))).toEqual(['Café Nord', 'Hall', 'Library', 'Pool']);
    expect(over(m)).toContain('<option value="name" selected>Name of the place</option>');
    expect(m.root.querySelector('#gl-steps-sort').focused).toBe(1);
    change(m, 'gl-steps-sort', 'moving-inside');
    expect(order(over(m))[0]).toBe('Hall');
    change(m, 'gl-steps-sort', 'getting-in');
    expect(order(over(m))[0]).toBe('Library');
    change(m, 'gl-steps-sort', 'best');
    expect(over(m)).toContain('<option value="getting-in" selected>');
    expect(m.root.innerHTML).toBe(before);
  });
  it('can be narrowed to the saved places', () => {
    const m = mount();
    change(m, 'gl-steps-scope', 'saved');
    expect(over(m)).toContain('<p class="gl-note" data-gl-steps-empty>You have no saved places.</p>');
    expect(m.root.querySelector('#gl-steps-scope').focused).toBe(1);
    save(m, 2, 0);
    expect(order(over(m))).toEqual(['Library', 'Pool']);
    expect(over(m)).toContain('<option value="saved" selected>Saved places</option>');
    expect(over(m)).toContain('Places listed: 2.');
    change(m, 'gl-steps-scope', 'everything');
    expect(over(m)).toContain('<option value="saved" selected>');
    change(m, 'gl-steps-scope', 'all');
    expect(order(over(m))).toHaveLength(4);
  });
  it('can be narrowed to the places in the plan', () => {
    const m = mount();
    change(m, 'gl-steps-scope', 'plan');
    expect(over(m)).toContain('Your plan has no places.');
  });
  it('keeps the order and the choice of places when the records change', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    change(m, 'gl-steps-sort', 'name');
    press(m, removePlaceId(3));
    const html = m.root.innerHTML;
    expect(html).toContain('<option value="name" selected>Name of the place</option>');
    expect(order(overOf(html))).toEqual(['Café Nord', 'Library', 'Pool']);
  });
  it('has a button on each row that sets out the steps of that place, says so and moves the focus to them', () => {
    const m = mount();
    press(m, 'gl-steps-see-3');
    expect(walk(m)).toContain('<option value="3" selected>Hall</option>');
    expect(walk(m)).toContain('A visit to Hall, step by step');
    expect(spoken(m.root)).toBe('Showing the steps of a visit to Hall.');
    expect(m.root.querySelector('#gl-steps-title').focused).toBe(1);
    press(m, 'gl-steps-see-9');
    expect(walk(m)).toContain('A visit to Hall, step by step');
  });
  it('is in French', () => {
    const m = mount({ lang: 'fr' });
    expect(m.root.innerHTML).toContain('<td data-unknown="7">1 sur 8 connues</td>');
    press(m, 'gl-steps-see-0');
    expect(spoken(m.root)).toBe('Affichage des étapes d’une visite à Library.');
  });
});

describe('saving the steps', () => {
  it('has no buttons for a host that cannot save files', () => {
    const m = mount();
    change(m, 'gl-steps-place', '0');
    expect(walk(m)).not.toContain('gl-steps-export');
    expect(m.root.innerHTML).not.toContain('gl-steps-table');
    press(m, 'gl-steps-export');
    press(m, 'gl-steps-table');
    expect(spoken(m.root)).toBe('');
  });
  it('saves the steps of the chosen place as text, with the must-haves and what the person saw', () => {
    const exports: ExportFile[] = [];
    const m = mount({ exports });
    press(m, 'gl-steps-export');
    expect(exports).toHaveLength(0);
    change(m, 'gl-steps-place', '0');
    m.root.fire('change', { id: 'gl-must-elevator', checked: true });
    sawRamp(m, '0', 'there');
    press(m, 'gl-steps-export');
    expect(exports).toHaveLength(1);
    expect(exports[0]?.filename).toBe('visit-step-by-step-en.txt');
    const text = exports[0]?.text ?? '';
    expect(text.startsWith('A visit to Library, step by step\nMade on 2026-11-15 from the loaded records.\n\nFeatures on this visit that are still Unknown: 7 of 8.\n')).toBe(true);
    expect(text).toContain('- Ramp: reported as available. Source: City open data, dated 2026-10-01. You saw for yourself on 2026-11-14: it was there.\n');
    expect(text).toContain('\nMust-haves the records do not report as available\n- Elevator: Unknown.\n');
  });
  it('saves the table of every place for a spreadsheet, in the order and with the places chosen', () => {
    const exports: ExportFile[] = [];
    const m = mount({ exports });
    change(m, 'gl-steps-sort', 'name');
    press(m, 'gl-steps-table');
    expect(exports[0]?.filename).toBe('visit-steps-by-place-en.csv');
    const lines = (exports[0]?.text ?? '').split('\r\n');
    expect(lines).toHaveLength(6);
    expect(lines.slice(1, 5).map((l) => l.split(',')[0])).toEqual(['Café Nord', 'Hall', 'Library', 'Pool']);
    expect(lines[3]).toBe('Library,0,0,2,1,0,3,0,0,2,0,0,3,1,0,7');
    save(m, 1);
    change(m, 'gl-steps-scope', 'saved');
    press(m, 'gl-steps-table');
    expect((exports[1]?.text ?? '').split('\r\n')).toHaveLength(3);
  });
  it('saves in French', () => {
    const exports: ExportFile[] = [];
    const m = mount({ exports, lang: 'fr' });
    change(m, 'gl-steps-place', '0');
    press(m, 'gl-steps-export');
    press(m, 'gl-steps-table');
    expect(exports.map((f) => f.filename)).toEqual(['visit-step-by-step-fr.txt', 'visit-steps-by-place-fr.csv']);
    expect(exports[0]?.text).toContain('Une visite à Library, étape par étape');
    expect(exports[1]?.text.startsWith('Lieu,Arriver\u00a0: signalé comme disponible,')).toBe(true);
  });
});
