/**
 * Shared checks for the tests: banned wording and French typography over every user-facing
 * string the add-session modules can produce. Banned words are built from fragments so this
 * file does not itself contain them.
 */
import { mixedSession, notes, obs, started } from './fixtures.js';
import { addedGroups } from './groups.js';
import { cannotSeeText, countsText, groupHeading, groupNotes, leftOutLines, leftOutReasonText, nextStopText, orderHint, orderLabel, outcomeLabel, outcomeText, positionText, readyText, restText, skipReasonText } from './messages.js';
import { buildQueue, LEFT_OUT_REASONS, QUEUE_ORDERS } from './queue.js';
import { sessionText } from './report.js';
import { sessionCounts, setOutcome, SKIP_REASONS } from './session.js';
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
  for (const order of QUEUE_ORDERS) out.push(orderLabel(order, lang), orderHint(order, lang));
  for (const reason of LEFT_OUT_REASONS) out.push(leftOutReasonText(reason, lang));
  for (const reason of SKIP_REASONS) out.push(skipReasonText(reason, lang), outcomeText({ kind: 'skipped', reason }, lang));
  for (const kind of ['added', 'skipped', 'later', 'open'] as const) out.push(outcomeLabel(kind, lang));
  out.push(outcomeText(undefined, lang), outcomeText({ kind: 'later' }, lang), outcomeText({ kind: 'added', changeset: null }, lang), outcomeText({ kind: 'added', changeset: '42' }, lang));
  out.push(...leftOutLines(buildQueue(notes(), new Set(['a1']), 'newest').leftOut, lang), readyText(3, 0, lang), readyText(200, 12, lang));
  out.push(countsText(sessionCounts(mixedSession()), lang), positionText(0, 4, lang), nextStopText(120, lang), nextStopText(48_000, lang), cannotSeeText(lang), restText(lang));
  let wide = started();
  for (const id of wide.ids) wide = setOutcome(wide, id, { kind: 'added', changeset: id === 'a2' ? null : '77' });
  for (const session of [mixedSession(), wide, started('nearby')]) {
    out.push(...sessionText(session, notes(), lang).split('\n'));
    for (const group of addedGroups(session, notes(), lang)) out.push(groupHeading(group, lang), ...groupNotes(group, lang));
  }
  out.push(...sessionText(started(), [obs({ source: ' ', wheelchair: 'maybe' })], lang).split('\n'));
  // Changeset draft lines are data an editor reads: "comment=..." and "source=...".
  return [...new Set(out.map((text) => text.trim()))].filter((text) => text !== '' && !/^(?:comment|source)=/.test(text));
}
