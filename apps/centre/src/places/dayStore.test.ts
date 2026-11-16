import { describe, expect, it } from "vitest";
import { createSession, type MappingDay } from "./docs-bridge.js";
import { DAYS_KEY, MAX_DAYS, createDayStore } from "./dayStore.js";
import { MemoryStorage } from "./testing.js";

function day(name: string, date = "2026-11-21"): MappingDay {
  const r = createSession({ name, date, bounds: { south: 43.85, west: -79.44, north: 43.86, east: -79.42 }, cellMetres: 200 });
  if (!r.ok) throw new Error("session");
  return r.session;
}

describe("day store", () => {
  it("starts empty and lists nothing for missing, empty or damaged storage", () => {
    const storage = new MemoryStorage();
    expect(createDayStore(storage).list()).toEqual([]);
    for (const text of ["", "{", "null", "[]", '{"days":3}', '{"days":[null,3,"x"]}']) {
      storage.data.set(DAYS_KEY, text);
      expect(createDayStore(storage).list(), text).toEqual([]);
    }
  });

  it("saves, lists soonest first and gets one by id", () => {
    const store = createDayStore(new MemoryStorage());
    expect(store.save(day("Later", "2026-12-01"))).toEqual({ ok: true });
    expect(store.save(day("Sooner", "2026-11-21"))).toEqual({ ok: true });
    expect(store.list().map((d) => d.session.name)).toEqual(["Sooner", "Later"]);
    expect(store.get("2026-11-21-sooner")?.session.name).toBe("Sooner");
    expect(store.get("nope")).toBeNull();
  });

  it("replaces a day saved with the same id and keeps its ticks", () => {
    const store = createDayStore(new MemoryStorage());
    store.save(day("Main"));
    store.setTicks("2026-11-21-main", { charge: true });
    store.save({ ...day("Main"), notes: "changed" });
    expect(store.list()).toHaveLength(1);
    expect(store.list()[0]?.session.notes).toBe("changed");
    expect(store.list()[0]?.ticks).toEqual({ charge: true });
  });

  it("keeps ticks only for items on the list", () => {
    const store = createDayStore(new MemoryStorage());
    store.save(day("Main"));
    store.setTicks("2026-11-21-main", { charge: true, nonsense: true });
    expect(store.get("2026-11-21-main")?.ticks).toEqual({ charge: true });
  });

  it("does not set ticks for a day that is not saved", () => {
    const storage = new MemoryStorage();
    expect(createDayStore(storage).setTicks("nope", { charge: true }).ok).toBe(false);
    expect(storage.data.has(DAYS_KEY)).toBe(false);
  });

  it("refuses a thirteenth day and says why, saving nothing", () => {
    const storage = new MemoryStorage();
    const store = createDayStore(storage);
    for (let i = 0; i < MAX_DAYS; i++) expect(store.save(day(`Day ${i}`, `2026-11-${String(10 + i).padStart(2, "0")}`)).ok).toBe(true);
    const before = storage.data.get(DAYS_KEY);
    expect(store.save(day("One too many", "2026-12-30"))).toEqual({ ok: false, reason: "too-many" });
    expect(storage.data.get(DAYS_KEY)).toBe(before);
  });

  it("removes one day and clears all", () => {
    const store = createDayStore(new MemoryStorage());
    store.save(day("A"));
    store.save(day("B"));
    store.remove("2026-11-21-a");
    expect(store.list().map((d) => d.session.name)).toEqual(["B"]);
    store.clear();
    expect(store.list()).toEqual([]);
  });

  it("reports a failed write and does not throw", () => {
    const storage = new MemoryStorage();
    storage.failWith = new Error("denied");
    expect(createDayStore(storage).save(day("Main"))).toEqual({ ok: false, reason: "storage-unavailable" });
  });

  it("reports a full device", () => {
    const storage = new MemoryStorage();
    storage.failWith = new DOMException("full", "QuotaExceededError");
    expect(createDayStore(storage).save(day("Main"))).toEqual({ ok: false, reason: "storage-full" });
  });

  it("leaves out a saved day that fails validation instead of repairing it", () => {
    const storage = new MemoryStorage();
    const good = day("Good");
    storage.data.set(DAYS_KEY, JSON.stringify({ v: 1, days: [{ session: { ...good, cellMetres: 77 }, ticks: {} }, { session: good, ticks: { charge: true } }, { session: { ...good, version: 9 }, ticks: {} }] }));
    const list = createDayStore(storage).list();
    expect(list).toHaveLength(1);
    expect(list[0]?.session).toEqual(good);
  });

  it("ignores a repeated id and caps the list", () => {
    const storage = new MemoryStorage();
    const good = day("Good");
    storage.data.set(DAYS_KEY, JSON.stringify({ v: 1, days: [{ session: good, ticks: {} }, { session: { ...good, notes: "dupe" }, ticks: {} }] }));
    expect(createDayStore(storage).list()).toHaveLength(1);
    expect(createDayStore(storage).list()[0]?.session.notes).toBe("");
  });

  it("does not throw when reading fails", () => {
    const storage = new MemoryStorage();
    storage.getItem = () => {
      throw new Error("blocked");
    };
    expect(createDayStore(storage).list()).toEqual([]);
  });

  it("writes nothing but its own key", () => {
    const storage = new MemoryStorage();
    createDayStore(storage).save(day("Main"));
    expect([...storage.data.keys()]).toEqual([DAYS_KEY]);
  });
});
