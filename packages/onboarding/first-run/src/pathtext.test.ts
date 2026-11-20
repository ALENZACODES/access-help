import { describe, expect, it } from "vitest";
import { ONBOARDING_PATHS, getPath } from "../../src/paths";
import { COPY, findBanned, pathFilename, pathPlainText, pathToText, pathsInProgress, setDone, type PathProgress } from "./index";

const TODAY = new Date(Date.UTC(2026, 10, 19));
const PLAN = getPath("plan-a-visit") as NonNullable<ReturnType<typeof getPath>>;

describe("pathToText", () => {
  it("writes every step with its tick, its text and where it happens", () => {
    const p = setDone({}, "plan-a-visit", "must-haves", true);
    const text = pathToText(PLAN, p, "en", TODAY);
    expect(text.startsWith("Plan a visit, step by step\n==========================\n\n")).toBe(true);
    expect(text).toContain("Your progress: 1 of 3 steps done\n");
    expect(text).toContain("1. [x] Save your must-haves\n   For each detail");
    expect(text).toContain("   In the App: #/places/must-haves\n");
    expect(text).toContain("2. [ ] Put your shortlist in order\n");
    expect(text).toContain(COPY.pathText.ticksNote.en);
    expect(text.endsWith("Made on 2026-11-19.\n")).toBe(true);
  });

  it("writes no place line for a step that happens away from the App", () => {
    const ask = getPath("ask-about-unknown") as NonNullable<ReturnType<typeof getPath>>;
    const lines = pathToText(ask, {}, "en", TODAY).split("\n");
    const i = lines.findIndex((x) => x.startsWith("2. [ ] Ask the place"));
    expect(i).toBeGreaterThan(0);
    expect(lines[i + 2]).toBe("");
  });

  it("works for every path in both languages, with French typography and no inconnu", () => {
    for (const path of ONBOARDING_PATHS) {
      for (const l of ["en", "fr"] as const) {
        const text = pathToText(path, {}, l, TODAY);
        expect(text.split("\n").filter((x) => /^\d+\. \[ \] /.test(x))).toHaveLength(path.steps.length);
        expect(findBanned(text), `${path.id} ${l}`).toBeUndefined();
        if (l === "fr") {
          expect(text, path.id).not.toMatch(/\binconnu/i);
          expect(text, path.id).not.toMatch(/[^\u00A0\u202F\d](?=[:;?!])/u);
        }
      }
    }
  });

  it("names the file by path, date and language", () => {
    expect(pathFilename(PLAN, TODAY, "en")).toBe("path-plan-a-visit-2026-11-19-en.txt");
    expect(pathFilename(PLAN, TODAY, "fr")).toBe("parcours-plan-a-visit-2026-11-19-fr.txt");
  });
});

describe("pathsInProgress", () => {
  it("lists paths started but not finished, in the help list's order", () => {
    let p: PathProgress = setDone({}, "tidy-my-notes", "check", true);
    p = setDone(p, "plan-a-visit", "must-haves", true);
    expect(pathsInProgress(p).map((x) => x.id)).toEqual(["plan-a-visit", "tidy-my-notes"]);
    for (const s of PLAN.steps) p = setDone(p, "plan-a-visit", s.id, true);
    expect(pathsInProgress(p).map((x) => x.id)).toEqual(["tidy-my-notes"]);
    expect(pathsInProgress({})).toEqual([]);
  });
});

describe("pathPlainText", () => {
  it("writes the steps with where they happen, and nothing personal", () => {
    const text = pathPlainText(PLAN, "en");
    expect(text).toBe(
      [
        "Plan a visit, step by step",
        "--------------------------",
        PLAN.summary.en,
        "1. Save your must-haves",
        `   ${PLAN.steps[0]?.body.en}`,
        "   In the App: #/places/must-haves",
        "2. Put your shortlist in order",
        `   ${PLAN.steps[1]?.body.en}`,
        "   In the App: #/places/shortlist",
        "3. Read the round-up",
        `   ${PLAN.steps[2]?.body.en}`,
        "   In the App: #/places/shortlist-round-up",
      ].join("\n") + "\n",
    );
  });

  it("keeps French typography for every path", () => {
    for (const p of ONBOARDING_PATHS) {
      const fr = pathPlainText(p, "fr");
      expect(fr, p.id).not.toMatch(/[^\u00A0\u202F\d](?=[:;?!])/u);
      expect(fr, p.id).not.toMatch(/\binconnu/i);
    }
  });
});
