import { describe, expect, it } from 'vitest';
import { addMonths, compareMonths, daysInMonth, longDay, monthGrid, monthKey, monthName, parseMonth, weekdayNames, weekdayOf } from './calendar.js';

describe('monthKey and parseMonth', () => {
  it('writes and reads YYYY-MM', () => {
    expect(monthKey({ year: 2026, month: 3 })).toBe('2026-03');
    expect(parseMonth('2026-03')).toEqual({ year: 2026, month: 3 });
  });
  it('reads the month of a real day', () => expect(parseMonth('2026-11-19')).toEqual({ year: 2026, month: 11 }));
  it('is null for anything else', () => {
    for (const v of ['', '2026', '2026-13', '2026-00', '2026-02-30', 'March 2026', '26-03']) expect(parseMonth(v), v).toBeNull();
  });
});

describe('addMonths and compareMonths', () => {
  it('moves forward and back across a year end', () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(addMonths({ year: 2026, month: 5 }, 0)).toEqual({ year: 2026, month: 5 });
    expect(addMonths({ year: 2026, month: 5 }, -17)).toEqual({ year: 2024, month: 12 });
  });
  it('orders months', () => {
    expect(compareMonths({ year: 2026, month: 1 }, { year: 2025, month: 12 })).toBeGreaterThan(0);
    expect(compareMonths({ year: 2026, month: 1 }, { year: 2026, month: 1 })).toBe(0);
  });
});

describe('daysInMonth and weekdayOf', () => {
  it('knows month lengths, with leap years', () => {
    expect(daysInMonth({ year: 2026, month: 2 })).toBe(28);
    expect(daysInMonth({ year: 2028, month: 2 })).toBe(29);
    expect(daysInMonth({ year: 2026, month: 11 })).toBe(30);
    expect(daysInMonth({ year: 2026, month: 12 })).toBe(31);
  });
  it('knows the weekday of a date', () => {
    expect(weekdayOf(2026, 11, 19)).toBe(4);
    expect(weekdayOf(2026, 11, 1)).toBe(0);
    expect(weekdayOf(2024, 2, 29)).toBe(4);
  });
});

describe('monthGrid', () => {
  const grid = monthGrid({ year: 2026, month: 10 });
  it('has rows of seven', () => {
    for (const week of grid) expect(week).toHaveLength(7);
  });
  it('starts on the right weekday', () => {
    // 1 October 2026 is a Thursday: four blank cells, then the 1st.
    expect(grid[0]?.map((c) => c.day)).toEqual([null, null, null, null, 1, 2, 3]);
  });
  it('holds every day once, in order', () => {
    const days = grid.flat().filter((c) => c.day !== null);
    expect(days.map((c) => c.day)).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
    expect(days[0]?.iso).toBe('2026-10-01');
    expect(days[30]?.iso).toBe('2026-10-31');
  });
  it('needs four rows for a February that starts on Sunday, and six for a long month that starts late', () => {
    expect(monthGrid({ year: 2026, month: 2 })).toHaveLength(4);
    expect(monthGrid({ year: 2026, month: 8 })).toHaveLength(6);
  });
});

describe('names', () => {
  it('names months and weekdays in both languages', () => {
    expect(monthName({ year: 2026, month: 11 }, 'en')).toBe('November 2026');
    expect(monthName({ year: 2026, month: 8 }, 'fr')).toBe('août 2026');
    expect(weekdayNames('en')[0]).toBe('Sunday');
    expect(weekdayNames('fr')).toHaveLength(7);
  });
  it('writes a day out in full', () => {
    expect(longDay('2026-11-10', 'en')).toBe('Tuesday, 10 November 2026');
    expect(longDay('2026-11-10', 'fr')).toBe('mardi 10 novembre 2026');
    expect(longDay('2026-11-01', 'fr')).toBe('dimanche 1er novembre 2026');
  });
  it('is empty for a date that is not a day', () => expect(longDay('2026-02-30', 'en')).toBe(''));
});
