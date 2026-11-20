import { describe, expect, it } from "vitest";
import { FACT_KEYS, OPEN_LICENCES, groupPlaces, parseNote, validateForm, type Tri } from "./index";
import {
  MAX_STOPS,
  addPlaceStop,
  addStop,
  answerQuestion,
  backToPlan,
  currentQuestion,
  editAnswer,
  emptySurvey,
  leaveStop,
  moveStop,
  parseSurvey,
  removeStop,
  setLicence,
  startSurvey,
  stepBack,
  stopForm,
  surveyProgress,
  surveyToNotes,
  type Survey,
} from "./survey";
import { makeRng, randomNotes, type Rng } from "./testkit";

const TODAY = new Date(Date.UTC(2026, 10, 19));
const TRIS: readonly Tri[] = ["yes", "no", "unknown"];
const NAMES = ["Library", "Bakery", "Arena", "Café Bleu", "cafe bleu", "Pool", "", "  ", "Shop 7", "me@example.com"];

const pick = <T>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length)] as T;

/** One random step of what a person could do on the screens. */
function step(rng: Rng, s: Survey): Survey {
  const r = rng();
  if (r < 0.15) {
    const keys = FACT_KEYS.filter(() => rng() < 0.7);
    const added = addStop(s, pick(rng, NAMES), rng() < 0.5 ? "" : `${Math.floor(rng() * 9)} Main St`, TODAY, keys);
    return added.ok ? added.survey : s;
  }
  if (r < 0.2) return removeStop(s, Math.floor(rng() * (s.stops.length + 1)) - (rng() < 0.1 ? 1 : 0));
  if (r < 0.25) return moveStop(s, Math.floor(rng() * (s.stops.length + 1)), rng() < 0.5 ? -1 : 1);
  if (r < 0.3) return setLicence(s, rng() < 0.8 ? pick(rng, OPEN_LICENCES) : "Proprietary");
  if (r < 0.4) {
    const started = startSurvey(s, TODAY);
    return started.ok ? started.survey : s;
  }
  if (r < 0.75) return answerQuestion(s, pick(rng, TRIS));
  if (r < 0.82) return stepBack(s);
  if (r < 0.87) return leaveStop(s);
  if (r < 0.93) return editAnswer(s, Math.floor(rng() * (s.stops.length + 1)), pick(rng, FACT_KEYS));
  return backToPlan(s);
}

function invariants(s: Survey, label: string): void {
  expect(s.stops.length, label).toBeLessThanOrEqual(MAX_STOPS);
  expect(new Set(s.stops.map((x) => x.id)).size, label).toBe(s.stops.length);
  const p = surveyProgress(s);
  expect(p.done, label).toBeLessThanOrEqual(p.total);
  for (const st of s.stops) {
    expect(st.keys.length, label).toBeGreaterThan(0);
    expect(FACT_KEYS.filter((k) => st.keys.includes(k)), label).toEqual(st.keys);
    for (const k of Object.keys(st.answers)) expect(st.keys, label).toContain(k);
  }
  // There is a question on screen exactly when the walk is asking.
  expect(currentQuestion(s) !== undefined, label).toBe(s.phase === "ask");
  if (s.phase !== "ask") expect(s.fromReview, label).toBe(false);
  // What is kept on the device reads back as the same walk.
  expect(parseSurvey(JSON.stringify(s), TODAY), label).toEqual(s);
}

describe("random walks", () => {
  it("keep their invariants at every step", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const rng = makeRng(seed);
      let s = emptySurvey(TODAY);
      for (let i = 0; i < 80; i++) {
        s = step(rng, s);
        invariants(s, `seed ${seed} step ${i}`);
      }
    }
  });

  it("save exactly what was answered: nothing made up, nothing lost", () => {
    let checked = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const rng = makeRng(seed * 13);
      let s = setLicence(emptySurvey(TODAY), "CC0-1.0");
      for (let i = 0; i < 60; i++) s = step(rng, s);
      if (s.licence === "") s = setLicence(s, "CC0-1.0");
      if (s.stops.length === 0) continue;
      let n = 0;
      const out = surveyToNotes(s, TODAY, () => `f${seed}-${++n}`);
      expect(out.notes.length + out.skipped.length).toBe(s.stops.length);
      for (const note of out.notes) {
        expect(parseNote(JSON.parse(JSON.stringify(note)))).toEqual(note);
        const stop = s.stops.find((st) => st.placeName === note.placeName && (st.address === "" ? note.address === undefined : st.address === note.address));
        if (!stop) throw new Error("note for no stop");
        expect(validateForm(stopForm(s, stop), TODAY)).toEqual([]);
        for (const f of note.facts) {
          const given = stop.answers[f.key];
          if (f.value === "unknown") expect(given === "yes" || given === "no").toBe(false);
          else {
            expect(f.value).toBe(given);
            expect(f.provenance).toEqual({ source: "Contributor report", licence: s.licence, recordedOn: s.observedOn });
          }
        }
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it("asks a known place only about details that are not agreed", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const places = groupPlaces(randomNotes(makeRng(seed), 10), "en");
      let s = emptySurvey(TODAY);
      for (const p of places) {
        const r = addPlaceStop(s, p, TODAY);
        if (!r.ok) continue;
        s = r.survey;
        const stop = s.stops[s.stops.length - 1];
        for (const k of stop?.keys ?? []) expect(p.resolutions[k].kind, `seed ${seed}`).not.toBe("agree");
      }
    }
  });
});
