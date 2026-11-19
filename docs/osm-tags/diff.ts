/**
 * Sets the tags from an observation beside the tags already on the map object, so a person can
 * see what typing them would add or change before they touch anything. It decides nothing: a
 * differing value is shown as a difference, not as a mistake on either side.
 */
import type { OsmTag } from './tags.js';

export type DiffKind = 'add' | 'same' | 'differs' | 'only-on-map';

export interface TagDiff {
  key: string;
  kind: DiffKind;
  /** The value from the observation. Null when the observation has no such tag. */
  mine: string | null;
  /** The value on the map now. Null when the map object has no such tag. */
  onMap: string | null;
}

export type DiffCaution = 'map-date-newer' | 'map-date-same' | 'status-differs' | 'name-differs' | 'map-has-detail';

export interface TagComparison {
  rows: TagDiff[];
  cautions: DiffCaution[];
  counts: Record<DiffKind, number>;
}

/** Keys that describe wheelchair access in more detail than the App records. */
const DETAIL_KEYS = ['wheelchair:description', 'toilets:wheelchair', 'ramp:wheelchair', 'entrance:wheelchair'];

function same(a: string, b: string): boolean {
  return a.trim() === b.trim();
}

export function compareTags(mine: readonly OsmTag[], onMap: readonly OsmTag[]): TagComparison {
  const mapValues = new Map(onMap.map((tag) => [tag.key, tag.value]));
  const mineKeys = new Set(mine.map((tag) => tag.key));
  const rows: TagDiff[] = [];
  for (const tag of mine) {
    const existing = mapValues.get(tag.key);
    if (existing === undefined) rows.push({ key: tag.key, kind: 'add', mine: tag.value, onMap: null });
    else rows.push({ key: tag.key, kind: same(existing, tag.value) ? 'same' : 'differs', mine: tag.value, onMap: existing });
  }
  for (const tag of onMap) {
    if (!mineKeys.has(tag.key)) rows.push({ key: tag.key, kind: 'only-on-map', mine: null, onMap: tag.value });
  }
  const counts: Record<DiffKind, number> = { add: 0, same: 0, differs: 0, 'only-on-map': 0 };
  for (const row of rows) counts[row.kind] += 1;

  const cautions: DiffCaution[] = [];
  const row = (key: string) => rows.find((entry) => entry.key === key);
  const date = row('check_date:wheelchair');
  if (date !== undefined && date.mine !== null && date.onMap !== null && /^\d{4}-\d{2}-\d{2}$/.test(date.onMap)) {
    if (date.onMap > date.mine) cautions.push('map-date-newer');
    else if (date.onMap === date.mine) cautions.push('map-date-same');
  }
  if (row('wheelchair')?.kind === 'differs') cautions.push('status-differs');
  if (row('name')?.kind === 'differs') cautions.push('name-differs');
  if (onMap.some((tag) => DETAIL_KEYS.includes(tag.key))) cautions.push('map-has-detail');
  return { rows, cautions, counts };
}

/** True when typing the observation's tags would change nothing on the map object. */
export function nothingToType(comparison: TagComparison): boolean {
  return comparison.counts.add === 0 && comparison.counts.differs === 0;
}
