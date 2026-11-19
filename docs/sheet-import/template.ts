/** An empty sheet a person can fill in, and the round trip from saved observations back to a sheet. */
import type { SheetRecord } from './row.js';
import { pick, type PreLang } from '../presubmit/text.js';

export const TEMPLATE_COLUMNS_EN = ['id', 'name', 'status', 'latitude', 'longitude', 'source', 'licence', 'observed_on'] as const;
export const TEMPLATE_COLUMNS_FR = ['id', 'nom', 'etat', 'latitude', 'longitude', 'source', 'licence', 'vu_le'] as const;

/** A cell that cannot run as a formula in a spreadsheet, quoted when needed. */
export function sheetCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",;\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function templateColumns(lang: PreLang): readonly string[] {
  return pick<readonly string[]>(lang, TEMPLATE_COLUMNS_EN, TEMPLATE_COLUMNS_FR);
}

/** Header line and one made-up example line. The example says it is an example in its own name and source. */
export function templateSheet(lang: PreLang, today: string): string {
  const example = [
    'example-1',
    pick(lang, 'Example place (delete this line)', 'Lieu exemple (supprimez cette ligne)'),
    'UNKNOWN',
    '43.65000',
    '-79.38000',
    pick(lang, 'example, not a real visit', 'exemple, pas une vraie visite'),
    'CC0-1.0',
    today,
  ];
  return `\ufeff${templateColumns(lang).join(',')}\r\n${example.map(sheetCell).join(',')}\r\n`;
}

export function recordsSheet(records: readonly SheetRecord[], lang: PreLang): string {
  const lines = [templateColumns(lang).join(',')];
  for (const r of records) {
    lines.push(
      [sheetCell(r.id), sheetCell(r.name ?? ''), r.wheelchair, String(r.lat), String(r.lon), sheetCell(r.source), r.licence, r.observedOn].join(','),
    );
  }
  return `\ufeff${lines.join('\r\n')}\r\n`;
}

export function templateFilename(lang: PreLang): string {
  return pick(lang, 'my-observations-template.csv', 'mes-observations-modele.csv');
}
