/**
 * Shared checks for the tests: banned wording and French typography over every user-facing
 * string the day-log modules can produce. Banned words are built from fragments so this
 * file does not itself contain them.
 */
import { longDay, monthName, weekdayNames } from './calendar.js';
import { buildDayLog, logTotals } from './days.js';
import { sample } from './fixtures.js';
import { calendarCellText, dayCountText, dayHeading, dayStatLines, gapText, logNoteLine, spanText, totalsLines } from './messages.js';
import { dayReportText } from './report.js';
import type { PreLang } from '../presubmit/text.js';

const FRAGMENTS: readonly (readonly string[])[] = [
  ['ver', 'ified'],
  ['ver', 'ify'],
  ['vér', 'ifié'],
  ['vér', 'ifier'],
  ['real', '-time'],
  ['real', ' time'],
  ['temps ', 'réel'],
  ['partner', 'ship'],
  ['partenar', 'iat'],
  ['guaran', 'tee'],
  ['garan', 'tie'],
  ['garan', 'ti'],
  ['certi', 'fied'],
  ['certi', 'fié'],
  ['accep', 'ted by'],
  ['reçu par', ' OpenStreetMap'],
];

const BANNED = FRAGMENTS.map((parts) => parts.join('').toLowerCase());

/** Returns the banned words found in the text, case-insensitively. */
export function bannedIn(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED.filter((word) => lower.includes(word));
}

/** French rules: typographic apostrophe, NBSP before ":" and "%", NNBSP before ; ! ?, no straight quotes. */
export function frenchIssues(text: string): string[] {
  const issues: string[] = [];
  if (/«(?!\u202f)|(?<!\u202f)»/.test(text)) issues.push('« » without narrow no-break spaces inside');
  if (/\p{L}'\p{L}/u.test(text)) issues.push('straight apostrophe');
  if (/(?<=[^\u00a0\n]):(?=\s|$)/.test(text)) issues.push('colon without no-break space');
  if (/(?<=[^\u202f\n])[;!?]/.test(text)) issues.push('; ! or ? without narrow no-break space');
  if (/(?<=\d)%/.test(text)) issues.push('percent without no-break space');
  if (/"/.test(text)) issues.push('straight double quote');
  return issues;
}

/** Every user-facing string the modules can produce, for one language. */
export function allStrings(lang: PreLang): string[] {
  const out: string[] = [];
  const dayLog = buildDayLog(sample());
  for (const group of dayLog.days) {
    out.push(dayHeading(group.day, lang), ...dayStatLines(group, lang), ...dayReportText(group, 'windy', lang).split('\n'));
    for (const note of group.notes) out.push(logNoteLine(note, lang));
  }
  out.push(...totalsLines(logTotals(dayLog), lang), ...totalsLines(logTotals(buildDayLog([])), lang));
  out.push(gapText(null, lang), gapText(1, lang), gapText(40, lang), spanText(250, 3, lang), spanText(12000, 2, lang));
  out.push(dayCountText(1, lang), dayCountText(7, lang), calendarCellText(3, 2, lang));
  for (let month = 1; month <= 12; month += 1) out.push(monthName({ year: 2026, month }, lang));
  out.push(...weekdayNames(lang), longDay('2026-11-01', lang), longDay('2026-08-15', lang));
  return [...new Set(out.map((text) => text.trim()))].filter((text) => text !== '');
}
