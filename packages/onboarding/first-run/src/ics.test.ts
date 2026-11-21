import { describe, expect, it } from "vitest";
import { decodeIcsHref, foldLine, icsCalendar, icsEscape, icsHref, icsLocalTime, icsStamp, unfoldLines, type IcsEvent } from "./ics";

const octets = (s: string): number => new TextEncoder().encode(s).length;

const EVENT: IcsEvent = {
  uid: "p1-20261123@plan-visits",
  start: { date: "2026-11-23", minutes: 9 * 60 },
  end: { date: "2026-11-23", minutes: 9 * 60 + 30 },
  summary: "Café, bar; and \\ more",
  location: "12 King St W, Toronto",
  description: "Line one\nLine two",
};

describe("icsEscape", () => {
  it("escapes backslash, semicolon, comma and line breaks", () => {
    expect(icsEscape("a\\b;c,d")).toBe("a\\\\b\\;c\\,d");
    expect(icsEscape("one\ntwo\r\nthree\rfour")).toBe("one\\ntwo\\nthree\\nfour");
  });

  it("leaves other text alone, accents included", () => {
    expect(icsEscape("Pharmacie de l’Île: ouverte")).toBe("Pharmacie de l’Île: ouverte");
  });
});

describe("foldLine", () => {
  it("leaves a line of 75 octets or fewer alone", () => {
    const line = `SUMMARY:${"a".repeat(67)}`;
    expect(octets(line)).toBe(75);
    expect(foldLine(line)).toBe(line);
  });

  it("folds a long line into lines of at most 75 octets, each continuation starting with a space", () => {
    const line = `DESCRIPTION:${"x".repeat(200)}`;
    const folded = foldLine(line);
    const parts = folded.split("\r\n");
    expect(parts.length).toBe(3);
    for (const p of parts) expect(octets(p)).toBeLessThanOrEqual(75);
    for (const p of parts.slice(1)) expect(p.startsWith(" ")).toBe(true);
    expect(unfoldLines(folded)).toEqual([line]);
  });

  it("never cuts inside a character of more than one octet", () => {
    const line = `SUMMARY:${"é".repeat(60)}${"😀".repeat(10)}`;
    const folded = foldLine(line);
    for (const p of folded.split("\r\n")) {
      expect(octets(p)).toBeLessThanOrEqual(75);
      expect(p).not.toContain("\uFFFD");
    }
    expect(unfoldLines(folded)).toEqual([line]);
  });
});

describe("times", () => {
  it("writes a floating local time", () => {
    expect(icsLocalTime({ date: "2026-11-23", minutes: 0 })).toBe("20261123T000000");
    expect(icsLocalTime({ date: "2026-11-23", minutes: 9 * 60 + 5 })).toBe("20261123T090500");
    expect(icsLocalTime({ date: "2026-11-23", minutes: 23 * 60 + 59 })).toBe("20261123T235900");
  });

  it("writes 24:00 as midnight of the next day, across a month and a year", () => {
    expect(icsLocalTime({ date: "2026-11-30", minutes: 24 * 60 })).toBe("20261201T000000");
    expect(icsLocalTime({ date: "2026-12-31", minutes: 24 * 60 })).toBe("20270101T000000");
  });

  it("refuses what is not a date or a time of day", () => {
    expect(() => icsLocalTime({ date: "23/11/2026", minutes: 0 })).toThrow();
    expect(() => icsLocalTime({ date: "2026-11-23", minutes: -1 })).toThrow();
    expect(() => icsLocalTime({ date: "2026-11-23", minutes: 24 * 60 + 1 })).toThrow();
    expect(() => icsLocalTime({ date: "2026-11-23", minutes: 1.5 })).toThrow();
  });

  it("writes the stamp in UTC", () => {
    expect(icsStamp(new Date(Date.UTC(2026, 10, 20, 14, 30, 5)))).toBe("20261120T143005Z");
  });
});

describe("icsCalendar", () => {
  const cal = icsCalendar({ prodId: "-//the App//Plan visits//EN", name: "Visits", stamp: new Date(Date.UTC(2026, 10, 20)), events: [EVENT] });

  it("ends every line with CRLF and holds one event", () => {
    expect(cal.endsWith("\r\n")).toBe(true);
    expect(cal.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    const lines = unfoldLines(cal);
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines.at(-1)).toBe("END:VCALENDAR");
    expect(lines.filter((l) => l === "BEGIN:VEVENT")).toHaveLength(1);
  });

  it("writes the event's fields, escaped", () => {
    const lines = unfoldLines(cal);
    expect(lines).toContain("VERSION:2.0");
    expect(lines).toContain("PRODID:-//the App//Plan visits//EN");
    expect(lines).toContain("X-WR-CALNAME:Visits");
    expect(lines).toContain("UID:p1-20261123@plan-visits");
    expect(lines).toContain("DTSTAMP:20261120T000000Z");
    expect(lines).toContain("DTSTART:20261123T090000");
    expect(lines).toContain("DTEND:20261123T093000");
    expect(lines).toContain("SUMMARY:Café\\, bar\\; and \\\\ more");
    expect(lines).toContain("LOCATION:12 King St W\\, Toronto");
    expect(lines).toContain("DESCRIPTION:Line one\\nLine two");
  });

  it("leaves out an empty location, description and name", () => {
    const bare = unfoldLines(
      icsCalendar({ prodId: "-//x//EN", name: "", stamp: new Date(0), events: [{ ...EVENT, location: undefined, description: "" }] }),
    );
    expect(bare.some((l) => l.startsWith("LOCATION:"))).toBe(false);
    expect(bare.some((l) => l.startsWith("DESCRIPTION:"))).toBe(false);
    expect(bare.some((l) => l.startsWith("X-WR-CALNAME:"))).toBe(false);
  });

  it("makes a calendar with no events when there is nothing to plan", () => {
    expect(unfoldLines(icsCalendar({ prodId: "-//x//EN", stamp: new Date(0), events: [] }))).toEqual([
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//x//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "END:VCALENDAR",
    ]);
  });

  it("folds long lines", () => {
    const long = icsCalendar({ prodId: "-//x//EN", stamp: new Date(0), events: [{ ...EVENT, description: "Élévateur, porte; ".repeat(20) }] });
    for (const l of long.split("\r\n")) expect(octets(l)).toBeLessThanOrEqual(75);
  });
});

describe("icsHref", () => {
  it("round-trips the text and refuses other links", () => {
    const text = "BEGIN:VCALENDAR\r\nSUMMARY:Café 100%\r\nEND:VCALENDAR\r\n";
    const href = icsHref(text);
    expect(href.startsWith("data:text/calendar;charset=utf-8,")).toBe(true);
    expect(decodeIcsHref(href)).toBe(text);
    expect(decodeIcsHref("data:text/plain;charset=utf-8,x")).toBeUndefined();
    expect(decodeIcsHref("data:text/calendar;charset=utf-8,%E0%A4%A")).toBeUndefined();
  });
});
