import { describe, expect, it } from 'vitest';
import { compareCounts, compareFacts, stillOpen } from './compare.js';
import { measured, told } from './fixtures.js';

const kinds = (rows: ReturnType<typeof compareFacts>) => Object.fromEntries(rows.map((row) => [row.key, row.kind]));

describe('what the place said beside what was measured', () => {
  it('gives one row per fact, in the fixed order', () => {
    expect(compareFacts(null, null).map((row) => row.key)).toEqual(['steps', 'stepHeightCm', 'doorWidthCm', 'doorOpening', 'ramp', 'toilet', 'toiletDoorCm']);
  });
  it('marks everything UNKNOWN from both when there is nothing on either side', () => {
    expect(compareFacts(null, null).every((row) => row.kind === 'neither')).toBe(true);
  });
  it('sorts each fact into same, differs, only one side, or neither', () => {
    expect(kinds(compareFacts(measured(), told()))).toEqual({
      steps: 'same',
      stepHeightCm: 'only-measured',
      doorWidthCm: 'differs',
      doorOpening: 'only-told',
      ramp: 'only-told',
      toilet: 'only-told',
      toiletDoorCm: 'neither',
    });
  });
  it('gives the difference for two lengths: what the place said minus what was measured', () => {
    const row = compareFacts(measured(), told()).find((r) => r.key === 'doorWidthCm');
    expect(row?.differenceCm).toBe(7.5);
    expect(compareFacts(measured(), told({ doorWidthCm: 80 })).find((r) => r.key === 'doorWidthCm')?.differenceCm).toBe(-2.5);
  });
  it('gives no number for a difference in a count or a choice', () => {
    const rows = compareFacts(measured({ ramp: 'no' }), told({ steps: 3 }));
    expect(rows.find((r) => r.key === 'steps')).toEqual({ key: 'steps', kind: 'differs', differenceCm: null });
    expect(rows.find((r) => r.key === 'ramp')).toEqual({ key: 'ramp', kind: 'differs', differenceCm: null });
  });
  it('treats zero steps on both sides as the same, not as UNKNOWN', () => {
    const rows = compareFacts(measured({ steps: 0, stepHeightCm: null }), told({ steps: 0 }));
    expect(rows.find((r) => r.key === 'steps')?.kind).toBe('same');
  });
  it('says a step height does not apply where either side counted no step', () => {
    expect(kinds(compareFacts(measured({ steps: 0, stepHeightCm: null }), null)).stepHeightCm).toBe('does-not-apply');
    expect(kinds(compareFacts(null, told({ steps: 0 }))).stepHeightCm).toBe('does-not-apply');
  });
  it('says a toilet door does not apply where either side said there is no such toilet', () => {
    expect(kinds(compareFacts(measured(), told({ toilet: 'no' }))).toiletDoorCm).toBe('does-not-apply');
  });
  it('counts the rows by kind', () => {
    expect(compareCounts(compareFacts(measured(), told()))).toEqual({ neither: 1, 'does-not-apply': 0, 'only-measured': 1, 'only-told': 3, same: 1, differs: 1 });
  });
  it('lists what is still UNKNOWN from both, leaving out what does not apply', () => {
    expect(stillOpen(compareFacts(measured(), told()))).toEqual(['toiletDoorCm']);
    expect(stillOpen(compareFacts(measured(), told({ toilet: 'no' })))).toEqual([]);
    expect(stillOpen(compareFacts(null, null))).toHaveLength(7);
  });
});
