import type { Locale } from "../../switch-first/src/index";
import { differingDetails, groupFile, unknownDetails, type StreetFile } from "./filestreets";
import { csvField, guardCell } from "./notes-csv";
import type { Place } from "./places";
import { parseStreet } from "./streets";

/**
 * "Plan visits by day": the places in a notes export, in walking order
 * (street by street, house numbers in order), spread over the days a person
 * chooses, a number of visits a day, each with a start and end time. The plan
 * only orders and times the places; it says nothing about them beyond what
 * the file records, and nothing is looked up or saved.
 */

/** 0 is Sunday, as in Date.getUTCDay(). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Monday first, the way a week is shown in Canada. */
export const WEEK: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export const PLAN_LIMITS = {
  perDay: { min: 1, max: 30 },
  minutes: { min: 5, max: 240 },
  gap: { min: 0, max: 120 },
} as const;

export const DAY_MINUTES = 24 * 60;

export interface PlanOptions {
  /** The first day that may hold visits, YYYY-MM-DD. */
  readonly start: string;
  /** The days of the week that may hold visits. */
  readonly weekdays: readonly Weekday[];
  /** When the first visit of a day starts, in minutes after midnight. */
  readonly startTime: number;
  readonly perDay: number;
  /** How long each visit lasts. */
  readonly minutes: number;
  /** Time between one visit and the next, to get there. */
  readonly gap: number;
  /** Odd numbers up one side of a street, even numbers back down the other. */
  readonly bothSides: boolean;
  /** Leave out places with nothing to look at. */
  readonly onlyOpen: boolean;
  /** Start a street on the next day rather than cut it, when it fits in one day. */
  readonly keepStreets: boolean;
}

/** The form as typed: kept as text so a wrong value stays on screen to fix. */
export interface PlanForm {
  readonly start: string;
  readonly weekdays: readonly Weekday[];
  readonly startTime: string;
  readonly perDay: string;
  readonly minutes: string;
  readonly gap: string;
  readonly bothSides: boolean;
  readonly onlyOpen: boolean;
  readonly keepStreets: boolean;
}

export type PlanField = "start" | "weekdays" | "startTime" | "perDay" | "minutes" | "gap";
export const PLAN_FIELDS: readonly PlanField[] = ["start", "weekdays", "startTime", "perDay", "minutes", "gap"];

export type PlanProblemCode = "date" | "weekdays" | "time" | "perDay" | "minutes" | "gap" | "pastMidnight";

export interface PlanProblem {
  readonly field: PlanField;
  readonly code: PlanProblemCode;
}

export type PlanCheck = { readonly ok: true; readonly options: PlanOptions } | { readonly ok: false; readonly problems: readonly PlanProblem[] };

export interface Visit {
  /** The day's place in the plan, from 0. */
  readonly day: number;
  /** YYYY-MM-DD. */
  readonly date: string;
  readonly start: number;
  readonly end: number;
  readonly place: Place;
  /** The street, or undefined for a place with no street in its address. */
  readonly street: string | undefined;
}

export interface PlanDay {
  readonly index: number;
  readonly date: string;
  readonly visits: readonly Visit[];
}

export interface Plan {
  readonly days: readonly PlanDay[];
  /** Places left out with onlyOpen: nothing to look at there. */
  readonly leftOutDone: number;
  /** Streets cut across two or more days (always the case for a street longer than a day). */
  readonly splitStreets: readonly string[];
}

