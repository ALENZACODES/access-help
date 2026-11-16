import { describe, expect, it } from 'vitest';
import {
  DAY_UI,
  DAYS_STORE_KEY,
  MAX_PLANNED,
  WEEKDAYS,
  auditHtml,
  dayId,
  dayName,
  dayOf,
  frenchIssues,
  isWeekday,
  lintClaims,
  lintCopy,
  nextDateOf,
  parseDayId,
  parseDayShowId,
  parseDays,
  plainLanguageIssues,
  plannedCount,
  pruneDays,
  readabilityIssues,
  renderDayField,
  renderWeek,
  serialiseDays,
  setDay,
  weekFilename,
  weekToText,
  weekView,
  weekdayOf,
  type DayPlan,
  type Lang,
  type Place,
} from './index';

const places: Place[] = [
  { id: 'a', name: 'Library', claims: [] },
  { id: 'b', name: 'Café Nord', claims: [] },
  { id: 'c', name: 'Pool', claims: [] },
];
const today = '2026-11-16'; // a Monday

describe('weekdays', () => {
  it('knows a Monday, a Sunday and a leap day', () => {
    expect(weekdayOf('2026-11-16')).toBe('mon');
    expect(weekdayOf('2026-11-22')).toBe('sun');
    expect(weekdayOf('2028-02-29')).toBe('tue');
  });
  it('is null for a date that is not real', () => {
    for (const bad of ['', 'x', '2026-02-30', '2026-13-01', '2026-1-1']) expect(weekdayOf(bad), bad).toBeNull();
  });
  it('checks a value', () => {
    expect(WEEKDAYS).toHaveLength(7);
    for (const d of WEEKDAYS) expect(isWeekday(d)).toBe(true);
    for (const bad of ['', 'monday', 'MON', 3, null, undefined, 'constructor']) expect(isWeekday(bad), String(bad)).toBe(false);
  });
});

describe('nextDateOf', () => {
  it('counts today itself', () => {
    expect(nextDateOf('2026-11-16', 'mon')).toBe('2026-11-16');
  });
  it('finds a later day this week', () => {
    expect(nextDateOf('2026-11-16', 'wed')).toBe('2026-11-18');
    expect(nextDateOf('2026-11-16', 'sun')).toBe('2026-11-22');
  });
  it('wraps to next week', () => {
    expect(nextDateOf('2026-11-18', 'mon')).toBe('2026-11-23');
  });
  it('crosses a month and a year', () => {
    expect(nextDateOf('2026-11-30', 'fri')).toBe('2026-12-04');
    expect(nextDateOf('2026-12-31', 'mon')).toBe('2027-01-04');
  });
  it('is null if today is not a real date', () => {
    expect(nextDateOf('nope', 'mon')).toBeNull();
  });
});

describe('setDay', () => {
  it('sets, changes and clears a day', () => {
    const one = setDay({}, 'a', 'wed');
    expect(dayOf(one, 'a')).toBe('wed');
    expect(dayOf(setDay(one, 'a', 'fri'), 'a')).toBe('fri');
    expect(setDay(one, 'a', '')).toEqual({});
  });
  it('ignores a value that is not a weekday', () => {
    const p: DayPlan = { a: 'mon' };
    for (const bad of ['monday', 'xyz', 'MON']) expect(setDay(p, 'a', bad), bad).toBe(p);
  });
  it('returns the same object when nothing changes', () => {
    const p: DayPlan = { a: 'mon' };
    expect(setDay(p, 'a', 'mon')).toBe(p);
    expect(setDay(p, 'b', '')).toBe(p);
    expect(setDay(p, '', 'tue')).toBe(p);
  });
  it('drops the oldest past the limit', () => {
    let p: DayPlan = {};
    for (let i = 0; i < MAX_PLANNED + 3; i += 1) p = setDay(p, `p${i}`, 'mon');
    expect(Object.keys(p)).toHaveLength(MAX_PLANNED);
    expect(dayOf(p, 'p0')).toBeNull();
    expect(dayOf(p, `p${MAX_PLANNED + 2}`)).toBe('mon');
  });
  it('is safe with prototype keys and does not change its input', () => {
    const p: DayPlan = { a: 'mon' };
    const copy = JSON.stringify(p);
    setDay(p, 'b', 'tue');
    expect(JSON.stringify(p)).toBe(copy);
    expect(dayOf({}, 'constructor')).toBeNull();
    expect(Object.keys(setDay({}, '__proto__', 'mon'))).toEqual(['__proto__']);
  });
});

describe('storage', () => {
  it('round-trips', () => {
    const p = setDay(setDay({}, 'a', 'mon'), 'b', 'sun');
    expect(parseDays(serialiseDays(p))).toEqual(p);
  });
  it('is null for text that is not an object', () => {
    for (const bad of ['', 'x', '[]', 'null', '4']) expect(parseDays(bad), bad).toBeNull();
  });
  it('drops entries that are not weekdays', () => {
    expect(parseDays(JSON.stringify({ a: 'mon', b: 'someday', c: 3, d: null }))).toEqual({ a: 'mon' });
  });
  it('prunes places that are gone', () => {
    expect(pruneDays({ a: 'mon', gone: 'tue' }, ['a'])).toEqual({ a: 'mon' });
    const same: DayPlan = { a: 'mon' };
    expect(pruneDays(same, ['a', 'b'])).toBe(same);
  });
  it('has a stable key', () => {
    expect(DAYS_STORE_KEY).toBe('glossary-day-plan');
  });
});

