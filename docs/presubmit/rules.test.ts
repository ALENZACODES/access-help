import { describe, expect, it } from 'vitest';
import { rec, TODAY } from './fixtures.js';
import { checkRecord, hasOddSpacing, isShouting, metresBetween, severityRank, type FindingCode } from './rules.js';

const codes = (over: Parameters<typeof rec>[0], nearby = [] as Parameters<typeof checkRecord>[2]): FindingCode[] =>
  checkRecord(rec(over), TODAY, nearby).map((f) => f.code);

describe('checkRecord', () => {
  it('finds nothing wrong with a good record', () => expect(codes({})).toEqual([]));
  it('flags a date that is not a day', () => expect(codes({ observedOn: '2026-13-01' })).toContain('date-invalid'));
  it('flags a future date with the number of days', () => {
    const f = checkRecord(rec({ observedOn: '2026-11-20' }), TODAY).find((x) => x.code === 'date-future');
    expect(f).toMatchObject({ severity: 'fix', days: 4 });
  });
  it('accepts today', () => expect(codes({ observedOn: TODAY })).toEqual([]));
  it('flags an old observation from one year on', () => {
    expect(codes({ observedOn: '2025-11-16' })).toContain('old-observation');
    expect(codes({ observedOn: '2025-11-17' })).not.toContain('old-observation');
  });
  it('flags an empty or blank source', () => {
    expect(codes({ source: '' })).toContain('source-empty');
    expect(codes({ source: '   ' })).toContain('source-empty');
  });
  it('flags a licence that is not open', () => {
    expect(codes({ licence: 'CC-BY-4.0' })).toContain('licence-not-open');
    expect(codes({ licence: 'ODbL-1.0' })).toEqual([]);
  });
  it('flags coordinates outside Ontario', () => expect(codes({ lat: 49.28, lon: -123.12 })).toContain('outside-ontario'));
  it('flags short coordinates and reports the digits', () => {
    const f = checkRecord(rec({ lat: 43.85, lon: -79.4345678 }), TODAY).find((x) => x.code === 'low-precision');
    expect(f?.digits).toBe(2);
    expect(codes({ lat: 43.85123, lon: -79.43456 })).not.toContain('low-precision');
  });
  it('notes a missing name without asking for one', () => {
    for (const name of [null, '', '   ']) {
      const f = checkRecord(rec({ name }), TODAY);
      expect(f.map((x) => x.code)).toEqual(['name-missing']);
      expect(f[0]?.severity).toBe('note');
    }
  });
  it('flags a name that is too long', () => expect(codes({ name: 'x'.repeat(256) })).toContain('name-too-long'));
  it('flags shouting, odd spacing and contact details in names', () => {
    expect(codes({ name: 'CITY HALL' })).toContain('name-shouting');
    expect(codes({ name: ' City  Hall' })).toContain('name-spacing');
    expect(codes({ name: 'Cafe www.example.org' })).toContain('name-contact');
    expect(codes({ name: 'Cafe 416-555-0123' })).toContain('name-contact');
    expect(codes({ name: 'Cafe a@b.org' })).toContain('name-contact');
  });
  it('notes UNKNOWN status and does not flag the other statuses', () => {
    expect(codes({ wheelchair: 'UNKNOWN' })).toEqual(['status-unknown']);
    for (const s of ['yes', 'limited', 'no']) expect(codes({ wheelchair: s })).toEqual([]);
  });
  it('adds a near-other finding for either side of a pair', () => {
    const pair = { a: 'r1', b: 'r2', metres: 7.4 };
    expect(checkRecord(rec(), TODAY, [pair]).find((f) => f.code === 'near-other')).toMatchObject({ other: 'r2', metres: 7 });
    expect(checkRecord(rec({ id: 'r2' }), TODAY, [pair]).find((f) => f.code === 'near-other')).toMatchObject({ other: 'r1' });
    expect(checkRecord(rec({ id: 'r9' }), TODAY, [pair])).toEqual([]);
  });
  it('lists fixes before looks before notes', () => {
    const f = checkRecord(rec({ name: null, wheelchair: 'UNKNOWN', source: '', lat: 49.28, lon: -123.12 }), TODAY);
    const ranks = f.map((x) => severityRank(x.severity));
    expect([...ranks].sort()).toEqual(ranks);
    expect(f[0]?.severity).toBe('fix');
  });
  it('never marks a record as correct or confirmed', () => {
    for (const f of checkRecord(rec({ source: '' }), TODAY)) expect(Object.keys(f)).not.toContain('ok');
  });
});

describe('name helpers', () => {
  it('detects shouting only for four or more capital letters', () => {
    expect(isShouting('CITY HALL')).toBe(true);
    expect(isShouting('YMCA')).toBe(true);
    expect(isShouting('LCBO')).toBe(true);
    expect(isShouting('Tim')).toBe(false);
    expect(isShouting('ABC')).toBe(false);
    expect(isShouting('1234')).toBe(false);
  });
  it('detects odd spacing', () => {
    expect(hasOddSpacing('a  b')).toBe(true);
    expect(hasOddSpacing(' a')).toBe(true);
    expect(hasOddSpacing('a b')).toBe(false);
  });
});

describe('metresBetween', () => {
  it('rounds to whole metres and is null for a bad point', () => {
    expect(metresBetween(rec(), rec({ lat: 43.85132 }))).toBe(10);
    expect(metresBetween(rec(), rec({ lat: Number.NaN }))).toBeNull();
  });
});