/** "2026-11-23" → that date at UTC midnight, or undefined when it is not a real date. */
export function parseIsoDate(s: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return undefined;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return undefined;
  return date;
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** "9:30", "09:30" or "9 h 30" → minutes after midnight; undefined otherwise. */
export function parseClock(s: string): number | undefined {
  const m = /^(\d{1,2})\s*(?::|h)\s*(\d{2})$/i.exec(s.trim());
  if (!m) return undefined;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return undefined;
  return h * 60 + min;
}

/** "540" → "09:00": the value a time field holds. */
export function clockValue(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function wholeIn(s: string, min: number, max: number): number | undefined {
  const t = s.trim();
  if (!/^\d{1,3}$/.test(t)) return undefined;
  const n = Number(t);
  return n >= min && n <= max ? n : undefined;
}

export function isWeekday(n: number): n is Weekday {
  return Number.isInteger(n) && n >= 0 && n <= 6;
}

/** How long a full day of visits runs, from the first start to the last end. */
export function dayLength(perDay: number, minutes: number, gap: number): number {
  return perDay * minutes + (perDay - 1) * gap;
}

/** The form for given options, as it is shown. */
export function formFor(o: PlanOptions): PlanForm {
  return {
    start: o.start,
    weekdays: [...o.weekdays],
    startTime: clockValue(o.startTime),
    perDay: String(o.perDay),
    minutes: String(o.minutes),
    gap: String(o.gap),
    bothSides: o.bothSides,
    onlyOpen: o.onlyOpen,
    keepStreets: o.keepStreets,
  };
}

/** Weekdays, half-hour visits with a quarter-hour between, six a day from ten, starting today. */
export function defaultPlanOptions(today: Date): PlanOptions {
  return { start: isoDate(today), weekdays: [1, 2, 3, 4, 5], startTime: 10 * 60, perDay: 6, minutes: 30, gap: 15, bothSides: false, onlyOpen: false, keepStreets: true };
}

/** Reads the form. Every problem is reported at once, in the order of the fields. */
export function checkPlanForm(f: PlanForm): PlanCheck {
  const problems: PlanProblem[] = [];
  const start = parseIsoDate(f.start);
  if (!start) problems.push({ field: "start", code: "date" });
  const weekdays = WEEK.filter((d) => f.weekdays.includes(d));
  if (weekdays.length === 0) problems.push({ field: "weekdays", code: "weekdays" });
  const startTime = parseClock(f.startTime);
  if (startTime === undefined) problems.push({ field: "startTime", code: "time" });
  const perDay = wholeIn(f.perDay, PLAN_LIMITS.perDay.min, PLAN_LIMITS.perDay.max);
  if (perDay === undefined) problems.push({ field: "perDay", code: "perDay" });
  const minutes = wholeIn(f.minutes, PLAN_LIMITS.minutes.min, PLAN_LIMITS.minutes.max);
  if (minutes === undefined) problems.push({ field: "minutes", code: "minutes" });
  const gap = wholeIn(f.gap, PLAN_LIMITS.gap.min, PLAN_LIMITS.gap.max);
  if (gap === undefined) problems.push({ field: "gap", code: "gap" });
  if (startTime !== undefined && perDay !== undefined && minutes !== undefined && gap !== undefined && startTime + dayLength(perDay, minutes, gap) > DAY_MINUTES) {
    problems.push({ field: "perDay", code: "pastMidnight" });
  }
  if (problems.length > 0 || !start || startTime === undefined || perDay === undefined || minutes === undefined || gap === undefined) return { ok: false, problems };
  return {
    ok: true,
    options: { start: isoDate(start), weekdays, startTime, perDay, minutes, gap, bothSides: f.bothSides, onlyOpen: f.onlyOpen, keepStreets: f.keepStreets },
  };
}

/** The dates that may hold visits, from the start, one after another. */
export function* visitDates(start: string, weekdays: readonly Weekday[]): Generator<string, void, undefined> {
  const d = parseIsoDate(start);
  if (!d || weekdays.length === 0) return;
  for (;;) {
    if (weekdays.includes(d.getUTCDay() as Weekday)) yield isoDate(d);
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

interface Run {
  readonly street: string | undefined;
  readonly places: readonly Place[];
}

/**
 * Spreads the places over the days. The order is the walking order of "Sort a
 * notes file by street": streets in name order, house numbers in order, then
 * the places with no street. A day takes up to perDay visits. With
 * keepStreets, a street that would not fit in what is left of a day but fits
 * in a whole day starts on the next day instead; a longer street is cut where
 * the days end. Visits on a day follow each other with the gap between them.
 */
export function planVisits(file: StreetFile, o: PlanOptions, locale: Locale): Plan {
  const grouped = groupFile(file, { by: "street", bothSides: o.bothSides, onlyOpen: o.onlyOpen }, locale);
  const runs: Run[] = [...grouped.groups.map((g) => ({ street: g.name, places: g.places })), ...grouped.ungrouped.map((p) => ({ street: undefined, places: [p] }))];
  const dayPlaces: Array<Array<{ place: Place; street: string | undefined }>> = [];
  let current: Array<{ place: Place; street: string | undefined }> = [];
  const close = (): void => {
    if (current.length > 0) dayPlaces.push(current);
    current = [];
  };
  const streetDays = new Map<string, Set<number>>();
  for (const run of runs) {
    const left = o.perDay - current.length;
    if (o.keepStreets && run.street !== undefined && run.places.length > left && run.places.length <= o.perDay) close();
    for (const place of run.places) {
      if (current.length >= o.perDay) close();
      current.push({ place, street: run.street });
      if (run.street !== undefined) {
        const days = streetDays.get(run.street) ?? new Set<number>();
        days.add(dayPlaces.length);
        streetDays.set(run.street, days);
      }
    }
  }
  close();
  const dates = visitDates(o.start, o.weekdays);
  const days: PlanDay[] = dayPlaces.map((list, index) => {
    const next = dates.next();
    const date = next.done ? o.start : next.value;
    return {
      index,
      date,
      visits: list.map((v, i) => {
        const start = o.startTime + i * (o.minutes + o.gap);
        return { day: index, date, start, end: start + o.minutes, place: v.place, street: v.street };
      }),
    };
  });
  const splitStreets = [...streetDays].filter(([, d]) => d.size > 1).map(([s]) => s);
  return { days, leftOutDone: grouped.leftOutDone, splitStreets };
}

/** Every visit in the plan, in order. */
export function planVisitList(plan: Plan): Visit[] {
  return plan.days.flatMap((d) => [...d.visits]);
}

/** True when every place to visit is in the plan exactly once, and no two visits on a day overlap. */
export function planComplete(file: StreetFile, plan: Plan, onlyOpen: boolean): boolean {
  const want = file.places.filter((p) => !onlyOpen || unknownDetails(p).length > 0 || differingDetails(p).length > 0).map((p) => p.id);
  const got = planVisitList(plan).map((v) => v.place.id);
  if (got.length !== want.length || new Set(got).size !== got.length || !want.every((id) => got.includes(id))) return false;
  return plan.days.every((d) => d.visits.every((v, i) => i === 0 || (d.visits[i - 1] as Visit).end <= v.start));
}

/** The columns of the plan's CSV, named by the App's keys so the file reads the same in either language. */
export const PLAN_CSV_COLUMNS = ["date", "start", "end", "street", "house_number", "place_name", "address", "no_record", "reports_differ"] as const;

/** The plan as a CSV, one row per visit, guarded like the App's own CSV. */
export function planCsv(plan: Plan): string {
  const rows: string[][] = [[...PLAN_CSV_COLUMNS]];
  for (const v of planVisitList(plan)) {
    rows.push([
      v.date,
      clockValue(v.start),
      clockValue(v.end),
      v.street ?? "",
      parseStreet(v.place.address)?.number ?? "",
      v.place.name,
      v.place.address ?? "",
      unknownDetails(v.place).join(" "),
      differingDetails(v.place).join(" "),
    ]);
  }
  return `\uFEFF${rows.map((r) => r.map((c) => csvField(guardCell(c))).join(",")).join("\r\n")}\r\n`;
}
