import { describe, expect, it } from "vitest";
import {
  COPY,
  FACT_KEYS,
  PLAN_STATUSES,
  QUESTIONS,
  askedText,
  buildRoundup,
  hasQuestionsLeft,
  onlyQuestionsLeft,
  findBanned,
  groupPlaces,
  placeId,
  roundupFilename,
  roundupToText,
  statusCountsLine,
  type Checklist,
  type Note,
  type Requirement,
} from "./index";
import { makeRng, randomNotes } from "./testkit";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));

const NOTES = (): Note[] => [
  // Library: step-free Yes, elevator No (old), washroom UNKNOWN.
  testNote("l1", "Library", [
    { key: "step-free-entry", value: "yes", on: "2026-09-09" },
    { key: "elevator", value: "no", on: "2024-05-05" },
  ]),
  // Bakery: step-free reports differ.
  testNote("b1", "Bakery", [{ key: "step-free-entry", value: "yes", on: "2026-03-03" }], "2 Main St"),
  testNote("b2", "Bakery", [{ key: "step-free-entry", value: "no", on: "2026-04-04" }], "2 Main St"),
  // Cafe: every must-have recorded recently.
  testNote("c1", "Cafe", [
    { key: "step-free-entry", value: "yes", on: "2026-10-10" },
    { key: "elevator", value: "yes", on: "2026-10-10" },
    { key: "accessible-washroom", value: "yes", on: "2026-10-10" },
  ], "3 Main St"),
];

const LIBRARY = placeId({ placeName: "Library", address: "1 Main St" });
const BAKERY = placeId({ placeName: "Bakery", address: "2 Main St" });
const CAFE = placeId({ placeName: "Cafe", address: "3 Main St" });
const NEEDS: Requirement = { "step-free-entry": "yes", elevator: "yes", "accessible-washroom": "yes" };
const places = () => groupPlaces(NOTES(), "en");

describe("buildRoundup", () => {
  it("keeps the shortlist order, skips repeats and counts places no longer in the notes", () => {
    const r = buildRoundup(places(), [CAFE, LIBRARY, CAFE, "gone-0a1b2c3d", BAKERY], NEEDS, {}, "en", TODAY);
    expect(r.places.map((p) => p.place.name)).toEqual(["Cafe", "Library", "Bakery"]);
    expect(r.missing).toBe(1);
    expect(r.totals.places).toBe(3);
  });

  it("checks each place against the must-haves", () => {
    const r = buildRoundup(places(), [LIBRARY, BAKERY, CAFE], NEEDS, {}, "en", TODAY);
    const [library, bakery, cafe] = r.places;
    expect(library?.plan.items.map((i) => [i.key, i.status])).toEqual([
      ["step-free-entry", "matches"],
      ["accessible-washroom", "unknown"],
      ["elevator", "not-met"],
    ]);
    expect(bakery?.plan.counts).toEqual({ matches: 0, "not-met": 0, differ: 1, unknown: 2 });
    expect(cafe?.plan.counts).toEqual({ matches: 3, "not-met": 0, differ: 0, unknown: 0 });
    expect(r.totals.statuses).toEqual({ matches: 4, "not-met": 1, differ: 1, unknown: 3 });
  });

  it("lists the questions the visit plan would ask, including old answers", () => {
    const r = buildRoundup(places(), [LIBRARY], NEEDS, {}, "en", TODAY);
    const q = r.places[0]?.questions ?? [];
    expect(q.map((x) => [x.key, x.reason])).toEqual([
      ["accessible-washroom", "unknown"],
      ["elevator", "old"],
    ]);
    expect(q[0]?.text).toBe(QUESTIONS["accessible-washroom"].en);
  });

  it("reads what the person ticked and noted, and counts it", () => {
    const checklist: Checklist = {
      [LIBRARY]: { "accessible-washroom": { asked: true, answer: "Yes, on the main floor" } },
      [BAKERY]: { "step-free-entry": { asked: true, answer: "" } },
    };
    const r = buildRoundup(places(), [LIBRARY, BAKERY, CAFE], NEEDS, checklist, "en", TODAY);
    const lib = r.places[0];
    expect(lib?.questions.map((q) => [q.asked, q.answer])).toEqual([
      [true, "Yes, on the main floor"],
      [false, ""],
    ]);
    expect([lib?.asked, lib?.answered]).toEqual([1, 1]);
    expect(r.totals).toMatchObject({ questions: 5, asked: 2, answered: 1, allAsked: 0, noQuestions: 1 });
  });

  it("counts a place as done only when every question is asked", () => {
    const checklist: Checklist = { [BAKERY]: { "step-free-entry": { asked: true, answer: "" }, elevator: { asked: true, answer: "" }, "accessible-washroom": { asked: true, answer: "" } } };
    const r = buildRoundup(places(), [BAKERY, CAFE], NEEDS, checklist, "en", TODAY);
    expect(r.totals.allAsked).toBe(1);
    expect(r.totals.noQuestions).toBe(1);
  });

  it("never turns a note into a report", () => {
    const checklist: Checklist = { [LIBRARY]: { "accessible-washroom": { asked: true, answer: "Yes" } } };
    const r = buildRoundup(places(), [LIBRARY], NEEDS, checklist, "en", TODAY);
    expect(r.places[0]?.plan.items.find((i) => i.key === "accessible-washroom")?.status).toBe("unknown");
  });

  it("adds up on random notes and shortlists", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const rng = makeRng(seed);
      const list = groupPlaces(randomNotes(rng, 10), "en");
      const shortlist = list.filter(() => rng() < 0.6).map((p) => p.id);
      const needs: Requirement = Object.fromEntries(FACT_KEYS.filter(() => rng() < 0.6).map((k) => [k, rng() < 0.5 ? "yes" : "no"]));
      const r = buildRoundup(list, shortlist, needs, {}, "en", TODAY);
      expect(r.totals.places, String(seed)).toBe(shortlist.length);
      const items = r.places.reduce((n, p) => n + p.plan.items.length, 0);
      expect(PLAN_STATUSES.reduce((n, s) => n + r.totals.statuses[s], 0), String(seed)).toBe(items);
      expect(r.totals.asked, String(seed)).toBe(0);
      for (const p of r.places) {
        expect(p.plan.items.length, String(seed)).toBe(Object.keys(needs).length);
        expect(p.questions.length, String(seed)).toBeGreaterThanOrEqual(p.plan.counts.unknown + p.plan.counts.differ);
      }
    }
  });
});

