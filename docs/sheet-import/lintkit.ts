/**
 * Shared checks for the tests: banned wording and French typography over every user-facing
 * string the sheet-import modules can produce. Banned words are built from fragments so this
 * file does not itself contain them.
 */
import type { SheetFailure } from './csv.js';
import { FIELDS } from './headers.js';
import {
  actionLabel,
  fieldLabel,
  missingColumnsText,
  planSummaryText,
  provenanceLine,
  repeatedColumnsText,
  rowIssueText,
  rowNoteText,
  sheetFailureText,
  tierNoteText,
  unkeptColumnsText,
} from './messages.js';
import type { RowIssueCode } from './row.js';
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

export const FAILURES: readonly SheetFailure[] = ['empty', 'too-large', 'too-many-rows', 'unclosed-quote', 'no-rows'];

export const ISSUE_CODES: readonly RowIssueCode[] = [
  'lat-missing', 'lat-invalid', 'lon-missing', 'lon-invalid', 'source-missing', 'source-too-long', 'licence-missing',
  'licence-not-open', 'date-missing', 'date-invalid', 'date-future', 'name-too-long', 'id-invalid', 'id-repeated',
];

/** Every user-facing string the modules can produce, for one language. */
export function allStrings(lang: PreLang): string[] {
  const out: string[] = [];
  for (const code of FAILURES) out.push(sheetFailureText(code, lang));
  for (const field of FIELDS) out.push(fieldLabel(field, lang));
  for (const code of ISSUE_CODES) out.push(rowIssueText({ field: 'id', code }, lang));
  out.push(rowNoteText({ code: 'status-empty' }, lang), rowNoteText({ code: 'status-unrecognised', value: 'maybe' }, lang), rowNoteText({ code: 'id-made' }, lang));
  for (const action of ['add', 'replace', 'same', 'over-limit', 'rejected'] as const) out.push(actionLabel(action, lang));
  out.push(missingColumnsText(['source', 'licence', 'observedOn'], lang), missingColumnsText(['latitude'], lang));
  out.push(unkeptColumnsText(['Note', 'Phone'], lang), repeatedColumnsText(['lat'], lang));
  out.push(tierNoteText(true, lang), tierNoteText(false, lang));
  out.push(planSummaryText({ rows: 1, add: 1, replace: 0, same: 0, overLimit: 0, rejected: 0 }, lang));
  out.push(planSummaryText({ rows: 9, add: 3, replace: 2, same: 1, overLimit: 2, rejected: 1 }, lang));
  out.push(provenanceLine({ source: 'own visit', licence: 'CC0-1.0', observedOn: '2026-11-01' }, lang));
  return out.filter((text) => text !== '');
}
