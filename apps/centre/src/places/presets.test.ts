import { describe, expect, it } from "vitest";
import { MAX_LABEL, MAX_PRESETS, MAX_TEXT, PRESETS_KEY, cleanPresets, createPresetStore, newPresetId, type SearchPreset } from "./presets.js";
import { MemoryStorage } from "./testing.js";

const preset = (id: string, extra: Partial<SearchPreset> = {}): SearchPreset => ({ id, label: `Search ${id}`, text: "", access: "any", maxAgeDays: null, radiusKm: null, ...extra });

describe("cleanPresets", () => {
  it("keeps good entries and drops ones with no id or no label, and repeated ids", () => {
    const out = cleanPresets([preset("a"), { id: "", label: "x" }, { id: "b", label: "  " }, preset("a", { label: "again" }), 5, null]);
    expect(out.map((p) => p.id)).toEqual(["a"]);
    expect(out[0]?.label).toBe("Search a");
  });
  it("replaces values it does not know with the plain default", () => {
    const [out] = cleanPresets([{ id: "a", label: "L", access: "everything", maxAgeDays: 99, radiusKm: 3, text: 7 }]);
    expect(out).toEqual({ id: "a", label: "L", text: "", access: "any", maxAgeDays: null, radiusKm: null });
  });
  it("keeps the allowed ages, distances, and access filters", () => {
    const [out] = cleanPresets([{ id: "a", label: "L", access: "yes-or-limited", maxAgeDays: 730, radiusKm: 25, text: "cafe" }]);
    expect(out).toMatchObject({ access: "yes-or-limited", maxAgeDays: 730, radiusKm: 25, text: "cafe" });
  });
  it("cuts long labels and text, and flattens line breaks", () => {
    const [out] = cleanPresets([{ id: "a", label: `x${"y".repeat(100)}`, text: `a\nb${"c".repeat(300)}` }]);
    expect(out?.label).toHaveLength(MAX_LABEL);
    expect(out?.text.length).toBeLessThanOrEqual(MAX_TEXT);
    expect(out?.text).not.toContain("\n");
  });
  it("never keeps a location, even if the stored value has one", () => {
    const [out] = cleanPresets([{ id: "a", label: "L", lat: 43.85, lon: -79.43, origin: { lat: 1, lon: 2 } }]);
    expect(Object.keys(out ?? {}).sort()).toEqual(["access", "id", "label", "maxAgeDays", "radiusKm", "text"]);
  });
});

describe("preset store", () => {
  it("adds, lists, replaces by id, and removes", () => {
    const store = createPresetStore(new MemoryStorage());
    expect(store.add(preset("a")).ok).toBe(true);
    expect(store.add(preset("b", { access: "yes" })).ok).toBe(true);
    expect(store.add(preset("a", { label: "Renamed" })).ok).toBe(true);
    expect(store.list().map((p) => [p.id, p.label])).toEqual([["b", "Search b"], ["a", "Renamed"]]);
    store.remove("b");
    expect(store.list().map((p) => p.id)).toEqual(["a"]);
  });
  it("asks for a label, and refuses after the limit", () => {
    const store = createPresetStore(new MemoryStorage());
    expect(store.add(preset("a", { label: " " }))).toEqual({ ok: false, reason: "label-required" });
    for (let i = 0; i < MAX_PRESETS; i += 1) store.add(preset(`p${i}`));
    expect(store.add(preset("extra"))).toEqual({ ok: false, reason: "too-many" });
  });
  it("reports a full or blocked device", () => {
    const storage = new MemoryStorage();
    storage.failWith = new DOMException("full", "QuotaExceededError");
    expect(createPresetStore(storage).add(preset("a"))).toEqual({ ok: false, reason: "storage-full" });
    storage.failWith = new Error("blocked");
    expect(createPresetStore(storage).add(preset("a"))).toEqual({ ok: false, reason: "storage-unavailable" });
  });
  it("cleans damaged storage on read and clears", () => {
    const storage = new MemoryStorage();
    storage.setItem(PRESETS_KEY, "{oops");
    expect(createPresetStore(storage).list()).toEqual([]);
    createPresetStore(storage).add(preset("a"));
    createPresetStore(storage).clear();
    expect(storage.getItem(PRESETS_KEY)).toBeNull();
  });
});

describe("newPresetId", () => {
  it("is stable for the same inputs and distinct for different ones", () => {
    expect(newPresetId(1000, () => 0.5)).toBe(newPresetId(1000, () => 0.5));
    expect(newPresetId(1000, () => 0.5)).not.toBe(newPresetId(1001, () => 0.5));
    expect(newPresetId(0, () => 0)).toMatch(/^search-0-000$/);
  });
});
