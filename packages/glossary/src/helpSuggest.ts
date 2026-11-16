import { HELP_TOPICS, type HelpTopic } from './helpCopy';
import { fixFrench } from './frTypography';
import { lookupTerm } from './glossary';
import { wordList, withoutRefs } from './readability';
import { fold, tokenise } from './text';
import type { Lang } from './plainTerms';

/**
 * "Did you mean" for a help search that finds nothing. It only offers words that already appear in the help
 * (titles and text, as a reader sees them), so a suggestion always finds a topic. It never guesses about places.
 */
export const SUGGEST_UI = {
  en: { didYouMean: (words: string): string => `Did you mean: ${words}?` },
  fr: { didYouMean: (words: string): string => fixFrench(`Vouliez-vous dire : ${words} ?`) },
} as const;

/** Shortest words are not corrected: too many words are one letter away from them. */
export const MIN_WORD_TO_CORRECT = 4;

/** Edit distance (insert, delete, replace, swap of neighbours), stopping early past `limit`. Returns limit + 1 when over. */
export function editDistance(a: string, b: string, limit = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let prev2: number[] = [];
  let prev: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const row: number[] = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min((prev[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) best = Math.min(best, (prev2[j - 2] ?? 0) + 1);
      row.push(best);
    }
    if (Math.min(...row) > limit) return limit + 1;
    prev2 = prev;
    prev = row;
  }
  return Math.min(prev[b.length] ?? limit + 1, limit + 1);
}

/** How many letters may differ for a word of this length. */
export function allowedDistance(length: number): number {
  return length <= 5 ? 1 : 2;
}

/** Every word a reader can see in the help, once, keyed by its folded form, in the order first seen. */
export function helpVocabulary(lang: Lang, topics: readonly HelpTopic[] = HELP_TOPICS): ReadonlyMap<string, string> {
  const vocab = new Map<string, string>();
  const nameFor = (id: string): string | undefined => {
    const t = lookupTerm(id, lang);
    return t.known ? t.term : undefined;
  };
  for (const topic of topics) {
    for (const text of [topic.title[lang], ...topic.body[lang].map((p) => withoutRefs(p, nameFor))]) {
      for (const word of wordList(text)) {
        const key = fold(word);
        if (key.length >= MIN_WORD_TO_CORRECT && !vocab.has(key)) vocab.set(key, word.toLowerCase());
      }
    }
  }
  return vocab;
}

function matchesVocabulary(token: string, vocab: ReadonlyMap<string, string>): boolean {
  for (const key of vocab.keys()) if (key === token || (token.length >= 3 && key.startsWith(token))) return true;
  return false;
}

/** The nearest help word to one typed word, or null when none is close enough. Ties go to the word seen first. */
export function nearestWord(token: string, vocab: ReadonlyMap<string, string>): string | null {
  const limit = allowedDistance(token.length);
  let best: { word: string; distance: number } | null = null;
  for (const [key, word] of vocab) {
    const distance = editDistance(token, key, limit);
    if (distance <= limit && (best === null || distance < best.distance)) best = { word, distance };
  }
  return best === null ? null : best.word;
}

/**
 * The search with misspelled words put right, or null when there is nothing to offer: every word already
 * matches, a word is too short or too far from anything, or the search is empty.
 */
export function didYouMean(query: string, lang: Lang, topics: readonly HelpTopic[] = HELP_TOPICS): string | null {
  const tokens = tokenise(query);
  if (tokens.length === 0) return null;
  const vocab = helpVocabulary(lang, topics);
  let changed = false;
  const fixed: string[] = [];
  for (const token of tokens) {
    if (matchesVocabulary(token, vocab)) {
      fixed.push(token);
      continue;
    }
    const near = token.length >= MIN_WORD_TO_CORRECT ? nearestWord(token, vocab) : null;
    if (near === null) return null;
    fixed.push(near);
    changed = true;
  }
  return changed ? fixed.join(' ') : null;
}

/** The sentence to show under an empty search, or null. */
export function suggestionText(query: string, lang: Lang): string | null {
  const fixed = didYouMean(query, lang);
  return fixed === null ? null : SUGGEST_UI[lang].didYouMean(fixed);
}
