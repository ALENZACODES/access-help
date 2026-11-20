import { describe, expect, it } from "vitest";
import { answerOnsiteStep, beginOnsite, skipOnsiteStep, type OnsiteWalk } from "./docs-bridge.js";
import { MEASURES_KEY } from "./measuresStore.js";
import { ONSITE_KEY, ONSITE_UNIT_KEY, clearOnsiteData, createOnsiteStore, parseStoredOnsite } from "./onsiteStore.js";
import { clearPlacesData, DRAFTS_KEY } from "./store.js";
import { MemoryStorage } from "./testing.js";

const TODAY = "2026-11-19";

function some(): OnsiteWalk {
  const result = answerOnsiteStep(beginOnsite("a1", TODAY, null), "steps", "2");
  if (!result.ok) throw new Error("fixture");
  return skipOnsiteStep(result.walk, "stepHeight");
}

describe("on-site progress store", () => {
  it("starts with nothing in progress and centimetres", () => {
    const store = createOnsiteStore(new MemoryStorage());
    expect(store.read()).toBeNull();
    expect(store.readUnit()).toBe("cm");
  });
  it("keeps the questions in progress and reads them back", () => {
    const store = createOnsiteStore(new MemoryStorage());
    expect(store.write(some())).toEqual({ ok: true });
    expect(store.read()).toEqual(some());
  });
  it("keeps only one place at a time", () => {
    const store = createOnsiteStore(new MemoryStorage());
    store.write(some());
    store.write(beginOnsite("a2", TODAY, null));
    expect(store.read()?.recordId).toBe("a2");
  });
  it("never writes to the measures or the observations", () => {
    const storage = new MemoryStorage();
    const store = createOnsiteStore(storage);
    store.write(some());
    store.writeUnit("in");
    expect(storage.getItem(MEASURES_KEY)).toBeNull();
    expect(storage.getItem(DRAFTS_KEY)).toBeNull();
    expect([...storage.data.keys()].sort()).toEqual([ONSITE_KEY, ONSITE_UNIT_KEY].sort());
  });
  it("keeps the unit, and reads anything else as centimetres", () => {
    const storage = new MemoryStorage();
    const store = createOnsiteStore(storage);
    store.writeUnit("in");
    expect(store.readUnit()).toBe("in");
    storage.setItem(ONSITE_UNIT_KEY, "furlongs");
    expect(store.readUnit()).toBe("cm");
  });
  it("checks stored answers again: one out of range becomes unanswered", () => {
    const storage = new MemoryStorage();
    storage.setItem(ONSITE_KEY, JSON.stringify({ ...some(), answers: { ...some().answers, doorWidth: "9000", ramp: "sure" } }));
    expect(createOnsiteStore(storage).read()?.answers).toMatchObject({ steps: "2", doorWidth: "", ramp: "" });
  });
  it("reads damaged storage as nothing in progress", () => {
    expect(parseStoredOnsite("{oops")).toBeNull();
    expect(parseStoredOnsite(null)).toBeNull();
    expect(parseStoredOnsite("[]")).toBeNull();
    expect(parseStoredOnsite(JSON.stringify({ version: 2 }))).toBeNull();
  });
  it("reads nothing when storage cannot be read", () => {
    const storage = new MemoryStorage();
    storage.getItem = () => {
      throw new Error("refused");
    };
    const store = createOnsiteStore(storage);
    expect(store.read()).toBeNull();
    expect(store.readUnit()).toBe("cm");
  });
  it("reports a refused write instead of throwing", () => {
    const storage = new MemoryStorage();
    storage.failWith = new Error("refused");
    const store = createOnsiteStore(storage);
    expect(store.write(some())).toEqual({ ok: false, reason: "storage-unavailable" });
    expect(store.writeUnit("in")).toEqual({ ok: false, reason: "storage-unavailable" });
  });
  it("reports a full device", () => {
    const storage = new MemoryStorage();
    storage.failWith = new DOMException("full", "QuotaExceededError");
    expect(createOnsiteStore(storage).write(some())).toEqual({ ok: false, reason: "storage-full" });
  });
  it("drops progress for an observation that is gone, and keeps it otherwise", () => {
    const storage = new MemoryStorage();
    const store = createOnsiteStore(storage);
    store.write(some());
    store.prune(["a1", "a2"]);
    expect(store.read()).not.toBeNull();
    store.prune(["a2"]);
    expect(store.read()).toBeNull();
    store.prune([]);
    expect(storage.getItem(ONSITE_KEY)).toBeNull();
  });
  it("discards the questions and keeps the unit", () => {
    const storage = new MemoryStorage();
    const store = createOnsiteStore(storage);
    store.write(some());
    store.writeUnit("in");
    store.discard();
    expect(store.read()).toBeNull();
    expect(store.readUnit()).toBe("in");
  });
  it("is cleared on its own and with the rest of the places data", () => {
    const storage = new MemoryStorage();
    const store = createOnsiteStore(storage);
    store.write(some());
    store.writeUnit("in");
    clearOnsiteData(storage);
    expect(storage.data.size).toBe(0);
    store.write(some());
    store.writeUnit("in");
    clearPlacesData(storage);
    expect(storage.getItem(ONSITE_KEY)).toBeNull();
    expect(storage.getItem(ONSITE_UNIT_KEY)).toBeNull();
  });
  it("does not throw when clearing fails", () => {
    const storage = new MemoryStorage();
    storage.removeItem = () => {
      throw new Error("refused");
    };
    expect(() => createOnsiteStore(storage).clear()).not.toThrow();
    expect(() => createOnsiteStore(storage).discard()).not.toThrow();
  });
});
