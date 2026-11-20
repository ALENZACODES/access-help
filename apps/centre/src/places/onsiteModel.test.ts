import { describe, expect, it } from "vitest";
import { answerOnsiteStep, beginOnsite, emptyMeasureBook, onsiteBackToReview, onsiteGoToStep, putMeasures, skipOnsiteStep, type MeasureBook, type Measures, type OnsiteStep, type OnsiteWalk } from "./docs-bridge.js";
import { buildOnsiteScreen, fieldValue, isFilledIn, onsiteName, onsiteOptions, startOnsiteId, type QuestionScreen, type ReviewScreen } from "./onsiteModel.js";
import type { PlaceRecord } from "./types.js";

function place(over: Partial<PlaceRecord> = {}): PlaceRecord {
  return { id: "a1", lat: 43.85, lon: -79.43, name: "Sample Library", wheelchair: "limited", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-10", ...over } as PlaceRecord;
}

const NOTES: PlaceRecord[] = [place(), place({ id: "a2", name: null, observedOn: "2026-11-14" })];
const TODAY = "2026-11-19";
const SAVED: Measures = { recordId: "a1", measuredOn: "2026-11-12", method: "tape", steps: 2, stepHeightCm: 14, doorWidthCm: 82.5, doorOpening: null, ramp: null, toilet: null, toiletDoorCm: null };

function bookOf(...entries: Measures[]): MeasureBook {
  let book = emptyMeasureBook();
  for (const entry of entries) {
    const result = putMeasures(book, entry);
    if (result.ok) book = result.book;
  }
  return book;
}

function answered(pairs: [OnsiteStep, string][], from: OnsiteWalk = beginOnsite("a1", TODAY, null)): OnsiteWalk {
  let walk = from;
  for (const [step, value] of pairs) {
    const result = answerOnsiteStep(walk, step, value);
    if (!result.ok) throw new Error(`${step}: ${result.issue}`);
    walk = result.walk;
  }
  return walk;
}

const complete = () => answered([["steps", "2"], ["stepHeight", "14"], ["ramp", "no"], ["doorWidth", "82.5"], ["doorOpening", "button"], ["toilet", "yes"], ["toiletDoor", "86"], ["method", "tape"]]);
const question = (walk: OnsiteWalk, book = emptyMeasureBook(), unit: "cm" | "in" = "cm", lang: "en" | "fr" = "en") => buildOnsiteScreen(NOTES, book, walk, unit, TODAY, lang) as QuestionScreen;
const review = (walk: OnsiteWalk, book = emptyMeasureBook(), lang: "en" | "fr" = "en", today = TODAY) => buildOnsiteScreen(NOTES, book, walk, "cm", today, lang) as ReviewScreen;

describe("choosing a place", () => {
  it("names a place without a name in the person’s language", () => {
    expect(onsiteName({ name: null }, "en")).toBe("Place without a name");
    expect(onsiteName({ name: "  " }, "fr")).toBe("Lieu sans nom");
    expect(onsiteName({ name: " Sample Library " }, "en")).toBe("Sample Library");
  });
  it("lists the newest observation first and marks the measured ones", () => {
    const options = onsiteOptions(NOTES, bookOf(SAVED), "en");
    expect(options).toEqual([
      { id: "a2", measured: false, label: "Place without a name, 2026-11-14" },
      { id: "a1", measured: true, label: "Sample Library, 2026-11-10, has measures" },
    ]);
  });
  it("opens on the newest observation with no measures, or the newest of all", () => {
    expect(startOnsiteId(NOTES, emptyMeasureBook())).toBe("a2");
    expect(startOnsiteId(NOTES, bookOf({ ...SAVED, recordId: "a2" }))).toBe("a1");
    expect(startOnsiteId(NOTES, bookOf(SAVED, { ...SAVED, recordId: "a2" }))).toBe("a2");
    expect(startOnsiteId([], emptyMeasureBook())).toBeNull();
  });
  it("shows the chooser when nothing is in progress", () => {
    const screen = buildOnsiteScreen(NOTES, emptyMeasureBook(), null, "cm", TODAY, "en");
    expect(screen.kind).toBe("start");
    if (screen.kind === "start") {
      expect(screen.options).toHaveLength(2);
      expect(screen.note).toContain("it stays UNKNOWN");
    }
  });
  it("shows the chooser when the place in progress is no longer saved", () => {
    expect(buildOnsiteScreen(NOTES, emptyMeasureBook(), beginOnsite("gone", TODAY, null), "cm", TODAY, "en").kind).toBe("start");
  });
});

describe("a question", () => {
  it("shows the first question with a count control and no way back", () => {
    const screen = question(beginOnsite("a1", TODAY, null));
    expect(screen).toMatchObject({ kind: "question", name: "Sample Library", step: "steps", control: "count", position: "Question 1 of 7", value: "", range: "", filledIn: "", canGoBack: false, choices: [] });
    expect(screen.question).toBe("How many steps are there at the entrance you used?");
    expect(screen.progress).toBe("Answered: 0. Skipped, so UNKNOWN: 0. Still to come: 7.");
  });
  it("shows a length question with its range in the person’s unit", () => {
    const walk = answered([["steps", "2"]]);
    expect(question(walk)).toMatchObject({ step: "stepHeight", control: "length", range: "From 0.5 cm to 60 cm.", canGoBack: true });
    expect(question(walk, emptyMeasureBook(), "in").range).toBe("From 0.2 in to 23.6 in.");
  });
  it("shows a choice question with labelled choices", () => {
    const screen = question(answered([["steps", "0"]]));
    expect(screen).toMatchObject({ step: "ramp", control: "choice", position: "Question 2 of 6" });
    expect(screen.choices).toEqual([
      { value: "yes", label: "Yes, there is a ramp" },
      { value: "no", label: "No ramp" },
    ]);
  });
  it("is in French when asked", () => {
    const screen = question(answered([["steps", "0"]]), emptyMeasureBook(), "cm", "fr");
    expect(screen.position).toBe("Question 2 sur 6");
    expect(screen.choices[1]?.label).toBe("Aucune rampe");
  });
  it("puts a kept length in the field in the person’s unit and decimal style", () => {
    const walk = onsiteGoToStep(complete(), "doorWidth");
    expect(fieldValue(walk, "doorWidth", "cm", "en")).toBe("82.5");
    expect(fieldValue(walk, "doorWidth", "cm", "fr")).toBe("82,5");
    expect(fieldValue(walk, "doorWidth", "in", "en")).toBe("32.5");
    expect(fieldValue(walk, "steps", "in", "en")).toBe("2");
    expect(fieldValue(walk, "ramp", "in", "fr")).toBe("no");
    expect(question(walk, emptyMeasureBook(), "in").value).toBe("32.5");
  });
  it("says when an answer came from an earlier visit, and only then", () => {
    const book = bookOf(SAVED);
    const walk = beginOnsite("a1", TODAY, SAVED);
    expect(question(walk, book).filledIn).toBe("Filled in from what you saved on 2026-11-12. Keep it only if it is still so today.");
    expect(question(answered([["steps", "3"]], walk), book).filledIn).toContain("2026-11-12");
    const changed = onsiteGoToStep(answered([["steps", "3"]], walk), "steps");
    expect(question(changed, book).filledIn).toBe("");
    expect(isFilledIn(walk, "ramp", SAVED)).toBe(false);
    expect(isFilledIn(walk, "steps", null)).toBe(false);
    expect(isFilledIn(walk, "method", SAVED)).toBe(true);
  });
});

describe("the review", () => {
  it("lists every applicable question with its answer and a way to change it", () => {
    const screen = review(complete());
    expect(screen.kind).toBe("review");
    expect(screen.rows.map((row) => row.step)).toEqual(["steps", "stepHeight", "ramp", "doorWidth", "doorOpening", "toilet", "toiletDoor", "method"]);
    expect(screen.rows[3]).toMatchObject({ answer: "82.5 cm (32.5 in)" });
    expect(screen.rows[2]?.changeLabel).toMatch(/^Change: /);
    expect(screen.caption).toBe("Your answers for Sample Library. A skipped question reads UNKNOWN.");
  });
  it("shows UNKNOWN for a skipped question and leaves out the ones that do not apply", () => {
    let walk = answered([["steps", "0"]]);
    walk = skipOnsiteStep(walk, "ramp");
    walk = answered([["doorWidth", "90"], ["doorOpening", "manual"], ["toilet", "no"], ["method", "estimate"]], walk);
    const screen = review(walk);
    expect(screen.rows.map((row) => row.step)).toEqual(["steps", "ramp", "doorWidth", "doorOpening", "toilet", "method"]);
    expect(screen.rows[1]?.answer).toBe("UNKNOWN");
    expect(screen.measures).toMatchObject({ steps: 0, ramp: null, doorWidthCm: 90, toilet: "no", stepHeightCm: null });
  });
  it("offers nothing to save when everything was skipped", () => {
    let walk = beginOnsite("a1", TODAY, null);
    for (const step of ["steps", "stepHeight", "ramp", "doorWidth", "doorOpening", "toilet", "toiletDoor"] as const) walk = skipOnsiteStep(walk, step);
    const screen = review(walk);
    expect(screen.measures).toBeNull();
    expect(screen.blocked).toContain("nothing to save");
    expect(screen.effects).toEqual([]);
    expect(screen.rows.every((row) => row.answer === "UNKNOWN")).toBe(true);
  });
  it("offers nothing to save when the answers cannot pass the form’s checks", () => {
    const screen = review(complete(), emptyMeasureBook(), "en", "2026-11-01");
    expect(screen.measures).toBeNull();
    expect(screen.blocked).toBe("These answers cannot be saved as they are. Start again from the first question.");
  });
  it("calls every fact new when nothing is saved", () => {
    const screen = review(complete());
    expect(screen.effects).toHaveLength(7);
    expect(screen.effects.every((row) => row.effect === "New")).toBe(true);
    expect(screen.effectsSummary).toBe("New: 7. Changed: 0. The same: 0.");
  });
  it("tells same from changed against what is saved", () => {
    const screen = review(onsiteBackToReview(answered([["doorWidth", "90"]], onsiteGoToStep(complete(), "doorWidth"))), bookOf(SAVED));
    expect(screen.effects.filter((row) => row.effect === "Same as saved")).toHaveLength(2);
    expect(screen.effects.filter((row) => row.effect === "Changes what is saved")).toHaveLength(1);
    expect(screen.effectsSummary).toBe("New: 4. Changed: 1. The same: 2.");
  });
  it("warns when a saved fact would go back to UNKNOWN", () => {
    let walk = beginOnsite("a1", TODAY, SAVED);
    walk = skipOnsiteStep(onsiteGoToStep(walk, "doorWidth"), "doorWidth");
    walk = skipOnsiteStep(walk, "doorOpening");
    walk = skipOnsiteStep(walk, "toilet");
    walk = skipOnsiteStep(walk, "toiletDoor");
    walk = answered([["method", "tape"]], walk);
    const screen = review(walk, bookOf(SAVED));
    expect(screen.effects).toContainEqual(expect.objectContaining({ key: "doorWidthCm", effect: "Goes back to UNKNOWN" }));
    expect(screen.effectsSummary).toContain("Going back to UNKNOWN: 1.");
  });
  it("is in French when asked", () => {
    const screen = review(complete(), emptyMeasureBook(), "fr");
    expect(screen.caption).toBe("Vos réponses pour Sample Library. Une question passée indique UNKNOWN.");
    expect(screen.effects[0]?.effect).toBe("Nouveau");
    expect(screen.rows[3]?.changeLabel).toMatch(/^Modifier\u00a0: /);
  });
  it("dates the measures on the day the questions began", () => {
    expect(review(complete(), emptyMeasureBook(), "en", "2026-11-21").measures?.measuredOn).toBe(TODAY);
  });
});
