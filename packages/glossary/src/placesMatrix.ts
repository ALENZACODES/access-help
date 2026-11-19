import { fixFrench } from './frTypography';
import { lookupTerm } from './glossary';
import type { Place } from './places';
import { TERMS, type Lang } from './plainTerms';
import { recordCell } from './recordsCsv';
import { mergeClaims, statusLabel, type FeatureStatus } from './status';
import { escapeHtml } from './text';

/**
 * Every place against every feature, in one table: what is reported for each pair. It is the
 * list seen from above, for a person who wants to scan it or open it in a spreadsheet. A cell
 * with nothing to report says unknown; where sources disagree it says so. Nothing is filled in.
 */
export interface MatrixCell {
  readonly termId: string;
  readonly status: FeatureStatus;
  /** true when usable records disagree; the status is then unknown. */
  readonly conflict: boolean;
}

export interface MatrixRow {
  readonly placeId: string;
  readonly name: string;
  readonly cells: readonly MatrixCell[];
}

const ALL: readonly string[] = TERMS.map((t) => t.id);

/** The features to show: the chosen ones the glossary knows, in glossary order, or every feature when none is chosen. */
export function matrixColumns(chosen: readonly string[]): readonly string[] {
  const picked = ALL.filter((id) => chosen.includes(id));
  return picked.length === 0 ? ALL : picked;
}

/** One row for each place in the order given, with one cell for each column. */
export function matrixRows(places: readonly Place[], columns: readonly string[]): readonly MatrixRow[] {
  const ids = ALL.filter((id) => columns.includes(id));
  return places.map((place) => ({
    placeId: place.id,
    name: place.name,
    cells: mergeClaims(ids, place.claims).map((m) => ({ termId: m.termId, status: m.status, conflict: m.conflict })),
  }));
}

export interface MatrixCounts {
  readonly present: number;
  readonly absent: number;
  readonly unknown: number;
}

export function matrixCounts(rows: readonly MatrixRow[]): MatrixCounts {
  const counts = { present: 0, absent: 0, unknown: 0 };
  for (const row of rows) for (const cell of row.cells) counts[cell.status] += 1;
  return counts;
}

export interface MatrixColumnCount extends MatrixCounts {
  readonly termId: string;
}

/** For each column, how many places have the feature reported as available, as not available, or unknown. */
export function matrixColumnCounts(rows: readonly MatrixRow[], columns: readonly string[]): readonly MatrixColumnCount[] {
  return ALL.filter((id) => columns.includes(id)).map((termId) => {
    const counts = { present: 0, absent: 0, unknown: 0 };
    for (const row of rows) {
      const cell = row.cells.find((c) => c.termId === termId);
      if (cell !== undefined) counts[cell.status] += 1;
    }
    return { termId, ...counts };
  });
}

export const MATRIX_UI = {
  en: {
    heading: 'Every place and feature in one table',
    intro: 'Each cell says what the records report for one feature of one place. Unknown does not mean a feature is missing.',
    noPlaces: 'There are no places in the list.',
    caption: 'What is reported for each feature of each place',
    place: 'Place',
    counts: (present: number, absent: number, unknown: number): string =>
      `Cells where a feature is reported as available: ${present}. Reported as not available: ${absent}. Where it is unknown: ${unknown}.`,
    scopeAll: 'The table shows every feature.',
    scopeChosen: (n: number): string => (n === 1 ? 'The table shows the 1 feature you chose.' : `The table shows the ${n} features you chose.`),
    exportTable: 'Save this table for a spreadsheet',
    totals: { present: 'Places where it is reported as available', absent: 'Places where it is reported as not available', unknown: 'Places where it is unknown' },
  },
  fr: {
    heading: 'Tous les lieux et caractéristiques dans un tableau',
    intro: 'Chaque case dit ce que les fiches signalent pour une caractéristique d’un lieu. UNKNOWN ne veut pas dire qu’une caractéristique manque.',
    noPlaces: 'Il n’y a aucun lieu dans la liste.',
    caption: 'Ce qui est signalé pour chaque caractéristique de chaque lieu',
    place: 'Lieu',
    counts: (present: number, absent: number, unknown: number): string =>
      `Cases où une caractéristique est signalée comme disponible\u00a0: ${present}. Signalée comme non disponible\u00a0: ${absent}. Où elle est UNKNOWN\u00a0: ${unknown}.`,
    scopeAll: 'Le tableau montre chaque caractéristique.',
    scopeChosen: (n: number): string => (n === 1 ? 'Le tableau montre 1 caractéristique, celle que vous avez choisie.' : `Le tableau montre les ${n} caractéristiques choisies.`),
    exportTable: 'Enregistrer ce tableau pour un tableur',
    totals: { present: 'Lieux où elle est signalée comme disponible', absent: 'Lieux où elle est signalée comme non disponible', unknown: 'Lieux où elle est UNKNOWN' },
  },
} as const;

