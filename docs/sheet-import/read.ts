/** One call from the text of a sheet to checked rows. Pure. */
import { parseSheet, type Delimiter, type SheetFailure } from './csv.js';
import { headersUsable, mapHeaders, type HeaderMap } from './headers.js';
import { parseRows, type ParsedRow } from './row.js';

export type ReadSheetResult =
  | { ok: true; delimiter: Delimiter; headers: HeaderMap; rows: ParsedRow[]; blankLines: number }
  | { ok: false; reason: 'file'; code: SheetFailure }
  | { ok: false; reason: 'headers'; headers: HeaderMap };

export function readSheet(text: string, today: string): ReadSheetResult {
  const sheet = parseSheet(text);
  if (!sheet.ok) return { ok: false, reason: 'file', code: sheet.code };
  const headers = mapHeaders(sheet.table.header);
  if (!headersUsable(headers)) return { ok: false, reason: 'headers', headers };
  return {
    ok: true,
    delimiter: sheet.table.delimiter,
    headers,
    rows: parseRows(sheet.table.rows, headers, today),
    blankLines: sheet.table.blankLines,
  };
}
