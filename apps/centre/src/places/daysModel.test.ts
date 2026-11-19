import { describe, expect, it } from "vitest";
import { buildDaysView, daysFile, shiftMonth, startMonth } from "./daysModel.js";
import { sampleRecords, SAMPLE_TODAY } from "./testing.js";
import type { PlaceRecord } from "./types.js";

const s1 = sampleRecords()[0]!;
const note = (over: Partial<PlaceRecord>): PlaceRecord => ({ ...s1, ...over });
const records: PlaceRecord[] = [
  note({ id: "a", observedOn: "2026-11-10" }),
  note({ id: "b", name: null, wheelchair: "UNKNOWN", lat: 43.86, licence: "ODbL-1.0", observedOn: "2026-11-10" }),
  note({ id: "c", name: "Sample Arena", wheelchair: "no", observedOn: "2026-11-12" }),
  note({ id: "d", name: "Sample Café", observedOn: "2026-10-30" }),
];
const NOV = { year: 2026, month: 11 };
const notes = { "2026-11-10": "windy" };

describe("startMonth", () => {
  it("opens on the month of the newest observation", () => expect(startMonth(records, SAMPLE_TODAY)).toEqual(NOV));
  it("opens on the month of today when there are no observations", () => expect(startMonth([], "2027-02-03")).toEqual({ year: 2027, month: 2 }));
});

describe("buildDaysView", () => {
  const view = buildDaysView(records, notes, NOV, null, "en");
  it("names the month and the weekdays", () => {
    expect(view.monthName).toBe("November 2026");
    expect(view.monthKey).toBe("2026-11");
    expect(view.weekdays).toHaveLength(7);
  });
  it("lays the month out in weeks of seven with every day once", () => {
    for (const week of view.weeks) expect(week).toHaveLength(7);
    expect(view.weeks.flat().filter((c) => c.day !== null)).toHaveLength(30);
  });
  it("marks the days that hold observations, with a spoken label and whether there is a note", () => {
    const cells = view.weeks.flat();
    expect(cells.find((c) => c.iso === "2026-11-10")).toMatchObject({ count: 2, label: "10, 2 observations", hasNote: true });
    expect(cells.find((c) => c.iso === "2026-11-12")).toMatchObject({ count: 1, label: "12, 1 observation", hasNote: false });
    expect(cells.find((c) => c.iso === "2026-11-11")).toMatchObject({ count: 0, label: "11" });
    expect(cells.filter((c) => c.count > 0)).toHaveLength(2);
  });
  it("lists the days of the month, newest first", () => {
    expect(view.monthDays.map((d) => [d.day, d.countText, d.hasNote])).toEqual([["2026-11-12", "1 observation", false], ["2026-11-10", "2 observations", true]]);
  });
  it("shows no day until one is chosen", () => expect(view.detail).toBeNull());
  it("sums all days, whatever month is on screen", () => {
    expect(view.totalsLines[0]).toBe("Days with observations: 3.");
    expect(buildDaysView(records, notes, { year: 2026, month: 10 }, null, "en").totalsLines[0]).toBe("Days with observations: 3.");
  });
  it("shows another month when asked", () => {
    const oct = buildDaysView(records, notes, { year: 2026, month: 10 }, null, "en");
    expect(oct.monthDays.map((d) => d.day)).toEqual(["2026-10-30"]);
    expect(buildDaysView(records, notes, { year: 2026, month: 9 }, null, "en").monthDays).toEqual([]);
  });
});

describe("a chosen day", () => {
  const view = buildDaysView(records, notes, NOV, "2026-11-10", "en");
  it("has a heading, the day's counts and its note", () => {
    expect(view.detail?.heading).toBe("Tuesday, 10 November 2026 (2026-11-10)");
    expect(view.detail?.statLines[0]).toBe("Observations: 2.");
    expect(view.detail?.statLines[1]).toBe("By status - yes: 1; limited: 0; no: 0; UNKNOWN: 1.");
    expect(view.detail?.note).toBe("windy");
  });
  it("lists the places with source, licence, date and tier", () => {
    expect(view.detail?.places.map((p) => p.id)).toEqual(["a", "b"]);
    expect(view.detail?.places[1]?.line).toBe("Status: UNKNOWN. Source: sample data for tests. Licence: ODbL-1.0. Seen on 2026-11-10. Tier: UNKNOWN.");
  });
  it("is null for a day with no observations", () => {
    expect(buildDaysView(records, notes, NOV, "2026-11-11", "en").detail).toBeNull();
  });
  it("writes French when asked", () => {
    const fr = buildDaysView(records, notes, NOV, "2026-11-10", "fr");
    expect(fr.monthName).toBe("novembre 2026");
    expect(fr.detail?.heading).toBe("mardi 10 novembre 2026 (2026-11-10)");
    expect(fr.detail?.places[0]?.line).toContain("Niveau : UNKNOWN.");
  });
});

describe("observations with a bad date", () => {
  it("are listed apart and placed on no day", () => {
    // The draft store never keeps a bad date, so this guards the screen against edited storage.
    const view = buildDaysView([...records, note({ id: "odd", observedOn: "soon" })], {}, NOV, null, "en");
    expect(view.undated.map((u) => u.id)).toEqual(["odd"]);
    expect(view.weeks.flat().reduce((n, c) => n + c.count, 0)).toBe(3);
  });
});

describe("shiftMonth", () => {
  it("moves across a year end", () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });
});

describe("daysFile", () => {
  const chosen = buildDaysView(records, notes, NOV, "2026-11-10", "en");
  const none = buildDaysView(records, notes, NOV, null, "en");
  it("makes a line per day whether or not a day is chosen, without any note", () => {
    const f = daysFile("days-csv", none, SAMPLE_TODAY, "en");
    expect(f?.filename).toBe("my-days-2026-11-15.csv");
    expect(f?.content.trimEnd().split("\r\n")).toHaveLength(4);
    expect(f?.content).not.toContain("windy");
  });
  it("makes the day page with the person's note", () => {
    const f = daysFile("day-text", chosen, SAMPLE_TODAY, "en");
    expect(f).toMatchObject({ filename: "my-day-2026-11-10.txt", mime: "text/plain" });
    expect(f?.content).toContain("My note for the day\nwindy");
  });
  it("makes the OpenStreetMap file for that day only, without the note and without an UNKNOWN tag", () => {
    const f = daysFile("day-osm", chosen, SAMPLE_TODAY, "en");
    expect(f?.filename).toBe("observations-2026-11-10.osc");
    expect(f?.content).not.toContain("windy");
    expect(f?.content).not.toContain("UNKNOWN");
    expect(f?.content.match(/<node /g)).toHaveLength(2);
  });
  it("makes no day file when no day is chosen", () => {
    expect(daysFile("day-text", none, SAMPLE_TODAY, "en")).toBeNull();
    expect(daysFile("day-osm", none, SAMPLE_TODAY, "en")).toBeNull();
  });
});
