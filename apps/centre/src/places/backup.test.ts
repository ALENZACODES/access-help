import { describe, expect, it } from "vitest";
import { PREFS_KEY } from "../settings/prefs.js";
import { BACKUP_APP, createBackup, restoreBackup, type BackupFile } from "./backup.js";
import { createPackLibrary, createDraftStore, DRAFTS_KEY, LIBRARY_KEY } from "./store.js";
import { createSavedStore, SAVED_KEY } from "./saved.js";
import { createDayNotesStore, DAY_NOTES_KEY } from "./dayNotesStore.js";
import { createPresetStore, PRESETS_KEY } from "./presets.js";
import { buildPackManifest } from "./docs-bridge.js";
import { MemoryStorage, SAMPLE_TODAY, sampleRecords } from "./testing.js";
import { parsePack } from "./pack.js";

const records = sampleRecords();
const pack = (id: string) => {
  const parsed = parsePack(JSON.stringify({ manifest: { packId: id, generatedOn: SAMPLE_TODAY, recordCount: records.length }, data: { type: "FeatureCollection", features: records.map((r) => ({ type: "Feature", geometry: { type: "Point", coordinates: [r.lon, r.lat] }, properties: { id: r.id, name: r.name, wheelchair: r.wheelchair, source: r.source, licence: r.licence, observedOn: r.observedOn } })) } }));
  if (!parsed.ok) throw new Error("test pack");
  return parsed.pack;
};

function filled(): MemoryStorage {
  const storage = new MemoryStorage();
  createPackLibrary(storage).save(pack("one"));
  createDraftStore(storage).add({ ...records[0]!, id: "obs-1" });
  createSavedStore(storage).add({ id: "s1", name: "Sample Library", note: "side door", labels: ["weekend"], savedOn: SAMPLE_TODAY });
  createPresetStore(storage).add({ id: "q1", label: "Step-free cafés", text: "cafe", access: "yes", maxAgeDays: 365, radiusKm: 5 });
  storage.setItem(PREFS_KEY, JSON.stringify({ textSize: "large", contrast: "high", spacing: "wide" }));
  return storage;
}

