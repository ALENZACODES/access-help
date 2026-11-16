import { fixFrench } from './frTypography';
import { lookupTerm } from './glossary';
import { TERMS, type Lang } from './plainTerms';
import { termHref } from './termLinks';

/**
 * Features that people look at together. "See also" only points from one feature to another;
 * it says nothing about any place. Each pair is written once and works in both directions.
 */
export const RELATED_PAIRS: readonly (readonly [string, string])[] = [
  ['step-free-entrance', 'ramp'],
  ['step-free-entrance', 'automatic-door'],
  ['step-free-entrance', 'elevator'],
  ['automatic-door', 'clear-door-width'],
  ['ramp', 'elevator'],
  ['accessible-washroom', 'grab-bar'],
  ['accessible-washroom', 'clear-door-width'],
  ['accessible-parking', 'step-free-entrance'],
];

export const RELATED_UI = {
  en: { seeAlso: 'See also', none: 'No related features.' },
  fr: { seeAlso: 'Voir aussi', none: 'Aucune caractéristique liée.' },
} as const;

const ORDER = new Map(TERMS.map((t, i) => [t.id, i]));

/** Ids related to `id`, in glossary order, each once. An unknown id has none. */
export function relatedIds(id: string): readonly string[] {
  const out = new Set<string>();
  for (const [a, b] of RELATED_PAIRS) {
    if (a === id && b !== id) out.add(b);
    if (b === id && a !== id) out.add(a);
  }
  return [...out].filter((x) => ORDER.has(x)).sort((a, b) => (ORDER.get(a) ?? 0) - (ORDER.get(b) ?? 0));
}

export type RelatedSegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'term'; readonly id: string; readonly label: string; readonly href: string };

/**
 * "See also: Ramp, Elevator." as pieces a page can draw. A related feature is a link only when its
 * definition is on the page (`available`), otherwise plain words, so no link is dead. Empty when nothing is related.
 */
export function relatedSegments(id: string, lang: Lang, available: ReadonlySet<string>): readonly RelatedSegment[] {
  const ids = relatedIds(id);
  if (ids.length === 0) return [];
  const out: RelatedSegment[] = [{ kind: 'text', text: `${RELATED_UI[lang].seeAlso}${lang === 'fr' ? ' ' : ''}: ` }];
  ids.forEach((rid, i) => {
    const label = lookupTerm(rid, lang).term;
    if (i > 0) out.push({ kind: 'text', text: ', ' });
    out.push(available.has(rid) ? { kind: 'term', id: rid, label, href: termHref(rid) } : { kind: 'text', text: label });
  });
  out.push({ kind: 'text', text: '.' });
  return out;
}

/** The same line as plain text, for exports. */
export function relatedText(id: string, lang: Lang): string {
  const segs = relatedSegments(id, lang, new Set());
  const text = segs.map((s) => (s.kind === 'term' ? s.label : s.text)).join('');
  return lang === 'fr' ? fixFrench(text) : text;
}
