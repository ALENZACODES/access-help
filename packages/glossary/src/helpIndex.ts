import { HELP_TOPICS, type HelpTopic } from './helpCopy';
import { fold, tokenise } from './text';
import type { Lang } from './plainTerms';
import { lookupTerm } from './glossary';
import { withoutRefs } from './readability';

/**
 * Ranked help search. A topic matches when every word typed matches a word in its title or text
 * (the same rule as searchHelp). Matches in the title count more than matches in the text.
 * Results come with pieces of text marked as matches, so a page can highlight them without building HTML.
 */
export interface Piece {
  readonly text: string;
  readonly match: boolean;
}

export interface HelpHit {
  readonly topic: HelpTopic;
  readonly score: number;
  readonly title: readonly Piece[];
  /** The first paragraph that matches (or the first paragraph when nothing was typed), cut to a short length. */
  readonly snippet: readonly Piece[];
}

export const TITLE_EXACT = 10;
export const TITLE_PREFIX = 6;
export const BODY_EXACT = 3;
export const BODY_PREFIX = 2;
export const SNIPPET_LENGTH = 140;

/** The words people type, as the search sees them. */
export function queryWords(query: string): readonly string[] {
  return tokenise(query);
}

/** Text as a reader sees it: a linked feature shows its name in this language. */
function shown(paragraph: string, lang: Lang): string {
  return withoutRefs(paragraph, (id) => {
    const t = lookupTerm(id, lang);
    return t.known ? t.term : undefined;
  });
}

function wordMatches(word: string, token: string): 'exact' | 'prefix' | null {
  if (token === word) return 'exact';
  return word.length >= 3 && token.startsWith(word) ? 'prefix' : null;
}

/** Splits text into pieces, marking words that match a typed word (accents and case ignored). */
export function markMatches(text: string, words: readonly string[]): readonly Piece[] {
  if (words.length === 0 || text === '') return text === '' ? [] : [{ text, match: false }];
  const out: Piece[] = [];
  let at = 0;
  const push = (t: string, match: boolean): void => {
    if (t === '') return;
    const last = out[out.length - 1];
    if (last !== undefined && last.match === match) out[out.length - 1] = { text: last.text + t, match };
    else out.push({ text: t, match });
  };
  for (const m of text.matchAll(/[\p{L}\p{N}]+/gu)) {
    const index = m.index ?? 0;
    // A word split by an apostrophe or hyphen is several search words, so each part is tested.
    const hit = tokenise(m[0]).some((tok) => words.some((w) => wordMatches(w, tok) !== null));
    push(text.slice(at, index), false);
    push(m[0], hit);
    at = index + m[0].length;
  }
  push(text.slice(at), false);
  return out;
}

function scoreTopic(topic: HelpTopic, lang: Lang, words: readonly string[]): number | null {
  const title = tokenise(topic.title[lang]);
  const body = tokenise(topic.body[lang].map((p) => shown(p, lang)).join(' '));
  let score = 0;
  for (const w of words) {
    const inTitle = title.map((t) => wordMatches(w, t));
    const inBody = body.map((t) => wordMatches(w, t));
    const best = inTitle.includes('exact') ? TITLE_EXACT : inTitle.includes('prefix') ? TITLE_PREFIX : inBody.includes('exact') ? BODY_EXACT : inBody.includes('prefix') ? BODY_PREFIX : 0;
    if (best === 0) return null;
    score += best;
  }
  return score;
}

/** Cuts text to about `max` characters at a word boundary, adding an ellipsis. Short text is returned as is. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/u, '')}…`;
}

function snippetFor(topic: HelpTopic, lang: Lang, words: readonly string[]): readonly Piece[] {
  const paragraphs = topic.body[lang].map((p) => shown(p, lang));
  const hit = paragraphs.find((p) => words.length > 0 && tokenise(p).some((t) => words.some((w) => wordMatches(w, t) !== null)));
  const chosen = truncate(hit ?? paragraphs[0] ?? '', SNIPPET_LENGTH);
  return markMatches(chosen, words);
}

/** Matching topics, best first. Equal scores keep the order the topics are written in. An empty search returns every topic. */
export function rankHelp(query: string, lang: Lang, topics: readonly HelpTopic[] = HELP_TOPICS): readonly HelpHit[] {
  const words = queryWords(query);
  const hits: { hit: HelpHit; order: number }[] = [];
  topics.forEach((topic, order) => {
    const score = words.length === 0 ? 0 : scoreTopic(topic, lang, words);
    if (score === null) return;
    hits.push({ order, hit: { topic, score, title: markMatches(topic.title[lang], words), snippet: snippetFor(topic, lang, words) } });
  });
  return hits.sort((a, b) => b.hit.score - a.hit.score || a.order - b.order).map((h) => h.hit);
}

/** What a screen reader hears for a highlighted title: the plain words, with no marks. */
export function piecesText(pieces: readonly Piece[]): string {
  return pieces.map((p) => p.text).join('');
}

/** True when two searches would match the same words. Used to avoid redrawing for a change that does not matter. */
export function sameSearch(a: string, b: string): boolean {
  return queryWords(a).map((w) => fold(w)).join(' ') === queryWords(b).map((w) => fold(w)).join(' ');
}
