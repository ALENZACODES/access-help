import { describe, expect, it } from 'vitest';
import {
  LISTS_STORE_KEY,
  SEARCHES_STORE_KEY,
  SAVED_STORE_KEY,
  mountPlaceFinder,
  parseBackup,
  type ExportFile,
  type FeatureClaim,
  type FinderElement,
  type FinderRoot,
  type IndexStore,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const prov: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01' };
const yes = (termId: string): FeatureClaim => ({ termId, status: 'present', provenance: prov });
const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [yes('ramp')] },
  { id: 'cafe', name: 'Café Nord', claims: [] },
  { id: 'pool', name: 'Pool', claims: [] },
  { id: 'hall', name: 'Hall', claims: [yes('elevator')] },
];
const today = '2026-11-15';

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
  });
  return { root, finder, store };
};
type M = ReturnType<typeof mount>;
const region = (root: Root, selector: string): string => root.querySelector(selector).innerHTML;
const spoken = (root: Root): string => region(root, '[data-gl-announce]');
const save = (m: M, ...indexes: number[]): void => {
  for (const i of indexes) m.root.fire('click', { id: `gl-save-${i}` });
};

describe('visit order', () => {
  // With no feature chosen every feature is asked about, and each of these places has unknowns, so each has a plan entry.
  it('shows no move buttons with fewer than two places in the plan', () => {
    const m = mount();
    save(m, 0);
    expect(region(m.root, '[data-gl-plan]')).not.toContain('gl-down-');
    expect(region(m.root, '[data-gl-plan]')).not.toContain('gl-up-');
  });
  it('shows "later" on the first place and "earlier" on the last', () => {
    const m = mount();
    save(m, 0, 1, 2);
    const plan = region(m.root, '[data-gl-plan]');
    expect(plan).toContain('id="gl-down-0"');
    expect(plan).not.toContain('id="gl-up-0"');
    expect(plan).toContain('id="gl-up-2"');
    expect(plan).not.toContain('id="gl-down-2"');
    expect(plan).toContain('id="gl-up-1"');
    expect(plan).toContain('id="gl-down-1"');
  });
  it('moves a place later, saves the order, and says where it is now', () => {
    const m = mount();
    save(m, 0, 1, 2);
    m.root.fire('click', { id: 'gl-down-0' });
    expect(m.finder.getSaved()).toEqual(['cafe', 'lib', 'pool']);
    expect(JSON.parse(m.store.getItem(SAVED_STORE_KEY) ?? '[]')).toEqual(['cafe', 'lib', 'pool']);
    expect(spoken(m.root)).toBe('Moved Library to position 2.');
  });
  it('moves a place earlier', () => {
    const m = mount();
    save(m, 0, 1, 2);
    m.root.fire('click', { id: 'gl-up-2' });
    expect(m.finder.getSaved()).toEqual(['lib', 'pool', 'cafe']);
    expect(spoken(m.root)).toBe('Moved Pool to position 2.');
  });
  it('keeps focus on the same button, or the other one at the end', () => {
    const m = mount();
    save(m, 0, 1);
    m.root.fire('click', { id: 'gl-down-0' });
    expect(m.root.querySelector('#gl-down-0').focused).toBe(1);
  });
  it('follows the order in the plan text', () => {
    const files: ExportFile[] = [];
    const m = mount({ exports: files });
    save(m, 0, 1);
    m.root.fire('click', { id: 'gl-down-0' });
    m.root.fire('click', { id: 'gl-export-plan' });
    const text = files[0]?.text ?? '';
    expect(text.indexOf('Café Nord')).toBeLessThan(text.indexOf('Library'));
  });
  it('ignores a move that goes nowhere', () => {
    const m = mount();
    save(m, 0, 1);
    m.root.fire('click', { id: 'gl-up-0' });
    m.root.fire('click', { id: 'gl-down-1' });
    m.root.fire('click', { id: 'gl-down-99' });
    expect(m.finder.getSaved()).toEqual(['lib', 'cafe']);
  });
  it('skips saved places that have nothing to ask when finding the neighbour', () => {
    const m = mount();
    m.root.fire('change', { id: 'gl-f-ramp', checked: true });
    // Library has a sourced ramp claim (nothing to ask). Café Nord and Pool are unknown.
    save(m, 1, 0, 2);
    expect(m.finder.getSaved()).toEqual(['cafe', 'lib', 'pool']);
    m.root.fire('click', { id: 'gl-down-1' });
    expect(m.finder.getSaved()).toEqual(['pool', 'lib', 'cafe']);
  });
  it('speaks French', () => {
    const m = mount({ lang: 'fr' });
    save(m, 0, 1);
    m.root.fire('click', { id: 'gl-down-0' });
    expect(spoken(m.root)).toBe('Library déplacé à la position 2.');
  });
});

