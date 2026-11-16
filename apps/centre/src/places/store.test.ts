import { describe, expect, it } from "vitest";
import { parsePack } from "./pack.js";
import { DRAFTS_KEY, MAX_DRAFTS, PACK_KEY, createDraftStore, createPackStore, draftsAsPack } from "./store.js";
import { MemoryStorage, SAMPLE_TODAY, sampleRecords, samplePackText } from "./testing.js";

function samplePack() {
  const parsed = parsePack(samplePackText());
  if (!parsed.ok) throw new Error("sample pack must parse");
  return parsed.pack;
}

describe("pack store", () => {
  it("saves, loads, and clears a pack", () => {
    const storage = new MemoryStorage();
    const store = createPackStore(storage);
    expect(store.load()).toBeNull();
    expect(store.save(samplePack())).toEqual({ ok: true });
    expect(store.load()?.records).toHaveLength(5);
    store.clear();
    expect(store.load()).toBeNull();
  });

  it("re-checks what it reads, so an edited status cannot show as a better one", () => {
    const storage = new MemoryStorage();
    createPackStore(storage).save(samplePack());
    const edited = JSON.parse(storage.getItem(PACK_KEY) ?? "{}");
    edited.data.features[3].properties.wheelchair = "definitely";
    storage.setItem(PACK_KEY, JSON.stringify(edited));
    const loaded = createPackStore(storage).load();
    expect(loaded?.records.find((r) => r.id === "s4")?.wheelchair).toBe("UNKNOWN");
  });

  it("returns null for damaged storage instead of throwing", () => {
    const storage = new MemoryStorage();
    storage.setItem(PACK_KEY, "{broken");
    expect(createPackStore(storage).load()).toBeNull();
  });

  it("reports a full or unavailable device rather than pretending it saved", () => {
    const storage = new MemoryStorage();
    storage.failWith = new DOMException("full", "QuotaExceededError");
    expect(createPackStore(storage).save(samplePack())).toEqual({ ok: false, reason: "storage-full" });
    storage.failWith = new Error("blocked");
    expect(createPackStore(storage).save(samplePack())).toEqual({ ok: false, reason: "storage-unavailable" });
  });
});

describe("draft store", () => {
  const [first, second] = sampleRecords();

  it("adds, lists, replaces by id, and removes drafts", () => {
    const store = createDraftStore(new MemoryStorage());
    expect(store.list()).toEqual([]);
    expect(store.add(first!)).toEqual({ ok: true });
    expect(store.add(second!)).toEqual({ ok: true });
    expect(store.add({ ...first!, name: "Renamed" })).toEqual({ ok: true });
    expect(store.list().map((r) => r.name)).toEqual(["Sample Café", "Renamed"]);
    store.remove(second!.id);
    expect(store.list().map((r) => r.id)).toEqual([first!.id]);
    store.clear();
    expect(store.list()).toEqual([]);
  });

  it("drops stored drafts that no longer pass the export rules", () => {
    const storage = new MemoryStorage();
    storage.setItem(DRAFTS_KEY, JSON.stringify([{ ...first, licence: "All rights reserved" }, second]));
    expect(createDraftStore(storage).list().map((r) => r.id)).toEqual([second!.id]);
  });

  it("returns an empty list for damaged storage", () => {
    const storage = new MemoryStorage();
    storage.setItem(DRAFTS_KEY, "not json");
    expect(createDraftStore(storage).list()).toEqual([]);
    storage.setItem(DRAFTS_KEY, '{"a":1}');
    expect(createDraftStore(storage).list()).toEqual([]);
  });

  it("stops at the draft limit", () => {
    const store = createDraftStore(new MemoryStorage());
    for (let i = 0; i < MAX_DRAFTS; i += 1) store.add({ ...first!, id: `d${i}` });
    expect(store.add({ ...first!, id: "one-more" })).toEqual({ ok: false, reason: "too-many" });
  });

  it("builds a pack from the drafts with a manifest that keeps the licences", () => {
    const pack = draftsAsPack(sampleRecords(), SAMPLE_TODAY);
    expect(pack.manifest).toMatchObject({ packId: "my-observations", generatedOn: SAMPLE_TODAY, recordCount: 5 });
    expect(pack.manifest.licences).toEqual(["CC0-1.0", "ODbL-1.0"]);
  });
});
