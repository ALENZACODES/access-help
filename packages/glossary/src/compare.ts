import { lookupTerm } from './glossary';
import { formatProvenance } from './provenance';
import { fixFrench } from './frTypography';
import type { Place } from './places';
import { mergeClaims, statusLabel, type ResolvedClaim } from './status';
import { TERMS, type Lang } from './terms';
import { escapeHtml } from './text';

export interface ComparisonRow {
  readonly termId: string;
  readonly term: string;
  readonly a: ResolvedClaim;
  readonly b: ResolvedClaim;
  readonly differs: boolean;
}

/** Row per feature. With no features chosen, every glossary feature is compared. */
export function comparePlaces(
  a: Place,
  b: Place,
  termIds: readonly string[],
  lang: Lang,
): readonly ComparisonRow[] {
  const ids = termIds.length > 0 ? [...new Set(termIds)] : TERMS.map((t) => t.id);
  const left = mergeClaims(ids, a.claims);
  const right = mergeClaims(ids, b.claims);
  return ids.map((termId, i): ComparisonRow => {
    const la = left[i] as ResolvedClaim;
    const lb = right[i] as ResolvedClaim;
    return { termId, term: lookupTerm(termId, lang).term, a: la, b: lb, differs: la.status !== lb.status };
  });
}

const TEXT = {
  en: {
    feature: 'Feature',
    different: 'Different',
    caption: (a: string, b: string): string => `Comparison of ${a} and ${b}`,
    summary: (d: number, n: number): string => `${d} of ${n} features ${d === 1 ? 'differs' : 'differ'}.`,
  },
  fr: {
    feature: 'Caractéristique',
    different: 'Différent',
    caption: (a: string, b: string): string => `Comparaison de ${a} et de ${b}`,
    summary: (d: number, n: number): string =>
      `${d} caractéristique${d > 1 ? 's' : ''} sur ${n} ${d > 1 ? 'diffèrent' : 'diffère'}.`,
  },
} as const;

export function comparisonSummary(rows: readonly ComparisonRow[], lang: Lang): string {
  const text = TEXT[lang].summary(rows.filter((r) => r.differs).length, rows.length);
  return lang === 'fr' ? fixFrench(text) : text;
}

export function comparisonCaption(a: Place, b: Place, lang: Lang): string {
  return TEXT[lang].caption(a.name, b.name);
}

function cell(claim: ResolvedClaim, lang: Lang): string {
  const label = statusLabel(claim.status, lang, claim.conflict);
  const shown = label.charAt(0).toUpperCase() + label.slice(1);
  const outcome = claim.status === 'present' ? 'met' : claim.status === 'absent' ? 'not-met' : 'unknown';
  const note =
    claim.provenance === undefined
      ? ''
      : `<span class="gl-note">${escapeHtml(formatProvenance(claim.provenance, lang))}</span>`;
  return `<td data-outcome="${outcome}">${escapeHtml(shown)}${note}</td>`;
}

/** Scrollable, labelled table: column and row headers, one row per feature. */
export function renderComparison(a: Place, b: Place, termIds: readonly string[], lang: Lang): string {
  const rows = comparePlaces(a, b, termIds, lang);
  const caption = comparisonCaption(a, b, lang);
  const t = TEXT[lang];
  const body = rows
    .map((r) => {
      const mark = r.differs ? `<span class="gl-note">${escapeHtml(t.different)}</span>` : '';
      return `<tr><th scope="row">${escapeHtml(r.term)}${mark}</th>${cell(r.a, lang)}${cell(r.b, lang)}</tr>`;
    })
    .join('');
  return (
    `<div class="gl-compare-wrap" role="region" aria-label="${escapeHtml(caption)}" tabindex="0">` +
    `<table class="gl-compare"><caption>${escapeHtml(caption)}</caption>` +
    `<thead><tr><th scope="col">${escapeHtml(t.feature)}</th>` +
    `<th scope="col">${escapeHtml(a.name)}</th><th scope="col">${escapeHtml(b.name)}</th></tr></thead>` +
    `<tbody>${body}</tbody></table></div>` +
    `<p class="gl-note">${escapeHtml(comparisonSummary(rows, lang))}</p>`
  );
}
