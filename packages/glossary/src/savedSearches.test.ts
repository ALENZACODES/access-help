import { describe, expect, it } from 'vitest';
import {
  EMPTY_STATE,
  MAX_SEARCHES,
  SEARCH_UI,
  auditHtml,
  deleteSearch,
  deleteSearchId,
  frenchIssues,
  insertSearch,
  lintClaims,
  lintCopy,
  parseDeleteSearchId,
  parseSearches,
  parseUseSearchId,
  plainLanguageIssues,
  readabilityIssues,
  renderSearchesPanel,
  saveSearch,
  searchErrorText,
  serialiseSearches,
  stateOf,
  useSearchId,
  type FinderState,
  type Lang,
  type SavedSearches,
} from './index';

const ramp: FinderState = { features: ['ramp'], query: '', hideNotAvailable: false };
const made = (...names: string[]): SavedSearches => {
  let out: SavedSearches = [];
  for (const n of names) {
    const r = saveSearch(out, n, ramp);
    if (!r.ok) throw new Error(r.error);
    out = r.searches;
  }
  return out;
};

describe('saveSearch', () => {
  it('keeps the choices under a cleaned name', () => {
    expect(saveSearch([], '  My   usual ', { features: ['ramp', 'elevator'], query: 'lib', hideNotAvailable: true })).toEqual({
      ok: true,
      searches: [{ name: 'My usual', state: { features: ['ramp', 'elevator'], query: 'lib', hideNotAvailable: true } }],
    });
  });
  it('refuses no name', () => {
    expect(saveSearch([], '  ', ramp)).toEqual({ ok: false, error: 'name' });
  });
  it('refuses choices that are empty, so there is something to keep', () => {
    expect(saveSearch([], 'x', EMPTY_STATE)).toEqual({ ok: false, error: 'nothing' });
    expect(saveSearch([], 'x', { features: [], query: '   ', hideNotAvailable: false })).toEqual({ ok: false, error: 'nothing' });
    expect(saveSearch([], 'x', { features: ['teleporter'], query: '', hideNotAvailable: false })).toEqual({ ok: false, error: 'nothing' });
  });
  it('refuses a repeated name, ignoring case and accents', () => {
    expect(saveSearch(made('Café'), 'CAFE', ramp)).toEqual({ ok: false, error: 'duplicate' });
  });
  it('refuses past the limit', () => {
    const full = made(...Array.from({ length: MAX_SEARCHES }, (_, i) => `S${i}`));
    expect(saveSearch(full, 'More', ramp)).toEqual({ ok: false, error: 'full' });
  });
  it('removes features that do not exist', () => {
    const r = saveSearch([], 'x', { features: ['ramp', 'teleporter'], query: '', hideNotAvailable: false });
    expect(r.ok && r.searches[0]?.state.features).toEqual(['ramp']);
  });
  it('does not share the state it was given', () => {
    const state: FinderState = { features: ['ramp'], query: 'a', hideNotAvailable: false };
    const r = saveSearch([], 'x', state);
    expect(r.ok && r.searches[0]?.state).not.toBe(state);
  });
});

describe('deleteSearch / insertSearch', () => {
  it('deletes by index and ignores a bad index', () => {
    expect(deleteSearch(made('A', 'B', 'C'), 1).map((s) => s.name)).toEqual(['A', 'C']);
    expect(deleteSearch(made('A'), 3)).toHaveLength(1);
  });
  it('puts a deleted search back where it was', () => {
    const all = made('A', 'B', 'C');
    const gone = all[1];
    if (gone === undefined) throw new Error('missing');
    expect(insertSearch(deleteSearch(all, 1), 1, gone)).toEqual(all);
  });
  it('refuses a repeated name or a full list', () => {
    const one = made('A');
    expect(insertSearch(one, 0, { name: 'a', state: ramp })).toBe(one);
    const full = made(...Array.from({ length: MAX_SEARCHES }, (_, i) => `S${i}`));
    expect(insertSearch(full, 0, { name: 'New', state: ramp })).toBe(full);
  });
  it('puts it at the end when the old place is past the end', () => {
    expect(insertSearch(made('A'), 9, { name: 'Z', state: ramp }).map((s) => s.name)).toEqual(['A', 'Z']);
  });
});

