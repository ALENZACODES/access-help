/**
 * Shared checks for the tests: banned wording and French typography over every
 * user-facing string the review modules can produce. The banned words are built
 * from fragments so this file does not itself contain them.
 */
import { changesetComment } from './changeset.js';
import { handoffText } from './handoff.js';
import { allLicenceNotes, licenceProblem, sourceAdvice } from './licence.js';
import type { Issue, IssueCode, ReviewRecord } from './review.js';
import { SEVERITY_LABEL, issueText, reviewBatch, summaryText } from './review.js';
import { heldBackText, progressText, stepsFor } from './steps.js';
import type { TagIssueCode } from './tags.js';
import { diffText, tagIssueText } from './tags.js';
import type { ReviewLang } from './text.js';

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
  ['AA', 'A-compliant'],
];

const BANNED = FRAGMENTS.map((parts) => parts.join('').toLowerCase());

/** Returns the banned words found in the text, case-insensitively. */
export function bannedIn(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED.filter((word) => lower.includes(word));
}

const NBSP = '\u00a0';
const NNBSP = '\u202f';

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

const SAMPLE: ReviewRecord[] = [
  { id: 'a1', lat: 43.8, lon: -79.4, name: 'Corner café', wheelchair: 'yes', source: 'copied from www.example.org/x', licence: 'CC0-1.0', observedOn: '2020-01-02' },
  { id: 'a2', lat: 43.8, lon: -79.4, name: null, wheelchair: 'UNKNOWN', source: '', licence: 'MIT', observedOn: '2999-01-01' },
  { id: 'a3', lat: 43.85, lon: -79.45, name: 'Library', wheelchair: 'limited', source: 'unsure', licence: 'ODbL-1.0', observedOn: 'nope' },
  { id: 'a4', lat: 43.856123, lon: -79.452341, name: 'Clinic door', wheelchair: 'no', source: 'own site visit', licence: 'ODbL-1.0', observedOn: '2026-11-01' },
];

const TAG_CODES: readonly TagIssueCode[] = ['bad-key', 'bad-value', 'empty-value', 'unknown-written', 'duplicate-key'];
const ISSUE_CODES: readonly Exclude<IssueCode, 'tag-problem'>[] = [
  'licence-not-accepted', 'source-missing', 'date-invalid', 'date-future', 'position-invalid', 'source-link',
  'source-not-own', 'date-old', 'position-coarse', 'near-duplicate', 'status-unknown', 'no-name',
];

/** Every user-facing string the modules can produce, for one language. */
export function allStrings(lang: ReviewLang): string[] {
  const out: string[] = [];
  for (const code of ISSUE_CODES) {
    const issue: Issue = { code, severity: 'note', detail: { value: 'x', date: '2020-01-01', days: 400, places: 3, metres: 9, other: 'b2' } };
    out.push(issueText(issue, lang));
  }
  for (const code of TAG_CODES) {
    out.push(issueText({ code: 'tag-problem', severity: 'blocker', detail: { code, key: 'k' } }, lang));
    out.push(tagIssueText({ code, key: 'k' }, lang));
  }
  out.push(...Object.values(SEVERITY_LABEL[lang]));
  for (const step of stepsFor(lang)) out.push(step.title, step.body);
  for (const note of allLicenceNotes(lang)) out.push(note.name, note.summary, note.whatItMeans, note.whatYouDo);
  for (const kind of ['empty', 'link', 'other', 'own-visit'] as const) {
    const advice = sourceAdvice(kind, lang);
    if (advice !== null) out.push(advice);
  }
  out.push(licenceProblem('MIT', lang) ?? '', heldBackText(lang), progressText({ review: true }, lang));
  out.push(diffText({ added: ['a'], changed: ['b'], removed: ['c'] }, lang), diffText({ added: [], changed: [], removed: [] }, lang));
  const batch = reviewBatch(SAMPLE, { today: '2026-11-16' });
  out.push(summaryText(batch, lang), summaryText(reviewBatch([], { today: '2026-11-16' }), lang));
  out.push(handoffText(SAMPLE, batch, '2026-11-16', lang));
  out.push(changesetComment(SAMPLE, lang), changesetComment([SAMPLE[3] as ReviewRecord], lang));
  return out.filter((text) => text !== '');
}
