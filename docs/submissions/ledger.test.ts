import { describe, expect, it } from 'vitest';
import {
  MAX_ENTRIES,
  MAX_NOTE,
  emptyLedger,
  entryFor,
  isLedgerEntry,
  markSubmitted,
  pruneLedger,
  readLedger,
  recordLookedAgain,
  statusOf,
  unmark,
  type Ledger,
  type LedgerEntry,
} from './ledger.js';

const TODAY = '2026-11-16';
const rec = { id: 'p1', observedOn: '2026-11-01' };
const input = { markedOn: '2026-11-10', changeset: '', note: '' };

function marked(ledger: Ledger = emptyLedger(), over: Partial<typeof input> = {}): Ledger {
  const result = markSubmitted(ledger, rec, { ...input, ...over }, TODAY);
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.ledger;
}

describe('markSubmitted', () => {
  it('adds an entry with null for an empty changeset', () => {
    expect(marked().entries).toEqual([{ recordId: 'p1', markedOn: '2026-11-10', changeset: null, note: '', lookedAgainOn: null }]);
  });
  it('reads a pasted changeset and trims the note', () => {
    const ledger = marked(emptyLedger(), { changeset: 'changeset #0042', note: '  at the door  ' });
    expect(ledger.entries[0]).toMatchObject({ changeset: '42', note: 'at the door' });
  });
  it('accepts today and the day the place was seen', () => {
    expect(markSubmitted(emptyLedger(), rec, { ...input, markedOn: TODAY }, TODAY).ok).toBe(true);
    expect(markSubmitted(emptyLedger(), rec, { ...input, markedOn: rec.observedOn }, TODAY).ok).toBe(true);
  });
  it('rejects an invalid, future or too-early day', () => {
    const code = (markedOn: string) => {
      const r = markSubmitted(emptyLedger(), rec, { ...input, markedOn }, TODAY);
      return r.ok ? null : r.issues[0]?.code;
    };
    expect(code('2026-02-30')).toBe('date-invalid');
    expect(code('')).toBe('date-invalid');
    expect(code('2026-11-17')).toBe('date-future');
    expect(code('2026-10-31')).toBe('date-before-seen');
  });
  it('rejects a bad changeset and a long note, and reports every problem at once', () => {
    const r = markSubmitted(emptyLedger(), rec, { markedOn: 'x', changeset: 'abc', note: 'n'.repeat(MAX_NOTE + 1) }, TODAY);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.map((i) => `${i.field}:${i.code}`)).toEqual(['markedOn:date-invalid', 'changeset:changeset-not-a-number', 'note:note-too-long']);
  });
  it('allows a note of exactly the limit, counted in characters', () => {
    expect(markSubmitted(emptyLedger(), rec, { ...input, note: '😀'.repeat(MAX_NOTE) }, TODAY).ok).toBe(true);
  });
  it('does not change the ledger it was given', () => {
    const start = emptyLedger();
    marked(start);
    expect(start.entries).toEqual([]);
  });
  it('replaces the entry for the same place', () => {
    const first = marked();
    const second = marked(first, { markedOn: '2026-11-12', note: 'again' });
    expect(second.entries).toHaveLength(1);
    expect(second.entries[0]).toMatchObject({ markedOn: '2026-11-12', note: 'again' });
  });
  it('keeps a looked-again day only if it is not before the new marked day', () => {
    const looked = recordLookedAgain(marked(), 'p1', '2026-11-14', TODAY);
    expect(looked.ok).toBe(true);
    if (!looked.ok) return;
    expect(marked(looked.ledger, { markedOn: '2026-11-12' }).entries[0]?.lookedAgainOn).toBe('2026-11-14');
    expect(marked(looked.ledger, { markedOn: '2026-11-15' }).entries[0]?.lookedAgainOn).toBeNull();
  });
  it('keeps entries in id order', () => {
    let ledger = emptyLedger();
    for (const id of ['b', 'c', 'a']) {
      const r = markSubmitted(ledger, { id, observedOn: '2026-01-01' }, input, TODAY);
      if (r.ok) ledger = r.ledger;
    }
    expect(ledger.entries.map((e) => e.recordId)).toEqual(['a', 'b', 'c']);
  });
  it('refuses a new entry when the ledger is full, but still lets an existing one change', () => {
    const entries: LedgerEntry[] = Array.from({ length: MAX_ENTRIES }, (_, i) => ({ recordId: `r${String(i).padStart(4, '0')}`, markedOn: '2026-11-01', changeset: null, note: '', lookedAgainOn: null }));
    const full: Ledger = { version: 1, entries };
    const add = markSubmitted(full, { id: 'new', observedOn: '2026-01-01' }, input, TODAY);
    expect(add.ok).toBe(false);
    if (!add.ok) expect(add.issues[0]?.code).toBe('ledger-full');
    expect(markSubmitted(full, { id: 'r0001', observedOn: '2026-01-01' }, input, TODAY).ok).toBe(true);
  });
});

