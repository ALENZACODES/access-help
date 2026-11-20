import { describe, expect, it } from 'vitest';
import { flat, full, sparse } from './fixtures.js';
import { cleanMeasures, emptyMeasures, hasAnyFact, isRealDay, knownFacts, unknownFacts } from './measures.js';

describe('measures', () => {
  it('starts with every fact UNKNOWN', () => {
    const m = emptyMeasures('a1', '2026-11-12');
    expect(knownFacts(m)).toEqual([]);
    expect(hasAnyFact(m)).toBe(false);
    expect(unknownFacts(m)).toHaveLength(7);
  });
  it('lists the measured facts in a fixed order', () => {
    expect(knownFacts(full())).toEqual(['steps', 'stepHeightCm', 'doorWidthCm', 'doorOpening', 'ramp', 'toilet', 'toiletDoorCm']);
    expect(knownFacts(sparse())).toEqual(['doorWidthCm']);
  });
  it('treats zero steps as a measured fact', () => {
    expect(knownFacts(flat())).toContain('steps');
    expect(hasAnyFact({ ...emptyMeasures('a1', '2026-11-12'), steps: 0 })).toBe(true);
  });
  it('does not ask for a step height when there is no step, or a toilet door when there is no toilet', () => {
    expect(unknownFacts(flat())).toEqual(['doorWidthCm']);
    expect(unknownFacts(full())).toEqual([]);
  });
  it('still asks for the toilet door when the toilet is UNKNOWN', () => {
    expect(unknownFacts(sparse())).toContain('toiletDoorCm');
    expect(unknownFacts(sparse())).toContain('stepHeightCm');
  });
  it('knows a real day', () => {
    expect(isRealDay('2026-11-12')).toBe(true);
    expect(isRealDay('2026-02-30')).toBe(false);
    expect(isRealDay('12/11/2026')).toBe(false);
  });
});

describe('reading stored measures', () => {
  it('reads back what was stored', () => {
    expect(cleanMeasures(JSON.parse(JSON.stringify(full())))).toEqual(full());
    expect(cleanMeasures(JSON.parse(JSON.stringify(flat())))).toEqual(flat());
  });
  it('refuses anything that is not measures', () => {
    for (const bad of [null, 'x', 3, [], {}, { recordId: '', measuredOn: '2026-11-12', steps: 1 }, { recordId: 'a', measuredOn: 'soon', steps: 1 }, { recordId: 7, measuredOn: '2026-11-12' }]) {
      expect(cleanMeasures(bad)).toBeNull();
    }
  });
  it('refuses an entry with no fact at all', () => {
    expect(cleanMeasures(emptyMeasures('a1', '2026-11-12'))).toBeNull();
  });
  it('turns an out-of-range or wrong-kind value into UNKNOWN, never a number', () => {
    const m = cleanMeasures({ ...full(), steps: 2.5, stepHeightCm: 900, doorWidthCm: '82', doorOpening: 'magic', ramp: true, toiletDoorCm: -4 });
    expect(m).toMatchObject({ steps: null, stepHeightCm: null, doorWidthCm: null, doorOpening: null, ramp: null, toilet: 'yes', toiletDoorCm: null });
  });
  it('refuses NaN and infinity', () => {
    expect(cleanMeasures({ ...sparse(), doorWidthCm: Number.NaN })).toBeNull();
    expect(cleanMeasures({ ...full(), doorWidthCm: Number.POSITIVE_INFINITY })?.doorWidthCm).toBeNull();
  });
  it('drops a step height stored with zero steps and a toilet door stored with no toilet', () => {
    const m = cleanMeasures({ ...full(), steps: 0, toilet: 'no' });
    expect(m?.stepHeightCm).toBeNull();
    expect(m?.toiletDoorCm).toBeNull();
  });
  it('keeps one decimal of a centimetre', () => {
    expect(cleanMeasures({ ...sparse(), doorWidthCm: 82.5449 })?.doorWidthCm).toBe(82.5);
  });
  it('drops a method it does not know', () => {
    expect(cleanMeasures({ ...full(), method: 'laser' })?.method).toBeNull();
  });
  it('keeps nothing extra', () => {
    const m = cleanMeasures({ ...full(), note: 'hello', wheelchair: 'yes' });
    expect(Object.keys(m ?? {}).sort()).toEqual(Object.keys(full()).sort());
  });
});
