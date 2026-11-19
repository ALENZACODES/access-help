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
const OLD_HEAD = RECORD_COLUMNS.join(',');

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
const fill = (m: M, v: Partial<Record<'name' | 'feature' | 'status' | 'source' | 'licence' | 'date' | 'tier', string>>): void => {
  for (const [k, value] of Object.entries(v)) m.root.querySelector(`#gl-rec-${k}`).value = value ?? '';
};
const full = { name: 'Town Hall', feature: 'ramp', status: 'present', source: 'Town list', licence: 'CC-BY-4.0', date: '2026-11-01', tier: 'tier-0' };

describe('adding a record by hand', () => {
  it('has no form unless the host keeps records', () => {
    expect(mount().root.innerHTML).not.toContain('gl-rec-add');
    expect(mount({ exports: [] }).root.innerHTML).not.toContain('gl-rec-add');
    const html = mount({ records: [] }).root.innerHTML;
    expect(html).toContain('Add a record by hand');
    expect(html).toContain('id="gl-rec-add"');
    expect(html).toContain(OLD_HEAD.length > 0 ? '<label for="gl-rec-name">Name of the place</label>' : '');
  });
  it('adds a new place with a sourced record, gives the places to the host and says so', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    fill(m, full);
    press(m, 'gl-rec-add');
    expect(got).toHaveLength(1);
    expect(got[0]?.at(-1)).toEqual({
      id: 'town-hall',
      name: 'Town Hall',
      claims: [{ termId: 'ramp', status: 'present', provenance: { source: 'Town list', licence: 'CC-BY-4.0', date: '2026-11-01', tier: 'tier-0' } }],
    });
    expect(spokenText(m.root)).toBe('Added Town Hall with a record: Ramp.');
    expect(m.root.innerHTML).toContain('Sources for Town Hall');
    expect(m.root.innerHTML).toContain('<td>Town list</td><td>CC-BY-4.0</td><td>2026-11-01</td><td>Tier 0</td>');
  });
  it('keeps the other places and what the person saved', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    press(m, 'gl-save-0');
    fill(m, full);
    press(m, 'gl-rec-add');
    expect(got[0]?.map((p) => p.id)).toEqual(['lib', 'cafe', 'pool', 'hall', 'town-hall']);
    expect(m.finder.getSaved()).toEqual(['lib']);
  });
  it('adds a record to a place that is already there', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    fill(m, { ...full, name: 'café nord', feature: 'elevator', status: 'absent' });
    press(m, 'gl-rec-add');
    expect(got[0]).toHaveLength(4);
    expect(got[0]?.[1]?.claims).toEqual([{ termId: 'elevator', status: 'absent', provenance: { source: 'Town list', licence: 'CC-BY-4.0', date: '2026-11-01', tier: 'tier-0' } }]);
    expect(spokenText(m.root)).toBe('Added a record for café nord: Elevator.');
  });
  it('keeps the place and the source in the form for the next record, and moves focus to the feature', () => {
    const m = mount({ records: [] });
    fill(m, full);
    press(m, 'gl-rec-add');
    expect(m.root.innerHTML).toContain('id="gl-rec-name" class="gl-input" maxlength="80" autocomplete="off" value="Town Hall"');
    expect(m.root.innerHTML).toContain('value="Town list"');
    expect(m.root.innerHTML).toContain('<option value="ramp">Ramp</option>');
    expect(m.root.innerHTML).toContain('<p role="status" data-gl-recform-msg>Added Town Hall with a record: Ramp.</p>');
    expect(m.root.querySelector('#gl-rec-feature').focused).toBe(1);
  });
  it('adds nothing without a source, lists what to fix and moves focus to the first field', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    fill(m, { ...full, source: '', date: '' });
    press(m, 'gl-rec-add');
    expect(got).toEqual([]);
    const form = region(m.root, '[data-gl-recform]');
    expect(form).toContain('role="alert"');
    expect(form).toContain('<li>Type the name of the source.</li><li>Choose the date of the source.</li>');
    expect(form).toContain('value="Town Hall"');
    expect(spokenText(m.root)).toBe('The record was not added. Fix 2 things:');
    expect(m.root.querySelector('#gl-rec-source').focused).toBe(1);
    expect(m.root.innerHTML).not.toContain('Sources for Town Hall');
  });
  it('takes open licences only', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    fill(m, { ...full, licence: 'Proprietary' });
    press(m, 'gl-rec-add');
    expect(got).toEqual([]);
    expect(region(m.root, '[data-gl-recform]')).toContain('<li>Choose an open licence.</li>');
    expect(m.root.querySelector('#gl-rec-licence').focused).toBe(1);
  });
  it('refuses a date after today and a tier it cannot show', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    fill(m, { ...full, date: '2026-11-16', tier: 'tier-3' });
    press(m, 'gl-rec-add');
    expect(got).toEqual([]);
    expect(region(m.root, '[data-gl-recform]')).toContain('<li>The date cannot be in the future.</li><li>Choose a tier from the list, or no tier.</li>');
  });
  it('does not add the same record twice', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    fill(m, full);
    press(m, 'gl-rec-add');
    fill(m, full);
    press(m, 'gl-rec-add');
    expect(got).toHaveLength(1);
    expect(spokenText(m.root)).toBe('Town Hall already has that record. Nothing was added.');
    expect(region(m.root, '[data-gl-recform]')).toContain('Town Hall already has that record.');
  });
  it('clears the problems once the record is fixed', () => {
    const m = mount({ records: [] });
    fill(m, { ...full, source: '' });
    press(m, 'gl-rec-add');
    fill(m, full);
    press(m, 'gl-rec-add');
    expect(m.root.innerHTML).not.toContain('role="alert"');
    expect(m.root.innerHTML).not.toContain('aria-invalid');
  });
  it('shows the new record in the sources panel and has nothing to look at for it', () => {
    const m = mount({ records: [] });
    fill(m, { ...full, tier: 'tier-1' });
    press(m, 'gl-rec-add');
    expect(m.root.innerHTML).toContain('<li><strong>Town list</strong>');
    expect(m.root.innerHTML).not.toContain('Town Hall, Ramp:');
  });
  it('clears the form when the host sets places itself', () => {
    const m = mount({ records: [] });
    fill(m, full);
    press(m, 'gl-rec-add');
    m.finder.setPlaces(places);
    expect(m.root.innerHTML).not.toContain('value="Town list"');
  });
  it('does nothing without a host that keeps records', () => {
    const m = mount();
    fill(m, full);
    press(m, 'gl-rec-add');
    expect(m.root.innerHTML).not.toContain('Town Hall');
  });
  it('is French in French', () => {
    const m = mount({ lang: 'fr', records: [] });
    expect(m.root.innerHTML).toContain('Ajouter une fiche à la main');
    fill(m, full);
    press(m, 'gl-rec-add');
    expect(spokenText(m.root)).toBe('Town Hall ajouté avec une fiche\u00a0: Rampe.');
    fill(m, { ...full, feature: '' });
    press(m, 'gl-rec-add');
    expect(spokenText(m.root)).toBe('La fiche n’a pas été ajoutée. Corrigez 1 chose\u00a0:');
  });
});