describe("wording", () => {
  it("writes the progress in both languages", () => {
    expect(askedText(2, 5, "en")).toBe("Asked 2 of 5");
    expect(askedText(2, 5, "fr")).toBe("Posées\u00A0: 2 sur 5");
  });

  it("counts only the statuses that occur, with the App's own labels", () => {
    expect(statusCountsLine({ matches: 2, "not-met": 0, differ: 1, unknown: 1 }, "en")).toBe("Matches 2; Reports differ 1; Unknown 1");
    expect(statusCountsLine({ matches: 0, "not-met": 1, differ: 0, unknown: 2 }, "fr")).toBe(`Ne correspond pas 1\u202F; ${COPY.plan.unknown.fr} 2`);
    expect(statusCountsLine({ matches: 0, "not-met": 0, differ: 0, unknown: 0 }, "en")).toBe("");
  });
});

describe("roundupToText", () => {
  const checklist: Checklist = { [LIBRARY]: { "accessible-washroom": { asked: true, answer: "Yes, main floor" } } };

  it("writes each place in shortlist order with statuses, sources and questions", () => {
    const text = roundupToText(buildRoundup(places(), [LIBRARY, CAFE], NEEDS, checklist, "en", TODAY), true, "en", TODAY);
    expect(text.startsWith(`${COPY.roundup.title.en}\n`)).toBe(true);
    expect(text).toContain("Places on the shortlist: 2\nQuestions: Asked 1 of 2\n");
    expect(text.indexOf("1. Library")).toBeLessThan(text.indexOf("2. Cafe"));
    expect(text).toContain("- Step-free entrance: Matches. Answer: Yes. Source: City survey. Licence: CC0-1.0. Recorded on 2026-09-09");
    expect(text).toContain("- Accessible washroom: Unknown. No record.");
    expect(text).toContain(`  1. [x] ${QUESTIONS["accessible-washroom"].en}\n     What the place said: Yes, main floor\n`);
    expect(text).toContain(COPY.roundup.noQuestions.en);
    expect(text).toContain(COPY.checklist.notReports.en);
    expect(text.endsWith("Made on 2026-11-19.\n")).toBe(true);
  });

  it("says what is missing instead of listing nothing", () => {
    expect(roundupToText(buildRoundup(places(), [], NEEDS, {}, "en", TODAY), true, "en", TODAY)).toContain(COPY.roundup.empty.en);
    expect(roundupToText(buildRoundup(places(), [LIBRARY], {}, {}, "en", TODAY), false, "en", TODAY)).toContain(COPY.roundup.noNeeds.en);
    expect(roundupToText(buildRoundup(places(), [LIBRARY, "gone-0a1b2c3d"], NEEDS, {}, "en", TODAY), true, "en", TODAY)).toContain(COPY.roundup.missing.en);
  });

  it("keeps French typography, never says inconnu, and never ranks", () => {
    const fr = roundupToText(buildRoundup(places(), [LIBRARY, BAKERY, CAFE], NEEDS, checklist, "fr", TODAY), true, "fr", TODAY);
    expect(fr).toContain("Lieux de la liste courte\u00A0: 3");
    expect(fr).not.toMatch(/[^\u00A0\u202F](?=[:;?!])/u);
    expect(fr).not.toMatch(/\binconnu/i);
    for (const l of ["en", "fr"] as const) {
      const text = roundupToText(buildRoundup(places(), [LIBRARY, BAKERY, CAFE], NEEDS, {}, l, TODAY), true, l, TODAY).replace(COPY.shortlist.intro[l], "");
      expect(findBanned(text), l).toBeUndefined();
      expect(text, l).not.toMatch(/\b(best|worst|score|ranked|top pick|meilleur|pire|classement|suits you|vous convient)\b/i);
    }
  });

  it("names the file by date and language", () => {
    expect(roundupFilename(TODAY, "en")).toBe("shortlist-round-up-2026-11-19-en.txt");
    expect(roundupFilename(TODAY, "fr")).toBe("liste-courte-bilan-2026-11-19-fr.txt");
  });
});

