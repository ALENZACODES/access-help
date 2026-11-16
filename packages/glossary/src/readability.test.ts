import { describe, expect, it } from 'vitest';
import {
  HELP_TOPICS,
  LIST_COMMAS,
  MIN_WORDS_TO_SCORE,
  PLAIN_SWAPS,
  PLAIN_TERMS,
  countSyllables,
  longWordRun,
  plainSwaps,
  readabilityIssues,
  readabilityScore,
  readabilityStats,
  readingLevel,
  wordList,
  withoutRefs,
  type Lang,
} from './index';

describe('countSyllables', () => {
  it.each([
    ['door', 1],
    ['ramp', 1],
    ['elevator', 4],
    ['entrance', 2],
    ['accessible', 4],
    ['the', 1],
    ['make', 1],
    ['table', 2],
  ])('English %s has %i', (w, n) => expect(countSyllables(w, 'en')).toBe(n));
  it.each([
    ['porte', 1],
    ['rampe', 1],
    ['ascenseur', 3],
    ['entrée', 2],
  ])('French %s has %i', (w, n) => expect(countSyllables(w, 'fr')).toBe(n));
  it('is zero for a word with no letters and at least one otherwise', () => {
    expect(countSyllables('123', 'en')).toBe(0);
    expect(countSyllables('', 'fr')).toBe(0);
    expect(countSyllables('hmm', 'en')).toBe(1);
  });
});

describe('wordList and withoutRefs', () => {
  it('splits on spaces and punctuation, keeping apostrophes inside words', () => {
    expect(wordList("A ramp isn't steep, is it?")).toEqual(['A', 'ramp', "isn't", 'steep', 'is', 'it']);
  });
  it('is empty for nothing', () => {
    expect(wordList('')).toEqual([]);
    expect(wordList(' ... ')).toEqual([]);
  });
  it('keeps the label of a [[id|label]] reference', () => {
    expect(withoutRefs('Use a [[ramp|ramp]] here.')).toBe('Use a ramp here.');
  });
  it('shows the id as words when there is no label and no name', () => {
    expect(withoutRefs('See [[grab-bar]].')).toBe('See grab bar.');
  });
  it('shows the name a lookup gives when there is no label', () => {
    expect(withoutRefs('See [[grab-bar]].', () => 'Grab bar')).toBe('See Grab bar.');
    expect(withoutRefs('See [[x]].', () => undefined)).toBe('See x.');
  });
  it('prefers the written label over the lookup', () => {
    expect(withoutRefs('See [[grab-bar|the bar]].', () => 'Grab bar')).toBe('See the bar.');
  });
  it('leaves text without references alone', () => {
    expect(withoutRefs('plain [text]')).toBe('plain [text]');
  });
});

describe('readabilityStats', () => {
  it('counts sentences, words and syllables', () => {
    const s = readabilityStats('The door is wide. The ramp is flat.', 'en');
    expect(s.sentences).toBe(2);
    expect(s.words).toBe(8);
    expect(s.wordsPerSentence).toBe(4);
    expect(s.longWords).toBe(0);
  });
  it('is zero-safe on empty text', () => {
    const s = readabilityStats('', 'en');
    expect(s.words).toBe(0);
    expect(s.wordsPerSentence).toBe(0);
    expect(s.syllablesPerWord).toBe(0);
  });
  it('ignores reference markup', () => {
    expect(readabilityStats('See [[ramp|ramp]].', 'en').words).toBe(2);
  });
});

describe('readabilityScore and readingLevel', () => {
  it('is null for empty text', () => {
    expect(readabilityScore('', 'en')).toBeNull();
    expect(readabilityScore('', 'fr')).toBeNull();
  });
  it('scores short plain English as easy', () => {
    const score = readabilityScore('The door is wide. The ramp is flat. You can roll in. It is not steep.', 'en');
    expect(score).not.toBeNull();
    expect(readingLevel(score!, 'en')).toBe('easy');
  });
  it('scores long, heavy English as hard', () => {
    const text = 'Notwithstanding considerable organisational difficulties, administrative representatives established comprehensive accommodation arrangements throughout municipal infrastructure.';
    expect(readingLevel(readabilityScore(text, 'en')!, 'en')).toBe('hard');
  });
  it('has English cut-offs at 8 and 10', () => {
    expect(readingLevel(8, 'en')).toBe('easy');
    expect(readingLevel(8.1, 'en')).toBe('fair');
    expect(readingLevel(10, 'en')).toBe('fair');
    expect(readingLevel(10.1, 'en')).toBe('hard');
  });
  it('has French cut-offs at 50 and 35 (higher is easier)', () => {
    expect(readingLevel(50, 'fr')).toBe('easy');
    expect(readingLevel(49.9, 'fr')).toBe('fair');
    expect(readingLevel(35, 'fr')).toBe('fair');
    expect(readingLevel(34.9, 'fr')).toBe('hard');
  });
  it('scores French', () => {
    const score = readabilityScore('La porte est large. La rampe est plate. Vous pouvez entrer.', 'fr');
    expect(score).not.toBeNull();
    expect(readingLevel(score!, 'fr')).not.toBe('hard');
  });
});

