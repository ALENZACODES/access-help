import { describe, expect, it } from "vitest";
import { beginSitting, buildSitQueue, setSitOutcome, type Sitting } from "./docs-bridge.js";
import { SITTING_KEY, clearSittingData, createSittingStore, parseStoredSitting } from "./sittingStore.js";
import { clearPlacesData } from "./store.js";
import { MemoryStorage } from "./testing.js";
import type { PlaceRecord } from "./types.js";

function place(over: Partial<PlaceRecord> = {}): PlaceRecord {
  return { id: "a1", lat: 43.85, lon: -79.43, name: "Sample Library", wheelchair: "yes", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-10", ...over };
}

function sample(): Sitting {
  const begun = beginSitting(buildSitQueue([place(), place({ id: "a2", observedOn: "2026-11-12" })], new Set(), "newest"), "2026-11-19");
  if (begun === null) throw new Error("nothing ready");
  return setSitOutcome(begun, "a2", { kind: "added", changeset: "42" });
}

describe("sitting store", () => {
  it("has no sitting to begin with", () => {
    expect(createSittingStore(new MemoryStorage()).read()).toBeNull();
  });
  it("saves a sitting and reads it back", () => {
    const store = createSittingStore(new MemoryStorage());
    expect(store.save(sample())).toEqual({ ok: true });
    expect(store.read()).toEqual(sample());
  });
  it("reads damaged storage as no sitting", () => {
    expect(parseStoredSitting("{oops")).toBeNull();
    expect(parseStoredSitting("[]")).toBeNull();
    expect(parseStoredSitting(JSON.stringify({ version: 1, startedOn: "2026-11-19", order: "sideways", ids: ["a1"] }))).toBeNull();
    expect(parseStoredSitting(null)).toBeNull();
  });
  it("drops an outcome it does not know when reading", () => {
    const storage = new MemoryStorage();
    storage.setItem(SITTING_KEY, JSON.stringify({ ...sample(), outcomes: { a2: { kind: "accepted" }, a1: { kind: "later" } } }));
    expect(createSittingStore(storage).read()?.outcomes).toEqual({ a1: { kind: "later" } });
  });
  it("refuses a stored list longer than one sitting holds", () => {
    const ids = Array.from({ length: 201 }, (_, i) => `x${i}`);
    expect(parseStoredSitting(JSON.stringify({ version: 1, startedOn: "2026-11-19", order: "newest", ids, outcomes: {}, at: 0 }))).toBeNull();
  });
  it("reports a refused write instead of throwing", () => {
    const storage = new MemoryStorage();
    storage.setItem = () => {
      throw new Error("refused");
    };
    expect(createSittingStore(storage).save(sample())).toEqual({ ok: false, reason: "storage-unavailable" });
  });
  it("reads as no sitting when storage cannot be read", () => {
    const storage = new MemoryStorage();
    storage.getItem = () => {
      throw new Error("refused");
    };
    expect(createSittingStore(storage).read()).toBeNull();
  });
  it("is cleared on its own and with the rest of the places data", () => {
    const storage = new MemoryStorage();
    createSittingStore(storage).save(sample());
    clearSittingData(storage);
    expect(storage.getItem(SITTING_KEY)).toBeNull();
    createSittingStore(storage).save(sample());
    clearPlacesData(storage);
    expect(storage.getItem(SITTING_KEY)).toBeNull();
  });
});
