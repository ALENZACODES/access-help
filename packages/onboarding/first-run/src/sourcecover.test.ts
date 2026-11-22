import { describe, expect, it } from "vitest";
import { exportNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import { readStreetFile, type StreetFile } from "./filestreets";
import type { Note } from "./model";
import {
  DEFAULT_SOURCES,
  SOURCE_CSV_COLUMNS,
  aloneAnswers,
  newestFrom,
  placesOfAnswers,
  sourceCsv,
  sourceOverlap,
  sourceReport,
  sourcesOf,
  type SourceOptions,
  type SourceReport,
} from "./sourcecover";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 21));

/**
 * Café: elevator from the city (Yes) and a contributor (Yes, newer); door from the city alone.
 * Bakery: elevator from the city (Yes) and a visit (No, newer): reports differ.
 * Kiosk: step-free entrance from a visit alone, under another licence. Shop: nothing.
 */
const NOTES: Note[] = [
  testNote("c1", "Café", [{ key: "elevator", value: "yes", on: "2026-01-05" }, { key: "automatic-door", value: "no", on: "2026-01-05" }], "1 A St"),
  testNote("c2", "Café", [{ key: "elevator", value: "yes", source: "Contributor report", on: "2026-09-01" }], "1 A St"),
  testNote("b1", "Bakery", [{ key: "elevator", value: "yes", on: "2026-02-01" }], "2 A St"),
  testNote("b2", "Bakery", [{ key: "elevator", value: "no", source: "Visit", on: "2026-10-01" }], "2 A St"),
  testNote("k1", "Kiosk", [{ key: "step-free-entry", value: "yes", source: "Visit", licence: "CC-BY-4.0", on: "2026-08-15" }], null),
  testNote("s1", "Shop", [], "3 A St"),
];

