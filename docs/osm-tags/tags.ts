/**
 * The OpenStreetMap tags the App writes for one observation, so a person can read them before
 * typing them into an editor by hand. Pure: no network, no storage, no clock. The tags match
 * the App's own OpenStreetMap file. An UNKNOWN status writes no wheelchair tag at all.
 */
export interface TagRecord {
  id: string;
  lat: number;
  lon: number;
  name: string | null;
  wheelchair: string;
  source: string;
  licence: string;
  observedOn: string;
}

export interface OsmTag {
  key: string;
  value: string;
}

/** OpenStreetMap keeps at most 255 characters in a key or a value. */
export const MAX_TAG_LENGTH = 255;

export const STATUS_VALUES = ['yes', 'limited', 'no'] as const;

export function hasStatus(record: Pick<TagRecord, 'wheelchair'>): boolean {
  return (STATUS_VALUES as readonly string[]).includes(record.wheelchair);
}

function tidy(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** The tags for one observation, in the order the App's file writes them. */
export function tagsFor(record: TagRecord): OsmTag[] {
  const out: OsmTag[] = [];
  const name = record.name === null ? '' : tidy(record.name);
  if (name !== '') out.push({ key: 'name', value: name });
  if (hasStatus(record)) {
    out.push({ key: 'wheelchair', value: record.wheelchair });
    out.push({ key: 'check_date:wheelchair', value: record.observedOn });
  }
  const source = tidy(record.source);
  if (source !== '') out.push({ key: 'source', value: source });
  return out;
}

export type HeldBack = 'status-unknown' | 'no-name' | 'no-source';

/** What the App leaves out for this observation, and so what a person should not type either. */
export function heldBack(record: TagRecord): HeldBack[] {
  const out: HeldBack[] = [];
  if (!hasStatus(record)) out.push('status-unknown');
  if (record.name === null || tidy(record.name) === '') out.push('no-name');
  if (tidy(record.source) === '') out.push('no-source');
  return out;
}

export type TagProblemKind = 'too-long' | 'empty-value' | 'control-character' | 'repeated-key' | 'bad-date';

export interface TagProblem {
  kind: TagProblemKind;
  key: string;
}

export function tagLength(text: string): number {
  return [...text].length;
}

function isRealDay(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12 || day < 1) return false;
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const lengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= (lengths[month - 1] ?? 0);
}

/** Things an editor would refuse or a reader would trip on. Empty when the tags are fine to type. */
export function tagProblems(tags: readonly OsmTag[]): TagProblem[] {
  const out: TagProblem[] = [];
  const seen = new Set<string>();
  for (const tag of tags) {
    if (seen.has(tag.key)) out.push({ kind: 'repeated-key', key: tag.key });
    seen.add(tag.key);
    if (tag.value === '') out.push({ kind: 'empty-value', key: tag.key });
    if (tagLength(tag.key) > MAX_TAG_LENGTH || tagLength(tag.value) > MAX_TAG_LENGTH) out.push({ kind: 'too-long', key: tag.key });
    if (/[\u0000-\u001f\u007f]/.test(tag.key) || /[\u0000-\u001f\u007f]/.test(tag.value)) out.push({ kind: 'control-character', key: tag.key });
    if (tag.key.startsWith('check_date') && !isRealDay(tag.value)) out.push({ kind: 'bad-date', key: tag.key });
  }
  return out;
}

/** "key=value", the way editors show tags in their text view. */
export function tagLine(tag: OsmTag): string {
  return `${tag.key}=${tag.value}`;
}

export function tagText(tags: readonly OsmTag[]): string {
  return tags.map(tagLine).join('\n');
}

/** Latitude and longitude with five decimals, about a metre, for finding the spot in an editor. */
export function coordText(record: Pick<TagRecord, 'lat' | 'lon'>): string {
  return `${record.lat.toFixed(5)}, ${record.lon.toFixed(5)}`;
}
