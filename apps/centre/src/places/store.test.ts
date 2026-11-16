import { describe, expect, it } from "vitest";
import { parsePack } from "./pack.js";
import {
  DRAFTS_KEY,
  LIBRARY_KEY,
  MAX_DRAFTS,
  MAX_PACKS,
  PACK_KEY,
  clearPlacesData,
  createDraftStore,
  createPackLibrary,
  draftsAsPack,
} from "./store.js";
import { MemoryStorage, SAMPLE_TODAY, sampleRecords, samplePackText } from "./testing.js";

function packNamed(packId: string, mutate: (pack: any) => void = () => {}) {
  const raw = JSON.parse(samplePackText());
  raw.manifest.packId = packId;
  mutate(raw);
  const parsed = parsePack(JSON.stringify(raw));
  if (!parsed.ok) throw new Error("sample pack must parse");
  return parsed.pack;
}

describe("pack library", () => {
  it("saves, lists in saved order, replaces by id, removes, and clears", () => {
    const library = createPackLibrary(new MemoryStorage());
    expect(library.list()).toEqual([]);
    expect(library.save(packNamed("a"))).toEqual({ ok: true });
    expect(library.save(packNamed("b"))).toEqual({ ok: true });
    expect(library.save(packNamed("a", (p) => { p.data.features.pop(); p.manifest.recordCount = 4; }))).toEqual({ ok: true });
    expect(library.list().map((p) => [p.manifest.packId, p.records.length])).toEqual([["b", 5], ["a", 4]]);
    library.remove("b");
    expect(library.list().map((p) => p.manifest.packId)).toEqual(["a"]);
    library.clear();
    expect(library.list()).toEqual([]);
  });

  it("keeps at most MAX_PACKS but still lets a saved id be replaced", () => {
    const library = createPackLibrary(new MemoryStorage());
    for (let i = 0; i < MAX_PACKS; i += 1) library.save(packNamed(`p${i}`));
    expect(library.save(packNamed("one-more"))).toEqual({ ok: false, reason: "too-many-packs" });
    expect(library.save(packNamed("p0"))).toEqual({ ok: true });
    expect(library.list()).toHaveLength(MAX_PACKS);
  });

  it("reads a pack saved by the first version and moves it on the next save", () => {
    const storage = new MemoryStorage();
    storage.setItem(PACK_KEY, samplePackText());
    const library = createPackLibrary(storage);
    expect(library.list().map((p) => p.manifest.packId)).toEqual(["sample-pack"]);
    library.save(packNamed("second"));
    expect(storage.getItem(PACK_KEY)).toBeNull();
    expect(library.list().map((p) => p.manifest.packId)).toEqual(["sample-pack", "second"]);
  });

  it("re-checks what it reads, so an edited status cannot show as a better one", () => {
    const storage = new MemoryStorage();
    createPackLibrary(storage).save(packNamed("a"));
    const envelope = JSON.parse(storage.getItem(LIBRARY_KEY) ?? "{}");
    const inner = JSON.parse(envelope.packs[0]);
    inner.data.features[3].properties.wheelchair = "definitely";
    envelope.packs[0] = JSON.stringify(inner);
    storage.setItem(LIBRARY_KEY, JSON.stringify(envelope));
    const loaded = createPackLibrary(storage).list();
    expect(loaded[0]?.records.find((r) => r.id === "s4")?.wheelchair).toBe("UNKNOWN");
  });

  it("drops a damaged pack and keeps the others, and never throws on damaged storage", () => {
    const storage = new MemoryStorage();
    createPackLibrary(storage).save(packNamed("good"));
    const envelope = JSON.parse(storage.getItem(LIBRARY_KEY) ?? "{}");
    envelope.packs.push("{broken", 7);
    storage.setItem(LIBRARY_KEY, JSON.stringify(envelope));
    expect(createPackLibrary(storage).list().map((p) => p.manifest.packId)).toEqual(["good"]);
    storage.setItem(LIBRARY_KEY, "not json");
    expect(createPackLibrary(storage).list()).toEqual([]);
    storage.setItem(LIBRARY_KEY, "null");
    expect(createPackLibrary(storage).list()).toEqual([]);
  });

  it("reports a full or unavailable device rather than pretending it saved", () => {
    const storage = new MemoryStorage();
    storage.failWith = new DOMException("full", "QuotaExceededError");
    expect(createPackLibrary(storage).save(packNamed("a"))).toEqual({ ok: false, reason: "storage-full" });
    storage.failWith = new Error("blocked");
    expect(createPackLibrary(storage).save(packNamed("a"))).toEqual({ ok: false, reason: "storage-unavailable" });
  });

  it("clearPlacesData removes packs, the first-version pack, and drafts", () => {
    const storage = new MemoryStorage();
    createPackLibrary(storage).save(packNamed("a"));
    storage.setItem(PACK_KEY, samplePackText());
    createDraftStore(storage).add(sampleRecords()[0]!);
    clearPlacesData(storage);
    expect([...storage.data.keys()]).toEqual([]);
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
