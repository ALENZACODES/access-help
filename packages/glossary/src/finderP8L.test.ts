import { describe, expect, it } from 'vitest';
import {
  LISTS_STORE_KEY,
  LIST_UI,
  SAVED_STORE_KEY,
  mountPlaceFinder,
  parseBackup,
  type ExportFile,
  type FeatureClaim,
  type FinderElement,
  type FinderRoot,
  type Lang,
  type IndexStore,
  type Place,
  type Provenance,
} from './index';

const prov: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01' };
const yes = (termId: string): FeatureClaim => ({ termId, status: 'present', provenance: prov });
const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [yes('ramp')] },
  { id: 'cafe', name: 'Café Nord', claims: [] },
  { id: 'pool', name: 'Pool', claims: [] },
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
  spoken?: { text: string; lang: Lang }[];
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
    ...(o.spoken === undefined ? {} : { onSpeak: (text: string, lang: Lang) => o.spoken?.push({ text, lang }) }),
  });
  return { root, finder, store };
};
const region = (root: Root, selector: string): string => root.querySelector(selector).innerHTML;
const spoken = (root: Root): string => region(root, '[data-gl-announce]');

describe('empty results: drop one choice', () => {
  it('offers nothing while places match', () => {
    expect(mount().root.innerHTML).not.toContain('gl-relax-');
  });
  it('offers to drop the name search, then does it', () => {
    const { root, finder } = mount();
    root.fire('change', { id: 'gl-pq', value: 'zzz' });
    expect(region(root, '[data-gl-presults]')).toContain('id="gl-relax-query"');
    root.fire('click', { id: 'gl-relax-query' });
    expect(finder.getState().query).toBe('');
    expect(root.querySelector('#gl-pq').value).toBe('');
    expect(region(root, '[data-gl-presults]')).not.toContain('gl-relax-');
    expect(root.querySelector('#gl-pq').focused).toBeGreaterThan(0);
  });
  it('drops one feature and unticks its box', () => {
    const { root, finder } = mount();
    root.fire('change', { id: 'gl-f-ramp', checked: true });
    root.fire('change', { id: 'gl-pq', value: 'pool' });
    root.fire('change', { id: 'gl-hide', checked: true });
    root.fire('change', { id: 'gl-f-elevator', checked: true });
    // Pool has no sourced claims, so it stays in (unknown); make nothing match with a name that is nobody's.
    root.fire('change', { id: 'gl-pq', value: 'zzz' });
    expect(region(root, '[data-gl-presults]')).toContain('gl-relax-');
    root.fire('click', { id: 'gl-relax-feature-ramp' });
    expect(finder.getState().features).toEqual(['elevator']);
    expect(root.querySelector('#gl-f-ramp').checked).toBe(false);
  });
  it('drops only saved and writes the view to storage', () => {
    const { root, finder, store } = mount();
    root.fire('change', { id: 'gl-only-saved', checked: true });
    expect(region(root, '[data-gl-presults]')).toContain('id="gl-relax-saved"');
    root.fire('click', { id: 'gl-relax-saved' });
    expect(finder.getView().savedOnly).toBe(false);
    expect(root.querySelector('#gl-only-saved').checked).toBe(false);
    expect(JSON.parse(store.getItem('glossary-finder-view') ?? '{}').savedOnly).toBe(false);
  });
  it('says what happened for a screen reader', () => {
    const { root } = mount();
    root.fire('change', { id: 'gl-pq', value: 'zzz' });
    root.fire('click', { id: 'gl-relax-query' });
    expect(spoken(root)).toBe('Choice removed.');
  });
  it('ignores an offer that is not there', () => {
    const { root, finder } = mount();
    root.fire('change', { id: 'gl-pq', value: 'lib' });
    root.fire('click', { id: 'gl-relax-saved' });
    root.fire('click', { id: 'gl-relax-nope' });
    expect(finder.getState().query).toBe('lib');
  });
  it('is in French too', () => {
    const { root } = mount({ lang: 'fr' });
    root.fire('change', { id: 'gl-pq', value: 'zzz' });
    expect(region(root, '[data-gl-presults]')).toContain('Sans la recherche par nom');
  });
});