describe('removing a record or a place', () => {
  const undoShown = (m: M): string => m.root.innerHTML;
  it('has no remove buttons unless the host keeps records', () => {
    expect(mount().root.innerHTML).not.toContain('gl-rrm-');
    expect(mount({ exports: [] }).root.innerHTML).not.toContain('gl-prm-');
    const html = mount({ records: [] }).root.innerHTML;
    expect(html).toContain('id="gl-rrm-0-0"');
    expect(html).toContain('id="gl-prm-1"');
  });
  it('removes one record, tells the host and says so', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    press(m, 'gl-rrm-3-1');
    expect(got[0]?.[3]?.claims.map((c) => c.termId)).toEqual(['elevator', 'grab-bar']);
    expect(spokenText(m.root)).toBe('Removed a record from Hall: Ramp.');
    expect(m.root.innerHTML).toContain('Undo: remove record');
    expect(m.root.querySelector('#gl-undo').focused).toBe(1);
  });
  it('puts the record back on undo and tells the host again', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    press(m, 'gl-rrm-3-1');
    press(m, 'gl-undo');
    expect(got).toHaveLength(2);
    expect(got[1]).toEqual(places);
    expect(m.root.innerHTML).toContain('<td>Transit agency</td>');
    expect(undoShown(m)).not.toContain('Undo: remove record');
  });
  it('removes a place with its records, and drops it from the saved places', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    press(m, 'gl-save-0');
    press(m, 'gl-save-1');
    press(m, 'gl-prm-0');
    expect(got.at(-1)?.map((p) => p.id)).toEqual(['cafe', 'pool', 'hall']);
    expect(m.finder.getSaved()).toEqual(['cafe']);
    expect(JSON.parse(m.store.getItem('glossary-saved-places') ?? '[]')).toEqual(['cafe']);
    expect(spokenText(m.root)).toBe('Removed Library and its records.');
    expect(m.root.innerHTML).not.toContain('Sources for Library');
  });
  it('puts the place back on undo, saved as it was', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    press(m, 'gl-save-0');
    press(m, 'gl-save-1');
    press(m, 'gl-prm-0');
    press(m, 'gl-undo');
    expect(got.at(-1)).toEqual(places);
    expect(m.finder.getSaved()).toEqual(['lib', 'cafe']);
    expect(JSON.parse(m.store.getItem('glossary-saved-places') ?? '[]')).toEqual(['lib', 'cafe']);
    expect(m.root.innerHTML).toContain('Sources for Library');
  });
  it('ignores a record or a place that is not there', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    press(m, 'gl-rrm-0-9');
    press(m, 'gl-rrm-9-0');
    press(m, 'gl-prm-9');
    expect(got).toEqual([]);
  });
  it('does nothing without a host that keeps records', () => {
    const m = mount();
    press(m, 'gl-rrm-0-0');
    press(m, 'gl-prm-0');
    expect(m.root.innerHTML).toContain('Sources for Library');
    expect(m.root.innerHTML).toContain('<td>City open data</td>');
  });
  it('is French in French', () => {
    const m = mount({ lang: 'fr', records: [] });
    press(m, 'gl-prm-0');
    expect(spokenText(m.root)).toBe('Library et ses fiches ont été retirés.');
    expect(m.root.innerHTML).toContain('Annuler\u00a0: retirer le lieu');
  });
});