export const MATRIX_EXPORT_ID = 'gl-matrix-export';
export const MATRIX_MIME = 'text/csv;charset=utf-8';

export function matrixFilename(lang: Lang): string {
  return `places-and-features-${lang}.csv`;
}

export function matrixScopeText(chosen: readonly string[], lang: Lang): string {
  const ui = MATRIX_UI[lang];
  const columns = matrixColumns(chosen);
  return columns.length === ALL.length ? ui.scopeAll : ui.scopeChosen(columns.length);
}

/**
 * The table as CSV for a spreadsheet: a header row, one row for each place, then three rows of
 * totals for each feature. Cells are made
 * safe for spreadsheets in the same way as the table of records. Lines end with CRLF.
 */
export function matrixToCsv(places: readonly Place[], chosen: readonly string[], lang: Lang): string {
  const columns = matrixColumns(chosen);
  const head = [MATRIX_UI[lang].place, ...columns.map((id) => lookupTerm(id, lang).term)];
  const lines = matrixRows(places, columns).map((row) => [row.name, ...row.cells.map((c) => statusLabel(c.status, lang, c.conflict))]);
  const perColumn = matrixColumnCounts(matrixRows(places, columns), columns);
  const totals = places.length === 0 ? [] : (['present', 'absent', 'unknown'] as const).map((k) => [MATRIX_UI[lang].totals[k], ...perColumn.map((c) => String(c[k]))]);
  return `${[head, ...lines, ...totals].map((cells) => cells.map(recordCell).join(',')).join('\r\n')}\r\n`;
}

/** The panel: what the table shows, the counts, then the table with a row header for each place. */
export function renderMatrix(places: readonly Place[], chosen: readonly string[], lang: Lang, canExport: boolean): string {
  const ui = MATRIX_UI[lang];
  if (places.length === 0) return `<p class="gl-note">${escapeHtml(ui.noPlaces)}</p>`;
  const columns = matrixColumns(chosen);
  const rows = matrixRows(places, columns);
  const counts = matrixCounts(rows);
  const heads = `<th scope="col">${escapeHtml(ui.place)}</th>` + columns.map((id) => `<th scope="col">${escapeHtml(lookupTerm(id, lang).term)}</th>`).join('');
  const body = rows
    .map(
      (r) =>
        `<tr><th scope="row">${escapeHtml(r.name)}</th>` +
        r.cells.map((c) => `<td data-status="${c.conflict ? 'conflict' : c.status}">${escapeHtml(statusLabel(c.status, lang, c.conflict))}</td>`).join('') +
        `</tr>`,
    )
    .join('');
  const perColumn = matrixColumnCounts(rows, columns);
  const foot = (['present', 'absent', 'unknown'] as const)
    .map((k) => `<tr data-total="${k}"><th scope="row">${escapeHtml(ui.totals[k])}</th>${perColumn.map((c) => `<td>${c[k]}</td>`).join('')}</tr>`)
    .join('');
  const button = canExport ? `<div class="gl-actions"><button type="button" class="gl-btn" id="${MATRIX_EXPORT_ID}">${escapeHtml(ui.exportTable)}</button></div>` : '';
  const countsText = lang === 'fr' ? fixFrench(ui.counts(counts.present, counts.absent, counts.unknown)) : ui.counts(counts.present, counts.absent, counts.unknown);
  return (
    `<p>${escapeHtml(ui.intro)}</p><p class="gl-note">${escapeHtml(matrixScopeText(chosen, lang))}</p><p role="status">${escapeHtml(countsText)}</p>` +
    `<div class="gl-compare-wrap" role="region" aria-label="${escapeHtml(ui.caption)}" tabindex="0">` +
    `<table class="gl-compare"><caption>${escapeHtml(ui.caption)}</caption><thead><tr>${heads}</tr></thead><tbody>${body}</tbody><tfoot>${foot}</tfoot></table></div>${button}`
  );
}
