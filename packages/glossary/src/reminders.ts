import { fixFrench } from './frTypography';
import type { Place } from './places';
import type { Lang } from './plainTerms';
import { isIsoDate } from './provenance';
import { escapeHtml } from './text';

/**
 * A date the person chose to look at a place again ("check again on\u2026"). Kept on this device.
 * A reminder is the person's own plan. It says nothing about the place, and unknown stays Unknown.
 */
export const MAX_REMINDERS = 100;
export const REMINDERS_STORE_KEY = 'glossary-revisit-dates';
/** A reminder this many days away or fewer is "soon". */
export const SOON_DAYS = 7;

export type Reminders = Readonly<Record<string, string>>;

export function reminderDate(reminders: Reminders, placeId: string): string {
  return Object.prototype.hasOwnProperty.call(reminders, placeId) ? (reminders[placeId] ?? '') : '';
}

function ownEntries(reminders: Reminders, skip: string): [string, string][] {
  return Object.entries(reminders).filter(([id]) => id !== skip);
}

/** Sets or replaces the date. An empty date removes it. A date that is not real changes nothing. */
export function setReminder(reminders: Reminders, placeId: string, date: string): Reminders {
  if (placeId === '') return reminders;
  if (date === '') return ownEntries(reminders, placeId).length === Object.keys(reminders).length ? reminders : Object.fromEntries(ownEntries(reminders, placeId));
  if (!isIsoDate(date)) return reminders;
  const entries = ownEntries(reminders, placeId);
  entries.push([placeId, date]);
  // fromEntries makes own properties, so an id such as "__proto__" is kept as data. The oldest are dropped past the limit.
  return Object.fromEntries(entries.slice(Math.max(0, entries.length - MAX_REMINDERS)));
}

/** Keeps only reminders for places that exist. */
export function pruneReminders(reminders: Reminders, ids: readonly string[]): Reminders {
  const known = new Set(ids);
  const entries = Object.entries(reminders);
  return entries.every(([id]) => known.has(id)) ? reminders : Object.fromEntries(entries.filter(([id]) => known.has(id)));
}

export function serialiseReminders(reminders: Reminders): string {
  return JSON.stringify(reminders);
}

/** Null unless the text is a JSON object of ids to real dates. Entries with a bad date are dropped. */
export function parseReminders(json: string): Reminders | null {
  try {
    const raw: unknown = JSON.parse(json);
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
    let out: Reminders = {};
    for (const [id, date] of Object.entries(raw)) if (typeof date === 'string') out = setReminder(out, id, date);
    return out;
  } catch {
    return null;
  }
}

/** Whole days from `today` to `date`. Negative when the date has passed. Both must be real dates. */
export function daysUntil(today: string, date: string): number {
  const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today);
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (a === null || b === null) return 0;
  const ms = (m: RegExpExecArray): number => Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Math.round((ms(b) - ms(a)) / 86_400_000);
}

export type DueStatus = 'overdue' | 'today' | 'soon' | 'later';

export interface DueEntry {
  readonly placeId: string;
  readonly name: string;
  readonly date: string;
  readonly days: number;
  readonly status: DueStatus;
  /** Index in the list that was given. Used in control ids. */
  readonly index: number;
}

export function dueStatus(days: number): DueStatus {
  return days < 0 ? 'overdue' : days === 0 ? 'today' : days <= SOON_DAYS ? 'soon' : 'later';
}

/** The reminders for loaded places, earliest first, then in name order. */
export function dueList(reminders: Reminders, places: readonly Place[], today: string): readonly DueEntry[] {
  const out: DueEntry[] = [];
  places.forEach((place, index) => {
    const date = reminderDate(reminders, place.id);
    if (date === '') return;
    const days = daysUntil(today, date);
    out.push({ placeId: place.id, name: place.name, date, days, status: dueStatus(days), index });
  });
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.name.localeCompare(b.name)));
}

