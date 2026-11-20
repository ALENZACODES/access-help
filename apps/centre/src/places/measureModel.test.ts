import { describe, expect, it } from "vitest";
import { emptyMeasureBook, putMeasures, type MeasureBook, type Measures } from "./docs-bridge.js";
import { buildMeasureView, formFor, measureName, measureOptions, measureSheetFile, measuresCsvFile, startMeasureId } from "./measureModel.js";
import type { PlaceRecord } from "./types.js";

function place(over: Partial<PlaceRecord> = {}): PlaceRecord {
  return { id: "a1", lat: 43.85, lon: -79.43, name: "Sample Library", wheelchair: "limited", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-10", ...over };
}

const NOTES: PlaceRecord[] = [place(), place({ id: "a2", name: null, wheelchair: "UNKNOWN", observedOn: "2026-11-14" }), place({ id: "a3", name: "Sample Arena", wheelchair: "no", observedOn: "2026-11-12" })];
const TODAY = "2026-11-19";

function measured(recordId: string, over: Partial<Measures> = {}): Measures {
  return { recordId, measuredOn: "2026-11-12", method: "tape", steps: 2, stepHeightCm: 14, doorWidthCm: 82.5, doorOpening: "button", ramp: "no", toilet: "yes", toiletDoorCm: 86, ...over };
}

function bookOf(...entries: Measures[]): MeasureBook {
  let book = emptyMeasureBook();
  for (const entry of entries) {
    const result = putMeasures(book, entry);
    if (result.ok) book = result.book;
  }
  return book;
}

describe("measuring page choices", () => {
  it("opens on the newest observation with no measures", () => {
    expect(startMeasureId(NOTES, emptyMeasureBook())).toBe("a2");
    expect(startMeasureId(NOTES, bookOf(measured("a2")))).toBe("a3");
  });
  it("opens on the newest of all when every one is measured", () => {
    expect(startMeasureId(NOTES, bookOf(measured("a1"), measured("a2"), measured("a3")))).toBe("a2");
    expect(startMeasureId([], emptyMeasureBook())).toBeNull();
  });
  it("lists observations newest first and marks the measured ones", () => {
    expect(measureOptions(NOTES, bookOf(measured("a3")), "en")).toEqual([
      { id: "a2", label: "Place without a name, 2026-11-14" },
      { id: "a3", label: "Sample Arena, 2026-11-12, measured" },
      { id: "a1", label: "Sample Library, 2026-11-10" },
    ]);
    expect(measureOptions(NOTES, bookOf(measured("a3")), "fr")[1]?.label).toBe("Sample Arena, 2026-11-12, mesuré");
  });
  it("names a blank name as a place without a name", () => {
    expect(measureName({ name: " " }, "fr")).toBe("Lieu sans nom");
  });
  it("gives an empty form dated today when nothing is saved", () => {
    expect(formFor(place(), emptyMeasureBook(), TODAY, "en")).toMatchObject({ measuredOn: TODAY, steps: "", doorWidth: "", ramp: "" });
  });
  it("fills the form from saved measures in the person’s decimal style", () => {
    expect(formFor(place(), bookOf(measured("a1")), TODAY, "en").doorWidth).toBe("82.5");
    expect(formFor(place(), bookOf(measured("a1")), TODAY, "fr").doorWidth).toBe("82,5");
    expect(formFor(place(), bookOf(measured("a1")), TODAY, "en").measuredOn).toBe("2026-11-12");
  });
});

describe("measuring page view", () => {
  it("shows nothing when there is no observation or the id is not saved", () => {
    expect(buildMeasureView([], emptyMeasureBook(), null, "en").detail).toBeNull();
    const gone = buildMeasureView(NOTES, emptyMeasureBook(), "nope", "en");
    expect(gone.detail).toBeNull();
    expect(gone.options).toHaveLength(3);
  });
  it("always carries the no-judgment line and the note about the tags", () => {
    const view = buildMeasureView([], emptyMeasureBook(), null, "en");
    expect(view.noJudgment).toContain("does not say who can use the place");
    expect(view.tagsNote).toContain("the App adds nothing to the map");
  });
  it("shows the observation with status, source, licence, date and tier", () => {
    const view = buildMeasureView(NOTES, emptyMeasureBook(), "a2", "en");
    expect(view.detail?.name).toBe("Place without a name");
    expect(view.detail?.placeLine).toBe("Status: UNKNOWN. Source: own visit. Licence: CC0-1.0. Seen: 2026-11-14. Tier: UNKNOWN.");
    expect(view.detail?.saved).toBeNull();
  });
  it("counts measured observations, ignoring measures for ones that are not saved", () => {
    expect(buildMeasureView(NOTES, bookOf(measured("a1"), measured("gone")), "a1", "en").counts).toBe("Observations with measures: 1. Without: 2.");
  });
  it("shows the saved facts, the description and the tags", () => {
    const saved = buildMeasureView(NOTES, bookOf(measured("a1")), "a1", "en").detail?.saved;
    expect(saved?.measuredLine).toBe("Measured on 2026-11-12. With a tape.");
    expect(saved?.facts.map((f) => [f.label, f.value])).toEqual([
      ["Steps at the entrance", "2"],
      ["Highest step", "14 cm (5.5 in)"],
      ["Entrance door width", "82.5 cm (32.5 in)"],
      ["How the door opens", "With a button"],
      ["Ramp", "No"],
      ["Wheelchair toilet", "Yes"],
      ["Toilet door width", "86 cm (33.9 in)"],
    ]);
    expect(saved?.stillUnknown).toBe("");
    expect(saved?.description).toMatch(/^2 steps at the entrance, highest 14 cm\./);
    expect(saved?.descriptionNote).toBe("Length: 189 / 255.");
    expect(saved?.tags.split("\n").map((line) => line.split("=")[0])).toEqual(["wheelchair:description:en", "toilets:wheelchair"]);
  });
  it("writes UNKNOWN for what was not measured and names it", () => {
    const sparse = measured("a1", { method: null, steps: null, stepHeightCm: null, doorOpening: null, ramp: null, toilet: null, toiletDoorCm: null });
    const saved = buildMeasureView(NOTES, bookOf(sparse), "a1", "en").detail?.saved;
    expect(saved?.measuredLine).toBe("Measured on 2026-11-12. How the lengths were taken: UNKNOWN.");
    expect(saved?.facts.filter((f) => f.value === "UNKNOWN").map((f) => f.key)).toEqual(["steps", "stepHeightCm", "doorOpening", "ramp", "toilet", "toiletDoorCm"]);
    expect(saved?.stillUnknown).toMatch(/^Still UNKNOWN: steps at the entrance,/);
    expect(saved?.tags).toBe("wheelchair:description:en=Entrance door 82.5 cm wide. Noted on 2026-11-12.");
  });
  it("never puts a wheelchair status among the tags, whatever the observation says", () => {
    for (const id of ["a1", "a3"]) {
      const saved = buildMeasureView(NOTES, bookOf(measured(id)), id, "en").detail?.saved;
      expect(saved?.tags).not.toMatch(/^wheelchair=/m);
    }
  });
  it("writes French for the same view", () => {
    const view = buildMeasureView(NOTES, bookOf(measured("a1")), "a1", "fr");
    expect(view.detail?.saved?.facts[2]).toEqual({ key: "doorWidthCm", label: "Largeur de la porte d’entrée", value: "82,5 cm (32,5 po)" });
    expect(view.detail?.saved?.tags).toMatch(/^wheelchair:description:fr=2 marches/);
    expect(view.counts).toBe("Observations avec des mesures : 1. Sans : 2.");
  });
});

describe("measuring page files", () => {
  it("makes no sheet when the observation has no measures", () => {
    expect(measureSheetFile(buildMeasureView(NOTES, emptyMeasureBook(), "a1", "en"), "en")).toBeNull();
    expect(measureSheetFile(buildMeasureView([], emptyMeasureBook(), null, "en"), "en")).toBeNull();
  });
  it("makes a sheet named by the observation id", () => {
    const file = measureSheetFile(buildMeasureView(NOTES, bookOf(measured("a1")), "a1", "en"), "en");
    expect(file).toMatchObject({ filename: "measures-a1.txt", mime: "text/plain" });
    expect(file?.content).toContain("Measures: Sample Library");
  });
  it("makes a CSV of every measured observation that is still saved", () => {
    const file = measuresCsvFile(NOTES, bookOf(measured("a1"), measured("a3"), measured("gone")), TODAY);
    expect(file).toMatchObject({ filename: "measures-2026-11-19.csv", mime: "text/csv" });
    expect(file?.content.trim().split("\r\n")).toHaveLength(3);
  });
  it("makes no CSV when nothing is measured", () => {
    expect(measuresCsvFile(NOTES, emptyMeasureBook(), TODAY)).toBeNull();
    expect(measuresCsvFile(NOTES, bookOf(measured("gone")), TODAY)).toBeNull();
  });
});
