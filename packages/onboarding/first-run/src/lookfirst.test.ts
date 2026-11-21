import { describe, expect, it } from "vitest";
import { exportNotes, importNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import { readStreetFile, type StreetFile } from "./filestreets";
import {
  DEFAULT_FIRST,
  FIRST_CSV_COLUMNS,
  STREETS_CSV_COLUMNS,
  checkFirstForm,
  firstCsv,
  firstNotesFile,
  formFor,
  inArea,
  isFirstOrder,
  isFirstView,
  newestRecord,
  openCount,
  pickFirst,
  pickStreets,
  placeNeeds,
  rankPlaces,
  rankStreets,
  streetsCsv,
  streetsNotesFile,
  type FirstOptions,
} from "./lookfirst";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 21));

const yes = (key: (typeof FACT_KEYS)[number], on = "2026-10-01") => ({ key, value: "yes" as const, on });

/**
 * Full: every detail recorded recently. Old: every detail recorded in 2025.
 * Split: reports differ on the elevator, rest recorded. Half: two details
 * recorded. Bare: nothing recorded.
 */
function file(): StreetFile {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("f", "Full", FACT_KEYS.map((k) => yes(k)), "1 King St W, Toronto"),
        testNote("o", "Old", FACT_KEYS.map((k) => yes(k, "2025-06-01")), "2 King St W, Toronto"),
        testNote("s1", "Split", FACT_KEYS.map((k) => yes(k)), "3 Queen St E, Toronto"),
        testNote("s2", "Split", [{ key: "elevator", value: "no", on: "2026-09-01" }], "3 Queen St E, Toronto"),
        testNote("h", "Half", [yes("elevator", "2026-05-01"), yes("automatic-door", "2026-05-01")], "4 Queen St E, Toronto"),
        testNote("b", "Bare", [], "5 Rue Saint-Denis, Montréal"),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const place = (f: StreetFile, name: string) => {
  const p = f.places.find((x) => x.name === name);
  if (!p) throw new Error(name);
  return p;
};

const names = (o: Partial<FirstOptions> = {}): string[] => rankPlaces(file(), { ...DEFAULT_FIRST, ...o }, TODAY, "en").ranked.map((n) => n.place.name);

describe("placeNeeds", () => {
  it("sorts each chosen detail into no record, reports differ or a year old", () => {
    const f = file();
    expect(placeNeeds(place(f, "Bare"), FACT_KEYS, true, TODAY)).toMatchObject({ unknown: FACT_KEYS, differ: [], old: [], newest: undefined });
    expect(placeNeeds(place(f, "Split"), FACT_KEYS, true, TODAY)).toMatchObject({ unknown: [], differ: ["elevator"], old: [], newest: "2026-10-01" });
    expect(placeNeeds(place(f, "Old"), FACT_KEYS, true, TODAY)).toMatchObject({ unknown: [], differ: [], old: FACT_KEYS, newest: "2025-06-01" });
    expect(placeNeeds(place(f, "Full"), FACT_KEYS, true, TODAY)).toMatchObject({ unknown: [], differ: [], old: [] });
  });

  it("does not count year-old records when asked not to, and only counts the chosen details", () => {
    const f = file();
    expect(openCount(placeNeeds(place(f, "Old"), FACT_KEYS, false, TODAY))).toBe(0);
    expect(placeNeeds(place(f, "Half"), ["elevator", "step-free-entry"], true, TODAY)).toMatchObject({ unknown: ["step-free-entry"], old: [] });
  });

  it("treats a record exactly twelve months old as a year old, and eleven months as not", () => {
    const at = (on: string): number => {
      const r = readStreetFile(exportNotes([testNote("x", "X", [yes("elevator", on)], "1 A St")], "2026-11-01"), TODAY, "en");
      if (!r.ok) throw new Error(r.error);
      const p = r.file.places[0];
      if (!p) throw new Error("no place");
      return placeNeeds(p, ["elevator"], true, TODAY).old.length;
    };
    expect(at("2025-11-21")).toBe(1);
    expect(at("2025-11-22")).toBe(0);
  });

  it("finds the newest report on any detail", () => {
    expect(newestRecord(place(file(), "Split"))).toBe("2026-10-01");
    expect(newestRecord(place(file(), "Bare"))).toBeUndefined();
  });
});

describe("rankPlaces", () => {
  it("puts the places with the most to look at first, and counts the ones with nothing", () => {
    const r = rankPlaces(file(), DEFAULT_FIRST, TODAY, "en");
    // Bare 4 (never recorded) and Old 4 (2025) tie on count; Bare is older. Half 2, Split 1.
    expect(r.ranked.map((n) => n.place.name)).toEqual(["Bare", "Old", "Half", "Split"]);
    expect(r.nothingOpen).toBe(1);
    expect(r.outsideArea).toBe(0);
  });

  it("puts differing reports first when asked", () => {
    expect(names({ order: "differ" })).toEqual(["Split", "Bare", "Old", "Half"]);
  });

  it("puts places never recorded first, then the oldest newest record", () => {
    expect(names({ order: "oldest" })).toEqual(["Bare", "Old", "Half", "Split"]);
  });

  it("leaves out year-old records when asked", () => {
    expect(names({ includeOld: false })).toEqual(["Bare", "Half", "Split"]);
  });

  it("keeps only places whose address holds the area text, ignoring case, accents and punctuation", () => {
    const r = rankPlaces(file(), { ...DEFAULT_FIRST, area: "queen st. e" }, TODAY, "en");
    expect(r.ranked.map((n) => n.place.name)).toEqual(["Half", "Split"]);
    expect(r.outsideArea).toBe(3);
    expect(names({ area: "MONTREAL" })).toEqual(["Bare"]);
    expect(inArea(place(file(), "Bare"), "")).toBe(true);
  });

  it("breaks ties by name in the person's language", () => {
    const r = readStreetFile(exportNotes([testNote("z", "Zoo", [], "1 A St"), testNote("e", "Éclair", [], "2 A St"), testNote("a", "Arc", [], "3 A St")], "2026-11-01"), TODAY, "fr");
    if (!r.ok) throw new Error(r.error);
    expect(rankPlaces(r.file, DEFAULT_FIRST, TODAY, "fr").ranked.map((n) => n.place.name)).toEqual(["Arc", "Éclair", "Zoo"]);
  });

  it("takes the first places only", () => {
    const r = rankPlaces(file(), DEFAULT_FIRST, TODAY, "en");
    expect(pickFirst(r, 2).map((n) => n.place.name)).toEqual(["Bare", "Old"]);
    expect(pickFirst(r, 200)).toHaveLength(4);
    expect(pickFirst(r, 0)).toEqual([]);
  });
});

describe("checkFirstForm", () => {
  it("reads a good form back into the same options", () => {
    const c = checkFirstForm(formFor(DEFAULT_FIRST));
    expect(c.ok && c.options).toEqual(DEFAULT_FIRST);
  });

  it("trims the area and keeps the details in the App's order", () => {
    const c = checkFirstForm({ ...formFor(DEFAULT_FIRST), keys: ["elevator", "step-free-entry"], area: "  M5H ", count: " 25 " });
    expect(c.ok && c.options).toMatchObject({ keys: ["step-free-entry", "elevator"], area: "M5H", count: 25 });
  });

  it("reports every problem at once, in the order of the fields", () => {
    const c = checkFirstForm({ ...formFor(DEFAULT_FIRST), keys: [], area: "x".repeat(61), count: "0" });
    expect(c.ok ? [] : c.problems.map((p) => p.field)).toEqual(["keys", "area", "count"]);
    for (const count of ["201", "2.5", "", "ten", "-3"]) expect(checkFirstForm({ ...formFor(DEFAULT_FIRST), count }).ok, count).toBe(false);
    for (const count of ["1", "200"]) expect(checkFirstForm({ ...formFor(DEFAULT_FIRST), count }).ok, count).toBe(true);
  });

  it("knows the three orders", () => {
    expect(["most", "differ", "oldest"].every(isFirstOrder)).toBe(true);
    expect(isFirstOrder("newest")).toBe(false);
    expect(isFirstOrder(null)).toBe(false);
  });
});

describe("downloads", () => {
  const picked = pickFirst(rankPlaces(file(), DEFAULT_FIRST, TODAY, "en"), 3);

  it("gives the first places' notes, every note of each place, in rank order", () => {
    const back = importNotes(firstNotesFile(picked, TODAY));
    expect(back.error).toBeUndefined();
    expect(back.notes.map((n) => n.placeName)).toEqual(["Bare", "Old", "Half"]);
  });

  it("gives the ranking as a guarded CSV with the reasons", () => {
    const lines = firstCsv(picked).replace(/^\uFEFF/, "").trimEnd().split("\r\n");
    expect(lines[0]).toBe(FIRST_CSV_COLUMNS.join(","));
    expect(lines[1]).toBe('1,Bare,"5 Rue Saint-Denis, Montréal",step-free-entry accessible-washroom automatic-door elevator,,,');
    expect(lines[2]).toBe('2,Old,"2 King St W, Toronto",,,step-free-entry accessible-washroom automatic-door elevator,2025-06-01');
    const r = readStreetFile(exportNotes([testNote("e", "=SUM(A1)", [], "+1 Main St")], "2026-11-01"), TODAY, "en");
    if (!r.ok) throw new Error(r.error);
    const evil = firstCsv(pickFirst(rankPlaces(r.file, DEFAULT_FIRST, TODAY, "en"), 1));
    expect(evil).toContain("1,'=SUM(A1),'+1 Main St,");
  });
});

describe("rankStreets", () => {
  function streetsFile(): StreetFile {
    const r = readStreetFile(
      exportNotes(
        [
          testNote("k1", "Library", [], "100 King St W"),
          testNote("k2", "Bank", [yes("elevator")], "40 King Street West"),
          testNote("q1", "Bakery", [], "5 Queen St E"),
          testNote("q2", "Florist", [yes("elevator"), yes("automatic-door")], "9 Queen St E"),
          testNote("q3", "Done", FACT_KEYS.map((k) => yes(k)), "11 Queen St E"),
          testNote("e1", "Shop", [], "1 Elm Ave"),
          testNote("n1", "Kiosk", [], "Toronto"),
        ],
        "2026-11-01",
      ),
      TODAY,
      "en",
    );
    if (!r.ok) throw new Error(r.error);
    return r.file;
  }

  const ranking = () => rankStreets(rankPlaces(streetsFile(), DEFAULT_FIRST, TODAY, "en"), "en");

  it("sums what is open on each street and ranks the streets, keeping places with no street apart", () => {
    const s = ranking();
    // King: 4 + 3 = 7 open, 2 places. Queen: 4 + 2 = 6 open (Done has nothing). Elm: 4.
    expect(s.streets.map((x) => [x.name, x.open, x.places.length, x.neverRecorded])).toEqual([
      ["King Street West", 7, 2, 1],
      ["Queen Street East", 6, 2, 1],
      ["Elm Avenue", 4, 1, 1],
    ]);
    expect(s.streets[0]?.places.map((n) => n.place.name)).toEqual(["Library", "Bank"]);
    expect(s.noStreet.map((n) => n.place.name)).toEqual(["Kiosk"]);
  });

  it("breaks ties by the number of places, then places never recorded, then name", () => {
    const r = readStreetFile(
      exportNotes([testNote("a", "A", [yes("elevator")], "1 Oak St"), testNote("b", "B", [yes("elevator")], "2 Ash St"), testNote("c", "C", [yes("elevator")], "3 Ash St"), testNote("d", "D", [yes("elevator"), yes("automatic-door")], "1 Fir St")], "2026-11-01"),
      TODAY,
      "en",
    );
    if (!r.ok) throw new Error(r.error);
    const s = rankStreets(rankPlaces(r.file, { ...DEFAULT_FIRST, keys: ["elevator", "automatic-door"] }, TODAY, "en"), "en");
    // Ash: 2 open over 2 places; Oak: 1 open; Fir: 0 open, so not listed.
    expect(s.streets.map((x) => x.name)).toEqual(["Ash Street", "Oak Street"]);
  });

  it("takes the first streets, with the notes of every place on them", () => {
    const s = ranking();
    const picked = pickStreets(s, 2);
    expect(picked.map((x) => x.name)).toEqual(["King Street West", "Queen Street East"]);
    expect(importNotes(streetsNotesFile(picked, TODAY)).notes.map((n) => n.placeName)).toEqual(["Library", "Bank", "Bakery", "Florist"]);
    expect(pickStreets(s, 0)).toEqual([]);
  });

  it("gives the streets as a CSV", () => {
    const lines = streetsCsv(pickStreets(ranking(), 3)).replace(/^\uFEFF/, "").trimEnd().split("\r\n");
    expect(lines).toEqual([STREETS_CSV_COLUMNS.join(","), "1,King Street West,2,7,7,0,0,1", "2,Queen Street East,2,6,6,0,0,1", "3,Elm Avenue,1,4,4,0,0,1"]);
  });

  it("knows the two views", () => {
    expect(isFirstView("places")).toBe(true);
    expect(isFirstView("streets")).toBe(true);
    expect(isFirstView("map")).toBe(false);
  });
});
