import { describe, expect, it } from 'vitest';
import { cleanCriteria, criteriaFormFrom, emptyCriteria, emptyCriteriaForm, hasCriteria, isDoorNeed, readCriteriaForm, sameCriteria, setCriteria, type CriteriaForm } from './criteria.js';
import { simple, strict } from './fixtures.js';

const form = (over: Partial<CriteriaForm> = {}): CriteriaForm => ({ ...emptyCriteriaForm(), ...over });

describe('the numbers a person sets', () => {
  it('start with nothing set', () => {
    expect(setCriteria(emptyCriteria())).toEqual([]);
    expect(hasCriteria(emptyCriteria())).toBe(false);
  });
  it('list what is set, in a fixed order', () => {
    expect(setCriteria(simple())).toEqual(['steps', 'doorWidth']);
    expect(setCriteria(strict())).toEqual(['steps', 'stepHeight', 'doorWidth', 'door', 'toilet', 'toiletDoor']);
  });
  it('count zero steps as a number that is set', () => {
    expect(setCriteria({ ...emptyCriteria(), maxSteps: 0 })).toEqual(['steps']);
  });
  it('do not count the two switches as criteria by themselves', () => {
    expect(hasCriteria({ ...emptyCriteria(), rampInstead: true, countTold: true })).toBe(false);
  });
  it('know the ways a door can be asked for', () => {
    expect(isDoorNeed('not-by-hand')).toBe(true);
    expect(isDoorNeed('sliding')).toBe(false);
  });
});

describe('reading the form', () => {
  it('reads an empty form as nothing set', () => {
    expect(readCriteriaForm(form())).toEqual({ ok: true, criteria: emptyCriteria() });
  });
  it('reads numbers, choices and switches', () => {
    const result = readCriteriaForm(form({ maxSteps: '1', rampInstead: true, maxStepHeight: '5', minDoorWidth: '80', door: 'not-by-hand', toilet: true, minToiletDoor: '85' }));
    expect(result).toEqual({ ok: true, criteria: strict() });
  });
  it('reads inches, metres and a decimal comma into centimetres', () => {
    const result = readCriteriaForm(form({ minDoorWidth: '32 in', minToiletDoor: '0.9 m', maxStepHeight: '2,5' }));
    expect(result.ok && result.criteria).toMatchObject({ minDoorWidthCm: 81.3, minToiletDoorCm: 90, maxStepHeightCm: 2.5 });
  });
  it('refuses steps that are not a whole number or are too many', () => {
    expect(readCriteriaForm(form({ maxSteps: 'none' }))).toEqual({ ok: false, issues: [{ field: 'maxSteps', code: 'not-a-whole-number' }] });
    expect(readCriteriaForm(form({ maxSteps: '1.5' }))).toMatchObject({ ok: false });
    expect(readCriteriaForm(form({ maxSteps: '99' }))).toEqual({ ok: false, issues: [{ field: 'maxSteps', code: 'too-large' }] });
  });
  it('refuses a length it cannot read or that is out of range, and reports every problem', () => {
    const result = readCriteriaForm(form({ minDoorWidth: 'wide', minToiletDoor: '5', maxStepHeight: '900' }));
    expect(result).toEqual({
      ok: false,
      issues: [
        { field: 'maxStepHeight', code: 'too-large' },
        { field: 'minDoorWidth', code: 'not-a-length' },
        { field: 'minToiletDoor', code: 'too-small' },
      ],
    });
  });
  it('reads a door choice it does not know as "any"', () => {
    const result = readCriteriaForm(form({ door: 'magic' }));
    expect(result.ok && result.criteria.door).toBe('any');
  });
  it('puts criteria back into the form in either decimal style, and reads them back', () => {
    const criteria = strict({ minDoorWidthCm: 81.3 });
    expect(criteriaFormFrom(criteria, ',').minDoorWidth).toBe('81,3');
    expect(criteriaFormFrom(criteria, '.').minDoorWidth).toBe('81.3');
    for (const decimal of ['.', ','] as const) expect(readCriteriaForm(criteriaFormFrom(criteria, decimal))).toEqual({ ok: true, criteria });
    expect(criteriaFormFrom(emptyCriteria(), '.')).toEqual(emptyCriteriaForm());
  });
});

describe('reading stored criteria', () => {
  it('reads back what was stored', () => {
    expect(cleanCriteria(JSON.parse(JSON.stringify(strict())))).toEqual(strict());
  });
  it('reads anything else as nothing set', () => {
    for (const bad of [null, 'x', 4, [], {}]) expect(cleanCriteria(bad)).toEqual(emptyCriteria());
  });
  it('drops a number out of range or of the wrong kind, never keeps it', () => {
    const clean = cleanCriteria({ maxSteps: 2.5, maxStepHeightCm: -1, minDoorWidthCm: '80', minToiletDoorCm: 9000, door: 'x', toilet: 'yes', rampInstead: 1, countTold: 'true' });
    expect(clean).toEqual(emptyCriteria());
  });
  it('keeps one decimal of a centimetre', () => {
    expect(cleanCriteria({ minDoorWidthCm: 80.449 }).minDoorWidthCm).toBe(80.4);
  });
  it('compares two sets of numbers', () => {
    expect(sameCriteria(simple(), simple())).toBe(true);
    expect(sameCriteria(simple(), simple({ minDoorWidthCm: 81 }))).toBe(false);
    expect(sameCriteria(simple(), { ...simple(), extra: 1 } as never)).toBe(true);
  });
});
