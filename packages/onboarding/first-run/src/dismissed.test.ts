import { describe, expect, it } from "vitest";
import {
  DISMISSED_KEY,
  FACT_KEYS,
  MAX_DISMISSED,
  dismissPair,
  groupPlaces,
  loadDismissed,
  memoryStore,
  parseDismissed,
  parseNote,
  pruneDismissed,
  saveDismissed,
  type KeyValueStore,
} from "./index";

const place = (id: string, name: string) => {
  const n = parseNote({ id, placeName: name, createdOn: "2026-10-01", licence: "CC0-1.0", facts: FACT_KEYS.map((key) => ({ key, value: "unknown" })) });
  if (!n) throw new Error("bad");
  return groupPlaces([n], "en")[0]!;
};

describe("parseDismissed", () => {
  it("keeps well-formed pairs", () => {
    expect(parseDismissed(JSON.stringify(["a-1|b-2", "c-3|d-4"]))).toEqual(["a-1|b-2", "c-3|d-4"]);
  });

  it("returns nothing for missing, broken or wrongly shaped data", () => {
    for (const raw of [null, undefined, "", "{", "null", "{}", '"a-1|b-2"', "42"]) expect(parseDismissed(raw), String(raw)).toEqual([]);
  });

  it("drops entries that are not pairs in the order the App writes them", () => {
    const raw = JSON.stringify(["b-2|a-1", "a-1|a-1", "a-1", "A-1|b-2", "a-1|b-2|c-3", 5, null, "a b|c-d", "a-1|b-2"]);
    expect(parseDismissed(raw)).toEqual(["a-1|b-2"]);
  });

  it("drops repeats", () => {
    expect(parseDismissed(JSON.stringify(["a-1|b-2", "a-1|b-2"]))).toEqual(["a-1|b-2"]);
  });

  it("keeps no more than the limit", () => {
    const many = Array.from({ length: MAX_DISMISSED + 20 }, (_, i) => `a-${String(i).padStart(3, "0")}|b-${String(i).padStart(3, "0")}`);
    expect(parseDismissed(JSON.stringify(many))).toHaveLength(MAX_DISMISSED);
  });

  it("refuses ids that are too long", () => {
    expect(parseDismissed(JSON.stringify([`${"a".repeat(81)}|b-2`]))).toEqual([]);
  });
});

describe("saving and loading", () => {
  it("round-trips through the store", () => {
    const store = memoryStore();
    expect(saveDismissed(store, ["a-1|b-2"])).toBe("saved");
    expect(store.getItem(DISMISSED_KEY)).toBe('["a-1|b-2"]');
    expect(loadDismissed(store)).toEqual(["a-1|b-2"]);
  });

  it("removes the key when the list is empty", () => {
    const store = memoryStore();
    saveDismissed(store, ["a-1|b-2"]);
    saveDismissed(store, []);
    expect(store.getItem(DISMISSED_KEY)).toBeNull();
  });

  it("cleans what it saves", () => {
    const store = memoryStore();
    saveDismissed(store, ["b-2|a-1", "a-1|b-2", "a-1|b-2"]);
    expect(loadDismissed(store)).toEqual(["a-1|b-2"]);
  });

  it("says unavailable with no store, and when the store fails", () => {
    expect(saveDismissed(undefined, ["a-1|b-2"])).toBe("unavailable");
    expect(loadDismissed(undefined)).toEqual([]);
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error("no");
      },
      setItem: () => {
        throw new Error("full");
      },
      removeItem: () => {
        throw new Error("no");
      },
    };
    expect(saveDismissed(broken, ["a-1|b-2"])).toBe("unavailable");
    expect(loadDismissed(broken)).toEqual([]);
  });
});

describe("dismissPair", () => {
  it("adds a pair once, whichever place comes first", () => {
    const a = dismissPair([], "b-2", "a-1");
    expect(a).toEqual({ list: ["a-1|b-2"], result: "added" });
    expect(dismissPair(a.list, "a-1", "b-2")).toEqual({ list: ["a-1|b-2"], result: "same" });
  });

  it("refuses a place paired with itself or an id that is not one", () => {
    expect(dismissPair([], "a-1", "a-1").result).toBe("invalid");
    expect(dismissPair([], "A 1", "b-2").result).toBe("invalid");
    expect(dismissPair([], "a-1", "").result).toBe("invalid");
    expect(dismissPair([], "a-1", "b|2").result).toBe("invalid");
  });

  it("says when the list is full and leaves it as it was", () => {
    const full = Array.from({ length: MAX_DISMISSED }, (_, i) => `a-${i}|b-${i}`);
    const r = dismissPair(full, "x-1", "y-2");
    expect(r.result).toBe("full");
    expect(r.list).toEqual(full);
  });

  it("does not change the list it is given", () => {
    const list = ["a-1|b-2"];
    dismissPair(list, "c-3", "d-4");
    expect(list).toEqual(["a-1|b-2"]);
  });
});

describe("pruneDismissed", () => {
  it("keeps pairs where both places still exist", () => {
    const [p, q] = [place("n1", "Alpha"), place("n2", "Beta")];
    const key = [p.id, q.id].sort().join("|");
    expect(pruneDismissed([key, `${p.id}|gone-00000000`, "bad"], [p, q])).toEqual([key]);
    expect(pruneDismissed([key], [p])).toEqual([]);
    expect(pruneDismissed([key], [])).toEqual([]);
  });
});
