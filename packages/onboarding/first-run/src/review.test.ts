import { describe, expect, it } from "vitest";
import {
  COPY,
  FACT_KEYS,
  QUESTIONS,
  REVIEW_PAGE,
  REVIEW_REASONS,
  buildReview,
  clampShown,
  findBanned,
  frenchTypographyIssues,
  groupPlaces,
  isReviewReason,
  itemQuestion,
  itemReason,
  reasonFor,
  reasonLabel,
  reviewCounts,
  reviewFilename,
  reviewItems,
  reviewToText,
  shownText,
  totalItems,
  type Note,
  type Place,
} from "./index";
import { testNote, type TestRecord } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 15));
const ALL = (value: "yes" | "no", on = "2026-10-01"): TestRecord[] => FACT_KEYS.map((key) => ({ key, value, on }));

const NOTES = (): Note[] => [
  // Archive: everything recorded recently and in agreement. Nothing to ask.
  testNote("a1", "Archive", ALL("yes")),
  // Bakery: an old record and three unknown details.
  testNote("b1", "Bakery", [{ key: "elevator", value: "no", on: "2025-01-01" }], "2 Main St"),
  // Cinema: reports differ on the elevator; a recent door record; two unknown.
  testNote("c1", "Cinema", [{ key: "elevator", value: "yes", on: "2026-05-05" }, { key: "automatic-door", value: "yes" }], "3 Main St"),
  testNote("c2", "Cinema", [{ key: "elevator", value: "no", on: "2026-08-08" }], "3 Main St"),
  // Dojo: nothing recorded.
  testNote("d1", "Dojo", [], "4 Main St"),
];

const places = (notes: Note[] = NOTES()): Place[] => groupPlaces(notes, "en");
const byName = (name: string, list: Place[] = places()): Place => {
  const p = list.find((x) => x.name === name);
  if (!p) throw new Error(`no place ${name}`);
  return p;
};

describe("why a detail is listed", () => {
  it("lists a detail with no record as unknown", () => {
    for (const k of FACT_KEYS) expect(reasonFor(byName("Dojo"), k, TODAY)).toBe("unknown");
  });

  it("lists a detail whose reports differ, however recent they are", () => {
    expect(reasonFor(byName("Cinema"), "elevator", TODAY)).toBe("differ");
  });

  it("lists an agreed record only when its newest report is a year old or more", () => {
    expect(reasonFor(byName("Bakery"), "elevator", TODAY)).toBe("old");
    expect(reasonFor(byName("Cinema"), "automatic-door", TODAY)).toBeUndefined();
    for (const k of FACT_KEYS) expect(reasonFor(byName("Archive"), k, TODAY)).toBeUndefined();
  });

  it("uses the newest report for the age, so one fresh agreeing report takes the detail off the list", () => {
    const list = places([
      testNote("o1", "Library", [{ key: "elevator", value: "yes", on: "2020-01-01" }]),
      testNote("o2", "Library", [{ key: "elevator", value: "yes", on: "2026-11-01" }]),
    ]);
    expect(reasonFor(byName("Library", list), "elevator", TODAY)).toBeUndefined();
  });

  it("is old at exactly twelve months and not before", () => {
    const at = (on: string): Place => byName("Library", places([testNote("o1", "Library", [{ key: "elevator", value: "yes", on }])]));
    expect(reasonFor(at("2025-11-15"), "elevator", TODAY)).toBe("old");
    expect(reasonFor(at("2025-11-16"), "elevator", TODAY)).toBeUndefined();
    expect(reasonFor(at("2025-12-15"), "elevator", TODAY)).toBeUndefined();
  });

  it("never turns an unknown detail into anything else", () => {
    for (const p of places()) {
      for (const k of FACT_KEYS) {
        if (p.resolutions[k].kind === "unknown") expect(reasonFor(p, k, TODAY)).toBe("unknown");
        else expect(reasonFor(p, k, TODAY)).not.toBe("unknown");
      }
    }
  });
});