describe('list summary and export', () => {
  const makeList = (m: M, ...placeIndexes: number[]): void => {
    m.root.querySelector('#gl-list-name').value = 'Saturday';
    m.root.fire('click', { id: 'gl-list-create' });
    for (const i of placeIndexes) m.root.fire('change', { id: `gl-lst-${i}`, value: '0' });
  };
  it('shows no summary or export for an empty list', () => {
    const m = mount({ exports: [] });
    makeList(m);
    expect(region(m.root, '[data-gl-lists]')).not.toContain('gl-lexp-');
    expect(region(m.root, '[data-gl-lists]')).not.toContain('gl-listsum');
  });
  it('asks for features before it counts', () => {
    const m = mount({ exports: [] });
    makeList(m, 0);
    expect(region(m.root, '[data-gl-lists]')).toContain('Choose features to see what the sources report');
  });
  it('counts what the sources report for the chosen features', () => {
    const m = mount({ exports: [] });
    makeList(m, 0, 2);
    m.root.fire('change', { id: 'gl-f-ramp', checked: true });
    expect(region(m.root, '[data-gl-lists]')).toContain('<li>Ramp: 1 reported as available, 1 unknown</li>');
  });
  it('updates the counts when the choices change', () => {
    const m = mount({ exports: [] });
    makeList(m, 0, 3);
    m.root.fire('change', { id: 'gl-f-ramp', checked: true });
    m.root.fire('change', { id: 'gl-f-elevator', checked: true });
    const lists = region(m.root, '[data-gl-lists]');
    expect(lists).toContain('Ramp: 1 reported as available, 1 unknown');
    expect(lists).toContain('Elevator: 1 reported as available, 1 unknown');
  });
  it('has an export button only when the host takes files', () => {
    const without = mount();
    makeList(without, 0);
    expect(region(without.root, '[data-gl-lists]')).not.toContain('gl-lexp-0');
    const withExport = mount({ exports: [] });
    makeList(withExport, 0);
    expect(region(withExport.root, '[data-gl-lists]')).toContain('id="gl-lexp-0"');
  });
  it('copies the list as text with its places and tally', () => {
    const files: ExportFile[] = [];
    const m = mount({ exports: files });
    makeList(m, 0, 1);
    m.root.fire('change', { id: 'gl-f-ramp', checked: true });
    m.root.fire('click', { id: 'gl-lexp-0' });
    expect(files).toHaveLength(1);
    expect(files[0]?.filename).toBe('list-saturday-en.txt');
    expect(files[0]?.text).toContain('Saturday (2)');
    expect(files[0]?.text).toContain('- Library');
    expect(files[0]?.text).toContain('Ramp: 1 reported as available, 1 unknown');
  });
  it('ignores a list that is not there', () => {
    const files: ExportFile[] = [];
    const m = mount({ exports: files });
    m.root.fire('click', { id: 'gl-lexp-4' });
    expect(files).toEqual([]);
  });
  it('is in French', () => {
    const files: ExportFile[] = [];
    const m = mount({ lang: 'fr', exports: files });
    makeList(m, 0);
    m.root.fire('click', { id: 'gl-lexp-0' });
    expect(files[0]?.filename).toBe('list-saturday-fr.txt');
  });
});