/** How many reminders are due today or have passed. */
export function dueNow(list: readonly DueEntry[]): number {
  return list.filter((e) => e.days <= 0).length;
}

export const REMINDER_UI = {
  en: {
    heading: 'Check again',
    intro: 'Pick a date to look at a place again. Dates stay on this device and do not change what is reported.',
    none: 'No dates yet. Pick one under a place.',
    label: (name: string): string => `Check ${name} again on`,
    hint: 'Optional. Your own date.',
    clear: 'Clear date',
    clearLabel: (name: string): string => `Clear the date for ${name}`,
    overdue: (days: number): string => (days === 1 ? 'Passed 1 day ago' : `Passed ${days} days ago`),
    today: 'Today',
    inDays: (days: number): string => (days === 1 ? 'In 1 day' : `In ${days} days`),
    line: (name: string, detail: string): string => `${name}: ${detail}.`,
    count: (n: number): string => (n === 0 ? 'Nothing is due now.' : n === 1 ? '1 date is due now.' : `${n} dates are due now.`),
    show: 'Show',
    showLabel: (name: string): string => `Show ${name} in the list`,
    exportCalendar: 'Save dates as a calendar file',
    event: (name: string): string => `Check ${name} again`,
    eventNote: 'Your own reminder. It does not say anything about the place.',
    set: (name: string, date: string): string => `Set a date for ${name}: ${date}.`,
    cleared: (name: string): string => `Cleared the date for ${name}.`,
  },
  fr: {
    heading: 'Revoir plus tard',
    intro: 'Choisissez une date pour revoir un lieu. Les dates restent sur cet appareil et ne changent pas ce qui est signalé.',
    none: 'Aucune date pour le moment. Choisissez-en une sous un lieu.',
    label: (name: string): string => `Revoir ${name} le`,
    hint: 'Facultatif. Votre propre date.',
    clear: 'Effacer la date',
    clearLabel: (name: string): string => `Effacer la date pour ${name}`,
    overdue: (days: number): string => (days === 1 ? 'Passée depuis 1 jour' : `Passée depuis ${days} jours`),
    today: 'Aujourd’hui',
    inDays: (days: number): string => (days === 1 ? 'Dans 1 jour' : `Dans ${days} jours`),
    line: (name: string, detail: string): string => `${name}\u00a0: ${detail}.`,
    count: (n: number): string => (n === 0 ? 'Rien n’est à revoir maintenant.' : n === 1 ? '1 date est arrivée.' : `${n} dates sont arrivées.`),
    show: 'Afficher',
    showLabel: (name: string): string => `Afficher ${name} dans la liste`,
    exportCalendar: 'Enregistrer les dates dans un fichier de calendrier',
    event: (name: string): string => `Revoir ${name}`,
    eventNote: 'Votre propre rappel. Il ne dit rien sur le lieu.',
    set: (name: string, date: string): string => `Date choisie pour ${name}\u00a0: ${date}.`,
    cleared: (name: string): string => `Date effacée pour ${name}.`,
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

/** "Today", "In 3 days" or "Passed 2 days ago" for one entry. */
export function whenText(entry: Pick<DueEntry, 'days'>, lang: Lang): string {
  const ui = REMINDER_UI[lang];
  return fr(lang, entry.days < 0 ? ui.overdue(-entry.days) : entry.days === 0 ? ui.today : ui.inDays(entry.days));
}

export function dueLineText(entry: DueEntry, lang: Lang): string {
  return fr(lang, REMINDER_UI[lang].line(entry.name, `${entry.date}. ${whenText(entry, lang)}`));
}

export function reminderFieldId(index: number): string {
  return `gl-due-${index}`;
}
export function parseReminderFieldId(id: string): number | null {
  const m = /^gl-due-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}
export function clearReminderId(index: number): string {
  return `gl-dueclear-${index}`;
}
export function parseClearReminderId(id: string): number | null {
  const m = /^gl-dueclear-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}
export function parseDueShowId(id: string): number | null {
  const m = /^gl-dshow-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}
export const REMINDER_EXPORT_ID = 'gl-due-export';

/** The date box for one place, with a button to clear it. */
export function renderReminderField(index: number, name: string, date: string, lang: Lang): string {
  const ui = REMINDER_UI[lang];
  const clear =
    date === ''
      ? ''
      : `<button type="button" class="gl-btn" id="${clearReminderId(index)}" aria-label="${escapeHtml(fr(lang, ui.clearLabel(name)))}">${escapeHtml(ui.clear)}</button>`;
  return (
    `<div class="gl-reminder"><label for="${reminderFieldId(index)}">${escapeHtml(fr(lang, ui.label(name)))}</label>` +
    `<input type="date" id="${reminderFieldId(index)}" class="gl-input" value="${escapeHtml(date)}" aria-describedby="${reminderFieldId(index)}-hint">` +
    `<span class="gl-note" id="${reminderFieldId(index)}-hint">${escapeHtml(ui.hint)}</span>${clear}</div>`
  );
}

/** The list of dates, earliest first, with a count of what is due now. */
export function renderReminders(list: readonly DueEntry[], lang: Lang, canExport: boolean): string {
  const ui = REMINDER_UI[lang];
  const intro = `<p>${escapeHtml(ui.intro)}</p>`;
  if (list.length === 0) return `${intro}<p class="gl-note">${escapeHtml(ui.none)}</p>`;
  const items = list
    .map(
      (e) =>
        `<li data-due="${e.status}">${escapeHtml(dueLineText(e, lang))} <button type="button" class="gl-btn" id="gl-dshow-${e.index}" aria-label="${escapeHtml(fr(lang, ui.showLabel(e.name)))}">${escapeHtml(ui.show)}</button></li>`,
    )
    .join('');
  const exportButton = canExport ? `<div class="gl-actions"><button type="button" class="gl-btn" id="${REMINDER_EXPORT_ID}">${escapeHtml(ui.exportCalendar)}</button></div>` : '';
  return `${intro}<p role="status">${escapeHtml(ui.count(dueNow(list)))}</p><ul>${items}</ul>${exportButton}`;
}

export const CALENDAR_MIME = 'text/calendar;charset=utf-8';

/** Text in an iCalendar value: backslash, semicolon, comma and new lines are escaped. */
export function icsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** The next day as YYYYMMDD. An all-day event ends the day after it starts. */
export function nextDayCompact(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (m === null) return '';
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + 1));
  const pad = (n: number, w: number): string => String(n).padStart(w, '0');
  return `${pad(d.getUTCFullYear(), 4)}${pad(d.getUTCMonth() + 1, 2)}${pad(d.getUTCDate(), 2)}`;
}

/** Lines longer than 75 bytes are folded, as the format asks. Each fold is CRLF and one space. */
export function foldIcsLine(line: string): string {
  const out: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of Array.from(line)) {
    const size = new TextEncoder().encode(ch).length;
    if (bytes + size > (out.length === 0 ? 75 : 74)) {
      out.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join('\r\n ');
}

/** A calendar file with one all-day event for each date. Events say only what the person chose. */
export function remindersToIcs(list: readonly DueEntry[], lang: Lang, today: string): string {
  const ui = REMINDER_UI[lang];
  const stamp = `${today.replace(/-/g, '')}T000000Z`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Glossary//Check again//EN', 'CALSCALE:GREGORIAN'];
  for (const e of list) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.placeId.replace(/[^A-Za-z0-9-]/g, '')}-${e.date}@glossary.invalid`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${e.date.replace(/-/g, '')}`,
      `DTEND;VALUE=DATE:${nextDayCompact(e.date)}`,
      `SUMMARY:${icsText(fr(lang, ui.event(e.name)))}`,
      `DESCRIPTION:${icsText(ui.eventNote)}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}

export function remindersFilename(lang: Lang): string {
  return `check-again-dates-${lang}.ics`;
}
