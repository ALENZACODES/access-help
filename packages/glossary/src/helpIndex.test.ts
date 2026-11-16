import { describe, expect, it } from 'vitest';
import {
  BODY_EXACT,
  BODY_PREFIX,
  HELP_TOPICS,
  SNIPPET_LENGTH,
  TITLE_EXACT,
  TITLE_PREFIX,
  markMatches,
  piecesText,
  queryWords,
  rankHelp,
  sameSearch,
  searchHelp,
  truncate,
  type HelpTopic,
  type Lang,
} from './index';

const topic = (id: string, title: string, body: string[]): HelpTopic => ({
  id,
  kind: 'topic' as HelpTopic['kind'],
  title: { en: title, fr: title },
  body: { en: body, fr: body },
});

describe('queryWords', () => {
  it('splits, folds and drops punctuation', () => {
    expect(queryWords('  Étapes,   RAMP! ')).toEqual(queryWords('étapes ramp'));
    expect(queryWords('')).toEqual([]);
  });
});

describe('markMatches', () => {
  it('returns the text unmarked when nothing was typed', () => {
    expect(markMatches('A ramp.', [])).toEqual([{ text: 'A ramp.', match: false }]);
    expect(markMatches('', ['ramp'])).toEqual([]);
  });
  it('marks whole words and prefixes of three or more letters', () => {
    const pieces = markMatches('Ask about ramps or a ramp.', ['ramp']);
    expect(pieces.filter((p) => p.match).map((p) => p.text)).toEqual(['ramps', 'ramp']);
  });
  it('keeps the text intact', () => {
    const text = 'A step-free entrance, or a ramp.';
    expect(piecesText(markMatches(text, ['ramp', 'step']))).toBe(text);
  });
  it('ignores accents and case', () => {
    const pieces = markMatches('Entrée sans marche', queryWords('ENTREE'));
    expect(pieces.find((p) => p.match)?.text).toBe('Entrée');
  });
  it('does not mark one or two letter words as prefixes', () => {
    expect(markMatches('a ramp', ['a']).some((p) => p.match && p.text !== 'a')).toBe(false);
  });
  it('merges neighbouring pieces of the same kind', () => {
    const pieces = markMatches('one two three', ['zzz']);
    expect(pieces).toEqual([{ text: 'one two three', match: false }]);
  });
  it('marks parts of a hyphenated word', () => {
    const pieces = markMatches('step-free', ['free']);
    expect(pieces.some((p) => p.match)).toBe(true);
    expect(piecesText(pieces)).toBe('step-free');
  });
});

describe('truncate', () => {
  it('leaves short text alone', () => {
    expect(truncate('short', 20)).toBe('short');
  });
  it('cuts at a word and adds an ellipsis', () => {
    const out = truncate('one two three four five six', 15);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(16);
    expect(out).not.toMatch(/\s…$/);
  });
  it('cuts a very long word without a space', () => {
    expect(truncate('x'.repeat(50), 10)).toBe('x'.repeat(10) + '…');
  });
  it('drops trailing punctuation before the ellipsis', () => {
    expect(truncate('alpha beta, gamma delta', 12)).toBe('alpha beta…');
  });
});

