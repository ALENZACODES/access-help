/**
 * Where a person has recorded something, cell by cell.
 *
 * Words matter here. A cell with no record is "no record yet": it does not mean the place is
 * not accessible, and it does not mean nothing is there. A cell with only UNKNOWN records is
 * one the person went to without noting a status. Neither is a score of the area.
 */
import { cellLabel, cellOf, type CellRef, type Grid } from './day-grid';
import { fill, formatShare, plural, type DayLang } from './day-text';

export type Status = 'yes' | 'limited' | 'no' | 'UNKNOWN';
export const STATUSES: readonly Status[] = ['yes', 'limited', 'no', 'UNKNOWN'];

/** The part of a saved observation this module needs. */
export interface CoverageRecord {
  id: string;
  lat: number;
  lon: number;
  wheelchair: Status;
  observedOn: string;
}

export type CellState = 'no-record' | 'only-unknown' | 'has-recorded-status';

export interface CellCoverage {
  row: number;
  col: number;
  label: string;
  counts: Record<Status, number>;
  total: number;
  state: CellState;
  /** Oldest and newest observation dates in the cell, or null with no record. */
  oldest: string | null;
  newest: string | null;
}

export interface CoverageSummary {
  cells: number;
  cellsWithRecords: number;
  cellsWithRecordedStatus: number;
  cellsOnlyUnknown: number;
  cellsNoRecord: number;
  records: number;
  outside: number;
  byStatus: Record<Status, number>;
  /** UNKNOWN records over inside-area records; null when there are none. */
  unknownShare: number | null;
  /** Cells with at least one record over all cells. This is not a measure of how much of the area is known. */
  cellsWithRecordsShare: number | null;
}

export interface Coverage {
  grid: Grid;
  cells: CellCoverage[];
  outsideIds: string[];
  summary: CoverageSummary;
  /** Records dropped because their status was not one of the four. */
  skippedIds: string[];
}

export type Scope = { kind: 'all' } | { kind: 'on'; date: string } | { kind: 'since'; date: string };

const emptyCounts = (): Record<Status, number> => ({ yes: 0, limited: 0, no: 0, UNKNOWN: 0 });

function isStatus(value: unknown): value is Status {
  return value === 'yes' || value === 'limited' || value === 'no' || value === 'UNKNOWN';
}

function inScope(record: CoverageRecord, scope: Scope): boolean {
  if (scope.kind === 'all') return true;
  if (scope.kind === 'on') return record.observedOn === scope.date;
  return record.observedOn >= scope.date;
}

/** Counts records into cells. A record with an unrecognised status is skipped and listed, never counted as UNKNOWN or "no". */
export function computeCoverage(grid: Grid, records: readonly CoverageRecord[], scope: Scope = { kind: 'all' }): Coverage {
  const byCell = new Map<string, CellCoverage>();
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      byCell.set(`${row},${col}`, { row, col, label: cellLabel({ row, col }), counts: emptyCounts(), total: 0, state: 'no-record', oldest: null, newest: null });
    }
  }
  const outsideIds: string[] = [];
  const skippedIds: string[] = [];
  const byStatus = emptyCounts();
  let inside = 0;
  for (const record of records) {
    if (!inScope(record, scope)) continue;
    if (!isStatus(record.wheelchair)) {
      skippedIds.push(record.id);
      continue;
    }
    const ref = cellOf(grid, record);
    if (!ref) {
      outsideIds.push(record.id);
      continue;
    }
    const cell = byCell.get(`${ref.row},${ref.col}`);
    if (!cell) continue;
    cell.counts[record.wheelchair] += 1;
    cell.total += 1;
    byStatus[record.wheelchair] += 1;
    inside += 1;
    if (cell.oldest === null || record.observedOn < cell.oldest) cell.oldest = record.observedOn;
    if (cell.newest === null || record.observedOn > cell.newest) cell.newest = record.observedOn;
  }
  const cells = [...byCell.values()];
  for (const cell of cells) {
    const recorded = cell.counts.yes + cell.counts.limited + cell.counts.no;
    cell.state = cell.total === 0 ? 'no-record' : recorded === 0 ? 'only-unknown' : 'has-recorded-status';
  }
  const withRecords = cells.filter((c) => c.total > 0).length;
  const summary: CoverageSummary = {
    cells: cells.length,
    cellsWithRecords: withRecords,
    cellsWithRecordedStatus: cells.filter((c) => c.state === 'has-recorded-status').length,
    cellsOnlyUnknown: cells.filter((c) => c.state === 'only-unknown').length,
    cellsNoRecord: cells.filter((c) => c.state === 'no-record').length,
    records: inside,
    outside: outsideIds.length,
    byStatus,
    unknownShare: inside === 0 ? null : byStatus.UNKNOWN / inside,
    cellsWithRecordsShare: cells.length === 0 ? null : withRecords / cells.length,
  };
  return { grid, cells, outsideIds, skippedIds, summary };
}

