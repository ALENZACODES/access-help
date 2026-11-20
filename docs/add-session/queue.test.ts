import { describe, expect, it } from 'vitest';
import { notes, obs } from './fixtures.js';
import { MAX_QUEUE, buildQueue, isQueueOrder, leftOutCounts, leftOutReason, metresToNext, nearbyOrder } from './queue.js';

const none = new Set<string>();

describe('queue for adding by hand', () => {
  it('lines up ready observations newest first', () => {
    expect(buildQueue(notes(), none, 'newest').ids).toEqual(['a3', 'a1', 'a4', 'a2']);
  });
  it('lines them up oldest first', () => {
    expect(buildQueue(notes(), none, 'oldest').ids).toEqual(['a2', 'a4', 'a1', 'a3']);
  });
  it('goes place by place from the newest, closest next', () => {
    expect(buildQueue(notes(), none, 'nearby').ids).toEqual(['a3', 'a4', 'a1', 'a2']);
  });
  it('leaves out UNKNOWN and no-source observations, with the reason', () => {
    expect(buildQueue(notes(), none, 'newest').leftOut).toEqual([
      { id: 'u1', reason: 'status-unknown' },
      { id: 'n1', reason: 'no-source' },
    ]);
  });
  it('leaves out what is already on the list of what the person added', () => {
    const queue = buildQueue(notes(), new Set(['a3']), 'newest');
    expect(queue.ids).toEqual(['a1', 'a4', 'a2']);
    expect(queue.leftOut[0]).toEqual({ id: 'a3', reason: 'already-marked' });
  });
  it('gives already-marked as the reason before any other', () => {
    expect(leftOutReason(obs({ wheelchair: 'UNKNOWN' }), new Set(['a1']))).toBe('already-marked');
    expect(leftOutReason(obs({ wheelchair: 'UNKNOWN', source: '' }), none)).toBe('status-unknown');
    expect(leftOutReason(obs(), none)).toBeNull();
  });
  it('never treats an odd status as a status', () => {
    for (const wheelchair of ['', 'maybe', 'Yes', 'designated']) expect(leftOutReason(obs({ wheelchair }), none)).toBe('status-unknown');
  });
  it('takes an id once when it is saved twice', () => {
    expect(buildQueue([obs(), obs()], none, 'newest').ids).toEqual(['a1']);
  });
  it('is empty for no observations', () => {
    expect(buildQueue([], none, 'nearby')).toEqual({ order: 'nearby', ids: [], leftOut: [], overflow: 0 });
  });
  it('keeps one sitting to a fixed size and counts the rest', () => {
    const many = Array.from({ length: MAX_QUEUE + 7 }, (_, i) => obs({ id: `m${String(i).padStart(3, '0')}` }));
    const queue = buildQueue(many, none, 'oldest');
    expect(queue.ids).toHaveLength(MAX_QUEUE);
    expect(queue.overflow).toBe(7);
    expect(queue.ids[0]).toBe('m000');
  });
  it('does not change the list it was given', () => {
    const input = notes();
    const before = input.map((r) => r.id);
    buildQueue(input, none, 'nearby');
    expect(input.map((r) => r.id)).toEqual(before);
  });
  it('orders by distance without losing or repeating anything', () => {
    const ordered = nearbyOrder(notes());
    expect(ordered).toHaveLength(6);
    expect(new Set(ordered.map((r) => r.id)).size).toBe(6);
    expect(nearbyOrder([])).toEqual([]);
  });
  it('counts what was left out by reason', () => {
    expect(leftOutCounts(buildQueue(notes(), new Set(['a1', 'a2']), 'newest').leftOut)).toEqual({ 'already-marked': 2, 'status-unknown': 1, 'no-source': 1 });
  });
  it('gives the straight-line distance to the next stop', () => {
    const queue = buildQueue(notes(), none, 'nearby');
    expect(metresToNext(queue.ids, 0, notes())).toBe(137);
    expect(metresToNext(queue.ids, 1, notes())).toBe(101800);
    expect(metresToNext(queue.ids, 3, notes())).toBeNull();
    expect(metresToNext(['gone', 'a1'], 0, notes())).toBeNull();
  });
  it('knows its orders', () => {
    expect(isQueueOrder('nearby')).toBe(true);
    expect(isQueueOrder('random')).toBe(false);
    expect(isQueueOrder(3)).toBe(false);
  });
});
