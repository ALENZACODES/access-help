import { describe, expect, it } from "vitest";
import { buildMineView, fieldsFor, keepSelected, previewEdit, removeSelected, saveEdit, toggleId, undoMine } from "./mineModel.js";
import { createDraftStore, MAX_DRAFTS } from "./store.js";
import { MemoryStorage, sampleRecords, SAMPLE_TODAY } from "./testing.js";

const records = sampleRecords();
const s1 = records[0]!;

function seeded() {
  const storage = new MemoryStorage();
  const store = createDraftStore(storage);
  for (const record of sampleRecords()) store.add(record);
  return { storage, store };
}

describe("buildMineView", () => {
  it("shows every observation, newest first, with its record line", () => {
    const view = buildMineView(records, "", "newest", "en");
    expect(view.rows).toHaveLength(records.length);
    const dates = view.rows.map((r) => r.record.observedOn);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(view.rows[0]?.line).toMatch(/^Status: .+ Tier: UNKNOWN\.$/);
    expect(view.shownText).toBe("Showing 5 of 5.");
  });
  it("searches without accents and says how many are shown", () => {
    const view = buildMineView(records, "cafe", "newest", "en");
    expect(view.rows.map((r) => r.record.id)).toEqual(["s2"]);
    expect(view.shownText).toBe("Showing 1 of 5.");
  });
  it("keeps the summary for all observations while searching", () => {
    expect(buildMineView(records, "cafe", "newest", "en").summaryLines[0]).toBe("Saved observations: 5.");
  });
  it("falls back to newest for a sort it does not know", () => {
    expect(buildMineView(records, "", "sideways", "en").rows.map((r) => r.record.id)).toEqual(buildMineView(records, "", "newest", "en").rows.map((r) => r.record.id));
  });
  it("writes French when asked", () => {
    const view = buildMineView(records, "", "name", "fr");
    expect(view.summaryLines[0]).toBe("Observations enregistrées : 5.");
    expect(view.rows[0]?.line).toContain("Niveau : UNKNOWN.");
  });
  it("is calm with no observations", () => {
    expect(buildMineView([], "", "newest", "en")).toMatchObject({ rows: [], total: 0, summaryLines: ["You have no saved observations."] });
  });
});

describe("fieldsFor", () => {
  it("fills the form from the record and leaves the confirmation box empty", () => {
    expect(fieldsFor(s1)).toEqual({ name: "Sample Library", lat: "43.85", lon: "-79.43", wheelchair: "yes", source: "sample data for tests", licence: "CC0-1.0", observedOn: "2026-11-01", consent: false });
  });
  it("shows a missing name as an empty box and UNKNOWN as UNKNOWN", () => {
    expect(fieldsFor(records[4]!).name).toBe("");
    expect(fieldsFor(records[3]!).wheelchair).toBe("UNKNOWN");
  });
});

describe("previewEdit", () => {
  it("shows nothing for an untouched form, even with the box empty", () => {
    expect(previewEdit(s1, fieldsFor(s1), SAMPLE_TODAY, "en")).toEqual({ changes: [], touchesObservation: false });
  });
  it("lists a status change and flags it", () => {
    const out = previewEdit(s1, { ...fieldsFor(s1), wheelchair: "no" }, SAMPLE_TODAY, "en");
    expect(out).toEqual({ changes: ["Status: yes becomes no"], touchesObservation: true });
  });
  it("does not flag a name or source change", () => {
    const out = previewEdit(s1, { ...fieldsFor(s1), name: "Sample Library Annex", source: "my own visit" }, SAMPLE_TODAY, "en");
    expect(out.changes).toHaveLength(2);
    expect(out.touchesObservation).toBe(false);
  });
  it("shows nothing while the form has a mistake", () => {
    expect(previewEdit(s1, { ...fieldsFor(s1), lat: "north" }, SAMPLE_TODAY, "en").changes).toEqual([]);
  });
});

