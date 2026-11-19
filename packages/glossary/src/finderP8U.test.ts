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
const rename = (m: M, i: number, name: string): void => {
  m.root.querySelector(`#gl-rename-${i}`).value = name;
  press(m, `gl-renamebtn-${i}`);
};
const LOG = 'glossary-edit-log';
const twin: Place = { id: 'lib-2', name: 'library', claims: [{ termId: 'ramp', status: 'present', provenance: prov }, { termId: 'elevator', status: 'absent', provenance: transit }] };
const withTwin = (o: Opts = {}): M => {
  const m = mount(o);
  m.finder.setPlaces([...places, twin]);
  return m;
};

describe('renaming a place', () => {
  it('has the rename block only when the host keeps records', () => {
    expect(mount().root.innerHTML).not.toContain('gl-renamebtn-');
    const html = mount({ records: [] }).root.innerHTML;
    expect(html).toContain('<label for="gl-rename-0">New name for Library</label>');
    expect(html).toContain('id="gl-renamebtn-0" aria-label="Rename place: Library">Rename place</button>');
  });
  it('renames, tells the host, says so and offers undo', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    rename(m, 2, '  Aquatic   Centre ');
    expect(got[0]?.[2]).toEqual({ id: 'pool', name: 'Aquatic Centre', claims: [] });
    expect(spokenText(m.root)).toBe('Renamed Pool to Aquatic Centre.');
    expect(m.root.innerHTML).toContain('Sources for Aquatic Centre');
    expect(m.root.innerHTML).toContain('Undo: rename place');
    expect(m.root.querySelector('#gl-undo').focused).toBe(1);
  });
  it('keeps the place saved, because its id does not change', () => {
    const m = mount({ records: [] });
    press(m, 'gl-save-2');
    rename(m, 2, 'Aquatic Centre');
    expect(m.finder.getSaved()).toEqual(['pool']);
  });
  it('puts the old name back on undo', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    rename(m, 2, 'Aquatic Centre');
    press(m, 'gl-undo');
    expect(got.at(-1)).toEqual(places);
    expect(m.root.innerHTML).toContain('Sources for Pool');
  });
  it('refuses a name another place has, says why and keeps focus in the box', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    rename(m, 2, 'cafe nord');
    expect(got).toEqual([]);
    expect(spokenText(m.root)).toBe('Another place has that name. Join the two entries instead.');
    expect(m.root.querySelector('#gl-rename-2').focused).toBe(1);
  });
  it('refuses an empty name and the name it has', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    rename(m, 2, '  ');
    expect(spokenText(m.root)).toBe('Type a name first.');
    rename(m, 2, 'Pool');
    expect(spokenText(m.root)).toBe('That is already the name.');
    expect(got).toEqual([]);
  });
  it('ignores a place that is not there, and does nothing without a host that keeps records', () => {
    const got: (readonly Place[])[] = [];
    rename(mount({ records: got }), 99, 'X');
    expect(got).toEqual([]);
    const m = mount();
    rename(m, 0, 'X');
    expect(m.root.innerHTML).toContain('Sources for Library');
  });
  it('is not offered while records are left out', () => {
    const m = mount({ records: [] });
    m.root.fire('change', { id: 'gl-rv-src-0', checked: false });
    expect(m.root.innerHTML).not.toContain('gl-renamebtn-');
    rename(m, 2, 'X');
    expect(m.root.innerHTML).toContain('Sources for Pool');
  });
  it('is French in French', () => {
    const m = mount({ lang: 'fr', records: [] });
    rename(m, 2, 'Piscine');
    expect(spokenText(m.root)).toBe('Pool a été renommé Piscine.');
    expect(m.root.innerHTML).toContain('Annuler\u00a0: renommer le lieu');
  });
});

describe('places listed more than once', () => {
  it('says so when no name is listed twice', () => {
    expect(mount().root.innerHTML).toContain('No name is listed more than once.');
  });
  it('lists a name that is there twice, with a Join button only when the host keeps records', () => {
    expect(withTwin().root.innerHTML).toContain('<li>Library: 2 entries</li>');
    expect(withTwin({ records: [] }).root.innerHTML).toContain('id="gl-join-0" aria-label="Join the entries for Library">Join the entries</button>');
  });
  it('joins the entries: every record is kept once, the host is told, and it can be undone', () => {
    const got: (readonly Place[])[] = [];
    const m = withTwin({ records: got });
    press(m, 'gl-join-0');
    const after = got.at(-1) ?? [];
    expect(after.map((p) => p.id)).toEqual(['lib', 'cafe', 'pool', 'hall']);
    expect(after[0]?.claims.map((c) => `${c.termId}:${c.provenance?.source}`)).toEqual(['ramp:City open data', 'elevator:Transit agency']);
    expect(spokenText(m.root)).toBe('Joined the entries for Library. 1 records were moved.');
    expect(m.root.innerHTML).toContain('No name is listed more than once.');
    press(m, 'gl-undo');
    expect(got.at(-1)).toEqual([...places, twin]);
  });
  it('ignores a join for a group that is not there', () => {
    const got: (readonly Place[])[] = [];
    const m = withTwin({ records: got });
    press(m, 'gl-join-1');
    press(m, 'gl-join-99');
    expect(got).toEqual([]);
  });
  it('is French in French', () => {
    const m = withTwin({ lang: 'fr', records: [] });
    expect(m.root.innerHTML).toContain('Lieux inscrits plus d’une fois');
    press(m, 'gl-join-0');
    expect(spokenText(m.root)).toBe('Entrées réunies pour Library. 1 fiches ont été déplacées.');
  });
});

