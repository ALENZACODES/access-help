import { columnName, detectDelimiter, parseCsv, unguardCell } from "./csvimport";
import { LIMITS } from "./model";
import { parseIsoDate } from "./visitplan";

/**
 * Reads back the list "Letters to places" gives to track letters, once the
 * person has filled in when each letter was sent and when its reply came. It
 * sorts the letters into not sent, waiting for a reply (longest wait first)
 * and answered, and lists the rows whose dates it cannot use, saying why.
 * It reads only the dates the person typed; it records nothing.
 */

/** A wait of this many days or more is called out as time to write again or call. */
export const FOLLOW_UP_DAYS = 30;

export const TRACK_REQUIRED = ["place_name", "sent_on", "reply_on"] as const;

export type TrackFileError = "empty" | "too-large" | "unclosed-quote" | "too-many-rows" | "missing-columns" | "no-rows";

export type TrackProblem = "no-name" | "sent-date" | "reply-date" | "sent-later" | "reply-later" | "reply-not-sent" | "reply-before";
export const TRACK_PROBLEMS: readonly TrackProblem[] = ["no-name", "sent-date", "reply-date", "sent-later", "reply-later", "reply-not-sent", "reply-before"];

export interface TrackRow {
  /** The row's line in the file, counting the header as line 1. */
  readonly line: number;
  readonly name: string;
  readonly address: string;
  readonly sentOn: string;
  readonly replyOn: string;
}

export interface Waiting extends TrackRow {
  /** Whole days from the day it was sent to today. */
  readonly days: number;
}

export interface Unusable extends TrackRow {
  readonly problem: TrackProblem;
}

export interface Tracking {
  readonly notSent: readonly TrackRow[];
  /** Longest wait first. */
  readonly waiting: readonly Waiting[];
  readonly replied: readonly TrackRow[];
  readonly unusable: readonly Unusable[];
}

export type TrackResult = { readonly ok: true; readonly tracking: Tracking } | { readonly ok: false; readonly error: TrackFileError; readonly missing?: readonly string[] };

const DAY_MS = 86_400_000;

function daysFrom(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

/** What is wrong with a row's dates, if anything, checked in the order a person would fix them. */
export function rowProblem(row: TrackRow, today: Date): TrackProblem | undefined {
  if (row.name === "") return "no-name";
  const sent = row.sentOn === "" ? undefined : parseIsoDate(row.sentOn);
  const reply = row.replyOn === "" ? undefined : parseIsoDate(row.replyOn);
  if (row.sentOn !== "" && !sent) return "sent-date";
  if (row.replyOn !== "" && !reply) return "reply-date";
  if (sent && sent.getTime() > today.getTime()) return "sent-later";
  if (reply && reply.getTime() > today.getTime()) return "reply-later";
  if (reply && !sent) return "reply-not-sent";
  if (reply && sent && reply.getTime() < sent.getTime()) return "reply-before";
  return undefined;
}

/** Sorts rows already read from the file. */
export function sortTracking(rows: readonly TrackRow[], today: Date): Tracking {
  const notSent: TrackRow[] = [];
  const waiting: Waiting[] = [];
  const replied: TrackRow[] = [];
  const unusable: Unusable[] = [];
  for (const row of rows) {
    const problem = rowProblem(row, today);
    if (problem) unusable.push({ ...row, problem });
    else if (row.sentOn === "") notSent.push(row);
    else if (row.replyOn !== "") replied.push(row);
    else {
      const sent = parseIsoDate(row.sentOn);
      if (sent) waiting.push({ ...row, days: daysFrom(sent, today) });
    }
  }
  waiting.sort((a, b) => b.days - a.days || a.line - b.line);
  return { notSent, waiting, replied, unusable };
}

/** Reads the tracking list, saved by a spreadsheet with commas, semicolons or tabs. */
export function readTracking(text: string, today: Date): TrackResult {
  if (text.trim() === "") return { ok: false, error: "empty" };
  if (text.length > LIMITS.importChars) return { ok: false, error: "too-large" };
  const parsed = parseCsv(text, detectDelimiter(text));
  if ("error" in parsed) return { ok: false, error: parsed.error };
  const [header, ...body] = parsed.rows;
  const names = (header ?? []).map(columnName);
  const missing = TRACK_REQUIRED.filter((c) => !names.includes(c));
  if (missing.length > 0) return { ok: false, error: "missing-columns", missing };
  const col = (row: readonly string[], name: string): string => {
    const i = names.indexOf(name);
    return i < 0 ? "" : unguardCell((row[i] ?? "").trim());
  };
  const rows = body
    .map((r, i): TrackRow => ({ line: i + 2, name: col(r, "place_name"), address: col(r, "address"), sentOn: col(r, "sent_on"), replyOn: col(r, "reply_on") }))
    .filter((r) => r.name !== "" || r.address !== "" || r.sentOn !== "" || r.replyOn !== "");
  if (rows.length === 0) return { ok: false, error: "no-rows" };
  return { ok: true, tracking: sortTracking(rows, today) };
}

/** The letters waiting FOLLOW_UP_DAYS days or more. */
export function dueForFollowUp(t: Tracking): Waiting[] {
  return t.waiting.filter((w) => w.days >= FOLLOW_UP_DAYS);
}

export function trackTotal(t: Tracking): number {
  return t.notSent.length + t.waiting.length + t.replied.length + t.unusable.length;
}
