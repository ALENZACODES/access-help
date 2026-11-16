import { describe, expect, it } from "vitest";
import { DEFAULT_OPTIONS, boundsFromRecords, buildDayView, edgeProblems, emptyDayForm, formWithBounds, numberText, submitDayForm, toCoverageRecords, type DayForm } from "./mappingDayModel.js";
import { createSession } from "./docs-bridge.js";
import { sampleRecords } from "./testing.js";

const filled = (over: Partial<DayForm> = {}): DayForm => ({ ...emptyDayForm("2026-11-21"), name: "Main Street", south: "43.85", west: "-79.44", north: "43.86", east: "-79.42", ...over });
const fieldsOf = (form: DayForm) => {
  const r = submitDayForm(form);
  return r.ok ? [] : Object.keys(r.errors).sort();
};

describe("the empty form", () => {
  it("starts on today with 200 metre cells and nothing else filled in", () => {
    expect(emptyDayForm("2026-11-21")).toEqual({ name: "", date: "2026-11-21", south: "", west: "", north: "", east: "", cellMetres: "200", focus: [], notes: "" });
  });
});

describe("submitDayForm", () => {
  it("makes a session from a filled form", () => {
    const r = submitDayForm(filled({ focus: ["parking"], notes: "  hello " }));
    expect(r.ok && r.session).toMatchObject({ name: "Main Street", cellMetres: 200, focus: ["parking"], notes: "hello", bounds: { south: 43.85, west: -79.44, north: 43.86, east: -79.42 } });
  });
  it("reads a decimal comma in any edge", () => {
    const r = submitDayForm(filled({ south: "43,85", west: "-79,44" }));
    expect(r.ok && r.session.bounds.south).toBe(43.85);
    expect(r.ok && r.session.bounds.west).toBe(-79.44);
  });
  it("points at each edge that is not a number, once, and never reads it as zero", () => {
    const r = submitDayForm(filled({ south: "abc", east: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual(["east", "south"]);
      expect(r.errors.south).toHaveLength(1);
    }
  });
  it("reports a blank name and a bad date together", () => {
    expect(fieldsOf(filled({ name: " ", date: "2026-13-01" }))).toEqual(["date", "name"]);
  });
  it("refuses a cell size that is not a whole number on the list", () => {
    expect(fieldsOf(filled({ cellMetres: "abc" }))).toEqual(["cellMetres"]);
    expect(fieldsOf(filled({ cellMetres: "150" }))).toEqual(["cellMetres"]);
    expect(fieldsOf(filled({ cellMetres: "100.5" }))).toEqual(["cellMetres"]);
  });
  it("puts an area problem under south or east, as the session reports it", () => {
    expect(fieldsOf(filled({ south: "44", north: "43" }))).toEqual(["south"]);
    expect(fieldsOf(filled({ west: "-79.7", east: "-79.4" }))).toEqual(["east"]);
  });
  it("puts a too-big or too-small area under area", () => {
    expect(fieldsOf(filled({ south: "43.8599", north: "43.86", west: "-79.4400", east: "-79.4399" }))).toEqual(["area"]);
  });
});

describe("form helpers", () => {
  it("writes numbers with a comma in French and rounds to six places", () => {
    expect(numberText(43.8500004, "en")).toBe("43.85");
    expect(numberText(-79.4, "fr")).toBe("-79,4");
  });
  it("fills the four edges from bounds", () => {
    const f = formWithBounds(emptyDayForm("2026-11-21"), { south: 1.5, west: -2.25, north: 3, east: 4 }, "fr");
    expect([f.south, f.west, f.north, f.east]).toEqual(["1,5", "-2,25", "3", "4"]);
  });
  it("gets an area from saved observations, or null when there are none", () => {
    expect(boundsFromRecords([])).toBeNull();
    const b = boundsFromRecords(sampleRecords().slice(0, 2));
    expect(b?.south).toBeLessThan(Math.min(...sampleRecords().slice(0, 2).map((r) => r.lat)));
  });
  it("round-trips an area from observations into a form a session accepts", () => {
    const near = sampleRecords().slice(0, 2).map((r) => ({ ...r, lat: 43.85 + (r.id === "s2" ? 0.003 : 0), lon: -79.43 }));
    const b = boundsFromRecords(near);
    expect(b).not.toBeNull();
    const form = formWithBounds(filled(), b!, "fr");
    expect(submitDayForm(form).ok).toBe(true);
  });
  it("checks the edges alone and says nothing until all four are numbers", () => {
    expect(edgeProblems(filled({ south: "" }))).toEqual([]);
    expect(edgeProblems(filled({ south: "44", north: "43" })).map((i) => i.code)).toEqual(["south-not-below-north"]);
    expect(edgeProblems(filled())).toEqual([]);
  });
  it("maps saved places to coverage records without changing the status", () => {
    const rows = toCoverageRecords(sampleRecords());
    expect(rows.map((r) => r.wheelchair)).toEqual(sampleRecords().map((r) => r.wheelchair));
    expect(rows.find((r) => r.id === "s4")?.wheelchair).toBe("UNKNOWN");
  });
});

describe("buildDayView", () => {
  const session = (() => {
    const r = createSession({ name: "Sample", date: "2026-11-01", bounds: { south: 43.84, west: -79.44, north: 43.86, east: -79.42 }, cellMetres: 400 });
    if (!r.ok) throw new Error("session");
    return r.session;
  })();
  const records = sampleRecords();

  it("counts the records inside the area and lists the ones outside", () => {
    const v = buildDayView(session, records, DEFAULT_OPTIONS, "en", "2026-11-15");
    expect(v?.coverage.summary.records).toBe(3);
    expect(v?.coverage.summary.outside).toBe(2);
  });
  it("can count only records observed on or after the session date", () => {
    const v = buildDayView(session, records, { ...DEFAULT_OPTIONS, scope: "since-session-date" }, "en", "2026-11-15");
    expect(v?.coverage.summary.records).toBe(1);
  });
  it("lists cells to revisit in the order chosen", () => {
    const rows = buildDayView(session, records, DEFAULT_OPTIONS, "en", "2026-11-15");
    const nearest = buildDayView(session, records, { ...DEFAULT_OPTIONS, order: "nearest" }, "en", "2026-11-15");
    expect(rows?.route.order).toHaveLength(rows?.toRevisit.length ?? -1);
    expect(nearest?.route.order).toHaveLength(rows?.toRevisit.length ?? -1);
  });
  it("estimates no time without a pace, and a time from the person's own pace", () => {
    expect(buildDayView(session, records, DEFAULT_OPTIONS, "en", "2026-11-15")?.routeLines.at(-1)).toMatch(/^No time is estimated/);
    const paced = buildDayView(session, records, { ...DEFAULT_OPTIONS, metresPerMinute: "50", minutesPerCell: "5" }, "en", "2026-11-15");
    expect(paced?.routeLines.at(-1)).toMatch(/^At your pace/);
  });
  it("ignores a pace that is blank, zero, negative or not a number", () => {
    for (const bad of ["", "0", "-4", "fast"]) {
      const v = buildDayView(session, records, { ...DEFAULT_OPTIONS, metresPerMinute: bad, minutesPerCell: bad === "0" ? "" : bad }, "en", "2026-11-15");
      expect(v?.routeLines.at(-1), bad).toMatch(/^No time is estimated/);
    }
  });
  it("accepts a decimal comma in the pace", () => {
    const v = buildDayView(session, records, { ...DEFAULT_OPTIONS, metresPerMinute: "37,5", minutesPerCell: "2,5" }, "en", "2026-11-15");
    expect(v?.routeLines.at(-1)).toMatch(/^At your pace/);
  });
  it("makes four files and a debrief in the language asked", () => {
    const v = buildDayView(session, records, DEFAULT_OPTIONS, "fr", "2026-11-15");
    expect(v?.files).toHaveLength(4);
    expect(v?.debrief[0]?.title).toBe("Ce que vous avez consigné");
  });
  it("returns null when the saved area can no longer make a grid", () => {
    expect(buildDayView({ ...session, cellMetres: 77 as never }, records, DEFAULT_OPTIONS, "en", "2026-11-15")).toBeNull();
  });
  it("does not change the saved records", () => {
    const before = JSON.stringify(records);
    buildDayView(session, records, DEFAULT_OPTIONS, "en", "2026-11-15");
    expect(JSON.stringify(records)).toBe(before);
  });
});