describe('plainSwaps', () => {
  it('finds whole words and phrases, ignoring case', () => {
    expect(plainSwaps('Please Utilize the ramp prior to entry.', 'en').map((s) => s.found).sort()).toEqual(['prior to', 'utilize']);
  });
  it('does not match inside another word', () => {
    expect(plainSwaps('The additionally placed signs', 'en')).toEqual([]);
    expect(plainSwaps('Locations are listed', 'en')).toEqual([]);
  });
  it('ignores accents in French', () => {
    expect(plainSwaps('Il faut effectuer la visite.', 'fr').map((s) => s.use)).toEqual(['faire']);
  });
  it('gives a different, shorter word for every entry', () => {
    for (const lang of ['en', 'fr'] as Lang[]) {
      for (const [phrase, use] of Object.entries(PLAIN_SWAPS[lang])) {
        expect(use.length).toBeLessThanOrEqual(phrase.length);
        expect(use).not.toBe(phrase);
      }
    }
  });
});

describe('longWordRun', () => {
  it('flags three long words in a row in English', () => {
    expect(longWordRun('Establishing administrative accommodation procedures', 'en')).toBe(true);
  });
  it('does not flag short words or a broken run', () => {
    expect(longWordRun('Establishing administrative is accommodation procedures', 'en')).toBe(false);
    expect(longWordRun('The door is wide', 'en')).toBe(false);
  });
  it('allows a longer run in French before flagging', () => {
    expect(longWordRun('établissement administratif accessibilité', 'fr')).toBe(false);
  });
  it('can be told how long a run to flag', () => {
    expect(longWordRun('Establishing administrative accommodation', 'en', 4)).toBe(false);
    expect(longWordRun('Establishing administrative', 'en', 2)).toBe(true);
  });
  it('does not count reference markup', () => {
    expect(longWordRun('[[accessible-washroom|accessible]] [[accessible-washroom|accommodation]]', 'en', 2)).toBe(true);
  });
});

describe('readabilityIssues', () => {
  it('is quiet about short plain copy', () => {
    expect(readabilityIssues('Ask the staff if there is a ramp.', 'en')).toEqual([]);
  });
  it('flags a hard long sentence', () => {
    const text = 'Notwithstanding considerable organisational difficulties, administrative representatives established comprehensive accommodation arrangements throughout municipal infrastructure.';
    expect(readabilityIssues(text, 'en').map((i) => i.rule)).toContain('hard-to-read');
  });
  it('does not score text shorter than the minimum', () => {
    expect(MIN_WORDS_TO_SCORE).toBeGreaterThan(5);
    expect(readabilityIssues('Notwithstanding organisational accommodation', 'en').map((i) => i.rule)).not.toContain('hard-to-read');
  });
  it('does not score a list of names', () => {
    expect(LIST_COMMAS).toBeGreaterThan(2);
    const list = 'Ramps, elevators, automatic doors, grab bars, accessible parking, accessible washrooms, step-free entrances';
    expect(readabilityIssues(list, 'en').map((i) => i.rule)).not.toContain('hard-to-read');
  });
  it('suggests the plainer word', () => {
    const issues = readabilityIssues('We utilize the front door.', 'en');
    expect(issues).toEqual([{ rule: 'plain-swap', detail: '"utilize": use "use"' }]);
  });
  it('flags a run of long words', () => {
    expect(readabilityIssues('Establishing administrative accommodation', 'en').map((i) => i.rule)).toContain('long-word-run');
  });
  it('has no issue in any shipped glossary text or help topic', () => {
    for (const lang of ['en', 'fr'] as Lang[]) {
      for (const t of PLAIN_TERMS) {
        for (const text of [t[lang].term, t[lang].plain]) expect(readabilityIssues(text, lang), `${t.id} ${lang}`).toEqual([]);
      }
      for (const h of HELP_TOPICS) {
        for (const text of [h.title[lang], ...h.body[lang]]) expect(readabilityIssues(text, lang), `${h.id} ${lang}`).toEqual([]);
      }
    }
  });
});
