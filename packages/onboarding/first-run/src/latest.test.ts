import { describe, expect, it } from "vitest";
import {
  CONTRIBUTOR_SOURCE,
  COPY,
  LATEST_PAGE,
  RECORD_KINDS,
  clampLatest,
  findBanned,
  frenchTypographyIssues,
  groupByMonth,
  groupPlaces,
  hasAllParts,
  isRecordKind,
  kindCounts,
  latestFilename,
  latestLine,
  latestRecords,
  latestShownText,
  latestToText,
  monthLabel,
  type Note,
  type Place,
} from "./index";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 15));

const NOTES = (): Note[] => [
  testNote("a1", "Archive", [
    { key: "elevator", value: "yes", on: "2026-09-09" },
    { key: "automatic-door", value: "yes", on: "2026-09-09" },
  ]),
  testNote("b1", "Bakery", [{ key: "elevator", value: "no", on: "2026-09-09", source: CONTRIBUTOR_SOURCE }], "2 Main St"),
  testNote("b2", "Bakery", [{ key: "elevator", value: "yes", on: "2026-09-20", source: CONTRIBUTOR_SOURCE }], "2 Main St"),
  testNote("c1", "Cinema", [{ key: "step-free-entry", value: "yes", on: "2025-12-31", source: "Town open data", licence: "OGL-Canada-2.0" }], "3 Main St"),
  testNote("d1", "Dojo", [], "4 Main St"),
];

const places = (notes: Note[] = NOTES()): Place[] => groupPlaces(notes, "en");
const brief = (list: ReturnType<typeof latestRecords>): string[] => list.map((e) => `${e.entry.provenance.recordedOn} ${e.place.name} ${e.entry.key}`);

describe("the latest records", () => {
  it("lists every record newest first; the same day goes by place name, then detail", () => {
    expect(brief(latestRecords(places()))).toEqual([
      "2026-09-20 Bakery elevator",
      "2026-09-09 Archive automatic-door",
      "2026-09-09 Archive elevator",
      "2026-09-09 Bakery elevator",
      "2025-12-31 Cinema step-free-entry",
    ]);
  });

  it("holds every Yes and No in the notes exactly once, and nothing for an unknown detail", () => {
    const held = NOTES().reduce((n, note) => n + note.facts.filter((f) => f.value !== "unknown").length, 0);
    const list = latestRecords(places());
    expect(list).toHaveLength(held);
    expect(new Set(list.map((e) => `${e.place.id}|${e.entry.key}|${e.entry.noteId}`)).size).toBe(held);
    expect(list.some((e) => e.place.name === "Dojo")).toBe(false);
  });

  it("gives the same order whatever order the notes are stored in", () => {
    const want = brief(latestRecords(places()));
    expect(brief(latestRecords(places([...NOTES()].reverse())))).toEqual(want);
    const rotated = [...NOTES().slice(2), ...NOTES().slice(0, 2)];
    expect(brief(latestRecords(places(rotated)))).toEqual(want);
  });

  it("filters by the kind of record", () => {
    expect(brief(latestRecords(places(), "person"))).toEqual(["2026-09-20 Bakery elevator", "2026-09-09 Bakery elevator"]);
    expect(latestRecords(places(), "named-source")).toHaveLength(3);
  });

  it("counts records by kind, and the counts match the filtered lists", () => {
    const counts = kindCounts(places());
    expect(counts).toEqual({ person: 2, "named-source": 3 });
    for (const k of RECORD_KINDS) expect(latestRecords(places(), k)).toHaveLength(counts[k]);
    expect(kindCounts([])).toEqual({ person: 0, "named-source": 0 });
  });

  it("keeps the source, licence and date of every record", () => {
    const cinema = latestRecords(places()).find((e) => e.place.name === "Cinema");
    expect(cinema?.entry.provenance).toEqual({ source: "Town open data", licence: "OGL-Canada-2.0", recordedOn: "2025-12-31" });
  });

  it("knows its kinds", () => {
    for (const k of RECORD_KINDS) expect(isRecordKind(k)).toBe(true);
    for (const v of ["", "all", "Person", undefined]) expect(isRecordKind(v)).toBe(false);
  });
});

describe("months", () => {
  it("splits the list into months and keeps the order inside each", () => {
    const months = groupByMonth(latestRecords(places()));
    expect(months.map((m) => [m.month, m.entries.length])).toEqual([
      ["2026-09", 4],
      ["2025-12", 1],
    ]);
    expect(months.flatMap((m) => brief([...m.entries]))).toEqual(brief(latestRecords(places())));
  });

  it("is empty for an empty list", () => {
    expect(groupByMonth([])).toEqual([]);
  });

  it("names a month in both languages", () => {
    expect(monthLabel("2026-09", "en")).toBe("September 2026");
    expect(monthLabel("2026-09", "fr")).toBe("septembre 2026");
    expect(monthLabel("2025-12", "en")).toBe("December 2025");
    expect(monthLabel("2026-01", "fr")).toBe("janvier 2026");
    expect(monthLabel("2026-08", "fr")).toBe("août 2026");
  });

  it("has twelve different names in each language", () => {
    for (const l of ["en", "fr"] as const) {
      const names = Array.from({ length: 12 }, (_, i) => monthLabel(`2026-${String(i + 1).padStart(2, "0")}`, l));
      expect(new Set(names).size).toBe(12);
      for (const n of names) expect(n).toMatch(/ 2026$/);
    }
  });

  it("returns what it was given when it is not a real month", () => {
    for (const bad of ["2026-13", "2026-00", "2026-9", "nope", ""]) expect(monthLabel(bad, "en"), bad).toBe(bad);
  });
});