describe('storage', () => {
  it('round-trips', () => {
    const all = made('A', 'B');
    expect(parseSearches(serialiseSearches(all))).toEqual(all);
  });
  it('rejects text that is not a list', () => {
    for (const bad of ['', 'x', '{}', '5', 'null']) expect(parseSearches(bad), bad).toBeNull();
  });
  it('drops bad entries', () => {
    const raw = JSON.stringify([
      { name: 'Good', state: ramp },
      { name: 3, state: ramp },
      { name: 'No state' },
      { name: 'Bad state', state: { features: 'ramp', query: '', hideNotAvailable: false } },
      { name: 'Empty', state: EMPTY_STATE },
      null,
      'x',
      [],
    ]);
    expect(parseSearches(raw)?.map((s) => s.name)).toEqual(['Good']);
  });
  it('cleans features and drops repeats and extras', () => {
    const raw = JSON.stringify([
      { name: 'A', state: { features: ['ramp', 'teleporter', 7], query: '', hideNotAvailable: false } },
      { name: 'a', state: ramp },
      ...Array.from({ length: MAX_SEARCHES + 3 }, (_, i) => ({ name: `S${i}`, state: ramp })),
    ]);
    const out = parseSearches(raw) ?? [];
    expect(out[0]).toEqual({ name: 'A', state: ramp });
    expect(out).toHaveLength(MAX_SEARCHES);
  });
  it('is safe with prototype keys', () => {
    const out = parseSearches('[{"name":"__proto__","state":{"features":["ramp"],"query":"","hideNotAvailable":false}}]') ?? [];
    expect(out[0]?.name).toBe('__proto__');
    expect(({} as Record<string, unknown>).state).toBeUndefined();
  });
  it('stateOf gives a clean state even from a hand-edited search', () => {
    expect(stateOf({ name: 'x', state: { features: ['ramp', 'nope'], query: 'q'.repeat(500), hideNotAvailable: true } }).features).toEqual(['ramp']);
    expect(stateOf({ name: 'x', state: { features: [], query: 'q'.repeat(500), hideNotAvailable: true } }).query.length).toBeLessThan(500);
  });
});

describe('ids', () => {
  it('round-trips', () => {
    expect(parseUseSearchId(useSearchId(3))).toBe(3);
    expect(parseDeleteSearchId(deleteSearchId(6))).toBe(6);
  });
  it('rejects other ids', () => {
    for (const id of ['', 'gl-sus-', 'gl-sus-x', 'gl-sdel-', 'gl-save-1']) {
      expect(parseUseSearchId(id)).toBeNull();
      expect(parseDeleteSearchId(id)).toBeNull();
    }
  });
});

describe('the panel', () => {
  const searches = made('Ramp places');
  it.each(['en', 'fr'] as Lang[])('is valid markup in %s', (lang) => {
    for (const s of [searches, [] as SavedSearches]) {
      for (const message of ['', 'Done.']) expect(auditHtml(`<div lang="${lang}">${renderSearchesPanel({ lang, searches: s, message })}</div>`, 'searches')).toEqual([]);
    }
  });
  it('shows each search with what it chooses and two buttons', () => {
    const html = renderSearchesPanel({ lang: 'en', searches, message: '' });
    expect(html).toContain('<strong>Ramp places</strong>');
    expect(html).toContain('id="gl-sus-0"');
    expect(html).toContain('id="gl-sdel-0"');
    expect(html).toContain('Ramp');
  });
  it('labels the name box and names the search on each button', () => {
    const html = renderSearchesPanel({ lang: 'en', searches, message: '' });
    expect(html).toContain('<label for="gl-search-name">');
    expect(html).toContain('aria-label="Use the search Ramp places"');
    expect(html).toContain('aria-label="Delete the search Ramp places"');
  });
  it('escapes names and messages', () => {
    const html = renderSearchesPanel({ lang: 'en', searches: made('<b>x</b>'), message: '<i>' });
    expect(html).not.toContain('<b>x');
    expect(html).not.toContain('<i>');
  });
  it('says there are none', () => {
    expect(renderSearchesPanel({ lang: 'en', searches: [], message: '' })).toContain(SEARCH_UI.en.none);
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = SEARCH_UI[lang];
    const texts = [ui.heading, ui.intro, ui.nameLabel, ui.save, ui.none, ui.use, ui.delete, ui.useLabel('Ramp places'), ui.deleteLabel('Ramp places'), ...(['name', 'nothing', 'duplicate', 'full'] as const).map((e) => searchErrorText(e, lang))];
    for (const t of texts) {
      expect(lintCopy(t), t).toEqual([]);
      expect(lintClaims(t), t).toEqual([]);
      expect(plainLanguageIssues(t), t).toEqual([]);
      expect(readabilityIssues(t, lang), t).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(t), t).toEqual([]);
    }
  });
  it('has the same errors in both languages', () => {
    expect(Object.keys(SEARCH_UI.fr.errors)).toEqual(Object.keys(SEARCH_UI.en.errors));
  });
});
