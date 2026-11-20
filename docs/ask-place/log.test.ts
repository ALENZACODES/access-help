import { describe, expect, it } from 'vitest';
import { sampleLog, TODAY } from './fixtures.js';
import { MAX_ASKS_PER_PLACE, askCounts, asksFor, daysWaiting, emptyLog, isAskStatus, mergeLogs, pruneLog, readLog, recordAsk, removeAsk, setAskStatus, type AskInput } from './log.js';

const ask = (over: Partial<AskInput> = {}): AskInput => ({ recordId: 'a1', askedOn: '2026-11-15', channel: 'email', questions: ['toilet', 'steps'], ...over });

describe('list of asks', () => {
  it('starts empty', () => {
    expect(emptyLog()).toEqual({ version: 1, entries: [] });
  });
  it('notes an ask as waiting, with its questions in the fixed order', () => {
    const result = recordAsk(emptyLog(), ask(), TODAY);
    expect(result.ok && result.entry).toEqual({ n: 1, recordId: 'a1', askedOn: '2026-11-15', channel: 'email', questions: ['steps', 'toilet'], status: 'waiting', closedOn: null });
  });
  it('gives each ask its own number', () => {
    expect(sampleLog().entries.map((e) => e.n)).toEqual([1, 2, 3]);
  });
  it('refuses a day that is not a day or is after today', () => {
    expect(recordAsk(emptyLog(), ask({ askedOn: 'monday' }), TODAY)).toEqual({ ok: false, issue: 'date-invalid' });
    expect(recordAsk(emptyLog(), ask({ askedOn: '2026-11-20' }), TODAY)).toEqual({ ok: false, issue: 'date-future' });
    expect(recordAsk(emptyLog(), ask({ askedOn: TODAY }), TODAY).ok).toBe(true);
  });
  it('refuses an ask with no question it knows', () => {
    expect(recordAsk(emptyLog(), ask({ questions: [] }), TODAY)).toEqual({ ok: false, issue: 'no-question' });
  });
  it('keeps only so many asks for one place', () => {
    let log = emptyLog();
    for (let i = 0; i < MAX_ASKS_PER_PLACE; i += 1) {
      const result = recordAsk(log, ask(), TODAY);
      if (result.ok) log = result.log;
    }
    expect(recordAsk(log, ask(), TODAY)).toEqual({ ok: false, issue: 'too-many-for-place' });
    expect(recordAsk(log, ask({ recordId: 'a2' }), TODAY).ok).toBe(true);
  });
  it('lists the asks for one place', () => {
    expect(asksFor(sampleLog(), 'a1').map((e) => e.channel)).toEqual(['email', 'phone']);
    expect(asksFor(sampleLog(), 'zz')).toEqual([]);
  });
  it('closes an ask as answered or without a reply, stamped today', () => {
    const answered = setAskStatus(sampleLog(), 1, 'answered', TODAY);
    expect(answered.entries[0]).toMatchObject({ status: 'answered', closedOn: TODAY });
    expect(setAskStatus(sampleLog(), 2, 'no-reply', TODAY).entries[1]).toMatchObject({ status: 'no-reply', closedOn: TODAY });
  });
  it('opens an ask again and clears the stamp', () => {
    const reopened = setAskStatus(setAskStatus(sampleLog(), 1, 'answered', TODAY), 1, 'waiting', TODAY);
    expect(reopened.entries[0]).toMatchObject({ status: 'waiting', closedOn: null });
  });
  it('never stamps a close before the ask', () => {
    expect(setAskStatus(sampleLog(), 1, 'answered', '2026-01-01').entries[0]?.closedOn).toBe('2026-11-11');
  });
  it('leaves the log alone for an ask that does not exist', () => {
    const log = sampleLog();
    expect(setAskStatus(log, 99, 'answered', TODAY)).toBe(log);
    expect(removeAsk(log, 99)).toBe(log);
  });
  it('removes an ask', () => {
    expect(removeAsk(sampleLog(), 2).entries.map((e) => e.n)).toEqual([1, 3]);
  });
  it('does not reuse the number of a removed ask while a higher one exists', () => {
    const result = recordAsk(removeAsk(sampleLog(), 2), ask(), TODAY);
    expect(result.ok && result.entry.n).toBe(4);
  });
  it('drops asks for observations that are no longer saved', () => {
    expect(pruneLog(sampleLog(), ['a2']).entries.map((e) => e.recordId)).toEqual(['a2']);
    const log = sampleLog();
    expect(pruneLog(log, ['a1', 'a2'])).toBe(log);
  });
  it('counts days only while waiting', () => {
    const [first] = sampleLog().entries;
    expect(first && daysWaiting(first, TODAY)).toBe(8);
    expect(first && daysWaiting(first, '2026-11-11')).toBe(0);
    expect(first && daysWaiting(first, '2026-11-01')).toBeNull();
    const closed = setAskStatus(sampleLog(), 1, 'answered', TODAY).entries[0];
    expect(closed && daysWaiting(closed, TODAY)).toBeNull();
  });
  it('counts asks by status', () => {
    const log = setAskStatus(setAskStatus(sampleLog(), 1, 'answered', TODAY), 3, 'no-reply', TODAY);
    expect(askCounts(log.entries)).toEqual({ total: 3, waiting: 1, answered: 1, noReply: 1 });
    expect(askCounts([])).toEqual({ total: 0, waiting: 0, answered: 0, noReply: 0 });
  });
  it('does not change the log it was given', () => {
    const log = sampleLog();
    const copy = JSON.stringify(log);
    recordAsk(log, ask(), TODAY);
    setAskStatus(log, 1, 'answered', TODAY);
    removeAsk(log, 1);
    expect(JSON.stringify(log)).toBe(copy);
  });
});