describe("items for one place", () => {
  it("keeps the usual detail order and carries the newest date, age and number of reports", () => {
    expect(reviewItems(byName("Cinema"), TODAY)).toEqual([
      { key: "step-free-entry", reason: "unknown", newest: undefined, months: undefined, reports: 0 },
      { key: "accessible-washroom", reason: "unknown", newest: undefined, months: undefined, reports: 0 },
      { key: "elevator", reason: "differ", newest: "2026-08-08", months: 3, reports: 2 },
    ]);
    expect(reviewItems(byName("Bakery"), TODAY).find((i) => i.key === "elevator")).toEqual({
      key: "elevator",
      reason: "old",
      newest: "2025-01-01",
      months: 22,
      reports: 1,
    });
  });

  it("is empty for a place with nothing to ask", () => {
    expect(reviewItems(byName("Archive"), TODAY)).toEqual([]);
  });
});

describe("the list across places", () => {
  it("leaves out places with nothing to ask and puts differing reports first, then old records, then unknown only", () => {
    expect(buildReview(places(), TODAY).map((p) => p.place.name)).toEqual(["Cinema", "Bakery", "Dojo"]);
  });

  it("orders places inside a group by name, then id, whatever order they came in", () => {
    const notes = [testNote("z", "Zoo", [], "9 Main St"), testNote("m", "Mill", [], "8 Main St"), testNote("y", "Mill", [], "7 Main St")];
    const names = buildReview(places(notes), TODAY).map((p) => `${p.place.name}|${p.place.address}`);
    const again = buildReview(places([...notes].reverse()), TODAY).map((p) => `${p.place.name}|${p.place.address}`);
    expect(names).toEqual(again);
    expect(names.map((n) => n.split("|")[0])).toEqual(["Mill", "Mill", "Zoo"]);
  });

  it("filters by one reason and drops places with no item of that reason", () => {
    expect(buildReview(places(), TODAY, "differ").map((p) => [p.place.name, p.items.map((i) => i.key)])).toEqual([["Cinema", ["elevator"]]]);
    expect(buildReview(places(), TODAY, "old").map((p) => p.place.name)).toEqual(["Bakery"]);
    expect(buildReview(places(), TODAY, "unknown").map((p) => p.place.name)).toEqual(["Bakery", "Cinema", "Dojo"]);
  });

  it("counts items by reason, and the counts match the unfiltered list", () => {
    const counts = reviewCounts(places(), TODAY);
    expect(counts).toEqual({ differ: 1, old: 1, unknown: 3 + 2 + 4 });
    expect(totalItems(buildReview(places(), TODAY))).toBe(counts.differ + counts.old + counts.unknown);
    for (const r of REVIEW_REASONS) expect(totalItems(buildReview(places(), TODAY, r))).toBe(counts[r]);
  });

  it("accounts for every detail of every place: listed or recent and agreed", () => {
    const list = places();
    const listed = totalItems(buildReview(list, TODAY));
    const settled = list.reduce((n, p) => n + FACT_KEYS.filter((k) => reasonFor(p, k, TODAY) === undefined).length, 0);
    expect(listed + settled).toBe(list.length * FACT_KEYS.length);
  });

  it("is empty with no places, and does not change the places it was given", () => {
    expect(buildReview([], TODAY)).toEqual([]);
    expect(reviewCounts([], TODAY)).toEqual({ differ: 0, old: 0, unknown: 0 });
    const list = places();
    const before = JSON.stringify(list);
    buildReview(list, TODAY, "old");
    expect(JSON.stringify(list)).toBe(before);
  });
});

