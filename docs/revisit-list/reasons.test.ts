import { describe, expect, it } from 'vitest';
import { place, TODAY } from './fixtures.js';
import { ageDays, cleanReasons, reasonsFor, reasonWeight, REASONS, scoreOf } from './reasons.js';

describe('ageDays', () => {
  it('counts whole days', () => expect(ageDays('2026-11-08', TODAY)).toBe(10));
  it('is zero for today', () => expect(ageDays(TODAY, TODAY)).toBe(0));
  it('is null for a date that is not a day, or is after today', () => {
    expect(ageDays('soon', TODAY)).toBeNull();
    expect(ageDays('2026-02-30', TODAY)).toBeNull();
    expect(ageDays('2026-11-19', TODAY)).toBeNull();
  });
});

describe('reasonsFor', () => {
  it('finds no reason for a recent, named place with a status', () => expect(reasonsFor(place(), TODAY)).toEqual([]));
  it('lists an UNKNOWN status', () => expect(reasonsFor(place({ wheelchair: 'UNKNOWN' }), TODAY)).toEqual(['status-unknown']));
  it('treats an unrecognised status as UNKNOWN', () => expect(reasonsFor(place({ wheelchair: 'maybe' }), TODAY)).toEqual(['status-unknown']));
  it('lists a pack conflict once, not also as UNKNOWN', () => {
    expect(reasonsFor(place({ wheelchair: 'UNKNOWN' }, 'status'), TODAY)).toEqual(['packs-disagree']);
    expect(reasonsFor(place({}, 'location'), TODAY)).toEqual(['packs-disagree']);
  });
  it('lists old from one year and very old from two', () => {
    expect(reasonsFor(place({ observedOn: '2025-11-18' }), TODAY)).toEqual(['old']);
    expect(reasonsFor(place({ observedOn: '2025-11-19' }), TODAY)).toEqual([]);
    expect(reasonsFor(place({ observedOn: '2024-11-18' }), TODAY)).toEqual(['very-old']);
    expect(reasonsFor(place({ observedOn: '2024-11-19' }), TODAY)).toEqual(['old']);
  });
  it('lists an unclear date instead of guessing an age', () => {
    expect(reasonsFor(place({ observedOn: 'spring' }), TODAY)).toEqual(['date-unclear']);
    expect(reasonsFor(place({ observedOn: '2027-01-01' }), TODAY)).toEqual(['date-unclear']);
  });
  it('lists a missing name', () => {
    expect(reasonsFor(place({ name: null }), TODAY)).toEqual(['no-name']);
    expect(reasonsFor(place({ name: '  ' }), TODAY)).toEqual(['no-name']);
  });
  it('puts the heaviest reason first', () => {
    expect(reasonsFor(place({ name: null, wheelchair: 'UNKNOWN', observedOn: '2020-01-01' }), TODAY)).toEqual(['status-unknown', 'very-old', 'no-name']);
  });
  it('does not change the place', () => {
    const p = place({ wheelchair: 'UNKNOWN' });
    const copy = JSON.parse(JSON.stringify(p));
    reasonsFor(p, TODAY);
    expect(p).toEqual(copy);
  });
});

describe('weights', () => {
  it('weighs a disagreement above UNKNOWN above age above a missing name', () => {
    expect(reasonWeight('packs-disagree')).toBeGreaterThan(reasonWeight('status-unknown'));
    expect(reasonWeight('status-unknown')).toBeGreaterThan(reasonWeight('very-old'));
    expect(reasonWeight('very-old')).toBeGreaterThan(reasonWeight('old'));
    expect(reasonWeight('old')).toBeGreaterThan(reasonWeight('no-name'));
  });
  it('sums a score', () => {
    expect(scoreOf([])).toBe(0);
    expect(scoreOf(['status-unknown', 'no-name'])).toBe(5);
  });
});

describe('cleanReasons', () => {
  it('keeps known reasons in the fixed order and drops the rest', () => {
    expect(cleanReasons(['old', 'nope', 'packs-disagree'])).toEqual(['packs-disagree', 'old']);
    expect(cleanReasons([])).toEqual([]);
    expect(cleanReasons([...REASONS])).toEqual([...REASONS]);
  });
});
