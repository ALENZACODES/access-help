import { describe, expect, it } from 'vitest';
import {
  EMPTY_STATE,
  FINDER_CSS,
  MAX_MARKS,
  auditHtml,
  findPlaces,
  highlightName,
  markedIndexes,
  matchesQuery,
  renderPlaceCard,
  resultsView,
  type Place,
} from './index';

describe('highlightName', () => {
  it('marks the start of the word that was typed', () => {
    expect(highlightName('Library', 'lib')).toBe('<mark>Lib</mark>rary');
  });
  it('marks in every word that matches', () => {
    expect(highlightName('Public Library', 'pu li')).toBe('<mark>Pu</mark>blic <mark>Li</mark>brary');
  });
  it('marks the whole name when it is typed in full', () => {
    expect(highlightName('Pool', 'pool')).toBe('<mark>Pool</mark>');
  });
  it('ignores case and accents in the match but keeps the name as written', () => {
    expect(highlightName('Café Nord', 'CAFE')).toBe('<mark>Café</mark> Nord');
    expect(highlightName('Cafe Nord', 'café')).toBe('<mark>Cafe</mark> Nord');
  });
  it('keeps a combining accent with its letter', () => {
    expect(highlightName('Café Nord', 'cafe')).toBe('<mark>Café</mark> Nord');
  });
  it('marks nothing when the typed words do not all match', () => {
    expect(highlightName('Public Library', 'pu zz')).toBe('Public Library');
    expect(highlightName('Library', 'brary')).toBe('Library');
  });
  it('marks nothing for an empty or symbol-only search', () => {
    for (const q of ['', '   ', '!!!']) expect(highlightName('Library', q), q).toBe('Library');
  });
  it('escapes everything', () => {
    expect(highlightName('<b>Lib</b> & Co', 'lib')).toBe('&lt;b&gt;<mark>Lib</mark>&lt;/b&gt; &amp; Co');
    expect(highlightName('<script>', 'x')).toBe('&lt;script&gt;');
  });
  it('uses the longer of two words that start the same way', () => {
    expect(highlightName('Library', 'l lib')).toBe('<mark>Lib</mark>rary');
  });
  it('is limited in how many words it marks', () => {
    const name = Array.from({ length: MAX_MARKS + 5 }, () => 'ab').join(' ');
    expect((highlightName(name, 'a').match(/<mark>/g) ?? []).length).toBe(MAX_MARKS);
  });
  it('handles an empty name', () => {
    expect(highlightName('', 'a')).toBe('');
  });
  it('handles emoji and characters outside the basic plane', () => {
    expect(highlightName('\u{1F600} Lib', 'lib')).toBe('\u{1F600} <mark>Lib</mark>');
  });
  it('marks exactly the places the search finds', () => {
    const names = ['Library', 'Public Library', 'Café Nord', 'Pool', 'St. Mary’s Hall', 'Libra Spa'];
    for (const q of ['lib', 'pu li', 'cafe', 'mary', 'x', 'libra s', 'hall st']) {
      for (const name of names) expect(markedIndexes(name, q).size > 0, `${q} / ${name}`).toBe(matchesQuery(name, q));
    }
  });
});

describe('in the place card and the list', () => {
  const place: Place = { id: 'lib', name: 'Library', claims: [] };
  const match = findPlaces([place], EMPTY_STATE, 'en')[0];
  it('marks the name in the card', () => {
    if (match === undefined) throw new Error('no match');
    const html = renderPlaceCard(match, 'en', '2026-11-15', 0, 'lib');
    expect(html).toContain('<mark>Lib</mark>rary</h3>');
    expect(auditHtml(`<div lang="en">${html}</div>`, 'card')).toEqual([]);
  });
  it('does not mark without a search', () => {
    if (match === undefined) throw new Error('no match');
    expect(renderPlaceCard(match, 'en', '2026-11-15')).not.toContain('<mark>');
  });
  it('marks in the finder list from the typed words', () => {
    const view = resultsView([place], { ...EMPTY_STATE, query: 'li' }, 'en', '2026-11-15', []);
    expect(view.list).toContain('<mark>Li</mark>brary');
  });
  it('shows the mark with weight and underline, not only colour', () => {
    expect(FINDER_CSS).toMatch(/mark\s*\{[^}]*font-weight: 700[^}]*underline|mark\s*\{[^}]*underline[^}]*font-weight: 700/);
    expect(FINDER_CSS).toMatch(/mark\s*\{[^}]*background: transparent/);
  });
});