describe('saved searches', () => {
  const name = (m: M, text: string): void => {
    m.root.querySelector('#gl-search-name').value = text;
  };
  it('starts with none', () => {
    expect(mount().root.innerHTML).toContain('no saved searches');
  });
  it('refuses when there is nothing to keep', () => {
    const m = mount();
    name(m, 'Mine');
    m.root.fire('click', { id: 'gl-search-save' });
    expect(m.finder.getSearches()).toEqual([]);
    expect(region(m.root, '[data-gl-searches]')).toContain('Choose a feature or type a name first');
    expect(m.root.querySelector('#gl-search-name').focused).toBe(1);
  });
  it('refuses with no name', () => {
    const m = mount();
    m.root.fire('change', { id: 'gl-f-ramp', checked: true });
    name(m, '  ');
    m.root.fire('click', { id: 'gl-search-save' });
    expect(region(m.root, '[data-gl-searches]')).toContain('Type a name for the search.');
  });
  it('keeps the current choices, clears the box, says so, and stores them', () => {
    const m = mount();
    m.root.fire('change', { id: 'gl-f-ramp', checked: true });
    m.root.fire('change', { id: 'gl-pq', value: 'lib' });
    m.root.fire('change', { id: 'gl-hide', checked: true });
    name(m, 'My usual');
    m.root.fire('click', { id: 'gl-search-save' });
    expect(m.finder.getSearches()).toEqual([{ name: 'My usual', state: { features: ['ramp'], query: 'lib', hideNotAvailable: true } }]);
    expect(m.root.querySelector('#gl-search-name').value).toBe('');
    expect(spoken(m.root)).toBe('Saved the search My usual.');
    expect(JSON.parse(m.store.getItem(SEARCHES_STORE_KEY) ?? '[]')).toHaveLength(1);
    expect(region(m.root, '[data-gl-searches]')).toContain('My usual');
  });
  it('refuses a repeated name', () => {
    const m = mount();
    m.root.fire('change', { id: 'gl-f-ramp', checked: true });
    name(m, 'Mine');
    m.root.fire('click', { id: 'gl-search-save' });
    name(m, 'mine');
    m.root.fire('click', { id: 'gl-search-save' });
    expect(m.finder.getSearches()).toHaveLength(1);
    expect(region(m.root, '[data-gl-searches]')).toContain('already have a search');
  });
  it('uses a saved search: ticks the boxes, fills the search, and shows results', () => {
    const m = mount();
    m.root.fire('change', { id: 'gl-f-elevator', checked: true });
    m.root.fire('change', { id: 'gl-pq', value: 'hall' });
    name(m, 'Halls');
    m.root.fire('click', { id: 'gl-search-save' });
    m.root.fire('click', { id: 'gl-clear' });
    expect(m.finder.getState().features).toEqual([]);
    m.root.fire('click', { id: 'gl-sus-0' });
    expect(m.finder.getState()).toEqual({ features: ['elevator'], query: 'hall', hideNotAvailable: false });
    expect(m.root.querySelector('#gl-f-elevator').checked).toBe(true);
    expect(m.root.querySelector('#gl-f-ramp').checked).toBe(false);
    expect(m.root.querySelector('#gl-pq').value).toBe('hall');
    expect(spoken(m.root)).toBe('Using the search Halls.');
    expect(region(m.root, '[data-gl-pcount]')).toBe('1 place shown');
  });
  it('replaces the old choices, not adds to them', () => {
    const m = mount();
    m.root.fire('change', { id: 'gl-f-ramp', checked: true });
    name(m, 'Ramps');
    m.root.fire('click', { id: 'gl-search-save' });
    m.root.fire('change', { id: 'gl-f-elevator', checked: true });
    m.root.fire('click', { id: 'gl-sus-0' });
    expect(m.finder.getState().features).toEqual(['ramp']);
  });
  it('deletes a search and brings it back with undo', () => {
    const m = mount();
    m.root.fire('change', { id: 'gl-f-ramp', checked: true });
    name(m, 'A');
    m.root.fire('click', { id: 'gl-search-save' });
    name(m, 'B');
    m.root.fire('click', { id: 'gl-search-save' });
    m.root.fire('click', { id: 'gl-sdel-0' });
    expect(m.finder.getSearches().map((s) => s.name)).toEqual(['B']);
    expect(region(m.root, '[data-gl-undo]')).toContain('Undo: delete saved search');
    m.root.fire('click', { id: 'gl-undo' });
    expect(m.finder.getSearches().map((s) => s.name)).toEqual(['A', 'B']);
    expect(JSON.parse(m.store.getItem(SEARCHES_STORE_KEY) ?? '[]')).toHaveLength(2);
  });
  it('ignores a search that is not there', () => {
    const m = mount();
    m.root.fire('click', { id: 'gl-sus-3' });
    m.root.fire('click', { id: 'gl-sdel-3' });
    expect(m.finder.getState().features).toEqual([]);
  });
  it('is read back by a new finder, and ignores damaged storage', () => {
    const first = mount();
    first.root.fire('change', { id: 'gl-f-ramp', checked: true });
    name(first, 'Mine');
    first.root.fire('click', { id: 'gl-search-save' });
    expect(mount({ store: first.store }).finder.getSearches()).toHaveLength(1);
    const bad = new Mem();
    bad.setItem(SEARCHES_STORE_KEY, '{nope');
    expect(mount({ store: bad }).finder.getSearches()).toEqual([]);
  });
  it('goes into the backup file and comes back, and forget removes it', () => {
    const files: ExportFile[] = [];
    const a = mount({ exports: files });
    a.root.fire('change', { id: 'gl-f-ramp', checked: true });
    name(a, 'Mine');
    a.root.fire('click', { id: 'gl-search-save' });
    a.root.fire('click', { id: 'gl-backup-export' });
    const parsed = parseBackup(files[0]?.text ?? '');
    expect(parsed.ok && parsed.backup.searches).toEqual([{ name: 'Mine', state: { features: ['ramp'], query: '', hideNotAvailable: false } }]);

    const b = mount();
    b.root.querySelector('#gl-backup-text').value = files[0]?.text ?? '';
    b.root.fire('click', { id: 'gl-backup-import' });
    expect(b.finder.getSearches()).toHaveLength(1);
    expect(JSON.parse(b.store.getItem(SEARCHES_STORE_KEY) ?? '[]')).toHaveLength(1);
    b.root.fire('click', { id: 'gl-forget' });
    b.root.fire('click', { id: 'gl-forget-sure' });
    expect(b.finder.getSearches()).toEqual([]);
    expect(JSON.parse(b.store.getItem(SEARCHES_STORE_KEY) ?? 'null')).toEqual([]);
  });
  it('is in French', () => {
    const m = mount({ lang: 'fr' });
    m.root.fire('change', { id: 'gl-f-ramp', checked: true });
    name(m, 'Samedi');
    m.root.fire('click', { id: 'gl-search-save' });
    expect(spoken(m.root)).toBe('Recherche Samedi enregistrée.');
    expect(region(m.root, '[data-gl-searches]')).toContain('Utiliser');
  });
  it('does not touch lists or saved places', () => {
    const m = mount();
    save(m, 0);
    m.root.fire('change', { id: 'gl-f-ramp', checked: true });
    name(m, 'Mine');
    m.root.fire('click', { id: 'gl-search-save' });
    expect(m.finder.getSaved()).toEqual(['lib']);
    expect(m.finder.getLists()).toEqual([]);
    expect(m.store.getItem(LISTS_STORE_KEY)).toBeNull();
  });
});

