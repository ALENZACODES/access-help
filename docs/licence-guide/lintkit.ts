/**
 * Shared checks for the tests: banned wording and French typography over every user-facing
 * string the licence-guide modules can produce. Banned words are built from fragments so this
 * file does not itself contain them.
 */
import { lic, mixed, TODAY } from './fixtures.js';
import { buildLicenceGuide, guideText } from './guide.js';
import { countText, dutyText, mixExplanation, mixLabel } from './messages.js';
import type { LicensedRecord } from './mix.js';
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
  for (const kind of ['empty', 'cc0-only', 'odbl-only', 'cc0-and-odbl', 'has-other'] as const) out.push(mixLabel(kind, lang), mixExplanation(kind, lang));
  for (const duty of ['credit-sources', 'same-licence', 'keep-open', 'do-not-share-yet'] as const) out.push(dutyText(duty, lang));
  out.push(countText({ licence: 'CC-BY-4.0', count: 1, accepted: false }, lang));
  const sets: LicensedRecord[][] = [[], [lic()], mixed(), [...mixed(), lic({ id: 'x', licence: 'CC-BY-4.0' })]];
  for (const records of sets) {
    const guide = buildLicenceGuide(records, lang);
    out.push(guide.label, guide.explanation, guide.summary, ...guide.duties, guide.notAdvice, guide.osmNote);
    out.push(...guide.credits.split('\n'), ...guideText(guide, TODAY, lang).split('\n'));
    for (const facts of guide.facts) out.push(facts.inShort, ...facts.youMay, ...facts.youMust, ...facts.goodToKnow);
    for (const q of guide.questions) out.push(q.question, q.answer);
  }
  return [...new Set(out.map((text) => text.trim()))].filter((text) => text !== '');
}
