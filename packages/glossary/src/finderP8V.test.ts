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
const check = (m: M, csv: string): void => {
  m.root.querySelector('#gl-records-text').value = csv;
  press(m, 'gl-records-check');
};
const NEW = `${HEAD}\nlib,Library,elevator,absent,Town list,CC-BY-4.0,2026-11-01,,\nnew,New Place,ramp,present,Town list,CC-BY-4.0,2026-11-01,tier-0,\nx,X,teleporter,present,,,,,\n`;

describe('checking a table before loading it', () => {
  it('has the check button only with a host that keeps records', () => {
    expect(mount({ exports: [] }).root.innerHTML).not.toContain('gl-records-check');
    const html = mount({ records: [] }).root.innerHTML;
    expect(html).toContain('id="gl-records-check">Check the table first</button>');
    expect(html).toContain('<div data-gl-preview></div>');
  });
  it('says what loading would do and changes nothing', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    check(m, NEW);
    const preview = region(m.root, '[data-gl-preview]');
    expect(preview).toContain('<li>The table has 2 records for 2 places.</li><li>Loading it replaces the 4 places you have.</li>');
    expect(preview).toContain('<li>Line 4: The feature is not one we know.</li>');
    expect(preview).toContain('This was only a check. Nothing was changed.');
    expect(got).toEqual([]);
    expect(m.root.innerHTML).toContain('Sources for Library');
    expect(m.store.getItem('glossary-edit-log')).toBeNull();
    expect(m.root.querySelector('#gl-records-check').focused).toBe(1);
  });
  it('reads it out', () => {
    const m = mount({ records: [] });
    check(m, NEW);
    expect(spokenText(m.root)).toBe('The table has 2 records for 2 places. Loading it replaces the 4 places you have. 1 row was left out. This was only a check. Nothing was changed.');
  });
  it('follows the choice to add instead of replace', () => {
    const m = mount({ records: [] });
    m.root.fire('change', { id: 'gl-records-mode-add', checked: true });
    check(m, NEW);
    expect(region(m.root, '[data-gl-preview]')).toContain('<li>Loading it adds 2 records and 1 new places.</li>');
  });
  it('says why a table cannot be read', () => {
    const m = mount({ records: [] });
    check(m, 'place_id,feature\na,ramp\n');
    expect(spokenText(m.root)).toBe('The table could not be read. Nothing was changed. A column is missing.');
  });
  it('agrees with what loading then does', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    check(m, NEW);
    press(m, 'gl-records-load');
    expect(got[0]?.map((p) => p.id)).toEqual(['lib', 'new']);
    expect(got[0]?.flatMap((p) => p.claims)).toHaveLength(2);
  });
  it('does nothing without a host that keeps records', () => {
    const m = mount();
    check(m, NEW);
    expect(region(m.root, '[data-gl-preview]')).toBe('');
  });
  it('is French in French', () => {
    const m = mount({ lang: 'fr', records: [] });
    expect(m.root.innerHTML).toContain('Contrôler le tableau d’abord');
    check(m, NEW);
    expect(region(m.root, '[data-gl-preview]')).toContain('Ligne 4\u00a0: La caractéristique n’est pas une de celles que nous connaissons.');
  });
});

describe('the UNKNOWN token in French', () => {
  it('is used on the page instead of an agreed form', () => {
    const m = mount({ lang: 'fr' });
    expect(m.root.innerHTML).toContain('Chaque caractéristique est UNKNOWN.');
    expect(m.root.innerHTML).not.toMatch(/inconnues?(?![a-zà-ÿ])/i);
  });
  it('is used in the message about records that cannot be used', () => {
    expect(mount({ lang: 'fr' }).root.innerHTML).toContain('Elle est affichée comme UNKNOWN.');
  });
});

describe('correcting the name of a source', () => {
  const renameSrc = (m: M, i: number, name: string): void => {
    m.root.querySelector(`#gl-srcname-${i}`).value = name;
    press(m, `gl-srcbtn-${i}`);
  };
  it('is offered only when the host keeps records', () => {
    expect(mount().root.innerHTML).not.toContain('gl-srcbtn-');
    const html = mount({ records: [] }).root.innerHTML;
    expect(html).toContain('<summary>Correct the name of a source</summary>');
    expect(html).toContain('<label for="gl-srcname-0">New name for the source City open data</label>');
  });
  it('renames the source on every record, tells the host, says so and logs it', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    renameSrc(m, 0, 'City of Example');
    expect(got[0]?.[0]?.claims[0]?.provenance?.source).toBe('City of Example');
    expect(got[0]?.[3]?.claims[0]?.provenance?.source).toBe('City of Example');
    expect(got[0]?.[3]?.claims[1]?.provenance?.source).toBe('Transit agency');
    expect(spokenText(m.root)).toBe('Renamed the source City open data to City of Example. 2 records were changed.');
    expect(m.root.innerHTML).toContain('<li><strong>City of Example</strong>');
    expect(JSON.parse(m.store.getItem('glossary-edit-log') ?? '[]')).toEqual([{ date: '2026-11-15', kind: 'rename-source', place: 'City open data', detail: 'City of Example', count: 0 }]);
    expect(m.root.querySelector('#gl-undo').focused).toBe(1);
  });
  it('can be undone', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    renameSrc(m, 0, 'City of Example');
    expect(m.root.innerHTML).toContain('Undo: rename source');
    press(m, 'gl-undo');
    expect(got.at(-1)).toEqual(places);
  });
  it('lets two spellings become one name (the licences still tell the entries apart)', () => {
    const m = mount({ records: [] });
    renameSrc(m, 1, 'City open data');
    expect(m.root.innerHTML).not.toContain('<li><strong>Transit agency</strong>');
    expect(m.root.innerHTML.match(/<li><strong>City open data<\/strong>/g)).toHaveLength(2);
  });
  it('refuses an empty name and the same name, and keeps focus in the box', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    renameSrc(m, 0, ' ');
    expect(spokenText(m.root)).toBe('Type a name first.');
    renameSrc(m, 0, 'City open data');
    expect(spokenText(m.root)).toBe('That is already the name.');
    expect(got).toEqual([]);
    expect(m.root.querySelector('#gl-srcname-0').focused).toBe(2);
  });
  it('ignores a source that is not there, and is hidden while records are left out', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    renameSrc(m, 9, 'X');
    m.root.fire('change', { id: 'gl-rv-src-0', checked: false });
    expect(m.root.innerHTML).not.toContain('gl-srcbtn-');
    renameSrc(m, 0, 'X');
    expect(got).toEqual([]);
  });
  it('is French in French', () => {
    const m = mount({ lang: 'fr', records: [] });
    renameSrc(m, 0, 'Ville');
    expect(spokenText(m.root)).toBe('La provenance City open data a été renommée Ville. 2 fiches ont été changées.');
  });
});
