import { describe, expect, it } from 'vitest';
import {
  EMPTY_STATE,
  FINDER_STORE_KEY,
  FINDER_UI,
  FINDER_VIEW_KEY,
  PAGE_SIZE,
  PREFS_STORE_KEY,
  SAVED_STORE_KEY,
  auditHtml,
  frenchIssues,
  lintCopy,
  mountPlaceFinder,
  renderFinderShell,
  renderSuggestions,
  resultsView,
  type ExportFile,
  type FeatureClaim,
  type FinderElement,
  type FinderRoot,
  type IndexStore,
  type Place,
} from './index';

const prov = { source: 'City open data', licence: 'OGL-Canada-2.0', date: '2026-10-01' } as const;
const old = { source: 'Old survey', licence: 'CC0-1.0', date: '2023-01-01' } as const;
const yes = (termId: string, p: { source: string; licence: string; date: string } = prov): FeatureClaim => ({ termId, status: 'present', provenance: p });
const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [yes('ramp'), yes('elevator')] },
  { id: 'cafe', name: 'Café Nord', claims: [yes('ramp', old)] },
  { id: 'gym', name: 'Armoury', claims: [] },
];
const many: Place[] = Array.from({ length: 60 }, (_, i) => ({
  id: `p${i}`,
  name: `Place ${String(i).padStart(2, '0')}`,
  claims: [yes('ramp')],
}));
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
class Root implements FinderRoot {
  innerHTML = '';
  readonly els = new Map<string, El>();
  readonly handlers = new Map<string, ((e: { readonly target: unknown }) => void)[]>();
  querySelector(selector: string): El {
    let el = this.els.get(selector);
    if (el === undefined) {
      el = new El();
      this.els.set(selector, el);
    }
    return el;
  }
  addEventListener(type: string, l: (e: { readonly target: unknown }) => void): void {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), l]);
  }
  fire(type: string, target: unknown): void {
    for (const h of this.handlers.get(type) ?? []) h({ target });
  }
  click(id: string): void {
    this.fire('click', { id });
  }
  list(): string {
    return this.querySelector('[data-gl-presults]').innerHTML;
  }
  count(): string {
    return this.querySelector('[data-gl-pcount]').innerHTML;
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
const names = (html: string): string[] => [...html.matchAll(/id="gl-cmp-(\d+)"/g)].map((m) => m[1] ?? '');

describe('resultsView paging and sorting', () => {
  it('shows one page and says how many are shown', () => {
    const r = resultsView(many, EMPTY_STATE, 'en', today, []);
    expect(r.shown).toBe(PAGE_SIZE);
    expect(r.total).toBe(60);
    expect(r.count).toBe('25 of 60 places shown');
    expect(r.list).toContain('id="gl-more"');
    expect(r.indexes).toHaveLength(PAGE_SIZE);
  });

  it('shows everything without "Show more" when it fits', () => {
    const r = resultsView(places, EMPTY_STATE, 'en', today, []);
    expect(r.list).not.toContain('gl-more');
    expect(r.count).toBe('3 places shown');
  });

  it('honours a custom limit and hides "Show more" once everything is on screen', () => {
    expect(resultsView(many, EMPTY_STATE, 'en', today, [], { limit: 10 }).shown).toBe(10);
    expect(resultsView(many, EMPTY_STATE, 'en', today, [], { limit: 60 }).list).not.toContain('gl-more');
  });

  it('says it in French with a non-breaking layout that passes the French checks', () => {
    const r = resultsView(many, EMPTY_STATE, 'fr', today, []);
    expect(r.count).toBe('25 lieux affichés sur 60');
    expect(frenchIssues(r.count)).toEqual([]);
  });

  it('sorts by name and by newest information', () => {
    const byName = resultsView(places, EMPTY_STATE, 'en', today, [], { view: { sort: 'name', recentOnly: false, savedOnly: false } });
    expect(byName.indexes).toEqual([2, 1, 0]);
    const newest = resultsView(places, EMPTY_STATE, 'en', today, [], { view: { sort: 'newest', recentOnly: false, savedOnly: false } });
    expect(newest.indexes).toEqual([0, 1, 2]);
  });

  it('keeps button ids tied to the place, not the position', () => {
    const r = resultsView(places, EMPTY_STATE, 'en', today, [], { view: { sort: 'name', recentOnly: false, savedOnly: false } });
    expect(names(r.list)).toEqual(['2', '1', '0']);
  });

  it('recent-only drops old and undated places', () => {
    const r = resultsView(places, EMPTY_STATE, 'en', today, [], { view: { sort: 'best', recentOnly: true, savedOnly: false } });
    expect(r.indexes).toEqual([0]);
  });

  it('saved-only shows saved places and marks them pressed', () => {
    const r = resultsView(places, EMPTY_STATE, 'en', today, [], {
      view: { sort: 'best', recentOnly: false, savedOnly: true },
      saved: ['cafe'],
    });
    expect(r.indexes).toEqual([1]);
    expect(r.list).toMatch(/id="gl-save-1" aria-pressed="true"/);
  });

  it('names each action button after its place', () => {
    const r = resultsView(places, EMPTY_STATE, 'en', today, []);
    expect(r.list).toContain('aria-label="Save Library"');
    expect(r.list).toContain('aria-label="Compare Library"');
  });

  it('adds the copy button to a comparison only when export is on', () => {
    expect(resultsView(places, EMPTY_STATE, 'en', today, [0, 1]).compare).not.toContain('gl-copy-compare');
    expect(resultsView(places, EMPTY_STATE, 'en', today, [0, 1], { canExport: true }).compare).toContain('gl-copy-compare');
  });

  it('shows nothing extra for an empty saved list', () => {
    const r = resultsView(places, EMPTY_STATE, 'en', today, [], { view: { sort: 'best', recentOnly: false, savedOnly: true } });
    expect(r.shown).toBe(0);
    expect(r.list).toContain('gl-empty');
  });
});

describe('renderSuggestions', () => {
  it('offers a button for a word that means a feature', () => {
    const html = renderSuggestions('lift', EMPTY_STATE, 'en');
    expect(html).toContain('id="gl-sg-elevator"');
    expect(html).toContain(FINDER_UI.en.suggestLabel);
  });

  it('offers nothing for chosen features or unrelated words', () => {
    expect(renderSuggestions('lift', { ...EMPTY_STATE, features: ['elevator'] }, 'en')).toBe('');
    expect(renderSuggestions('zebra', EMPTY_STATE, 'en')).toBe('');
  });

  it('labels the group for assistive technology', () => {
    expect(renderSuggestions('ramp', EMPTY_STATE, 'en')).toMatch(/role="group" aria-labelledby="gl-suggest-label"/);
  });
});

describe('renderFinderShell extras', () => {
  const shell = (lang: 'en' | 'fr', extra: Partial<Parameters<typeof renderFinderShell>[0]> = {}) =>
    renderFinderShell({ lang, state: EMPTY_STATE, places: many, today, canExport: true, prefs: { textScale: 100, wideSpacing: false, highContrast: false, reduceMotion: false }, ...extra });

  it('has the sort, recent, saved, export and display controls', () => {
    const html = shell('en');
    for (const id of ['gl-sort', 'gl-recent', 'gl-only-saved', 'gl-export-saved', 'gl-pref-size', 'gl-more']) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it('leaves out export and display settings when not asked for', () => {
    const html = shell('en', { canExport: false, prefs: undefined as never });
    expect(html).not.toContain('gl-export-saved');
    expect(html).not.toContain('gl-pref-size');
  });

  it('marks the current sort order', () => {
    expect(shell('en', { view: { sort: 'name', recentOnly: true, savedOnly: false } })).toMatch(/<option value="name" selected>/);
    expect(shell('en', { view: { sort: 'name', recentOnly: true, savedOnly: false } })).toMatch(/id="gl-recent" checked/);
  });

  it.each(['en', 'fr'] as const)('passes the HTML audit and wording checks in %s', (lang) => {
    const html = shell(lang, { saved: ['p1'], selected: [0, 1], limit: 5 });
    expect(auditHtml(`finder.${lang}`, `<main>${html}</main>`).filter((f) => f.severity === 'error')).toEqual([]);
    const text = html.replace(/<[^>]+>/g, ' ');
    expect(lintCopy(text)).toEqual([]);
  });

  it('puts French strings through the typography checks', () => {
    const f = FINDER_UI.fr;
    for (const s of [f.sortLabel, f.recentLabel, f.savedLabel, f.more, f.exportSaved, f.copyCompare, f.suggestLabel, f.saveLabel('Café'), f.partial(3, 9)]) {
      expect(frenchIssues(s)).toEqual([]);
    }
  });
});

describe('mountPlaceFinder: sort, saved, paging, suggestions, export', () => {
  const mount = (extra: Partial<Parameters<typeof mountPlaceFinder>[1]> = {}, list: readonly Place[] = places) => {
    const root = new Root();
    const finder = mountPlaceFinder(root, { lang: 'en', places: list, today, ...extra });
    return { root, finder };
  };

  it('changes the sort order and saves it on this device', () => {
    const store = new Mem();
    const { root, finder } = mount({ store });
    root.fire('change', { id: 'gl-sort', value: 'name' });
    expect(finder.getView().sort).toBe('name');
    expect(names(root.list())).toEqual(['2', '1', '0']);
    expect(store.getItem(FINDER_VIEW_KEY)).toContain('"sort":"name"');
  });

  it('ignores an unknown sort value', () => {
    const { root, finder } = mount();
    root.fire('change', { id: 'gl-sort', value: 'cheapest' });
    expect(finder.getView().sort).toBe('best');
  });

  it('restores the saved view and saved places on the next visit', () => {
    const store = new Mem();
    const first = mount({ store });
    first.root.fire('change', { id: 'gl-recent', checked: true });
    first.root.click('gl-save-0');
    const second = mount({ store });
    expect(second.finder.getView().recentOnly).toBe(true);
    expect(second.finder.getSaved()).toEqual(['lib']);
  });

  it('toggles saved places and keeps focus on the button', () => {
    const store = new Mem();
    const { root, finder } = mount({ store });
    root.click('gl-save-1');
    expect(finder.getSaved()).toEqual(['cafe']);
    expect(store.getItem(SAVED_STORE_KEY)).toBe('["cafe"]');
    expect(root.querySelector('#gl-save-1').focused).toBe(1);
    root.click('gl-save-1');
    expect(finder.getSaved()).toEqual([]);
  });

  it('ignores save and compare clicks for places that do not exist', () => {
    const { root, finder } = mount();
    root.click('gl-save-99');
    root.click('gl-cmp-99');
    expect(finder.getSaved()).toEqual([]);
    expect(finder.getComparison()).toEqual([]);
  });

  it('shows saved places only, and drops saved ids that vanish with new data', () => {
    const { root, finder } = mount();
    root.click('gl-save-0');
    root.fire('change', { id: 'gl-only-saved', checked: true });
    expect(names(root.list())).toEqual(['0']);
    finder.setPlaces([{ id: 'other', name: 'Other', claims: [] }]);
    expect(finder.getSaved()).toEqual([]);
  });

  it('adds one page at a time with "Show more" and moves focus to the first new place', () => {
    const { root } = mount({}, many);
    expect(names(root.innerHTML)).toHaveLength(25);
    root.click('gl-more');
    expect(names(root.list())).toHaveLength(50);
    expect(root.querySelector('#gl-cmp-25').focused).toBe(1);
    root.click('gl-more');
    expect(names(root.list())).toHaveLength(60);
    expect(root.list()).not.toContain('gl-more');
    expect(root.count()).toBe('60 places shown');
  });

  it('goes back to the first page when a filter changes', () => {
    const { root } = mount({}, many);
    root.click('gl-more');
    root.fire('input', { id: 'gl-pq', value: 'Place' });
    expect(names(root.list())).toHaveLength(25);
  });

  it('suggests a feature while typing and adds it with one click', () => {
    const { root, finder } = mount();
    root.fire('input', { id: 'gl-pq', value: 'lift' });
    expect(root.querySelector('[data-gl-suggest]').innerHTML).toContain('gl-sg-elevator');
    root.click('gl-sg-elevator');
    expect(finder.getState().features).toEqual(['elevator']);
    expect(root.querySelector('#gl-f-elevator').checked).toBe(true);
    expect(root.querySelector('[data-gl-suggest]').innerHTML).not.toContain('gl-sg-elevator');
  });

  it('ignores a suggestion id that is not a glossary term', () => {
    const { root, finder } = mount();
    root.click('gl-sg-teleporter');
    expect(finder.getState().features).toEqual([]);
  });

  it('clear resets the view, saved filter, sort, selection and form controls but keeps saved places', () => {
    const store = new Mem();
    const { root, finder } = mount({ store });
    root.fire('change', { id: 'gl-sort', value: 'name' });
    root.fire('change', { id: 'gl-recent', checked: true });
    root.click('gl-save-0');
    root.click('gl-cmp-0');
    root.click('gl-clear');
    expect(finder.getView()).toEqual({ sort: 'best', recentOnly: false, savedOnly: false });
    expect(finder.getComparison()).toEqual([]);
    expect(finder.getSaved()).toEqual(['lib']);
    expect(root.querySelector('#gl-recent').checked).toBe(false);
    expect(root.querySelector('#gl-sort').value).toBe('best');
    expect(store.getItem(FINDER_STORE_KEY)).toBeTruthy();
  });

  it('exports saved places and the comparison through onExport only', () => {
    const files: ExportFile[] = [];
    const { root } = mount({ onExport: (f) => files.push(f) });
    root.click('gl-save-0');
    root.click('gl-export-saved');
    root.click('gl-cmp-0');
    root.click('gl-cmp-1');
    root.click('gl-copy-compare');
    expect(files.map((f) => f.filename)).toEqual(['saved-places-en.txt', 'comparison-en.txt']);
    expect(files[0]?.text).toContain('- Library');
    expect(files[1]?.text).toContain('Library');
    expect(files[1]?.text).toContain('Café Nord');
  });

  it('shows no export buttons and exports nothing without onExport', () => {
    const { root } = mount();
    expect(root.innerHTML).not.toContain('gl-export-saved');
    root.click('gl-export-saved');
    root.click('gl-copy-compare');
  });

  it('does not export a comparison until two places are chosen', () => {
    const files: ExportFile[] = [];
    const { root } = mount({ onExport: (f) => files.push(f) });
    root.click('gl-cmp-0');
    root.click('gl-copy-compare');
    expect(files).toEqual([]);
  });

  it('shows the display panel only when styles can be applied, and applies saved settings at the start', () => {
    expect(mount().root.innerHTML).not.toContain('gl-pref-size');
    const css: string[] = [];
    const store = new Mem();
    store.setItem(PREFS_STORE_KEY, JSON.stringify({ textScale: 150, wideSpacing: false, highContrast: false, reduceMotion: false }));
    const { root, finder } = mount({ applyStyles: (c) => css.push(c), store });
    expect(root.innerHTML).toContain('gl-pref-size');
    expect(finder.getPrefs().textScale).toBe(150);
    expect(css[0]).toContain('font-size: 150%');
  });

  it('changes display settings, saves them and resets the controls', () => {
    const css: string[] = [];
    const store = new Mem();
    const { root, finder } = mount({ applyStyles: (c) => css.push(c), store });
    root.fire('change', { id: 'gl-pref-contrast', checked: true });
    root.fire('change', { id: 'gl-pref-size', value: '200' });
    expect(finder.getPrefs()).toMatchObject({ highContrast: true, textScale: 200 });
    expect(css.at(-1)).toContain('outline: 4px solid #000');
    expect(store.getItem(PREFS_STORE_KEY)).toContain('"textScale":200');
    root.click('gl-pref-reset');
    expect(finder.getPrefs()).toMatchObject({ highContrast: false, textScale: 100 });
    expect(root.querySelector('#gl-pref-contrast').checked).toBe(false);
    expect(root.querySelector('#gl-pref-size').value).toBe('100');
    expect(root.querySelector('#gl-pref-reset').focused).toBe(1);
    expect(css.at(-1)).toBe('');
  });

  it('follows the system reduce-motion setting when nothing is saved', () => {
    const { finder } = mount({ applyStyles: () => undefined, systemReducedMotion: () => true });
    expect(finder.getPrefs().reduceMotion).toBe(true);
  });

  it('ignores display events when display settings are off', () => {
    const { root, finder } = mount();
    root.fire('change', { id: 'gl-pref-contrast', checked: true });
    expect(finder.getPrefs().highContrast).toBe(false);
  });

  it('keeps working when storage throws', () => {
    const broken: IndexStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
    };
    const { root, finder } = mount({ store: broken });
    root.click('gl-save-0');
    root.fire('change', { id: 'gl-sort', value: 'name' });
    expect(finder.getSaved()).toEqual(['lib']);
    expect(finder.getView().sort).toBe('name');
  });

  it('keeps unknown as Unknown in the list for places with no claims', () => {
    const { root } = mount();
    const card = root.innerHTML.slice(root.innerHTML.indexOf('Armoury'));
    expect(card).toContain('Unknown');
    expect(root.innerHTML).not.toMatch(/is accessible|fully accessible/i);
  });
});
