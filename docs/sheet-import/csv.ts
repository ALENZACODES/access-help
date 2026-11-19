/**
 * Reads the text of a spreadsheet file a person saved as CSV. Pure: no network, no storage,
 * no clock. Handles quoted cells, doubled quotes, line breaks inside quotes, a byte order
 * mark, and the three separators spreadsheets write (comma, semicolon, tab).
 */
export const MAX_SHEET_CHARACTERS = 400_000;
export const MAX_SHEET_ROWS = 500;
export const MAX_CELL_CHARACTERS = 500;

export type Delimiter = ',' | ';' | '\t';

export type SheetFailure = 'empty' | 'too-large' | 'too-many-rows' | 'unclosed-quote' | 'no-rows';

export interface SheetTable {
  delimiter: Delimiter;
  header: string[];
  /** Data rows, each with the line it started on (1 is the header line). */
  rows: { line: number; cells: string[] }[];
  /** Lines that were blank and skipped. */
  blankLines: number;
}

export type SheetResult = { ok: true; table: SheetTable } | { ok: false; code: SheetFailure };

const DELIMITERS: readonly Delimiter[] = [',', ';', '\t'];

/** Picks the separator that appears most often outside quotes on the first line. Comma wins a tie. */
export function detectDelimiter(text: string): Delimiter {
  const counts: Record<Delimiter, number> = { ',': 0, ';': 0, '\t': 0 };
  let quoted = false;
  for (const ch of text) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && (ch === '\n' || ch === '\r')) break;
    else if (!quoted && (ch === ',' || ch === ';' || ch === '\t')) counts[ch] += 1;
  }
  let best: Delimiter = ',';
  for (const d of DELIMITERS) if (counts[d] > counts[best]) best = d;
  return best;
}

interface RawRow {
  line: number;
  cells: string[];
}

/** Splits text into rows of cells. Returns null when a quote is never closed. */
export function splitRows(text: string, delimiter: Delimiter): RawRow[] | null {
  const rows: RawRow[] = [];
  let cells: string[] = [];
  let cell = '';
  let quoted = false;
  let line = 1;
  let rowLine = 1;
  let i = 0;
  const endCell = () => {
    cells.push(cell);
    cell = '';
  };
  const endRow = () => {
    endCell();
    rows.push({ line: rowLine, cells });
    cells = [];
  };
  while (i < text.length) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        quoted = false;
      } else {
        if (ch === '\n') line += 1;
        cell += ch;
      }
      i += 1;
      continue;
    }
    if (ch === '"' && cell === '') {
      quoted = true;
    } else if (ch === delimiter) {
      endCell();
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      endRow();
      line += 1;
      rowLine = line;
    } else {
      cell += ch;
    }
    i += 1;
  }
  if (quoted) return null;
  if (cell !== '' || cells.length > 0) endRow();
  return rows;
}

function isBlank(cells: readonly string[]): boolean {
  return cells.every((c) => c.trim() === '');
}

export function parseSheet(input: string): SheetResult {
  if (input.length > MAX_SHEET_CHARACTERS) return { ok: false, code: 'too-large' };
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  if (text.trim() === '') return { ok: false, code: 'empty' };
  const delimiter = detectDelimiter(text);
  const raw = splitRows(text, delimiter);
  if (raw === null) return { ok: false, code: 'unclosed-quote' };
  const kept = raw.filter((row) => !isBlank(row.cells));
  const blankLines = raw.length - kept.length;
  const [first, ...rest] = kept;
  if (first === undefined || rest.length === 0) return { ok: false, code: 'no-rows' };
  if (rest.length > MAX_SHEET_ROWS) return { ok: false, code: 'too-many-rows' };
  return {
    ok: true,
    table: {
      delimiter,
      header: first.cells.map((c) => c.trim()),
      rows: rest.map((row) => ({ line: row.line, cells: row.cells.map((c) => c.trim().slice(0, MAX_CELL_CHARACTERS)) })),
      blankLines,
    },
  };
}
