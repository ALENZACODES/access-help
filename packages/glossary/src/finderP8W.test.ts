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
const set = (m: M, v: Record<string, string>): void => {
  for (const [k, value] of Object.entries(v)) m.root.querySelector(`#gl-rec-${k}`).value = value;
};
/** Reads the form back into the fake fields, as a browser would hold them after a redraw. */
const hold = (m: M, v: Record<string, string>): void => set(m, { name: 'Hall', feature: 'ramp', status: 'absent', source: 'Transit agency', licence: 'OGL-Canada-2.0', date: '2025-03-04', tier: '', ...v });

describe('changing a record', () => {
  it('has a Change button on each row only when the host keeps records', () => {
    expect(mount().root.innerHTML).not.toContain('gl-redit-');
    expect(mount({ records: [] }).root.innerHTML).toContain('id="gl-redit-3-1" aria-label="Change the record: Ramp, Transit agency">Change</button>');
  });
  it('opens the sources panel with the record in the form, and says so', () => {
    const m = mount({ records: [] });
    press(m, 'gl-redit-3-1');
    const html = m.root.innerHTML;
    expect(html).toContain('<details class="gl-sources-panel" open>');
    expect(html).toContain('<legend>Change this record</legend>');
    expect(html).toContain('value="Hall" readonly>');
    expect(html).toContain('<option value="absent" selected>reported as not available</option>');
    expect(html).toContain('value="Transit agency"');
    expect(html).toContain('id="gl-rec-cancel"');
    expect(spokenText(m.root)).toBe('Change this record');
    expect(m.root.querySelector('#gl-rec-status').focused).toBe(1);
  });
  it('saves the change in place, tells the host, logs it and offers undo', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    press(m, 'gl-redit-3-1');
    hold(m, { status: 'present', date: '2026-11-01', tier: 'tier-0' });
    press(m, 'gl-rec-add');
    expect(got[0]?.[3]?.claims).toHaveLength(3);
    expect(got[0]?.[3]?.claims[1]).toEqual({ termId: 'ramp', status: 'present', provenance: { source: 'Transit agency', licence: 'OGL-Canada-2.0', date: '2026-11-01', tier: 'tier-0' } });
    expect(spokenText(m.root)).toBe('Changed a record for Hall: Ramp.');
    expect(m.root.innerHTML).toContain('Undo: change record');
    expect(m.root.innerHTML).toContain('<legend>New record</legend>');
    expect(m.root.innerHTML).toContain('<details class="gl-sources-panel"><summary>');
    expect(JSON.parse(m.store.getItem('glossary-edit-log') ?? '[]').at(-1)).toMatchObject({ kind: 'change-record', place: 'Hall', detail: 'ramp' });
  });
  it('puts the old record back on undo', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    press(m, 'gl-redit-3-1');
    hold(m, { status: 'present' });
    press(m, 'gl-rec-add');
    press(m, 'gl-undo');
    expect(got.at(-1)).toEqual(places);
  });
  it('keeps the place even if the name box is typed over', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    press(m, 'gl-redit-3-1');
    hold(m, { name: 'Elsewhere', status: 'present' });
    press(m, 'gl-rec-add');
    expect(got[0]?.map((p) => p.name)).toEqual(['Library', 'Café Nord', 'Pool', 'Hall']);
  });
  it('refuses a change that breaks the rules, lists what to fix and stays in the change', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    press(m, 'gl-redit-3-1');
    hold(m, { licence: 'Proprietary' });
    press(m, 'gl-rec-add');
    expect(got).toEqual([]);
    const form = region(m.root, '[data-gl-recform]');
    expect(form).toContain('<li>Choose an open licence.</li>');
    expect(form).toContain('<legend>Change this record</legend>');
    expect(m.root.querySelector('#gl-rec-licence').focused).toBe(1);
  });
  it('says so when nothing was changed', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    press(m, 'gl-redit-3-1');
    hold(m, {});
    press(m, 'gl-rec-add');
    expect(got).toEqual([]);
    expect(spokenText(m.root)).toBe('The record is the same as before. Nothing was changed.');
  });
  it('can be cancelled', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    press(m, 'gl-redit-3-1');
    press(m, 'gl-rec-cancel');
    expect(got).toEqual([]);
    expect(m.root.innerHTML).toContain('<legend>New record</legend>');
    expect(spokenText(m.root)).toBe('The change was cancelled.');
    press(m, 'gl-rec-cancel');
  });
  it('drops a change in progress when the records change under it', () => {
    const m = mount({ records: [] });
    press(m, 'gl-redit-3-1');
    press(m, 'gl-prm-0');
    expect(m.root.innerHTML).toContain('<legend>New record</legend>');
  });
  it('ignores a record that is not there, and is hidden while records are left out', () => {
    const m = mount({ records: [] });
    press(m, 'gl-redit-9-9');
    expect(m.root.innerHTML).toContain('<legend>New record</legend>');
    m.root.fire('change', { id: 'gl-rv-src-0', checked: false });
    expect(m.root.innerHTML).not.toContain('gl-redit-');
  });
  it('is French in French', () => {
    const m = mount({ lang: 'fr', records: [] });
    press(m, 'gl-redit-3-1');
    expect(m.root.innerHTML).toContain('<legend>Modifier cette fiche</legend>');
    hold(m, { status: 'present' });
    press(m, 'gl-rec-add');
    expect(spokenText(m.root)).toBe('Fiche modifiée pour Hall\u00a0: Rampe.');
    expect(m.root.innerHTML).toContain('Annuler\u00a0: modifier la fiche');
  });
});

describe('every record as a page to print', () => {
  it('has the button only with a host that takes files and at least one place', () => {
    expect(mount().root.innerHTML).not.toContain('gl-records-print');
    expect(mount({ exports: [] }).root.innerHTML).toContain('id="gl-records-print">Save every record as a page to print</button>');
  });
  it('saves a page with every record, also the ones left out of the list, and the credits', () => {
    const files: ExportFile[] = [];
    const m = mount({ exports: files });
    m.root.fire('change', { id: 'gl-rv-src-1', checked: false });
    press(m, 'gl-records-print');
    const f = files.at(-1);
    expect(f?.filename).toBe('records-to-print-en.html');
    expect(f?.mime).toBe('text/html;charset=utf-8');
    expect(f?.text).toContain('Printed on 2026-11-15.');
    expect(f?.text).toContain('<td>Transit agency</td><td>OGL-Canada-2.0</td><td>2025-03-04</td><td>Tier unknown</td>');
    expect(f?.text).toContain('<h2>Where the information comes from</h2>');
    expect(f?.text).not.toMatch(/<script|accessible/i);
  });
  it('does nothing without a host that takes files', () => {
    const m = mount();
    press(m, 'gl-records-print');
    expect(m.root.innerHTML).toContain('Sources for Library');
  });
  it('is French in French', () => {
    const files: ExportFile[] = [];
    const m = mount({ lang: 'fr', exports: files });
    press(m, 'gl-records-print');
    expect(files.at(-1)?.filename).toBe('records-to-print-fr.html');
    expect(files.at(-1)?.text).toContain('<h1>Fiches de tous les lieux</h1>');
  });
});
