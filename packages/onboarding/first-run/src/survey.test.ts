import { describe, expect, it } from "vitest";
import { CONTRIBUTOR_SOURCE, FACT_KEYS, groupPlaces, memoryStore, parseNote, type Place } from "./index";
import {
  MAX_STOPS,
  SURVEY_KEY,
  addPlaceStop,
  addStop,
  answerQuestion,
  backToPlan,
  clearSurvey,
  currentQuestion,
  editAnswer,
  emptySurvey,
  hasAnswer,
  isEmptySurvey,
  leaveStop,
  loadSurvey,
  moveStop,
  openKeys,
  parseSurvey,
  removeStop,
  savedValue,
  saveSurvey,
  setLicence,
  setObservedOn,
  startErrors,
  startSurvey,
  stepBack,
  stopForm,
  stopId,
  surveyProgress,
  surveyToNotes,
  type Survey,
} from "./survey";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));

function ok(r: { ok: true; survey: Survey } | { ok: false }): Survey {
  if (!r.ok) throw new Error("expected ok");
  return r.survey;
}

/** Two places, the licence chosen, ready to start. */
function ready(): Survey {
  let s = emptySurvey(TODAY);
  s = ok(addStop(s, "Library", "1 Main St", TODAY));
  s = ok(addStop(s, "Bakery", "", TODAY, ["elevator", "step-free-entry"]));
  return setLicence(s, "CC0-1.0");
}

function asking(): Survey {
  return ok(startSurvey(ready(), TODAY));
}

let n = 0;
const ids = (): string => `s${++n}`;

describe("emptySurvey", () => {
  it("starts with no places, no licence and today as the visit date", () => {
    const s = emptySurvey(TODAY);
    expect(s).toEqual({ stops: [], observedOn: "2026-11-19", licence: "", phase: "plan", stop: 0, q: 0, fromReview: false });
    expect(isEmptySurvey(s)).toBe(true);
    expect(isEmptySurvey(setLicence(s, "CC0-1.0"))).toBe(false);
  });
});

describe("addStop", () => {
  it("adds a place with every detail by default, in the App's order, and nothing answered", () => {
    const s = ok(addStop(emptySurvey(TODAY), "  Library ", " 1 Main St ", TODAY));
    expect(s.stops).toEqual([{ id: stopId("Library", "1 Main St"), placeName: "Library", address: "1 Main St", keys: FACT_KEYS, answers: {} }]);
  });

  it("keeps only the asked details, in the App's order, each once", () => {
    const s = ok(addStop(emptySurvey(TODAY), "Bakery", "", TODAY, ["elevator", "step-free-entry", "elevator"]));
    expect(s.stops[0]?.keys).toEqual(["step-free-entry", "elevator"]);
  });

  it("uses the add-a-note form's rules for the name and address", () => {
    const e = emptySurvey(TODAY);
    expect(addStop(e, "  ", "", TODAY)).toEqual({ ok: false, errors: [{ field: "placeName", code: "required" }] });
    expect(addStop(e, "x".repeat(500), "", TODAY)).toEqual({ ok: false, errors: [{ field: "placeName", code: "too-long" }] });
    expect(addStop(e, "Cafe", "me@example.com", TODAY)).toEqual({ ok: false, errors: [{ field: "address", code: "personal-email" }] });
    expect(addStop(e, "Cafe", "416 555 0199", TODAY)).toEqual({ ok: false, errors: [{ field: "address", code: "personal-phone" }] });
    expect(addStop(e, "Ca\u0007fe", "", TODAY)).toEqual({ ok: false, errors: [{ field: "placeName", code: "control-chars" }] });
  });

  it("refuses the same place twice, ignoring case, accents and punctuation", () => {
    const s = ok(addStop(emptySurvey(TODAY), "Café Bleu", "1 Main St.", TODAY));
    expect(addStop(s, "cafe bleu", "1 main st", TODAY)).toEqual({ ok: false, errors: [{ field: "placeName", code: "duplicate" }] });
    expect(addStop(s, "Cafe Bleu", "2 Main St", TODAY).ok).toBe(true);
  });

  it("holds at most 12 places and needs at least one detail", () => {
    let s = emptySurvey(TODAY);
    for (let i = 0; i < MAX_STOPS; i++) s = ok(addStop(s, `Shop ${i}`, "", TODAY));
    expect(addStop(s, "One more", "", TODAY)).toEqual({ ok: false, errors: [{ field: "stops", code: "full" }] });
    expect(addStop(emptySurvey(TODAY), "Cafe", "", TODAY, [])).toEqual({ ok: false, errors: [{ field: "stops", code: "no-keys" }] });
  });
});

