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
const paste = (m: M, csv: string): void => {
  m.root.querySelector('#gl-records-text').value = csv;
  press(m, 'gl-records-load');
};
const mode = (m: M, which: 'add' | 'replace'): void => m.root.fire('change', { id: `gl-records-mode-${which}`, checked: true });
const NEW = `${HEAD}\nlib,Library,elevator,absent,Town list,CC-BY-4.0,2026-11-01,,\nnew,New Place,ramp,present,Town list,CC-BY-4.0,2026-11-01,tier-0,\n`;

describe('adding a table to the records held', () => {
  it('offers the choice only with a host that keeps records, and replaces by default', () => {
    expect(mount({ exports: [] }).root.innerHTML).not.toContain('gl-records-mode');
    const html = mount({ records: [] }).root.innerHTML;
    expect(html).toContain('<legend>When the table is loaded</legend>');
    expect(html).toContain('id="gl-records-mode-replace" value="replace" checked>');
    expect(html).toContain('id="gl-records-mode-add" value="add">');
  });
  it('replaces the records by default', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    paste(m, NEW);
    expect(got[0]?.map((p) => p.id)).toEqual(['lib', 'new']);
    expect(spokenText(m.root)).toBe('Loaded 2 records for 2 places.');
  });
  it('adds to the records when asked: nothing is lost and new places go at the end', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    mode(m, 'add');
    paste(m, NEW);
    expect(got[0]?.map((p) => p.id)).toEqual(['lib', 'cafe', 'pool', 'hall', 'new']);
    expect(got[0]?.[0]?.claims.map((c) => c.termId)).toEqual(['ramp', 'elevator']);
    expect(got[0]?.[3]).toBe(places[3]);
    expect(spokenText(m.root)).toBe('Added 2 records and 1 new places.');
    expect(m.root.innerHTML).toContain('Added 2 records and 1 new places.');
  });
  it('keeps the choice after the page is redrawn', () => {
    const m = mount({ records: [] });
    mode(m, 'add');
    paste(m, NEW);
    expect(m.root.innerHTML).toContain('id="gl-records-mode-add" value="add" checked>');
  });
  it('says so and changes nothing when the table has nothing new', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    mode(m, 'add');
    paste(m, `${HEAD}\nlib,Library,ramp,present,City open data,CC0-1.0,2026-10-01,tier-1,\n`);
    expect(got).toEqual([]);
    expect(region(m.root, '[data-gl-records-msg]')).toBe('Nothing new was in the table. 1 record was already there.');
    expect(m.root.innerHTML).not.toContain('Undo: load table');
  });
  it('says how many rows were left out when adding', () => {
    const m = mount({ records: [] });
    mode(m, 'add');
    paste(m, `${NEW}x,X,teleporter,present,,,,,\n`);
    expect(spokenText(m.root)).toBe('Added 2 records and 1 new places. 1 row was left out.');
  });
  it('keeps the name a place had', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    mode(m, 'add');
    paste(m, `${HEAD}\nlib,Main Library,elevator,absent,Town list,CC-BY-4.0,2026-11-01,,\n`);
    expect(got[0]?.[0]?.name).toBe('Library');
    expect(spokenText(m.root)).toBe('Added 1 records and 0 new places. 1 place kept the name it had.');
  });
  it('ignores a radio button that is being unchecked', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    m.root.fire('change', { id: 'gl-records-mode-add', checked: false });
    paste(m, NEW);
    expect(got[0]).toHaveLength(2);
  });
  it('is French in French', () => {
    const m = mount({ lang: 'fr', records: [] });
    expect(m.root.innerHTML).toContain('Ajouter aux fiches que j’ai');
    mode(m, 'add');
    paste(m, NEW);
    expect(spokenText(m.root)).toBe('2 fiches et 1 nouveaux lieux ajoutés.');
  });
});

describe('undoing a loaded table', () => {
  it('offers undo after a table replaced the records, and puts everything back', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    press(m, 'gl-save-1');
    paste(m, NEW);
    expect(m.root.innerHTML).toContain('Undo: load table');
    expect(m.finder.getSaved()).toEqual([]);
    press(m, 'gl-undo');
    expect(got.at(-1)).toEqual(places);
    expect(m.finder.getSaved()).toEqual(['cafe']);
    expect(m.root.innerHTML).toContain('Sources for Café Nord');
    expect(m.root.innerHTML).not.toContain('Undo: load table');
  });
  it('offers undo after a table was added', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    mode(m, 'add');
    paste(m, NEW);
    press(m, 'gl-undo');
    expect(got.at(-1)).toEqual(places);
  });
  it('offers no undo when the table could not be read', () => {
    const m = mount({ records: [] });
    paste(m, 'nope');
    expect(m.root.innerHTML).not.toContain('Undo: load table');
  });
  it('is French in French', () => {
    const m = mount({ lang: 'fr', records: [] });
    paste(m, NEW);
    expect(m.root.innerHTML).toContain('Annuler\u00a0: charger le tableau');
  });
});

describe('visit mark wording', () => {
  it('names the action on the button in both states', () => {
    const m = mount();
    expect(m.root.innerHTML).toContain('id="gl-visit-0" data-visited="no" aria-label="Mark as visited: Library">Mark as visited</button>');
    press(m, 'gl-visit-0');
    expect(region(m.root, '[data-gl-presults]')).toContain('id="gl-visit-0" data-visited="yes" aria-label="Remove visit mark: Library">Remove visit mark</button>');
    expect(region(m.root, '[data-gl-presults]')).toContain('You marked this place as visited on 2026-11-15.');
  });
});

describe('at a glance', () => {
  it('shows the counts above the list', () => {
    const html = mount().root.innerHTML;
    expect(html).toContain('<li>4 places, 3 records that can be reported, from 2 sources.</li>');
    expect(html).toContain('<li>For 2 places, every feature is unknown.</li>');
    expect(html).toContain('These are counts of what sources report. They do not rate any place.');
    expect(html.indexOf('data-gl-glance')).toBeLessThan(html.indexOf('data-gl-presults'));
  });
  it('follows the records that are counted', () => {
    const m = mount();
    m.root.fire('change', { id: 'gl-rv-src-0', checked: false });
    expect(m.root.innerHTML).toContain('<li>4 places, 1 record that can be reported, from 1 source.</li>');
  });
  it('follows a record that is added or removed', () => {
    const m = mount({ records: [] });
    press(m, 'gl-rrm-3-1');
    expect(m.root.innerHTML).toContain('<li>4 places, 2 records that can be reported, from 1 source.</li>');
  });
  it('is redrawn with the list', () => {
    const m = mount();
    m.root.fire('change', { id: 'gl-f-ramp', checked: true });
    expect(region(m.root, '[data-gl-glance]')).toContain('4 places, 3 records that can be reported');
  });
  it('is French in French', () => {
    expect(mount({ lang: 'fr' }).root.innerHTML).toContain('En un coup d’œil');
  });
});
