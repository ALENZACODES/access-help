/**
 * Shared checks for the tests: banned wording and French typography over every user-facing
 * string the revisit-list modules can produce. Banned words are built from fragments so this
 * file does not itself contain them.
 */
import { place, TODAY } from './fixtures.js';
import { buildRevisitList } from './list.js';
import { coordinatesText, kmText, legText, listSummaryText, orderNoteText, reasonLabel, reasonText, recordLine } from './messages.js';
import { visitOrder } from './order.js';
import { REASONS } from './reasons.js';
import { fieldSheetText } from './sheet.js';
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
  for (const reason of REASONS) out.push(reasonLabel(reason, lang), reasonText(reason, lang));
  const list = buildRevisitList(
    [place({ id: 'a', wheelchair: 'UNKNOWN', lat: 43.851 }), place({ id: 'b', name: null, observedOn: '2020-01-01', lat: 43.86 }), place({ id: 'c', lat: 43.9 }, 'status')],
    TODAY,
  );
  const order = visitOrder(list.items, { lat: 43.85, lon: -79.43 });
  for (const stop of order.stops) out.push(legText(stop, lang), recordLine(stop.item.place.record, lang), coordinatesText(stop.item.place.record, lang));
  out.push(kmText(0.4, lang), kmText(12.3, lang), orderNoteText(order, lang), orderNoteText(visitOrder(list.items.slice(0, 1), null), lang));
  out.push(listSummaryText(list, lang), listSummaryText(buildRevisitList([], TODAY), lang));
  out.push(...fieldSheetText(list, order, TODAY, lang).split('\n').map((line) => line.trim()));
  return out.filter((text) => text !== '');
}
