import { describe, expect, it } from "vitest";
import {
  AREA_CSV_COLUMNS,
  DEFAULT_AREA,
  areaCsv,
  areaOf,
  areaReport,
  countDetail,
  findArea,
  placeGaps,
  shareRecorded,
  type AreaOptions,
  type AreaReport,
} from "./areacover";
import { exportNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import { readStreetFile, type StreetFile } from "./filestreets";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function read(notes: Parameters<typeof exportNotes>[0], l: "en" | "fr" = "en"): StreetFile {
  const r = readStreetFile(exportNotes(notes, "2026-11-01"), TODAY, l);
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

/** Two places in M5V, one with reports that differ in M5C, one with no postal code and one with no address. */
const NOTES = [
  testNote("a", "Café A", [{ key: "elevator", value: "yes" }, { key: "step-free-entry", value: "yes" }], "10 King St W, Toronto ON M5V 1A1"),
  testNote("b", "Bakery", [], "20 King St W, Toronto ON M5V 2B2"),
  testNote("d1", "Diner", [{ key: "elevator", value: "yes" }], "30 Queen St E, Toronto ON M5C 1A1"),
  testNote("d2", "Diner", [{ key: "elevator", value: "no" }], "30 Queen St E, Toronto ON M5C 1A1"),
  testNote("s", "Shop", [{ key: "automatic-door", value: "no" }], "5 Rue Saint-Denis"),
  testNote("k", "Kiosk", [], null),
];

const report = (o: Partial<AreaOptions> = {}, l: "en" | "fr" = "en"): AreaReport => areaReport(read(NOTES, l), { ...DEFAULT_AREA, ...o }, l);
const rows = (r: AreaReport): Array<[string, string[], number]> => r.rows.map((a) => [a.key, a.places.map((p) => p.name), a.gaps]);

describe("areaOf", () => {
  const place = (address: string | null) => {
    const p = read([testNote("x", "X", [], address)]).places[0];
    if (!p) throw new Error("no place");
    return p;
  };

  it("reads the postal area from the address", () => {
    expect(areaOf(place("1 Main St, Toronto ON m5v 1a1"), "postal")).toEqual({ key: "M5V", label: "M5V" });
    expect(areaOf(place("1 Main St, Toronto ON M4C1A1"), "postal")).toEqual({ key: "M4C", label: "M4C" });
  });

  it("reads the street with the walking lists' rules", () => {
    const a = areaOf(place("12 King St W, Toronto ON M5V 1A1"), "street");
    const b = areaOf(place("40 King Street West"), "street");
    expect(a).toBeDefined();
    expect(a?.key).toBe(b?.key);
  });

  it("gives no area when the address holds none", () => {
    expect(areaOf(place("1 Main St"), "postal")).toBeUndefined();
    expect(areaOf(place(null), "postal")).toBeUndefined();
    expect(areaOf(place(null), "street")).toBeUndefined();
    expect(areaOf(place("Union Station"), "street")).toBeUndefined();
  });
});

describe("countDetail", () => {
  it("counts places answered, with reports that differ and with no record", () => {
    const f = read(NOTES);
    expect(countDetail(f.places, "elevator")).toEqual({ answered: 1, differ: 1, unknown: 3 });
    expect(countDetail(f.places, "automatic-door")).toEqual({ answered: 1, differ: 0, unknown: 4 });
    expect(countDetail([], "elevator")).toEqual({ answered: 0, differ: 0, unknown: 0 });
  });

  it("counts a No the same as a Yes: both are a record", () => {
    const f = read([testNote("n", "N", [{ key: "elevator", value: "no" }], "1 A St"), testNote("y", "Y", [{ key: "elevator", value: "yes" }], "2 A St")]);
    expect(countDetail(f.places, "elevator")).toEqual({ answered: 2, differ: 0, unknown: 0 });
  });
});

describe("areaReport", () => {
  it("groups by postal area, most gaps first, with the places with no area last", () => {
    const r = report();
    expect(rows(r)).toEqual([
      ["M5V", ["Bakery", "Café A"], 6],
      ["M5C", ["Diner"], 3],
      ["", ["Kiosk", "Shop"], 7],
    ]);
    expect(r.places).toBe(5);
    expect(r.gaps).toBe(16);
    expect(r.by).toBe("postal");
    expect(r.keys).toEqual(FACT_KEYS);
  });

  it("keeps each detail's counts for the area", () => {
    const m5c = report().rows[1];
    expect(m5c?.counts.elevator).toEqual({ answered: 0, differ: 1, unknown: 0 });
    expect(m5c?.counts["step-free-entry"]).toEqual({ answered: 0, differ: 0, unknown: 1 });
    const m5v = report().rows[0];
    expect(m5v?.counts["step-free-entry"]).toEqual({ answered: 1, differ: 0, unknown: 1 });
  });

  it("orders by name when asked, numbers in order", () => {
    expect(rows(report({ order: "name" })).map((r) => r[0])).toEqual(["M5C", "M5V", ""]);
    const f = read([testNote("a", "A", [], "1 A St, M9A 1A1"), testNote("b", "B", [], "1 B St, M1A 1A1"), testNote("c", "C", [], "1 C St, M2N 1A1")]);
    expect(areaReport(f, { ...DEFAULT_AREA, order: "name" }, "en").rows.map((r) => r.key)).toEqual(["M1A", "M2N", "M9A"]);
  });

  it("breaks ties on gaps by name", () => {
    const f = read([testNote("a", "A", [], "1 A St, M9A 1A1"), testNote("b", "B", [], "1 B St, M1A 1A1")]);
    expect(areaReport(f, DEFAULT_AREA, "en").rows.map((r) => r.key)).toEqual(["M1A", "M9A"]);
  });

  it("counts gaps only for the chosen details", () => {
    const r = report({ keys: ["elevator"] });
    expect(rows(r)).toEqual([
      ["M5V", ["Bakery", "Café A"], 1],
      ["M5C", ["Diner"], 0],
      ["", ["Kiosk", "Shop"], 2],
    ]);
    expect(r.gaps).toBe(3);
    // Every detail is still counted, so a table can show any of them.
    expect(r.rows[0]?.counts["accessible-washroom"]).toEqual({ answered: 0, differ: 0, unknown: 2 });
  });

  it("groups by street, reading the street name from the address", () => {
    const r = report({ by: "street" });
    expect(r.rows.map((a) => [a.places.map((p) => p.name), a.gaps])).toEqual([
      [["Bakery", "Café A"], 6],
      // Two streets with as many gaps come by name.
      [["Diner"], 3],
      [["Shop"], 3],
      [["Kiosk"], 4],
    ]);
    expect(r.rows.at(-1)?.key).toBe("");
    expect(r.rows[0]?.label).toMatch(/King/);
    expect(r.rows[1]?.label).toMatch(/Queen/);
    expect(r.rows[2]?.label).toMatch(/Saint-Denis/);
  });

  it("has no group for places with no area when every place has one", () => {
    const r = areaReport(read(NOTES.slice(0, 4)), DEFAULT_AREA, "en");
    expect(r.rows.map((a) => a.key)).toEqual(["M5V", "M5C"]);
  });

  it("gives an empty report for an empty choice of places", () => {
    const f = read([testNote("k", "Kiosk", [], null)]);
    const r = areaReport(f, DEFAULT_AREA, "en");
    expect(rows(r)).toEqual([["", ["Kiosk"], 4]]);
  });

  it("orders places within an area in the person's language", () => {
    const f = read([testNote("e", "Éclair", [], "1 A St, M5V 1A1"), testNote("z", "Zebra", [], "2 A St, M5V 1A1"), testNote("d", "Dôme", [], "3 A St, M5V 1A1")], "fr");
    expect(areaReport(f, DEFAULT_AREA, "fr").rows[0]?.places.map((p) => p.name)).toEqual(["Dôme", "Éclair", "Zebra"]);
  });

  it("does not change the file", () => {
    const f = read(NOTES);
    const before = JSON.stringify(f);
    areaReport(f, { by: "street", keys: ["elevator"], order: "name", hideFull: true }, "en");
    expect(JSON.stringify(f)).toBe(before);
  });
});

describe("leaving out areas with nothing missing", () => {
  const full = [
    testNote("f1", "Full One", FACT_KEYS.map((key) => ({ key, value: "yes" as const })), "1 Bay St, M5J 1A1"),
    testNote("f2", "Full Two", FACT_KEYS.map((key) => ({ key, value: "no" as const })), "2 Bay St, M5J 1A1"),
    testNote("e", "Elevator Only", [{ key: "elevator", value: "yes" }], "1 Elm St, M4W 1A1"),
    testNote("n", "Nowhere", FACT_KEYS.map((key) => ({ key, value: "yes" as const })), null),
  ];

  it("leaves out areas where every chosen detail has a record, and says how many", () => {
    const r = areaReport(read(full), { ...DEFAULT_AREA, hideFull: true }, "en");
    expect(rows(r)).toEqual([
      ["M4W", ["Elevator Only"], 3],
      ["", ["Nowhere"], 0],
    ]);
    expect(r.hidden).toBe(1);
    expect(r.places).toBe(4);
    expect(r.gaps).toBe(3);
  });

  it("keeps every area when not asked, with the same total", () => {
    const r = areaReport(read(full), DEFAULT_AREA, "en");
    expect(r.rows.map((a) => a.key)).toEqual(["M4W", "M5J", ""]);
    expect(r.hidden).toBe(0);
    expect(r.gaps).toBe(3);
  });

  it("judges an area by the chosen details only", () => {
    const r = areaReport(read(full), { ...DEFAULT_AREA, keys: ["elevator"], hideFull: true }, "en");
    expect(r.rows.map((a) => a.key)).toEqual([""]);
    expect(r.hidden).toBe(2);
    expect(r.gaps).toBe(0);
  });

  it("counts reports that differ as a record, so an area with only those is left out", () => {
    const f = read([testNote("a", "A", [{ key: "elevator", value: "yes" }], "1 A St, M1A 1A1"), testNote("b", "A", [{ key: "elevator", value: "no" }], "1 A St, M1A 1A1")]);
    expect(areaReport(f, { ...DEFAULT_AREA, keys: ["elevator"], hideFull: true }, "en").hidden).toBe(1);
  });
});

describe("placeGaps", () => {
  it("gives each place's chosen details with no record and whose reports differ, in the App's order", () => {
    const r = report();
    const m5v = findArea(r, "M5V");
    if (!m5v) throw new Error("no area");
    expect(placeGaps(m5v, ["elevator", "accessible-washroom"]).map((g) => [g.place.name, g.missing, g.differ])).toEqual([
      ["Bakery", ["accessible-washroom", "elevator"], []],
      ["Café A", ["accessible-washroom"], []],
    ]);
    const m5c = findArea(r, "M5C");
    if (!m5c) throw new Error("no area");
    expect(placeGaps(m5c, FACT_KEYS).map((g) => [g.missing, g.differ])).toEqual([[["step-free-entry", "accessible-washroom", "automatic-door"], ["elevator"]]]);
  });

  it("gives nothing missing when no detail is chosen", () => {
    const a = findArea(report(), "");
    if (!a) throw new Error("no group");
    expect(placeGaps(a, []).every((g) => g.missing.length === 0 && g.differ.length === 0)).toBe(true);
  });
});

describe("findArea", () => {
  it("finds an area by key, including the group with no area", () => {
    const r = report();
    expect(findArea(r, "M5C")?.places.map((p) => p.name)).toEqual(["Diner"]);
    expect(findArea(r, "")?.places.map((p) => p.name)).toEqual(["Kiosk", "Shop"]);
    expect(findArea(r, "M9Z")).toBeUndefined();
    expect(findArea(report({ by: "street" }), "M5C")).toBeUndefined();
  });
});

describe("shareRecorded", () => {
  it("is the share of places with a record, including reports that differ", () => {
    expect(shareRecorded({ answered: 1, differ: 1, unknown: 2 })).toBe(0.5);
    expect(shareRecorded({ answered: 0, differ: 0, unknown: 3 })).toBe(0);
    expect(shareRecorded({ answered: 0, differ: 0, unknown: 0 })).toBe(0);
  });
});

describe("areaCsv", () => {
  it("has a column for each count of each chosen detail, BOM and CRLF", () => {
    const csv = areaCsv(report({ keys: ["elevator", "automatic-door"] }), "No area in the address");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
    const lines = csv.slice(1).trimEnd().split("\r\n");
    expect(lines[0]).toBe([...AREA_CSV_COLUMNS, "elevator_answered", "elevator_differ", "elevator_unknown", "automatic-door_answered", "automatic-door_differ", "automatic-door_unknown"].join(","));
    expect(lines.slice(1)).toEqual(["M5V,2,3,1,0,1,0,0,2", "M5C,1,1,0,1,0,0,0,1", "No area in the address,2,3,0,0,2,1,0,1"]);
  });

  it("guards and quotes cells that a spreadsheet would read as a formula or split", () => {
    const csv = areaCsv(report({ keys: ["elevator"] }), "=No, area");
    expect(csv).toContain(`"'=No, area",2,2,0,0,2`);
  });
});