describe('rankHelp: scoring', () => {
  const topics = [
    topic('body', 'Other title', ['You can ask about a ramp here.']),
    topic('title', 'Ramp basics', ['Nothing else.']),
    topic('prefix', 'Ramps and slopes', ['Nothing else.']),
    topic('bodyprefix', 'Another', ['Several ramps exist.']),
  ];
  it('scores title above body and exact above prefix', () => {
    const hits = rankHelp('ramp', 'en', topics);
    const byId = Object.fromEntries(hits.map((h) => [h.topic.id, h.score]));
    expect(byId).toEqual({ title: TITLE_EXACT, prefix: TITLE_PREFIX, body: BODY_EXACT, bodyprefix: BODY_PREFIX });
    expect(hits.map((h) => h.topic.id)).toEqual(['title', 'prefix', 'body', 'bodyprefix']);
  });
  it('adds up the words and needs all of them', () => {
    const hits = rankHelp('ramp basics', 'en', topics);
    expect(hits.map((h) => h.topic.id)).toEqual(['title']);
    expect(hits[0]?.score).toBe(TITLE_EXACT * 2);
  });
  it('keeps written order for equal scores', () => {
    const same = [topic('x', 'Door', ['a']), topic('y', 'Door', ['b']), topic('z', 'Door', ['c'])];
    expect(rankHelp('door', 'en', same).map((h) => h.topic.id)).toEqual(['x', 'y', 'z']);
  });
  it('returns every topic, in order, for an empty search', () => {
    const hits = rankHelp('   ', 'en', topics);
    expect(hits.map((h) => h.topic.id)).toEqual(['body', 'title', 'prefix', 'bodyprefix']);
    expect(hits.every((h) => h.score === 0)).toBe(true);
  });
  it('returns nothing when no topic matches', () => {
    expect(rankHelp('zzzz', 'en', topics)).toEqual([]);
  });
  it('ignores the words inside reference markup ids', () => {
    const t = [topic('r', 'Features', ['See [[ramp|the list]].'])];
    expect(rankHelp('ramp', 'en', t)).toEqual([]);
    expect(rankHelp('list', 'en', t).length).toBe(1);
  });
});

describe('rankHelp: marks and snippets', () => {
  it('marks the title', () => {
    const [hit] = rankHelp('ramp', 'en', [topic('t', 'About the Ramp', ['x'])]);
    expect(hit?.title.find((p) => p.match)?.text).toBe('Ramp');
    expect(piecesText(hit?.title ?? [])).toBe('About the Ramp');
  });
  it('uses the first matching paragraph for the snippet', () => {
    const [hit] = rankHelp('elevator', 'en', [topic('t', 'T', ['First paragraph.', 'Ask about the elevator.'])]);
    expect(piecesText(hit?.snippet ?? [])).toBe('Ask about the elevator.');
  });
  it('uses the first paragraph when the match is in the title', () => {
    const [hit] = rankHelp('door', 'en', [topic('t', 'Door', ['First paragraph.', 'Second.'])]);
    expect(piecesText(hit?.snippet ?? [])).toBe('First paragraph.');
  });
  it('cuts a long snippet', () => {
    const long = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ');
    const [hit] = rankHelp('word3', 'en', [topic('t', 'T', [long])]);
    expect(piecesText(hit?.snippet ?? []).length).toBeLessThanOrEqual(SNIPPET_LENGTH + 1);
  });
  it('strips reference markup from the snippet', () => {
    const [hit] = rankHelp('', 'en', [topic('t', 'T', ['Check the [[ramp|ramp]] first.'])]);
    expect(piecesText(hit?.snippet ?? [])).toBe('Check the ramp first.');
  });
});

describe('rankHelp: the shipped topics', () => {
  it.each(['en', 'fr'] as Lang[])('matches the same topics as searchHelp in %s', (lang) => {
    for (const q of ['', 'ramp', 'rampe', 'age', 'source', 'sources', 'hors ligne', 'offline', 'zzz', 'a', 'unknown', 'inconnu']) {
      expect(rankHelp(q, lang).map((h) => h.topic.id).sort(), q).toEqual(searchHelp(q, lang).map((t) => t.id).sort());
    }
  });
  it('lists every topic for an empty search', () => {
    expect(rankHelp('', 'en').length).toBe(HELP_TOPICS.length);
  });
  it('is stable: the same search gives the same order', () => {
    expect(rankHelp('place', 'en').map((h) => h.topic.id)).toEqual(rankHelp('place', 'en').map((h) => h.topic.id));
  });
  it('never scores below the smallest match weight', () => {
    for (const h of rankHelp('place', 'en')) expect(h.score).toBeGreaterThanOrEqual(BODY_PREFIX);
  });
});

describe('sameSearch', () => {
  it('ignores case, accents, spacing and punctuation', () => {
    expect(sameSearch('Entrée', ' entree ')).toBe(true);
    expect(sameSearch('ramp  step', 'ramp, step')).toBe(true);
  });
  it('tells different searches apart', () => {
    expect(sameSearch('ramp', 'ramps')).toBe(false);
    expect(sameSearch('', 'x')).toBe(false);
    expect(sameSearch('', '  ')).toBe(true);
  });
});