describe('lists', () => {
  const make = (m: ReturnType<typeof mount>, name: string): void => {
    m.root.querySelector('#gl-list-name').value = name;
    m.root.fire('click', { id: 'gl-list-create' });
  };
  it('starts with none and no picker on places', () => {
    const { root } = mount();
    expect(root.innerHTML).toContain(LIST_UI.en.none);
    expect(root.innerHTML).not.toContain('id="gl-lst-0"');
  });
  it('makes a list, clears the box, says so, and keeps it on this device', () => {
    const m = mount();
    make(m, '  Saturday  ');
    expect(m.finder.getLists()).toEqual([{ name: 'Saturday', ids: [] }]);
    expect(m.root.querySelector('#gl-list-name').value).toBe('');
    expect(spoken(m.root)).toBe('Created the list Saturday.');
    expect(JSON.parse(m.store.getItem(LISTS_STORE_KEY) ?? '[]')).toEqual([{ name: 'Saturday', ids: [] }]);
    expect(region(m.root, '[data-gl-presults]')).toContain('id="gl-lst-0"');
  });
  it.each([['', 'Type a name for the list.'], ['   ', 'Type a name for the list.']])('refuses the empty name %j', (name, message) => {
    const m = mount();
    make(m, name);
    expect(region(m.root, '[data-gl-lists]')).toContain(message);
    expect(m.finder.getLists()).toEqual([]);
    expect(m.root.querySelector('#gl-list-name').focused).toBe(1);
  });
  it('refuses a repeated name', () => {
    const m = mount();
    make(m, 'Saturday');
    make(m, 'saturday');
    expect(m.finder.getLists()).toHaveLength(1);
    expect(region(m.root, '[data-gl-lists]')).toContain('already have a list');
  });
  it('adds a place from the box and takes it out of the box', () => {
    const m = mount();
    make(m, 'Saturday');
    m.root.fire('change', { id: 'gl-lst-0', value: '0' });
    expect(m.finder.getLists()[0]?.ids).toEqual(['lib']);
    expect(spoken(m.root)).toBe('Added Library to Saturday.');
    expect(region(m.root, '[data-gl-lists]')).toContain('id="gl-lrm-0-0"');
    expect(region(m.root, '[data-gl-presults]')).not.toContain('id="gl-lst-0"');
    expect(region(m.root, '[data-gl-presults]')).toContain('id="gl-lst-1"');
  });
  it('ignores a box value that is not a list', () => {
    const m = mount();
    make(m, 'Saturday');
    for (const value of ['', '7', '-1', 'x', '0.5']) m.root.fire('change', { id: 'gl-lst-0', value });
    expect(m.finder.getLists()[0]?.ids).toEqual([]);
  });
  it('takes a place off a list', () => {
    const m = mount();
    make(m, 'Saturday');
    m.root.fire('change', { id: 'gl-lst-1', value: '0' });
    m.root.fire('click', { id: 'gl-lrm-0-1' });
    expect(m.finder.getLists()[0]?.ids).toEqual([]);
    expect(spoken(m.root)).toBe('Removed Café Nord from Saturday.');
  });
  it('deletes a list and brings it back with undo, places and all', () => {
    const m = mount();
    make(m, 'A');
    make(m, 'B');
    m.root.fire('change', { id: 'gl-lst-0', value: '1' });
    m.root.fire('click', { id: 'gl-ldel-1' });
    expect(m.finder.getLists().map((l) => l.name)).toEqual(['A']);
    expect(region(m.root, '[data-gl-undo]')).toContain('Undo: delete list');
    m.root.fire('click', { id: 'gl-undo' });
    expect(m.finder.getLists()).toEqual([{ name: 'A', ids: [] }, { name: 'B', ids: ['lib'] }]);
    expect(JSON.parse(m.store.getItem(LISTS_STORE_KEY) ?? '[]')).toHaveLength(2);
  });
  it('is read back from storage by a new finder', () => {
    const first = mount();
    make(first, 'Saturday');
    first.root.fire('change', { id: 'gl-lst-2', value: '0' });
    const second = mount({ store: first.store });
    expect(second.finder.getLists()).toEqual([{ name: 'Saturday', ids: ['pool'] }]);
    expect(second.root.innerHTML).toContain('Pool');
  });
  it('ignores damaged storage', () => {
    const store = new Mem();
    store.setItem(LISTS_STORE_KEY, '{not json');
    expect(mount({ store }).finder.getLists()).toEqual([]);
  });
  it('shows list buttons in French', () => {
    const m = mount({ lang: 'fr' });
    make(m, 'Samedi');
    expect(region(m.root, '[data-gl-lists]')).toContain('Supprimer la liste');
    expect(spoken(m.root)).toBe('Liste Samedi créée.');
  });
  it('goes into the backup file and comes back from it', () => {
    const files: ExportFile[] = [];
    const a = mount({ exports: files });
    make(a, 'Saturday');
    a.root.fire('change', { id: 'gl-lst-0', value: '0' });
    a.root.fire('click', { id: 'gl-backup-export' });
    const parsed = parseBackup(files[0]?.text ?? '');
    expect(parsed.ok && parsed.backup.lists).toEqual([{ name: 'Saturday', ids: ['lib'] }]);

    const b = mount({ exports: [] });
    b.root.querySelector('#gl-backup-text').value = files[0]?.text ?? '';
    b.root.fire('click', { id: 'gl-backup-import' });
    expect(b.finder.getLists()).toEqual([{ name: 'Saturday', ids: ['lib'] }]);
    expect(JSON.parse(b.store.getItem(LISTS_STORE_KEY) ?? '[]')).toEqual([{ name: 'Saturday', ids: ['lib'] }]);
    expect(b.root.innerHTML).toContain('Saturday');
  });
  it('is counted in "Your data" and removed by forget everything', () => {
    const m = mount();
    make(m, 'Saturday');
    expect(region(m.root, '[data-gl-data]')).toContain('1 lists');
    m.root.fire('click', { id: 'gl-forget' });
    m.root.fire('click', { id: 'gl-forget-sure' });
    expect(m.finder.getLists()).toEqual([]);
    expect(JSON.parse(m.store.getItem(LISTS_STORE_KEY) ?? 'null')).toEqual([]);
  });
  it('does not touch saved places', () => {
    const m = mount();
    m.root.fire('click', { id: 'gl-save-0' });
    make(m, 'Saturday');
    m.root.fire('change', { id: 'gl-lst-1', value: '0' });
    expect(m.finder.getSaved()).toEqual(['lib']);
    expect(JSON.parse(m.store.getItem(SAVED_STORE_KEY) ?? '[]')).toEqual(['lib']);
  });
});

