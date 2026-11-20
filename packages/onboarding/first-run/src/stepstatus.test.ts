import { describe, expect, it } from "vitest";
import { ONBOARDING_PATHS } from "../../src/paths";
import { COPY, counted, findBanned, groupPlaces, placeId, stepStatus, stepStatusKind, type Note, type StepInputs } from "./index";
import { makeRng, randomNotes } from "./testkit";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));

const NOTES = (): Note[] => [
  testNote("l1", "Library", [{ key: "step-free-entry", value: "yes" }, { key: "elevator", value: "no", on: "2023-01-01" }]),
  testNote("l2", "Libary", [{ key: "step-free-entry", value: "yes" }], null),
  testNote("c1", "Cafe", [], "3 Main St"),
];

const LIBRARY = placeId({ placeName: "Library", address: "1 Main St" });
const CAFE = placeId({ placeName: "Cafe", address: "3 Main St" });

const input = (over: Partial<StepInputs> = {}): StepInputs => ({
  notes: NOTES(),
  needs: {},
  shortlist: [],
  dismissed: [],
  locale: "en",
  today: TODAY,
  ...over,
});

const text = (path: string, step: string, over: Partial<StepInputs> = {}): string | undefined => stepStatus(path, step, input(over))?.text;

describe("which steps have a status", () => {
  it("every step with an App page has one, and steps away from the App have none", () => {
    for (const p of ONBOARDING_PATHS) {
      for (const s of p.steps) {
        const isNew = ["plan-a-visit", "ask-about-unknown", "tidy-my-notes", "check-the-sources", "find-doubles", "keep-details-current"].includes(p.id);
        if (!isNew) continue;
        if (s.appRoute) expect(stepStatusKind(p.id, s.id), `${p.id}.${s.id}`).toBeDefined();
        else expect(stepStatusKind(p.id, s.id), `${p.id}.${s.id}`).toBeUndefined();
      }
    }
    expect(stepStatus("get-help", "contact", input())).toBeUndefined();
    expect(stepStatus("nope", "x", input())).toBeUndefined();
  });
});

describe("what each status says", () => {
  it("counts must-haves and the shortlist", () => {
    expect(text("plan-a-visit", "must-haves")).toBe(COPY.stepStatus.noNeeds.en);
    expect(text("plan-a-visit", "must-haves", { needs: { elevator: "yes", "step-free-entry": "yes" } })).toBe("Must-haves saved for 2 details.");
    expect(text("plan-a-visit", "shortlist")).toBe(COPY.stepStatus.noShortlist.en);
    expect(text("plan-a-visit", "shortlist", { shortlist: [CAFE, "gone-0a1b2c3d"] })).toBe("Your shortlist has 1 place.");
  });

  it("says what the round-up still needs, in order", () => {
    expect(text("plan-a-visit", "round-up", { shortlist: [CAFE] })).toBe(COPY.stepStatus.roundupNeedsFirst.en);
    expect(text("plan-a-visit", "round-up", { needs: { elevator: "yes" } })).toBe(COPY.stepStatus.noShortlist.en);
    expect(text("plan-a-visit", "round-up", { needs: { elevator: "yes" }, shortlist: [CAFE, LIBRARY] })).toBe("The round-up will show 2 places.");
  });

  it("counts places with gaps, notes, flagged notes and records", () => {
    expect(text("ask-about-unknown", "find-gaps")).toBe("Details with no record at 3 places.");
    expect(text("ask-about-unknown", "add-note")).toBe("You have 3 notes.");
    expect(text("ask-about-unknown", "add-note", { notes: [] })).toBe(COPY.stepStatus.noNotes.en);
    expect(text("tidy-my-notes", "check")).toBe("That page lists 2 notes.");
    expect(text("check-the-sources", "sources")).toBe("Your notes hold 3 records.");
    expect(text("check-the-sources", "sources", { notes: [NOTES()[2] as Note] })).toBe(COPY.stepStatus.noRecords.en);
  });

  it("counts possible matches, leaving out dismissed pairs", () => {
    expect(text("find-doubles", "similar")).toBe("Possible matches found: 1 pair.");
    const places = groupPlaces(NOTES(), "en");
    const [a, b] = places.filter((p) => p.name.startsWith("Lib")).map((p) => p.id).sort();
    expect(text("find-doubles", "similar", { dismissed: [`${a}|${b}`] })).toBe(COPY.stepStatus.noPairs.en);
  });

  it("counts details to ask about again", () => {
    const t = text("keep-details-current", "review");
    expect(t).toMatch(/^To ask about again: \d+ details?\.$/);
    expect(text("keep-details-current", "review", { notes: [] })).toBe(COPY.stepStatus.noReview.en);
  });

  it("speaks French with French plurals and typography", () => {
    expect(text("find-doubles", "similar", { locale: "fr" })).toBe("Lieux peut-être identiques trouvés\u00A0: 1 paire.");
    expect(text("ask-about-unknown", "find-gaps", { locale: "fr" })).toBe("Détails sans donnée pour 3 lieux.");
    expect(counted(0, "place", "fr")).toBe("0 lieu");
    expect(counted(0, "place", "en")).toBe("0 places");
    expect(counted(2, "record", "fr")).toBe("2 données");
  });
});

describe("on random notes", () => {
  it("never throws, gives a whole count and plain words with no banned wording", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const rng = makeRng(seed);
      const notes = randomNotes(rng, 10);
      const ids = groupPlaces(notes, "en").map((p) => p.id);
      for (const p of ONBOARDING_PATHS) {
        for (const s of p.steps) {
          for (const locale of ["en", "fr"] as const) {
            const st = stepStatus(p.id, s.id, input({ notes, locale, shortlist: ids.slice(0, 3), needs: { elevator: "yes" } }));
            if (!st) continue;
            expect(Number.isInteger(st.count) && st.count >= 0, `${seed} ${p.id}.${s.id}`).toBe(true);
            expect(findBanned(st.text), st.text).toBeUndefined();
            if (locale === "fr") expect(st.text).not.toMatch(/\binconnu|[^\u00A0\u202F\d](?=[:;?!])/iu);
          }
        }
      }
    }
  });
});

describe("English and French agree", () => {
  it("give the same count for every step, with text in each language", () => {
    const over: Partial<StepInputs> = { needs: { elevator: "yes" }, shortlist: [CAFE, LIBRARY] };
    for (const p of ONBOARDING_PATHS) {
      for (const s of p.steps) {
        const en = stepStatus(p.id, s.id, input({ ...over, locale: "en" }));
        const fr = stepStatus(p.id, s.id, input({ ...over, locale: "fr" }));
        expect(fr?.count, `${p.id}.${s.id}`).toBe(en?.count);
        expect(fr?.kind, `${p.id}.${s.id}`).toBe(en?.kind);
        if (en && fr) {
          expect(en.text).not.toBe(fr.text);
          expect(fr.text.trim()).not.toBe("");
          expect(fr.text).toMatch(/\.$/);
          expect(en.text).toMatch(/\.$/);
        }
      }
    }
  });

  it("never changes the notes, must-haves or shortlist it reads", () => {
    const i = input({ needs: { elevator: "yes" }, shortlist: [CAFE] });
    const before = JSON.stringify(i);
    for (const p of ONBOARDING_PATHS) for (const s of p.steps) stepStatus(p.id, s.id, i);
    expect(JSON.stringify(i)).toBe(before);
  });
});
