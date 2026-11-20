import { describe, expect, it } from "vitest";
import { askName, askOptions, askSheetFile, asksCsvFile, buildAskView, draftFile, startAskId, startQuestions, toldFormFor, type AskChoices, type AskData } from "./askModel.js";
import { emptyAskLog, emptyMeasureBook, putMeasures, recordAsk, setAskStatus, type AskLog, type MeasureBook, type Measures } from "./docs-bridge.js";
import type { PlaceRecord } from "./types.js";

function place(over: Partial<PlaceRecord> = {}): PlaceRecord {
  return { id: "a1", lat: 43.85, lon: -79.43, name: "Sample Library", wheelchair: "limited", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-10", ...over };
}

const NOTES: PlaceRecord[] = [place(), place({ id: "a2", name: null, wheelchair: "UNKNOWN", observedOn: "2026-11-14" })];
const TODAY = "2026-11-19";
const blank: Measures = { recordId: "a1", measuredOn: "2026-11-12", method: null, steps: null, stepHeightCm: null, doorWidthCm: null, doorOpening: null, ramp: null, toilet: null, toiletDoorCm: null };

function bookOf(...entries: Measures[]): MeasureBook {
  let book = emptyMeasureBook();
  for (const entry of entries) {
    const result = putMeasures(book, entry);
    if (result.ok) book = result.book;
  }
  return book;
}

function logOf(...asks: [string, string][]): AskLog {
  let log = emptyAskLog();
  for (const [recordId, askedOn] of asks) {
    const result = recordAsk(log, { recordId, askedOn, channel: "email", questions: ["doorWidthCm", "toilet"] }, TODAY);
    if (result.ok) log = result.log;
  }
  return log;
}

const MEASURED = bookOf({ ...blank, method: "tape", steps: 2, stepHeightCm: 14, doorWidthCm: 82.5 });
const TOLD = bookOf({ ...blank, measuredOn: "2026-11-16", steps: 2, doorWidthCm: 90, ramp: "yes" });
const data = (over: Partial<AskData> = {}): AskData => ({ records: NOTES, measures: emptyMeasureBook(), told: emptyMeasureBook(), log: emptyAskLog(), ...over });
const choices = (over: Partial<AskChoices> = {}): AskChoices => ({ questions: ["steps", "doorWidthCm"], channel: "email", letterLanguage: "en", withHints: false, ...over });

describe("asking page choices", () => {
  it("opens on the newest observation and lists them newest first", () => {
    expect(startAskId(NOTES)).toBe("a2");
    expect(startAskId([])).toBeNull();
    expect(askOptions(NOTES, "en")).toEqual([
      { id: "a2", label: "Place without a name, 2026-11-14" },
      { id: "a1", label: "Sample Library, 2026-11-10" },
    ]);
    expect(askName({ name: " " }, "fr")).toBe("Lieu sans nom");
  });
  it("ticks every question when nothing is measured, and only the UNKNOWN facts otherwise", () => {
    expect(startQuestions("a1", emptyMeasureBook())).toHaveLength(7);
    expect(startQuestions("a1", MEASURED)).toEqual(["doorOpening", "ramp", "toilet", "toiletDoorCm"]);
    expect(startQuestions("a2", MEASURED)).toHaveLength(7);
  });
  it("gives an empty form dated today, or the saved answers in the person’s decimal style", () => {
    expect(toldFormFor("a1", emptyMeasureBook(), TODAY, "en")).toMatchObject({ measuredOn: TODAY, doorWidth: "" });
    expect(toldFormFor("a1", bookOf({ ...blank, doorWidthCm: 82.5 }), TODAY, "fr")).toMatchObject({ measuredOn: "2026-11-12", doorWidth: "82,5" });
  });
});

describe("asking page view", () => {
  it("shows nothing when there is no observation or the id is not saved", () => {
    expect(buildAskView(data({ records: [] }), null, choices(), TODAY, "en").detail).toBeNull();
    expect(buildAskView(data(), "nope", choices(), TODAY, "en").detail).toBeNull();
  });
  it("always carries the privacy line and the note that what was said is kept apart", () => {
    const view = buildAskView(data({ records: [] }), null, choices(), TODAY, "en");
    expect(view.privacy).toMatch(/^The draft says nothing about you, your health or your body\./);
    expect(view.toldNote).toContain("never among the tags for OpenStreetMap");
  });
  it("shows the observation with status, source, licence, date and tier", () => {
    const detail = buildAskView(data(), "a2", choices(), TODAY, "en").detail;
    expect(detail?.name).toBe("Place without a name");
    expect(detail?.placeLine).toBe("Status: UNKNOWN. Source: own visit. Licence: CC0-1.0. Seen: 2026-11-14. Tier: UNKNOWN.");
  });
  it("lists every question and marks the ones already measured", () => {
    const detail = buildAskView(data({ measures: MEASURED }), "a1", choices(), TODAY, "en").detail;
    expect(detail?.questions).toHaveLength(7);
    expect(detail?.questions.filter((q) => q.measured).map((q) => q.key)).toEqual(["steps", "stepHeightCm", "doorWidthCm"]);
  });
  it("drafts a letter from the chosen questions, in the fixed order", () => {
    const detail = buildAskView(data(), "a1", choices({ questions: ["doorWidthCm", "steps"] }), TODAY, "en").detail;
    expect(detail?.letter.subject).toBe("A few questions about the entrance at Sample Library");
    expect(detail?.letter.text.indexOf("How many steps")).toBeLessThan(detail?.letter.text.indexOf("How wide is the clear opening") ?? 0);
    expect(detail?.letterNote).toMatch(/^Length: \d+ characters\.$/);
  });
  it("drafts in the letter language, not the page language", () => {
    const detail = buildAskView(data(), "a1", choices({ letterLanguage: "fr" }), TODAY, "en").detail;
    expect(detail?.letter.text.startsWith("Bonjour,")).toBe(true);
  });
  it("says to choose a question when none is ticked", () => {
    const view = buildAskView(data(), "a1", choices({ questions: [] }), TODAY, "en");
    expect(view.detail?.letter.text).toBe("");
    expect(view.detail?.letterNote).toBe("Choose at least one question to get a draft.");
    expect(draftFile(view, TODAY, "en")).toBeNull();
  });
  it("lists this place’s asks with a position and counts them", () => {
    const log = setAskStatus(logOf(["a1", "2026-11-11"], ["a2", "2026-11-12"], ["a1", "2026-11-15"]), 1, "answered", TODAY);
    const detail = buildAskView(data({ log }), "a1", choices(), TODAY, "en").detail;
    expect(detail?.asks.map((row) => [row.position, row.entry.askedOn])).toEqual([
      [1, "2026-11-11"],
      [2, "2026-11-15"],
    ]);
    expect(detail?.askCounts).toBe("Times you asked: 2. Waiting: 1. Answered: 1. No reply: 0.");
    expect(detail?.asks[1]?.line).toContain("Days since you asked: 4.");
  });
  it("sets what was measured beside what the place said", () => {
    const detail = buildAskView(data({ measures: MEASURED, told: TOLD }), "a1", choices(), TODAY, "en").detail;
    expect(detail?.hasTold).toBe(true);
    expect(detail?.compare.map((row) => [row.fact, row.measured, row.told, row.note])).toEqual([
      ["Number of steps", "2", "2", "The same"],
      ["Height of the highest step", "14 cm (5.5 in)", "UNKNOWN", "Only you measured it"],
      ["Width of the entrance door", "82.5 cm (32.5 in)", "90 cm (35.4 in)", "Differs. The place said 7.5 cm more than you measured."],
      ["How the door opens", "UNKNOWN", "UNKNOWN", "UNKNOWN from both"],
      ["Ramp", "UNKNOWN", "Yes", "Only the place said it"],
      ["Wheelchair toilet", "UNKNOWN", "UNKNOWN", "UNKNOWN from both"],
      ["Width of the toilet door", "UNKNOWN", "UNKNOWN", "UNKNOWN from both"],
    ]);
    expect(detail?.compareSummary).toMatch(/^The same: 1\. Different: 1\. Only you: 1\. Only the place: 1\. UNKNOWN from both: 3\./);
  });
  it("writes UNKNOWN on both sides when there is nothing at all", () => {
    const detail = buildAskView(data(), "a1", choices(), TODAY, "en").detail;
    expect(detail?.hasTold).toBe(false);
    expect(detail?.compare.every((row) => row.measured === "UNKNOWN" && row.told === "UNKNOWN")).toBe(true);
  });
  it("writes French for the same view", () => {
    const detail = buildAskView(data({ measures: MEASURED, told: TOLD }), "a1", choices({ letterLanguage: "fr" }), TODAY, "fr").detail;
    expect(detail?.compare[2]?.note).toBe("Diffère. Le lieu a dit 7,5 cm de plus que votre mesure.");
    expect(detail?.letter.subject).toBe("Quelques questions sur l’entrée de Sample Library");
  });
});

describe("asking page files", () => {
  it("makes a draft file named by channel and day", () => {
    const file = draftFile(buildAskView(data(), "a1", choices({ channel: "phone" }), TODAY, "en"), TODAY, "en");
    expect(file).toMatchObject({ filename: "ask-phone-2026-11-19.txt", mime: "text/plain" });
    expect(file?.content).toContain("Is now a good time?");
  });
  it("puts the subject first in an email draft file", () => {
    expect(draftFile(buildAskView(data(), "a1", choices(), TODAY, "en"), TODAY, "en")?.content.startsWith("Subject: ")).toBe(true);
  });
  it("makes no sheet when there is no ask and nothing was said", () => {
    const d = data({ measures: MEASURED });
    expect(askSheetFile(d, buildAskView(d, "a1", choices(), TODAY, "en"), TODAY, "en")).toBeNull();
  });
  it("makes a sheet once there is an ask or an answer", () => {
    const d = data({ told: TOLD });
    const file = askSheetFile(d, buildAskView(d, "a1", choices(), TODAY, "en"), TODAY, "en");
    expect(file).toMatchObject({ filename: "asked-a1.txt" });
    expect(file?.content).toContain("- Ramp | you: UNKNOWN | the place: Yes | Only the place said it");
    expect(file?.content).not.toMatch(/^[\w:]+=/m);
  });
  it("makes a CSV of asks for saved observations only", () => {
    const d = data({ log: logOf(["a1", "2026-11-11"], ["gone", "2026-11-12"]) });
    const file = asksCsvFile(d, TODAY);
    expect(file).toMatchObject({ filename: "asks-2026-11-19.csv", mime: "text/csv" });
    expect(file?.content.trim().split("\r\n")).toHaveLength(2);
    expect(asksCsvFile(data(), TODAY)).toBeNull();
  });
});