describe('read aloud', () => {
  it('has no button without a host that can speak', () => {
    expect(mount().root.innerHTML).not.toContain('gl-say-');
  });
  it('speaks the place in order, in the language of the page', () => {
    const said: { text: string; lang: Lang }[] = [];
    const { root } = mount({ spoken: said });
    root.fire('change', { id: 'gl-f-ramp', checked: true });
    root.fire('click', { id: 'gl-say-0' });
    expect(said.length).toBeGreaterThan(0);
    expect(said.every((s) => s.lang === 'en')).toBe(true);
    const all = said.map((s) => s.text).join(' ');
    expect(all.startsWith('Library.')).toBe(true);
    expect(all).toContain('Source: City open data.');
  });
  it('says unknown for a place with no sources', () => {
    const said: { text: string; lang: Lang }[] = [];
    const { root } = mount({ spoken: said });
    root.fire('change', { id: 'gl-f-ramp', checked: true });
    root.fire('click', { id: 'gl-say-2' });
    expect(said.map((s) => s.text).join(' ')).toMatch(/Pool\. Ramp: unknown/i);
  });
  it('speaks French', () => {
    const said: { text: string; lang: Lang }[] = [];
    const { root } = mount({ lang: 'fr', spoken: said });
    root.fire('change', { id: 'gl-f-ramp', checked: true });
    root.fire('click', { id: 'gl-say-0' });
    expect(said.every((s) => s.lang === 'fr')).toBe(true);
    expect(said.map((s) => s.text).join(' ')).toContain('Source');
  });
  it('ignores a place that is not there', () => {
    const said: { text: string; lang: Lang }[] = [];
    const { root } = mount({ spoken: said });
    root.fire('click', { id: 'gl-say-99' });
    expect(said).toEqual([]);
  });
});

