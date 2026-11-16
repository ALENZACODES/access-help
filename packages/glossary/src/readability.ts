import { countWords, splitSentences } from './plainLanguage';
import { fold } from './text';
import type { Lang } from './plainTerms';

/**
 * Reading checks for plain-language copy, English and French, with no dictionary.
 * Scores are estimates: they point at copy to reread, they do not prove a text is easy.
 */
export interface ReadabilityStats {
  readonly sentences: number;
  readonly words: number;
  readonly syllables: number;
  /** Words with three or more syllables. */
  readonly longWords: number;
  readonly wordsPerSentence: number;
  readonly syllablesPerWord: number;
}

const VOWELS = /[aeiouyàâäéèêëîïôöùûüœæ]+/gu;

/** English: vowel groups, minus a silent final "e", at least one. */
function syllablesEn(word: string): number {
  const w = word.replace(/[^a-z]/g, '');
  if (w === '') return 0;
  let n = (w.match(/[aeiouy]+/g) ?? []).length;
  if (n > 1 && /(?:[^aeiou]e|[^aeiou]es|[^aeiou]ed)$/.test(w) && !/(?:le|ted|ded|ses|ces|ges|zes|xes)$/.test(w)) n -= 1;
  return Math.max(1, n);
}

/** French: vowel groups, minus a silent final "e", "es" or "ent" after a consonant, at least one. */
function syllablesFr(word: string): number {
  const w = word.toLowerCase().replace(/[^a-zàâäéèêëîïôöùûüœæ]/g, '');
  if (w === '') return 0;
  let n = (w.match(VOWELS) ?? []).length;
  if (n > 1 && /[^aeiouyàâäéèêëîïôöùûüœæ](?:e|es|ent)$/u.test(w)) n -= 1;
  return Math.max(1, n);
}

export function countSyllables(word: string, lang: Lang): number {
  return lang === 'fr' ? syllablesFr(word) : syllablesEn(fold(word));
}

