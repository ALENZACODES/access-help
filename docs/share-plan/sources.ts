/**
 * One row per source and licence for a set of records: how many records, the span of dates and
 * the statuses as written. Pure: no network, no storage, no clock. A status that is not yes,
 * limited or no is counted as UNKNOWN and never guessed.
 */
import { isGuideLicence, type LicensedRecord } from '../licence-guide/index.js';

export interface PlanRecord extends LicensedRecord {
  name: string | null;
  wheelchair: string;
}

export interface StatusCounts {
  yes: number;
  limited: number;
  no: number;
  unknown: number;
}

export interface SourceRow {
  /** The source as first written, with spaces tidied. Empty when the record names no source. */
  source: string;
  licence: string;
  /** True when the App takes this licence. */
  accepted: boolean;
  /** True when the licence asks for credit. */
  creditAsked: boolean;
  count: number;
  from: string;
  to: string;
  statuses: StatusCounts;
}

export const MAX_SOURCE_ROWS = 300;

export function tidySource(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function emptyStatusCounts(): StatusCounts {
  return { yes: 0, limited: 0, no: 0, unknown: 0 };
}

export function countStatus(counts: StatusCounts, wheelchair: string): void {
  if (wheelchair === 'yes') counts.yes += 1;
  else if (wheelchair === 'limited') counts.limited += 1;
  else if (wheelchair === 'no') counts.no += 1;
  else counts.unknown += 1;
}

export function statusCountsOf(records: readonly PlanRecord[]): StatusCounts {
  const counts = emptyStatusCounts();
  for (const record of records) countStatus(counts, record.wheelchair);
  return counts;
}

export function sourceRows(records: readonly PlanRecord[]): SourceRow[] {
  const map = new Map<string, SourceRow>();
  for (const record of records) {
    const source = tidySource(record.source);
    const key = `${record.licence}\n${source.toLowerCase()}`;
    let row = map.get(key);
    if (row === undefined) {
      row = {
        source,
        licence: record.licence,
        accepted: isGuideLicence(record.licence),
        creditAsked: record.licence === 'ODbL-1.0',
        count: 0,
        from: record.observedOn,
        to: record.observedOn,
        statuses: emptyStatusCounts(),
      };
      map.set(key, row);
    }
    row.count += 1;
    if (record.observedOn < row.from) row.from = record.observedOn;
    if (record.observedOn > row.to) row.to = record.observedOn;
    countStatus(row.statuses, record.wheelchair);
  }
  return [...map.values()]
    .sort(
      (a, b) =>
        Number(b.creditAsked) - Number(a.creditAsked) ||
        Number(b.accepted) - Number(a.accepted) ||
        b.count - a.count ||
        a.source.localeCompare(b.source, 'en') ||
        a.licence.localeCompare(b.licence, 'en'),
    )
    .slice(0, MAX_SOURCE_ROWS);
}

export const SOURCE_COLUMNS = ['source', 'licence', 'licence_taken', 'credit_asked', 'records', 'first_seen', 'last_seen', 'yes', 'limited', 'no', 'unknown'] as const;

/** Quotes a cell when it needs it, and defuses a cell a spreadsheet would run as a formula. */
export function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** The rows as CSV. Column names are plain ASCII so any spreadsheet can read them. */
export function sourcesCsv(rows: readonly SourceRow[]): string {
  const lines = [SOURCE_COLUMNS.join(',')];
  for (const row of rows) {
    lines.push(
      [row.source, row.licence, row.accepted ? 'yes' : 'no', row.creditAsked ? 'yes' : 'no', row.count, row.from, row.to, row.statuses.yes, row.statuses.limited, row.statuses.no, row.statuses.unknown]
        .map(csvCell)
        .join(','),
    );
  }
  return `${lines.join('\r\n')}\r\n`;
}

export function sourcesCsvFilename(today: string): string {
  return `sources-${today}.csv`;
}
