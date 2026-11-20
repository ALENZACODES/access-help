import { describe, expect, it } from "vitest";
import { ONBOARDING_PATHS, getPath } from "../../src/paths";
import {
  PATH_PROGRESS_KEY,
  cleanProgress,
  doneCount,
  hashToView,
  isDone,
  loadProgress,
  nextStepIndex,
  parseProgress,
  progressText,
  resetPath,
  saveProgress,
  setDone,
  type KeyValueStore,
  type PathProgress,
} from "./index";
import { makeRng } from "./testkit";

function memory(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const PLAN = getPath("plan-a-visit") as NonNullable<ReturnType<typeof getPath>>;

describe("cleanProgress and parseProgress", () => {
  it("keep only real steps of real paths, once each, in step order", () => {
    expect(cleanProgress({ "plan-a-visit": ["round-up", "must-haves", "must-haves", "nope", 3], "no-such-path": ["x"], "get-help": [] })).toEqual({
      "plan-a-visit": ["must-haves", "round-up"],
    });
  });

  it("give nothing for anything that is not an object of lists", () => {
    for (const v of [null, undefined, 1, "x", [], ["plan-a-visit"]]) expect(cleanProgress(v), String(v)).toEqual({});
    for (const raw of [null, "", "{", "[]", "null", "42"]) expect(parseProgress(raw), String(raw)).toEqual({});
    expect(parseProgress('{"plan-a-visit":"must-haves"}')).toEqual({});
  });
});

describe("ticking steps", () => {
  it("ticks and unticks a step without changing the input", () => {
    const before: PathProgress = {};
    const one = setDone(before, "plan-a-visit", "shortlist", true);
    expect(before).toEqual({});
    expect(one).toEqual({ "plan-a-visit": ["shortlist"] });
    expect(isDone(one, "plan-a-visit", "shortlist")).toBe(true);
    expect(setDone(one, "plan-a-visit", "shortlist", false)).toEqual({});
  });

  it("ignores unknown paths and steps", () => {
    const p: PathProgress = { "plan-a-visit": ["must-haves"] };
    expect(setDone(p, "no-such-path", "x", true)).toBe(p);
    expect(setDone(p, "plan-a-visit", "nope", true)).toBe(p);
  });

  it("starts one path again and leaves the others", () => {
    const p: PathProgress = { "plan-a-visit": ["must-haves"], "get-help": ["contact"] };
    expect(resetPath(p, "plan-a-visit")).toEqual({ "get-help": ["contact"] });
    expect(resetPath(p, "nope")).toEqual(p);
  });

  it("counts done steps and finds the next one", () => {
    let p: PathProgress = {};
    expect(nextStepIndex(p, PLAN)).toBe(0);
    p = setDone(p, "plan-a-visit", "must-haves", true);
    expect([doneCount(p, "plan-a-visit"), nextStepIndex(p, PLAN)]).toEqual([1, 1]);
    p = setDone(setDone(p, "plan-a-visit", "shortlist", true), "plan-a-visit", "round-up", true);
    expect([doneCount(p, "plan-a-visit"), nextStepIndex(p, PLAN)]).toEqual([3, undefined]);
  });

  it("stays clean under random ticks on every path", () => {
    const rng = makeRng(5);
    let p: PathProgress = {};
    for (let i = 0; i < 500; i++) {
      const path = ONBOARDING_PATHS[Math.floor(rng() * ONBOARDING_PATHS.length)];
      if (!path) continue;
      const step = path.steps[Math.floor(rng() * path.steps.length)];
      if (!step) continue;
      p = rng() < 0.1 ? resetPath(p, path.id) : setDone(p, path.id, step.id, rng() < 0.6);
      expect(cleanProgress(p)).toEqual(p);
      for (const q of ONBOARDING_PATHS) expect(doneCount(p, q.id)).toBeLessThanOrEqual(q.steps.length);
    }
  });
});

describe("saving on this device", () => {
  it("saves, loads and removes the key when nothing is ticked", () => {
    const store = memory();
    const p = setDone({}, "tidy-my-notes", "check", true);
    expect(saveProgress(store, p)).toBe("saved");
    expect(store.data.get(PATH_PROGRESS_KEY)).toBe('{"tidy-my-notes":["check"]}');
    expect(loadProgress(store)).toEqual(p);
    expect(saveProgress(store, {})).toBe("saved");
    expect(store.data.has(PATH_PROGRESS_KEY)).toBe(false);
  });

  it("says when there is nowhere to save, and loads nothing from a broken store", () => {
    expect(saveProgress(undefined, {})).toBe("unavailable");
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
      removeItem: () => undefined,
    };
    expect(loadProgress(broken)).toEqual({});
    expect(saveProgress(broken, { "get-help": ["contact"] })).toBe("unavailable");
  });
});

describe("progressText", () => {
  it("counts steps in both languages", () => {
    expect(progressText(0, 3, "en")).toBe("0 of 3 steps done");
    expect(progressText(1, 1, "en")).toBe("1 of 1 step done");
    expect(progressText(1, 3, "fr")).toBe("1 étape faite sur 3");
    expect(progressText(2, 3, "fr")).toBe("2 étapes faites sur 3");
  });
});

describe("app routes in the paths", () => {
  it("each open a real screen", () => {
    const routes = ONBOARDING_PATHS.flatMap((p) => p.steps.flatMap((s) => (s.appRoute ? [[`${p.id}.${s.id}`, s.appRoute] as const] : [])));
    expect(routes.length).toBeGreaterThanOrEqual(7);
    for (const [label, route] of routes) expect(hashToView(route), label).toBeDefined();
  });
});

describe("every path, step by step", () => {
  it("ticks each step in order, saves and reloads, and ends with no next step", () => {
    for (const path of ONBOARDING_PATHS) {
      const store = memory();
      let p: PathProgress = {};
      path.steps.forEach((s, i) => {
        expect(nextStepIndex(p, path), `${path.id} before ${s.id}`).toBe(i);
        p = setDone(p, path.id, s.id, true);
        expect(saveProgress(store, p)).toBe("saved");
        expect(loadProgress(store), `${path.id} ${s.id}`).toEqual(p);
        expect(progressText(doneCount(p, path.id), path.steps.length, "en")).toBe(`${i + 1} of ${path.steps.length} ${path.steps.length === 1 ? "step" : "steps"} done`);
      });
      expect(nextStepIndex(p, path), path.id).toBeUndefined();
      expect(parseProgress(JSON.stringify(p))).toEqual(p);
    }
  });

  it("keeps the step order in storage whatever order the steps were ticked in", () => {
    for (const path of ONBOARDING_PATHS) {
      let p: PathProgress = {};
      for (const s of [...path.steps].reverse()) p = setDone(p, path.id, s.id, true);
      expect(p[path.id], path.id).toEqual(path.steps.map((s) => s.id));
    }
  });

  it("keeps each path's ticks apart from every other path's", () => {
    let p: PathProgress = {};
    for (const path of ONBOARDING_PATHS) p = setDone(p, path.id, path.steps[0]?.id ?? "", true);
    for (const path of ONBOARDING_PATHS) {
      expect(doneCount(p, path.id), path.id).toBe(1);
      const after = resetPath(p, path.id);
      expect(doneCount(after, path.id)).toBe(0);
      expect(Object.keys(after)).toHaveLength(ONBOARDING_PATHS.length - 1);
    }
  });
});
