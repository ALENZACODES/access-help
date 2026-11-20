import { describe, expect, it } from "vitest";
import { emptyMeasureBook, putMeasures, type MatchCriteria, type MeasureBook, type Measures } from "./docs-bridge.js";
import { buildMatchView, matchFile, type MatchData } from "./matchModel.js";
import type { PlaceRecord } from "./types.js";

function place(over: Partial<PlaceRecord> = {}): PlaceRecord {
  return { id: "a1", lat: 43.85, lon: -79.43, name: "Sample Library", wheelchair: "limited", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-10", ...over };
}

const NOTES: PlaceRecord[] = [place(), place({ id: "a2", name: "Sample Arena" }), place({ id: "a3", name: null, wheelchair: "UNKNOWN" })];
const TODAY = "2026-11-19";
const blank = (recordId: string): Measures => ({ recordId, measuredOn: "2026-11-12", method: "tape", steps: null, stepHeightCm: null, doorWidthCm: null, doorOpening: null, ramp: null, toilet: null, toiletDoorCm: null });

function bookOf(...entries: Measures[]): MeasureBook {
  let book = emptyMeasureBook();
  for (const entry of entries) {
    const result = putMeasures(book, entry);
    if (result.ok) book = result.book;
  }
  return book;
}

const NOTHING: MatchCriteria = { maxSteps: null, rampInstead: false, maxStepHeightCm: null, minDoorWidthCm: null, door: "any", toilet: false, minToiletDoorCm: null, countTold: false };
const numbers = (over: Partial<MatchCriteria> = {}): MatchCriteria => ({ ...NOTHING, maxSteps: 0, minDoorWidthCm: 80, ...over });
const DATA: MatchData = {
  records: NOTES,
  measures: bookOf({ ...blank("a1"), steps: 0, doorWidthCm: 90 }, { ...blank("a2"), steps: 3, doorWidthCm: 76 }, { ...blank("gone"), steps: 0, doorWidthCm: 90 }),
  told: bookOf({ ...blank("a3"), method: null, steps: 0, doorWidthCm: 85 }),
};

describe("numbers page view", () => {
  it("always carries the line that the numbers are the person’s own", () => {
    expect(buildMatchView({ records: [], measures: emptyMeasureBook(), told: emptyMeasureBook() }, NOTHING, "en").yours).toMatch(/^The numbers are yours\. The App suggests none/);
  });
  it("shows no group and no number when nothing is set", () => {
    const view = buildMatchView(DATA, NOTHING, "en");
    expect(view.hasCriteria).toBe(false);
    expect(view.numbers).toEqual([]);
    expect(view.groups).toEqual([]);
    expect(view.toldNote).toBe("");
  });
  it("lists the numbers in use", () => {
    expect(buildMatchView(DATA, numbers(), "en").numbers).toEqual(["No step at the entrance", "Entrance door at least 80 cm wide"]);
  });
  it("sorts the places into three groups, with counts in the headings", () => {
    const view = buildMatchView(DATA, numbers(), "en");
    expect(view.groups.map((group) => [group.overall, group.heading, group.places.map((p) => p.id)])).toEqual([
      ["fits", "Within every number you set (1)", ["a1"]],
      ["cannot-say", "Cannot be said: a fact is UNKNOWN (1)", ["a3"]],
      ["does-not-fit", "Outside a number you set (1)", ["a2"]],
    ]);
    expect(view.counts).toBe("Places looked through: 3. Within every number: 1. Outside a number: 1. Cannot be said: 1.");
  });
  it("ignores measures for an observation that is no longer saved", () => {
    expect(buildMatchView(DATA, numbers(), "en").run.rows.map((row) => row.place.id).sort()).toEqual(["a1", "a2", "a3"]);
  });
  it("gives each place its record line, its checks and what is UNKNOWN", () => {
    const view = buildMatchView(DATA, numbers(), "en");
    const unknown = view.groups[1]?.places[0];
    expect(unknown?.name).toBe("Place without a name");
    expect(unknown?.placeLine).toBe("Status: UNKNOWN. Source: own visit. Licence: CC0-1.0. Seen: 2026-11-10. Tier: UNKNOWN.");
    expect(unknown?.checks).toEqual(["No step at the entrance: UNKNOWN.", "Entrance door at least 80 cm wide: UNKNOWN."]);
    expect(unknown?.unknown).toBe("UNKNOWN: number of steps and width of the entrance door.");
    expect(view.groups[2]?.places[0]?.checks[1]).toBe("Entrance door at least 80 cm wide: 76 cm, 4 cm less than the number you set.");
    expect(view.groups[0]?.places[0]?.unknown).toBe("");
  });
  it("tallies what is UNKNOWN", () => {
    expect(buildMatchView(DATA, numbers(), "en").tally).toEqual(["UNKNOWN at 1 place: width of the entrance door.", "UNKNOWN at 1 place: number of steps."]);
  });
  it("uses what a place said only when asked to, and says so", () => {
    const view = buildMatchView(DATA, numbers({ countTold: true }), "en");
    expect(view.toldNote).toContain("Your own measure always comes first.");
    expect(view.groups.map((group) => group.overall)).toEqual(["fits", "does-not-fit"]);
    expect(view.groups[0]?.places.find((p) => p.id === "a3")?.checks[0]).toBe("No step at the entrance: no step. This comes from what the place said, not from your own measure.");
    expect(view.tally).toEqual([]);
  });
  it("leaves out a group with no place in it", () => {
    const view = buildMatchView(DATA, numbers({ maxSteps: 5, minDoorWidthCm: 70, countTold: true }), "en");
    expect(view.groups.map((group) => group.overall)).toEqual(["fits"]);
  });
  it("writes French for the same view", () => {
    const view = buildMatchView(DATA, numbers(), "fr");
    expect(view.groups[0]?.heading).toBe("Dans tous les chiffres que vous avez fixés (1)");
    expect(view.groups[1]?.places[0]?.name).toBe("Lieu sans nom");
    expect(view.numbers[1]).toBe("Porte d’entrée large d’au moins 80 cm");
  });
});

describe("numbers page files", () => {
  it("makes no file when nothing is set or there is no place", () => {
    expect(matchFile("txt", buildMatchView(DATA, NOTHING, "en"), NOTHING, TODAY, "en")).toBeNull();
    const empty = { records: [], measures: emptyMeasureBook(), told: emptyMeasureBook() };
    expect(matchFile("csv", buildMatchView(empty, numbers(), "en"), numbers(), TODAY, "en")).toBeNull();
  });
  it("makes a text file and a CSV named by the day", () => {
    const view = buildMatchView(DATA, numbers(), "en");
    const text = matchFile("txt", view, numbers(), TODAY, "en");
    expect(text).toMatchObject({ filename: "places-against-my-numbers-2026-11-19.txt", mime: "text/plain" });
    expect(text?.content).toContain("Outside a number you set: 1\n* Sample Arena.");
    const csv = matchFile("csv", view, numbers(), TODAY, "en");
    expect(csv).toMatchObject({ filename: "places-against-my-numbers-2026-11-19.csv", mime: "text/csv" });
    expect(csv?.content.trim().split("\r\n")).toHaveLength(4);
  });
});
