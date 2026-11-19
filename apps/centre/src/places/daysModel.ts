/**
 * Builds what the day log shows from the person's saved observations, their day notes, the
 * month on screen and the chosen day. Pure: the language comes in as an argument and nothing
 * here reads the clock or storage.
 */
import { exportFile } from "./contribute.js";
import {
  addLogMonths,
  buildDayLog,
  dayNoteFor,
  dayReportFilename,
  dayReportText,
  logCalendarCellText,
  logCountsForMonth,
  logDayCountText,
  logDayGroup,
  logDayHeading,
  logDayStatLines,
  logDaysCsv,
  logDaysCsvFilename,
  logMonthGrid,
  logMonthKey,
  logMonthName,
  logNoteLine,
  logTotals,
  logTotalsLines,
  logWeekdayNames,
  parseLogMonth,
  type DayLog,
  type DayNotes,
  type LogDayGroup,
  type LogMonthRef,
} from "./docs-bridge.js";
import type { Language, PlaceRecord } from "./types.js";

export interface CalendarCell {
  iso: string | null;
  day: number | null;
  count: number;
  /** What a screen reader hears for the cell. Empty for a blank cell. */
  label: string;
  hasNote: boolean;
}

export interface DayListItem {
  day: string;
  heading: string;
  countText: string;
  hasNote: boolean;
}

export interface DayDetail {
  group: LogDayGroup;
  heading: string;
  statLines: string[];
  places: { id: string; name: string | null; line: string }[];
  note: string;
}

export interface DaysView {
  log: DayLog;
  totalsLines: string[];
  month: LogMonthRef;
  monthKey: string;
  monthName: string;
  weekdays: string[];
  weeks: CalendarCell[][];
  monthDays: DayListItem[];
  /** Null when no day is chosen or the chosen day holds no observations. */
  detail: DayDetail | null;
  undated: { id: string; name: string | null; line: string }[];
}

/** The month to open on: the month of the newest observation, or the month of today when there are none. */
export function startMonth(records: readonly PlaceRecord[], today: string): LogMonthRef {
  const log = buildDayLog(records);
  return parseLogMonth(log.days[0]?.day ?? today) ?? { year: 2026, month: 1 };
}

export function buildDaysView(records: readonly PlaceRecord[], notes: DayNotes, month: LogMonthRef, chosenDay: string | null, language: Language): DaysView {
  const log = buildDayLog(records);
  const key = logMonthKey(month);
  const counts = logCountsForMonth(log, key);
  const weeks: CalendarCell[][] = logMonthGrid(month).map((week) =>
    week.map((cell) => {
      const count = cell.iso === null ? 0 : (counts.get(cell.iso) ?? 0);
      return {
        iso: cell.iso,
        day: cell.day,
        count,
        label: cell.day === null ? "" : logCalendarCellText(cell.day, count, language),
        hasNote: cell.iso !== null && dayNoteFor(notes, cell.iso) !== "",
      };
    }),
  );
  const monthDays: DayListItem[] = log.days
    .filter((group) => group.day.startsWith(`${key}-`))
    .map((group) => ({ day: group.day, heading: logDayHeading(group.day, language), countText: logDayCountText(group.stats.total, language), hasNote: dayNoteFor(notes, group.day) !== "" }));
  const group = chosenDay === null ? null : logDayGroup(log, chosenDay);
  const line = (record: { id: string; name: string | null }) => ({ id: record.id, name: record.name });
  return {
    log,
    totalsLines: logTotalsLines(logTotals(log), language),
    month,
    monthKey: key,
    monthName: logMonthName(month, language),
    weekdays: logWeekdayNames(language),
    weeks,
    monthDays,
    detail:
      group === null
        ? null
        : {
            group,
            heading: logDayHeading(group.day, language),
            statLines: logDayStatLines(group, language),
            places: group.notes.map((note) => ({ ...line(note), line: logNoteLine(note, language) })),
            note: dayNoteFor(notes, group.day),
          },
    undated: log.undated.map((note) => ({ ...line(note), line: logNoteLine(note, language) })),
  };
}

export function shiftMonth(month: LogMonthRef, delta: number): LogMonthRef {
  return addLogMonths(month, delta);
}

export type DaysFileKind = "day-text" | "day-osm" | "days-csv";

export interface DaysFile {
  filename: string;
  mime: string;
  content: string;
}

/** Null when the file needs a chosen day and there is none. */
export function daysFile(kind: DaysFileKind, view: DaysView, today: string, language: Language): DaysFile | null {
  if (kind === "days-csv") return { filename: logDaysCsvFilename(today), mime: "text/csv", content: logDaysCsv(view.log) };
  if (view.detail === null) return null;
  const { group, note } = view.detail;
  if (kind === "day-text") return { filename: dayReportFilename(group.day), mime: "text/plain", content: dayReportText(group, note, language) };
  // The same file the contribution screen makes, limited to this day. The day note is not in it.
  return exportFile("osm", group.notes as PlaceRecord[], group.day);
}