describe("adding a place from the notes", () => {
  const places = (): Place[] =>
    groupPlaces(
      [
        testNote("a", "Arena", [{ key: "elevator", value: "yes" }, { key: "step-free-entry", value: "yes" }]),
        testNote("b", "Arena", [{ key: "elevator", value: "no" }]),
        testNote("c", "Done", FACT_KEYS.map((key) => ({ key, value: "yes" as const })), "2 Main St"),
      ],
      "en",
    );

  it("asks only the details with no record or with reports that differ", () => {
    const arena = places().find((p) => p.name === "Arena") as Place;
    expect(openKeys(arena)).toEqual(["accessible-washroom", "automatic-door", "elevator"]);
    const s = ok(addPlaceStop(emptySurvey(TODAY), arena, TODAY));
    expect(s.stops[0]?.keys).toEqual(["accessible-washroom", "automatic-door", "elevator"]);
    expect(s.stops[0]?.id).toBe(arena.id);
  });

  it("has nothing to ask at a place where every report agrees", () => {
    const done = places().find((p) => p.name === "Done") as Place;
    expect(openKeys(done)).toEqual([]);
    expect(addPlaceStop(emptySurvey(TODAY), done, TODAY)).toEqual({ ok: false, errors: [{ field: "stops", code: "no-keys" }] });
  });
});

describe("planning", () => {
  it("removes and moves places, ignoring indexes out of range", () => {
    const s = ready();
    expect(removeStop(s, 0).stops.map((x) => x.placeName)).toEqual(["Bakery"]);
    expect(removeStop(s, 5)).toBe(s);
    expect(removeStop(s, -1)).toBe(s);
    expect(moveStop(s, 1, -1).stops.map((x) => x.placeName)).toEqual(["Bakery", "Library"]);
    expect(moveStop(s, 0, -1)).toBe(s);
    expect(moveStop(s, 1, 1)).toBe(s);
    expect(moveStop(s, 0.5, 1)).toBe(s);
  });

  it("accepts only an open licence and keeps the date as typed, up to 10 characters", () => {
    expect(setLicence(ready(), "All rights reserved").licence).toBe("");
    expect(setLicence(ready(), "ODbL-1.0").licence).toBe("ODbL-1.0");
    expect(setObservedOn(ready(), " 2026-11-01 ").observedOn).toBe("2026-11-01");
    expect(setObservedOn(ready(), "2026-11-0112345").observedOn).toBe("2026-11-01");
  });

  it("will not start without a place, a licence and a valid past date", () => {
    const e = emptySurvey(TODAY);
    expect(startErrors(e, TODAY)).toEqual([
      { field: "stops", code: "no-stops" },
      { field: "licence", code: "licence-required" },
    ]);
    expect(startErrors(setObservedOn(ready(), "2026-11-20"), TODAY)).toEqual([{ field: "observedOn", code: "future-date" }]);
    expect(startErrors(setObservedOn(ready(), "2026-02-30"), TODAY)).toEqual([{ field: "observedOn", code: "bad-date" }]);
    expect(startSurvey(e, TODAY).ok).toBe(false);
    expect(startErrors(ready(), TODAY)).toEqual([]);
  });
});

