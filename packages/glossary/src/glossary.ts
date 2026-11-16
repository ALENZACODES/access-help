import { TERMS, UNKNOWN_TERM, type GlossaryTerm, type Lang } from './plainTerms.js';

export interface ResolvedTerm {
  readonly id: string;
  readonly term: string;
  readonly plain: string;
  /** false when we have no entry: the caller must show it as unknown. */
  readonly known: boolean;
}

function resolve(entry: GlossaryTerm, lang: Lang, known: boolean): ResolvedTerm {
  const text = entry[lang];
  return { id: entry.id, term: text.term, plain: text.plain, known };
}

function normalise(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '')
    .toLowerCase()
    .trim();
}

/** Missing or unrecognised ids resolve to UNKNOWN, never to a guess. */
export function lookupTerm(id: string | null | undefined, lang: Lang): ResolvedTerm {
  const entry = TERMS.find((t) => t.id === id);
  return entry === undefined ? resolve(UNKNOWN_TERM, lang, false) : resolve(entry, lang, true);
}

/** All terms in the given language, sorted by display name. */
export function listTerms(lang: Lang): readonly ResolvedTerm[] {
  return TERMS.map((t) => resolve(t, lang, true)).sort((a, b) => a.term.localeCompare(b.term, lang));
}

/** Accent- and apostrophe-insensitive search over term and description. */
export function searchTerms(query: string, lang: Lang): readonly ResolvedTerm[] {
  const q = normalise(query);
  if (q === '') return [];
  return listTerms(lang).filter((t) => normalise(`${t.term} ${t.plain}`).includes(q));
}
