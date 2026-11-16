import { didYouMean, suggestionText } from './helpSuggest';
import { lookupTerm } from './glossary';
import { HELP_TOPICS, type HelpKind } from './helpCopy';
import { HELP_UI, helpCountText, termHref } from './helpRender';
import { markMatches, queryWords, rankHelp, type Piece } from './helpIndex';
import type { Lang } from './plainTerms';

/**
 * The help topics as plain data, for a page that draws them itself (the live /glossary route).
 * A reference to a term becomes a link only when the page has that term's definition on screen, so no link is ever dead.
 */
export type HelpSegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'term'; readonly id: string; readonly label: string; readonly href: string }
  /** Words that match what was typed, for a page to highlight. */
  | { readonly kind: 'mark'; readonly text: string };

export interface HelpTopicView {
  readonly id: string;
  readonly kind: HelpKind;
  readonly title: string;
  /** The title in pieces, so the words that match the search can be highlighted. */
  readonly titlePieces: readonly Piece[];
  readonly paragraphs: readonly (readonly HelpSegment[])[];
}

export interface HelpView {
  readonly title: string;
  readonly searchLabel: string;
  readonly count: string;
  readonly empty: boolean;
  /** A corrected search to offer when nothing matched, or null. */
  readonly suggestion: string | null;
  readonly suggestionText: string | null;
  readonly topics: readonly HelpTopicView[];
}

/** Splits [[id]] / [[id|words]] text into words and term links. `available` lists the term ids that have a definition on the page. */
export function segmentRefs(text: string, lang: Lang, available: ReadonlySet<string>): readonly HelpSegment[] {
  const out: HelpSegment[] = [];
  const push = (s: string): void => {
    if (s === '') return;
    const last = out[out.length - 1];
    if (last?.kind === 'text') out[out.length - 1] = { kind: 'text', text: last.text + s };
    else out.push({ kind: 'text', text: s });
  };
  let at = 0;
  for (const m of text.matchAll(/\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/g)) {
    push(text.slice(at, m.index));
    at = (m.index ?? 0) + m[0].length;
    const id = (m[1] ?? '').trim();
    const term = lookupTerm(id, lang);
    const label = (m[2] ?? '').trim() || term.term;
    if (term.known && available.has(id)) out.push({ kind: 'term', id, label, href: termHref(id) });
    else push(label);
  }
  push(text.slice(at));
  return out;
}

/** Splits the words of text segments that match the search into mark segments. Term links are left alone. */
export function markSegments(segments: readonly HelpSegment[], words: readonly string[]): readonly HelpSegment[] {
  if (words.length === 0) return segments;
  return segments.flatMap((seg): readonly HelpSegment[] =>
    seg.kind !== 'text' ? [seg] : markMatches(seg.text, words).map((p): HelpSegment => (p.match ? { kind: 'mark', text: p.text } : { kind: 'text', text: p.text })),
  );
}

/** What the page shows for a help search, best match first. */
export function helpView(query: string, lang: Lang, available: ReadonlySet<string>): HelpView {
  const hits = rankHelp(query, lang);
  const words = queryWords(query);
  const ui = HELP_UI[lang];
  return {
    title: ui.title,
    searchLabel: ui.searchLabel,
    count: helpCountText(lang, hits.length),
    empty: hits.length === 0,
    suggestion: hits.length === 0 ? didYouMean(query, lang) : null,
    suggestionText: hits.length === 0 ? suggestionText(query, lang) : null,
    topics: hits.map(({ topic: t, title }) => ({
      id: t.id,
      kind: t.kind,
      title: t.title[lang],
      titlePieces: title,
      paragraphs: t.body[lang].map((p) => markSegments(segmentRefs(p, lang, available), words)),
    })),
  };
}

/** Every term id any help topic links to, so a page knows which definitions must stay on screen. */
export function helpTermIds(): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const t of HELP_TOPICS) for (const lang of ['en', 'fr'] as const) for (const p of t.body[lang]) for (const m of p.matchAll(/\[\[([^\]|]*)/g)) ids.add((m[1] ?? '').trim());
  return ids;
}
