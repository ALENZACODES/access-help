import { describe, expect, it } from 'vitest';
import { buildDayLog, countsForMonth, dayGroup, logStatusOf, logTotals, monthsWithNotes, statsFor } from './days.js';
import { log, sample } from './fixtures.js';

describe('logStatusOf', () => {
  it('keeps the three statuses and treats anything else as UNKNOWN', () => {
    expect(logStatusOf(log({ wheelchair: 'limited' }))).toBe('limited');
    for (const s of ['UNKNOWN', '', 'maybe']) expect(logStatusOf(log({ wheelchair: s }))).toBe('UNKNOWN');
  });
});

describe('statsFor', () => {
  const stats = statsFor(sample().slice(0, 2));
  it('counts by status, with UNKNOWN as its own count', () => expect(stats.byStatus).toEqual({ yes: 1, limited: 0, no: 0, UNKNOWN: 1 }));
  it('counts licences and lists sources once each', () => {
    expect(stats.licences).toEqual([{ licence: 'CC0-1.0', count: 1 }, { licence: 'ODbL-1.0', count: 1 }]);
    expect(stats.sources).toEqual(['field notes', 'own visit']);
  });
  it('counts unnamed notes', () => expect(stats.unnamed).toBe(1));
  it('measures the spread corner to corner', () => {
    expect(stats.spanMetres).toBeGreaterThan(1100);
    expect(stats.spanMetres).toBeLessThan(1120);
  });
  it('has no spread for one note or none', () => {
    expect(statsFor([log()]).spanMetres).toBe(0);
    expect(statsFor([])).toMatchObject({ total: 0, spanMetres: 0, unnamed: 0, sources: [], licences: [] });
  });
  it('ignores a coordinate that is not a number when measuring', () => {
    expect(statsFor([log(), log({ id: 'x', lat: Number.NaN })]).spanMetres).toBe(0);
  });
});

describe('buildDayLog', () => {
  const dayLog = buildDayLog(sample());
  it('groups by day, newest first', () => expect(dayLog.days.map((d) => d.day)).toEqual(['2026-11-12', '2026-11-10', '2026-10-30']));
  it('lists notes by name with unnamed last', () => expect(dayLog.days[1]?.notes.map((n) => n.id)).toEqual(['n1', 'n2']));
  it('keeps a note with a bad date apart and gives it no day', () => {
    expect(dayLog.undated.map((n) => n.id)).toEqual(['n5']);
    expect(dayLog.days.flatMap((d) => d.notes).map((n) => n.id)).not.toContain('n5');
  });
  it('counts every note once', () => {
    expect(dayLog.totalNotes).toBe(5);
    expect(dayLog.days.reduce((n, d) => n + d.stats.total, 0) + dayLog.undated.length).toBe(5);
  });
  it('gives the days since the previous day with notes', () => {
    expect(dayLog.days.map((d) => d.daysSincePrevious)).toEqual([2, 11, null]);
  });
  it('is empty and calm with no notes', () => expect(buildDayLog([])).toEqual({ days: [], undated: [], totalNotes: 0 }));
  it('does not change its input', () => {
    const notes = sample();
    const copy = JSON.parse(JSON.stringify(notes));
    buildDayLog(notes);
    expect(notes).toEqual(copy);
  });
});

describe('lookups', () => {
  const dayLog = buildDayLog(sample());
  it('finds a day or returns null', () => {
    expect(dayGroup(dayLog, '2026-11-10')?.stats.total).toBe(2);
    expect(dayGroup(dayLog, '2026-11-11')).toBeNull();
  });
  it('counts notes per day of a month', () => {
    expect([...countsForMonth(dayLog, '2026-11')]).toEqual([['2026-11-12', 1], ['2026-11-10', 2]]);
    expect(countsForMonth(dayLog, '2026-09').size).toBe(0);
  });
  it('lists the months that hold notes, newest first', () => expect(monthsWithNotes(dayLog)).toEqual(['2026-11', '2026-10']));
});

describe('logTotals', () => {
  it('sums the log', () => {
    expect(logTotals(buildDayLog(sample()))).toEqual({
      days: 3,
      notes: 5,
      undated: 1,
      byStatus: { yes: 2, limited: 1, no: 1, UNKNOWN: 1 },
      firstDay: '2026-10-30',
      lastDay: '2026-11-12',
      busiestDay: '2026-11-10',
    });
  });
  it('picks the newest day on a tie for the busiest', () => {
    expect(logTotals(buildDayLog([log(), log({ id: 'b', observedOn: '2026-11-12' })])).busiestDay).toBe('2026-11-12');
  });
  it('is empty with no notes', () => {
    expect(logTotals(buildDayLog([]))).toMatchObject({ days: 0, notes: 0, firstDay: null, lastDay: null, busiestDay: null });
  });
});
