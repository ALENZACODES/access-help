import { fixFrench } from './frTypography';
import { lookupTerm } from './glossary';
import { NOTE_UI } from './notes';
import type { Place } from './places';
import { formatProvenance, type Provenance } from './provenance';
import { questionsFor, questionsToText } from './questions';
import { mergeClaims, statusLabel } from './status';
import type { Lang } from './plainTerms';

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * One place as plain text: each chosen feature with its status and source, questions for
 * what is unknown, the person's own note, and where the data came from.
 */
export function placeToText(
  place: Place,
  termIds: readonly string[],
  lang: Lang,
  today: string,
  note = '',
  provenance: Provenance | null = null,
): string {
  const colon = lang === 'fr' ? ' :' : ':';
  const lines: string[] = [place.name, ''];
  for (const c of mergeClaims(termIds, place.claims)) {
    lines.push(`${lookupTerm(c.termId, lang).term}${colon} ${cap(statusLabel(c.status, lang, c.conflict))}`);
    if (c.status !== 'unknown' && c.provenance !== undefined) lines.push(`  ${formatProvenance(c.provenance, lang)}`);
  }
  const ask = questionsToText(questionsFor(place, termIds, today, lang), lang);
  if (ask.length > 0) lines.push('', ...ask);
  const fix = (ls: readonly string[]): string[] => (lang === 'fr' ? ls.map((l) => fixFrench(l)) : [...ls]);
  const out = fix(lines);
  // The person's own words are kept exactly as typed.
  if (note.trim() !== '') out.push('', ...fix([`${NOTE_UI[lang].yourNote}${colon}`]), note.trim());
  if (provenance !== null) out.push('', ...fix([formatProvenance(provenance, lang)]));
  return out.join('\n') + '\n';
}

export function placeFilename(place: Place, lang: Lang): string {
  const slug = place.id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'place';
  return `place-${slug}-${lang}.txt`;
}
