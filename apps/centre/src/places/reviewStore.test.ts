import { describe, expect, it } from "vitest";
import { MAX_LEFT_OUT, REVIEW_KEY, createReviewStore, parseReviewState } from "./reviewStore.js";
import { clearPlacesData, createDraftStore, DRAFTS_KEY, type KeyValueStorage } from "./store.js";
import { sampleRecords } from "./testing.js";

function memory(initial: Record<string, string> = {}): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

function quotaStorage(): KeyValueStorage {
  return {
    getItem: () => null,
    setItem: () => {
      throw new DOMException("full", "QuotaExceededError");
    },
    removeItem: () => undefined,
  };
}

describe("parseReviewState", () => {
  it("is empty for nothing, damaged JSON and the wrong shape", () => {
    for (const raw of [null, "{", "[]", "3", "null", '"x"']) expect(parseReviewState(raw)).toEqual({ ticks: {}, leftOut: [] });
  });
  it("keeps known ticks and string ids, and drops the rest", () => {
    const state = parseReviewState(JSON.stringify({ ticks: { review: true, bogus: true, submit: 1 }, leftOut: ["a", 2, "", "a", null, "b"] }));
    expect(state).toEqual({ ticks: { review: true }, leftOut: ["a", "b"] });
  });
  it("drops very long ids and caps the list", () => {
    const many = Array.from({ length: MAX_LEFT_OUT + 20 }, (_, i) => `id${i}`);
    const state = parseReviewState(JSON.stringify({ leftOut: [...many, "x".repeat(121)] }));
    expect(state.leftOut).toHaveLength(MAX_LEFT_OUT);
    expect(state.leftOut).not.toContain("x".repeat(121));
  });
});

describe("review store", () => {
  it("reads empty state from empty storage", () => {
    expect(createReviewStore(memory()).read()).toEqual({ ticks: {}, leftOut: [] });
  });
  it("saves and clears a tick", () => {
    const storage = memory();
    const store = createReviewStore(storage);
    expect(store.setTick("review", true)).toEqual({ ok: true });
    expect(store.read().ticks).toEqual({ review: true });
    store.setTick("review", false);
    expect(store.read().ticks).toEqual({});
  });
  it("leaves an observation out and brings it back once", () => {
    const store = createReviewStore(memory());
    store.setLeftOut("a", true);
    store.setLeftOut("a", true);
    expect(store.read().leftOut).toEqual(["a"]);
    store.setLeftOut("a", false);
    expect(store.read().leftOut).toEqual([]);
  });
  it("keeps ticks when left-out ids change, and the reverse", () => {
    const store = createReviewStore(memory());
    store.setTick("licence", true);
    store.setLeftOut("a", true);
    store.setTick("review", true);
    expect(store.read()).toEqual({ ticks: { licence: true, review: true }, leftOut: ["a"] });
  });
  it("prunes ids that no longer match an observation and writes nothing otherwise", () => {
    const storage = memory();
    const store = createReviewStore(storage);
    store.setLeftOut("a", true);
    store.setLeftOut("b", true);
    store.prune(["b"]);
    expect(store.read().leftOut).toEqual(["b"]);
    const before = storage.data.get(REVIEW_KEY);
    store.prune(["b", "c"]);
    expect(storage.data.get(REVIEW_KEY)).toBe(before);
  });
  it("reports a full device instead of throwing", () => {
    const store = createReviewStore(quotaStorage());
    expect(store.setTick("review", true)).toEqual({ ok: false, reason: "storage-full" });
  });
  it("reads empty state when storage throws", () => {
    const broken: KeyValueStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    expect(createReviewStore(broken).read()).toEqual({ ticks: {}, leftOut: [] });
  });
  it("clears its own key and nothing else", () => {
    const storage = memory({ other: "keep" });
    const store = createReviewStore(storage);
    store.setTick("review", true);
    store.clear();
    expect(storage.data.has(REVIEW_KEY)).toBe(false);
    expect(storage.data.get("other")).toBe("keep");
  });
  it("is removed when the person clears their places data", () => {
    const storage = memory();
    createDraftStore(storage).add(sampleRecords()[0]!);
    createReviewStore(storage).setTick("review", true);
    expect(storage.data.has(DRAFTS_KEY)).toBe(true);
    clearPlacesData(storage);
    expect(storage.data.has(REVIEW_KEY)).toBe(false);
    expect(storage.data.has(DRAFTS_KEY)).toBe(false);
  });
});
