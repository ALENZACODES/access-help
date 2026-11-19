/**
 * Turns one line of a sheet into an observation, or says what is wrong with it.
 * A status is kept only when the cell says it plainly. An empty or unrecognised status
 * becomes UNKNOWN, and UNKNOWN stays UNKNOWN. Nothing is filled in on the person's behalf
 * except an id when the sheet has none.
 */
import type { Field, HeaderMap } from './headers.js';
import { normaliseHeader } from './headers.js';
import { daysBetween, isIsoDay } from '../presubmit/text.js';

export type SheetStatus = 'yes' | 'limited' | 'no' | 'UNKNOWN';

export interface SheetRecord {
  id: string;
  lat: number;
  lon: number;
  name: string | null;
  wheelchair: SheetStatus;
  source: string;
  licence: string;
  observedOn: string;
}

export const SHEET_LICENCES: readonly string[] = ['CC0-1.0', 'ODbL-1.0'];
export const MAX_NAME = 255;
export const MAX_SOURCE = 255;
export const MAX_ID = 64;

export type RowIssueCode =
  | 'lat-missing'
  | 'lat-invalid'
  | 'lon-missing'
  | 'lon-invalid'
  | 'source-missing'
  | 'source-too-long'
  | 'licence-missing'
  | 'licence-not-open'
  | 'date-missing'
  | 'date-invalid'
  | 'date-future'
  | 'name-too-long'
  | 'id-invalid'
  | 'id-repeated';

export type RowNoteCode = 'status-unrecognised' | 'status-empty' | 'id-made';

export interface RowIssue {
  field: Field;
  code: RowIssueCode;
}

export interface RowNote {
  code: RowNoteCode;
  /** The cell as written, for a status that was not recognised. */
  value?: string;
}

export type ParsedRow =
  | { ok: true; line: number; record: SheetRecord; notes: RowNote[] }
  | { ok: false; line: number; issues: RowIssue[]; notes: RowNote[]; name: string };

const STATUS_WORDS: Record<string, SheetStatus> = {
  yes: 'yes',
  oui: 'yes',
  limited: 'limited',
  limite: 'limited',
  partial: 'limited',
  partiel: 'limited',
  no: 'no',
  non: 'no',
  unknown: 'UNKNOWN',
  inconnu: 'UNKNOWN',
};

/** Removes the apostrophe a spreadsheet export puts in front of a cell that starts like a formula. */
export function unguard(cell: string): string {
  return /^'[=+\-@]/.test(cell) ? cell.slice(1) : cell;
}

export function readStatus(cell: string): { status: SheetStatus; note: RowNote | null } {
  const key = normaliseHeader(cell);
  if (key === '') return { status: 'UNKNOWN', note: { code: 'status-empty' } };
  const status = STATUS_WORDS[key];
  if (status === undefined) return { status: 'UNKNOWN', note: { code: 'status-unrecognised', value: cell } };
  return { status, note: null };
}

/** Reads a coordinate written with a point or a comma. Null when it is not a number in range. */
export function readCoordinate(cell: string, limit: number): number | null {
  const text = unguard(cell).trim().replace(',', '.');
  if (!/^[+-]?\d{1,3}(?:\.\d+)?$/.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
}

export function readLicence(cell: string): string | null {
  const wanted = cell.trim().toLowerCase();
  return SHEET_LICENCES.find((id) => id.toLowerCase() === wanted) ?? null;
}

export function madeId(today: string, line: number): string {
  return `sheet-${today}-${line}`;
}

const ID_SHAPE = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

export function parseRow(row: { line: number; cells: readonly string[] }, map: HeaderMap, today: string): ParsedRow {
  const cell = (field: Field): string => {
    const index = map.columns[field];
    return index === undefined ? '' : (row.cells[index] ?? '').trim();
  };
  const issues: RowIssue[] = [];
  const notes: RowNote[] = [];

  const latCell = cell('latitude');
  const lonCell = cell('longitude');
  const lat = readCoordinate(latCell, 90);
  const lon = readCoordinate(lonCell, 180);
  if (latCell === '') issues.push({ field: 'latitude', code: 'lat-missing' });
  else if (lat === null) issues.push({ field: 'latitude', code: 'lat-invalid' });
  if (lonCell === '') issues.push({ field: 'longitude', code: 'lon-missing' });
  else if (lon === null) issues.push({ field: 'longitude', code: 'lon-invalid' });

  const source = unguard(cell('source')).replace(/\s+/g, ' ').trim();
  if (source === '') issues.push({ field: 'source', code: 'source-missing' });
  else if (Array.from(source).length > MAX_SOURCE) issues.push({ field: 'source', code: 'source-too-long' });

  const licenceCell = cell('licence');
  const licence = readLicence(licenceCell);
  if (licenceCell === '') issues.push({ field: 'licence', code: 'licence-missing' });
  else if (licence === null) issues.push({ field: 'licence', code: 'licence-not-open' });

  const observedOn = cell('observedOn');
  if (observedOn === '') issues.push({ field: 'observedOn', code: 'date-missing' });
  else if (!isIsoDay(observedOn)) issues.push({ field: 'observedOn', code: 'date-invalid' });
  else if ((daysBetween(observedOn, today) ?? 0) < 0) issues.push({ field: 'observedOn', code: 'date-future' });

  const name = unguard(cell('name')).replace(/\s+/g, ' ').trim();
  if (Array.from(name).length > MAX_NAME) issues.push({ field: 'name', code: 'name-too-long' });

  const status = readStatus(cell('status'));
  if (status.note !== null) notes.push(status.note);

  let id = cell('id');
  if (id === '') {
    id = madeId(today, row.line);
    notes.push({ code: 'id-made' });
  } else if (id.length > MAX_ID || !ID_SHAPE.test(id)) {
    issues.push({ field: 'id', code: 'id-invalid' });
  }

  if (issues.length > 0 || lat === null || lon === null || licence === null) {
    return { ok: false, line: row.line, issues, notes, name };
  }
  return {
    ok: true,
    line: row.line,
    notes,
    record: { id, lat, lon, name: name === '' ? null : name, wheelchair: status.status, source, licence, observedOn },
  };
}

/** Parses every row, then marks a later row that repeats an id used earlier in the same sheet. */
export function parseRows(rows: readonly { line: number; cells: readonly string[] }[], map: HeaderMap, today: string): ParsedRow[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const parsed = parseRow(row, map, today);
    if (!parsed.ok) return parsed;
    if (seen.has(parsed.record.id)) {
      return { ok: false, line: parsed.line, issues: [{ field: 'id', code: 'id-repeated' }], notes: parsed.notes, name: parsed.record.name ?? '' };
    }
    seen.add(parsed.record.id);
    return parsed;
  });
}
