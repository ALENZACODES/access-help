import type { EventAccessRecord } from "./types.js";

/** Where an event sits against a given day. A record with no event date is "undated", never "upcoming". */
export type EventTiming = "upcoming" | "today" | "past" | "undated";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar day written YYYY-MM-DD. */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function dayNumber(iso: string): number {
  const match = ISO_DATE.exec(iso);
  if (!match) throw new Error(`not an ISO date: ${iso}`);
  return Math.round(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000);
}

/** Whole days from one ISO date to another. Negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

/**
 * Freshness of a per-event record is tied to the event date, not to how old the statements are.
 * Once the event day has passed, the record describes a past event.
 */
export function eventTiming(record: Pick<EventAccessRecord, "occurrenceDate">, today: string): EventTiming {
  if (!isIsoDate(today)) throw new Error(`today must be an ISO date, got ${String(today)}`);
  if (!isIsoDate(record.occurrenceDate)) return "undated";
  const days = daysBetween(today, record.occurrenceDate);
  if (days > 0) return "upcoming";
  return days === 0 ? "today" : "past";
}

export type StatementRelation = "before_event" | "on_event_day" | "after_event" | "no_event_date";

export interface StatementTiming {
  relation: StatementRelation;
  /** Whole days between the statement and the event day. Null when there is no event date. */
  days: number | null;
}

/** How a statement's date sits against the event day. Reported as a plain count, with no cut-off. */
export function statementTiming(statementDate: string, occurrenceDate: string | undefined | null): StatementTiming {
  if (!isIsoDate(occurrenceDate) || !isIsoDate(statementDate)) return { relation: "no_event_date", days: null };
  const days = daysBetween(statementDate, occurrenceDate);
  if (days === 0) return { relation: "on_event_day", days: 0 };
  return days > 0 ? { relation: "before_event", days } : { relation: "after_event", days: -days };
}

/** Today's date on this device, YYYY-MM-DD in local time. */
export function localToday(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
