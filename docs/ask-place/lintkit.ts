/**
 * Shared checks for the tests: banned wording and French typography over every user-facing
 * string the ask-place modules can produce. Banned words are built from fragments so this
 * file does not itself contain them.
 */
import { compareFacts } from './compare.js';
import { letterInput, measured, place, sampleLog, told, TODAY } from './fixtures.js';
import { buildLetter, letterFileText, subjectLine, CHANNELS, LETTER_LANGUAGES } from './letter.js';
import { askCounts, setAskStatus, ASK_STATUSES } from './log.js';
import { askCountsText, askIssueText, askLine, channelLabel, compareLabel, compareSummary, differenceText, letterLanguageLabel, letterNote, privacyNoteText, statusLabel, toldNoteText } from './messages.js';
import { howToMeasure, questionShort, questionText, QUESTION_KEYS } from './questions.js';
import { askSheetText } from './sheet.js';
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
  for (const key of QUESTION_KEYS) out.push(questionText(key, lang), howToMeasure(key, lang), questionShort(key, lang));
  const all = letterInput({ questions: [...QUESTION_KEYS] });
  for (const channel of CHANNELS) {
    out.push(channelLabel(channel, lang));
    for (const input of [all, letterInput(), letterInput({ placeName: null, withHints: false }), letterInput({ questions: [] })]) {
      const letter = buildLetter(channel, lang, input, lang);
      out.push(...letter.text.split('\n'), letter.subject, letterNote(letter, lang), ...letterFileText(letter, lang).split('\n'));
    }
  }
  out.push(subjectLine(letterInput(), lang), subjectLine(letterInput({ placeName: ' ' }), lang));
  for (const language of LETTER_LANGUAGES) out.push(letterLanguageLabel(language, lang));
  for (const status of ASK_STATUSES) out.push(statusLabel(status, lang));
  let log = sampleLog();
  log = setAskStatus(log, 1, 'answered', TODAY);
  log = setAskStatus(log, 3, 'no-reply', TODAY);
  for (const entry of log.entries) out.push(askLine(entry, TODAY, lang));
  out.push(askCountsText(askCounts(log.entries), lang));
  for (const issue of ['date-invalid', 'date-future', 'no-question', 'too-many-for-place', 'log-full'] as const) out.push(askIssueText(issue, lang));
  for (const kind of ['neither', 'does-not-apply', 'only-measured', 'only-told', 'same', 'differs'] as const) out.push(compareLabel(kind, lang));
  for (const [mine, theirs] of [[measured(), told()], [measured(), told({ doorWidthCm: 80, steps: 3 })], [null, told()], [measured(), null], [null, null], [measured({ steps: 0, stepHeightCm: null }), told({ toilet: 'no' })]] as const) {
    const rows = compareFacts(mine, theirs);
    out.push(compareSummary(rows, lang), ...rows.map((row) => differenceText(row, lang)));
    out.push(...askSheetText({ place: place(), measured: mine, told: theirs, asks: log.entries.filter((e) => e.recordId === 'a1') }, TODAY, lang).split('\n'));
  }
  out.push(...askSheetText({ place: place({ name: null, wheelchair: 'x', source: '' }), measured: null, told: null, asks: [] }, TODAY, lang).split('\n'));
  out.push(toldNoteText(lang), privacyNoteText(lang));
  // Letter separators and answer blanks are layout, not sentences.
  return [...new Set(out.map((text) => text.trim()))].filter((text) => text !== '' && text !== '----');
}