function read(notes: readonly Note[] = NOTES, l: "en" | "fr" = "en"): StreetFile {
  const r = readStreetFile(exportNotes(notes, "2026-11-01"), TODAY, l);
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const report = (o: Partial<SourceOptions> = {}, l: "en" | "fr" = "en"): SourceReport => sourceReport(read(NOTES, l), { ...DEFAULT_SOURCES, ...o }, l);
const row = (r: SourceReport, source: string) => {
  const x = r.rows.find((s) => s.source === source);
  if (!x) throw new Error(`no source ${source}`);
  return x;
};
const place = (name: string) => {
  const p = read().places.find((x) => x.name === name);
  if (!p) throw new Error("no place");
  return p;
};

describe("sourcesOf", () => {
  it("gives the sources of every Yes or No for a place and detail", () => {
    expect(sourcesOf(place("Café"), "elevator").sort()).toEqual(["City survey", "Contributor report"]);
    expect(sourcesOf(place("Café"), "automatic-door")).toEqual(["City survey"]);
    expect(sourcesOf(place("Bakery"), "elevator").sort()).toEqual(["City survey", "Visit"]);
    expect(sourcesOf(place("Shop"), "elevator")).toEqual([]);
  });
});

describe("sourceReport", () => {
  it("counts each source's records, places, days and licences", () => {
    const r = report();
    expect(r.rows.map((s) => s.source)).toEqual(["City survey", "Visit", "Contributor report"]);
    const city = row(r, "City survey");
    expect([city.records, city.places, city.first, city.last, city.licences]).toEqual([3, 2, "2026-01-05", "2026-02-01", ["CC0-1.0"]]);
    const visit = row(r, "Visit");
    expect([visit.records, visit.places, visit.first, visit.last, visit.licences]).toEqual([2, 2, "2026-08-15", "2026-10-01", ["CC-BY-4.0", "CC0-1.0"]]);
  });

  it("counts the answers shown from each source: its record is the newest", () => {
    const r = report();
    expect([row(r, "City survey").shown, row(r, "Contributor report").shown, row(r, "Visit").shown]).toEqual([1, 1, 2]);
  });

  it("counts the answers that rest on one source alone, including reports that differ from one source only", () => {
    const r = report();
    expect([row(r, "City survey").alone, row(r, "Contributor report").alone, row(r, "Visit").alone]).toEqual([1, 0, 1]);
    expect([r.answers, r.alone, r.several]).toEqual([4, 2, 2]);
  });

  it("keeps the counts for each detail", () => {
    const city = row(report(), "City survey");
    expect(city.byKey.elevator).toEqual({ records: 2, alone: 0 });
    expect(city.byKey["automatic-door"]).toEqual({ records: 1, alone: 1 });
    expect(city.byKey["accessible-washroom"]).toEqual({ records: 0, alone: 0 });
  });

  it("counts only the chosen details, leaving out sources with no record for them", () => {
    const r = report({ keys: ["step-free-entry"] });
    expect(r.rows.map((s) => s.source)).toEqual(["Visit"]);
    expect([r.answers, r.alone]).toEqual([1, 1]);
    expect(report({ keys: ["accessible-washroom"] }).rows).toEqual([]);
  });

  it("orders by answers resting on the source alone, or by name, ties by name", () => {
    expect(report({ order: "alone" }).rows.map((s) => s.source)).toEqual(["City survey", "Visit", "Contributor report"]);
    expect(report({ order: "name" }).rows.map((s) => s.source)).toEqual(["City survey", "Contributor report", "Visit"]);
  });

  it("gives one day when a source recorded on one day only", () => {
    const c = row(report(), "Contributor report");
    expect([c.first, c.last]).toEqual(["2026-09-01", "2026-09-01"]);
  });

  it("finds nothing in a file with no Yes or No", () => {
    const r = sourceReport(read([testNote("x", "X", [], "1 B St")]), DEFAULT_SOURCES, "en");
    expect(r).toEqual({ keys: FACT_KEYS, rows: [], answers: 0, alone: 0, several: 0 });
  });

  it("does not change the file", () => {
    const f = read();
    const before = JSON.stringify(f);
    sourceReport(f, { keys: ["elevator"], order: "name" }, "fr");
    expect(JSON.stringify(f)).toBe(before);
  });
});

describe("aloneAnswers", () => {
  it("lists the answers that rest on a source alone, by place, with their answer", () => {
    const f = read();
    expect(aloneAnswers(f, "City survey", FACT_KEYS, "en").map((a) => [a.place.name, a.key, a.value])).toEqual([["Café", "automatic-door", "no"]]);
    expect(aloneAnswers(f, "Visit", FACT_KEYS, "en").map((a) => [a.place.name, a.key, a.value])).toEqual([["Kiosk", "step-free-entry", "yes"]]);
    expect(aloneAnswers(f, "Contributor report", FACT_KEYS, "en")).toEqual([]);
  });

  it("names reports that differ when they all come from one source", () => {
    const f = read([testNote("p1", "Pool", [{ key: "elevator", value: "yes", on: "2026-01-01" }], "9 C St"), testNote("p2", "Pool", [{ key: "elevator", value: "no", on: "2026-02-01" }], "9 C St")]);
    expect(aloneAnswers(f, "City survey", FACT_KEYS, "en").map((a) => a.value)).toEqual(["differ"]);
  });

  it("keeps to the chosen details, and orders places in the person's language and details in the App's order", () => {
    const f = read(
      [
        testNote("e", "Éclair", [{ key: "elevator", value: "yes" }, { key: "step-free-entry", value: "no" }], "1 D St"),
        testNote("z", "Zebra", [{ key: "elevator", value: "no" }], "2 D St"),
        testNote("d", "Dôme", [{ key: "automatic-door", value: "yes" }], "3 D St"),
      ],
      "fr",
    );
    expect(aloneAnswers(f, "City survey", FACT_KEYS, "fr").map((a) => [a.place.name, a.key])).toEqual([
      ["Dôme", "automatic-door"],
      ["Éclair", "step-free-entry"],
      ["Éclair", "elevator"],
      ["Zebra", "elevator"],
    ]);
    expect(aloneAnswers(f, "City survey", ["elevator"], "fr").map((a) => a.place.name)).toEqual(["Éclair", "Zebra"]);
    expect(placesOfAnswers(aloneAnswers(f, "City survey", FACT_KEYS, "fr")).map((p) => p.name)).toEqual(["Dôme", "Éclair", "Zebra"]);
  });
});

describe("newestFrom and sourceOverlap", () => {
  it("gives a source's newest answer for a place and detail", () => {
    const f = read([testNote("p1", "Pool", [{ key: "elevator", value: "yes", on: "2026-01-01" }], "9 C St"), testNote("p2", "Pool", [{ key: "elevator", value: "no", on: "2026-05-01" }], "9 C St")]);
    const pool = f.places[0];
    if (!pool) throw new Error("no place");
    expect(newestFrom(pool, "elevator", "City survey")).toBe("no");
    expect(newestFrom(pool, "elevator", "Visit")).toBeUndefined();
    expect(newestFrom(pool, "automatic-door", "City survey")).toBeUndefined();
  });

  it("counts the details both sources answer, and lists where their newest answers differ", () => {
    const o = sourceOverlap(read(), "City survey", "Visit", FACT_KEYS, "en");
    expect([o.both, o.same]).toEqual([1, 0]);
    expect(o.differ.map((d) => [d.place.name, d.key, d.a, d.b])).toEqual([["Bakery", "elevator", "yes", "no"]]);
    const agree = sourceOverlap(read(), "City survey", "Contributor report", FACT_KEYS, "en");
    expect([agree.both, agree.same, agree.differ.length]).toEqual([1, 1, 0]);
  });

  it("counts nothing for sources that answer no detail in common, or for details not chosen", () => {
    expect(sourceOverlap(read(), "Visit", "Contributor report", FACT_KEYS, "en")).toEqual({ both: 0, same: 0, differ: [] });
    expect(sourceOverlap(read(), "City survey", "Visit", ["automatic-door"], "en").both).toBe(0);
  });

  it("orders the differences by place in the person's language, then in the App's detail order", () => {
    const two = (id: string, name: string, key: "elevator" | "automatic-door", address: string) => [
      testNote(`${id}a`, name, [{ key, value: "yes" }], address),
      testNote(`${id}b`, name, [{ key, value: "no", source: "Visit" }], address),
    ];
    const f = read([...two("z", "Zebra", "elevator", "1 E St"), ...two("e", "Éclair", "elevator", "2 E St"), ...two("e2", "Éclair", "automatic-door", "2 E St")], "fr");
    expect(sourceOverlap(f, "City survey", "Visit", FACT_KEYS, "fr").differ.map((d) => [d.place.name, d.key])).toEqual([
      ["Éclair", "automatic-door"],
      ["Éclair", "elevator"],
      ["Zebra", "elevator"],
    ]);
  });
});

describe("sourceCsv", () => {
  it("has a row for each source with a records and an alone column for each chosen detail, a BOM and CRLF", () => {
    const csv = sourceCsv(report({ keys: ["elevator", "automatic-door"] }));
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv.slice(1).trimEnd().split("\r\n")).toEqual([
      [...SOURCE_CSV_COLUMNS, "elevator_records", "elevator_alone", "automatic-door_records", "automatic-door_alone"].join(","),
      "City survey,3,2,1,1,2026-01-05,2026-02-01,CC0-1.0,2,0,1,1",
      "Contributor report,1,1,1,0,2026-09-01,2026-09-01,CC0-1.0,1,0,0,0",
      "Visit,1,1,1,0,2026-10-01,2026-10-01,CC0-1.0,1,0,0,0",
    ]);
  });

  it("guards and quotes a source name a spreadsheet would read as a formula or split", () => {
    const f = read([testNote("x", "X", [{ key: "elevator", value: "yes", source: "=City, survey" }], "1 B St")]);
    expect(sourceCsv(sourceReport(f, DEFAULT_SOURCES, "en"))).toContain(`\r\n"'=City, survey",1,1,1,1,`);
  });
});
