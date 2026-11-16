import { fixFrench } from './frTypography';
import type { Place } from './places';
import type { Lang } from './plainTerms';
import { isIsoDate } from './provenance';
import { escapeHtml } from './text';

/**
 * A week plan: one day of the week for each place the person wants to go to. Kept on this device.
 * A day is the person's own plan. It says nothing about the place, and unknown stays Unknown.
 */
export const DAYS_STORE_KEY = 'glossary-day-plan';
export const MAX_PLANNED = 100;

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type DayPlan = Readonly<Record<string, Weekday>>;

export function isWeekday(value: unknown): value is Weekday {
  return typeof value === 'string' && (WEEKDAYS as readonly string[]).includes(value);
}

export function dayOf(plan: DayPlan, placeId: string): Weekday | null {
  return Object.prototype.hasOwnProperty.call(plan, placeId) ? (plan[placeId] ?? null) : null;
}

/** Sets the day for a place. An empty value removes it. A value that is not a weekday changes nothing. */
export function setDay(plan: DayPlan, placeId: string, day: string): DayPlan {
  if (placeId === '') return plan;
  if (day === '') {
    return dayOf(plan, placeId) === null ? plan : Object.fromEntries(Object.entries(plan).filter(([id]) => id !== placeId));
  }
  if (!isWeekday(day)) return plan;
  if (dayOf(plan, placeId) === day) return plan;
  const entries = Object.entries(plan).filter(([id]) => id !== placeId);
  entries.push([placeId, day]);
  // fromEntries makes own properties, so an id such as "__proto__" is kept as data. The oldest are dropped past the limit.
  return Object.fromEntries(entries.slice(Math.max(0, entries.length - MAX_PLANNED)));
}

/** Keeps only days for places that exist. */
export function pruneDays(plan: DayPlan, ids: readonly string[]): DayPlan {
  const known = new Set(ids);
  const entries = Object.entries(plan);
  return entries.every(([id]) => known.has(id)) ? plan : Object.fromEntries(entries.filter(([id]) => known.has(id)));
}

export function serialiseDays(plan: DayPlan): string {
  return JSON.stringify(plan);
}

/** Null unless the text is a JSON object of ids to weekdays. Other entries are dropped. */
export function parseDays(json: string): DayPlan | null {
  try {
    const raw: unknown = JSON.parse(json);
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
    let out: DayPlan = {};
    for (const [id, day] of Object.entries(raw)) if (isWeekday(day)) out = setDay(out, id, day);
    return out;
  } catch {
    return null;
  }
}

/** The weekday of a real YYYY-MM-DD date, or null. */
export function weekdayOf(date: string): Weekday | null {
  if (!isIsoDate(date)) return null;
  const [y, m, d] = date.split('-').map(Number);
  const index = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1)).getUTCDay(); // 0 is Sunday
  return WEEKDAYS[(index + 6) % 7] ?? null;
}

/** The date of the next time `day` comes, counting `today` itself. Null if `today` is not a real date. */
export function nextDateOf(today: string, day: Weekday): string | null {
  const from = weekdayOf(today);
  if (from === null) return null;
  const ahead = (WEEKDAYS.indexOf(day) - WEEKDAYS.indexOf(from) + 7) % 7;
  const [y, m, d] = today.split('-').map(Number);
  const t = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, (d ?? 1) + ahead));
  const pad = (n: number, w: number): string => String(n).padStart(w, '0');
  return `${pad(t.getUTCFullYear(), 4)}-${pad(t.getUTCMonth() + 1, 2)}-${pad(t.getUTCDate(), 2)}`;
}

export interface PlannedPlace {
  readonly placeId: string;
  readonly name: string;
  /** Index in the list that was given. Used in control ids. */
  readonly index: number;
}

export interface WeekDay {
  readonly day: Weekday;
  readonly places: readonly PlannedPlace[];
}

/** All seven days, Monday first, each with its places in name order. Places that are not loaded are left out. */
export function weekView(plan: DayPlan, places: readonly Place[]): readonly WeekDay[] {
  return WEEKDAYS.map((day) => ({
    day,
    places: places
      .map((p, index) => ({ placeId: p.id, name: p.name, index }))
      .filter((p) => dayOf(plan, p.placeId) === day)
      .sort((a, b) => a.name.localeCompare(b.name) || a.index - b.index),
  }));
}

export function plannedCount(week: readonly WeekDay[]): number {
  return week.reduce((n, d) => n + d.places.length, 0);
}