export function cellAt(coverage: Coverage, ref: CellRef): CellCoverage | null {
  return coverage.cells.find((c) => c.row === ref.row && c.col === ref.col) ?? null;
}

/** Rows of cells, north to south, for drawing a table. */
export function cellRows(coverage: Coverage): CellCoverage[][] {
  const rows: CellCoverage[][] = [];
  for (const cell of coverage.cells) (rows[cell.row] ??= []).push(cell);
  return rows.map((row) => row.sort((a, b) => a.col - b.col));
}

/**
 * Cells worth another look, most useful first: cells with only UNKNOWN records, then cells with
 * no record. Within each group, reading order. This is a to-do list, not a ranking of places.
 */
export function revisitList(coverage: Coverage, limit = Number.POSITIVE_INFINITY): CellCoverage[] {
  const rank = (cell: CellCoverage) => (cell.state === 'only-unknown' ? 0 : cell.state === 'no-record' ? 1 : 2);
  return coverage.cells
    .filter((c) => c.state !== 'has-recorded-status')
    .sort((a, b) => rank(a) - rank(b) || a.row - b.row || a.col - b.col)
    .slice(0, Math.max(0, limit));
}

const STATE_TEXT: Record<CellState, Record<DayLang, string>> = {
  'no-record': { en: 'No record here yet', fr: 'Aucune fiche ici pour l’instant' },
  'only-unknown': { en: 'Only UNKNOWN records', fr: 'Seulement des fiches UNKNOWN' },
  'has-recorded-status': { en: 'Has recorded statuses', fr: 'Contient des statuts consignés' },
};

export function stateText(state: CellState, lang: DayLang): string {
  return STATE_TEXT[state][lang];
}

/** One sentence for a screen reader, for example "B3: 2 records, 1 recorded as step-free entrance, 1 UNKNOWN". */
export function describeCell(cell: CellCoverage, lang: DayLang): string {
  if (cell.total === 0) return `${cell.label}${lang === 'fr' ? ' ' : ''}: ${stateText('no-record', lang)}`;
  const parts: string[] = [];
  if (cell.counts.yes > 0) parts.push(fill(lang === 'fr' ? '{n} consignée comme entrée sans marche' : '{n} recorded as step-free entrance', { n: cell.counts.yes }));
  if (cell.counts.limited > 0) parts.push(fill(lang === 'fr' ? '{n} consignée comme accès partiel' : '{n} recorded as partial access', { n: cell.counts.limited }));
  if (cell.counts.no > 0) parts.push(fill(lang === 'fr' ? '{n} consignée comme sans accès de plain-pied' : '{n} recorded as no step-free access', { n: cell.counts.no }));
  if (cell.counts.UNKNOWN > 0) parts.push(`${cell.counts.UNKNOWN} UNKNOWN`);
  const noun = plural(lang, cell.total, lang === 'fr' ? 'fiche' : 'record', lang === 'fr' ? 'fiches' : 'records');
  return `${cell.label}${lang === 'fr' ? ' ' : ''}: ${cell.total} ${noun}, ${parts.join(', ')}`;
}

/** The share of cells holding at least one record, worded so it cannot read as "area mapped". */
export function cellsWithRecordsText(summary: CoverageSummary, lang: DayLang): string {
  return lang === 'fr'
    ? `${summary.cellsWithRecords} cellules sur ${summary.cells} contiennent au moins une fiche (${formatShare(summary.cellsWithRecordsShare, lang)}). Cela ne dit pas quelle part de la zone est connue.`
    : `${summary.cellsWithRecords} of ${summary.cells} cells hold at least one record (${formatShare(summary.cellsWithRecordsShare, lang)}). This does not say how much of the area is known.`;
}