describe('weekView', () => {
  const plan: DayPlan = { a: 'wed', b: 'wed', c: 'mon', gone: 'fri' };
  it('has all seven days, Monday first', () => {
    expect(weekView(plan, places).map((d) => d.day)).toEqual([...WEEKDAYS]);
  });
  it('puts places on their day in name order, with their index', () => {
    const wed = weekView(plan, places)[2];
    expect(wed?.places).toEqual([
      { placeId: 'b', name: 'Café Nord', index: 1 },
      { placeId: 'a', name: 'Library', index: 0 },
    ]);
  });
  it('leaves out places that are not loaded', () => {
    expect(weekView(plan, places)[4]?.places).toEqual([]);
    expect(plannedCount(weekView(plan, places))).toBe(3);
  });
  it('is all empty with no plan', () => {
    expect(plannedCount(weekView({}, places))).toBe(0);
  });
});

describe('texts', () => {
  const week = weekView({ a: 'wed', c: 'mon' }, places);
  it('writes a block for each day that has places, with the next date', () => {
    expect(weekToText(week, today, 'en')).toBe('My week\n\nMonday 2026-11-16\n- Pool\n\nWednesday 2026-11-18\n- Library\n');
  });
  it('says so for an empty week', () => {
    expect(weekToText(weekView({}, places), today, 'en')).toBe('My week\n\nNo places planned yet.\n');
  });
  it('is French with capital day names', () => {
    expect(weekToText(week, today, 'fr')).toBe('Ma semaine\n\nLundi 2026-11-16\n- Pool\n\nMercredi 2026-11-18\n- Library\n');
  });
  it('leaves place names as they are', () => {
    const w = weekView({ b: 'mon' }, [{ id: 'b', name: 'Café : Nord?', claims: [] }]);
    expect(weekToText(w, today, 'fr')).toContain('- Café : Nord?');
  });
  it('names days and the file', () => {
    expect(dayName('sat', 'en')).toBe('Saturday');
    expect(dayName('sat', 'fr')).toBe('samedi');
    expect(weekFilename('fr')).toBe('my-week-fr.txt');
  });
});

describe('ids', () => {
  it('round-trips', () => {
    expect(parseDayId(dayId(6))).toBe(6);
    expect(parseDayShowId('gl-dyshow-3')).toBe(3);
  });
  it('rejects other ids', () => {
    for (const id of ['', 'gl-day-', 'gl-day-x', 'gl-day-export', 'gl-due-1']) expect(parseDayId(id), id).toBeNull();
    for (const id of ['', 'gl-dyshow-', 'gl-dshow-1']) expect(parseDayShowId(id), id).toBeNull();
  });
});

describe('markup', () => {
  const week = weekView({ a: 'mon', b: 'wed' }, places);
  it.each(['en', 'fr'] as Lang[])('is valid in %s', (lang) => {
    for (const html of [
      renderDayField(0, 'Library', null, lang),
      renderDayField(0, 'Library', 'tue', lang),
      renderWeek(week, today, lang, true),
      renderWeek(weekView({}, places), today, lang, true),
    ]) {
      expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'week')).toEqual([]);
    }
  });
  it('has a labelled box with No day first and the chosen day selected', () => {
    const html = renderDayField(2, 'Library', 'tue', 'en');
    expect(html).toContain('<label for="gl-day-2">Day to go to Library</label>');
    expect(html).toContain('<option value="">No day</option>');
    expect(html).toContain('<option value="tue" selected>Tuesday</option>');
    expect(html).toContain('<option value="sun">Sunday</option>');
  });
  it('selects No day when there is none', () => {
    expect(renderDayField(0, 'Library', null, 'en')).toContain('<option value="" selected>No day</option>');
  });
  it('shows seven days, marks today and shows places with Show buttons', () => {
    const html = renderWeek(week, today, 'en', false);
    expect(html.match(/<h4>/g)).toHaveLength(7);
    expect(html).toContain('<h4>Monday (today)</h4>');
    expect(html).toContain('<h4>Tuesday</h4>');
    expect(html).toContain('Nothing planned');
    expect(html).toContain('2 places planned.');
    expect(html).toContain('id="gl-dyshow-1" aria-label="Show Café Nord in the list"');
  });
  it('has the copy button only with places and a host that takes files', () => {
    expect(renderWeek(week, today, 'en', true)).toContain('id="gl-day-export"');
    expect(renderWeek(week, today, 'en', false)).not.toContain('gl-day-export');
    expect(renderWeek(weekView({}, places), today, 'en', true)).not.toContain('gl-day-export');
  });
  it('marks no day as today when the date is not real', () => {
    expect(renderWeek(week, 'nope', 'en', false)).not.toContain('(today)');
  });
  it('escapes names', () => {
    const w = weekView({ x: 'mon' }, [{ id: 'x', name: '<b>x</b>', claims: [] }]);
    expect(renderWeek(w, today, 'en', false)).not.toContain('<b>x');
    expect(renderDayField(0, '<i>y</i>', null, 'en')).not.toContain('<i>y');
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = DAY_UI[lang];
    const texts = [
      ui.heading, ui.intro, ...Object.values(ui.days), ui.none, ui.label('Library'), ui.free, ui.today, ui.count(0), ui.count(1), ui.count(3),
      ui.show, ui.showLabel('Library'), ui.exportWeek, ui.title, ui.set('Library', 'Monday'), ui.cleared('Library'), ui.needSave,
    ];
    for (const t of texts) {
      expect(lintCopy(t), t).toEqual([]);
      expect(lintClaims(t), t).toEqual([]);
      expect(plainLanguageIssues(t), t).toEqual([]);
      expect(readabilityIssues(t, lang), t).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(t), t).toEqual([]);
    }
  });
});