describe("createBackup", () => {
  it("holds packs, observations, saved places, and settings, and nothing else", () => {
    const file = JSON.parse(createBackup(filled(), SAMPLE_TODAY)) as BackupFile;
    expect(Object.keys(file).sort()).toEqual(["app", "createdOn", "dayNotes", "drafts", "packs", "prefs", "presets", "saved", "v"]);
    expect(file.app).toBe(BACKUP_APP);
    expect(file.packs).toHaveLength(1);
    expect(file.drafts[0]?.id).toBe("obs-1");
    expect(file.saved[0]?.note).toBe("side door");
    expect(file.prefs?.contrast).toBe("high");
  });
  it("is valid for an empty device", () => {
    const file = JSON.parse(createBackup(new MemoryStorage(), SAMPLE_TODAY)) as BackupFile;
    expect(file).toMatchObject({ packs: [], drafts: [], saved: [], presets: [], dayNotes: {}, prefs: null });
  });
  it("keeps no access status on a saved place", () => {
    expect(createBackup(filled(), SAMPLE_TODAY)).not.toMatch(/"saved":\s*\[\s*\{[^}]*wheelchair/);
  });
});

describe("restoreBackup", () => {
  it("restores everything onto an empty device", () => {
    const text = createBackup(filled(), SAMPLE_TODAY);
    const target = new MemoryStorage();
    const result = restoreBackup(text, target);
    expect(result).toMatchObject({ ok: true, summary: { packs: 1, drafts: 1, saved: 1, presets: 1, prefsRestored: true, skipped: 0 } });
    expect(createPackLibrary(target).list().map((p) => p.manifest.packId)).toEqual(["one"]);
    expect(createSavedStore(target).list()[0]?.note).toBe("side door");
    expect(JSON.parse(target.getItem(PREFS_KEY)!)).toMatchObject({ contrast: "high" });
  });
  it("adds to what is on the device and removes nothing", () => {
    const text = createBackup(filled(), SAMPLE_TODAY);
    const target = new MemoryStorage();
    createPackLibrary(target).save(pack("other"));
    createSavedStore(target).add({ id: "mine", name: null, note: "keep", labels: [], savedOn: SAMPLE_TODAY });
    restoreBackup(text, target);
    expect(createPackLibrary(target).list().map((p) => p.manifest.packId).sort()).toEqual(["one", "other"]);
    expect(createSavedStore(target).list().map((s) => s.id).sort()).toEqual(["mine", "s1"]);
  });
  it("keeps the saved note already on the device when the same place is in the file", () => {
    const text = createBackup(filled(), SAMPLE_TODAY);
    const target = new MemoryStorage();
    createSavedStore(target).add({ id: "s1", name: "Sample Library", note: "device note", labels: [], savedOn: SAMPLE_TODAY });
    const result = restoreBackup(text, target);
    expect(result).toMatchObject({ ok: true, summary: { saved: 0 } });
    expect(createSavedStore(target).list()[0]?.note).toBe("device note");
  });
  it("is safe to run twice", () => {
    const text = createBackup(filled(), SAMPLE_TODAY);
    const target = new MemoryStorage();
    restoreBackup(text, target);
    const second = restoreBackup(text, target);
    expect(second).toMatchObject({ ok: true, summary: { drafts: 0, saved: 0, presets: 0 } });
    expect(createDraftStore(target).list()).toHaveLength(1);
  });
  it("runs a pack in the file through the pack checks again, so a made-up status becomes UNKNOWN", () => {
    const file = JSON.parse(createBackup(filled(), SAMPLE_TODAY)) as BackupFile;
    const inner = JSON.parse(file.packs[0]!);
    inner.data.features[0].properties.wheelchair = "fully accessible";
    file.packs[0] = JSON.stringify(inner);
    const target = new MemoryStorage();
    restoreBackup(JSON.stringify(file), target);
    expect(createPackLibrary(target).list()[0]?.records.find((r) => r.id === "s1")?.wheelchair).toBe("UNKNOWN");
  });
  it("leaves out observations without a source or an open licence, and counts them", () => {
    const file = JSON.parse(createBackup(filled(), SAMPLE_TODAY)) as BackupFile;
    file.drafts.push({ ...records[1]!, id: "bad-licence", licence: "All rights reserved" as never }, { ...records[2]!, id: "no-source", source: "" });
    const target = new MemoryStorage();
    const result = restoreBackup(JSON.stringify(file), target);
    expect(result).toMatchObject({ ok: true, summary: { drafts: 1, skipped: 2 } });
    expect(createDraftStore(target).list().map((r) => r.id)).toEqual(["obs-1"]);
  });
  it("counts a pack that cannot be read and still restores the rest", () => {
    const file = JSON.parse(createBackup(filled(), SAMPLE_TODAY)) as BackupFile;
    file.packs.push("{not json", "42");
    const result = restoreBackup(JSON.stringify(file), new MemoryStorage());
    expect(result).toMatchObject({ ok: true, summary: { packs: 1, skipped: 2 } });
  });
  it("ignores unknown settings values field by field", () => {
    const file = JSON.parse(createBackup(filled(), SAMPLE_TODAY)) as BackupFile;
    (file as unknown as { prefs: unknown }).prefs = { textSize: "enormous", contrast: "high", spacing: 7 };
    const result = restoreBackup(JSON.stringify(file), new MemoryStorage());
    expect(result).toMatchObject({ ok: true, prefs: { textSize: "standard", contrast: "high", spacing: "standard" } });
  });
  it("refuses files that are not a backup, in clear categories", () => {
    const target = new MemoryStorage();
    expect(restoreBackup("{nope", target)).toEqual({ ok: false, code: "not-json" });
    expect(restoreBackup("[]", target)).toEqual({ ok: false, code: "not-a-backup" });
    expect(restoreBackup(JSON.stringify({ app: "something-else", v: 1 }), target)).toEqual({ ok: false, code: "not-a-backup" });
    expect(restoreBackup(JSON.stringify({ app: BACKUP_APP, v: 2 }), target)).toEqual({ ok: false, code: "unsupported-version" });
    expect(restoreBackup(JSON.stringify({ app: BACKUP_APP, v: 1, packs: [], drafts: [], saved: [], prefs: null }), target)).toEqual({ ok: false, code: "empty" });
    expect(restoreBackup("x".repeat(6_000_001), target)).toEqual({ ok: false, code: "too-large" });
    expect([...target.data.keys()]).toEqual([]);
  });
  it("puts everything back as it was if a write fails part way", () => {
    const text = createBackup(filled(), SAMPLE_TODAY);
    const target = new MemoryStorage();
    createPackLibrary(target).save(pack("existing"));
    const before = new Map(target.data);
    let writes = 0;
    const original = target.setItem.bind(target);
    target.setItem = (key: string, value: string) => {
      writes += 1;
      if (writes === 3) throw new DOMException("full", "QuotaExceededError");
      original(key, value);
    };
    expect(restoreBackup(text, target)).toEqual({ ok: false, code: "storage-failed" });
    target.setItem = original;
    expect(new Map(target.data)).toEqual(before);
    expect(target.getItem(DRAFTS_KEY)).toBeNull();
    expect(target.getItem(SAVED_KEY)).toBeNull();
    expect(target.getItem(LIBRARY_KEY)).toBe(before.get(LIBRARY_KEY));
  });
  it("round trips through a second backup unchanged", () => {
    const first = createBackup(filled(), SAMPLE_TODAY);
    const target = new MemoryStorage();
    restoreBackup(first, target);
    expect(createBackup(target, SAMPLE_TODAY)).toBe(first);
  });
});

describe("pack manifest", () => {
  it("is rebuilt from the records, not trusted from the file", () => {
    const file = JSON.parse(createBackup(filled(), SAMPLE_TODAY)) as BackupFile;
    const inner = JSON.parse(file.packs[0]!);
    inner.manifest.recordCount = 999;
    file.packs[0] = JSON.stringify(inner);
    const target = new MemoryStorage();
    const result = restoreBackup(JSON.stringify(file), target);
    expect(result).toMatchObject({ ok: true, summary: { packs: 0, skipped: 1 } });
    expect(buildPackManifest("x", records, SAMPLE_TODAY).recordCount).toBe(records.length);
  });
});

describe("saved searches in a backup", () => {
  it("restores them, keeps the ones already on the device, and cleans them", () => {
    const file = JSON.parse(createBackup(filled(), SAMPLE_TODAY)) as BackupFile;
    (file.presets as unknown[]).push({ id: "bad", label: "" }, { id: "q2", label: "Two", access: "everything", radiusKm: 3 });
    const target = new MemoryStorage();
    createPresetStore(target).add({ id: "mine", label: "Mine", text: "", access: "any", maxAgeDays: null, radiusKm: null });
    const result = restoreBackup(JSON.stringify(file), target);
    expect(result).toMatchObject({ ok: true, summary: { presets: 2, skipped: 1 } });
    expect(createPresetStore(target).list().map((p) => p.id).sort()).toEqual(["mine", "q1", "q2"]);
    expect(createPresetStore(target).list().find((p) => p.id === "q2")).toMatchObject({ access: "any", radiusKm: null });
  });
  it("reads a backup made before saved searches existed", () => {
    const file = JSON.parse(createBackup(filled(), SAMPLE_TODAY)) as Record<string, unknown>;
    delete file.presets;
    expect(restoreBackup(JSON.stringify(file), new MemoryStorage())).toMatchObject({ ok: true, summary: { presets: 0 } });
  });
  it("puts the key back if a later write fails", () => {
    const text = createBackup(filled(), SAMPLE_TODAY);
    const target = new MemoryStorage();
    createPresetStore(target).add({ id: "mine", label: "Mine", text: "", access: "any", maxAgeDays: null, radiusKm: null });
    const before = target.getItem(PRESETS_KEY);
    const original = target.setItem.bind(target);
    target.setItem = (key: string, value: string) => {
      if (key === PREFS_KEY) throw new DOMException("full", "QuotaExceededError");
      original(key, value);
    };
    expect(restoreBackup(text, target)).toEqual({ ok: false, code: "storage-failed" });
    target.setItem = original;
    expect(target.getItem(PRESETS_KEY)).toBe(before);
  });
});

describe("day notes in a backup", () => {
  function withNotes(): MemoryStorage {
    const storage = filled();
    const notes = createDayNotesStore(storage);
    notes.save("2026-11-10", "Windy, came with a friend.");
    notes.save("2026-11-12", "Lift was out at the arena.");
    return storage;
  }
  it("puts the day notes in the file, by day", () => {
    const file = JSON.parse(createBackup(withNotes(), SAMPLE_TODAY)) as BackupFile;
    expect(file.dayNotes).toEqual({ "2026-11-10": "Windy, came with a friend.", "2026-11-12": "Lift was out at the arena." });
  });
  it("restores day notes onto an empty device and counts them", () => {
    const target = new MemoryStorage();
    const result = restoreBackup(createBackup(withNotes(), SAMPLE_TODAY), target);
    expect(result).toMatchObject({ ok: true, summary: { dayNotes: 2, skipped: 0 } });
    expect(createDayNotesStore(target).read()).toEqual({ "2026-11-10": "Windy, came with a friend.", "2026-11-12": "Lift was out at the arena." });
  });
  it("keeps the note already on the device for a day and adds the others", () => {
    const target = new MemoryStorage();
    createDayNotesStore(target).save("2026-11-10", "My newer note.");
    const result = restoreBackup(createBackup(withNotes(), SAMPLE_TODAY), target);
    expect(result).toMatchObject({ ok: true, summary: { dayNotes: 1 } });
    expect(createDayNotesStore(target).read()["2026-11-10"]).toBe("My newer note.");
    expect(createDayNotesStore(target).read()["2026-11-12"]).toBe("Lift was out at the arena.");
  });
  it("adds nothing the second time", () => {
    const text = createBackup(withNotes(), SAMPLE_TODAY);
    const target = new MemoryStorage();
    restoreBackup(text, target);
    expect(restoreBackup(text, target)).toMatchObject({ ok: true, summary: { dayNotes: 0 } });
  });
  it("leaves out a note for something that is not a day, or that is not text, and counts it as skipped", () => {
    const file = JSON.parse(createBackup(withNotes(), SAMPLE_TODAY)) as Record<string, unknown>;
    file.dayNotes = { "2026-11-10": "Kept.", "not a day": "x", "2026-11-11": 42 };
    const target = new MemoryStorage();
    const result = restoreBackup(JSON.stringify(file), target);
    expect(result).toMatchObject({ ok: true, summary: { dayNotes: 1, skipped: 2 } });
    expect(createDayNotesStore(target).read()).toEqual({ "2026-11-10": "Kept." });
  });
  it("reads a backup made before day notes existed", () => {
    const file = JSON.parse(createBackup(withNotes(), SAMPLE_TODAY)) as Record<string, unknown>;
    delete file.dayNotes;
    expect(restoreBackup(JSON.stringify(file), new MemoryStorage())).toMatchObject({ ok: true, summary: { dayNotes: 0, skipped: 0 } });
  });
  it("ignores day notes that are a list instead of days", () => {
    const file = JSON.parse(createBackup(withNotes(), SAMPLE_TODAY)) as Record<string, unknown>;
    file.dayNotes = ["a", "b"];
    expect(restoreBackup(JSON.stringify(file), new MemoryStorage())).toMatchObject({ ok: true, summary: { dayNotes: 0 } });
  });
  it("restores a backup that holds only day notes", () => {
    const source = new MemoryStorage();
    createDayNotesStore(source).save("2026-11-10", "Only this.");
    const target = new MemoryStorage();
    expect(restoreBackup(createBackup(source, SAMPLE_TODAY), target)).toMatchObject({ ok: true, summary: { dayNotes: 1, packs: 0 } });
  });
  it("puts the day notes back as they were when a later write fails", () => {
    const target = new MemoryStorage();
    createDayNotesStore(target).save("2026-01-01", "Before.");
    const before = target.getItem(DAY_NOTES_KEY);
    const original = target.setItem.bind(target);
    target.setItem = (key: string, value: string) => {
      if (key === PREFS_KEY) throw new Error("refused");
      original(key, value);
    };
    const result = restoreBackup(createBackup(withNotes(), SAMPLE_TODAY), target);
    expect(result).toEqual({ ok: false, code: "storage-failed" });
    target.setItem = original;
    expect(target.getItem(DAY_NOTES_KEY)).toBe(before);
  });
});