export const DAY_UI = {
  en: {
    heading: 'Your week',
    intro: 'Pick a day for each saved place. The plan stays on this device and says nothing about the place.',
    days: { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' },
    none: 'No day',
    label: (name: string): string => `Day to go to ${name}`,
    free: 'Nothing planned',
    today: 'today',
    count: (n: number): string => (n === 0 ? 'No places planned yet.' : n === 1 ? '1 place planned.' : `${n} places planned.`),
    show: 'Show',
    showLabel: (name: string): string => `Show ${name} in the list`,
    exportWeek: 'Copy my week as text',
    title: 'My week',
    set: (name: string, day: string): string => `${name} is planned for ${day}.`,
    cleared: (name: string): string => `Removed the day for ${name}.`,
    needSave: 'Save a place to pick a day for it.',
  },
  fr: {
    heading: 'Votre semaine',
    intro: 'Choisissez un jour pour chaque lieu enregistré. Le plan reste sur cet appareil et ne dit rien sur le lieu.',
    days: { mon: 'lundi', tue: 'mardi', wed: 'mercredi', thu: 'jeudi', fri: 'vendredi', sat: 'samedi', sun: 'dimanche' },
    none: 'Aucun jour',
    label: (name: string): string => `Jour pour aller à ${name}`,
    free: 'Rien de prévu',
    today: 'aujourd’hui',
    count: (n: number): string => (n === 0 ? 'Aucun lieu prévu pour le moment.' : n === 1 ? '1 lieu prévu.' : `${n} lieux prévus.`),
    show: 'Afficher',
    showLabel: (name: string): string => `Afficher ${name} dans la liste`,
    exportWeek: 'Copier ma semaine en texte',
    title: 'Ma semaine',
    set: (name: string, day: string): string => `${name} est prévu pour ${day}.`,
    cleared: (name: string): string => `Jour retiré pour ${name}.`,
    needSave: 'Enregistrez un lieu pour lui choisir un jour.',
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

export function dayName(day: Weekday, lang: Lang): string {
  return DAY_UI[lang].days[day];
}

/** "Monday" in English, "Lundi" at the start of a line in French. */
function heading(day: Weekday, lang: Lang): string {
  const name = dayName(day, lang);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export const DAY_SELECT_PREFIX = 'gl-day-';
export const DAY_EXPORT_ID = 'gl-day-export';

export function dayId(index: number): string {
  return `${DAY_SELECT_PREFIX}${index}`;
}
export function parseDayId(id: string): number | null {
  const m = /^gl-day-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}
export function parseDayShowId(id: string): number | null {
  const m = /^gl-dyshow-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}

/** The day box for one saved place. */
export function renderDayField(index: number, name: string, current: Weekday | null, lang: Lang): string {
  const ui = DAY_UI[lang];
  const options =
    `<option value=""${current === null ? ' selected' : ''}>${escapeHtml(ui.none)}</option>` +
    WEEKDAYS.map((d) => `<option value="${d}"${d === current ? ' selected' : ''}>${escapeHtml(heading(d, lang))}</option>`).join('');
  return `<div class="gl-dayfield"><label for="${dayId(index)}">${escapeHtml(fr(lang, ui.label(name)))}</label><select id="${dayId(index)}" class="gl-select">${options}</select></div>`;
}

/** The week: seven days, each with its places and a Show button for each. */
export function renderWeek(week: readonly WeekDay[], today: string, lang: Lang, canExport: boolean): string {
  const ui = DAY_UI[lang];
  const now = weekdayOf(today);
  const days = week
    .map((d) => {
      const places =
        d.places.length === 0
          ? `<p class="gl-note">${escapeHtml(ui.free)}</p>`
          : '<ul>' +
            d.places
              .map(
                (p) =>
                  `<li>${escapeHtml(p.name)} <button type="button" class="gl-btn" id="gl-dyshow-${p.index}" aria-label="${escapeHtml(fr(lang, ui.showLabel(p.name)))}">${escapeHtml(ui.show)}</button></li>`,
              )
              .join('') +
            '</ul>';
      const mark = d.day === now ? ` (${escapeHtml(ui.today)})` : '';
      return `<section class="gl-weekday"><h4>${escapeHtml(heading(d.day, lang))}${mark}</h4>${places}</section>`;
    })
    .join('');
  const total = plannedCount(week);
  const exportButton = canExport && total > 0 ? `<div class="gl-actions"><button type="button" class="gl-btn" id="${DAY_EXPORT_ID}">${escapeHtml(ui.exportWeek)}</button></div>` : '';
  return `<p>${escapeHtml(ui.intro)}</p><p role="status">${escapeHtml(ui.count(total))}</p>${days}${exportButton}`;
}

export const DAY_TEXT_MIME = 'text/plain;charset=utf-8';

/** The week as plain text, one block for each day that has places, with the date of the next such day. */
export function weekToText(week: readonly WeekDay[], today: string, lang: Lang): string {
  const ui = DAY_UI[lang];
  const blocks = week
    .filter((d) => d.places.length > 0)
    .map((d) => {
      const date = nextDateOf(today, d.day);
      const title = `${heading(d.day, lang)}${date === null ? '' : ` ${date}`}`;
      return `${title}\n${d.places.map((p) => `- ${p.name}`).join('\n')}`;
    });
  const text = `${ui.title}\n\n${blocks.length === 0 ? ui.count(0) : blocks.join('\n\n')}\n`;
  return text;
}

export function weekFilename(lang: Lang): string {
  return `my-week-${lang}.txt`;
}