describe("only places with questions left", () => {
  const checklist: Checklist = { [LIBRARY]: { "accessible-washroom": { asked: true, answer: "" }, elevator: { asked: true, answer: "" } } };

  it("keeps places with an unticked question, in shortlist order, and counts them again", () => {
    const full = buildRoundup(places(), [LIBRARY, BAKERY, CAFE], NEEDS, checklist, "en", TODAY);
    expect(full.places.map((p) => hasQuestionsLeft(p))).toEqual([false, true, false]);
    const left = onlyQuestionsLeft(full);
    expect(left.places.map((p) => p.place.name)).toEqual(["Bakery"]);
    expect(left.totals).toMatchObject({ places: 1, questions: 3, asked: 0, answered: 0 });
    expect(left.totals.statuses).toEqual({ matches: 0, "not-met": 0, differ: 1, unknown: 2 });
    expect(left.missing).toBe(full.missing);
  });

  it("is empty when every question is ticked, and does not change the full round-up", () => {
    const full = buildRoundup(places(), [LIBRARY, CAFE], NEEDS, checklist, "en", TODAY);
    const before = JSON.stringify(full);
    expect(onlyQuestionsLeft(full).places).toEqual([]);
    expect(JSON.stringify(full)).toBe(before);
  });

  it("says in the text file that only those places are shown", () => {
    const left = onlyQuestionsLeft(buildRoundup(places(), [LIBRARY, BAKERY], NEEDS, checklist, "en", TODAY));
    const text = roundupToText(left, true, "en", TODAY, true);
    expect(text).toContain(`${COPY.roundup.showingLeft.en}\nPlaces on the shortlist: 1\n`);
    expect(text).not.toContain("Library");
    expect(roundupToText(left, true, "en", TODAY)).not.toContain(COPY.roundup.showingLeft.en);
  });
});

describe("ticks on random notes", () => {
  it("never count more asked or answered questions than there are, and the filter keeps exactly the unfinished places", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const rng = makeRng(seed);
      const list = groupPlaces(randomNotes(rng, 10), "en");
      const shortlist = list.map((p) => p.id);
      const needs: Requirement = { "step-free-entry": "yes", elevator: "yes" };
      const checklist: Record<string, Record<string, { asked: boolean; answer: string }>> = {};
      for (const p of list) {
        for (const k of FACT_KEYS) {
          if (rng() < 0.4) (checklist[p.id] ??= {})[k] = { asked: rng() < 0.7, answer: rng() < 0.5 ? "Noted" : "" };
        }
      }
      const r = buildRoundup(list, shortlist, needs, checklist as Checklist, "en", TODAY);
      for (const p of r.places) {
        expect(p.asked, String(seed)).toBeLessThanOrEqual(p.questions.length);
        expect(p.answered, String(seed)).toBeLessThanOrEqual(p.questions.length);
        for (const q of p.questions) expect(q.key in needs, String(seed)).toBe(true);
      }
      const left = onlyQuestionsLeft(r);
      expect(left.places.map((p) => p.place.id), String(seed)).toEqual(r.places.filter((p) => p.asked < p.questions.length).map((p) => p.place.id));
      expect(left.totals.places + r.totals.allAsked + r.totals.noQuestions, String(seed)).toBe(r.totals.places);
    }
  });
});
