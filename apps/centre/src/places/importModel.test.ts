import { describe, expect, it } from "vitest";
import { buildImportView, saveImport, savedSheetFile, templateFile, visibleLines } from "./importModel.js";
import { createDraftStore, DRAFTS_KEY, MAX_DRAFTS } from "./store.js";
import { MemoryStorage, sampleRecords, SAMPLE_TODAY } from "./testing.js";

const HEADER = "id,name,status,latitude,longitude,source,licence,observed_on";
const sheet = (...lines: string[]) => [HEADER, ...lines].join("\r\n");
const GOOD = "n1,New Hall,yes,43.80123,-79.40123,own visit,CC0-1.0,2026-11-10";

function ready(text: string, saved = sampleRecords()) {
  const view = buildImportView(text, saved, SAMPLE_TODAY, "en");
  if (view.kind !== "ready") throw new Error("expected a readable sheet");
  return view;
}

describe("buildImportView", () => {
  it("reports a file problem in words", () => {
    expect(buildImportView("", [], SAMPLE_TODAY, "en")).toEqual({ kind: "problem", messages: ["The sheet is empty."] });
  });
  it("reports missing columns and names the unkept ones", () => {
    const view = buildImportView("name,lat,lon,phone\nCafe,43.8,-79.4,555", [], SAMPLE_TODAY, "en");
    expect(view.kind).toBe("problem");
    if (view.kind !== "problem") return;
    expect(view.messages[0]).toContain("no column for source, licence and date seen");
    expect(view.messages[1]).toBe("Columns that are not kept: phone.");
  });
  it("plans an add for a new line and counts it", () => {
    const view = ready(sheet(GOOD));
    expect(view.lines).toHaveLength(1);
    expect(view.lines[0]).toMatchObject({ line: 2, name: "New Hall", action: "add", actionLabel: "Will be added", status: "yes", problems: [] });
    expect(view.saveCount).toBe(1);
    expect(view.summary).toContain("To add: 1.");
  });
  it("gives every kept line its source, licence, date and tier", () => {
    const view = ready(sheet(GOOD));
    expect(view.lines[0]?.provenance).toBe("Source: own visit. Licence: CC0-1.0. Seen on 2026-11-10. Tier: UNKNOWN.");
  });
  it("always says the tier stays UNKNOWN", () => {
    expect(ready(sheet(GOOD)).sheetNotes[0]).toContain("UNKNOWN");
    const withTier = ready(`${HEADER},tier\r\n${GOOD},3`);
    expect(withTier.sheetNotes[0]).toContain("tier column");
    expect(withTier.sheetNotes[1]).toBe("Columns that are not kept: tier.");
  });
  it("keeps an unclear status as UNKNOWN and says so on the line", () => {
    const view = ready(sheet("n1,New Hall,accessible,43.80123,-79.40123,own visit,CC0-1.0,2026-11-10"));
    expect(view.lines[0]?.status).toBe("UNKNOWN");
    expect(view.lines[0]?.notes[0]).toContain("kept as UNKNOWN");
  });
  it("rejects a line with a problem and keeps the good ones", () => {
    const view = ready(sheet(GOOD, "n2,Bad,yes,43.8,-79.4,own visit,CC-BY-4.0,2026-11-10"));
    expect(view.lines.map((l) => l.action)).toEqual(["add", "rejected"]);
    expect(view.lines[1]).toMatchObject({ provenance: null, status: null, problems: ["The licence is not CC0-1.0 or ODbL-1.0."] });
    expect(view.saveCount).toBe(1);
  });
  it("marks a line identical to a saved observation as already saved", () => {
    const s1 = sampleRecords()[0]!;
    const line = `${s1.id},${s1.name},${s1.wheelchair},${s1.lat},${s1.lon},${s1.source},${s1.licence},${s1.observedOn}`;
    const view = ready(sheet(line));
    expect(view.lines[0]?.action).toBe("same");
    expect(view.saveCount).toBe(0);
  });
  it("plans a replace and names the changed fields", () => {
    const s1 = sampleRecords()[0]!;
    const line = `${s1.id},${s1.name},no,${s1.lat},${s1.lon},${s1.source},${s1.licence},2026-11-12`;
    const view = ready(sheet(line));
    expect(view.lines[0]).toMatchObject({ action: "replace", changed: ["status", "date seen"] });
  });
  it("stops adding at the device limit", () => {
    const full = Array.from({ length: MAX_DRAFTS }, (_, i) => ({ ...sampleRecords()[0]!, id: `f${i}` }));
    const view = ready(sheet(GOOD), full);
    expect(view.lines[0]?.action).toBe("over-limit");
    expect(view.saveCount).toBe(0);
  });
  it("writes French when asked", () => {
    const view = buildImportView(sheet(GOOD), [], SAMPLE_TODAY, "fr");
    expect(view.kind === "ready" && view.lines[0]?.actionLabel).toBe("Sera ajouté");
    expect(view.kind === "ready" && view.lines[0]?.provenance).toContain("Niveau : UNKNOWN.");
  });
  it("does not change the saved observations", () => {
    const saved = sampleRecords();
    const copy = JSON.parse(JSON.stringify(saved));
    buildImportView(sheet(GOOD), saved, SAMPLE_TODAY, "en");
    expect(saved).toEqual(copy);
  });
});