describe("asking", () => {
  it("starts at the first question of the first place", () => {
    const s = asking();
    expect(s.phase).toBe("ask");
    expect(currentQuestion(s)).toMatchObject({ stopIndex: 0, q: 0, key: "step-free-entry" });
    expect(surveyProgress(s)).toEqual({ done: 0, total: 6 });
  });

  it("moves through every question, then on to the next place, then to the review", () => {
    let s = asking();
    const seen: string[] = [];
    while (s.phase === "ask") {
      const c = currentQuestion(s);
      seen.push(`${c?.stop.placeName}:${c?.key}`);
      s = answerQuestion(s, "yes");
    }
    expect(seen).toEqual([
      "Library:step-free-entry",
      "Library:accessible-washroom",
      "Library:automatic-door",
      "Library:elevator",
      "Bakery:step-free-entry",
      "Bakery:elevator",
    ]);
    expect(s.phase).toBe("review");
    expect(surveyProgress(s)).toEqual({ done: 6, total: 6 });
  });

  it("goes back one question at a time, across places, and keeps the answers", () => {
    let s = asking();
    for (let i = 0; i < 4; i++) s = answerQuestion(s, "no");
    expect(currentQuestion(s)).toMatchObject({ stopIndex: 1, q: 0 });
    s = stepBack(s);
    expect(currentQuestion(s)).toMatchObject({ stopIndex: 0, q: 3, key: "elevator" });
    expect(currentQuestion(s)?.stop.answers.elevator).toBe("no");
    for (let i = 0; i < 3; i++) s = stepBack(s);
    expect(currentQuestion(s)).toMatchObject({ stopIndex: 0, q: 0 });
    s = stepBack(s);
    expect(s.phase).toBe("plan");
    expect(surveyProgress(s).done).toBe(4);
  });

  it("from the review, goes back to the last question", () => {
    let s = asking();
    while (s.phase === "ask") s = answerQuestion(s, "unknown");
    s = stepBack(s);
    expect(currentQuestion(s)).toMatchObject({ stopIndex: 1, q: 1, key: "elevator" });
  });

  it("leaving a place leaves its unanswered questions UNKNOWN and moves to the next place", () => {
    let s = answerQuestion(asking(), "yes");
    s = leaveStop(s);
    expect(currentQuestion(s)).toMatchObject({ stopIndex: 1, q: 0 });
    const lib = s.stops[0];
    expect(lib?.answers).toEqual({ "step-free-entry": "yes", "accessible-washroom": "unknown", "automatic-door": "unknown", elevator: "unknown" });
    s = leaveStop(s);
    expect(s.phase).toBe("review");
  });

  it("does nothing outside the asking phase", () => {
    const s = ready();
    expect(answerQuestion(s, "yes")).toBe(s);
    expect(leaveStop(s)).toBe(s);
    expect(stepBack(s)).toBe(s);
    expect(currentQuestion(s)).toBeUndefined();
  });

  it("restarts at the first question not answered yet", () => {
    let s = asking();
    s = answerQuestion(answerQuestion(s, "yes"), "no");
    s = backToPlan(s);
    s = ok(startSurvey(s, TODAY));
    expect(currentQuestion(s)).toMatchObject({ stopIndex: 0, q: 2 });
  });

  it("goes straight to the review when every question has an answer", () => {
    let s = asking();
    while (s.phase === "ask") s = answerQuestion(s, "yes");
    s = ok(startSurvey(backToPlan(s), TODAY));
    expect(s.phase).toBe("review");
  });
});

