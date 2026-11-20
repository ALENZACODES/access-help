import { describe, expect, it } from "vitest";
import type { MatchCriteria } from "./docs-bridge.js";
import { MATCH_CURRENT_KEY, MATCH_SETS_KEY, clearMatchData, createMatchStore, parseStoredMatchCurrent, parseStoredMatchSets } from "./matchStore.js";
import { clearPlacesData } from "./store.js";
import { MemoryStorage } from "./testing.js";

const NOTHING: MatchCriteria = { maxSteps: null, rampInstead: false, maxStepHeightCm: null, minDoorWidthCm: null, door: "any", toilet: false, minToiletDoorCm: null, countTold: false };
const numbers = (over: Partial<MatchCriteria> = {}): MatchCriteria => ({ ...NOTHING, maxSteps: 0, minDoorWidthCm: 80, ...over });

describe("numbers store", () => {
  it("starts with nothing set and no sets", () => {
    const store = createMatchStore(new MemoryStorage());
    expect(store.current()).toEqual(NOTHING);
    expect(store.sets()).toEqual({ version: 1, sets: [] });
  });
  it("keeps the numbers in use and reads them back", () => {
    const store = createMatchStore(new MemoryStorage());
    expect(store.setCurrent(numbers())).toEqual({ ok: true });
    expect(store.current()).toEqual(numbers());
  });
  it("removes the key when nothing is set", () => {
    const storage = new MemoryStorage();
    const store = createMatchStore(storage);
    store.setCurrent(numbers());
    store.setCurrent(NOTHING);
    expect(storage.getItem(MATCH_CURRENT_KEY)).toBeNull();
  });
  it("cleans a number out of range before saving it", () => {
    const store = createMatchStore(new MemoryStorage());
    store.setCurrent(numbers({ minDoorWidthCm: 99999 }));
    expect(store.current()).toEqual(numbers({ minDoorWidthCm: null }));
  });
  it("saves a named set and gives back its id", () => {
    const store = createMatchStore(new MemoryStorage());
    expect(store.saveSet("Manual chair", numbers())).toEqual({ ok: true, id: "set-1" });
    expect(store.sets().sets).toEqual([{ id: "set-1", name: "Manual chair", criteria: numbers() }]);
  });
  it("reports a problem with a set and saves nothing", () => {
    const storage = new MemoryStorage();
    const store = createMatchStore(storage);
    expect(store.saveSet("  ", numbers())).toEqual({ ok: false, kind: "issue", issue: "name-empty" });
    expect(store.saveSet("Empty", NOTHING)).toEqual({ ok: false, kind: "issue", issue: "nothing-set" });
    expect(storage.getItem(MATCH_SETS_KEY)).toBeNull();
  });
  it("removes a set, and the key with the last of them", () => {
    const storage = new MemoryStorage();
    const store = createMatchStore(storage);
    store.saveSet("A", numbers());
    store.saveSet("B", numbers());
    store.removeSet("set-1");
    expect(store.sets().sets.map((set) => set.name)).toEqual(["B"]);
    store.removeSet("set-2");
    expect(storage.getItem(MATCH_SETS_KEY)).toBeNull();
  });
  it("reads damaged storage as nothing set", () => {
    expect(parseStoredMatchCurrent("{oops")).toEqual(NOTHING);
    expect(parseStoredMatchCurrent('{"maxSteps":"three","minDoorWidthCm":-5}')).toEqual(NOTHING);
    expect(parseStoredMatchSets("[]")).toEqual({ version: 1, sets: [] });
    expect(parseStoredMatchSets(null)).toEqual({ version: 1, sets: [] });
  });
  it("reports a refused write instead of throwing", () => {
    const storage = new MemoryStorage();
    storage.setItem = () => {
      throw new Error("refused");
    };
    const store = createMatchStore(storage);
    expect(store.setCurrent(numbers())).toEqual({ ok: false, reason: "storage-unavailable" });
    expect(store.saveSet("A", numbers())).toEqual({ ok: false, kind: "save", reason: "storage-unavailable" });
  });
  it("is cleared on its own and with the rest of the places data", () => {
    const storage = new MemoryStorage();
    const fill = () => {
      createMatchStore(storage).setCurrent(numbers());
      createMatchStore(storage).saveSet("A", numbers());
    };
    fill();
    clearMatchData(storage);
    expect([storage.getItem(MATCH_CURRENT_KEY), storage.getItem(MATCH_SETS_KEY)]).toEqual([null, null]);
    fill();
    clearPlacesData(storage);
    expect([storage.getItem(MATCH_CURRENT_KEY), storage.getItem(MATCH_SETS_KEY)]).toEqual([null, null]);
  });
});