describe('visit log', () => {
  it('starts empty', () => {
    const m = mount({ exports: [] });
    expect(region(m.root, '[data-gl-visitlog]')).toBe('');
    m.root.fire('click', { id: 'gl-visit-0' });
    expect(region(m.root, '[data-gl-visitlog]')).toContain('Library, marked on 2026-11-15');
  });
  it('is in the shell with its own panel', () => {
    const m = mount();
    expect(m.root.innerHTML).toContain('class="gl-visitlog"');
    expect(m.root.innerHTML).toContain('data-gl-visitlog');
  });
  it('lists newest first and leaves a place out when the mark is removed', () => {
    const m = mount({ exports: [] });
    m.root.fire('click', { id: 'gl-visit-0' });
    m.root.fire('click', { id: 'gl-visit-2' });
    expect(region(m.root, '[data-gl-visitlog]')).toContain('2 places');
    m.root.fire('click', { id: 'gl-visit-0' });
    expect(region(m.root, '[data-gl-visitlog]')).not.toContain('Library');
  });
  it('exports a text file when the host takes files', () => {
    const files: ExportFile[] = [];
    const m = mount({ exports: files });
    m.root.fire('click', { id: 'gl-visit-0' });
    m.root.fire('click', { id: 'gl-export-visits' });
    expect(files).toHaveLength(1);
    expect(files[0]?.filename).toBe('visited-places-en.txt');
    expect(files[0]?.text).toContain('Library, marked on 2026-11-15');
  });
  it('has no export button when the host takes no files', () => {
    const m = mount();
    m.root.fire('click', { id: 'gl-visit-0' });
    expect(region(m.root, '[data-gl-visitlog]')).not.toContain('gl-export-visits');
    m.root.fire('click', { id: 'gl-export-visits' });
  });
  it('is French in French', () => {
    const m = mount({ lang: 'fr', exports: [] });
    m.root.fire('click', { id: 'gl-visit-0' });
    expect(region(m.root, '[data-gl-visitlog]')).toContain('marqué le 2026-11-15');
  });
});

