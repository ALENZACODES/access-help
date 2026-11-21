import { describe, expect, it } from "vitest";
import {
  BACKINGS,
  DIFFER_CSV_COLUMNS,
  SINGLE_CSV_COLUMNS,
  SINGLE_MODES,
  backedDetails,
  chosenKeys,
  differCsv,
  differNotesFile,
  differPlaces,
  fileSingle,
  hasDifferences,
  isListed,
  isSingleMode,
  placesSingle,
  singleCsv,
  singleNotesFile,
  sourcePairs,
  type BackedDetail,
} from "./corroboration";
import { exportNotes, importNotes } from "./exchange";
import { readStreetFile, type StreetFile } from "./filestreets";
import type { Note } from "./model";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const BOM = String.fromCharCode(0xfeff);

function fileOf(list: Note[]): StreetFile {
  const r = readStreetFile(exportNotes(list, "2026-11-01"), TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const place = (f: StreetFile, name: string) => {
  const p = f.places.find((x) => x.name === name);
  if (!p) throw new Error(name);
  return p;
};

/**
 * Library: elevator from City survey only (one report); washroom from City survey twice (one source);
 *   door from City survey and Visit, both yes (several sources).
 * Bank: elevator yes from City survey and no from Visit (differ); step-free from Visit only.
 * Cart: nothing.
 */
function notes(): Note[] {
  return [
    testNote("a1", "Library", [
      { key: "elevator", value: "yes", on: "2026-01-10" },
      { key: "accessible-washroom", value: "yes", on: "2025-05-01" },
      { key: "automatic-door", value: "yes", on: "2026-02-02" },
    ], "100 King St W"),
    testNote("a2", "Library", [
      { key: "accessible-washroom", value: "yes", on: "2026-03-01" },
      { key: "automatic-door", value: "yes", on: "2026-04-04", source: "Visit" },
    ], "100 King St W"),
    testNote("b1", "Bank", [{ key: "elevator", value: "yes" }], "40 Queen St E"),
    testNote("b2", "Bank", [
      { key: "elevator", value: "no", source: "Visit" },
      { key: "step-free-entry", value: "yes", source: "Visit" },
    ], "40 Queen St E"),
    testNote("c", "Cart", [], null),
  ];
}

describe("modes", () => {
  it("knows its modes and backings", () => {
    expect(SINGLE_MODES).toEqual(["report", "source"]);
    expect(BACKINGS).toEqual(["one-report", "one-source", "several"]);
    expect(isSingleMode("source")).toBe(true);
    expect(isSingleMode("all")).toBe(false);
  });

  it("lists one report in both modes, one source only in the source mode, and several sources in neither", () => {
    const d = (backing: BackedDetail["backing"]): BackedDetail => ({ key: "elevator", value: "yes", reports: 1, sources: ["a"], newest: "2026-01-01", backing });
    expect(SINGLE_MODES.map((m) => isListed(d("one-report"), m))).toEqual([true, true]);
    expect(SINGLE_MODES.map((m) => isListed(d("one-source"), m))).toEqual([false, true]);
    expect(SINGLE_MODES.map((m) => isListed(d("several"), m))).toEqual([false, false]);
  });
});

describe("how a place's details are backed", () => {
  it("dates each agreed detail by its newest record and names its sources in order", () => {
    expect(backedDetails(place(fileOf(notes()), "Library"))).toEqual([
      { key: "accessible-washroom", value: "yes", reports: 2, sources: ["City survey"], newest: "2026-03-01", backing: "one-source" },
      { key: "automatic-door", value: "yes", reports: 2, sources: ["City survey", "Visit"], newest: "2026-04-04", backing: "several" },
      { key: "elevator", value: "yes", reports: 1, sources: ["City survey"], newest: "2026-01-10", backing: "one-report" },
    ]);
  });

  it("leaves out details whose reports differ and details with no record", () => {
    expect(backedDetails(place(fileOf(notes()), "Bank")).map((d) => d.key)).toEqual(["step-free-entry"]);
    expect(backedDetails(place(fileOf(notes()), "Cart"))).toEqual([]);
  });
});

describe("the report", () => {
  it("counts every agreed detail by its backing and the details that differ", () => {
    const r = fileSingle(fileOf(notes()), "report", "");
    expect(r.counts).toEqual({ "one-report": 2, "one-source": 1, several: 1 });
    expect(r.differ).toBe(1);
    expect(r.places).toBe(3);
  });

  it("lists places by name with only the details of the mode", () => {
    const one = fileSingle(fileOf(notes()), "report", "");
    expect(one.list.map((p) => [p.place.name, p.details.map((d) => d.key)])).toEqual([
      ["Bank", ["step-free-entry"]],
      ["Library", ["elevator"]],
    ]);
    const source = fileSingle(fileOf(notes()), "source", "");
    expect(source.list.map((p) => [p.place.name, p.details.map((d) => d.key)])).toEqual([
      ["Bank", ["step-free-entry"]],
      ["Library", ["accessible-washroom", "elevator"]],
    ]);
  });

  it("gives each source the details only it backs and the details it reports, the most alone first", () => {
    expect(fileSingle(fileOf(notes()), "report", "").bySource).toEqual([
      { source: "City survey", alone: 2, reports: 4 },
      { source: "Visit", alone: 1, reports: 3 },
    ]);
  });

  it("keeps only places whose address holds the area text", () => {
    const r = fileSingle(fileOf(notes()), "report", "queen");
    expect(r.places).toBe(1);
    expect(r.list.map((p) => p.place.name)).toEqual(["Bank"]);
    expect(fileSingle(fileOf(notes()), "report", "nowhere").places).toBe(0);
  });
});

describe("pairs of sources", () => {
  it("counts the details both report and whether their newest records say the same", () => {
    const [pair, ...rest] = sourcePairs(fileOf(notes()).places);
    expect(rest).toEqual([]);
    expect(pair).toMatchObject({ a: "City survey", b: "Visit", both: 2, same: 1, different: 1 });
    expect(pair?.differences.map((d) => [d.place.name, d.key, d.a, d.b])).toEqual([["Bank", "elevator", { value: "yes", on: "2026-10-01" }, { value: "no", on: "2026-10-01" }]]);
  });

  it("compares each source's newest record, so a source that changed its answer counts as its latest", () => {
    const pairs = sourcePairs(
      fileOf([
        testNote("x1", "Kiosk", [{ key: "elevator", value: "no", on: "2025-01-01" }], "1 Elm St"),
        testNote("x2", "Kiosk", [{ key: "elevator", value: "yes", on: "2026-01-01" }], "1 Elm St"),
        testNote("x3", "Kiosk", [{ key: "elevator", value: "yes", on: "2026-02-01", source: "Visit" }], "1 Elm St"),
      ]).places,
    );
    expect(pairs).toEqual([{ a: "City survey", b: "Visit", both: 1, same: 1, different: 0, differences: [] }]);
  });

  it("orders three sources' pairs by details both report, then by name, and has none with one source", () => {
    const three = sourcePairs(
      fileOf([
        testNote("p1", "A", [{ key: "elevator", value: "yes", source: "Zeta" }, { key: "automatic-door", value: "yes", source: "Zeta" }], "1 Elm St"),
        testNote("p2", "A", [{ key: "elevator", value: "yes", source: "Alpha" }, { key: "automatic-door", value: "no", source: "Alpha" }], "1 Elm St"),
        testNote("p3", "A", [{ key: "elevator", value: "no", source: "Mid" }], "1 Elm St"),
      ]).places,
    );
    expect(three.map((p) => [p.a, p.b, p.both, p.same])).toEqual([
      ["Alpha", "Zeta", 2, 1],
      ["Alpha", "Mid", 1, 0],
      ["Mid", "Zeta", 1, 0],
    ]);
    expect(sourcePairs(fileOf([testNote("s", "Solo", [{ key: "elevator", value: "yes" }], "1 Elm St")]).places)).toEqual([]);
  });
});

describe("downloads", () => {
  it("lists each detail as a guarded CSV row, sources joined", () => {
    const csv = singleCsv(fileSingle(fileOf(notes()), "source", ""));
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv.slice(1).trimEnd().split("\r\n")).toEqual([
      SINGLE_CSV_COLUMNS.join(","),
      "Bank,40 Queen St E,step-free-entry,yes,1,Visit,2026-10-01",
      "Library,100 King St W,accessible-washroom,yes,2,City survey,2026-03-01",
      "Library,100 King St W,elevator,yes,1,City survey,2026-01-10",
    ]);
    const guarded = singleCsv(placesSingle(fileOf([testNote("g", "+Shop", [{ key: "elevator", value: "no", source: "=SRC" }], "1 Elm St")]).places, "report"));
    expect(guarded.split("\r\n")[1]).toBe("'+Shop,1 Elm St,elevator,no,1,'=SRC,2026-10-01");
  });

  it("gives the notes of the places listed, every note of each place, as a file the App reads back", () => {
    const back = importNotes(singleNotesFile(fileSingle(fileOf(notes()), "report", ""), TODAY));
    expect(back.error).toBeUndefined();
    expect(back.notes.map((n) => n.id).sort()).toEqual(["a1", "a2", "b1", "b2"]);
  });
});

describe("choosing the details", () => {
  it("keeps the App's order, and every detail when none is given", () => {
    expect(chosenKeys(undefined)).toEqual(["step-free-entry", "accessible-washroom", "automatic-door", "elevator"]);
    expect(chosenKeys(["elevator", "step-free-entry"])).toEqual(["step-free-entry", "elevator"]);
  });

  it("counts, lists and pairs only the details chosen", () => {
    const r = fileSingle(fileOf(notes()), "source", "", ["elevator"]);
    expect(r.keys).toEqual(["elevator"]);
    expect(r.counts).toEqual({ "one-report": 1, "one-source": 0, several: 0 });
    expect(r.differ).toBe(1);
    expect(r.list.map((p) => [p.place.name, p.details.map((d) => d.key)])).toEqual([["Library", ["elevator"]]]);
    expect(r.bySource).toEqual([
      { source: "City survey", alone: 1, reports: 2 },
      { source: "Visit", alone: 0, reports: 1 },
    ]);
    expect(r.pairs.map((p) => [p.both, p.different])).toEqual([[1, 1]]);
    expect(fileSingle(fileOf(notes()), "source", "", ["automatic-door"]).pairs.map((p) => [p.both, p.same])).toEqual([[1, 1]]);
  });
});

describe("where two sources differ", () => {
  it("lists every detail they differ on, by place name then detail order, with each one's newest answer and date", () => {
    const f = fileOf([
      testNote("z1", "Zoo", [{ key: "elevator", value: "yes", on: "2026-01-01" }, { key: "step-free-entry", value: "no", on: "2026-01-02" }], "9 Elm St"),
      testNote("z2", "Zoo", [{ key: "elevator", value: "no", on: "2026-03-03", source: "Visit" }, { key: "step-free-entry", value: "yes", on: "2026-03-04", source: "Visit" }], "9 Elm St"),
      testNote("a1", "Arena", [{ key: "elevator", value: "no", on: "2025-01-01" }], "1 Elm St"),
      testNote("a2", "Arena", [{ key: "elevator", value: "yes", on: "2026-06-06", source: "Visit" }], "1 Elm St"),
    ]);
    const [pair] = sourcePairs(f.places);
    expect(pair?.differences.map((d) => [d.place.name, d.key, d.a.value, d.b.value, d.b.on])).toEqual([
      ["Arena", "elevator", "no", "yes", "2026-06-06"],
      ["Zoo", "step-free-entry", "no", "yes", "2026-03-04"],
      ["Zoo", "elevator", "yes", "no", "2026-03-03"],
    ]);
    expect(pair?.different).toBe(pair?.differences.length);
  });
});

describe("the download of where sources differ", () => {
  it("has one guarded row for each difference, with both sources' answers and dates", () => {
    const r = fileSingle(fileOf(notes()), "report", "");
    expect(hasDifferences(r)).toBe(true);
    const csv = differCsv(r);
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv.slice(1).trimEnd().split("\r\n")).toEqual([DIFFER_CSV_COLUMNS.join(","), "Bank,40 Queen St E,elevator,City survey,yes,2026-10-01,Visit,no,2026-10-01"]);
    const guarded = differCsv(
      placesSingle(
        fileOf([
          testNote("g1", "@Desk", [{ key: "elevator", value: "yes", source: "-A" }], "1 Elm St"),
          testNote("g2", "@Desk", [{ key: "elevator", value: "no", source: "B" }], "1 Elm St"),
        ]).places,
        "report",
      ),
    );
    expect(guarded.split("\r\n")[1]).toBe("'@Desk,1 Elm St,elevator,'-A,yes,2026-10-01,B,no,2026-10-01");
  });

  it("knows when no two sources differ", () => {
    expect(hasDifferences(fileSingle(fileOf(notes()), "report", "", ["automatic-door"]))).toBe(false);
  });
});

describe("places where sources differ", () => {
  it("lists each place once, in name order, and gives their notes as a file the App reads back", () => {
    const f = fileOf([
      ...notes(),
      testNote("k1", "Arena", [{ key: "elevator", value: "yes" }, { key: "automatic-door", value: "yes" }], "1 Elm St"),
      testNote("k2", "Arena", [{ key: "elevator", value: "no", source: "Visit" }, { key: "automatic-door", value: "no", source: "Visit" }], "1 Elm St"),
    ]);
    const r = fileSingle(f, "report", "");
    expect(differPlaces(r).map((p) => p.name)).toEqual(["Arena", "Bank"]);
    const back = importNotes(differNotesFile(r, TODAY));
    expect(back.error).toBeUndefined();
    expect(back.notes.map((n) => n.id).sort()).toEqual(["b1", "b2", "k1", "k2"]);
  });
});
