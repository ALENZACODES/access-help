/**
 * Shared checks for the tests: banned wording and French typography over every user-facing
 * string the submissions modules can produce. The banned words are built from fragments so
 * this file does not itself contain them.
 */
import type { ChangesetFailure } from './changeset.js';
import { MAX_ENTRIES, type EntryIssueCode } from './ledger.js';
import { changesetFailureText, entryIssueText, followUpText, restoreFailureText, restoreSummaryText, statusText } from './messages.js';
import { ledgerSummaryText, summarise } from './summary.js';
import type { SubLang } from './text.js';

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

const ISSUE_CODES: readonly EntryIssueCode[] = [
  'date-invalid', 'date-future', 'date-before-seen', 'date-before-marked', 'changeset-not-a-number',
  'changeset-too-long', 'changeset-zero', 'note-too-long', 'ledger-full',
];

/** Every user-facing string the modules can produce, for one language. */
export function allStrings(lang: SubLang): string[] {
  const out: string[] = [];
  for (const code of ISSUE_CODES) out.push(entryIssueText({ field: 'markedOn', code }, lang));
  for (const code of ['not-a-number', 'too-long', 'zero'] as const satisfies readonly Exclude<ChangesetFailure, 'empty'>[]) {
    out.push(changesetFailureText(code, lang));
  }
  out.push(statusText('marked', lang), statusText('not-marked', lang));
  for (const reason of ['never-looked', 'looked-long-ago'] as const) {
    for (const days of [0, 1, 45]) out.push(followUpText({ recordId: 'a', reason, days }, lang));
  }
  for (const code of ['too-large', 'not-json', 'wrong-shape'] as const) out.push(restoreFailureText(code, lang));
  out.push(restoreSummaryText(1, 2, 3, 4, lang));
  const records = [{ id: 'a', name: null, observedOn: '2026-01-01' }];
  out.push(ledgerSummaryText(summarise(records, { version: 1, entries: [] }, '2026-11-16'), lang));
  out.push(ledgerSummaryText(summarise([], { version: 1, entries: [] }, '2026-11-16'), lang));
  out.push(String(MAX_ENTRIES));
  return out.filter((text) => text !== '');
}