describe("how many places are shown", () => {
  it("shows one page at first, and never more than there are", () => {
    expect(clampShown(REVIEW_PAGE, 25)).toBe(REVIEW_PAGE);
    expect(clampShown(REVIEW_PAGE, 3)).toBe(3);
    expect(clampShown(REVIEW_PAGE, 0)).toBe(0);
    expect(clampShown(REVIEW_PAGE * 2, 25)).toBe(20);
    expect(clampShown(REVIEW_PAGE * 3, 25)).toBe(25);
  });

  it("falls back to one page for a number that makes no sense", () => {
    for (const bad of [0, -5, 1.5, Number.NaN, Number.POSITIVE_INFINITY, REVIEW_PAGE - 1]) {
      expect(clampShown(bad, 25), String(bad)).toBe(REVIEW_PAGE);
    }
  });
});

describe("wording", () => {
  it("says how many places are shown with the right plural", () => {
    expect(shownText(1, 1, "en")).toBe("1 place shown, out of 1.");
    expect(shownText(10, 23, "en")).toBe("10 places shown, out of 23.");
    expect(shownText(0, 0, "en")).toBe("0 places shown, out of 0.");
    expect(shownText(1, 4, "fr")).toBe("1 lieu affiché, sur 4.");
    expect(shownText(0, 0, "fr")).toBe("0 lieu affiché, sur 0.");
    expect(shownText(10, 23, "fr")).toBe("10 lieux affichés, sur 23.");
    expect(frenchTypographyIssues(shownText(10, 23, "fr"))).toEqual([]);
  });

  it("knows its reasons", () => {
    for (const r of REVIEW_REASONS) expect(isReviewReason(r)).toBe(true);
    for (const v of ["", "all", "Differ", undefined]) expect(isReviewReason(v)).toBe(false);
  });

  it("labels each reason in both languages", () => {
    expect(REVIEW_REASONS.map((r) => reasonLabel(r, "en"))).toEqual(["Reports differ", "Record a year old or more", "No record"]);
    expect(REVIEW_REASONS.map((r) => reasonLabel(r, "fr"))).toEqual(["Rapports divergents", "Donnée d’un an ou plus", "Aucune donnée"]);
  });

  it("explains each item with its date, and an unknown one with no date", () => {
    const cinema = reviewItems(byName("Cinema"), TODAY);
    const bakery = reviewItems(byName("Bakery"), TODAY);
    const differ = cinema.find((i) => i.reason === "differ");
    const old = bakery.find((i) => i.reason === "old");
    const unknown = cinema.find((i) => i.reason === "unknown");
    if (!differ || !old || !unknown) throw new Error("missing item");
    expect(itemReason(differ, "en")).toBe("2 reports do not say the same thing. The newest is from 2026-08-08.");
    expect(itemReason(differ, "fr")).toBe("2 rapports ne disent pas la même chose. Le plus récent date du 2026-08-08.");
    expect(itemReason(old, "en")).toBe("The newest record is from 2025-01-01, 22 months ago.");
    expect(itemReason(old, "fr")).toBe("La donnée la plus récente date du 2025-01-01, il y a 22 mois.");
    expect(itemReason(unknown, "en")).toBe(COPY.review.whyUnknown.en);
    expect(itemReason(unknown, "en")).not.toMatch(/\d{4}/);
  });

  it("asks the usual question, or whether it is still the case for an old record", () => {
    const bakery = reviewItems(byName("Bakery"), TODAY);
    const old = bakery.find((i) => i.reason === "old");
    const unknown = bakery.find((i) => i.reason === "unknown");
    if (!old || !unknown) throw new Error("missing item");
    expect(itemQuestion(unknown, "en")).toBe(QUESTIONS[unknown.key].en);
    expect(itemQuestion(unknown, "fr")).toBe(QUESTIONS[unknown.key].fr);
    expect(itemQuestion(old, "en")).toBe("Is this still the case: Elevator?");
    expect(itemQuestion(old, "fr")).toBe("Est-ce toujours le cas\u00A0: Ascenseur\u202F?");
  });

  it("uses French typography and no banned wording in every sentence it can produce", () => {
    for (const p of buildReview(places(), TODAY)) {
      for (const i of p.items) {
        for (const text of [itemReason(i, "fr"), itemQuestion(i, "fr")]) {
          expect(frenchTypographyIssues(text), text).toEqual([]);
          expect(findBanned(text), text).toBeUndefined();
        }
        for (const text of [itemReason(i, "en"), itemQuestion(i, "en")]) expect(findBanned(text), text).toBeUndefined();
      }
    }
    for (const pair of Object.values(COPY.review)) {
      expect(frenchTypographyIssues(pair.fr), pair.fr).toEqual([]);
      expect(findBanned(pair.en), pair.en).toBeUndefined();
      expect(findBanned(pair.fr), pair.fr).toBeUndefined();
    }
  });

  it("never calls a record wrong", () => {
    for (const l of ["en", "fr"] as const) {
      const text = reviewToText(buildReview(places(), TODAY), l, TODAY);
      const body = text.replace(COPY.review.notWrong[l], "");
      expect(body).not.toMatch(/\b(wrong|incorrect|false|fausse|faux|erreur|error)\b/i);
    }
  });
});

