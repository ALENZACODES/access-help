import { describe, expect, it } from 'vitest';
import type { Ledger, LedgerEntry } from './ledger.js';
import { ledgerSummaryText, nextToSubmit, summarise } from './summary.js';

const e = (recordId: string, markedOn: string, over: Partial<LedgerEntry> = {}): LedgerEntry => ({ recordId, markedOn, changeset: null, note: '', lookedAgainOn: null, ...over });
const records = [
  { id: 'a', name: 'A', observedOn: '2026-03-01' },
  { id: 'b', name: null, observedOn: '2026-01-15' },
  { id: 'c', name: 'C', observedOn: '2026-01-15' },
  { id: 'd', name: 'D', observedOn: '2026-05-01' },
];
const ledger: Ledger = { version: 1, entries: [e('a', '2026-04-02', { changeset: '5' }), e('d', '2026-04-20'), e('gone', '2026-03-01')] };

describe('summarise', () => {
  const s = summarise(records, ledger, '2026-11-16');
  it('counts saved, marked and not marked', () => {
    expect(s.total).toBe(4);
    expect(s.marked).toBe(2);
    expect(s.notMarked).toBe(2);
  });
  it('counts entries whose place is gone separately and leaves them out of the rest', () => {
    expect(s.orphans).toBe(1);
    expect(s.byMonth).toEqual([{ month: '2026-04', count: 2 }]);
    expect(s.followUps.map((f) => f.recordId)).toEqual(['a', 'd']);
  });
  it('counts marks with a changeset number', () => expect(s.withChangeset).toBe(1));
  it('handles nothing saved and nothing marked', () => {
    expect(summarise([], { version: 1, entries: [] }, '2026-11-16')).toEqual({ total: 0, marked: 0, notMarked: 0, orphans: 0, followUps: [], byMonth: [], withChangeset: 0 });
  });
  it('sorts months oldest first', () => {
    const r = summarise(records, { version: 1, entries: [e('a', '2026-09-02'), e('b', '2026-02-02'), e('c', '2026-09-30')] }, '2026-11-16');
    expect(r.byMonth).toEqual([{ month: '2026-02', count: 1 }, { month: '2026-09', count: 2 }]);
  });
  it('never counts more marked than saved', () => {
    expect(s.marked).toBeLessThanOrEqual(s.total);
    expect(s.marked + s.notMarked).toBe(s.total);
  });
});

describe('nextToSubmit', () => {
  it('lists unmarked places, oldest observation first, then by id', () => {
    expect(nextToSubmit(records, ledger).map((r) => r.id)).toEqual(['b', 'c']);
  });
  it('honours the limit, including zero', () => {
    expect(nextToSubmit(records, { version: 1, entries: [] }, 2).map((r) => r.id)).toEqual(['b', 'c']);
    expect(nextToSubmit(records, { version: 1, entries: [] }, 0)).toEqual([]);
    expect(nextToSubmit(records, { version: 1, entries: [] }, -3)).toEqual([]);
  });
  it('does not reorder the records it was given', () => {
    const copy = JSON.parse(JSON.stringify(records));
    nextToSubmit(records, ledger);
    expect(records).toEqual(copy);
  });
});

describe('ledgerSummaryText', () => {
  it('says what was told to the App and that it cannot see OpenStreetMap', () => {
    const s = summarise(records, ledger, '2026-11-16');
    expect(ledgerSummaryText(s, 'en')).toBe('You marked 2 of 4 saved observations as submitted. 2 not marked yet. These counts are what you told the App. It cannot see OpenStreetMap.');
    expect(ledgerSummaryText(s, 'fr')).toContain('Elle ne peut pas voir OpenStreetMap.');
  });
  it('has its own text for no saved observations', () => {
    const s = summarise([], { version: 1, entries: [] }, '2026-11-16');
    expect(ledgerSummaryText(s, 'en')).toBe('You have no saved observations.');
  });
});
