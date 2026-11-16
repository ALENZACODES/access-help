import { validateProvenance, type Provenance } from './provenance';
import type { FeatureClaim, FeatureStatus } from './status';
import type { Place } from './places';
import { TERMS } from './plainTerms';

/* ---------- CSV (RFC 4180: quotes, doubled quotes, CRLF, BOM) ---------- */

export interface ParsedCsv {
  readonly rows: readonly (readonly string[])[];
  readonly unterminatedQuote: boolean;
}

export function parseCsv(input: string): ParsedCsv {
  const text = input.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let touched = false;

  const endField = (): void => {
    row.push(field);
    field = '';
  };
  const endRow = (): void => {
    endField();
    if (!(row.length === 1 && row[0] === '' && !touched)) rows.push(row);
    row = [];
    touched = false;
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charAt(i);
    if (quoted) {
      if (ch === '"') {
        if (text.charAt(i + 1) === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"' && field === '') {
      quoted = true;
      touched = true;
    } else if (ch === ',') {
      touched = true;
      endField();
    } else if (ch === '\r') {
      if (text.charAt(i + 1) !== '\n') endRow();
    } else if (ch === '\n') {
      endRow();
    } else {
      touched = true;
      field += ch;
    }
  }
  if (quoted || field !== '' || row.length > 0 || touched) endRow();
  return { rows, unterminatedQuote: quoted };
}

/* ---------- import ---------- */

export interface ImportOptions {
  readonly idColumn: string;
  readonly nameColumn: string;
  /** glossary term id -> CSV column header */
  readonly featureColumns: Readonly<Record<string, string>>;
  /** Lower-case cell text -> status. Cells not listed here become unknown. */
  readonly valueMap?: Readonly<Record<string, FeatureStatus>>;
  /** Source, open licence and date of the file. Required: no provenance, no import. */
  readonly provenance: Provenance;
  readonly today?: string;
}

export type ImportProblem =
  | 'empty-file'
  | 'unterminated-quote'
  | 'provenance-invalid'
  | `missing-column:${string}`
  | `unknown-term:${string}`;

export type RejectReason = 'wrong-column-count' | 'missing-id' | 'missing-name' | 'duplicate-id';

export interface ImportResult {
  readonly places: readonly Place[];
  /** 1-based line numbers of rows left out, with why. */
  readonly rejected: readonly { readonly line: number; readonly reason: RejectReason }[];
  /** Any problem here means nothing was imported. */
  readonly problems: readonly ImportProblem[];
}

export const DEFAULT_VALUE_MAP: Readonly<Record<string, FeatureStatus>> = {
  present: 'present',
  absent: 'absent',
  unknown: 'unknown',
};

function headerIndex(header: readonly string[], name: string): number {
  const wanted = name.trim().toLowerCase();
  return header.findIndex((h) => h.trim().toLowerCase() === wanted);
}

/**
 * Turns an open-data CSV into places with sourced claims. Cells that are not in the
 * value map become unknown (never guessed). Every present/absent claim carries the
 * file's source, licence and date.
 */
export function importClaims(csv: string, options: ImportOptions): ImportResult {
  const problems: ImportProblem[] = [];
  const parsed = parseCsv(csv);
  if (parsed.unterminatedQuote) problems.push('unterminated-quote');
  if (validateProvenance(options.provenance, options.today).length > 0) problems.push('provenance-invalid');

  const knownTerms = new Set(TERMS.map((t) => t.id));
  for (const termId of Object.keys(options.featureColumns)) {
    if (!knownTerms.has(termId)) problems.push(`unknown-term:${termId}`);
  }

  const [header, ...body] = parsed.rows;
  if (header === undefined) {
    problems.push('empty-file');
    return { places: [], rejected: [], problems };
  }

  const idCol = headerIndex(header, options.idColumn);
  const nameCol = headerIndex(header, options.nameColumn);
  if (idCol === -1) problems.push(`missing-column:${options.idColumn}`);
  if (nameCol === -1) problems.push(`missing-column:${options.nameColumn}`);
  const featureCols: { termId: string; col: number }[] = [];
  for (const [termId, column] of Object.entries(options.featureColumns)) {
    const col = headerIndex(header, column);
    if (col === -1) problems.push(`missing-column:${column}`);
    else featureCols.push({ termId, col });
  }
  if (problems.length > 0) return { places: [], rejected: [], problems };

  const valueMap = options.valueMap ?? DEFAULT_VALUE_MAP;
  const places: Place[] = [];
  const seen = new Set<string>();
  const rejected: { line: number; reason: RejectReason }[] = [];

  body.forEach((cells, i) => {
    const line = i + 2;
    if (cells.length !== header.length) {
      rejected.push({ line, reason: 'wrong-column-count' });
      return;
    }
    const id = (cells[idCol] ?? '').trim();
    const name = (cells[nameCol] ?? '').trim();
    if (id === '') {
      rejected.push({ line, reason: 'missing-id' });
      return;
    }
    if (name === '') {
      rejected.push({ line, reason: 'missing-name' });
      return;
    }
    if (seen.has(id)) {
      rejected.push({ line, reason: 'duplicate-id' });
      return;
    }
    seen.add(id);
    const claims: FeatureClaim[] = featureCols.map(({ termId, col }) => {
      const status = valueMap[(cells[col] ?? '').trim().toLowerCase()] ?? 'unknown';
      return status === 'unknown'
        ? { termId, status }
        : { termId, status, provenance: options.provenance };
    });
    places.push({ id, name, claims });
  });

  return { places, rejected, problems };
}
