import { describe, expect, it } from 'vitest';
import { LOOK_AGAIN_AFTER_DAYS, daysSince, followUpFor, followUps } from './follow-up.js';
import type { Ledger, LedgerEntry } from './ledger.js';

const entry = (over: Partial<LedgerEntry> = {}): LedgerEntry => ({ recordId: 'a', markedOn: '2026-10-01', changeset: null, note: '', lookedAgainOn: null, ...over });

describe('daysSince', () => {
  it('counts whole days and returns null for a day that is not real', () => {
    expect(daysSince('2026-11-01', '2026-11-16')).toBe(15);
    expect(daysSince('x', '2026-11-16')).toBeNull();
  });
});

describe('followUpFor', () => {
  it('is not due before the wait is over', () => {
    expect(followUpFor(entry({ markedOn: '2026-10-18' }), '2026-11-16')).toBeNull();
  });
  it('is due once the wait is over, with the days counted', () => {
    expect(followUpFor(entry({ markedOn: '2026-10-17' }), '2026-11-16')).toEqual({ recordId: 'a', reason: 'never-looked', days: 30 });
  });
  it('is not due when the person looked recently', () => {
    expect(followUpFor(entry({ lookedAgainOn: '2026-10-20' }), '2026-11-16')).toBeNull();
  });
  it('asks again after three times the wait since the last look', () => {
    expect(followUpFor(entry({ lookedAgainOn: '2026-08-18' }), '2026-11-16')).toEqual({ recordId: 'a', reason: 'looked-long-ago', days: 90 });
    expect(followUpFor(entry({ lookedAgainOn: '2026-08-19' }), '2026-11-16')).toBeNull();
  });
  it('honours a different wait', () => {
    expect(followUpFor(entry({ markedOn: '2026-11-10' }), '2026-11-16', 5)?.days).toBe(6);
  });
  it('is not due for a marked day in the future', () => {
    expect(followUpFor(entry({ markedOn: '2026-12-01' }), '2026-11-16')).toBeNull();
  });
  it('uses 30 days by default', () => expect(LOOK_AGAIN_AFTER_DAYS).toBe(30));
});

describe('followUps', () => {
  const ledger: Ledger = {
    version: 1,
    entries: [entry({ recordId: 'c', markedOn: '2026-09-01' }), entry({ recordId: 'a', markedOn: '2026-09-01' }), entry({ recordId: 'b', markedOn: '2026-08-01' }), entry({ recordId: 'd', markedOn: '2026-11-10' })],
  };
  it('lists the longest wait first and breaks ties by id', () => {
    expect(followUps(ledger, '2026-11-16').map((f) => f.recordId)).toEqual(['b', 'a', 'c']);
  });
  it('lists nothing for an empty ledger', () => {
    expect(followUps({ version: 1, entries: [] }, '2026-11-16')).toEqual([]);
  });
  it('does not change the ledger', () => {
    const copy = JSON.parse(JSON.stringify(ledger));
    followUps(ledger, '2026-11-16');
    expect(ledger).toEqual(copy);
  });
});
