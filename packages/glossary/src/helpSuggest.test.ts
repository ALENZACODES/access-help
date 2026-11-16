import { describe, expect, it } from 'vitest';
import {
  HELP_TOPICS,
  MIN_WORD_TO_CORRECT,
  SUGGEST_UI,
  allowedDistance,
  didYouMean,
  editDistance,
  frenchIssues,
  helpVocabulary,
  helpView,
  nearestWord,
  rankHelp,
  suggestionText,
  tokenise,
  type HelpTopic,
  type Lang,
} from './index';

const topic = (id: string, title: string, body: string[]): HelpTopic => ({
  id,
  kind: 'topic' as HelpTopic['kind'],
  title: { en: title, fr: title },
  body: { en: body, fr: body },
});
const sample = [topic('a', 'Elevator basics', ['Ask about the elevator and the ramp.']), topic('b', 'Parking', ['Accessible parking spaces vary.'])];
const all = new Set<string>();

describe('editDistance', () => {
  it.each([
    ['', '', 0],
    ['ramp', 'ramp', 0],
    ['ramp', 'rmp', 1],
    ['ramp', 'rampe', 1],
    ['ramp', 'remp', 1],
    ['ramp', 'rmap', 1],
    ['elevator', 'elevater', 1],
    ['elevator', 'elvator', 1],
    ['abc', 'xyz', 3],
  ])('%s to %s is %i', (a, b, n) => expect(editDistance(a, b)).toBe(n));
  it('is symmetric', () => {
    for (const [a, b] of [['parking', 'parkign'], ['door', 'doors'], ['entrance', 'entrence']] as const) expect(editDistance(a, b)).toBe(editDistance(b, a));
  });
  it('stops early past the limit', () => {
    expect(editDistance('abcdefgh', 'zzzzzzzz', 2)).toBe(3);
    expect(editDistance('a', 'abcdefg', 2)).toBe(3);
  });
});

describe('allowedDistance', () => {
  it('lets short words differ by one letter and longer words by two', () => {
    expect(allowedDistance(4)).toBe(1);
    expect(allowedDistance(5)).toBe(1);
    expect(allowedDistance(6)).toBe(2);
    expect(allowedDistance(12)).toBe(2);
  });
});

describe('helpVocabulary', () => {
  it('has each folded word once, with the way it is written', () => {
    const v = helpVocabulary('en', sample);
    expect(v.get('elevator')).toBe('elevator');
    expect(v.get('parking')).toBe('parking');
    expect([...v.keys()].length).toBe(new Set(v.keys()).size);
  });
  it('leaves out short words', () => {
    const v = helpVocabulary('en', sample);
    for (const key of v.keys()) expect(key.length).toBeGreaterThanOrEqual(MIN_WORD_TO_CORRECT);
    expect(v.has('and')).toBe(false);
  });
  it('keeps accents in what it offers', () => {
    const v = helpVocabulary('fr', [topic('x', 'Entrée sans marche', ['Une rampe aide.'])]);
    expect(v.get('entree')).toBe('entrée');
  });
  it('includes the names of linked features as a reader sees them', () => {
    const v = helpVocabulary('fr');
    expect(v.has('rampe')).toBe(true);
  });
  it('is the same every time', () => {
    expect([...helpVocabulary('en')]).toEqual([...helpVocabulary('en')]);
  });
});

describe('nearestWord', () => {
  const vocab = helpVocabulary('en', sample);
  it('finds the closest help word', () => {
    expect(nearestWord('elevater', vocab)).toBe('elevator');
    expect(nearestWord('parkign', vocab)).toBe('parking');
  });
  it('gives nothing for a word that is far from every help word', () => {
    expect(nearestWord('zebra', vocab)).toBeNull();
  });
  it('is stricter for short words', () => {
    expect(nearestWord('pxxk', vocab)).toBeNull();
  });
  it('prefers the nearer word, and the first seen on a tie', () => {
    const v = helpVocabulary('en', [topic('t', 'Doors dooms', ['x'])]);
    expect(nearestWord('doorz', v)).toBe('doors');
    expect(nearestWord('doorm', v)).toBe('doors');
  });
});