describe("how many records are shown", () => {
  it("shows one page at first and never more than there are", () => {
    expect(clampLatest(LATEST_PAGE, 57)).toBe(LATEST_PAGE);
    expect(clampLatest(LATEST_PAGE, 5)).toBe(5);
    expect(clampLatest(LATEST_PAGE * 2, 57)).toBe(40);
    expect(clampLatest(LATEST_PAGE * 3, 57)).toBe(57);
    expect(clampLatest(LATEST_PAGE, 0)).toBe(0);
  });

  it("falls back to one page for a number that makes no sense", () => {
    for (const bad of [0, -1, 2.5, Number.NaN, LATEST_PAGE - 1]) expect(clampLatest(bad, 57), String(bad)).toBe(LATEST_PAGE);
  });

  it("says how many are shown with the right plural", () => {
    expect(latestShownText(1, 1, "en")).toBe("1 record shown, out of 1.");
    expect(latestShownText(20, 57, "en")).toBe("20 records shown, out of 57.");
    expect(latestShownText(1, 3, "fr")).toBe("1 donnée affichée, sur 3.");
    expect(latestShownText(20, 57, "fr")).toBe("20 données affichées, sur 57.");
  });
});

describe("wording", () => {
  it("writes a record as the detail, the answer, then source, licence, date and tier", () => {
    const first = latestRecords(places())[0];
    if (!first) throw new Error("no record");
    expect(latestLine(first, "en")).toBe("Elevator: Yes. Contributor report · CC0-1.0 · 2026-09-20 · Tier 0, not reviewed.");
    expect(latestLine(first, "fr")).toBe("Ascenseur\u00A0: Oui. Rapport d’un contributeur · CC0-1.0 · 2026-09-20 · Niveau 0, non examiné.");
  });

  it("names all four parts of every record in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      for (const e of latestRecords(places())) expect(hasAllParts(latestLine(e, l), e.entry.provenance, l)).toBe(true);
    }
  });

  it("uses French typography and no banned wording", () => {
    for (const pair of Object.values(COPY.latest)) {
      expect(frenchTypographyIssues(pair.fr), pair.fr).toEqual([]);
      for (const text of [pair.en, pair.fr]) expect(findBanned(text), text).toBeUndefined();
    }
  });
});

describe("the list as text", () => {
  it("groups records under their month with the place first", () => {
    const text = latestToText(latestRecords(places()), "en", TODAY);
    expect(text.startsWith("Latest records\n==============\n")).toBe(true);
    expect(text).toContain("September 2026\n--------------\n- Bakery. Elevator: Yes. Contributor report · CC0-1.0 · 2026-09-20 · Tier 0, not reviewed.\n- Archive. Automatic door: Yes.");
    expect(text).toContain("December 2025\n-------------\n- Cinema. Step-free entrance: Yes. Town open data · OGL-Canada-2.0 · 2025-12-31 · Tier 0, not reviewed.");
    expect(text.split("\n").filter((x) => x.startsWith("- "))).toHaveLength(5);
    expect(text).toContain(COPY.latest.noRank.en);
    expect(text.endsWith("Made on 2026-11-15.\n")).toBe(true);
  });

  it("says which kind was chosen", () => {
    expect(latestToText(latestRecords(places(), "person"), "en", TODAY, "person")).toContain("Showing only: Report by a person");
    expect(latestToText(latestRecords(places(), "named-source"), "fr", TODAY, "named-source")).toContain("Affichage limité à\u00A0: Source nommée");
    expect(latestToText(latestRecords(places()), "en", TODAY)).not.toContain("Showing only");
  });

  it("says so when there is no record", () => {
    const text = latestToText([], "en", TODAY);
    expect(text).toContain("No records to show.");
    expect(text).not.toContain("- ");
  });

  it("is in step in both languages, with French typography", () => {
    const list = latestRecords(places());
    const fr = latestToText(list, "fr", TODAY);
    expect(fr.split("\n")).toHaveLength(latestToText(list, "en", TODAY).split("\n").length);
    expect(frenchTypographyIssues(fr)).toEqual([]);
    expect(fr).toContain("septembre 2026");
  });

  it("names the file after the day, the language and the kind", () => {
    expect(latestFilename(TODAY, "en")).toBe("latest-records-2026-11-15-en.txt");
    expect(latestFilename(TODAY, "fr", "person")).toBe("dernieres-donnees-person-2026-11-15-fr.txt");
    for (const k of RECORD_KINDS) expect(latestFilename(TODAY, "en", k)).toMatch(/^[a-z0-9.-]+$/);
  });
});
