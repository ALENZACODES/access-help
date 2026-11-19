import { describe, expect, it } from 'vitest';
import { awkward, mixed, rec } from './fixtures.js';
import { partFileStem, partFor, partRecords, placedCount, splitPlan } from './split.js';

describe('split plan', () => {
  it('has nothing to split when there are no records', () => {
    expect(splitPlan([])).toEqual({ kind: 'nothing', parts: [], leftOutOther: [], leftOutNoSource: [], total: 0 });
  });
  it('needs one file when every record has the same licence', () => {
    const plan = splitPlan([rec(), rec({ id: 'r2' })]);
    expect(plan.kind).toBe('one-file');
    expect(plan.parts).toEqual([{ licence: 'CC0-1.0', ids: ['r1', 'r2'], count: 2, duties: [], sources: ['own visit'] }]);
  });
  it('offers two files for a mix, CC0-1.0 first', () => {
    const plan = splitPlan(mixed());
    expect(plan.kind).toBe('two-files');
    expect(plan.parts.map((p) => [p.licence, p.ids])).toEqual([
      ['CC0-1.0', ['r1', 'r2']],
      ['ODbL-1.0', ['r3', 'r4']],
    ]);
  });
  it('puts the duties only on the ODbL-1.0 part', () => {
    const plan = splitPlan(mixed());
    expect(partFor(plan, 'CC0-1.0')?.duties).toEqual([]);
    expect(partFor(plan, 'ODbL-1.0')?.duties).toEqual(['credit-sources', 'same-licence', 'keep-open']);
  });
  it('lists each source once per part, as first written', () => {
    expect(partFor(splitPlan(mixed()), 'ODbL-1.0')?.sources).toEqual(['Sample open pack']);
  });
  it('leaves out a licence the App does not take and a record with no source', () => {
    const plan = splitPlan(awkward());
    expect(plan.leftOutOther).toEqual(['r5']);
    expect(plan.leftOutNoSource).toEqual(['r6']);
    expect(placedCount(plan)).toBe(4);
    expect(plan.total).toBe(6);
  });
  it('says nothing can go into a file when every record is left out', () => {
    const plan = splitPlan([rec({ licence: 'CC-BY-4.0' }), rec({ id: 'r2', source: '' })]);
    expect(plan.kind).toBe('nothing');
    expect(plan.parts).toEqual([]);
  });
  it('gives back the records of a part in their original order', () => {
    const records = mixed();
    const plan = splitPlan(records);
    const part = partFor(plan, 'ODbL-1.0');
    expect(part).not.toBeNull();
    if (part !== null) expect(partRecords(records, part).map((r) => r.id)).toEqual(['r3', 'r4']);
  });
  it('never returns a record of another licence for a part', () => {
    const records = [rec(), rec({ id: 'r1', licence: 'ODbL-1.0', source: 'pack' })];
    const part = partFor(splitPlan(records), 'CC0-1.0');
    if (part !== null) expect(partRecords(records, part).every((r) => r.licence === 'CC0-1.0')).toBe(true);
  });
  it('returns null for a licence with no part', () => {
    expect(partFor(splitPlan([rec()]), 'ODbL-1.0')).toBeNull();
    expect(partFor(splitPlan([rec()]), 'CC-BY-4.0')).toBeNull();
  });
  it('names a part file by licence and day', () => {
    const part = partFor(splitPlan(mixed()), 'ODbL-1.0');
    if (part !== null) expect(partFileStem(part, '2026-11-19')).toBe('records-odbl-1.0-2026-11-19');
  });
});
