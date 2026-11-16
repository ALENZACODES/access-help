import { describe, expect, it } from 'vitest';
import {
  MAX_NOTE_MATCHES,
  NOTESEARCH_INPUT_ID,
  NOTESEARCH_UI,
  SNIPPET_RADIUS,
  auditHtml,
  frenchIssues,
  lintClaims,
  lintCopy,
  noteHasWords,
  parseShowId,
  plainLanguageIssues,
  readabilityIssues,
  renderNoteMatches,
  renderNotesSearch,
  searchNotes,
  showId,
  snippetOf,
  type Lang,
  type Place,
} from './index';

const places: Place[] = [
  { id: 'a', name: 'Library', claims: [] },
  { id: 'b', name: 'Café Nord', claims: [] },
  { id: 'c', name: 'Pool', claims: [] },
];
const notes = { a: 'Ask about the side door. Staff were kind.', b: 'Café has a quiet corner, ask for the Ramp key', c: 'Closed Mondays' };

describe('noteHasWords', () => {
  it('needs every word', () => {
    expect(noteHasWords('Ask about the side door', 'side door')).toBe(true);
    expect(noteHasWords('Ask about the side door', 'side lift')).toBe(false);
  });
  it('ignores case and accents', () => {
    expect(noteHasWords('Café corner', 'CAFE')).toBe(true);
    expect(noteHasWords('Cafe corner', 'café')).toBe(true);
  });
  it('finds words inside words', () => {
    expect(noteHasWords('Closed Mondays', 'mon')).toBe(true);
  });
  it('finds nothing for an empty or symbol-only search', () => {
    for (const q of ['', '  ', '!!']) expect(noteHasWords('anything', q), q).toBe(false);
  });
});

describe('snippetOf', () => {
  it('returns a short note whole', () => {
    expect(snippetOf('Short note.', 'note')).toBe('Short note.');
  });
  it('tidies spaces and new lines', () => {
    expect(snippetOf('a\n\n  b', 'a')).toBe('a b');
  });
  it('cuts a long note around the match, with ellipses on the cut sides', () => {
    const note = `${'word '.repeat(40)}needle ${'word '.repeat(40)}`;
    const s = snippetOf(note, 'needle');
    expect(s).toContain('needle');
    expect(s.startsWith('\u2026')).toBe(true);
    expect(s.endsWith('\u2026')).toBe(true);
    expect(Array.from(s).length).toBeLessThanOrEqual(SNIPPET_RADIUS * 2 + 4);
  });
  it('has no ellipsis at the start when the match is near it', () => {
    const s = snippetOf(`needle ${'word '.repeat(60)}`, 'needle');
    expect(s.startsWith('needle')).toBe(true);
    expect(s.endsWith('\u2026')).toBe(true);
  });
  it('has no ellipsis at the end when the match is near it', () => {
    const s = snippetOf(`${'word '.repeat(60)}needle`, 'needle');
    expect(s.endsWith('needle')).toBe(true);
    expect(s.startsWith('\u2026')).toBe(true);
  });
  it('does not cut in the middle of a word', () => {
    const s = snippetOf(`${'abcdefgh '.repeat(30)}needle ${'abcdefgh '.repeat(30)}`, 'needle').replace(/\u2026/g, '').trim();
    for (const w of s.split(' ')) expect(['abcdefgh', 'needle']).toContain(w);
  });
});

describe('searchNotes', () => {
  it('finds the places whose notes have all the words', () => {
    expect(searchNotes(notes, places, 'ask').map((m) => m.placeId)).toEqual(['a', 'b']);
    expect(searchNotes(notes, places, 'ask ramp').map((m) => m.placeId)).toEqual(['b']);
  });
  it('keeps the order of the places', () => {
    expect(searchNotes(notes, [...places].reverse(), 'ask').map((m) => m.placeId)).toEqual(['b', 'a']);
  });
  it('gives the name and a snippet', () => {
    expect(searchNotes(notes, places, 'closed')[0]).toEqual({ placeId: 'c', name: 'Pool', snippet: 'Closed Mondays' });
  });
  it('finds nothing for an empty search or a place with no note', () => {
    expect(searchNotes(notes, places, '')).toEqual([]);
    expect(searchNotes({}, places, 'ask')).toEqual([]);
  });
  it('ignores notes for places that are not loaded', () => {
    expect(searchNotes({ gone: 'ask me' }, places, 'ask')).toEqual([]);
  });
  it('is limited', () => {
    const many: Place[] = Array.from({ length: MAX_NOTE_MATCHES + 7 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, claims: [] }));
    const n = Object.fromEntries(many.map((p) => [p.id, 'ask']));
    expect(searchNotes(n, many, 'ask')).toHaveLength(MAX_NOTE_MATCHES);
  });
  it('is safe with prototype keys', () => {
    expect(searchNotes({}, [{ id: 'constructor', name: 'X', claims: [] }], 'x')).toEqual([]);
  });
});

describe('markup', () => {
  const matches = searchNotes(notes, places, 'ask');
  it.each(['en', 'fr'] as Lang[])('is valid in %s', (lang) => {
    for (const q of ['', 'ask', 'zzz']) {
      const html = renderNotesSearch(q, renderNoteMatches(searchNotes(notes, places, q), places, q, lang), lang);
      expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'notes')).toEqual([]);
    }
  });
  it('has a labelled search box with its hint', () => {
    const html = renderNotesSearch('x', '', 'en');
    expect(html).toContain(`<label for="${NOTESEARCH_INPUT_ID}">`);
    expect(html).toContain('aria-describedby="gl-nsq-hint"');
    expect(html).toContain('data-gl-nsr');
  });
  it('shows the prompt, the count, or the none message', () => {
    expect(renderNoteMatches([], places, '', 'en')).toContain(NOTESEARCH_UI.en.prompt);
    expect(renderNoteMatches([], places, 'zzz', 'en')).toContain(NOTESEARCH_UI.en.none);
    expect(renderNoteMatches(matches, places, 'ask', 'en')).toContain('2 places have notes with those words.');
    expect(renderNoteMatches(matches.slice(0, 1), places, 'ask', 'en')).toContain('1 place has a note with those words.');
  });
  it('has a button for each match that uses the place index', () => {
    const html = renderNoteMatches(matches, places, 'ask', 'en');
    expect(html).toContain('id="gl-nshow-0"');
    expect(html).toContain('id="gl-nshow-1"');
    expect(html).toContain('aria-label="Show Library in the list"');
  });
  it('escapes everything', () => {
    const m = [{ placeId: 'a', name: '<b>x</b>', snippet: '<i>y</i>' }];
    const html = renderNoteMatches(m, places, 'y', 'en');
    expect(html).not.toContain('<b>x');
    expect(html).not.toContain('<i>y');
    expect(renderNotesSearch('"><script>', '', 'en')).not.toContain('<script>');
  });
  it('round-trips ids', () => {
    expect(parseShowId(showId(7))).toBe(7);
    for (const id of ['', 'gl-nshow-', 'gl-nshow-x', 'gl-nsq']) expect(parseShowId(id)).toBeNull();
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = NOTESEARCH_UI[lang];
    for (const t of [ui.heading, ui.label, ui.hint, ui.none, ui.prompt, ui.count(1), ui.count(5), ui.show, ui.showLabel('Library')]) {
      expect(lintCopy(t), t).toEqual([]);
      expect(lintClaims(t), t).toEqual([]);
      expect(plainLanguageIssues(t), t).toEqual([]);
      expect(readabilityIssues(t, lang), t).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(t), t).toEqual([]);
    }
  });
});
