/**
 * Shared checks for the tests: banned wording and French typography over every user-facing
 * string the place-measures modules can produce. Banned words are built from fragments so this
 * file does not itself contain them.
 */
import { describeMeasures } from './describe.js';
import { flat, full, place, sparse } from './fixtures.js';
import type { FormIssueCode } from './form.js';
import { emptyMeasures, FACT_KEYS } from './measures.js';
import { descriptionNote, factLabel, factValue, formIssueText, measuredCountText, methodText, noJudgmentText, rangeHint, stillUnknownText, tagsNoteText } from './messages.js';
import { measureSheetText } from './sheet.js';
import type { PreLang } from '../presubmit/text.js';

const ISSUE_CODES: readonly FormIssueCode[] = ['date-invalid', 'date-future', 'date-before-seen', 'not-a-whole-number', 'not-a-length', 'too-small', 'too-large', 'height-without-steps', 'toilet-door-without-toilet', 'nothing-measured'];

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
  const sets = [full(), sparse(), flat(), full({ method: null, steps: 1, stepHeightCm: null }), full({ method: 'estimate' }), sparse({ doorWidthCm: null, stepHeightCm: 9 }), sparse({ doorWidthCm: null, toiletDoorCm: 90 }), full({ toiletDoorCm: null, doorOpening: 'manual', ramp: 'yes' }), emptyMeasures('a1', '2026-11-12')];
  for (const measures of sets) {
    out.push(...measureSheetText(place(), measures, lang).split('\n'), ...measureSheetText(place({ name: null, wheelchair: 'maybe', source: ' ' }), measures, lang).split('\n'));
    for (const key of FACT_KEYS) out.push(factLabel(key, lang), factValue(measures, key, lang));
    out.push(methodText(measures, lang), stillUnknownText(measures, lang), descriptionNote(describeMeasures(measures, lang), lang));
  }
  out.push(descriptionNote({ text: 'x', length: 300, tooLong: true }, lang));
  for (const code of ISSUE_CODES) out.push(formIssueText({ field: 'steps', code }, lang));
  for (const field of ['stepHeightCm', 'doorWidthCm', 'toiletDoorCm'] as const) out.push(rangeHint(field, lang));
  out.push(noJudgmentText(lang), tagsNoteText(lang), measuredCountText(2, 5, lang), measuredCountText(0, 0, lang));
  // Tag lines are data an editor reads: "key=value".
  return [...new Set(out.map((text) => text.trim()))].filter((text) => text !== '' && !/^[\w:]+=/.test(text));
}
