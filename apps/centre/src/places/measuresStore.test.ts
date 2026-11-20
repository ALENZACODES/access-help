import { describe, expect, it } from "vitest";
import type { Measures } from "./docs-bridge.js";
import { MEASURES_KEY, clearMeasuresData, createMeasuresStore, parseStoredMeasures } from "./measuresStore.js";
import { clearPlacesData } from "./store.js";
import { MemoryStorage } from "./testing.js";

function measured(recordId: string, over: Partial<Measures> = {}): Measures {
  return { recordId, measuredOn: "2026-11-12", method: "tape", steps: 2, stepHeightCm: 14, doorWidthCm: 82.5, doorOpening: "button", ramp: "no", toilet: "yes", toiletDoorCm: 86, ...over };
}

describe("measures store", () => {
  it("starts with an empty book", () => {
    expect(createMeasuresStore(new MemoryStorage()).read()).toEqual({ version: 1, entries: [] });
  });
  it("saves measures and reads them back", () => {
    const store = createMeasuresStore(new MemoryStorage());
    expect(store.save(measured("a1"))).toEqual({ ok: true });
    expect(store.read().entries).toEqual([measured("a1")]);
  });
  it("replaces the measures of an observation", () => {
    const store = createMeasuresStore(new MemoryStorage());
    store.save(measured("a1"));
    store.save(measured("a1", { steps: 0, stepHeightCm: null }));
    expect(store.read().entries).toHaveLength(1);
    expect(store.read().entries[0]?.steps).toBe(0);
  });
  it("removes measures, and removes the key with the last of them", () => {
    const storage = new MemoryStorage();
    const store = createMeasuresStore(storage);
    store.save(measured("a1"));
    store.save(measured("a2"));
    expect(store.remove("a1")).toEqual({ ok: true });
    expect(store.read().entries.map((e) => e.recordId)).toEqual(["a2"]);
    store.remove("a2");
    expect(storage.getItem(MEASURES_KEY)).toBeNull();
  });
  it("drops measures for observations that are no longer saved", () => {
    const store = createMeasuresStore(new MemoryStorage());
    store.save(measured("a1"));
    store.save(measured("a2"));
    store.prune(["a2", "a3"]);
    expect(store.read().entries.map((e) => e.recordId)).toEqual(["a2"]);
  });
  it("does not write when pruning changes nothing", () => {
    const storage = new MemoryStorage();
    const store = createMeasuresStore(storage);
    store.save(measured("a1"));
    let writes = 0;
    const original = storage.setItem.bind(storage);
    storage.setItem = (key: string, value: string) => {
      writes += 1;
      original(key, value);
    };
    store.prune(["a1"]);
    expect(writes).toBe(0);
  });
  it("shows UNKNOWN for a damaged number instead of the number", () => {
    const storage = new MemoryStorage();
    storage.setItem(MEASURES_KEY, JSON.stringify({ version: 1, entries: [{ ...measured("a1"), doorWidthCm: 99999, steps: "many" }] }));
    expect(createMeasuresStore(storage).read().entries[0]).toMatchObject({ doorWidthCm: null, steps: null, ramp: "no" });
  });
  it("reads damaged storage as an empty book", () => {
    expect(parseStoredMeasures("{oops")).toEqual({ version: 1, entries: [] });
    expect(parseStoredMeasures('"text"')).toEqual({ version: 1, entries: [] });
    expect(parseStoredMeasures(null)).toEqual({ version: 1, entries: [] });
  });
  it("reports a refused write instead of throwing", () => {
    const storage = new MemoryStorage();
    storage.setItem = () => {
      throw new Error("refused");
    };
    expect(createMeasuresStore(storage).save(measured("a1"))).toEqual({ ok: false, reason: "storage-unavailable" });
  });
  it("replaces the whole book for a restore", () => {
    const store = createMeasuresStore(new MemoryStorage());
    store.save(measured("a1"));
    expect(store.replace({ version: 1, entries: [measured("b1")] })).toEqual({ ok: true });
    expect(store.read().entries.map((e) => e.recordId)).toEqual(["b1"]);
  });
  it("is cleared on its own and with the rest of the places data", () => {
    const storage = new MemoryStorage();
    createMeasuresStore(storage).save(measured("a1"));
    clearMeasuresData(storage);
    expect(storage.getItem(MEASURES_KEY)).toBeNull();
    createMeasuresStore(storage).save(measured("a1"));
    clearPlacesData(storage);
    expect(storage.getItem(MEASURES_KEY)).toBeNull();
  });
});
