import { describe, expect, it } from "vitest";
import {
  DEFAULT_GRID,
  GRID_CSV_COLUMNS,
  PAGE_SIZE,
  cellOf,
  csvWord,
  gridCsv,
  gridRows,
  matchesText,
  pageOf,
  parsePage,
  rowNewest,
  rowOf,
  shownCounts,
  unknownIn,
  type GridFilter,
  type GridRow,
} from "./answergrid";
import { exportNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import { readStreetFile, type StreetFile } from "./filestreets";
import type { Note } from "./model";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const NOTES: Note[] = [
  testNote("c1", "Café", [{ key: "elevator", value: "yes", on: "2026-01-05" }, { key: "automatic-door", value: "no", on: "2026-03-01" }], "1 King St W"),
  testNote("c2", "Café", [{ key: "elevator", value: "yes", source: "Visit", on: "2026-09-01" }], "1 King St W"),
  testNote("b1", "Bakery", [{ key: "elevator", value: "yes", on: "2026-02-01" }], "2 King St W"),
  testNote("b2", "Bakery", [{ key: "elevator", value: "no", source: "Visit", on: "2026-10-01" }], "2 King St W"),
  testNote("k1", "Kiosk", [], null),
  testNote("d1", "Dôme", [{ key: "step-free-entry", value: "yes", on: "2025-12-01" }], "3 Rue Saint-Denis"),
];

function read(notes: readonly Note[] = NOTES, l: "en" | "fr" = "en"): StreetFile {
  const r = readStreetFile(exportNotes(notes, "2026-11-01"), TODAY, l);
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const rows = (f: Partial<GridFilter> = {}, l: "en" | "fr" = "en"): GridRow[] => gridRows(read(NOTES, l), { ...DEFAULT_GRID, ...f }, l);
const names = (rs: readonly GridRow[]): string[] => rs.map((r) => r.place.name);
const place = (name: string) => {
  const p = read().places.find((x) => x.name === name);
  if (!p) throw new Error("no place");
  return p;
};

describe("cellOf and rowOf", () => {
  it("gives what the App shows, the newest day and the number of sources", () => {
    expect(cellOf(place("Café"), "elevator")).toEqual({ shown: "yes", newest: "2026-09-01", sources: 2 });
    expect(cellOf(place("Café"), "automatic-door")).toEqual({ shown: "no", newest: "2026-03-01", sources: 1 });
    expect(cellOf(place("Bakery"), "elevator")).toEqual({ shown: "differ", newest: "2026-10-01", sources: 2 });
    expect(cellOf(place("Kiosk"), "elevator")).toEqual({ shown: "unknown", newest: "", sources: 0 });
  });

  it("counts the details with no record and finds the newest record of the place", () => {
    expect(rowOf(place("Café")).unknown).toBe(2);
    expect(rowOf(place("Kiosk")).unknown).toBe(4);
    expect(rowNewest(rowOf(place("Bakery")))).toBe("2026-10-01");
    expect(rowNewest(rowOf(place("Kiosk")))).toBe("");
  });
});

describe("matchesText", () => {
  it("needs every word in the name or the address, ignoring case and accents", () => {
    expect(matchesText(place("Dôme"), "dome saint")).toBe(true);
    expect(matchesText(place("Café"), "KING cafe")).toBe(true);
    expect(matchesText(place("Café"), "king queen")).toBe(false);
    expect(matchesText(place("Kiosk"), "")).toBe(true);
    expect(matchesText(place("Kiosk"), "street")).toBe(false);
  });
});

describe("gridRows", () => {
  it("gives every place by name in the person's language", () => {
    expect(names(rows())).toEqual(["Bakery", "Café", "Dôme", "Kiosk"]);
    expect(names(rows({}, "fr"))).toEqual(["Bakery", "Café", "Dôme", "Kiosk"]);
  });

  it("narrows by name or address", () => {
    expect(names(rows({ text: "king" }))).toEqual(["Bakery", "Café"]);
  });

  it("narrows to places where a detail shows a given answer", () => {
    expect(names(rows({ key: "elevator", shown: "yes" }))).toEqual(["Café"]);
    expect(names(rows({ key: "elevator", shown: "differ" }))).toEqual(["Bakery"]);
    expect(names(rows({ key: "elevator", shown: "unknown" }))).toEqual(["Dôme", "Kiosk"]);
    expect(names(rows({ key: "elevator", shown: "no" }))).toEqual([]);
    // With no detail chosen, the answer chosen does not narrow anything.
    expect(rows({ key: "", shown: "no" })).toHaveLength(4);
  });

  it("narrows to places where any detail shown as a column shows the answer", () => {
    expect(names(rows({ key: "any", shown: "differ" }))).toEqual(["Bakery"]);
    expect(names(rows({ key: "any", shown: "no" }))).toEqual(["Café"]);
    expect(names(rows({ key: "any", shown: "no", columns: ["elevator"] }))).toEqual([]);
    expect(names(rows({ key: "any", shown: "yes", columns: ["step-free-entry"] }))).toEqual(["Dôme"]);
  });

  it("keeps only the places given, when asked", () => {
    const f = read();
    const ids = new Set(f.places.filter((p) => p.name === "Kiosk" || p.name === "Café").map((p) => p.id));
    expect(names(gridRows(f, DEFAULT_GRID, "en", ids))).toEqual(["Café", "Kiosk"]);
    expect(names(gridRows(f, { ...DEFAULT_GRID, text: "king" }, "en", ids))).toEqual(["Café"]);
    expect(gridRows(f, DEFAULT_GRID, "en", new Set())).toEqual([]);
  });

  it("orders by most details with no record, or by the newest record, ties by name", () => {
    expect(names(rows({ order: "unknown" }))).toEqual(["Kiosk", "Bakery", "Dôme", "Café"]);
    expect(names(rows({ order: "newest" }))).toEqual(["Bakery", "Café", "Dôme", "Kiosk"]);
  });

  it("does not change the file", () => {
    const f = read();
    const before = JSON.stringify(f);
    gridRows(f, { text: "king", key: "elevator", shown: "yes", order: "newest", columns: ["elevator"] }, "fr");
    expect(JSON.stringify(f)).toBe(before);
  });
});

describe("pageOf", () => {
  const many = (n: number): GridRow[] => {
    const f = read(Array.from({ length: n }, (_, i) => testNote(`p${i}`, `Place ${String(i).padStart(3, "0")}`, [], `${i + 1} A St`)));
    return gridRows(f, DEFAULT_GRID, "en");
  };

  it("gives one page of rows with their positions", () => {
    const p = pageOf(many(60), 2);
    expect([p.page, p.pages, p.first, p.last, p.total]).toEqual([2, 3, 26, 50, 60]);
    expect(p.rows[0]?.place.name).toBe("Place 025");
    expect(PAGE_SIZE).toBe(25);
  });

  it("keeps a page asked for within the range, and gives the last page's rows", () => {
    expect(pageOf(many(60), 9).page).toBe(3);
    expect([pageOf(many(60), 3).first, pageOf(many(60), 3).last]).toEqual([51, 60]);
    expect(pageOf(many(60), 0).page).toBe(1);
    expect(pageOf(many(60), Number.NaN).page).toBe(1);
  });

  it("has one empty page for no rows", () => {
    expect(pageOf([], 4)).toEqual({ page: 1, pages: 1, first: 0, last: 0, total: 0, rows: [] });
  });

  it("takes another page size", () => {
    expect(pageOf(many(5), 2, 2).rows.map((r) => r.place.name)).toEqual(["Place 002", "Place 003"]);
  });
});

describe("columns", () => {
  it("counts the details with no record among the details shown", () => {
    const cafe = rowOf(place("Café"));
    expect(unknownIn(cafe, FACT_KEYS)).toBe(2);
    expect(unknownIn(cafe, ["elevator", "automatic-door"])).toBe(0);
    expect(unknownIn(cafe, [])).toBe(0);
  });

  it("orders by details with no record among the columns shown", () => {
    expect(names(rows({ order: "unknown", columns: ["step-free-entry"] }))).toEqual(["Bakery", "Café", "Kiosk", "Dôme"]);
  });

  it("writes only the columns shown in the CSV, in the App's order", () => {
    const csv = gridCsv(rows({ text: "cafe" }), ["elevator", "step-free-entry"]);
    expect(csv.slice(1).trimEnd().split("\r\n")).toEqual([
      "place,address,unknown,step-free-entry,step-free-entry_newest,step-free-entry_sources,elevator,elevator_newest,elevator_sources",
      "Café,1 King St W,1,UNKNOWN,,0,yes,2026-09-01,2",
    ]);
  });
});

describe("parsePage", () => {
  it("takes a whole number from 1 to the number of pages, with spaces around", () => {
    expect(parsePage("2", 3)).toBe(2);
    expect(parsePage(" 3 ", 3)).toBe(3);
    expect(parsePage("1", 1)).toBe(1);
  });

  it("refuses anything else", () => {
    for (const s of ["", "0", "4", "-1", "1.5", "2a", "1e1", "two", "9999999"]) expect(parsePage(s, 3), s).toBeUndefined();
  });
});

describe("shownCounts", () => {
  it("counts how many rows show each answer for a detail", () => {
    expect(shownCounts(rows(), "elevator")).toEqual({ yes: 1, no: 0, unknown: 2, differ: 1 });
    expect(shownCounts([], "elevator")).toEqual({ yes: 0, no: 0, unknown: 0, differ: 0 });
  });
});

describe("gridCsv", () => {
  it("has a row for each place with the answer, newest day and sources of each detail, a BOM and CRLF", () => {
    const csv = gridCsv(rows({ text: "king" }));
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
    const lines = csv.slice(1).trimEnd().split("\r\n");
    expect(lines[0]).toBe([...GRID_CSV_COLUMNS, ...FACT_KEYS.flatMap((k) => [k, `${k}_newest`, `${k}_sources`])].join(","));
    expect(lines.slice(1)).toEqual([
      "Bakery,2 King St W,3,UNKNOWN,,0,UNKNOWN,,0,UNKNOWN,,0,differ,2026-10-01,2",
      "Café,1 King St W,2,UNKNOWN,,0,UNKNOWN,,0,no,2026-03-01,1,yes,2026-09-01,2",
    ]);
  });

  it("writes UNKNOWN in every language and guards cells a spreadsheet would read as a formula", () => {
    expect(csvWord("unknown")).toBe("UNKNOWN");
    expect(csvWord("differ")).toBe("differ");
    const f = read([testNote("x", "=Shop, Inc", [], "@1 A St")]);
    expect(gridCsv(gridRows(f, DEFAULT_GRID, "en")).split("\r\n")[1]?.startsWith(`"'=Shop, Inc",'@1 A St,4,`)).toBe(true);
  });

  it("has only the header for no rows", () => {
    expect(gridCsv([]).split("\r\n")).toHaveLength(2);
  });
});
