import { describe, expect, it } from 'vitest';
import { emptyCriteria } from './criteria.js';
import { m, simple, strict } from './fixtures.js';
import { failedChecks, matchCounts, matchPlace, unknownChecks, unknownTally } from './match.js';

const check = (result: ReturnType<typeof matchPlace>, key: string) => result.checks.find((c) => c.key === key);

describe('a place against the numbers', () => {
  it('has nothing to say when no number is set', () => {
    expect(matchPlace('x', emptyCriteria(), m('x', { steps: 0 }), null)).toEqual({ recordId: 'x', overall: 'no-criteria', checks: [], usedTold: false });
  });
  it('is within the numbers when every fact fits', () => {
    const result = matchPlace('x', simple(), m('x', { steps: 0, doorWidthCm: 90 }), null);
    expect(result.overall).toBe('fits');
    expect(result.checks).toEqual([
      { key: 'steps', outcome: 'fits', source: 'measured', margin: 0, byRamp: false },
      { key: 'doorWidth', outcome: 'fits', source: 'measured', margin: 10, byRamp: false },
    ]);
  });
  it('counts a fact equal to the number as fitting', () => {
    expect(matchPlace('x', simple(), m('x', { steps: 0, doorWidthCm: 80 }), null).overall).toBe('fits');
    expect(matchPlace('x', simple({ maxSteps: 2 }), m('x', { steps: 2, doorWidthCm: 80 }), null).overall).toBe('fits');
  });
  it('is outside a number when one fact does not fit, whatever else is UNKNOWN', () => {
    const result = matchPlace('x', simple(), m('x', { doorWidthCm: 76 }), null);
    expect(result.overall).toBe('does-not-fit');
    expect(check(result, 'doorWidth')).toMatchObject({ outcome: 'does-not-fit', margin: -4 });
    expect(check(result, 'steps')?.outcome).toBe('unknown');
  });
  it('cannot say when a fact is UNKNOWN and nothing is outside', () => {
    const result = matchPlace('x', simple(), m('x', { doorWidthCm: 90 }), null);
    expect(result.overall).toBe('cannot-say');
    expect(unknownChecks(result)).toEqual(['steps']);
    expect(failedChecks(result)).toEqual([]);
  });
  it('cannot say for a place with no measures at all', () => {
    const result = matchPlace('x', strict(), null, null);
    expect(result.overall).toBe('cannot-say');
    expect(unknownChecks(result)).toHaveLength(6);
  });
  it('gives the margin for steps as steps over the number set', () => {
    expect(check(matchPlace('x', simple(), m('x', { steps: 3 }), null), 'steps')).toMatchObject({ outcome: 'does-not-fit', margin: 3 });
    expect(check(matchPlace('x', simple({ maxSteps: 2 }), m('x', { steps: 1 }), null), 'steps')).toMatchObject({ outcome: 'fits', margin: -1 });
  });
});

describe('a ramp in place of the step limits', () => {
  const steps = (over = {}) => ({ ...emptyCriteria(), maxSteps: 0, ...over });
  it('does not count a ramp unless the person said it may', () => {
    expect(matchPlace('x', steps(), m('x', { steps: 3, ramp: 'yes' }), null).overall).toBe('does-not-fit');
  });
  it('lets a ramp stand in for too many steps', () => {
    const result = matchPlace('x', steps({ rampInstead: true }), m('x', { steps: 3, ramp: 'yes' }), null);
    expect(result.overall).toBe('fits');
    expect(check(result, 'steps')).toEqual({ key: 'steps', outcome: 'fits', source: 'measured', margin: null, byRamp: true });
  });
  it('does not need the ramp when the steps already fit', () => {
    expect(check(matchPlace('x', steps({ rampInstead: true }), m('x', { steps: 0, ramp: 'no' }), null), 'steps')).toMatchObject({ outcome: 'fits', byRamp: false });
  });
  it('is outside the number when there are too many steps and no ramp', () => {
    expect(matchPlace('x', steps({ rampInstead: true }), m('x', { steps: 3, ramp: 'no' }), null).overall).toBe('does-not-fit');
  });
  it('cannot say when there are too many steps and the ramp is UNKNOWN', () => {
    expect(matchPlace('x', steps({ rampInstead: true }), m('x', { steps: 3 }), null).overall).toBe('cannot-say');
  });
  it('lets a ramp answer when the steps are UNKNOWN', () => {
    expect(matchPlace('x', steps({ rampInstead: true }), m('x', { ramp: 'yes' }), null).overall).toBe('fits');
    expect(matchPlace('x', steps({ rampInstead: true }), m('x', { ramp: 'no' }), null).overall).toBe('cannot-say');
  });
  it('lets a ramp stand in for a step that is too high', () => {
    const criteria = { ...emptyCriteria(), maxStepHeightCm: 5, rampInstead: true };
    expect(check(matchPlace('x', criteria, m('x', { stepHeightCm: 15, ramp: 'yes' }), null), 'stepHeight')).toMatchObject({ outcome: 'fits', byRamp: true });
    expect(matchPlace('x', criteria, m('x', { stepHeightCm: 15, ramp: 'no' }), null).overall).toBe('does-not-fit');
    expect(matchPlace('x', criteria, m('x', { stepHeightCm: 15 }), null).overall).toBe('cannot-say');
  });
});