describe("changing one answer from the review", () => {
  it("opens that question and comes back to the review after answering", () => {
    let s = asking();
    while (s.phase === "ask") s = answerQuestion(s, "yes");
    s = editAnswer(s, 1, "elevator");
    expect(currentQuestion(s)).toMatchObject({ stopIndex: 1, key: "elevator" });
    expect(s.fromReview).toBe(true);
    s = answerQuestion(s, "no");
    expect(s.phase).toBe("review");
    expect(s.fromReview).toBe(false);
    expect(s.stops[1]?.answers.elevator).toBe("no");
  });

  it("going back or leaving also returns to the review", () => {
    let s = asking();
    while (s.phase === "ask") s = answerQuestion(s, "yes");
    expect(stepBack(editAnswer(s, 0, "elevator")).phase).toBe("review");
    expect(leaveStop(editAnswer(s, 0, "elevator")).phase).toBe("review");
  });

  it("ignores a place or a detail that is not in the survey", () => {
    const s = asking();
    expect(editAnswer(s, 9, "elevator")).toBe(s);
    expect(editAnswer(s, 1, "automatic-door")).toBe(s);
  });
});

describe("saving", () => {
  it("treats anything not answered Yes or No as UNKNOWN", () => {
    let s = answerQuestion(asking(), "yes");
    s = answerQuestion(s, "unknown");
    const lib = s.stops[0];
    if (!lib) throw new Error("no stop");
    expect(FACT_KEYS.map((k) => savedValue(lib, k))).toEqual(["yes", "unknown", "unknown", "unknown"]);
    expect(hasAnswer(lib)).toBe(true);
    expect(hasAnswer(s.stops[1] as Survey["stops"][number])).toBe(false);
  });

  it("builds one note per place with an answer, with source, licence and date on every Yes or No", () => {
    let s = setObservedOn(asking(), "2026-11-18");
    s = answerQuestion(s, "yes");
    s = leaveStop(s);
    while (s.phase === "ask") s = answerQuestion(s, "unknown");
    const out = surveyToNotes(s, TODAY, ids);
    expect(out.skipped).toEqual(["Bakery"]);
    expect(out.notes).toHaveLength(1);
    const note = out.notes[0];
    expect(note?.placeName).toBe("Library");
    expect(note?.address).toBe("1 Main St");
    expect(note?.licence).toBe("CC0-1.0");
    expect(note?.facts.find((f) => f.key === "step-free-entry")).toEqual({
      key: "step-free-entry",
      value: "yes",
      provenance: { source: CONTRIBUTOR_SOURCE, licence: "CC0-1.0", recordedOn: "2026-11-18" },
    });
    for (const f of note?.facts.filter((x) => x.key !== "step-free-entry") ?? []) expect(f).toEqual({ key: f.key, value: "unknown", provenance: undefined });
    // The App's own reader accepts the note as it is.
    expect(parseNote(JSON.parse(JSON.stringify(note)))).toEqual(note);
  });

  it("gives the form values the add-a-note form would have", () => {
    const s = answerQuestion(asking(), "no");
    expect(stopForm(s, s.stops[1] as Survey["stops"][number])).toEqual({
      placeName: "Bakery",
      address: "",
      details: { "step-free-entry": "unknown", "accessible-washroom": "unknown", "automatic-door": "unknown", elevator: "unknown" },
      observedOn: "2026-11-19",
      licence: "CC0-1.0",
      note: "",
    });
  });

  it("refuses to build notes when the licence is missing, like the form", () => {
    const s = answerQuestion(asking(), "yes");
    expect(() => surveyToNotes(setLicence(s, ""), TODAY, ids)).toThrow(/licence-required/);
  });
});

