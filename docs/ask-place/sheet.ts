/** Writes what a place said, beside what the person measured, as a plain text sheet; and the list of asks as CSV. */
import { compareFacts } from './compare.js';
import { askCountsText, askLine, compareLabel, compareSummary, differenceText, toldNoteText } from './messages.js';
import { askCounts, daysWaiting, type AskEntry } from './log.js';
import { questionShort } from './questions.js';
import { factValue, placeLine, type MeasuredPlace, type Measures } from '../place-measures/index.js';
import { colon, pick, type PreLang } from '../presubmit/text.js';

function nameOf(place: MeasuredPlace, lang: PreLang): string {
  return place.name === null || place.name.trim() === '' ? pick(lang, 'Place without a name', 'Lieu sans nom') : place.name.trim();
}

export interface AskSheetInput {
  place: MeasuredPlace;
  measured: Measures | null;
  told: Measures | null;
  asks: readonly AskEntry[];
}

export function askSheetText(input: AskSheetInput, today: string, lang: PreLang): string {
  const c = colon(lang);
  const lines: string[] = [pick(lang, `Asked and answered: ${nameOf(input.place, lang)}`, `Demandes et réponses\u00a0: ${nameOf(input.place, lang)}`), placeLine(input.place, lang), toldNoteText(lang), ''];
  lines.push(pick(lang, 'Your asks', 'Vos demandes'), askCountsText(askCounts(input.asks), lang));
  input.asks.forEach((entry, index) => lines.push(`${index + 1}. ${askLine(entry, today, lang)}`));
  lines.push('', pick(lang, 'What you measured and what the place said', 'Ce que vous avez mesuré et ce que le lieu a dit'));
  if (input.told !== null) lines.push(`${pick(lang, 'The place answered on', 'Le lieu a répondu le')}${c}${input.told.measuredOn}.`);
  if (input.measured !== null) lines.push(`${pick(lang, 'You measured on', 'Vous avez mesuré le')}${c}${input.measured.measuredOn}.`);
  const rows = compareFacts(input.measured, input.told);
  for (const row of rows) {
    const mine = input.measured === null ? 'UNKNOWN' : factValue(input.measured, row.key, lang);
    const theirs = input.told === null ? 'UNKNOWN' : factValue(input.told, row.key, lang);
    const note = differenceText(row, lang);
    lines.push(`- ${questionShort(row.key, lang)} | ${pick(lang, 'you', 'vous')}${c}${mine} | ${pick(lang, 'the place', 'le lieu')}${c}${theirs} | ${compareLabel(row.kind, lang)}${note === '' ? '' : `. ${note}`}`);
  }
  lines.push(compareSummary(rows, lang));
  return `${lines.join('\n')}\n`;
}

export function askSheetFilename(place: Pick<MeasuredPlace, 'id'>): string {
  const safe = place.id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `asked-${safe === '' ? 'observation' : safe}.txt`;
}

export const ASK_COLUMNS = ['id', 'name', 'asked_on', 'channel', 'questions', 'status', 'closed_on', 'days_waiting'] as const;

function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** One line per ask for a saved observation. Column names and values are plain ASCII words. */
export function asksCsv(places: readonly MeasuredPlace[], entries: readonly AskEntry[], today: string): string {
  const byId = new Map(places.map((place) => [place.id, place]));
  const lines = [ASK_COLUMNS.join(',')];
  for (const entry of entries) {
    const place = byId.get(entry.recordId);
    if (place === undefined) continue;
    const waiting = daysWaiting(entry, today) ?? '';
    lines.push([place.id, place.name === null ? '' : place.name.trim(), entry.askedOn, entry.channel, entry.questions.join(' '), entry.status, entry.closedOn ?? '', waiting].map(csvCell).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}

export function asksCsvFilename(today: string): string {
  return `asks-${today}.csv`;
}
