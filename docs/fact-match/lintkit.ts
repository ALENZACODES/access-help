/**
 * Shared checks for the tests: banned wording and French typography over every user-facing
 * string the fact-match modules can produce. Banned words are built from fragments so this
 * file does not itself contain them.
 */
import { emptyCriteria, CRITERION_KEYS } from './criteria.js';
import { m, sample, simple, strict, TODAY } from './fixtures.js';
import { matchPlace } from './match.js';
import { checkText, criteriaIssueText, criterionShort, criterionText, matchCountsText, noCriteriaText, overallLabel, setIssueText, tallyLine, toldCountedText, unknownText, yoursText } from './messages.js';
import { matchText, runMatch } from './report.js';
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
  const sets = [simple(), strict(), strict({ countTold: true }), strict({ rampInstead: false, door: 'by-itself', maxSteps: 0 }), simple({ maxSteps: 2 }), emptyCriteria()];
  for (const criteria of sets) {
    out.push(...matchText(runMatch(sample(), criteria), criteria, TODAY, lang).split('\n'));
    for (const key of CRITERION_KEYS) out.push(criterionText(key, criteria, lang), criterionShort(key, lang));
  }
  const cases = [m('x', { steps: 0, doorWidthCm: 80 }), m('x', { steps: 4, stepHeightCm: 20, ramp: 'yes', doorWidthCm: 70, doorOpening: 'manual', toilet: 'no' }), m('x', { steps: 1, stepHeightCm: 5, doorOpening: 'button', toilet: 'yes', toiletDoorCm: 80 }), m('x', { stepHeightCm: 9 })];
  for (const measures of cases) {
    for (const criteria of [strict(), strict({ rampInstead: false }), strict({ countTold: true })]) {
      for (const [mine, theirs] of [[measures, null], [null, measures]] as const) {
        const result = matchPlace('x', criteria, mine, theirs);
        out.push(overallLabel(result.overall, lang), unknownText(result, lang), ...result.checks.map((check) => checkText(check, criteria, lang)));
      }
    }
  }
  for (const overall of ['fits', 'does-not-fit', 'cannot-say', 'no-criteria'] as const) out.push(overallLabel(overall, lang));
  for (const code of ['not-a-whole-number', 'not-a-length', 'too-small', 'too-large'] as const) out.push(criteriaIssueText({ field: 'maxSteps', code }, lang));
  for (const issue of ['name-empty', 'nothing-set', 'too-many'] as const) out.push(setIssueText(issue, lang));
  out.push(matchCountsText({ total: 4, fits: 1, doesNotFit: 1, cannotSay: 2 }, lang), tallyLine({ key: 'doorWidth', places: 1 }, lang), tallyLine({ key: 'toilet', places: 3 }, lang));
  out.push(yoursText(lang), toldCountedText(lang), noCriteriaText(lang));
  return [...new Set(out.map((text) => text.trim()))].filter((text) => text !== '');
}
