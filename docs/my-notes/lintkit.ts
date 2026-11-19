/**
 * Shared checks for the tests: banned wording and French typography over every user-facing
 * string the my-notes modules can produce. Banned words are built from fragments so this
 * file does not itself contain them.
 */
import { NOTE_FIELDS } from './change.js';
import { note, notes } from './fixtures.js';
import { undoLast } from './history.js';
import { changeText, noteFieldLabel, noteLine, notesSummaryLines, observationWarning, shownText, sortLabel, stepText, undoResultText } from './messages.js';
import { SORTS, summariseNotes } from './organise.js';
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
  for (const field of NOTE_FIELDS) out.push(noteFieldLabel(field, lang), changeText({ field, before: 'a', after: 'b' }, lang), changeText({ field, before: '', after: 'b' }, lang));
  for (const sort of SORTS) out.push(sortLabel(sort, lang));
  out.push(observationWarning(lang), shownText(2, 4, lang));
  for (const n of notes()) out.push(noteLine(n, lang));
  out.push(...notesSummaryLines(summariseNotes(notes()), lang), ...notesSummaryLines(summariseNotes([]), lang));
  out.push(stepText({ kind: 'edit', before: note(), after: note() }, lang), stepText({ kind: 'edit', before: note({ name: null }), after: note() }, lang));
  out.push(stepText({ kind: 'remove', removed: [note()] }, lang));
  out.push(undoResultText(undoLast([], [], 200), lang), undoResultText(undoLast([{ kind: 'remove', removed: [note()] }], [], 200), lang));
  out.push(undoResultText(undoLast([{ kind: 'remove', removed: [note(), note({ id: 'n2' })] }], [note({ id: 'k' })], 1), lang));
  out.push(undoResultText(undoLast([{ kind: 'edit', before: note(), after: note({ wheelchair: 'no' }) }], [], 200), lang));
  return out.filter((text) => text !== '');
}
