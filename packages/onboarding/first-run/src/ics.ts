/**
 * A small writer for iCalendar files (RFC 5545), enough for a plan of visits
 * that a person adds to their own calendar app. Times are "floating": they
 * carry no time zone, so 09:00 stays 09:00 wherever the file is opened, which
 * is what a person planning a walk in their own city expects. Nothing here
 * reads a clock; the stamp is passed in.
 */

/** A day and a time on it, in minutes after midnight. */
export interface IcsTime {
  /** YYYY-MM-DD. */
  readonly date: string;
  readonly minutes: number;
}

export interface IcsEvent {
  /** Unique within the calendar and stable for the same visit, so a second import updates instead of doubling. */
  readonly uid: string;
  readonly start: IcsTime;
  readonly end: IcsTime;
  readonly summary: string;
  readonly location?: string | undefined;
  readonly description?: string | undefined;
}

export interface IcsCalendar {
  /** The product that made the file, e.g. "-//the App//Plan visits//EN". */
  readonly prodId: string;
  /** Shown as the calendar's name by apps that read X-WR-CALNAME. */
  readonly name?: string | undefined;
  /** When the file was made (DTSTAMP), as a UTC date. */
  readonly stamp: Date;
  readonly events: readonly IcsEvent[];
}

const MAX_OCTETS = 75;

/** Escapes a TEXT value: backslash, semicolon, comma and line breaks (RFC 5545 §3.3.11). */
export function icsEscape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

function octets(s: string): number {
  return new TextEncoder().encode(s).length;
}

/**
 * Folds a content line so no line is longer than 75 octets (RFC 5545 §3.1).
 * A continuation line starts with one space, which counts in its 75. Lines
 * are only cut between characters, never inside a UTF-8 sequence.
 */
export function foldLine(line: string): string {
  if (octets(line) <= MAX_OCTETS) return line;
  const parts: string[] = [];
  let current = "";
  let used = 0;
  let limit = MAX_OCTETS;
  for (const ch of line) {
    const n = octets(ch);
    if (used + n > limit) {
      parts.push(current);
      current = "";
      used = 0;
      limit = MAX_OCTETS - 1;
    }
    current += ch;
    used += n;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/** Undoes folding: a line break followed by one space or tab joins the lines. */
export function unfoldLines(text: string): string[] {
  return text
    .replace(/\r\n[ \t]/g, "")
    .split("\r\n")
    .filter((l) => l !== "");
}

/** "2026-11-23" and 540 minutes → "20261123T090000", a floating local time. */
export function icsLocalTime(t: IcsTime): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date)) throw new Error(`not a date: ${t.date}`);
  if (!Number.isInteger(t.minutes) || t.minutes < 0 || t.minutes > 24 * 60) throw new Error(`not a time: ${t.minutes}`);
  // 24:00 is written as midnight of the next day.
  if (t.minutes === 24 * 60) {
    const next = new Date(`${t.date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    return `${next.toISOString().slice(0, 10).replace(/-/g, "")}T000000`;
  }
  const h = String(Math.floor(t.minutes / 60)).padStart(2, "0");
  const m = String(t.minutes % 60).padStart(2, "0");
  return `${t.date.replace(/-/g, "")}T${h}${m}00`;
}

/** A UTC stamp: "20261120T143000Z". */
export function icsStamp(d: Date): string {
  return `${d.toISOString().slice(0, 19).replace(/[-:]/g, "")}Z`;
}

/** The whole calendar file, with CRLF line ends and folded lines. */
export function icsCalendar(cal: IcsCalendar): string {
  const lines: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:${cal.prodId}`, "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  if (cal.name !== undefined && cal.name !== "") lines.push(`X-WR-CALNAME:${icsEscape(cal.name)}`);
  const stamp = icsStamp(cal.stamp);
  for (const e of cal.events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${icsEscape(e.uid)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsLocalTime(e.start)}`,
      `DTEND:${icsLocalTime(e.end)}`,
      `SUMMARY:${icsEscape(e.summary)}`,
    );
    if (e.location !== undefined && e.location !== "") lines.push(`LOCATION:${icsEscape(e.location)}`);
    if (e.description !== undefined && e.description !== "") lines.push(`DESCRIPTION:${icsEscape(e.description)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

/** A download link target for a calendar file. */
export function icsHref(ics: string): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

/** Reads back what icsHref encoded (for tests and for a host that wants the text). */
export function decodeIcsHref(href: string): string | undefined {
  const prefix = "data:text/calendar;charset=utf-8,";
  if (!href.startsWith(prefix)) return undefined;
  try {
    return decodeURIComponent(href.slice(prefix.length));
  } catch {
    return undefined;
  }
}