describe('report a problem', () => {
  const fill = (root: Root, index: number, feature: string, note: string): void => {
    root.querySelector(`#gl-fixf-${index}`).value = feature;
    root.querySelector(`#gl-fixn-${index}`).value = note;
    root.fire('click', { id: `gl-fix-${index}` });
  };
  it('has no form without a host that can take files', () => {
    expect(mount().root.innerHTML).not.toContain('gl-fixn-');
  });
  it('makes a report from the form', () => {
    const files: ExportFile[] = [];
    const { root } = mount({ exports: files });
    fill(root, 0, 'ramp', 'The ramp is closed on Sundays.');
    expect(files).toHaveLength(1);
    expect(files[0]?.filename).toBe('report-lib-en.txt');
    expect(files[0]?.mime).toBe('text/plain;charset=utf-8');
    expect(files[0]?.text).toContain('Place: Library');
    expect(files[0]?.text).toContain('Source: City open data.');
    expect(files[0]?.text).toContain('The ramp is closed on Sundays.');
  });
  it('is about the place in general when no feature is chosen, or when the value is not a feature', () => {
    const files: ExportFile[] = [];
    const { root } = mount({ exports: files });
    fill(root, 1, '', 'Closed for good.');
    fill(root, 1, 'teleporter', 'Closed for good.');
    expect(files).toHaveLength(2);
    for (const f of files) expect(f.text).not.toContain('Feature:');
  });
  it('makes nothing when nothing was written, and returns to the box', () => {
    const files: ExportFile[] = [];
    const { root } = mount({ exports: files });
    fill(root, 0, 'ramp', '   ');
    expect(files).toEqual([]);
    expect(root.querySelector('#gl-fixn-0').focused).toBe(1);
  });
  it('reports in French', () => {
    const files: ExportFile[] = [];
    const { root } = mount({ lang: 'fr', exports: files });
    fill(root, 0, 'ramp', 'La rampe est fermée.');
    expect(files[0]?.filename).toBe('report-lib-fr.txt');
    expect(files[0]?.text).toContain('Lieu\u00a0: Library');
  });
  it('does not change what the app shows', () => {
    const files: ExportFile[] = [];
    const { root, finder } = mount({ exports: files });
    const before = root.innerHTML;
    fill(root, 0, 'ramp', 'Wrong.');
    expect(root.innerHTML).toBe(before);
    expect(finder.getNotes()).toEqual({});
  });
  it('ignores a place that is not there', () => {
    const files: ExportFile[] = [];
    const { root } = mount({ exports: files });
    root.fire('click', { id: 'gl-fix-99' });
    expect(files).toEqual([]);
  });
});

describe('search words shown in the list', () => {
  it('marks the typed part of each name', () => {
    const { root } = mount();
    root.fire('change', { id: 'gl-pq', value: 'caf' });
    expect(region(root, '[data-gl-presults]')).toContain('<mark>Caf</mark>é Nord');
  });
  it('marks nothing without a search', () => {
    expect(mount().root.innerHTML).not.toContain('<mark>');
  });
  it('keeps marks out of attributes and the note label', () => {
    const { root } = mount();
    root.fire('change', { id: 'gl-pq', value: 'lib' });
    const html = region(root, '[data-gl-presults]');
    expect(html).not.toMatch(/aria-label="[^"]*<mark>/);
    expect(html).not.toMatch(/<label[^>]*>[^<]*<mark>/);
  });
});

describe('the new controls together', () => {
  it('are all drawn in both languages when lists, speech and export are on', () => {
    for (const lang of ['en', 'fr'] as Lang[]) {
      const m = mount({ lang, exports: [], spoken: [] });
      m.root.querySelector('#gl-list-name').value = 'Saturday';
      m.root.fire('click', { id: 'gl-list-create' });
      m.root.fire('change', { id: 'gl-lst-0', value: '0' });
      const html = m.root.innerHTML + region(m.root, '[data-gl-presults]') + region(m.root, '[data-gl-lists]');
      expect(html).toContain('gl-say-0');
      expect(html).toContain('gl-fixn-0');
      expect(html).toContain('gl-lrm-0-0');
    }
  });
  it('keeps one id per control', () => {
    const m = mount({ exports: [], spoken: [] });
    m.root.querySelector('#gl-list-name').value = 'Saturday';
    m.root.fire('click', { id: 'gl-list-create' });
    const ids = [...(m.root.innerHTML.match(/ id="([^"]+)"/g) ?? [])];
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('survives setPlaces with fewer places, keeping lists and skipping places that are gone', () => {
    const m = mount();
    m.root.querySelector('#gl-list-name').value = 'Saturday';
    m.root.fire('click', { id: 'gl-list-create' });
    m.root.fire('change', { id: 'gl-lst-2', value: '0' });
    m.finder.setPlaces(places.slice(0, 2));
    expect(m.finder.getLists()).toEqual([{ name: 'Saturday', ids: ['pool'] }]);
    expect(m.root.innerHTML).toContain('Saturday');
    expect(m.root.innerHTML).not.toContain('id="gl-lrm-0-');
  });
});