describe('reading a stored list of asks', () => {
  it('reads back what was stored', () => {
    const log = setAskStatus(sampleLog(), 1, 'answered', TODAY);
    expect(readLog(JSON.parse(JSON.stringify(log)))).toEqual({ log, dropped: 0 });
  });
  it('reads anything else as an empty list', () => {
    for (const bad of [null, 'x', [], {}, { version: 2, entries: [] }, { version: 1, entries: {} }]) expect(readLog(bad)).toEqual({ log: emptyLog(), dropped: 0 });
  });
  it('drops entries it cannot use and counts them', () => {
    const good = sampleLog().entries[0];
    const read = readLog({ version: 1, entries: [good, { ...good, n: 2, channel: 'fax' }, { ...good, n: 3, askedOn: 'soon' }, { ...good, n: 4, questions: ['nonsense'] }, { ...good, n: 0 }, 'junk'] });
    expect(read.log.entries).toEqual([good]);
    expect(read.dropped).toBe(5);
  });
  it('drops a repeated number', () => {
    const good = sampleLog().entries[0];
    expect(readLog({ version: 1, entries: [good, good] })).toMatchObject({ dropped: 1 });
  });
  it('reads an unknown status as waiting and repairs a missing close day', () => {
    const good = sampleLog().entries[0];
    const read = readLog({ version: 1, entries: [{ ...good, status: 'sent' }, { ...good, n: 2, status: 'answered', closedOn: 'x' }, { ...good, n: 3, status: 'answered', closedOn: '2020-01-01' }] });
    expect(read.log.entries.map((e) => [e.status, e.closedOn])).toEqual([
      ['waiting', null],
      ['answered', '2026-11-11'],
      ['answered', '2026-11-11'],
    ]);
  });
  it('keeps only so many asks for one place', () => {
    const good = sampleLog().entries[0];
    const entries = Array.from({ length: MAX_ASKS_PER_PLACE + 2 }, (_, i) => ({ ...good, n: i + 1 }));
    const read = readLog({ version: 1, entries });
    expect(read.log.entries).toHaveLength(MAX_ASKS_PER_PLACE);
    expect(read.dropped).toBe(2);
  });
  it('knows the statuses', () => {
    expect(isAskStatus('no-reply')).toBe(true);
    expect(isAskStatus('sent')).toBe(false);
  });
});

describe('adding asks from a backup', () => {
  it('adds asks for saved observations and renumbers them', () => {
    const merged = mergeLogs(emptyLog(), sampleLog(), ['a1', 'a2']);
    expect(merged).toMatchObject({ added: 3, skipped: 0 });
    expect(merged.log.entries.map((e) => e.n).sort()).toEqual([1, 2, 3]);
  });
  it('does not add the same ask twice', () => {
    const merged = mergeLogs(sampleLog(), sampleLog(), ['a1', 'a2']);
    expect(merged).toMatchObject({ added: 0, skipped: 3 });
    expect(merged.log).toEqual(sampleLog());
  });
  it('leaves out asks for an observation that is not saved', () => {
    const merged = mergeLogs(emptyLog(), sampleLog(), ['a2']);
    expect(merged).toMatchObject({ added: 1, skipped: 2 });
    expect(merged.log.entries[0]?.recordId).toBe('a2');
  });
  it('keeps the numbers already on the device', () => {
    const current = recordAsk(emptyLog(), ask({ recordId: 'a2', askedOn: '2026-11-01' }), TODAY);
    const merged = mergeLogs(current.ok ? current.log : emptyLog(), sampleLog(), ['a1', 'a2']);
    expect(merged.added).toBe(3);
    expect(new Set(merged.log.entries.map((e) => e.n)).size).toBe(4);
    expect(merged.log.entries.find((e) => e.askedOn === '2026-11-01')?.n).toBe(1);
  });
});
