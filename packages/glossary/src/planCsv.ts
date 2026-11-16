import { findingsList } from './outingMessage';
import type { PlanEntry } from './plan';
import type { Lang } from './plainTerms';

/**
 * The visit plan as a spreadsheet file (CSV). Place names come from open data and the person's own list, so
 * every cell is made safe to open in a spreadsheet: a cell that starts with a formula character gets a leading
 * apostrophe, and quotes are doubled. The file starts with a byte-order mark so accents show correctly.
 */
export const CSV_UI = {
  en: {
    columns: ['Place', 'Question to ask', 'Status', 'Why we ask'] as const,
    asked: 'Asked',
    toAsk: 'To ask',
    exportCsv: 'Copy plan as a spreadsheet file',
  },
  fr: {
    columns: ['Lieu', 'Question à poser', 'État', 'Pourquoi nous demandons'] as const,
    asked: 'Posée',
    toAsk: 'À poser',
    exportCsv: 'Copier le plan en fichier tableur',
  },
} as const;

export const CSV_MIME = 'text/csv;charset=utf-8';
export const BOM = String.fromCharCode(0xfeff);
const FORMULA_START = /^[=+\-@\t\r]/;

/** A single cell: formula starts made harmless, then quoted when it has a comma, quote, or line break. */
export function csvCell(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function csvRow(cells: readonly string[]): string {
  return cells.map(csvCell).join(',');
}

export function csvFilename(lang: Lang): string {
  return `visit-plan-${lang}.csv`;
}

/** Header plus one row per question, CRLF line ends, a final line end. An empty plan is the header alone. */
export function planToCsv(entries: readonly PlanEntry[], lang: Lang): string {
  const ui = CSV_UI[lang];
  const rows: string[] = [csvRow(ui.columns)];
  for (const entry of entries) {
    for (const item of entry.items) {
      rows.push(csvRow([entry.name, item.question, item.asked ? ui.asked : ui.toAsk, findingsList([item.reason], lang)]));
    }
  }
  return `${BOM}${rows.join('\r\n')}\r\n`;
}
