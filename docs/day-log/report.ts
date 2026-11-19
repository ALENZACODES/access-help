/** A plain-text page for one day and a CSV with one line per day, made on the device. */
import type { DayGroup, DayLog } from './days.js';
import { LOG_STATUSES } from './days.js';
import { dayHeading, dayStatLines, logNoteLine } from './messages.js';
import { pick, type PreLang } from '../presubmit/text.js';

export function logCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** One day as text. The person's own day note is included only when they pass it in. */
export function dayReportText(group: DayGroup, dayNote: string, lang: PreLang): string {
  const unnamed = pick(lang, 'Place without a name', 'Lieu sans nom');
  const lines: string[] = [dayHeading(group.day, lang), ...dayStatLines(group, lang)];
  if (dayNote.trim() !== '') lines.push('', pick(lang, 'My note for the day', 'Ma note pour la journée'), dayNote.trim());
  lines.push('');
  for (const note of group.notes) {
    lines.push(`${note.name ?? unnamed} (${note.id})`);
    lines.push(`  ${logNoteLine(note, lang)}`);
  }
  return `${lines.join('\n')}\n`;
}

export const DAYS_COLUMNS = ['day', 'observations', ...LOG_STATUSES, 'unnamed', 'licences', 'sources', 'span_metres'] as const;

export function daysCsv(log: DayLog): string {
  const lines = [DAYS_COLUMNS.join(',')];
  for (const group of [...log.days].reverse()) {
    const s = group.stats;
    lines.push(
      [
        group.day,
        String(s.total),
        ...LOG_STATUSES.map((status) => String(s.byStatus[status])),
        String(s.unnamed),
        logCell(s.licences.map((l) => `${l.licence} ${l.count}`).join(' | ')),
        logCell(s.sources.join(' | ')),
        String(Math.round(s.spanMetres)),
      ].join(','),
    );
  }
  return `\ufeff${lines.join('\r\n')}\r\n`;
}

export function dayReportFilename(day: string): string {
  return `my-day-${day}.txt`;
}

export function daysCsvFilename(today: string): string {
  return `my-days-${today}.csv`;
}