/** Words as a reader counts them: letters with inner apostrophes and hyphens. */
export function wordList(text: string): readonly string[] {
  return text.match(/\p{L}+(?:[’'-]\p{L}+)*/gu) ?? [];
}

/** Help copy links terms as [[id]] or [[id|words]]. A reader sees the words, or the term name. */
export function withoutRefs(text: string, nameFor?: (id: string) => string | undefined): string {
  return text.replace(/\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/g, (_w, id: string, label: string | undefined) => (label ?? '').trim() || nameFor?.(id.trim()) || id.trim().replace(/-/g, ' '));
}

export function readabilityStats(textWithRefs: string, lang: Lang): ReadabilityStats {
  const text = withoutRefs(textWithRefs);
  const sentences = splitSentences(text).length;
  const words = wordList(text);
  const counts = words.flatMap((w) => (lang === 'fr' ? w.split(/[’'-]/) : [w])).map((w) => countSyllables(w, lang));
  const syllables = counts.reduce((a, b) => a + b, 0);
  const n = Math.max(1, words.length);
  return {
    sentences,
    words: words.length,
    syllables,
    longWords: counts.filter((c) => c >= 3).length,
    wordsPerSentence: sentences === 0 ? 0 : words.length / sentences,
    syllablesPerWord: syllables / n,
  };
}

/**
 * English: Flesch-Kincaid grade, lower is easier.
 * French: Kandel-Moles reading ease, higher is easier. Both are rounded to one decimal.
 */
export function readabilityScore(text: string, lang: Lang): number | null {
  const s = readabilityStats(text, lang);
  if (s.words === 0 || s.sentences === 0) return null;
  const score = lang === 'fr' ? 207 - 1.015 * s.wordsPerSentence - 73.6 * s.syllablesPerWord : 0.39 * s.wordsPerSentence + 11.8 * s.syllablesPerWord - 15.59;
  return Math.round(score * 10) / 10;
}

export type ReadingLevel = 'easy' | 'fair' | 'hard';

/**
 * English grade 8 or lower is easy and 10 or lower is fair.
 * French ease 50 or more is easy and 35 or more is fair: French words run longer, so the bar is lower than the usual 60.
 */
export function readingLevel(score: number, lang: Lang): ReadingLevel {
  if (lang === 'fr') return score >= 50 ? 'easy' : score >= 35 ? 'fair' : 'hard';
  return score <= 8 ? 'easy' : score <= 10 ? 'fair' : 'hard';
}

/** Texts shorter than this are not scored: the formulas need a few sentences' worth of words. */
export const MIN_WORDS_TO_SCORE = 12;

/** A line with this many commas is a list of names, not a sentence to score. */
export const LIST_COMMAS = 4;

/** Plainer words for ones that make copy harder to read. Matching is by whole word or phrase, accents and case ignored. */
export const PLAIN_SWAPS: Readonly<Record<Lang, Readonly<Record<string, string>>>> = {
  en: {
    utilize: 'use',
    utilise: 'use',
    commence: 'start',
    'prior to': 'before',
    'in order to': 'to',
    assistance: 'help',
    approximately: 'about',
    subsequently: 'then',
    additional: 'more',
    locate: 'find',
    obtain: 'get',
    regarding: 'about',
    individuals: 'people',
    facilitate: 'help',
    demonstrate: 'show',
    sufficient: 'enough',
    'a number of': 'some',
  },
  fr: {
    effectuer: 'faire',
    'afin de': 'pour',
    'procéder à': 'faire',
    néanmoins: 'mais',
    approximativement: 'environ',
    ultérieurement: 'plus tard',
    'à l’heure actuelle': 'maintenant',
    'un certain nombre de': 'plusieurs',
    individus: 'personnes',
    démontrer: 'montrer',
    suffisant: 'assez',
    'ayant trait à': 'sur',
  },
};

export type ReadabilityRule = 'hard-to-read' | 'plain-swap' | 'long-word-run';

export interface ReadabilityIssue {
  readonly rule: ReadabilityRule;
  readonly detail: string;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The plainer-word suggestions that apply to a text. */
export function plainSwaps(text: string, lang: Lang): readonly { readonly found: string; readonly use: string }[] {
  const hay = ` ${fold(text).replace(/[’']/g, '’')} `;
  const out: { found: string; use: string }[] = [];
  for (const [phrase, use] of Object.entries(PLAIN_SWAPS[lang])) {
    const needle = fold(phrase).replace(/[’']/g, '’');
    if (new RegExp(`(?<![\\p{L}])${escapeRe(needle)}(?![\\p{L}])`, 'u').test(hay)) out.push({ found: phrase, use });
  }
  return out;
}

/** Three or more long words in a row make a sentence heavy even when it is short. */
export function longWordRun(textWithRefs: string, lang: Lang, run: number = lang === 'fr' ? 4 : 3): boolean {
  let streak = 0;
  for (const w of wordList(withoutRefs(textWithRefs))) {
    for (const part of w.split(/[’'-]/)) {
      streak = countSyllables(part, lang) >= 3 ? streak + 1 : 0;
      if (streak >= run) return true;
    }
  }
  return false;
}

export function readabilityIssues(text: string, lang: Lang): readonly ReadabilityIssue[] {
  const out: ReadabilityIssue[] = [];
  const stats = readabilityStats(text, lang);
  const plain = withoutRefs(text);
  if (countWords(plain) >= MIN_WORDS_TO_SCORE && (plain.match(/,/g) ?? []).length < LIST_COMMAS) {
    const score = readabilityScore(plain, lang);
    if (score !== null && readingLevel(score, lang) === 'hard') {
      out.push({ rule: 'hard-to-read', detail: `${lang === 'fr' ? 'Kandel-Moles' : 'Flesch-Kincaid'} ${score} (${stats.wordsPerSentence.toFixed(1)} words a sentence)` });
    }
  }
  for (const s of plainSwaps(plain, lang)) out.push({ rule: 'plain-swap', detail: `"${s.found}": use "${s.use}"` });
  if (longWordRun(plain, lang)) out.push({ rule: 'long-word-run', detail: `${lang === 'fr' ? 'Four' : 'Three'} long words in a row.` });
  return out;
}
