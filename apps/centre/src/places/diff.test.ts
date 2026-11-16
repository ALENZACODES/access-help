import { describe, expect, it } from "vitest";
import { buildPackManifest } from "./docs-bridge.js";
import { changeKinds, diffPacks } from "./diff.js";
import { SAMPLE_TODAY, sampleRecords } from "./testing.js";
import type { PlaceRecord } from "./types.js";

const pack = (id: string, records: PlaceRecord[]) => ({ manifest: buildPackManifest(id, records, SAMPLE_TODAY), records, warnings: [] });
const base = sampleRecords();
const edit = (id: string, extra: Partial<PlaceRecord>) => base.map((r) => (r.id === id ? { ...r, ...extra } : r));

describe("changeKinds", () => {
  it("lists each field that differs, and nothing for equal records", () => {
    const a = base[0]!;
    expect(changeKinds(a, { ...a })).toEqual([]);
    expect(changeKinds(a, { ...a, wheelchair: "no", name: "New", source: "other", licence: "ODbL-1.0", observedOn: "2026-11-02" })).toEqual(["status", "name", "source", "licence", "date"]);
  });
  it("calls a move a location change only beyond the tolerance", () => {
    const a = base[0]!;
    expect(changeKinds(a, { ...a, lat: a.lat + 0.0005 })).toEqual([]);
    expect(changeKinds(a, { ...a, lat: a.lat + 0.01 })).toEqual(["location"]);
  });
  it("treats a missing name and an empty name as the same", () => {
    const a = { ...base[0]!, name: null };
    expect(changeKinds(a, { ...a, name: "" })).toEqual([]);
  });
});

describe("diffPacks", () => {
  it("is empty for the same pack", () => {
    const diff = diffPacks(pack("a", base), pack("b", base));
    expect(diff).toMatchObject({ added: [], removed: [], changed: [], unchanged: 5, transitions: [] });
  });
  it("lists added and removed places by id", () => {
    const newer = [...base.slice(1), { ...base[0]!, id: "s9", name: "Added" }];
    const diff = diffPacks(pack("a", base), pack("b", newer));
    expect(diff.removed.map((r) => r.id)).toEqual(["s1"]);
    expect(diff.added.map((r) => r.id)).toEqual(["s9"]);
    expect(diff.unchanged).toBe(4);
  });
  it("counts status transitions, including UNKNOWN, without judging them", () => {
    const newer = base.map((r) => (r.id === "s4" ? { ...r, wheelchair: "yes" as const } : r.id === "s1" ? { ...r, wheelchair: "UNKNOWN" as const } : r));
    const diff = diffPacks(pack("a", base), pack("b", newer));
    expect(diff.changed.map((c) => c.id).sort()).toEqual(["s1", "s4"]);
    expect(diff.transitions).toEqual(expect.arrayContaining([{ from: "UNKNOWN", to: "yes", count: 1 }, { from: "yes", to: "UNKNOWN", count: 1 }]));
    expect(JSON.stringify(diff)).not.toMatch(/improv|worse|better|upgrade|downgrade/i);
  });
  it("does not count a change of date alone as a status transition", () => {
    const diff = diffPacks(pack("a", base), pack("b", edit("s1", { observedOn: "2026-11-10" })));
    expect(diff.changed[0]?.kinds).toEqual(["date"]);
    expect(diff.transitions).toEqual([]);
  });
  it("adds up: unchanged, changed, and removed make the older pack; unchanged, changed, and added make the newer", () => {
    const newer = [...edit("s2", { wheelchair: "no" }).slice(2), { ...base[0]!, id: "n1" }];
    const diff = diffPacks(pack("a", base), pack("b", newer));
    expect(diff.unchanged + diff.changed.length + diff.removed.length).toBe(base.length);
    expect(diff.unchanged + diff.changed.length + diff.added.length).toBe(newer.length);
  });
});
