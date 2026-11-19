/**
 * A field sheet to take along, and a CSV to fill in afterwards. The CSV uses the column names
 * the sheet import reads, with status, source, licence and date left empty for the person to
 * fill from what they see. Nothing is filled in for them.
 */
import type { RevisitList } from './list.js';
import { coordinatesText, legText, listSummaryText, orderNoteText, reasonLabel, recordLine } from './messages.js';
import type { VisitOrder } from './order.js';
import { pick, type PreLang } from '../presubmit/text.js';

export function sheetCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",;\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export const FILL_COLUMNS = ['id', 'name', 'status', 'latitude', 'longitude', 'source', 'licence', 'observed_on', 'pack_status', 'pack_observed_on', 'reasons'] as const;

/** One line per stop, in visiting order. status, source, licence and observed_on are empty on purpose. */
export function fillInCsv(order: VisitOrder, lang: PreLang): string {
  const lines = [FILL_COLUMNS.join(',')];
  for (const stop of order.stops) {
    const r = stop.item.place.record;
    lines.push(
      [
        sheetCell(r.id),
        sheetCell(r.name ?? ''),
        '',
        String(r.lat),
        String(r.lon),
        '',
        '',
        '',
        r.wheelchair,
        r.observedOn,
        sheetCell(stop.item.reasons.map((reason) => reasonLabel(reason, lang)).join(' | ')),
      ].join(','),
    );
  }
  return `\ufeff${lines.join('\r\n')}\r\n`;
}

const BOX = '[ ]';

export function fieldSheetText(list: RevisitList, order: VisitOrder, today: string, lang: PreLang): string {
  const unnamed = pick(lang, 'Place without a name', 'Lieu sans nom');
  const lines: string[] = [pick(lang, `Places to revisit, made ${today}`, `Lieux à revoir, liste du ${today}`), listSummaryText(list, lang)];
  const note = orderNoteText(order, lang);
  if (note !== '') lines.push(note);
  lines.push(
    pick(
      lang,
      'Write only what you see yourself. If you cannot tell, leave it as UNKNOWN.',
      'Écrivez seulement ce que vous voyez vous-même. Si vous ne pouvez pas le dire, laissez UNKNOWN.',
    ),
    '',
  );
  for (const stop of order.stops) {
    const r = stop.item.place.record;
    lines.push(`${stop.order}. ${r.name ?? unnamed} (${r.id})`);
    lines.push(`   ${coordinatesText(r, lang)}`);
    const leg = legText(stop, lang);
    if (leg !== '') lines.push(`   ${leg}`);
    lines.push(`   ${recordLine(r, lang)}`);
    lines.push(`   ${pick(lang, 'Why', 'Pourquoi')} - ${stop.item.reasons.map((reason) => reasonLabel(reason, lang)).join(' | ')}`);
    lines.push(`   ${pick(lang, 'Seen today', 'Vu aujourd’hui')} - ${BOX} yes  ${BOX} limited  ${BOX} no  ${BOX} UNKNOWN`);
    lines.push(`   ${pick(lang, 'Date', 'Date')} ____-__-__   ${pick(lang, 'Name on the sign', 'Nom sur l’enseigne')} ________________`);
    lines.push('');
  }
  return lines.join('\n');
}

export function revisitFilename(kind: 'csv' | 'txt', today: string): string {
  return kind === 'csv' ? `places-to-revisit-fill-in-${today}.csv` : `places-to-revisit-${today}.txt`;
}
