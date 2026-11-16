import { comparePlaces, comparisonCaption, comparisonSummary } from './compare';
import { fixFrench } from './frTypography';
import type { Place } from './places';
import { formatProvenance, type Provenance } from './provenance';
import { statusLabel } from './status';
import type { Lang } from './terms';

export const TEXT_MIME = 'text/plain;charset=utf-8';

export type TextExportKind = 'saved' | 'comparison';

export interface ExportFile {
  readonly text: string;
  readonly filename: string;
  readonly mime: string;
}

export function textFilename(kind: TextExportKind, lang: Lang): string {
  return `${kind === 'saved' ? 'saved-places' : 'comparison'}-${lang}.txt`;
}

function finish(lines: readonly string[], lang: Lang): string {
  const text = lines.join('\n') + '\n';
  return lang === 'fr' ? fixFrench(text) : text;
}

/** Names of saved places, in the order given. Ids that are not in `places` are skipped. */
export function savedToText(
  places: readonly Place[],
  ids: readonly string[],
  lang: Lang,
  provenance: Provenance | null = null,
): string {
  const byId = new Map(places.map((p) => [p.id, p] as const));
  const names = ids.flatMap((id) => {
    const p = byId.get(id);
    return p === undefined ? [] : [p.name];
  });
  const title = lang === 'fr' ? `Lieux enregistrés (${names.length})` : `Saved places (${names.length})`;
  const lines = [title, '', ...names.map((n) => `- ${n}`)];
  if (provenance !== null) lines.push('', formatProvenance(provenance, lang));
  return finish(lines, lang);
}

/** Plain-text version of the comparison table. Unknown stays "Unknown" / "Inconnu". */
export function comparisonToText(
  a: Place,
  b: Place,
  termIds: readonly string[],
  lang: Lang,
  provenance: Provenance | null = null,
): string {
  const rows = comparePlaces(a, b, termIds, lang);
  const lines = [comparisonCaption(a, b, lang), comparisonSummary(rows, lang), ''];
  for (const r of rows) {
    const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
    lines.push(
      r.term,
      `  ${a.name}${lang === 'fr' ? ' :' : ':'} ${cap(statusLabel(r.a.status, lang, r.a.conflict))}`,
      `  ${b.name}${lang === 'fr' ? ' :' : ':'} ${cap(statusLabel(r.b.status, lang, r.b.conflict))}`,
    );
  }
  if (provenance !== null) lines.push('', formatProvenance(provenance, lang));
  return finish(lines, lang);
}

export function toExportFile(kind: TextExportKind, text: string, lang: Lang): ExportFile {
  return { text, filename: textFilename(kind, lang), mime: TEXT_MIME };
}
