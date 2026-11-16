import { escapeHtml, fold, tokenise } from './text';

/**
 * Marks the part of a place name that the typed words match, so a person can see why a place is in the list.
 * It follows the same rule as the search: each typed word must start a word in the name, and accents and case
 * are ignored. The mark is shown with weight and an underline as well as colour (see FINDER_CSS).
 */
export const MAX_MARKS = 12;

interface Folded {
  readonly text: string;
  /** For each character of `text`, the index of the character of the name it came from. */
  readonly from: readonly number[];
}

/** The name folded the way the search folds it, remembering which original character each piece came from. */
function foldWithMap(name: string): Folded {
  let text = '';
  const from: number[] = [];
  const chars = Array.from(name);
  chars.forEach((ch, i) => {
    const f = fold(ch);
    for (let k = 0; k < f.length; k++) from.push(i);
    text += f;
  });
  return { text, from };
}

/** Indexes (into the characters of the name) that should be marked. Empty when the name does not match. */
export function markedIndexes(name: string, query: string): ReadonlySet<number> {
  const wanted = tokenise(query);
  const marked = new Set<number>();
  if (wanted.length === 0) return marked;
  const { text, from } = foldWithMap(name);
  const words = [...text.matchAll(/[a-z0-9]+/g)];
  // The name only matches when every typed word starts some word. Otherwise nothing is marked.
  if (!wanted.every((q) => words.some((w) => w[0].startsWith(q)))) return marked;
  const longestFirst = [...wanted].sort((a, b) => b.length - a.length);
  let count = 0;
  for (const w of words) {
    const q = longestFirst.find((t) => w[0].startsWith(t));
    if (q === undefined || w.index === undefined) continue;
    if (++count > MAX_MARKS) break;
    for (let i = w.index; i < w.index + q.length; i++) {
      const original = from[i];
      if (original !== undefined) marked.add(original);
    }
  }
  return marked;
}

/** The name as safe HTML with matching parts in <mark>. Without a match the name is just escaped. */
export function highlightName(name: string, query: string): string {
  const marked = markedIndexes(name, query);
  if (marked.size === 0) return escapeHtml(name);
  const chars = Array.from(name);
  let out = '';
  let open = false;
  let prev = false;
  chars.forEach((ch, i) => {
    // A combining accent that follows a marked letter belongs to it.
    const on = marked.has(i) || (prev && fold(ch) === '');
    prev = on;
    if (on && !open) out += '<mark>';
    if (!on && open) out += '</mark>';
    open = on;
    out += escapeHtml(ch);
  });
  return open ? `${out}</mark>` : out;
}
