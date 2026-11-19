import { isOnlyDataLabel } from './dataLabels';
import type { Lang } from './plainTerms';
import { TERMS as CATALOGUE, type Term } from './terms';

/**
 * Words from the other language. The catalogue holds the App's preferred word for each idea in
 * English and in French. When a French text uses the English word of a term, or the other way
 * round, this finds it and gives the word the App uses in the text's own language. It only
 * compares words with the catalogue: it does not judge what the text says.
 */
export interface OtherLanguageTerm {
  readonly termId: string;
  /** The word as it was written in the text. */
  readonly found: string;
  /** The App's word for the same idea in the language of the text. */
  readonly use: string;
}

/**
 * Catalogue labels that are also ordinary words in the other language, so finding them in a text
 * means nothing. For example "route" and "contact" are French words as well as English ones.
 */
export const ALSO_A_WORD: Readonly<Record<Lang, readonly string[]>> = {
  // English labels left alone in French text.
  fr: ['route', 'contact', 'date', 'source', 'service', 'licence', 'details'],
  // French labels left alone in English text.
  en: ['source', 'date', 'service', 'licence', 'aide', 'retour', 'suivant'],
};

const fold = (text: string, lang: Lang): string => text.normalize('NFC').toLocaleLowerCase(lang === 'fr' ? 'fr-CA' : 'en-CA');
const escapeRe = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The label a term has in each language, tidied for matching. Articles at the start are dropped ("the App", "l’application"). */
function bare(label: string): string {
  return label.replace(/^(?:the |l[’'])/i, '').trim();
}

interface Entry {
  readonly termId: string;
  /** The other language's label, folded. */
  readonly needle: string;
  readonly use: string;
}

function entries(lang: Lang, terms: readonly Term[]): readonly Entry[] {
  const other: Lang = lang === 'fr' ? 'en' : 'fr';
  const skip = new Set(ALSO_A_WORD[lang]);
  const own = new Set(terms.map((t) => fold(bare(lang === 'fr' ? t.fr : t.en), lang)));
  const out: Entry[] = [];
  for (const term of terms) {
    const theirs = bare(other === 'fr' ? term.fr : term.en);
    const ours = bare(lang === 'fr' ? term.fr : term.en);
    const needle = fold(theirs, other);
    // A label that is the same in both languages, a data label, or a word the language also has, says nothing.
    if (needle === '' || needle === fold(ours, lang) || isOnlyDataLabel(theirs) || skip.has(needle) || own.has(needle)) continue;
    out.push({ termId: term.id, needle, use: ours });
  }
  // Longer labels first, so "accessible parking" is found before "parking".
  return out.sort((a, b) => b.needle.length - a.needle.length);
}

/**
 * The other-language catalogue words in a text, in the order they appear, each once. A word is
 * matched whole, without regard to case. A longer label wins over a shorter one inside it.
 */
export function otherLanguageTerms(text: string, lang: Lang, terms: readonly Term[] = CATALOGUE): readonly OtherLanguageTerm[] {
  const found: { at: number; end: number; hit: OtherLanguageTerm }[] = [];
  const hay = text.normalize('NFC');
  for (const entry of entries(lang, terms)) {
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}-])${escapeRe(entry.needle).replace(/ /g, '[\\s\\u00a0]+')}(?![\\p{L}\\p{N}-])`, 'giu');
    for (const m of hay.matchAll(pattern)) {
      const at = m.index ?? 0;
      const end = at + m[0].length;
      if (found.some((f) => at < f.end && end > f.at)) continue;
      found.push({ at, end, hit: { termId: entry.termId, found: m[0], use: entry.use } });
    }
  }
  const seen = new Set<string>();
  return found
    .sort((a, b) => a.at - b.at)
    .map((f) => f.hit)
    .filter((hit) => {
      if (seen.has(hit.termId)) return false;
      seen.add(hit.termId);
      return true;
    });
}

/** The catalogue terms that can be told apart by language: their two labels differ and neither is an ordinary word of the other language. */
export function comparableTerms(lang: Lang, terms: readonly Term[] = CATALOGUE): readonly string[] {
  return [...new Set(entries(lang, terms).map((e) => e.termId))];
}