describe('recordLookedAgain', () => {
  it('sets the day', () => {
    const r = recordLookedAgain(marked(), 'p1', '2026-11-15', TODAY);
    expect(r.ok && entryFor(r.ledger, 'p1')?.lookedAgainOn).toBe('2026-11-15');
  });
  it('rejects a bad, future or too-early day, or a place that was not marked', () => {
    const code = (day: string, id = 'p1') => {
      const r = recordLookedAgain(marked(), id, day, TODAY);
      return r.ok ? null : r.issues[0]?.code;
    };
    expect(code('nope')).toBe('date-invalid');
    expect(code('2026-11-17')).toBe('date-future');
    expect(code('2026-11-09')).toBe('date-before-marked');
    expect(recordLookedAgain(marked(), 'zzz', '2026-11-15', TODAY).ok).toBe(false);
  });
});

describe('unmark, prune and status', () => {
  it('removes one entry', () => {
    expect(unmark(marked(), 'p1').entries).toEqual([]);
    expect(unmark(marked(), 'other').entries).toHaveLength(1);
  });
  it('drops entries for places that are no longer saved, and returns the same ledger when nothing is dropped', () => {
    const ledger = marked();
    expect(pruneLedger(ledger, ['p1'])).toBe(ledger);
    expect(pruneLedger(ledger, ['x']).entries).toEqual([]);
  });
  it('says marked or not marked', () => {
    expect(statusOf(undefined)).toBe('not-marked');
    expect(statusOf(marked().entries[0])).toBe('marked');
  });
});

describe('isLedgerEntry and readLedger', () => {
  const good = { recordId: 'a', markedOn: '2026-11-01', changeset: '7', note: 'x', lookedAgainOn: '2026-11-05' };
  it('accepts a well-formed entry', () => expect(isLedgerEntry(good)).toBe(true));
  it('rejects each kind of malformed entry', () => {
    const bad: unknown[] = [
      null, 'x', 5, [], {},
      { ...good, recordId: '' },
      { ...good, recordId: 'x'.repeat(121) },
      { ...good, markedOn: '2026-02-30' },
      { ...good, changeset: '0' },
      { ...good, changeset: 12 },
      { ...good, note: 5 },
      { ...good, note: 'n'.repeat(MAX_NOTE + 1) },
      { ...good, lookedAgainOn: '2026-10-31' },
      { ...good, lookedAgainOn: 'x' },
      { ...good, lookedAgainOn: undefined },
    ];
    for (const item of bad) expect(isLedgerEntry(item), JSON.stringify(item)).toBe(false);
  });
  it('reads nothing from the wrong shape', () => {
    for (const value of [null, 3, 'x', [], {}, { entries: 'x' }]) expect(readLedger(value)).toEqual({ ledger: emptyLedger(), dropped: 0 });
  });
  it('keeps good entries, drops bad and repeated ones, and counts them', () => {
    const r = readLedger({ entries: [good, { ...good, markedOn: 'x' }, { ...good, note: 'second' }, { ...good, recordId: 'b' }, 7] });
    expect(r.ledger.entries.map((e) => e.recordId)).toEqual(['a', 'b']);
    expect(r.ledger.entries[0]?.note).toBe('x');
    expect(r.dropped).toBe(3);
  });
  it('does not repair: a bad changeset drops the entry', () => {
    expect(readLedger({ entries: [{ ...good, changeset: 'abc' }] }).ledger.entries).toEqual([]);
  });
  it('drops fields it does not know', () => {
    const r = readLedger({ entries: [{ ...good, extra: 'x' }] });
    expect(Object.keys(r.ledger.entries[0] ?? {}).sort()).toEqual(['changeset', 'lookedAgainOn', 'markedOn', 'note', 'recordId']);
  });
  it('stops at the limit', () => {
    const many = Array.from({ length: MAX_ENTRIES + 5 }, (_, i) => ({ ...good, recordId: `r${i}` }));
    const r = readLedger({ entries: many });
    expect(r.ledger.entries).toHaveLength(MAX_ENTRIES);
    expect(r.dropped).toBe(5);
  });
});
