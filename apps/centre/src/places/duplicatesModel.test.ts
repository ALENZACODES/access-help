import { describe, expect, it } from "vitest";
import { buildDuplicatesView, cleanDistance, keepOne, putBack } from "./duplicatesModel.js";
import { createDraftStore } from "./store.js";
import { MemoryStorage, sampleRecords } from "./testing.js";
import type { PlaceRecord } from "./types.js";

const s1 = sampleRecords()[0]!;
const note = (over: Partial<PlaceRecord>): PlaceRecord => ({ ...s1, ...over });

/** Two notes about 11 m apart with the same name, and one far away. */
const records: PlaceRecord[] = [
  note({ id: "a", observedOn: "2026-11-01" }),
  note({ id: "b", lat: 43.8501, observedOn: "2026-11-05" }),
  note({ id: "far", lat: 44.5, name: "Sample Depot" }),
];
const none = new Set<string>();

describe("cleanDistance", () => {
  it("keeps an offered distance and replaces anything else with the default", () => {
    expect(cleanDistance(10)).toBe(10);
    expect(cleanDistance(50)).toBe(50);
    expect(cleanDistance(7)).toBe(25);
    expect(cleanDistance(Number.NaN)).toBe(25);
  });
});

describe("buildDuplicatesView", () => {
  const view = buildDuplicatesView(records, 25, none, "en");
  it("shows one group for the two close notes and leaves the far one out", () => {
    expect(view.groups).toHaveLength(1);
    expect(view.groups[0]?.members.map((m) => m.record.id)).toEqual(["b", "a"]);
  });
  it("suggests the newest when the status agrees, and marks it", () => {
    const group = view.groups[0]!;
    expect(group.suggestedKeep).toBe("b");
    expect(group.members.map((m) => m.suggested)).toEqual([true, false]);
    expect(group.kindLabel).toBe("Same status, different details");
  });
  it("gives each member its record line with source, licence, date and tier", () => {
    for (const member of view.groups[0]!.members) expect(member.line).toMatch(/^Status: yes\. Source: .+\. Licence: CC0-1\.0\. Seen on 2026-11-0\d\. Tier: UNKNOWN\.$/);
  });
  it("says why the notes are linked", () => expect(view.groups[0]?.links[0]).toMatch(/^Similar names, 11 m apart\.$/));
  it("suggests nothing when the person's own notes disagree", () => {
    const clash = buildDuplicatesView([records[0]!, note({ id: "b", lat: 43.8501, wheelchair: "no" })], 25, none, "en");
    expect(clash.groups[0]).toMatchObject({ kind: "status-differs", suggestedKeep: null });
    expect(clash.groups[0]?.members.some((m) => m.suggested)).toBe(false);
    expect(clash.groups[0]?.advice).toMatch(/does not choose between them/);
  });
  it("leaves out a group the person said is different places", () => {
    const key = view.groups[0]!.key;
    const hiddenView = buildDuplicatesView(records, 25, new Set([key]), "en");
    expect(hiddenView.groups).toEqual([]);
    expect(hiddenView.summary).toContain("Groups that may be one place: 1.");
  });
  it("finds nothing at a distance too small, and says so", () => {
    const tight = buildDuplicatesView(records, 10, none, "en");
    expect(tight.groups).toEqual([]);
    expect(tight.summary).toContain("None of them look like the same place saved twice.");
  });
  it("falls back to the default distance for one that is not offered", () => {
    expect(buildDuplicatesView(records, 3, none, "en").summary).toContain("Distance used: 25 m.");
  });
  it("writes French when asked", () => {
    const fr = buildDuplicatesView(records, 25, none, "fr");
    expect(fr.groups[0]?.kindLabel).toBe("Même état, détails différents");
    expect(fr.groups[0]?.members[0]?.line).toContain("Niveau : UNKNOWN.");
  });
  it("is calm with no observations and does not change its input", () => {
    expect(buildDuplicatesView([], 25, none, "en")).toEqual({ summary: "You have no saved observations.", groups: [] });
    const copy = JSON.parse(JSON.stringify(records));
    buildDuplicatesView(records, 25, none, "en");
    expect(records).toEqual(copy);
  });
});

describe("keepOne and putBack", () => {
  function seeded() {
    const store = createDraftStore(new MemoryStorage());
    for (const record of records) store.add(record);
    return store;
  }
  it("keeps the chosen note, removes the others in the group, and leaves the rest alone", () => {
    const store = seeded();
    const group = buildDuplicatesView(store.list(), 25, none, "en").groups[0]!.group;
    const out = keepOne(store, group, "a");
    expect(out.ok && out.removed.map((r) => r.id)).toEqual(["b"]);
    expect(store.list().map((r) => r.id).sort()).toEqual(["a", "far"]);
  });
  it("removes nothing for an id that is not in the group", () => {
    const store = seeded();
    const group = buildDuplicatesView(store.list(), 25, none, "en").groups[0]!.group;
    expect(keepOne(store, group, "far")).toEqual({ ok: false });
    expect(store.list()).toHaveLength(3);
  });
  it("puts the removed notes back exactly as they were", () => {
    const store = seeded();
    const group = buildDuplicatesView(store.list(), 25, none, "en").groups[0]!.group;
    const out = keepOne(store, group, "a");
    expect(putBack(store, out.ok ? out.removed : [])).toBe(1);
    expect(store.list().find((r) => r.id === "b")).toEqual(records[1]);
  });
  it("reports a device that cannot save when putting back", () => {
    const storage = new MemoryStorage();
    const store = createDraftStore(storage);
    storage.failWith = new Error("blocked");
    expect(putBack(store, [records[1]!])).toBeNull();
  });
  it("puts back nothing for an empty list", () => expect(putBack(seeded(), [])).toBe(0));
});
