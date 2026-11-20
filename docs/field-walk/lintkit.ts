/**
 * Shared checks for the tests: banned wording and French typography over every user-facing
 * string the field-walk modules can produce. Banned words are built from fragments so this
 * file does not itself contain them.
 */
import { walkChanges } from './finish.js';
import { complete, fresh, saved, short } from './fixtures.js';
import { answerIssueText, answerText, changeLabel, changeLine, changesSummary, choiceLabel, filledInText, lengthRange, nothingAnsweredText, onSiteNoteText, positionText, progressText, stepQuestion, stepShort, stepTip, unitLabel } from './messages.js';
import { STEP_CHOICES, WALK_STEPS } from './steps.js';
import { goToStep, walkProgress } from './walk.js';
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
  for (const step of WALK_STEPS) {
    out.push(stepQuestion(step, lang), stepTip(step, lang), stepShort(step, lang));
    for (const value of STEP_CHOICES[step] ?? []) out.push(choiceLabel(step, value, lang));
    for (const walk of [fresh(), complete(), short()]) out.push(answerText(walk, step, lang));
  }
  for (const unit of ['cm', 'in'] as const) {
    out.push(unitLabel(unit, lang));
    for (const step of ['stepHeight', 'doorWidth', 'toiletDoor'] as const) out.push(lengthRange(step, unit, lang));
  }
  for (const issue of ['empty', 'not-a-whole-number', 'not-a-length', 'too-small', 'too-large', 'not-a-choice'] as const) out.push(answerIssueText(issue, lang));
  for (const walk of [fresh(), complete(), short(), goToStep(complete(), 'ramp')]) out.push(positionText(walkProgress(walk), lang), progressText(walkProgress(walk), lang));
  for (const kind of ['new', 'changed', 'same', 'cleared'] as const) out.push(changeLabel(kind, lang));
  for (const [before, after] of [[null, saved()], [saved(), saved({ doorWidthCm: 90, ramp: 'yes' })], [saved({ toilet: 'yes' }), saved()]] as const) {
    const changes = walkChanges(before, after);
    out.push(changesSummary(changes, lang), ...changes.map((change) => changeLine(change, lang)));
  }
  out.push(filledInText('2026-11-12', lang), onSiteNoteText(lang), nothingAnsweredText(lang));
  return [...new Set(out.map((text) => text.trim()))].filter((text) => text !== '');
}
