/**
 * Groups a person's own saved observations by the day they were seen, and counts what each day
 * holds. Pure: no network, no storage, no clock. Nothing here changes an observation, and a
 * count is only a count: it does not say a day's work is complete or correct.
 */
import { haversineMetres } from '../presubmit/geo.js';
import { daysBetween, isIsoDay } from '../presubmit/text.js';

export interface LogNote {
  id: string;
  lat: number;
  lon: number;
  name: string | null;
  wheelchair: string;
  source: string;
  licence: string;
  observedOn: string;
}

export const LOG_STATUSES = ['yes', 'limited', 'no', 'UNKNOWN'] as const;
export type LogStatus = (typeof LOG_STATUSES)[number];

export function logStatusOf(note: LogNote): LogStatus {
  return note.wheelchair === 'yes' || note.wheelchair === 'limited' || note.wheelchair === 'no' ? note.wheelchair : 'UNKNOWN';
}

export interface DayStats {
  total: number;
  byStatus: Record<LogStatus, number>;
  licences: { licence: string; count: number }[];
  sources: string[];
  unnamed: number;
  /** Straight-line distance across the day's notes, corner to corner, in metres. 0 for one note. */
  spanMetres: number;
}

export interface DayGroup {
  /** YYYY-MM-DD. */
  day: string;
  /** Notes seen that day, by name, unnamed last. */
  notes: LogNote[];
  stats: DayStats;
  /** Days since the previous day with notes. Null for the earliest day. */
  daysSincePrevious: number | null;
}

export interface DayLog {
  /** Newest day first. */
  days: DayGroup[];
  /** Notes whose date is not a real day. They are listed, never given a day. */
  undated: LogNote[];
  totalNotes: number;
}

function byName(a: LogNote, b: LogNote): number {
  if (a.name === null && b.name !== null) return 1;
  if (a.name !== null && b.name === null) return -1;
  return (a.name ?? '').localeCompare(b.name ?? '', 'en') || a.id.localeCompare(b.id);
}

export function statsFor(notes: readonly LogNote[]): DayStats {
  const byStatus: Record<LogStatus, number> = { yes: 0, limited: 0, no: 0, UNKNOWN: 0 };
  const licences = new Map<string, number>();
  const sources: string[] = [];
  let unnamed = 0;
  let south = Infinity;
  let north = -Infinity;
  let west = Infinity;
  let east = -Infinity;
  for (const note of notes) {
    byStatus[logStatusOf(note)] += 1;
    licences.set(note.licence, (licences.get(note.licence) ?? 0) + 1);
    const source = note.source.replace(/\s+/g, ' ').trim();
    if (source !== '' && !sources.includes(source)) sources.push(source);
    if (note.name === null || note.name.trim() === '') unnamed += 1;
    if (Number.isFinite(note.lat) && Number.isFinite(note.lon)) {
      south = Math.min(south, note.lat);
      north = Math.max(north, note.lat);
      west = Math.min(west, note.lon);
      east = Math.max(east, note.lon);
    }
  }
  const span = Number.isFinite(south) ? haversineMetres({ lat: south, lon: west }, { lat: north, lon: east }) : 0;
  return {
    total: notes.length,
    byStatus,
    licences: [...licences.entries()].map(([licence, count]) => ({ licence, count })).sort((a, b) => a.licence.localeCompare(b.licence)),
    sources: sources.sort((a, b) => a.localeCompare(b, 'en')),
    unnamed,
    spanMetres: Number.isFinite(span) ? span : 0,
  };
}

export function buildDayLog(notes: readonly LogNote[]): DayLog {
  const byDay = new Map<string, LogNote[]>();
  const undated: LogNote[] = [];
  for (const note of notes) {
    if (!isIsoDay(note.observedOn)) {
      undated.push(note);
      continue;
    }
    byDay.set(note.observedOn, [...(byDay.get(note.observedOn) ?? []), note]);
  }
  const ascending = [...byDay.keys()].sort();
  const days: DayGroup[] = ascending.map((day, index) => {
    const list = [...(byDay.get(day) ?? [])].sort(byName);
    const previous = index === 0 ? undefined : ascending[index - 1];
    return { day, notes: list, stats: statsFor(list), daysSincePrevious: previous === undefined ? null : daysBetween(previous, day) };
  });
  return { days: days.reverse(), undated: undated.sort(byName), totalNotes: notes.length };
}

export function dayGroup(log: DayLog, day: string): DayGroup | null {
  return log.days.find((group) => group.day === day) ?? null;
}

/** How many notes each day of a month holds, keyed by YYYY-MM-DD. Days with none are absent. */
export function countsForMonth(log: DayLog, month: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const group of log.days) if (group.day.startsWith(`${month}-`)) out.set(group.day, group.stats.total);
  return out;
}

/** The months that hold notes, as YYYY-MM, newest first. */
export function monthsWithNotes(log: DayLog): string[] {
  return [...new Set(log.days.map((group) => group.day.slice(0, 7)))];
}

export interface LogTotals {
  days: number;
  notes: number;
  undated: number;
  byStatus: Record<LogStatus, number>;
  /** Null when there are no dated notes. */
  firstDay: string | null;
  lastDay: string | null;
  /** The day with the most notes; the newest of them on a tie. Null when there are none. */
  busiestDay: string | null;
}

export function logTotals(log: DayLog): LogTotals {
  const byStatus: Record<LogStatus, number> = { yes: 0, limited: 0, no: 0, UNKNOWN: 0 };
  let busiest: DayGroup | null = null;
  for (const group of log.days) {
    for (const status of LOG_STATUSES) byStatus[status] += group.stats.byStatus[status];
    if (busiest === null || group.stats.total > busiest.stats.total) busiest = group;
  }
  for (const note of log.undated) byStatus[logStatusOf(note)] += 1;
  return {
    days: log.days.length,
    notes: log.totalNotes,
    undated: log.undated.length,
    byStatus,
    firstDay: log.days[log.days.length - 1]?.day ?? null,
    lastDay: log.days[0]?.day ?? null,
    busiestDay: busiest?.day ?? null,
  };
}