describe("saveEdit", () => {
  it("needs the confirmation box", () => {
    const { store } = seeded();
    const out = saveEdit(store, s1, { ...fieldsFor(s1), wheelchair: "no" }, SAMPLE_TODAY, []);
    expect(out).toEqual({ kind: "invalid", errors: { consent: "consent-required" } });
    expect(store.list().find((r) => r.id === "s1")?.wheelchair).toBe("yes");
  });
  it("saves a confirmed correction under the same id and remembers the step", () => {
    const { store } = seeded();
    const out = saveEdit(store, s1, { ...fieldsFor(s1), wheelchair: "no", consent: true }, SAMPLE_TODAY, []);
    expect(out.kind).toBe("saved");
    expect(store.list()).toHaveLength(5);
    expect(store.list().find((r) => r.id === "s1")?.wheelchair).toBe("no");
    expect(out.kind === "saved" && out.steps).toHaveLength(1);
  });
  it("saves nothing when nothing changed", () => {
    const { store, storage } = seeded();
    const before = [...storage.data.values()].join();
    expect(saveEdit(store, s1, { ...fieldsFor(s1), consent: true }, SAMPLE_TODAY, [])).toEqual({ kind: "unchanged" });
    expect([...storage.data.values()].join()).toBe(before);
  });
  it("refuses a licence that is not open, a future date and a bad coordinate", () => {
    const { store } = seeded();
    const out = saveEdit(store, s1, { ...fieldsFor(s1), licence: "CC-BY-4.0", observedOn: "2999-01-01", lon: "east", consent: true }, SAMPLE_TODAY, []);
    expect(out).toEqual({ kind: "invalid", errors: { lon: "lon-invalid", licence: "licence-invalid", observedOn: "date-future" } });
  });
  it("lets a status go back to UNKNOWN", () => {
    const { store } = seeded();
    saveEdit(store, s1, { ...fieldsFor(s1), wheelchair: "UNKNOWN", consent: true }, SAMPLE_TODAY, []);
    expect(store.list().find((r) => r.id === "s1")?.wheelchair).toBe("UNKNOWN");
  });
  it("reports a device that cannot save", () => {
    const { store, storage } = seeded();
    storage.failWith = new Error("blocked");
    expect(saveEdit(store, s1, { ...fieldsFor(s1), wheelchair: "no", consent: true }, SAMPLE_TODAY, [])).toEqual({ kind: "failed" });
  });
});

describe("removeSelected and undoMine", () => {
  it("removes the selected observations and can bring them back", () => {
    const { store } = seeded();
    const out = removeSelected(store, store.list(), new Set(["s1", "s3"]), []);
    expect(out.removed).toBe(2);
    expect(store.list().map((r) => r.id)).toEqual(["s2", "s4", "s5"]);
    const undone = undoMine(store, out.steps, "en");
    expect(undone.message).toBe("Took back your removal of 2.");
    expect(undone.steps).toEqual([]);
    expect(store.list().map((r) => r.id).sort()).toEqual(["s1", "s2", "s3", "s4", "s5"]);
  });
  it("removes nothing and remembers nothing for an empty selection", () => {
    const { store } = seeded();
    expect(removeSelected(store, store.list(), new Set(), [])).toEqual({ removed: 0, steps: [] });
    expect(store.list()).toHaveLength(5);
  });
  it("takes a correction back", () => {
    const { store } = seeded();
    const saved = saveEdit(store, s1, { ...fieldsFor(s1), wheelchair: "no", consent: true }, SAMPLE_TODAY, []);
    const undone = undoMine(store, saved.kind === "saved" ? saved.steps : [], "en");
    expect(undone.message).toBe("Took back your edit of Sample Library.");
    expect(store.list().find((r) => r.id === "s1")).toEqual(s1);
  });
  it("says so when there is nothing to take back", () => {
    const { store } = seeded();
    expect(undoMine(store, [], "en")).toEqual({ steps: [], message: "There is nothing to take back." });
  });
  it("keeps the step when the device cannot save", () => {
    const { store, storage } = seeded();
    const out = removeSelected(store, store.list(), new Set(["s1"]), []);
    storage.failWith = new Error("blocked");
    expect(undoMine(store, out.steps, "en")).toEqual({ steps: out.steps, message: null });
  });
  it("never restores past the device limit", () => {
    const storage = new MemoryStorage();
    const store = createDraftStore(storage);
    store.add(s1);
    const out = removeSelected(store, store.list(), new Set(["s1"]), []);
    for (let i = 0; i < MAX_DRAFTS; i += 1) store.add({ ...s1, id: `f${i}` });
    const undone = undoMine(store, out.steps, "en");
    expect(undone.message).toContain("Could not come back because the device list is full: 1.");
    expect(store.list()).toHaveLength(MAX_DRAFTS);
  });
});

describe("selection helpers", () => {
  it("toggles an id in a new set", () => {
    const a = new Set(["x"]);
    expect([...toggleId(a, "y", true)]).toEqual(["x", "y"]);
    expect([...toggleId(a, "x", false)]).toEqual([]);
    expect([...a]).toEqual(["x"]);
  });
  it("drops selected ids that are gone", () => {
    expect([...keepSelected(new Set(["s1", "zz"]), records)]).toEqual(["s1"]);
  });
});