describe('step height, the door and the toilet', () => {
  it('fits a step-height limit where there is no step at all', () => {
    const criteria = { ...emptyCriteria(), maxStepHeightCm: 5 };
    expect(check(matchPlace('x', criteria, m('x', { steps: 0 }), null), 'stepHeight')).toMatchObject({ outcome: 'fits', margin: null });
  });
  it('compares the highest step with the limit', () => {
    const criteria = { ...emptyCriteria(), maxStepHeightCm: 5 };
    expect(check(matchPlace('x', criteria, m('x', { steps: 1, stepHeightCm: 4.5 }), null), 'stepHeight')).toMatchObject({ outcome: 'fits', margin: -0.5 });
    expect(check(matchPlace('x', criteria, m('x', { steps: 1, stepHeightCm: 14 }), null), 'stepHeight')).toMatchObject({ outcome: 'does-not-fit', margin: 9 });
    expect(matchPlace('x', criteria, m('x', { steps: 2 }), null).overall).toBe('cannot-say');
  });
  it('reads "not by hand" as by itself or with a button', () => {
    const criteria = { ...emptyCriteria(), door: 'not-by-hand' as const };
    expect(matchPlace('x', criteria, m('x', { doorOpening: 'button' }), null).overall).toBe('fits');
    expect(matchPlace('x', criteria, m('x', { doorOpening: 'automatic' }), null).overall).toBe('fits');
    expect(matchPlace('x', criteria, m('x', { doorOpening: 'manual' }), null).overall).toBe('does-not-fit');
    expect(matchPlace('x', criteria, m('x', {}), null).overall).toBe('cannot-say');
  });
  it('reads "by itself" as automatic only', () => {
    const criteria = { ...emptyCriteria(), door: 'by-itself' as const };
    expect(matchPlace('x', criteria, m('x', { doorOpening: 'button' }), null).overall).toBe('does-not-fit');
    expect(matchPlace('x', criteria, m('x', { doorOpening: 'automatic' }), null).overall).toBe('fits');
  });
  it('asks for a wheelchair toilet', () => {
    const criteria = { ...emptyCriteria(), toilet: true };
    expect(matchPlace('x', criteria, m('x', { toilet: 'yes' }), null).overall).toBe('fits');
    expect(matchPlace('x', criteria, m('x', { toilet: 'no' }), null).overall).toBe('does-not-fit');
    expect(matchPlace('x', criteria, m('x', {}), null).overall).toBe('cannot-say');
  });
  it('is outside a toilet-door number where there is no wheelchair toilet', () => {
    const criteria = { ...emptyCriteria(), minToiletDoorCm: 85 };
    expect(check(matchPlace('x', criteria, m('x', { toilet: 'no' }), null), 'toiletDoor')).toMatchObject({ outcome: 'does-not-fit', margin: null });
    expect(check(matchPlace('x', criteria, m('x', { toilet: 'yes', toiletDoorCm: 86 }), null), 'toiletDoor')).toMatchObject({ outcome: 'fits', margin: 1 });
    expect(matchPlace('x', criteria, m('x', { toilet: 'yes' }), null).overall).toBe('cannot-say');
  });
});

describe('what the place said', () => {
  it('is not used unless the person says it may be', () => {
    const result = matchPlace('x', simple(), null, m('x', { steps: 0, doorWidthCm: 90 }));
    expect(result.overall).toBe('cannot-say');
    expect(result.usedTold).toBe(false);
  });
  it('fills in where the person has no measure, and is marked', () => {
    const result = matchPlace('x', simple({ countTold: true }), m('x', { doorWidthCm: 82 }), m('x', { steps: 0, doorWidthCm: 95 }));
    expect(result.overall).toBe('fits');
    expect(result.usedTold).toBe(true);
    expect(check(result, 'steps')?.source).toBe('told');
    expect(check(result, 'doorWidth')).toMatchObject({ source: 'measured', margin: 2 });
  });
  it('never overrides the person’s own measure', () => {
    const result = matchPlace('x', simple({ countTold: true }), m('x', { steps: 2, doorWidthCm: 76 }), m('x', { steps: 0, doorWidthCm: 95 }));
    expect(result.overall).toBe('does-not-fit');
    expect(result.usedTold).toBe(false);
  });
});

describe('counting results', () => {
  const results = [
    matchPlace('a', simple(), m('a', { steps: 0, doorWidthCm: 90 }), null),
    matchPlace('b', simple(), m('b', { doorWidthCm: 90 }), null),
    matchPlace('c', simple(), null, null),
    matchPlace('d', simple(), m('d', { steps: 4 }), null),
  ];
  it('counts each group, and the groups add up', () => {
    const counts = matchCounts(results);
    expect(counts).toEqual({ total: 4, fits: 1, doesNotFit: 1, cannotSay: 2 });
    expect(counts.fits + counts.doesNotFit + counts.cannotSay).toBe(counts.total);
  });
  it('tallies what is UNKNOWN among the places nothing can be said about, most first', () => {
    expect(unknownTally(results)).toEqual([
      { key: 'steps', places: 2 },
      { key: 'doorWidth', places: 1 },
    ]);
  });
  it('leaves a place that is already outside a number out of the tally', () => {
    expect(unknownTally([results[3]!])).toEqual([]);
  });
});
