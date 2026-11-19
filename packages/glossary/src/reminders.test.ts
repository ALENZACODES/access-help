import { describe, expect, it } from 'vitest';
import {
  CALENDAR_MIME,
  MAX_REMINDERS,
  REMINDER_UI,
  SOON_DAYS,
  auditHtml,
  clearReminderId,
  daysUntil,
  dueLineText,
  dueList,
  dueNow,
  dueStatus,
  foldIcsLine,
  frenchIssues,
  icsText,
  lintClaims,
  lintCopy,
  nextDayCompact,
  parseClearReminderId,
  parseDueShowId,
  parseReminderFieldId,
  parseReminders,
  plainLanguageIssues,
  pruneReminders,
  readabilityIssues,
  reminderDate,
  reminderFieldId,
  remindersFilename,
  remindersToIcs,
  renderReminderField,
  renderReminders,
  serialiseReminders,
  setReminder,
  whenText,
  type Lang,
  type Place,
  type Reminders,
} from './index';

const places: Place[] = [
  { id: 'a', name: 'Library', claims: [] },
  { id: 'b', name: 'Café Nord', claims: [] },
  { id: 'c', name: 'Pool', claims: [] },
];
const today = '2026-11-15';

describe('setReminder', () => {
  it('sets, replaces and clears a date', () => {
    const one = setReminder({}, 'a', '2026-12-01');
    expect(reminderDate(one, 'a')).toBe('2026-12-01');
    const two = setReminder(one, 'a', '2026-12-05');
    expect(reminderDate(two, 'a')).toBe('2026-12-05');
    expect(setReminder(two, 'a', '')).toEqual({});
  });
  it('ignores a date that is not real', () => {
    const r: Reminders = { a: '2026-12-01' };
    for (const bad of ['2026-02-30', '2026-13-01', 'tomorrow', '2026-1-1', '12/01/2026']) expect(setReminder(r, 'a', bad), bad).toBe(r);
  });
  it('ignores an empty id', () => {
    const r: Reminders = {};
    expect(setReminder(r, '', '2026-12-01')).toBe(r);
  });
  it('returns the same object when clearing what is not there', () => {
    const r: Reminders = { a: '2026-12-01' };
    expect(setReminder(r, 'b', '')).toBe(r);
  });
  it('drops the oldest past the limit', () => {
    let r: Reminders = {};
    for (let i = 0; i < MAX_REMINDERS + 4; i += 1) r = setReminder(r, `p${i}`, '2026-12-01');
    expect(Object.keys(r)).toHaveLength(MAX_REMINDERS);
    expect(reminderDate(r, 'p0')).toBe('');
    expect(reminderDate(r, `p${MAX_REMINDERS + 3}`)).toBe('2026-12-01');
  });
  it('is safe with prototype keys and does not change its input', () => {
    const r: Reminders = { a: '2026-12-01' };
    const copy = JSON.stringify(r);
    setReminder(r, 'b', '2026-12-02');
    expect(JSON.stringify(r)).toBe(copy);
    expect(reminderDate({}, 'constructor')).toBe('');
    expect(Object.keys(setReminder({}, '__proto__', '2026-12-01'))).toEqual(['__proto__']);
  });
});

describe('storage', () => {
  it('round-trips', () => {
    const r = setReminder(setReminder({}, 'a', '2026-12-01'), 'b', '2027-01-02');
    expect(parseReminders(serialiseReminders(r))).toEqual(r);
  });
  it('is null for text that is not an object', () => {
    for (const bad of ['', 'x', '[]', 'null', '1']) expect(parseReminders(bad), bad).toBeNull();
  });
  it('drops bad dates and other values', () => {
    expect(parseReminders(JSON.stringify({ a: '2026-12-01', b: '2026-02-31', c: 5, d: null }))).toEqual({ a: '2026-12-01' });
  });
  it('prunes places that are gone', () => {
    const r = { a: '2026-12-01', gone: '2026-12-02' };
    expect(pruneReminders(r, ['a'])).toEqual({ a: '2026-12-01' });
    const same = { a: '2026-12-01' };
    expect(pruneReminders(same, ['a', 'b'])).toBe(same);
  });
});

