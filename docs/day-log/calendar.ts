/**
 * Calendar arithmetic for the day log. Pure: every function works from the dates it is given
 * and never asks what today is. Months are written YYYY-MM and days YYYY-MM-DD.
 */
import { isIsoDay } from '../presubmit/text.js';

export interface MonthRef {
  year: number;
  /** 1 to 12. */
  month: number;
}

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function monthKey(ref: MonthRef): string {
  return `${String(ref.year).padStart(4, '0')}-${pad2(ref.month)}`;
}

/** Reads YYYY-MM or the month of a YYYY-MM-DD day. Null when it is neither. */
export function parseMonth(value: string): MonthRef | null {
  const match = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(value);
  if (match === null) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  if (value.length === 10 && !isIsoDay(value)) return null;
  return { year, month };
}

export function addMonths(ref: MonthRef, delta: number): MonthRef {
  const index = ref.year * 12 + (ref.month - 1) + Math.trunc(delta);
  return { year: Math.floor(index / 12), month: (((index % 12) + 12) % 12) + 1 };
}

export function compareMonths(a: MonthRef, b: MonthRef): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

export function daysInMonth(ref: MonthRef): number {
  return new Date(Date.UTC(ref.year, ref.month, 0)).getUTCDate();
}

/** 0 for Sunday to 6 for Saturday. */
export function weekdayOf(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export interface DayCell {
  /** YYYY-MM-DD, or null for a blank cell before the first or after the last day. */
  iso: string | null;
  day: number | null;
}

/**
 * The month as rows of seven cells. Weeks start on Sunday, the usual Ontario calendar in both
 * languages. Every day of the month appears once; cells outside the month are blank.
 */
export function monthGrid(ref: MonthRef): DayCell[][] {
  const lead = weekdayOf(ref.year, ref.month, 1);
  const total = daysInMonth(ref);
  const cells: DayCell[] = [];
  for (let i = 0; i < lead; i += 1) cells.push({ iso: null, day: null });
  for (let day = 1; day <= total; day += 1) cells.push({ iso: `${monthKey(ref)}-${pad2(day)}`, day });
  while (cells.length % 7 !== 0) cells.push({ iso: null, day: null });
  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;
const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'] as const;
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const DAYS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] as const;

export function monthName(ref: MonthRef, lang: 'en' | 'fr'): string {
  const name = (lang === 'fr' ? MONTHS_FR : MONTHS_EN)[ref.month - 1] ?? '';
  return `${name} ${ref.year}`;
}

export function weekdayNames(lang: 'en' | 'fr'): string[] {
  return [...(lang === 'fr' ? DAYS_FR : DAYS_EN)];
}

/** A day written out, such as "Tuesday, 10 November 2026" or "mardi 10 novembre 2026". Empty for a date that is not a day. */
export function longDay(iso: string, lang: 'en' | 'fr'): string {
  if (!isIsoDay(iso)) return '';
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  const weekday = weekdayNames(lang)[weekdayOf(year, month, day)] ?? '';
  if (lang === 'fr') return `${weekday} ${day === 1 ? '1er' : day} ${MONTHS_FR[month - 1] ?? ''} ${year}`;
  return `${weekday}, ${day} ${MONTHS_EN[month - 1] ?? ''} ${year}`;
}