describe("visibleLines", () => {
  const view = ready(sheet(GOOD, "n2,Bad,yes,x,-79.4,own visit,CC0-1.0,2026-11-10"));
  it("shows all lines by default, as a copy", () => {
    expect(visibleLines(view.lines, false)).toEqual(view.lines);
    expect(visibleLines(view.lines, false)).not.toBe(view.lines);
  });
  it("shows only the lines that will not be saved when asked", () => {
    expect(visibleLines(view.lines, true).map((l) => l.line)).toEqual([3]);
  });
});

describe("saveImport", () => {
  it("saves the planned lines to the drafts", () => {
    const storage = new MemoryStorage();
    const store = createDraftStore(storage);
    const view = ready(sheet(GOOD, "n2,,,43.9,-79.5,field notes,ODbL-1.0,2026-11-11"), []);
    expect(saveImport(store, view.plan)).toEqual({ kind: "saved", count: 2 });
    const saved = store.list();
    expect(saved.map((r) => r.id)).toEqual(["n1", "n2"]);
    expect(saved[1]).toMatchObject({ name: null, wheelchair: "UNKNOWN", licence: "ODbL-1.0", source: "field notes" });
  });
  it("replaces a saved observation with the same id", () => {
    const storage = new MemoryStorage();
    const store = createDraftStore(storage);
    store.add(sampleRecords()[0]!);
    const s1 = sampleRecords()[0]!;
    const view = ready(sheet(`${s1.id},${s1.name},no,${s1.lat},${s1.lon},${s1.source},${s1.licence},${s1.observedOn}`), store.list());
    expect(saveImport(store, view.plan)).toEqual({ kind: "saved", count: 1 });
    expect(store.list()).toHaveLength(1);
    expect(store.list()[0]?.wheelchair).toBe("no");
  });
  it("saves nothing for a sheet with nothing to save", () => {
    const storage = new MemoryStorage();
    const view = ready(sheet("n2,Bad,yes,x,-79.4,own visit,CC0-1.0,2026-11-10"), []);
    expect(saveImport(createDraftStore(storage), view.plan)).toEqual({ kind: "saved", count: 0 });
    expect(storage.data.has(DRAFTS_KEY)).toBe(false);
  });
  it("reports a device that cannot save", () => {
    const storage = new MemoryStorage();
    storage.failWith = new Error("blocked");
    const view = ready(sheet(GOOD), []);
    expect(saveImport(createDraftStore(storage), view.plan)).toEqual({ kind: "failed" });
  });
  it("reports a partial save and how many were kept", () => {
    let calls = 0;
    const store = { add: () => ((calls += 1) <= 1 ? ({ ok: true } as const) : ({ ok: false, reason: "storage-full" } as const)) };
    const view = ready(sheet(GOOD, "n2,,,43.9,-79.5,field notes,ODbL-1.0,2026-11-11"), []);
    expect(saveImport(store, view.plan)).toEqual({ kind: "partly", count: 1 });
  });
});

describe("files", () => {
  it("makes an empty sheet in each language", () => {
    expect(templateFile(SAMPLE_TODAY, "en")).toMatchObject({ filename: "my-observations-template.csv", mime: "text/csv" });
    expect(templateFile(SAMPLE_TODAY, "fr").content).toContain("nom,etat,latitude");
  });
  it("makes a sheet of the saved observations that reads back with no change", () => {
    const saved = sampleRecords();
    const file = savedSheetFile(saved, SAMPLE_TODAY, "en");
    expect(file.filename).toBe("my-observations-2026-11-15.csv");
    const view = ready(file.content, saved);
    expect(view.lines.every((l) => l.action === "same")).toBe(true);
  });
});
