/**
 * Shared checks for the tests: banned wording and French typography over every user-facing
 * string the compare-notes modules can produce. Banned words are built from fragments so this
 * file does not itself contain them.
 */
import { compareAll, OUTCOME_ORDER } from './compare.js';
import { mine, pack, TODAY } from './fixtures.js';
import { compareSummaryText, flagTexts, matchKindText, newerText, outcomeAdvice, outcomeLabel, recordLine } from './messages.js';
import { compareText } from './report.js';
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
  for (const outcome of OUTCOME_ORDER) out.push(outcomeLabel(outcome, lang), outcomeAdvice(outcome, lang));
  for (const kind of ['none', 'same-id', 'name-and-place', 'place-only', 'unsure'] as const) out.push(matchKindText(kind, lang));
  out.push(newerText('mine', 1, lang), newerText('theirs', 12, lang), newerText('same-day', 0, lang));
  out.push(recordLine(mine(), lang), recordLine(pack({ wheelchair: 'UNKNOWN' }), lang));
  const report = compareAll([mine(), mine({ id: 'p9', lat: 43.9, name: 'Other Name' }), mine({ id: 'm3', lat: 44.5 })], [pack(), pack({ id: 'p9', lat: 43.9001 })]);
  for (const item of report.items) out.push(...flagTexts(item, lang));
  out.push(compareSummaryText(report, lang), compareSummaryText(compareAll([], []), lang), compareSummaryText(compareAll([mine()], []), lang));
  out.push(...compareText(report, TODAY, lang).split('\n').map((line) => line.trim()));
  return out.filter((text) => text !== '');
}
