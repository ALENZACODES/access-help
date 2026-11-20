import { describe, expect, it } from "vitest";
import { ASKS_KEY, TOLD_KEY, clearAskData, createAskStore, createToldStore, parseStoredAsks } from "./askStore.js";
import { MEASURES_KEY, createMeasuresStore } from "./measuresStore.js";
import { clearPlacesData } from "./store.js";
import { MemoryStorage } from "./testing.js";

const TODAY = "2026-11-19";
const ask = (recordId = "a1") => ({ recordId, askedOn: "2026-11-15", channel: "email" as const, questions: ["toilet", "steps"] as const });
const said = (recordId: string) => ({ recordId, measuredOn: "2026-11-16", method: null, steps: 2, stepHeightCm: null, doorWidthCm: 90, doorOpening: null, ramp: null, toilet: null, toiletDoorCm: null });

describe("ask store", () => {
  it("starts with an empty list", () => {
    expect(createAskStore(new MemoryStorage()).read()).toEqual({ version: 1, entries: [] });
  });
  it("notes an ask and reads it back, waiting", () => {
    const store = createAskStore(new MemoryStorage());
    expect(store.add(ask(), TODAY)).toEqual({ ok: true });
    expect(store.read().entries).toEqual([{ n: 1, recordId: "a1", askedOn: "2026-11-15", channel: "email", questions: ["steps", "toilet"], status: "waiting", closedOn: null }]);
  });
  it("reports a problem with the ask and saves nothing", () => {
    const storage = new MemoryStorage();
    const store = createAskStore(storage);
    expect(store.add({ ...ask(), askedOn: "2026-12-01" }, TODAY)).toEqual({ ok: false, kind: "issue", issue: "date-future" });
    expect(store.add({ ...ask(), questions: [] }, TODAY)).toEqual({ ok: false, kind: "issue", issue: "no-question" });
    expect(storage.getItem(ASKS_KEY)).toBeNull();
  });
  it("changes the status of an ask and removes one", () => {
    const store = createAskStore(new MemoryStorage());
    store.add(ask(), TODAY);
    store.add(ask("a2"), TODAY);
    expect(store.setStatus(1, "answered", TODAY)).toEqual({ ok: true });
    expect(store.read().entries[0]).toMatchObject({ status: "answered", closedOn: TODAY });
    store.remove(1);
    expect(store.read().entries.map((e) => e.recordId)).toEqual(["a2"]);
  });
  it("removes the key with the last ask", () => {
    const storage = new MemoryStorage();
    const store = createAskStore(storage);
    store.add(ask(), TODAY);
    store.remove(1);
    expect(storage.getItem(ASKS_KEY)).toBeNull();
  });
  it("drops asks for observations that are no longer saved", () => {
    const store = createAskStore(new MemoryStorage());
    store.add(ask(), TODAY);
    store.add(ask("a2"), TODAY);
    store.prune(["a2"]);
    expect(store.read().entries.map((e) => e.recordId)).toEqual(["a2"]);
  });
  it("reads damaged storage as an empty list and drops a channel it does not know", () => {
    expect(parseStoredAsks("{oops")).toEqual({ version: 1, entries: [] });
    const raw = JSON.stringify({ version: 1, entries: [{ n: 1, recordId: "a1", askedOn: "2026-11-15", channel: "fax", questions: ["steps"], status: "waiting", closedOn: null }] });
    expect(parseStoredAsks(raw).entries).toEqual([]);
  });
  it("reports a refused write instead of throwing", () => {
    const storage = new MemoryStorage();
    storage.setItem = () => {
      throw new Error("refused");
    };
    expect(createAskStore(storage).add(ask(), TODAY)).toEqual({ ok: false, kind: "save", reason: "storage-unavailable" });
  });
});

describe("what places said", () => {
  it("is kept under its own key, apart from the measures", () => {
    const storage = new MemoryStorage();
    createToldStore(storage).save(said("a1"));
    expect(storage.getItem(TOLD_KEY)).not.toBeNull();
    expect(storage.getItem(MEASURES_KEY)).toBeNull();
    expect(createMeasuresStore(storage).read().entries).toEqual([]);
    expect(createToldStore(storage).read().entries).toEqual([said("a1")]);
  });
  it("leaves the measures alone when what a place said is removed", () => {
    const storage = new MemoryStorage();
    createMeasuresStore(storage).save({ ...said("a1"), method: "tape" });
    createToldStore(storage).save(said("a1"));
    createToldStore(storage).remove("a1");
    expect(storage.getItem(TOLD_KEY)).toBeNull();
    expect(createMeasuresStore(storage).read().entries).toHaveLength(1);
  });
  it("is cleared with the asks, on its own and with the rest of the places data", () => {
    const storage = new MemoryStorage();
    createAskStore(storage).add(ask(), TODAY);
    createToldStore(storage).save(said("a1"));
    clearAskData(storage);
    expect([storage.getItem(ASKS_KEY), storage.getItem(TOLD_KEY)]).toEqual([null, null]);
    createAskStore(storage).add(ask(), TODAY);
    createToldStore(storage).save(said("a1"));
    clearPlacesData(storage);
    expect([storage.getItem(ASKS_KEY), storage.getItem(TOLD_KEY)]).toEqual([null, null]);
  });
});