describe("keeping the survey on this device", () => {
  it("saves and reads back the same walk", () => {
    const store = memoryStore();
    const s = answerQuestion(asking(), "yes");
    expect(saveSurvey(store, s)).toBe("saved");
    expect(loadSurvey(store, TODAY)).toEqual(s);
  });

  it("removes the saved walk when it is empty, and on clear", () => {
    const store = memoryStore();
    saveSurvey(store, ready());
    expect(saveSurvey(store, emptySurvey(TODAY))).toBe("cleared");
    expect(store.getItem(SURVEY_KEY)).toBeNull();
    saveSurvey(store, ready());
    clearSurvey(store);
    expect(loadSurvey(store, TODAY)).toBeUndefined();
  });

  it("says when the device will not keep it", () => {
    const broken = { getItem: () => null, setItem: () => { throw new Error("full"); }, removeItem: () => undefined };
    expect(saveSurvey(broken, ready())).toBe("unavailable");
    expect(saveSurvey(undefined, ready())).toBe("unavailable");
    const throwing = { getItem: () => { throw new Error("no"); }, setItem: () => undefined, removeItem: () => undefined };
    expect(loadSurvey(throwing, TODAY)).toBeUndefined();
  });

  it("reads saved text defensively: bad places dropped, bad answers ignored, bad position back to planning", () => {
    expect(parseSurvey(null, TODAY)).toBeUndefined();
    expect(parseSurvey("{not json", TODAY)).toBeUndefined();
    expect(parseSurvey("[]", TODAY)).toBeUndefined();
    const raw = JSON.stringify({
      stops: [
        { placeName: "Library", address: "1 Main St", keys: ["elevator", "nonsense"], answers: { elevator: "maybe", "step-free-entry": "yes" } },
        { placeName: "", keys: ["elevator"] },
        { placeName: "Cafe", address: "me@example.com", keys: ["elevator"] },
        { placeName: "library", address: "1 main st", keys: ["elevator"] },
        "junk",
      ],
      observedOn: "2026-13-01",
      licence: "Proprietary",
      phase: "ask",
      stop: 4,
      q: 0,
    });
    const s = parseSurvey(raw, TODAY);
    expect(s?.stops).toEqual([{ id: stopId("Library", "1 Main St"), placeName: "Library", address: "1 Main St", keys: ["elevator"], answers: {} }]);
    expect(s?.observedOn).toBe("2026-11-19");
    expect(s?.licence).toBe("");
    expect(s?.phase).toBe("plan");
  });

  it("keeps a valid position and the review", () => {
    const s = answerQuestion(asking(), "yes");
    expect(parseSurvey(JSON.stringify(s), TODAY)?.phase).toBe("ask");
    expect(parseSurvey(JSON.stringify({ ...s, phase: "review" }), TODAY)?.phase).toBe("review");
    expect(parseSurvey(JSON.stringify({ ...s, phase: "review", stops: [] }), TODAY)?.phase).toBe("plan");
    expect(parseSurvey(JSON.stringify({ ...s, q: 99 }), TODAY)?.phase).toBe("plan");
  });

  it("never keeps more than 12 places", () => {
    const stops = Array.from({ length: 20 }, (_, i) => ({ placeName: `Shop ${i}`, address: "", keys: ["elevator"] }));
    expect(parseSurvey(JSON.stringify({ stops }), TODAY)?.stops).toHaveLength(MAX_STOPS);
  });
});

describe("changing the list while asking", () => {
  it("goes back to planning, so the position never points past a place's questions", () => {
    const s = asking();
    // Five answers: the whole Library, then the first question at the Bakery.
    const atBakery = answerQuestion(answerQuestion(answerQuestion(answerQuestion(answerQuestion(s, "yes"), "yes"), "yes"), "yes"), "yes");
    expect(currentQuestion(atBakery)).toMatchObject({ stopIndex: 1, q: 1 });
    expect(moveStop(atBakery, 1, -1).phase).toBe("plan");
    expect(removeStop(atBakery, 0).phase).toBe("plan");
    expect(ok(addStop(atBakery, "Pool", "", TODAY)).phase).toBe("plan");
    // Answers are kept, and asking picks up at the first question still open.
    const again = ok(startSurvey(moveStop(atBakery, 1, -1), TODAY));
    expect(currentQuestion(again)).toMatchObject({ stopIndex: 0, q: 1, key: "elevator" });
  });
});
