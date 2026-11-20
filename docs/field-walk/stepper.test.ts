import { describe, expect, it } from 'vitest';
import { UNITS, inUnit, isUnit, nudgeCount, nudgeLength, withUnit } from './stepper.js';
import { checkAnswer } from './walk.js';

describe('nudgeCount', () => {
  it('adds and takes away one', () => {
    expect(nudgeCount('2', 1)).toBe('3');
    expect(nudgeCount('2', -1)).toBe('1');
  });
  it('starts an empty count at one going up and zero going down', () => {
    expect(nudgeCount('', 1)).toBe('1');
    expect(nudgeCount('  ', -1)).toBe('0');
  });
  it('stops at zero and at the most the App keeps', () => {
    expect(nudgeCount('0', -1)).toBe('0');
    expect(nudgeCount('60', 1)).toBe('60');
    expect(nudgeCount('999', -1)).toBe('60');
  });
  it('leaves an unreadable count as typed', () => {
    expect(nudgeCount('two', 1)).toBe('two');
    expect(nudgeCount('2.5', 1)).toBe('2.5');
  });
});

describe('nudgeLength', () => {
  it('moves by half a unit', () => {
    expect(nudgeLength('82', 1)).toBe('82.5');
    expect(nudgeLength('82.5', 1)).toBe('83');
    expect(nudgeLength('82', -1)).toBe('81.5');
  });
  it('reads a comma', () => {
    expect(nudgeLength('82,5', -1)).toBe('82');
  });
  it('never goes below zero', () => {
    expect(nudgeLength('0.2', -1)).toBe('0');
  });
  it('invents nothing in an empty or unreadable field', () => {
    expect(nudgeLength('', 1)).toBe('');
    expect(nudgeLength('32 in', 1)).toBe('32 in');
    expect(nudgeLength('wide', -1)).toBe('wide');
  });
});

describe('withUnit and inUnit', () => {
  it('knows the two units', () => {
    expect(UNITS).toEqual(['cm', 'in']);
    expect(isUnit('cm')).toBe(true);
    expect(isUnit('m')).toBe(false);
  });
  it('leaves centimetres bare and marks inches', () => {
    expect(withUnit(' 82 ', 'cm')).toBe('82');
    expect(withUnit('32', 'in')).toBe('32 in');
    expect(withUnit('32,5', 'in')).toBe('32,5 in');
  });
  it('does not mark an empty field or one that already carries a unit', () => {
    expect(withUnit('', 'in')).toBe('');
    expect(withUnit('32 in', 'in')).toBe('32 in');
    expect(withUnit('81 cm', 'in')).toBe('81 cm');
  });
  it('gives inches the walk reads as centimetres', () => {
    expect(checkAnswer('doorWidth', withUnit('32', 'in'))).toEqual({ ok: true, value: '81.3' });
  });
  it('shows a kept length in either unit', () => {
    expect(inUnit('81.3', 'cm')).toBe('81.3');
    expect(inUnit('81.3', 'in')).toBe('32');
    expect(inUnit('86', 'in')).toBe('33.9');
    expect(inUnit('', 'cm')).toBe('');
  });
});
