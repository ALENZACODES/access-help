/** A plain-text report and a CSV of the findings, made on the device for the person's own notes. */
import type { CheckReport } from './batch.js';
import { findingText, licenceLine, severityLabel, summaryText } from './messages.js';
import { tagLines } from './tags.js';
import { colon, pick, type PreLang } from './text.js';

/** A cell that cannot run as a formula in a spreadsheet, quoted when needed. */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export const REPORT_COLUMNS = ['id', 'name', 'group', 'finding', 'tags'] as const;

export function reportCsv(report: CheckReport, lang: PreLang): string {
  const header = REPORT_COLUMNS.join(',');
  const rows: string[] = [];
  for (const item of report.items) {
    const name = item.record.name ?? '';
    const tags = tagLines(item.tags).join(' | ');
    const group = severityLabel(item.worst, lang);
    if (item.findings.length === 0) rows.push([item.record.id, name, group, '', tags].map(csvCell).join(','));
    for (const finding of item.findings) {
      rows.push([item.record.id, name, severityLabel(finding.severity, lang), findingText(finding, lang), tags].map(csvCell).join(','));
    }
  }
  return `${[header, ...rows].join('\r\n')}\r\n`;
}

export function reportText(report: CheckReport, today: string, lang: PreLang): string {
  const lines: string[] = [pick(lang, `Check before you submit, ${today}`, `Contrôle avant soumission, ${today}`), summaryText(report.counts, lang), ''];
  for (const entry of report.byLicence) lines.push(licenceLine(entry.licence, entry.count, lang));
  if (report.byLicence.length > 0) lines.push('');
  for (const item of report.items) {
    lines.push(`${item.record.name ?? pick(lang, 'Place without a name', 'Lieu sans nom')} (${item.record.id})${colon(lang)}${severityLabel(item.worst, lang)}`);
    for (const finding of item.findings) lines.push(`  - ${findingText(finding, lang)}`);
    for (const tag of tagLines(item.tags)) lines.push(`  ${tag}`);
  }
  return `${lines.join('\n')}\n`;
}

export function reportFilename(kind: 'csv' | 'txt', today: string): string {
  return `check-before-submit-${today}.${kind}`;
}
