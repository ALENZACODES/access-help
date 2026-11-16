import { describe, expect, it } from "vitest";
import { mergePacks } from "./packs.js";
import { MAX_NOTE, MAX_SAVED, SAVED_KEY, cleanNote, cleanSaved, createSavedStore, resolveSaved, type SavedPlace } from "./saved.js";
import { MemoryStorage, sampleRecords } from "./testing.js";
import { buildPackManifest } from "./docs-bridge.js";

const entry = (id: string, extra: Partial<SavedPlace> = {}): SavedPlace => ({ id, name: `Name ${id}`, note: "", savedOn: "2026-11-15", ...extra });

describe("cleanNote", () => {
  it("turns line breaks and control characters into single spaces and trims", () => {
    expect(cleanNote("  ramp\n\nat the\tside\u0007door  ")).toBe("ramp at the side door");
  });
  it("cuts a long note to the limit", () => {
    expect(cleanNote("a".repeat(MAX_NOTE + 50))).toHaveLength(MAX_NOTE);
  });
  it("treats anything that is not text as empty", () => {
    expect(cleanNote(42)).toBe("");
    expect(cleanNote(null)).toBe("");
  });
});

describe("cleanSaved", () => {
  it("drops entries with no id, a bad date, or a repeated id", () => {
    const result = cleanSaved([entry("a"), { id: "", savedOn: "2026-01-01" }, { id: "b", savedOn: "yesterday" }, entry("a", { note: "second" }), "text", null]);
    expect(result.map((item) => item.id)).toEqual(["a"]);
    expect(result[0]?.note).toBe("");
  });
  it("keeps a missing name as null and never keeps a status", () => {
    const [clean] = cleanSaved([{ id: "x", name: "  ", savedOn: "2026-01-01", wheelchair: "yes", status: "yes" }]);
    expect(clean).toEqual({ id: "x", name: null, note: "", savedOn: "2026-01-01" });
    expect(Object.keys(clean ?? {})).not.toContain("wheelchair");
  });
  it("is empty for anything that is not a list", () => {
    expect(cleanSaved({})).toEqual([]);
    expect(cleanSaved(undefined)).toEqual([]);
  });
  it(`keeps at most ${MAX_SAVED} entries`, () => {
    const many = Array.from({ length: MAX_SAVED + 20 }, (_, i) => entry(`p${i}`));
    expect(cleanSaved(many)).toHaveLength(MAX_SAVED);
  });
});

describe("saved store", () => {
  it("adds, lists, notes, and removes", () => {
    const store = createSavedStore(new MemoryStorage());
    expect(store.add(entry("a")).ok).toBe(true);
    expect(store.add(entry("b")).ok).toBe(true);
    expect(store.has("a")).toBe(true);
    expect(store.setNote("a", "side door,\nask first").ok).toBe(true);
    expect(store.list().find((item) => item.id === "a")?.note).toBe("side door, ask first");
    store.remove("a");
    expect(store.list().map((item) => item.id)).toEqual(["b"]);
  });
  it("keeps the first entry and its note when the same place is saved again", () => {
    const store = createSavedStore(new MemoryStorage());
    store.add(entry("a", { note: "keep me" }));
    store.add(entry("a", { note: "replacement" }));
    expect(store.list()).toHaveLength(1);
    expect(store.list()[0]?.note).toBe("keep me");
  });
  it("refuses the entry after the limit", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVED_KEY, JSON.stringify(Array.from({ length: MAX_SAVED }, (_, i) => entry(`p${i}`))));
    expect(createSavedStore(storage).add(entry("extra"))).toEqual({ ok: false, reason: "too-many" });
  });
  it("reports a full or unavailable device instead of pretending it saved", () => {
    const storage = new MemoryStorage();
    storage.failWith = new DOMException("full", "QuotaExceededError");
    expect(createSavedStore(storage).add(entry("a"))).toEqual({ ok: false, reason: "storage-full" });
    storage.failWith = new Error("blocked");
    expect(createSavedStore(storage).add(entry("a"))).toEqual({ ok: false, reason: "storage-unavailable" });
  });
  it("cleans damaged storage on read", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVED_KEY, "{not json");
    expect(createSavedStore(storage).list()).toEqual([]);
    storage.setItem(SAVED_KEY, JSON.stringify([entry("ok"), { id: 7 }]));
    expect(createSavedStore(storage).list().map((item) => item.id)).toEqual(["ok"]);
  });
  it("clears everything", () => {
    const storage = new MemoryStorage();
    const store = createSavedStore(storage);
    store.add(entry("a"));
    store.clear();
    expect(storage.getItem(SAVED_KEY)).toBeNull();
  });
});

describe("resolveSaved", () => {
  const records = sampleRecords();
  const pack = { manifest: buildPackManifest("p", records, "2026-11-15"), records, warnings: [] };
  const places = mergePacks([pack]).places;

  it("reads the current status from the loaded packs", () => {
    const [first] = resolveSaved([entry("s1")], places);
    expect(first?.status).toBe("yes");
    expect(first?.place?.id).toBe("s1");
  });
  it("reads UNKNOWN for a place that is in no loaded pack", () => {
    const [first] = resolveSaved([entry("gone")], places);
    expect(first?.status).toBe("UNKNOWN");
    expect(first?.place).toBeNull();
  });
  it("reads UNKNOWN when packs disagree", () => {
    const other = { ...pack, manifest: { ...pack.manifest, packId: "q" }, records: records.map((r) => (r.id === "s1" ? { ...r, wheelchair: "no" as const } : r)) };
    const [first] = resolveSaved([entry("s1")], mergePacks([pack, other]).places);
    expect(first?.status).toBe("UNKNOWN");
  });
});
