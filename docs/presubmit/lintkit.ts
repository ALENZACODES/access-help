/**
 * Shared checks for the tests: banned wording and French typography over every user-facing
 * string the presubmit modules can produce. Banned words are built from fragments so this
 * file does not itself contain them.
 */
import { checkAll } from './batch.js';
import { rec, TODAY } from './fixtures.js';
import { findingText, licenceLine, severityLabel, summaryText } from './messages.js';
import type { FindingCode } from './rules.js';
import { reportCsv, reportText } from './report.js';
import { submissionSteps } from './steps.js';
import { changesetComment, changesetSource } from './tags.js';
import type { PreLang } from './text.js';

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

const CODES: readonly FindingCode[] = [
  'date-invalid', 'date-future', 'source-empty', 'licence-not-open', 'name-too-long', 'outside-ontario', 'low-precision',
  'old-observation', 'name-shouting', 'name-spacing', 'name-contact', 'near-other', 'name-missing', 'status-unknown',
];

/** Every user-facing string the modules can produce, for one language. */
export function allStrings(lang: PreLang): string[] {
  const out: string[] = [];
  for (const code of CODES) {
    for (const extra of [{}, { days: 3, digits: 2, other: 'r2', metres: 7 }, { metres: 1200, other: 'x' }]) {
      out.push(findingText({ recordId: 'a', code, severity: 'look', ...extra }, lang));
    }
  }
  for (const s of ['fix', 'look', 'note', 'clear'] as const) out.push(severityLabel(s, lang));
  for (const s of submissionSteps(lang)) out.push(s.title, s.detail);
  const records = [rec(), rec({ id: 'r2', source: 'field notes', observedOn: '2026-11-03' })];
  for (const list of [[], records]) {
    out.push(summaryText(checkAll(list, TODAY).counts, lang));
    out.push(changesetComment(list, lang), changesetSource(list, lang));
  }
  out.push(reportText(checkAll(records, TODAY), TODAY, lang), reportCsv(checkAll(records, TODAY), lang));
  out.push(licenceLine('CC0-1.0', 1, lang), licenceLine('ODbL-1.0', 3, lang));
  return out.filter((text) => text !== '');
}
