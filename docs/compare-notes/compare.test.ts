import { describe, expect, it } from 'vitest';
import { compareAll, compareOne, emptyCounts, isKnownStatus, OUTCOME_ORDER, withOutcome } from './compare.js';
import { mine, pack } from './fixtures.js';

const outcome = (m: Parameters<typeof mine>[0], p: Parameters<typeof pack>[0] | null) => compareOne(mine(m), p === null ? [] : [pack(p)]).outcome;

describe('isKnownStatus', () => {
  it('knows yes, limited and no only', () => {
    for (const s of ['yes', 'limited', 'no']) expect(isKnownStatus(s)).toBe(true);
    for (const s of ['UNKNOWN', '', 'maybe']) expect(isKnownStatus(s)).toBe(false);
  });
});

describe('compareOne outcomes', () => {
  it('is new with no pack place nearby', () => expect(outcome({}, null)).toBe('new'));
  it('agrees when both give the same status', () => expect(outcome({ wheelchair: 'limited' }, { wheelchair: 'limited' })).toBe('agrees'));
  it('differs when the statuses are different', () => expect(outcome({ wheelchair: 'yes' }, { wheelchair: 'no' })).toBe('differs'));
  it('fills an UNKNOWN when only mine has a status', () => expect(outcome({ wheelchair: 'no' }, { wheelchair: 'UNKNOWN' })).toBe('fills-unknown'));
  it('never treats my UNKNOWN as a difference', () => expect(outcome({ wheelchair: 'UNKNOWN' }, { wheelchair: 'yes' })).toBe('mine-unknown'));
  it('keeps UNKNOWN on both sides as UNKNOWN', () => expect(outcome({ wheelchair: 'UNKNOWN' }, { wheelchair: 'UNKNOWN' })).toBe('both-unknown'));
  it('treats an unrecognised status as not known', () => expect(outcome({ wheelchair: 'maybe' }, { wheelchair: 'yes' })).toBe('mine-unknown'));
  it('is unsure when the match is unsure, whatever the statuses', () => expect(outcome({ wheelchair: 'yes' }, { wheelchair: 'no', name: 'City Arena' })).toBe('unsure'));
});

describe('compareOne details', () => {
  it('says which record is newer and by how many days', () => {
    expect(compareOne(mine(), [pack()])).toMatchObject({ newer: 'mine', daysApart: 40 });
    expect(compareOne(mine({ observedOn: '2026-09-01' }), [pack()])).toMatchObject({ newer: 'theirs', daysApart: 30 });
    expect(compareOne(mine({ observedOn: '2026-10-01' }), [pack()])).toMatchObject({ newer: 'same-day', daysApart: 0 });
  });
  it('does not guess which is newer from a date that is not a day, or with no match', () => {
    expect(compareOne(mine({ observedOn: 'last week' }), [pack()])).toMatchObject({ newer: 'unknown', daysApart: null });
    expect(compareOne(mine(), [])).toMatchObject({ newer: 'unknown', daysApart: null });
  });
  it('flags different licences and leaves both as they are', () => {
    const out = compareOne(mine(), [pack()]);
    expect(out.licenceDiffers).toBe(true);
    expect(out.mine.licence).toBe('CC0-1.0');
    expect(out.match.best?.record.licence).toBe('ODbL-1.0');
    expect(compareOne(mine({ licence: 'ODbL-1.0' }), [pack()]).licenceDiffers).toBe(false);
  });
  it('flags different names only on a same-id match', () => {
    expect(compareOne(mine({ id: 'p1' }), [pack({ name: 'City Arena' })]).nameDiffers).toBe(true);
    expect(compareOne(mine(), [pack()]).nameDiffers).toBe(false);
    expect(compareOne(mine({ name: null }), [pack()]).nameDiffers).toBe(false);
  });
  it('uses the radius it is given', () => {
    const far = pack({ lat: 43.8504 });
    expect(compareOne(mine(), [far], 30).outcome).toBe('new');
    expect(compareOne(mine(), [far], 60).outcome).toBe('agrees');
  });
});

describe('compareAll', () => {
  const myNotes = [
    mine({ id: 'agree' }),
    mine({ id: 'diff', lat: 43.9, wheelchair: 'no' }),
    mine({ id: 'new', lat: 44.5 }),
    mine({ id: 'fill', lat: 43.95 }),
  ];
  const packs = [pack(), pack({ id: 'p2', lat: 43.9001 }), pack({ id: 'p3', lat: 43.9501, wheelchair: 'UNKNOWN' })];
  const report = compareAll(myNotes, packs);
  it('orders what needs a look first', () => expect(report.items.map((i) => i.mine.id)).toEqual(['diff', 'fill', 'new', 'agree']));
  it('counts each outcome', () => {
    expect(report.counts).toEqual({ ...emptyCounts(), total: 4, differs: 1, 'fills-unknown': 1, new: 1, agrees: 1 });
  });
  it('records the radius and the number of pack places', () => {
    expect(report.radius).toBe(30);
    expect(report.packPlaces).toBe(3);
  });
  it('keeps every observation exactly once', () => expect(report.items).toHaveLength(myNotes.length));
  it('is empty and calm with nothing to compare', () => {
    expect(compareAll([], packs).counts.total).toBe(0);
    expect(compareAll(myNotes, []).counts.new).toBe(4);
  });
  it('does not change its inputs', () => {
    const a = JSON.parse(JSON.stringify(myNotes));
    const b = JSON.parse(JSON.stringify(packs));
    compareAll(myNotes, packs);
    expect(myNotes).toEqual(a);
    expect(packs).toEqual(b);
  });
  it('filters by outcome', () => {
    expect(withOutcome(report, 'differs').map((i) => i.mine.id)).toEqual(['diff']);
    expect(withOutcome(report, 'all')).toHaveLength(4);
    expect(withOutcome(report, 'unsure')).toEqual([]);
  });
  it('lists every outcome once in its order', () => expect(new Set(OUTCOME_ORDER).size).toBe(7));
});