describe('didYouMean', () => {
  it('corrects one misspelled word', () => {
    expect(didYouMean('elevater', 'en', sample)).toBe('elevator');
  });
  it('corrects only the words that need it', () => {
    expect(didYouMean('ramp elevater', 'en', sample)).toBe('ramp elevator');
  });
  it('is null when every word already matches, even by prefix', () => {
    expect(didYouMean('elevator', 'en', sample)).toBeNull();
    expect(didYouMean('elev', 'en', sample)).toBeNull();
  });
  it('is null when a word has no near neighbour', () => {
    expect(didYouMean('zebra', 'en', sample)).toBeNull();
    expect(didYouMean('elevater zebra', 'en', sample)).toBeNull();
  });
  it('is null for an empty search, or one with only short words', () => {
    expect(didYouMean('', 'en', sample)).toBeNull();
    expect(didYouMean('  ', 'en', sample)).toBeNull();
    expect(didYouMean('xq', 'en', sample)).toBeNull();
  });
  it('ignores accents and case when typing', () => {
    expect(didYouMean('ENTREEE', 'fr', [topic('x', 'Entrée', ['a'])])).toBe('entrée');
  });
  it('always offers a search that finds something', () => {
    for (const lang of ['en', 'fr'] as Lang[]) {
      for (const q of ['elevater', 'rmp', 'sourcs', 'ofline', 'parkign', 'unknwon', 'langauge', 'rampee', 'inconnnu']) {
        const fixed = didYouMean(q, lang);
        if (fixed !== null) expect(rankHelp(fixed, lang).length, `${lang}: ${q} -> ${fixed}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('suggestionText', () => {
  it('says what to try, in English', () => {
    expect(suggestionText('sourcs', 'en')).toBe(SUGGEST_UI.en.didYouMean('source'));
  });
  it('is clean French', () => {
    const text = suggestionText('sourcs', 'fr');
    expect(text).not.toBeNull();
    expect(frenchIssues(text ?? '')).toEqual([]);
  });
  it('is null when there is nothing to offer', () => {
    expect(suggestionText('', 'en')).toBeNull();
    expect(suggestionText('zebra', 'en')).toBeNull();
  });
  it('has the same words in both languages for the template', () => {
    expect(Object.keys(SUGGEST_UI.en)).toEqual(Object.keys(SUGGEST_UI.fr));
  });
});

describe('helpView: suggestion', () => {
  it('offers a correction only when nothing matched', () => {
    const miss = helpView('sourcs', 'en', all);
    expect(miss.empty).toBe(true);
    expect(miss.suggestion).toBe('source');
    expect(miss.suggestionText).toBe(SUGGEST_UI.en.didYouMean('source'));
    const hit = helpView('sources', 'en', all);
    expect(hit.suggestion).toBeNull();
    expect(hit.suggestionText).toBeNull();
  });
  it('offers nothing for an empty search', () => {
    expect(helpView('', 'en', all).suggestion).toBeNull();
  });
  it('the suggestion, once searched, shows topics', () => {
    const miss = helpView('ofline', 'en', all);
    expect(miss.suggestion).not.toBeNull();
    expect(helpView(miss.suggestion ?? '', 'en', all).topics.length).toBeGreaterThan(0);
  });
  it('works for every topic title word', () => {
    for (const t of HELP_TOPICS) {
      const word = tokenise(t.title.en).find((w) => w.length >= 6);
      if (word === undefined) continue;
      const typo = word.slice(0, 2) + word.slice(3);
      const view = helpView(typo, 'en', all);
      if (view.empty && view.suggestion !== null) expect(helpView(view.suggestion, 'en', all).empty).toBe(false);
    }
  });
});
