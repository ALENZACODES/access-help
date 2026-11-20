/**
 * Lines up a person's own observations for adding to OpenStreetMap by hand, one at a time.
 * Pure: no network, no storage, no clock. An observation with the status UNKNOWN is never
 * lined up, because there is nothing to add for it.
 */
import { haversineMetres } from '../presubmit/geo.js';
import { hasStatus, type TagRecord } from '../osm-tags/index.js';

export type QueueOrder = 'newest' | 'oldest' | 'nearby';
export const QUEUE_ORDERS: readonly QueueOrder[] = ['newest', 'oldest', 'nearby'];
export const MAX_QUEUE = 200;

export type LeftOutReason = 'status-unknown' | 'no-source' | 'already-marked';
export const LEFT_OUT_REASONS: readonly LeftOutReason[] = ['already-marked', 'status-unknown', 'no-source'];

export interface LeftOut {
  id: string;
  reason: LeftOutReason;
}

export interface Queue {
  order: QueueOrder;
  /** Ids in the order they will be shown. */
  ids: string[];
  leftOut: LeftOut[];
  /** Observations that were ready but did not fit in one sitting. */
  overflow: number;
}

export function isQueueOrder(value: unknown): value is QueueOrder {
  return typeof value === 'string' && (QUEUE_ORDERS as readonly string[]).includes(value);
}

/** Why an observation is not lined up, or null when it is ready. The first reason that applies wins. */
export function leftOutReason(record: TagRecord, markedIds: ReadonlySet<string>): LeftOutReason | null {
  if (markedIds.has(record.id)) return 'already-marked';
  if (!hasStatus(record)) return 'status-unknown';
  if (record.source.trim() === '') return 'no-source';
  return null;
}

function byDay(a: TagRecord, b: TagRecord): number {
  return a.observedOn.localeCompare(b.observedOn) || a.id.localeCompare(b.id);
}

/**
 * Starts from the newest observation and always goes to the closest one left, in a straight
 * line. It is a simple order for working through one area at a time, not a route.
 */
export function nearbyOrder(records: readonly TagRecord[]): TagRecord[] {
  const left = [...records].sort((a, b) => byDay(b, a));
  const out: TagRecord[] = [];
  let here = left.shift();
  while (here !== undefined) {
    out.push(here);
    let best = -1;
    let bestMetres = Number.POSITIVE_INFINITY;
    for (let i = 0; i < left.length; i += 1) {
      const candidate = left[i];
      if (candidate === undefined) continue;
      const metres = haversineMetres(here, candidate);
      if (metres < bestMetres) {
        best = i;
        bestMetres = metres;
      }
    }
    here = best < 0 ? undefined : left.splice(best, 1)[0];
  }
  return out;
}

export function buildQueue(records: readonly TagRecord[], markedIds: ReadonlySet<string>, order: QueueOrder): Queue {
  const ready: TagRecord[] = [];
  const leftOut: LeftOut[] = [];
  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.id)) continue;
    seen.add(record.id);
    const reason = leftOutReason(record, markedIds);
    if (reason === null) ready.push(record);
    else leftOut.push({ id: record.id, reason });
  }
  const ordered = order === 'nearby' ? nearbyOrder(ready) : [...ready].sort(order === 'newest' ? (a, b) => byDay(b, a) : byDay);
  return { order, ids: ordered.slice(0, MAX_QUEUE).map((record) => record.id), leftOut, overflow: Math.max(0, ordered.length - MAX_QUEUE) };
}

export function leftOutCounts(leftOut: readonly LeftOut[]): Record<LeftOutReason, number> {
  const counts: Record<LeftOutReason, number> = { 'already-marked': 0, 'status-unknown': 0, 'no-source': 0 };
  for (const item of leftOut) counts[item.reason] += 1;
  return counts;
}

/** Straight-line metres from one stop to the next, or null for the last stop or an id that is not saved. */
export function metresToNext(ids: readonly string[], index: number, records: readonly TagRecord[]): number | null {
  const here = records.find((record) => record.id === ids[index]);
  const next = records.find((record) => record.id === ids[index + 1]);
  return here === undefined || next === undefined ? null : Math.round(haversineMetres(here, next));
}
