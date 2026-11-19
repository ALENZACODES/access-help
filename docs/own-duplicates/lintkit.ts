/**
 * Shared checks for the tests: banned wording and French typography over every user-facing
 * string the own-duplicates modules can produce. Banned words are built from fragments so this
 * file does not itself contain them.
 */
import { adviseGroup, reportGroups } from './advise.js';
import { near, own } from './fixtures.js';
import { groupNotes } from './groups.js';
import { cautionTexts, kindAdvice, kindLabel, linkText, ownNoteLine, reportSummaryText } from './messages.js';
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
  for (const kind of ['same', 'status-differs', 'only-unknown-differs', 'details-differ'] as const) out.push(kindLabel(kind, lang), kindAdvice(kind, lang));
  out.push(linkText({ a: 'a', b: 'b', metres: 11, reason: 'same-name-close' }, lang), linkText({ a: 'a', b: 'b', metres: 1200, reason: 'no-name-close' }, lang));
  out.push(ownNoteLine(own(), lang), ownNoteLine(near({ wheelchair: 'UNKNOWN' }), lang));
  const notes = [own(), near({ licence: 'ODbL-1.0', name: null })];
  const groups = groupNotes(notes);
  for (const group of groups) out.push(...cautionTexts(adviseGroup(group), lang));
  out.push(reportSummaryText(reportGroups(groups, 2, 25), lang), reportSummaryText(reportGroups([], 3, 50), lang), reportSummaryText(reportGroups([], 0, 10), lang));
  return out.filter((text) => text !== '');
}