describe('notes search', () => {
  const note = (m: M, i: number, text: string): void => m.root.fire('input', { id: `gl-note-${i}`, value: text });
  const type = (m: M, q: string): void => m.root.fire('input', { id: 'gl-nsq', value: q });
  it('is in the shell', () => {
    const m = mount();
    expect(m.root.innerHTML).toContain('class="gl-notesearch"');
    expect(m.root.innerHTML).toContain('id="gl-nsq"');
  });
  it('finds notes as the person types, and redraws only its own region', () => {
    const m = mount();
    note(m, 0, 'Ask about the side door');
    note(m, 1, 'Quiet corner');
    const before = m.root.innerHTML;
    type(m, 'door');
    expect(region(m.root, '[data-gl-nsr]')).toContain('1 place has a note with those words.');
    expect(region(m.root, '[data-gl-nsr]')).toContain('id="gl-nshow-0"');
    expect(m.root.innerHTML).toBe(before);
  });
  it('says so when nothing matches, and prompts when empty', () => {
    const m = mount();
    note(m, 0, 'Ask about the side door');
    type(m, 'zzz');
    expect(region(m.root, '[data-gl-nsr]')).toContain('No notes have those words.');
    type(m, '');
    expect(region(m.root, '[data-gl-nsr]')).toContain('Type a word');
  });
  it('updates matches when a note changes', () => {
    const m = mount();
    type(m, 'door');
    expect(region(m.root, '[data-gl-nsr]')).toContain('No notes have those words.');
    note(m, 0, 'Side door');
    expect(region(m.root, '[data-gl-nsr]')).toContain('1 place has a note');
  });
  it('puts the place name in the name search when Show is pressed', () => {
    const m = mount();
    note(m, 1, 'Quiet corner');
    type(m, 'quiet');
    m.root.fire('click', { id: 'gl-nshow-1' });
    expect(m.root.querySelector('#gl-pq').value).toBe('Café Nord');
    expect(m.root.querySelector('#gl-pq').focused).toBe(1);
  });
  it('ignores a Show for a place that is not there', () => {
    const m = mount();
    m.root.fire('click', { id: 'gl-nshow-99' });
    expect(m.root.querySelector('#gl-pq').value).toBe('');
  });
  it('limits what is typed', () => {
    const m = mount();
    type(m, 'x'.repeat(500));
    expect(region(m.root, '[data-gl-nsr]')).toContain('No notes');
  });
});

describe('list print', () => {
  const makeList = (m: M, ...placeIndexes: number[]): void => {
    m.root.querySelector('#gl-list-name').value = 'Saturday';
    m.root.fire('click', { id: 'gl-list-create' });
    for (const i of placeIndexes) m.root.fire('change', { id: `gl-lst-${i}`, value: '0' });
  };
  it('has a print button next to the export button once the list has a place', () => {
    const m = mount({ exports: [] });
    makeList(m);
    expect(region(m.root, '[data-gl-lists]')).not.toContain('gl-lprint-');
    m.root.fire('change', { id: 'gl-lst-0', value: '0' });
    expect(region(m.root, '[data-gl-lists]')).toContain('id="gl-lprint-0"');
    expect(region(m.root, '[data-gl-lists]')).toContain('id="gl-lexp-0"');
  });
  it('sends a printable page with the list and the sources, and never says a place is accessible', () => {
    const files: ExportFile[] = [];
    const m = mount({ exports: files });
    makeList(m, 0, 3);
    m.root.fire('click', { id: 'gl-lprint-0' });
    const f = files[0];
    expect(f?.filename).toBe('list-saturday-en.html');
    expect(f?.mime).toBe('text/html;charset=utf-8');
    expect(f?.text).toContain('<h1>Saturday</h1>');
    expect(f?.text).toContain('Printed on 2026-11-15');
    expect(f?.text).not.toMatch(/accessible|verified/i);
  });
  it('does nothing for a list that is not there, or without a host that takes files', () => {
    const files: ExportFile[] = [];
    const m = mount({ exports: files });
    m.root.fire('click', { id: 'gl-lprint-5' });
    expect(files).toEqual([]);
    const n = mount();
    n.root.fire('click', { id: 'gl-lprint-0' });
  });
  it('is French in French', () => {
    const files: ExportFile[] = [];
    const m = mount({ lang: 'fr', exports: files });
    makeList(m, 0);
    m.root.fire('click', { id: 'gl-lprint-0' });
    expect(files[0]?.filename).toBe('list-saturday-fr.html');
    expect(files[0]?.text).toContain('lang="fr-CA"');
  });
});
