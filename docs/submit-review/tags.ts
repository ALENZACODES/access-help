/**
 * OpenStreetMap tag drafts for a person to review. Pure functions.
 * A tag is written only for something the person recorded. UNKNOWN is never
 * written as a tag value: the key is left out so nothing is claimed.
 * The App does not upload. A person pastes or imports these into an editor.
 */
import type { ReviewLang } from './text.js';
import { NNBSP, fill, pick } from './text.js';

export type TagSet = Readonly<Record<string, string>>;

/** The fields a tag draft is built from. Matches the mapping-day export record. */
export interface TagSource {
  name: string | null;
  wheelchair: 'yes' | 'limited' | 'no' | 'UNKNOWN';
  source: string;
  observedOn: string;
}

export const MAX_TAG_VALUE = 255;
export const MAX_TAG_KEY = 255;

/** Keys are lower-case letters, digits, underscore, colon and the dash. A key may not start or end with a colon. */
export function isValidKey(key: string): boolean {
  return key.length > 0 && key.length <= MAX_TAG_KEY && /^[a-z0-9_-]+(?::[a-z0-9_-]+)*$/.test(key);
}

/** Values are text up to 255 characters with no control characters and no line breaks. */
export function isValidValue(value: string): boolean {
  return Array.from(value).length <= MAX_TAG_VALUE && !/[\u0000-\u001f\u007f]/.test(value);
}

export type TagIssueCode = 'bad-key' | 'bad-value' | 'empty-value' | 'unknown-written' | 'duplicate-key';

export interface TagIssue {
  code: TagIssueCode;
  key: string;
}

/** Problems in a tag list. A list (not a set) is checked so repeated keys can be seen. */
export function tagIssues(tags: readonly (readonly [string, string])[]): TagIssue[] {
  const issues: TagIssue[] = [];
  const seen = new Set<string>();
  for (const [key, value] of tags) {
    if (!isValidKey(key)) issues.push({ code: 'bad-key', key });
    if (seen.has(key)) issues.push({ code: 'duplicate-key', key });
    seen.add(key);
    if (value.trim() === '') issues.push({ code: 'empty-value', key });
    else if (!isValidValue(value)) issues.push({ code: 'bad-value', key });
    if (value.trim().toUpperCase() === 'UNKNOWN') issues.push({ code: 'unknown-written', key });
  }
  return issues;
}

const TAG_ISSUE_TEXT: Record<ReviewLang, Record<TagIssueCode, string>> = {
  en: {
    'bad-key': 'The tag name "{key}" has characters OpenStreetMap does not use in names.',
    'bad-value': 'The value of "{key}" is too long or has a line break.',
    'empty-value': 'The tag "{key}" has no value. Leave the tag out instead.',
    'unknown-written': 'The tag "{key}" says UNKNOWN. Leave the tag out so nothing is claimed.',
    'duplicate-key': 'The tag "{key}" appears more than once.',
  },
  fr: {
    'bad-key': 'Le nom de balise «\u00a0{key}\u00a0» contient des caractères qu’OpenStreetMap n’utilise pas dans les noms.',
    'bad-value': 'La valeur de «\u00a0{key}\u00a0» est trop longue ou contient un saut de ligne.',
    'empty-value': 'La balise «\u00a0{key}\u00a0» n’a pas de valeur. Omettez-la plutôt.',
    'unknown-written': 'La balise «\u00a0{key}\u00a0» indique UNKNOWN. Omettez-la pour ne rien affirmer.',
    'duplicate-key': 'La balise «\u00a0{key}\u00a0» apparaît plusieurs fois.',
  },
};

export function tagIssueText(issue: TagIssue, lang: ReviewLang): string {
  return fill(TAG_ISSUE_TEXT[lang][issue.code], { key: issue.key });
}

/** Tags for one place. Order is stable: name, wheelchair, check date, source. */
export function tagsFor(record: TagSource): TagSet {
  const tags: Record<string, string> = {};
  const name = record.name?.trim() ?? '';
  if (name !== '') tags.name = name;
  if (record.wheelchair !== 'UNKNOWN') {
    tags.wheelchair = record.wheelchair;
    tags['check_date:wheelchair'] = record.observedOn;
  }
  const source = record.source.trim();
  if (source !== '') tags.source = source;
  return tags;
}

/** key=value lines, one per tag. Line breaks inside a value are folded to a space first. */
export function tagLines(tags: TagSet): string[] {
  return Object.entries(tags).map(([key, value]) => `${key}=${value.replace(/\s*[\r\n]+\s*/g, ' ')}`);
}

export interface ParsedTagLines {
  tags: [string, string][];
  errors: { line: number; text: string }[];
}

/** Reads key=value lines. Blank lines are skipped. A line with no "=" is an error, not a guess. */
export function parseTagLines(text: string): ParsedTagLines {
  const tags: [string, string][] = [];
  const errors: ParsedTagLines['errors'] = [];
  text.split(/\r?\n/).forEach((raw, index) => {
    if (raw.trim() === '') return;
    const at = raw.indexOf('=');
    if (at <= 0) {
      errors.push({ line: index + 1, text: raw.trim() });
      return;
    }
    tags.push([raw.slice(0, at).trim(), raw.slice(at + 1).trim()]);
  });
  return { tags, errors };
}

export interface TagDiff {
  added: string[];
  removed: string[];
  changed: string[];
}

/** What differs between the tags the person drafted and the tags already on the map object. */
export function diffTags(draft: TagSet, existing: TagSet): TagDiff {
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];
  for (const [key, value] of Object.entries(draft)) {
    if (!(key in existing)) added.push(key);
    else if (existing[key] !== value) changed.push(key);
  }
  for (const key of Object.keys(existing)) if (!(key in draft)) removed.push(key);
  return { added: added.sort(), removed: removed.sort(), changed: changed.sort() };
}

export function diffText(diff: TagDiff, lang: ReviewLang): string {
  const parts: string[] = [];
  if (diff.added.length > 0) parts.push(fill(pick(lang, 'adds: {keys}', 'ajoute\u00a0: {keys}'), { keys: diff.added.join(', ') }));
  if (diff.changed.length > 0) parts.push(fill(pick(lang, 'changes: {keys}', 'modifie\u00a0: {keys}'), { keys: diff.changed.join(', ') }));
  if (diff.removed.length > 0) {
    parts.push(fill(pick(lang, 'would drop: {keys}', 'retirerait\u00a0: {keys}'), { keys: diff.removed.join(', ') }));
  }
  return parts.length === 0 ? pick(lang, 'no differences', 'aucune différence') : parts.join(pick(lang, '; ', `${NNBSP}; `));
}
