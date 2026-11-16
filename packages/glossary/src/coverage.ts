import { fixFrench } from './frTypography';
import { lookupTerm } from './glossary';
import type { Place } from './places';
import { mergeClaims } from './status';
import { TERMS, type Lang } from './terms';
import { escapeHtml } from './text';

/** How many places a data set says something about, per feature. Shows gaps instead of hiding them. */
export interface TermCoverage {
  readonly termId: string;
  readonly term: string;
  readonly present: number;
  readonly absent: number;
  readonly unknown: number;
  readonly total: number;
}

export function datasetCoverage(places: readonly Place[], lang: Lang): readonly TermCoverage[] {
  const ids = TERMS.map((t) => t.id);
  const rows = ids.map((termId) => ({ termId, term: lookupTerm(termId, lang).term, present: 0, absent: 0, unknown: 0, total: places.length }));
  for (const place of places) {
    mergeClaims(ids, place.claims).forEach((claim, i) => {
      const row = rows[i];
      if (row !== undefined) row[claim.status] += 1;
    });
  }
  return rows;
}

export const COVERAGE_UI = {
  en: {
    summary: 'Data coverage',
    caption: 'How many places have information about each feature',
    feature: 'Feature',
    present: 'Reported as available',
    absent: 'Reported as not available',
    unknown: 'Unknown',
  },
  fr: {
    summary: 'Couverture des données',
    caption: 'Nombre de lieux ayant de l’information sur chaque caractéristique',
    feature: 'Caractéristique',
    present: 'Signalé comme disponible',
    absent: 'Signalé comme non disponible',
    unknown: 'Inconnu',
  },
} as const;

/** One line for a feature, for screen readers and plain-text use. */
export function coverageText(c: TermCoverage, lang: Lang): string {
  const text =
    lang === 'fr'
      ? `${c.term} : ${c.present} signalé(s) comme disponible(s), ${c.absent} signalé(s) comme non disponible(s), ${c.unknown} inconnu(s).`
      : `${c.term}: ${c.present} reported as available, ${c.absent} reported as not available, ${c.unknown} unknown.`;
  return lang === 'fr' ? fixFrench(text) : text;
}

/** A collapsed section with a table. Empty string when there are no places. */
export function renderCoverage(places: readonly Place[], lang: Lang): string {
  if (places.length === 0) return '';
  const ui = COVERAGE_UI[lang];
  const rows = datasetCoverage(places, lang)
    .map(
      (c) =>
        `<tr><th scope="row">${escapeHtml(c.term)}</th><td>${c.present}</td><td>${c.absent}</td><td>${c.unknown}</td></tr>`,
    )
    .join('');
  return (
    `<details class="gl-coverage"><summary>${escapeHtml(ui.summary)}</summary>` +
    `<div class="gl-compare-wrap" role="region" aria-label="${escapeHtml(ui.caption)}" tabindex="0">` +
    `<table class="gl-compare"><caption>${escapeHtml(ui.caption)}</caption><thead><tr>` +
    `<th scope="col">${escapeHtml(ui.feature)}</th><th scope="col">${escapeHtml(ui.present)}</th>` +
    `<th scope="col">${escapeHtml(ui.absent)}</th><th scope="col">${escapeHtml(ui.unknown)}</th>` +
    `</tr></thead><tbody>${rows}</tbody></table></div></details>`
  );
}
