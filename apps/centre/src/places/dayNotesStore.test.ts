import { describe, expect, it } from "vitest";
import { DAY_NOTES_KEY, createDayNotesStore, parseStoredDayNotes } from "./dayNotesStore.js";
import { clearPlacesData, createDraftStore, DRAFTS_KEY } from "./store.js";
import { MemoryStorage, sampleRecords } from "./testing.js";

describe("parseStoredDayNotes", () => {
  it("is empty for nothing, damaged JSON and the wrong shape", () => {
    for (const raw of [null, "{", "[]", "3", "null", '"x"']) expect(parseStoredDayNotes(raw)).toEqual({});
  });
  it("keeps well-formed notes only", () => {
    expect(parseStoredDayNotes(JSON.stringify({ "2026-11-10": "windy", "2026-02-30": "x", other: "y", "2026-11-11": 4 }))).toEqual({ "2026-11-10": "windy" });
  });
});

describe("day notes store", () => {
  it("reads nothing from empty storage", () => expect(createDayNotesStore(new MemoryStorage()).read()).toEqual({}));
  it("saves a note and reads it back cleaned", () => {
    const storage = new MemoryStorage();
    const store = createDayNotesStore(storage);
    expect(store.save("2026-11-10", "  windy\r\nand cold ")).toEqual({ ok: true });
    expect(store.read()).toEqual({ "2026-11-10": "windy\nand cold" });
    expect(JSON.parse(storage.data.get(DAY_NOTES_KEY) ?? "{}")).toEqual({ "2026-11-10": "windy\nand cold" });
  });
  it("replaces the note for a day and keeps other days", () => {
    const store = createDayNotesStore(new MemoryStorage());
    store.save("2026-11-10", "a");
    store.save("2026-11-11", "b");
    store.save("2026-11-10", "c");
    expect(store.read()).toEqual({ "2026-11-10": "c", "2026-11-11": "b" });
  });
  it("removes a note saved as empty text, and the key when none are left", () => {
    const storage = new MemoryStorage();
    const store = createDayNotesStore(storage);
    store.save("2026-11-10", "a");
    expect(store.save("2026-11-10", "   ")).toEqual({ ok: true });
    expect(store.read()).toEqual({});
    expect(storage.data.has(DAY_NOTES_KEY)).toBe(false);
  });
  it("refuses a day that is not a day and writes nothing", () => {
    const storage = new MemoryStorage();
    expect(createDayNotesStore(storage).save("2026-13-40", "x")).toEqual({ ok: false, reason: "not-a-day" });
    expect(storage.data.size).toBe(0);
  });
  it("reports a device that cannot save", () => {
    const storage = new MemoryStorage();
    storage.failWith = new Error("blocked");
    expect(createDayNotesStore(storage).save("2026-11-10", "x")).toEqual({ ok: false, reason: "storage-unavailable" });
  });
  it("reads empty when storage throws", () => {
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => undefined, removeItem: () => undefined };
    expect(createDayNotesStore(broken).read()).toEqual({});
  });
  it("clears its own key and nothing else", () => {
    const storage = new MemoryStorage();
    storage.setItem("other", "keep");
    const store = createDayNotesStore(storage);
    store.save("2026-11-10", "a");
    store.clear();
    expect(storage.data.has(DAY_NOTES_KEY)).toBe(false);
    expect(storage.data.get("other")).toBe("keep");
  });
  it("is removed when the person clears their places data", () => {
    const storage = new MemoryStorage();
    createDraftStore(storage).add(sampleRecords()[0]!);
    createDayNotesStore(storage).save("2026-11-10", "a");
    clearPlacesData(storage);
    expect(storage.data.has(DAY_NOTES_KEY)).toBe(false);
    expect(storage.data.has(DRAFTS_KEY)).toBe(false);
  });
});