describe('changes made on this device', () => {
  const entries = (m: M): { kind: string; place: string; detail: string; count: number }[] => JSON.parse(m.store.getItem(LOG) ?? '[]');
  it('has the panel only when the host keeps records, empty at first', () => {
    expect(mount().root.innerHTML).not.toContain('gl-editlog-panel');
    expect(mount({ records: [] }).root.innerHTML).toContain('No changes yet.');
  });
  it('writes a line for each kind of change, with today’s date', () => {
    const m = withTwin({ records: [], exports: [] });
    rename(m, 2, 'Aquatic Centre');
    press(m, 'gl-rrm-3-1');
    press(m, 'gl-undo');
    press(m, 'gl-join-0');
    press(m, 'gl-prm-1');
    for (const [k, value] of Object.entries({ name: 'New', feature: 'ramp', status: 'present', source: 'Town list', licence: 'CC-BY-4.0', date: '2026-11-01', tier: '' })) m.root.querySelector(`#gl-rec-${k}`).value = value;
    press(m, 'gl-rec-add');
    m.root.querySelector('#gl-records-text').value = `${HEAD}\na,A,ramp,present,,,,,\n`;
    press(m, 'gl-records-load');
    expect(entries(m).map((e) => e.kind)).toEqual(['rename', 'remove-record', 'undo', 'join', 'remove-place', 'add', 'load']);
    expect(entries(m)[0]).toEqual({ date: '2026-11-15', kind: 'rename', place: 'Pool', detail: 'Aquatic Centre', count: 0 });
    expect(entries(m)[1]).toMatchObject({ place: 'Hall', detail: 'ramp' });
    expect(entries(m).at(-1)).toMatchObject({ kind: 'load', count: 1 });
  });
  it('shows the newest change first on the page', () => {
    const m = mount({ records: [] });
    rename(m, 2, 'Aquatic Centre');
    press(m, 'gl-prm-0');
    const html = m.root.innerHTML;
    expect(html).toContain('<p role="status">2 changes</p>');
    expect(html.indexOf('Removed Library and its records.')).toBeLessThan(html.indexOf('Renamed Pool to Aquatic Centre.'));
  });
  it('writes a line when a table is added to the records', () => {
    const m = mount({ records: [] });
    m.root.fire('change', { id: 'gl-records-mode-add', checked: true });
    m.root.querySelector('#gl-records-text').value = `${HEAD}\nlib,Library,elevator,absent,Town list,CC-BY-4.0,2026-11-01,,\n`;
    press(m, 'gl-records-load');
    expect(entries(m)).toEqual([{ date: '2026-11-15', kind: 'add-table', place: '', detail: '', count: 1 }]);
  });
  it('writes nothing for a change that did not happen', () => {
    const m = mount({ records: [] });
    rename(m, 2, 'Pool');
    press(m, 'gl-rrm-9-9');
    m.root.querySelector('#gl-records-text').value = 'nope';
    press(m, 'gl-records-load');
    expect(m.store.getItem(LOG)).toBeNull();
  });
  it('does not log undo for steps that are not about records', () => {
    const m = mount({ records: [] });
    press(m, 'gl-save-0');
    press(m, 'gl-save-0');
    press(m, 'gl-undo');
    expect(m.store.getItem(LOG)).toBeNull();
  });
  it('is kept for the next visit and ignores bad storage', () => {
    const store = new Mem();
    rename(mount({ store, records: [] }), 2, 'Aquatic Centre');
    expect(mount({ store, records: [] }).root.innerHTML).toContain('Renamed Pool to Aquatic Centre.');
    store.setItem(LOG, '{}');
    expect(mount({ store, records: [] }).root.innerHTML).toContain('No changes yet.');
  });
  it('saves the list as text with a host that takes files', () => {
    const files: ExportFile[] = [];
    const m = mount({ records: [], exports: files });
    rename(m, 2, 'Aquatic Centre');
    press(m, 'gl-editlog-export');
    expect(files.at(-1)?.filename).toBe('changes-on-this-device-en.txt');
    expect(files.at(-1)?.text).toBe('Changes made on this device\n\n- 2026-11-15: Renamed Pool to Aquatic Centre.\n');
  });
  it('is cleared by forget', () => {
    const m = mount({ records: [] });
    rename(m, 2, 'Aquatic Centre');
    press(m, 'gl-forget');
    press(m, 'gl-forget-sure');
    expect(m.store.getItem(LOG)).toBe('[]');
  });
  it('is French in French', () => {
    const m = mount({ lang: 'fr', records: [] });
    rename(m, 2, 'Piscine');
    expect(m.root.innerHTML).toContain('2026-11-15\u00a0: Pool a été renommé Piscine.');
  });
});
