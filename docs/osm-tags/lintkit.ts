/**
 * Shared checks for the tests: banned wording and French typography over every user-facing
 * string the osm-tags modules can produce. Banned words are built from fragments so this
 * file does not itself contain them.
 */
import { changesetDraft } from './changeset.js';
import { MAP_TEXT, obs, unknownObs } from './fixtures.js';
import { cautionText, changesetNotes, diffKindLabel, heldBackText, parsedNotes, problemText } from './messages.js';
import { parseTagText } from './parse.js';
import { buildTagSheet, tagSheetText } from './sheet.js';
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
  const records = [obs(), unknownObs(), obs({ name: '  ', source: ' ' }), obs({ wheelchair: 'no', observedOn: '2026-11-20' })];
  for (const record of records) {
    for (const pasted of ['', MAP_TEXT, 'wheelchair=yes\ncheck_date:wheelchair=2026-11-10', 'not a tag\nname=A\nname=B']) {
      out.push(...tagSheetText(buildTagSheet(record, pasted, lang), lang).split('\n'));
    }
  }
  for (const kind of ['status-unknown', 'no-name', 'no-source'] as const) out.push(heldBackText(kind, lang));
  for (const kind of ['too-long', 'empty-value', 'control-character', 'repeated-key', 'bad-date'] as const) out.push(problemText({ kind, key: 'name' }, lang));
  for (const kind of ['add', 'same', 'differs', 'only-on-map'] as const) out.push(diffKindLabel(kind, lang));
  for (const caution of ['map-date-newer', 'map-date-same', 'status-differs', 'name-differs', 'map-has-detail'] as const) out.push(cautionText(caution, lang));
  out.push(...parsedNotes(parseTagText(Array.from({ length: 205 }, (_, i) => `k${i}=v`).join('\n')), lang));
  out.push(...changesetNotes(changesetDraft([obs(), obs({ id: 'b', observedOn: '2026-11-12', source: 'x'.repeat(300) }), unknownObs()], lang), lang));
  out.push(changesetDraft([obs(), obs({ id: 'b', observedOn: '2026-11-12' })], lang).comment, changesetDraft([obs({ observedOn: 'soon' })], lang).comment);
  // Tag lines and table rows are data, not sentences: they hold "key=value" and bare separators.
  return [...new Set(out.map((text) => text.trim()))].filter((text) => text !== '' && !/^[\w:]+=/.test(text) && !/^- [\w:]+ \| /.test(text) && !/^x+$/.test(text));
}
