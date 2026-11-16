import { describe, expect, it } from "vitest";
import {
  ARTICLES,
  EMPTY_HELP,
  HELP_KEY,
  MAX_RECENT,
  clearRecent,
  describeHelpState,
  isReadingMode,
  loadHelpState,
  memoryStore,
  parseHelpState,
  recordRecent,
  saveHelpState,
  serializeHelpState,
  setReading,
  type KeyValueStore,
} from "./index";

const ids = ARTICLES.map((a) => a.id);

describe("parseHelpState", () => {
  it("returns the empty state for nothing, bad JSON and non-objects", () => {
    for (const raw of [null, undefined, "", "{", "null", "5", '"x"', "[1,2]", "true"]) {
      expect(parseHelpState(raw), String(raw)).toEqual(EMPTY_HELP);
    }
  });

  it("keeps an unset reading mode unknown rather than choosing one", () => {
    expect(parseHelpState("{}").reading).toBeUndefined();
    expect(parseHelpState('{"reading":"huge"}').reading).toBeUndefined();
    expect(parseHelpState('{"reading":3}').reading).toBeUndefined();
    expect(parseHelpState('{"reading":"steps"}').reading).toBe("steps");
    expect(parseHelpState('{"reading":"whole"}').reading).toBe("whole");
  });

  it("drops ids that are not articles, repeats and non-strings, and keeps the order", () => {
    const raw = JSON.stringify({ recent: [ids[2], "made-up", ids[2], 7, null, ids[0], { id: ids[1] }, ids[1]] });
    expect(parseHelpState(raw).recent).toEqual([ids[2], ids[0], ids[1]]);
  });

  it("keeps at most the newest few", () => {
    const raw = JSON.stringify({ recent: ids });
    expect(parseHelpState(raw).recent).toEqual(ids.slice(0, MAX_RECENT));
    expect(MAX_RECENT).toBe(5);
  });

  it("ignores a recent list that is not a list", () => {
    expect(parseHelpState('{"recent":"keyboard"}').recent).toEqual([]);
    expect(parseHelpState('{"recent":{"0":"keyboard"}}').recent).toEqual([]);
  });
});

describe("recording and clearing", () => {
  it("puts the newest first and moves a repeat to the front", () => {
    let s = EMPTY_HELP;
    for (const id of [ids[0], ids[1], ids[2]] as string[]) s = recordRecent(s, id);
    expect(s.recent).toEqual([ids[2], ids[1], ids[0]]);
    s = recordRecent(s, ids[0] as string);
    expect(s.recent).toEqual([ids[0], ids[2], ids[1]]);
  });

  it("never grows past the limit, and drops the oldest", () => {
    let s = EMPTY_HELP;
    for (const id of ids) s = recordRecent(s, id);
    expect(s.recent.length).toBe(MAX_RECENT);
    expect(s.recent[0]).toBe(ids[ids.length - 1]);
    expect(s.recent).not.toContain(ids[0]);
  });

  it("ignores something that is not an article and returns the same object", () => {
    const s = recordRecent(EMPTY_HELP, ids[0] as string);
    expect(recordRecent(s, "find-a-place")).toBe(s);
    expect(recordRecent(s, "")).toBe(s);
  });

  it("clears the list but keeps the reading choice", () => {
    const s = clearRecent(setReading(recordRecent(EMPTY_HELP, ids[0] as string), "steps"));
    expect(s.recent).toEqual([]);
    expect(s.reading).toBe("steps");
  });

  it("does not change the object it was given", () => {
    const s = recordRecent(EMPTY_HELP, ids[0] as string);
    const before = JSON.stringify(s);
    recordRecent(s, ids[1] as string);
    clearRecent(s);
    setReading(s, "steps");
    expect(JSON.stringify(s)).toBe(before);
  });

  it("knows which values are reading modes", () => {
    expect(isReadingMode("whole")).toBe(true);
    expect(isReadingMode("steps")).toBe(true);
    for (const v of ["", "Whole", undefined, null, 1, {}]) expect(isReadingMode(v), String(v)).toBe(false);
  });
});

describe("saving and loading", () => {
  it("round-trips through the store", () => {
    const store = memoryStore();
    const s = setReading(recordRecent(recordRecent(EMPTY_HELP, ids[0] as string), ids[1] as string), "steps");
    expect(saveHelpState(store, s)).toBe("saved");
    expect(loadHelpState(store)).toEqual(s);
  });

  it("leaves no key behind when there is nothing to remember", () => {
    const store = memoryStore();
    saveHelpState(store, setReading(EMPTY_HELP, "whole"));
    expect(store.getItem(HELP_KEY)).not.toBeNull();
    saveHelpState(store, EMPTY_HELP);
    expect(store.getItem(HELP_KEY)).toBeNull();
  });

  it("serialises only what is known", () => {
    expect(serializeHelpState(EMPTY_HELP)).toBe("{}");
    expect(JSON.parse(serializeHelpState(setReading(EMPTY_HELP, "steps")))).toEqual({ reading: "steps" });
  });

  it("copes with no store, and with a store that throws", () => {
    expect(saveHelpState(undefined, EMPTY_HELP)).toBe("unavailable");
    expect(loadHelpState(undefined)).toEqual(EMPTY_HELP);
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(saveHelpState(broken, setReading(EMPTY_HELP, "steps"))).toBe("unavailable");
    expect(saveHelpState(broken, EMPTY_HELP)).toBe("unavailable");
    expect(loadHelpState(broken)).toEqual(EMPTY_HELP);
  });

  it("uses its own key, apart from the other saved choices", () => {
    expect(HELP_KEY).toBe("app.onboarding.help.v1");
    const store = memoryStore();
    store.setItem("app.onboarding.prefs.v1", JSON.stringify({ locale: "fr" }));
    saveHelpState(store, setReading(EMPTY_HELP, "steps"));
    expect(store.getItem("app.onboarding.prefs.v1")).toBe('{"locale":"fr"}');
  });

  it("describes the state with unknown where nothing was chosen", () => {
    expect(describeHelpState(EMPTY_HELP)).toEqual({ reading: "unknown", recentCount: 0 });
    expect(describeHelpState(setReading(recordRecent(EMPTY_HELP, ids[0] as string), "steps"))).toEqual({ reading: "steps", recentCount: 1 });
  });
});
