/** A CSV and a plain-text copy of the comparison, made on the device for the person's own notes. */
import type { CompareReport } from './compare.js';
import { compareSummaryText, flagTexts, matchKindText, outcomeAdvice, outcomeLabel, recordLine } from './messages.js';
import { pick, type PreLang } from '../presubmit/text.js';

export function compareCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export const COMPARE_COLUMNS = [
  'my_id', 'my_name', 'my_status', 'my_source', 'my_licence', 'my_observed_on',
  'outcome', 'match', 'metres',
  'pack_id', 'pack_name', 'pack_status', 'pack_source', 'pack_licence', 'pack_observed_on', 'tier',
] as const;

export function compareCsv(report: CompareReport, lang: PreLang): string {
  const lines = [COMPARE_COLUMNS.join(',')];
  for (const item of report.items) {
    const theirs = item.match.best?.record ?? null;
    lines.push(
      [
        compareCell(item.mine.id),
        compareCell(item.mine.name ?? ''),
        item.mine.wheelchair,
        compareCell(item.mine.source),
        item.mine.licence,
        item.mine.observedOn,
        compareCell(outcomeLabel(item.outcome, lang)),
        item.match.kind,
        item.match.best === null ? '' : String(Math.round(item.match.best.metres)),
        compareCell(theirs?.id ?? ''),
        compareCell(theirs?.name ?? ''),
        theirs?.wheelchair ?? '',
        compareCell(theirs?.source ?? ''),
        theirs?.licence ?? '',
        theirs?.observedOn ?? '',
        'UNKNOWN',
      ].join(','),
    );
  }
  return `\ufeff${lines.join('\r\n')}\r\n`;
}

export function compareText(report: CompareReport, today: string, lang: PreLang): string {
  const unnamed = pick(lang, 'Place without a name', 'Lieu sans nom');
  const lines: string[] = [pick(lang, `My notes beside the packs, ${today}`, `Mes notes à côté des paquets, ${today}`), compareSummaryText(report, lang), ''];
  for (const item of report.items) {
    lines.push(`${item.mine.name ?? unnamed} (${item.mine.id})`);
    lines.push(`  ${outcomeLabel(item.outcome, lang)}`);
    lines.push(`  ${pick(lang, 'Mine', 'La mienne')} - ${recordLine(item.mine, lang)}`);
    const theirs = item.match.best?.record ?? null;
    if (theirs !== null) lines.push(`  ${pick(lang, 'Pack', 'Paquet')} - ${theirs.name ?? unnamed} (${theirs.id}) - ${recordLine(theirs, lang)}`);
    lines.push(`  ${matchKindText(item.match.kind, lang)}`);
    for (const flag of flagTexts(item, lang)) lines.push(`  ${flag}`);
    lines.push(`  ${outcomeAdvice(item.outcome, lang)}`);
    lines.push('');
  }
  return `${lines.join('\n')}`;
}

export function compareFilename(kind: 'csv' | 'txt', today: string): string {
  return `my-notes-beside-packs-${today}.${kind}`;
}
