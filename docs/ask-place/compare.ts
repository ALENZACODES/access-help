/**
 * Sets what a place said beside what the person measured. It decides nothing: when the two
 * differ, both are shown and neither is called wrong. What a place said is never treated as
 * something the person saw.
 */
import { FACT_KEYS, type FactKey, type Measures } from '../place-measures/index.js';

export type FactCompare = 'neither' | 'does-not-apply' | 'only-measured' | 'only-told' | 'same' | 'differs';

export interface FactRow {
  key: FactKey;
  kind: FactCompare;
  /** For two lengths that differ: what the place said minus what the person measured, in centimetres. */
  differenceCm: number | null;
}

const LENGTHS: readonly FactKey[] = ['stepHeightCm', 'doorWidthCm', 'toiletDoorCm'];

export function compareFacts(measured: Measures | null, told: Measures | null): FactRow[] {
  return FACT_KEYS.map((key) => {
    const mine = measured === null ? null : measured[key];
    const theirs = told === null ? null : told[key];
    if (mine === null && theirs === null) {
      // A step height has no answer where either side counted no step; the same goes for a toilet door where there is no such toilet.
      const noStep = key === 'stepHeightCm' && (measured?.steps === 0 || told?.steps === 0);
      const noToilet = key === 'toiletDoorCm' && (measured?.toilet === 'no' || told?.toilet === 'no');
      return { key, kind: noStep || noToilet ? 'does-not-apply' : 'neither', differenceCm: null };
    }
    if (theirs === null) return { key, kind: 'only-measured', differenceCm: null };
    if (mine === null) return { key, kind: 'only-told', differenceCm: null };
    if (mine === theirs) return { key, kind: 'same', differenceCm: null };
    const lengths = LENGTHS.includes(key) && typeof mine === 'number' && typeof theirs === 'number';
    return { key, kind: 'differs', differenceCm: lengths ? Math.round((theirs - mine) * 10) / 10 : null };
  });
}

export function compareCounts(rows: readonly FactRow[]): Record<FactCompare, number> {
  const counts: Record<FactCompare, number> = { neither: 0, 'does-not-apply': 0, 'only-measured': 0, 'only-told': 0, same: 0, differs: 0 };
  for (const row of rows) counts[row.kind] += 1;
  return counts;
}

/** The facts still UNKNOWN from both the person and the place. */
export function stillOpen(rows: readonly FactRow[]): FactKey[] {
  return rows.filter((row) => row.kind === 'neither').map((row) => row.key);
}