describe('days and status', () => {
  it('counts whole days across months and years', () => {
    expect(daysUntil('2026-11-15', '2026-11-15')).toBe(0);
    expect(daysUntil('2026-11-15', '2026-11-16')).toBe(1);
    expect(daysUntil('2026-11-15', '2026-12-01')).toBe(16);
    expect(daysUntil('2026-12-30', '2027-01-02')).toBe(3);
    expect(daysUntil('2026-11-15', '2026-11-10')).toBe(-5);
  });
  it('is not thrown by a clock change', () => {
    expect(daysUntil('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysUntil('2026-11-01', '2026-11-02')).toBe(1);
  });
  it('is 0 for a date that is not real', () => {
    expect(daysUntil('x', '2026-11-15')).toBe(0);
  });
  it('names the status', () => {
    expect(dueStatus(-1)).toBe('overdue');
    expect(dueStatus(0)).toBe('today');
    expect(dueStatus(1)).toBe('soon');
    expect(dueStatus(SOON_DAYS)).toBe('soon');
    expect(dueStatus(SOON_DAYS + 1)).toBe('later');
  });
});

describe('dueList', () => {
  const r: Reminders = { a: '2026-12-01', b: '2026-11-10', c: '2026-11-15', gone: '2026-11-01' };
  it('is earliest first, with the days and the index', () => {
    const list = dueList(r, places, today);
    expect(list.map((e) => e.name)).toEqual(['Café Nord', 'Pool', 'Library']);
    expect(list.map((e) => e.days)).toEqual([-5, 0, 16]);
    expect(list.map((e) => e.status)).toEqual(['overdue', 'today', 'later']);
    expect(list.map((e) => e.index)).toEqual([1, 2, 0]);
  });
  it('puts places on the same date in name order', () => {
    const list = dueList({ a: '2026-12-01', c: '2026-12-01', b: '2026-12-01' }, places, today);
    expect(list.map((e) => e.name)).toEqual(['Café Nord', 'Library', 'Pool']);
  });
  it('is empty with no dates', () => {
    expect(dueList({}, places, today)).toEqual([]);
  });
  it('counts what is due now', () => {
    expect(dueNow(dueList(r, places, today))).toBe(2);
    expect(dueNow([])).toBe(0);
  });
});

describe('texts', () => {
  it('says how far away a date is', () => {
    expect(whenText({ days: 0 }, 'en')).toBe('Today');
    expect(whenText({ days: 1 }, 'en')).toBe('In 1 day');
    expect(whenText({ days: 12 }, 'en')).toBe('In 12 days');
    expect(whenText({ days: -1 }, 'en')).toBe('Passed 1 day ago');
    expect(whenText({ days: -3 }, 'en')).toBe('Passed 3 days ago');
  });
  it('is clean French', () => {
    expect(whenText({ days: 0 }, 'fr')).toBe('Aujourd’hui');
    expect(whenText({ days: 2 }, 'fr')).toBe('Dans 2 jours');
    expect(whenText({ days: -1 }, 'fr')).toBe('Passée depuis 1 jour');
  });
  it('writes a line with a space before the colon in French', () => {
    const e = dueList({ a: '2026-12-01' }, places, today)[0];
    expect(e).toBeDefined();
    if (e === undefined) return;
    expect(dueLineText(e, 'en')).toBe('Library: 2026-12-01. In 16 days.');
    expect(dueLineText(e, 'fr')).toBe('Library\u00a0: 2026-12-01. Dans 16 jours.');
  });
});

describe('ids', () => {
  it('round-trips', () => {
    expect(parseReminderFieldId(reminderFieldId(5))).toBe(5);
    expect(parseClearReminderId(clearReminderId(2))).toBe(2);
    expect(parseDueShowId('gl-dshow-7')).toBe(7);
  });
  it('rejects other ids, including the hint', () => {
    for (const id of ['', 'gl-due-', 'gl-due-x', 'gl-due-1-hint', 'gl-due-export']) expect(parseReminderFieldId(id), id).toBeNull();
    for (const id of ['', 'gl-dueclear-', 'gl-due-1']) expect(parseClearReminderId(id), id).toBeNull();
    for (const id of ['', 'gl-dshow-', 'gl-tshow-1']) expect(parseDueShowId(id), id).toBeNull();
  });
});

describe('markup', () => {
  const list = dueList({ a: '2026-12-01', b: '2026-11-10' }, places, today);
  it.each(['en', 'fr'] as Lang[])('is valid in %s', (lang) => {
    for (const html of [
      renderReminderField(0, 'Library', '', lang),
      renderReminderField(0, 'Library', '2026-12-01', lang),
      renderReminders([], lang, true),
      renderReminders(list, lang, false),
      renderReminders(list, lang, true),
    ]) {
      expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'due')).toEqual([]);
    }
  });
  it('has a labelled date box with its hint, and a clear button only once there is a date', () => {
    const empty = renderReminderField(3, 'Library', '', 'en');
    expect(empty).toContain('<label for="gl-due-3">Check Library again on</label>');
    expect(empty).toContain('type="date"');
    expect(empty).toContain('aria-describedby="gl-due-3-hint"');
    expect(empty).not.toContain('gl-dueclear-');
    const set = renderReminderField(3, 'Library', '2026-12-01', 'en');
    expect(set).toContain('value="2026-12-01"');
    expect(set).toContain('id="gl-dueclear-3" aria-label="Clear date for Library"');
  });
  it('lists the dates with a status and a Show button', () => {
    const html = renderReminders(list, 'en', false);
    expect(html).toContain('<li data-due="overdue">Café Nord: 2026-11-10. Passed 5 days ago.');
    expect(html).toContain('id="gl-dshow-1"');
    expect(html).toContain('1 date is due now.');
    expect(html).not.toContain('gl-due-export');
  });
  it('has the calendar button only when asked', () => {
    expect(renderReminders(list, 'en', true)).toContain('id="gl-due-export"');
  });
  it('says so with no dates', () => {
    expect(renderReminders([], 'en', true)).toContain(REMINDER_UI.en.none);
    expect(renderReminders([], 'en', true)).not.toContain('gl-due-export');
  });
  it('escapes names and dates', () => {
    const html = renderReminders([{ placeId: 'x', name: '<b>x</b>', date: '2026-12-01', days: 3, status: 'soon', index: 0 }], 'en', false);
    expect(html).not.toContain('<b>x');
    expect(renderReminderField(0, '<i>y</i>', '"><script>', 'en')).not.toContain('<script>');
  });
});

