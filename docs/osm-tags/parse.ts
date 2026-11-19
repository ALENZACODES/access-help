/**
 * Reads tags a person pasted from an editor's text view: one "key=value" per line. Lines that
 * are not tags are reported, never guessed at. Nothing here looks anything up.
 */
import { MAX_TAG_LENGTH, tagLength, type OsmTag } from './tags.js';

export const MAX_PASTED_LINES = 200;

export interface ParsedTags {
  tags: OsmTag[];
  /** Lines that could not be read, as written and trimmed. */
  unread: string[];
  /** Keys that came up more than once. The last value is kept. */
  repeated: string[];
  /** True when there were more lines than the App reads. */
  cutOff: boolean;
}

/** Accepts "key=value", "key = value" and the tab-separated form some editors copy. */
export function parseTagLine(line: string): OsmTag | null {
  const text = line.trim();
  if (text === '' || text.startsWith('#')) return null;
  const tab = text.indexOf('\t');
  const equals = text.indexOf('=');
  const at = equals >= 0 && (tab < 0 || equals < tab) ? equals : tab;
  if (at <= 0) return null;
  const key = text.slice(0, at).trim();
  const value = text.slice(at + 1).trim();
  if (key === '' || value === '' || /\s/.test(key)) return null;
  if (tagLength(key) > MAX_TAG_LENGTH || tagLength(value) > MAX_TAG_LENGTH) return null;
  return { key, value };
}

export function parseTagText(text: string): ParsedTags {
  const lines = text.split(/\r?\n/);
  const cutOff = lines.length > MAX_PASTED_LINES;
  const map = new Map<string, string>();
  const unread: string[] = [];
  const repeated: string[] = [];
  for (const line of lines.slice(0, MAX_PASTED_LINES)) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const tag = parseTagLine(trimmed);
    if (tag === null) {
      unread.push(trimmed.length > 80 ? `${trimmed.slice(0, 79)}…` : trimmed);
      continue;
    }
    if (map.has(tag.key) && !repeated.includes(tag.key)) repeated.push(tag.key);
    map.set(tag.key, tag.value);
  }
  return { tags: [...map.entries()].map(([key, value]) => ({ key, value })), unread, repeated, cutOff };
}