describe("the list as text", () => {
  it("has a block for each place, a line for each item and the question under it", () => {
    const list = buildReview(places(), TODAY);
    const text = reviewToText(list, "en", TODAY);
    expect(text.startsWith("Details to ask about again\n==========================\n")).toBe(true);
    expect(text.split("\n").filter((x) => x.startsWith("- "))).toHaveLength(totalItems(list));
    expect(text).toContain("Cinema\n------\n3 Main St\n- Step-free entrance: No record. Nothing is recorded, so it stays Unknown.\n  Is there an entrance with no steps? Where is it?");
    expect(text).toContain("- Elevator: Reports differ. 2 reports do not say the same thing. The newest is from 2026-08-08.");
    expect(text.indexOf("Cinema")).toBeLessThan(text.indexOf("Bakery"));
    expect(text.indexOf("Bakery")).toBeLessThan(text.indexOf("Dojo"));
    expect(text).not.toContain("Archive");
    expect(text.endsWith("Made on 2026-11-15.\n")).toBe(true);
  });

  it("says which filter was used", () => {
    const list = buildReview(places(), TODAY, "old");
    expect(reviewToText(list, "en", TODAY, "old")).toContain("Showing only: Record a year old or more");
    expect(reviewToText(list, "fr", TODAY, "old")).toContain("Affichage limité à\u00A0: Donnée d’un an ou plus");
    expect(reviewToText(buildReview(places(), TODAY), "en", TODAY)).not.toContain("Showing only");
  });

  it("says so when there is nothing to ask", () => {
    const text = reviewToText([], "en", TODAY);
    expect(text).toContain("Nothing to ask about.");
    expect(text).not.toContain("- ");
  });

  it("is in step in both languages and typographically sound in French", () => {
    const list = buildReview(places(), TODAY);
    const fr = reviewToText(list, "fr", TODAY);
    expect(fr.split("\n")).toHaveLength(reviewToText(list, "en", TODAY).split("\n").length);
    expect(frenchTypographyIssues(fr)).toEqual([]);
    expect(fr).toContain("- Ascenseur\u00A0: Rapports divergents.");
  });

  it("names the file after the day, the language and the filter", () => {
    expect(reviewFilename(TODAY, "en")).toBe("ask-again-2026-11-15-en.txt");
    expect(reviewFilename(TODAY, "fr")).toBe("a-redemander-2026-11-15-fr.txt");
    expect(reviewFilename(TODAY, "en", "differ")).toBe("ask-again-differ-2026-11-15-en.txt");
    for (const r of REVIEW_REASONS) expect(reviewFilename(TODAY, "fr", r)).toMatch(/^[a-z0-9.-]+$/);
  });
});