describe('calendar file', () => {
  it('escapes text', () => {
    expect(icsText('a,b;c\\d\ne')).toBe('a\\,b\;c\\\\d\\ne');
  });
  it('finds the next day, across month and year ends and in a leap year', () => {
    expect(nextDayCompact('2026-11-15')).toBe('20261116');
    expect(nextDayCompact('2026-11-30')).toBe('20261201');
    expect(nextDayCompact('2026-12-31')).toBe('20270101');
    expect(nextDayCompact('2028-02-28')).toBe('20280229');
    expect(nextDayCompact('nope')).toBe('');
  });
  it('folds long lines at 75 bytes and never inside a character', () => {
    const long = `SUMMARY:${'é'.repeat(80)}`;
    const folded = foldIcsLine(long);
    const parts = folded.split('\r\n');
    expect(parts.length).toBeGreaterThan(1);
    for (const [i, p] of parts.entries()) {
      const line = i === 0 ? p : p.slice(1);
      expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75);
      expect(line).not.toContain('�');
      if (i > 0) expect(p.startsWith(' ')).toBe(true);
    }
    expect(parts.map((p, i) => (i === 0 ? p : p.slice(1))).join('')).toBe(long);
  });
  it('leaves a short line alone', () => {
    expect(foldIcsLine('BEGIN:VCALENDAR')).toBe('BEGIN:VCALENDAR');
  });
  it('has one all-day event for each date, ends with CRLF, and says only what the person chose', () => {
    const list = dueList({ a: '2026-12-31', b: '2026-11-10' }, places, today);
    const ics = remindersToIcs(list, 'en', today);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261231');
    expect(ics).toContain('DTEND;VALUE=DATE:20270101');
    expect(ics).toContain('SUMMARY:Check Library again');
    expect(ics).toContain('UID:a-2026-12-31@glossary.invalid');
    expect(ics).toContain('DTSTAMP:20261115T000000Z');
    expect(ics).not.toMatch(/accessible|verified/i);
    expect(ics.split('\r\n').every((l) => !l.includes('\n'))).toBe(true);
  });
  it('is a valid empty calendar with no dates', () => {
    expect(remindersToIcs([], 'en', today)).toBe('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Glossary//Check again//EN\r\nCALSCALE:GREGORIAN\r\nEND:VCALENDAR\r\n');
  });
  it('uses French text and a safe UID', () => {
    const list = dueList({ 'a b/c': '2026-12-01' }, [{ id: 'a b/c', name: 'Café', claims: [] }], today);
    const ics = remindersToIcs(list, 'fr', today);
    expect(ics).toContain('SUMMARY:Revoir Café');
    expect(ics).toContain('UID:abc-2026-12-01@glossary.invalid');
  });
  it('names the file and the type', () => {
    expect(remindersFilename('en')).toBe('check-again-dates-en.ics');
    expect(remindersFilename('fr')).toBe('check-again-dates-fr.ics');
    expect(CALENDAR_MIME).toBe('text/calendar;charset=utf-8');
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = REMINDER_UI[lang];
    const texts = [
      ui.heading, ui.intro, ui.none, ui.label('Library'), ui.hint, ui.clear, ui.clearLabel('Library'), ui.overdue(1), ui.overdue(4),
      ui.today, ui.inDays(1), ui.inDays(5), ui.line('Library', '2026-12-01. Today'), ui.count(0), ui.count(1), ui.count(3),
      ui.show, ui.showLabel('Library'), ui.exportCalendar, ui.event('Library'), ui.eventNote, ui.set('Library', '2026-12-01'), ui.cleared('Library'),
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
