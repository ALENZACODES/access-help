import { fixFrench } from './frTypography';
import type { ResolvedTerm } from './glossary';
import type { Lang } from './plainTerms';
import { escapeHtml, fold } from './text';

/**
 * An A to Z index for the term list. Letters come from the first letter of each term as a reader sees it,
 * accents ignored (so "Écran" is under E). A term that does not start with a letter goes under "#".
 * Only letters that have terms are listed, so every jump lands.
 */
export const INDEX_UI = {
  en: { label: 'Jump to a letter', jump: (letter: string, n: number): string => `${letter}, ${n === 1 ? '1 term' : `${n} terms`}`, other: '#' },
  fr: { label: 'Aller à une lettre', jump: (letter: string, n: number): string => `${letter}, ${n === 1 ? '1 terme' : `${n} termes`}`, other: '#' },
} as const;

export interface IndexGroup {
  readonly letter: string;
  readonly terms: readonly ResolvedTerm[];
}

/** The index letter for a name: the first A to Z letter, upper case, accents ignored, or "#". */
export function indexLetter(name: string): string {
  const first = fold(name.trim()).replace(/œ/g, 'oe').replace(/æ/g, 'ae').charAt(0);
  return /^[a-z]$/.test(first) ? first.toUpperCase() : '#';
}

/** Groups terms by letter, letters in order with "#" last, terms in the order given within a letter. */
export function groupByLetter(terms: readonly ResolvedTerm[]): readonly IndexGroup[] {
  const map = new Map<string, ResolvedTerm[]>();
  for (const term of terms) {
    const letter = indexLetter(term.term);
    map.set(letter, [...(map.get(letter) ?? []), term]);
  }
  const letters = [...map.keys()].sort((a, b) => (a === '#' ? 1 : b === '#' ? -1 : a < b ? -1 : a > b ? 1 : 0));
  return letters.map((letter) => ({ letter, terms: map.get(letter) ?? [] }));
}

export const LETTER_ID_PREFIX = 'gl-az-';

export function letterId(letter: string): string {
  return `${LETTER_ID_PREFIX}${letter === '#' ? 'other' : letter.toLowerCase()}`;
}

/** The id of the first term of each letter group: the page puts a letter anchor on it. */
export function anchorTermIds(groups: readonly IndexGroup[]): ReadonlyMap<string, string> {
  return new Map(groups.flatMap((g) => (g.terms[0] === undefined ? [] : [[g.terms[0].id, letterId(g.letter)] as const])));
}

export interface IndexLink {
  readonly letter: string;
  readonly href: string;
  readonly label: string;
  readonly count: number;
}

/** One link per letter that has terms. The label says how many terms are there. */
export function indexLinks(terms: readonly ResolvedTerm[], lang: Lang): readonly IndexLink[] {
  const ui = INDEX_UI[lang];
  return groupByLetter(terms).map((g) => {
    const text = ui.jump(g.letter, g.terms.length);
    return { letter: g.letter, href: `#${letterId(g.letter)}`, label: lang === 'fr' ? fixFrench(text) : text, count: g.terms.length };
  });
}

/** A navigation landmark with the letter links. Empty when there are no terms, or only one letter (nothing to jump between). */
export function renderIndexNav(terms: readonly ResolvedTerm[], lang: Lang): string {
  const links = indexLinks(terms, lang);
  if (links.length < 2) return '';
  const items = links
    .map((l) => `<li><a class="gl-term" href="${escapeHtml(l.href)}" aria-label="${escapeHtml(l.label)}">${escapeHtml(l.letter)}</a></li>`)
    .join('');
  return `<nav aria-label="${escapeHtml(INDEX_UI[lang].label)}"><ul class="gl-actions" style="list-style:none;padding:0">${items}</ul></nav>`;
}
