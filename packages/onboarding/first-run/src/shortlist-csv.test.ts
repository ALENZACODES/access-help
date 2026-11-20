// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { auditCopy, groupPlaces, placeId } from "./index";
import { parseCsv } from "./csvimport";
import { SHORTLIST_CSV_COPY, resolutionCells, shortlistCsvColumns, shortlistCsvFilename, shortlistCsvStrings, shortlistToCsv, shortlistToRows } from "./shortlist-csv";
import { act, createHarness, type Harness } from "./shelltest";
import { makeRng, randomNotes } from "./testkit";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const notes = [
  testNote("a", "Library", [{ key: "elevator", value: "yes" }, { key: "automatic-door", value: "no" }]),
  testNote("b", "Library", [{ key: "automatic-door", value: "yes" }]),
  testNote("c", "=Pool", [{ key: "step-free-entry", value: "yes" }], null),
];
const places = groupPlaces(notes, "en");
const LIB = placeId({ placeName: "Library", address: "1 Main St" });
const POOL = placeId({ placeName: "=Pool", address: undefined });

describe("the columns", () => {
  it("add the must-have columns only when must-haves are saved", () => {
    expect(shortlistCsvColumns(false).slice(0, 6)).toEqual(["position", "place_name", "address", "step-free-entry", "step-free-entry_records", "step-free-entry_newest"]);
    expect(shortlistCsvColumns(true).slice(0, 9)).toEqual(["position", "place_name", "address", "must_haves", "step-free-entry", "step-free-entry_records", "step-free-entry_newest", "step-free-entry_must_have", "step-free-entry_met"]);
  });
});

describe("what the notes say", () => {
  it("as a value, a count of records and the newest day; UNKNOWN with no record", () => {
    const lib = places.find((p) => p.id === LIB);
    expect(resolutionCells(lib?.resolutions.elevator)).toEqual(["yes", "1", "2026-10-01"]);
    expect(resolutionCells(lib?.resolutions["automatic-door"])).toEqual(["differ", "2", "2026-10-01"]);
    expect(resolutionCells(lib?.resolutions["accessible-washroom"])).toEqual(["UNKNOWN", "0", ""]);
    expect(resolutionCells(undefined)).toEqual(["UNKNOWN", "0", ""]);
  });
});

describe("the rows", () => {
  it("follow the person's order, guard typed text, and leave out ids that are not places", () => {
    const rows = shortlistToRows([POOL, "gone-1", LIB], places, {});
    expect(rows.map((r) => r.slice(0, 3))).toEqual([
      ["position", "place_name", "address"],
      ["1", "'=Pool", ""],
      ["2", "Library", "1 Main St"],
    ]);
  });

  it("say, with must-haves, where each place stands and whether each must-have is met", () => {
    const rows = shortlistToRows([LIB, POOL], places, { elevator: "yes", "automatic-door": "yes" });
    const head = rows[0] ?? [];
    const cell = (r: number, name: string): string | undefined => rows[r]?.[head.indexOf(name)];
    expect([cell(1, "must_haves"), cell(1, "elevator_must_have"), cell(1, "elevator_met"), cell(1, "automatic-door_met"), cell(1, "step-free-entry_must_have")]).toEqual(["open", "yes", "met", "differ", ""]);
    expect([cell(2, "must_haves"), cell(2, "elevator_met")]).toEqual(["open", "UNKNOWN"]);
    expect(shortlistToRows([LIB], places, { elevator: "no" })[1]?.[head.indexOf("must_haves")]).toBe("not_met");
  });

  it("are a well-formed file for random places, one row each", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const rng = makeRng(seed);
      const ps = groupPlaces(randomNotes(rng, 12), "en");
      const list = ps.filter(() => rng() < 0.6).map((p) => p.id);
      const needs = rng() < 0.5 ? {} : { elevator: "yes" as const };
      const parsed = parseCsv(shortlistToCsv(list, ps, needs));
      if ("error" in parsed) throw new Error(parsed.error);
      expect(parsed.rows, `seed ${seed}`).toHaveLength(1 + list.length);
      for (const r of parsed.rows) expect(r, `seed ${seed}`).toHaveLength(shortlistCsvColumns(Object.keys(needs).length > 0).length);
    }
    expect(shortlistCsvFilename(TODAY)).toBe("shortlist-2026-11-20.csv");
  });
});

describe("on the shortlist page", () => {
  let h: Harness | undefined;
  afterEach(() => h?.destroy());

  it("offers the file with the shortlist and must-haves as they are, and passes the App's audit", () => {
    h = createHarness(TODAY);
    h.seed(notes);
    h.store.setItem("app.onboarding.shortlist.v1", JSON.stringify([LIB]));
    h.store.setItem("app.onboarding.needs.v1", JSON.stringify({ elevator: "yes" }));
    h.mount("fr");
    h.click(act("view", "notes"));
    h.click(act("view", "places"));
    h.click(act("view", "shortlistpage"));
    const link = h.root.querySelector<HTMLAnchorElement>("[data-shortlist-csv]");
    expect(link?.textContent).toBe(SHORTLIST_CSV_COPY.download.fr);
    const href = link?.getAttribute("href") ?? "";
    expect(decodeURIComponent(href.slice(href.indexOf(",") + 1))).toBe(shortlistToCsv([LIB], places, { elevator: "yes" }));
    expect(h.auditLines()).toEqual([]);
  });

  it("copy passes the App's copy audit", () => {
    expect(auditCopy(shortlistCsvStrings())).toEqual([]);
  });
});
