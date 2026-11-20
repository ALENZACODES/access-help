/**
 * Shared checks for the tests: banned wording and French typography over every user-facing
 * string the place-card modules can produce. Banned words are built from fragments so this
 * file does not itself contain them.
 */
import { bare, card, measured } from './fixtures.js';
import { besideRows, buildFailureText, cardFailureText, cardNoteText, cardText, nearText, notNearText, otherPersonText, receiveIssueText, receivedCountText, shareNoteText } from './messages.js';
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
  for (const sample of [card(), bare(), card({ withTold: false, from: '' }), card({ withPoint: false })]) {
    out.push(...cardText(sample, lang).split('\n'), notNearText(sample, lang));
    for (const yours of [measured(), measured({ doorWidthCm: 90, steps: 3 }), measured({ doorWidthCm: 70 }), null]) {
      for (const row of besideRows(yours, sample, lang)) out.push(row.fact, row.yours, row.theirs, row.note);
    }
  }
  for (const code of ['licence-not-open', 'date-invalid'] as const) out.push(buildFailureText(code, lang));
  for (const code of ['too-large', 'not-json', 'not-a-card', 'unsupported-version', 'bad-place', 'licence-not-open'] as const) out.push(cardFailureText(code, lang));
  for (const note of ['status-set-unknown', 'point-left-out', 'point-outside-ontario', 'measures-left-out', 'told-left-out'] as const) out.push(cardNoteText(note, lang));
  for (const issue of ['already-here', 'too-many', 'date-invalid'] as const) out.push(receiveIssueText(issue, lang));
  out.push(nearText({ id: 'a', name: 'Sample Library', metres: 12, sameName: true }, lang), nearText({ id: 'a', name: null, metres: 60, sameName: false }, lang));
  out.push(otherPersonText(lang), receivedCountText(0, lang), receivedCountText(3, lang), shareNoteText(lang));
  return [...new Set(out.map((text) => text.trim()))].filter((text) => text !== '');
}
