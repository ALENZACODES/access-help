import { describe, expect, it } from 'vitest';
import { rec } from './fixtures.js';
import { applyPlan, changedFields, planImport } from './plan.js';
import type { ParsedRow } from './row.js';

const ok = (line: number, over: Parameters<typeof rec>[0] = {}): ParsedRow => ({ ok: true, line, notes: [], record: rec(over) });
const bad = (line: number): ParsedRow => ({ ok: false, line, issues: [{ field: 'source', code: 'source-missing' }], notes: [], name: '' });

describe('changedFields', () => {
  it('is empty for equal records', () => expect(changedFields(rec(), rec())).toEqual([]));
  it('lists what differs and ignores the id', () => {
    expect(changedFields(rec(), rec({ id: 'zz', wheelchair: 'no', observedOn: '2026-11-02' }))).toEqual(['wheelchair', 'observedOn']);
  });
});

describe('planImport', () => {
  it('adds new records', () => {
    const plan = planImport([ok(2), ok(3, { id: 'a2' })], [], 200);
    expect(plan.items.map((i) => i.action)).toEqual(['add', 'add']);
    expect(plan.counts).toEqual({ rows: 2, add: 2, replace: 0, same: 0, overLimit: 0, rejected: 0 });
    expect(plan.totalAfter).toBe(2);
  });
  it('marks an identical saved record as the same and does not save it again', () => {
    const plan = planImport([ok(2)], [rec()], 200);
    expect(plan.items[0]?.action).toBe('same');
    expect(plan.toSave).toEqual([]);
  });
  it('replaces a saved record with the same id and says what changed', () => {
    const plan = planImport([ok(2, { wheelchair: 'limited' })], [rec()], 200);
    expect(plan.items[0]).toMatchObject({ action: 'replace', changed: ['wheelchair'] });
    expect(plan.toSave).toHaveLength(1);
    expect(plan.totalAfter).toBe(1);
  });
  it('counts rejected lines and leaves them out of the items', () => {
    const plan = planImport([bad(2), ok(3)], [], 200);
    expect(plan.counts.rejected).toBe(1);
    expect(plan.items.map((i) => i.line)).toEqual([3]);
  });
  it('stops adding at the device limit but still replaces', () => {
    const existing = [rec({ id: 'e1' }), rec({ id: 'e2' })];
    const plan = planImport([ok(2, { id: 'n1' }), ok(3, { id: 'n2' }), ok(4, { id: 'e1', wheelchair: 'no' })], existing, 3);
    expect(plan.items.map((i) => i.action)).toEqual(['add', 'over-limit', 'replace']);
    expect(plan.counts.overLimit).toBe(1);
    expect(plan.totalAfter).toBe(3);
    expect(plan.toSave.map((r) => r.id)).toEqual(['n1', 'e1']);
  });
  it('is empty for no rows', () => {
    const plan = planImport([], [rec()], 200);
    expect(plan.items).toEqual([]);
    expect(plan.totalAfter).toBe(1);
  });
  it('does not change its inputs', () => {
    const existing = [rec()];
    const copy = JSON.parse(JSON.stringify(existing));
    planImport([ok(2, { wheelchair: 'no' })], existing, 200);
    expect(existing).toEqual(copy);
  });
});

describe('applyPlan', () => {
  it('replaces in place and puts adds at the end', () => {
    const existing = [rec({ id: 'e1' }), rec({ id: 'e2' })];
    const plan = planImport([ok(2, { id: 'n1' }), ok(3, { id: 'e1', name: 'Renamed' })], existing, 200);
    const out = applyPlan(existing, plan);
    expect(out.map((r) => r.id)).toEqual(['e1', 'e2', 'n1']);
    expect(out[0]?.name).toBe('Renamed');
  });
  it('leaves the list alone when there is nothing to do', () => {
    const existing = [rec()];
    expect(applyPlan(existing, planImport([ok(2)], existing, 200))).toEqual(existing);
  });
  it('never grows past the limit', () => {
    const existing = [rec({ id: 'e1' })];
    const plan = planImport([ok(2, { id: 'n1' }), ok(3, { id: 'n2' })], existing, 2);
    expect(applyPlan(existing, plan)).toHaveLength(2);
  });
});
