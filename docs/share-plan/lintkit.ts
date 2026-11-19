/**
 * Shared checks for the tests: banned wording and French typography over every user-facing
 * string the share-plan modules can produce. Banned words are built from fragments so this
 * file does not itself contain them.
 */
import { CHECK_IDS, type CheckId } from './checklist.js';
import { awkward, manySources, mixed, rec, TODAY } from './fixtures.js';
import { checklistProgress, creditAskedText, scopeCountText, splitAdvice, splitKindLabel } from './messages.js';
import { buildNotice, noticeHint } from './notice.js';
import { buildSharePlan, sharePlanText } from './report.js';
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
  const all: readonly CheckId[] = CHECK_IDS;
  for (const records of [mixed(), awkward(), [rec()], [rec({ licence: 'ODbL-1.0' })], manySources(7), manySources(7, 'CC0-1.0'), []]) {
    for (const form of ['short', 'full'] as const) {
      const plan = buildSharePlan(records, lang, form);
      out.push(...sharePlanText(plan, [], TODAY, lang).split('\n'), ...sharePlanText(plan, all, TODAY, lang).split('\n'));
      out.push(...plan.checklist.flatMap((item) => [item.text, item.why]), noticeHint(plan.notice, lang), ...plan.notice.text.split('\n'));
      out.push(checklistProgress([], plan.checklist, lang));
    }
  }
  const long = manySources(4).map((r, i) => ({ ...r, source: `A source with quite a long name to push the notice past its short length, number ${i}` }));
  out.push(noticeHint(buildNotice(long, lang, 'short'), lang));
  for (const kind of ['nothing', 'one-file', 'two-files'] as const) out.push(splitKindLabel(kind, lang), splitAdvice(kind, lang));
  out.push(creditAskedText({ accepted: false, creditAsked: false }, lang), creditAskedText({ accepted: true, creditAsked: true }, lang), creditAskedText({ accepted: true, creditAsked: false }, lang));
  out.push(scopeCountText(0, lang), scopeCountText(1, lang), scopeCountText(12, lang));
  return [...new Set(out.map((text) => text.trim()))].filter((text) => text !== '');
}
