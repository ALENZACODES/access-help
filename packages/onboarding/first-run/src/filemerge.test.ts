import { describe, expect, it } from "vitest";
import { exportNotes, importNotes } from "./exchange";
import {
  MAX_FILES,
  NO_CHOICES,
  applyChoices,
  cleanLabel,
  contentWithoutId,
  freshId,
  mergedExport,
  noteContent,
  planMerge,
  pruneChoices,
  trimLabel,
  type MergeInput,
} from "./filemerge";
import { LIMITS } from "./model";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 20));

const file = (label: string, ...notes: ReturnType<typeof testNote>[]): MergeInput => ({ label, text: exportNotes(notes, "2026-11-01") });

const lib = testNote("n1", "Library", [{ key: "elevator", value: "yes" }]);
const libNo = testNote("n1", "Library", [{ key: "elevator", value: "no", on: "2026-11-02" }]);
const pool = testNote("n2", "Pool", [], "9 Lake Rd");
const poolCopy = testNote("p9", "Pool", [], "9 Lake Rd");
const arena = testNote("n3", "Arena", [], "5 Rink Rd");

describe("labels", () => {
  it("keep one plain line and fall back to the file's number", () => {
    expect(trimLabel("  sam\n notes.json  ")).toBe("sam notes.json");
    expect(cleanLabel("", 2)).toBe("#3");
    expect(cleanLabel("x".repeat(200), 0)).toHaveLength(80);
    expect(trimLabel("a\u0007b")).toBe("a b");
  });
});

describe("planMerge", () => {
  it("joins notes from every file in order", () => {
    const plan = planMerge([file("a", lib, pool), file("b", arena)], TODAY);
    expect(plan.base.map((r) => [r.file, r.note.id])).toEqual([
      [0, "n1"],
      [0, "n2"],
      [1, "n3"],
    ]);
    expect(plan.clashes).toEqual([]);
    expect(plan.copies).toEqual([]);
  });

  it("keeps the same note found again once", () => {
    const plan = planMerge([file("a", lib), file("b", lib)], TODAY);
    expect(plan.sameAgain).toBe(1);
    expect(applyChoices(plan, NO_CHOICES).notes).toHaveLength(1);
  });

  it("finds a clash when one id holds different content", () => {
    const plan = planMerge([file("a", lib), file("b", libNo)], TODAY);
    expect(plan.clashes.map((c) => [c.key, c.first.file, c.later.file])).toEqual([["n1@1", 0, 1]]);
  });

  it("finds a copy when another id holds the same content", () => {
    const plan = planMerge([file("a", pool), file("b", poolCopy)], TODAY);
    expect(plan.copies.map((c) => [c.kept.note.id, c.copy.note.id])).toEqual([["n2", "p9"]]);
    expect(contentWithoutId(pool)).toBe(contentWithoutId(poolCopy));
    expect(noteContent(pool)).not.toBe(noteContent(poolCopy));
  });

  it("lists files it cannot use and leaves them out", () => {
    const plan = planMerge([file("a", lib), { label: "bad", text: "nope" }, { label: "", text: exportNotes([], "2026-11-01") }, file("d", arena)], TODAY);
    expect(plan.problems).toEqual([
      { index: 1, label: "bad", error: "not-json" },
      { index: 2, label: "#3", error: "no-notes" },
    ]);
    expect(plan.files.map((f) => f.index)).toEqual([0, 3]);
  });

  it("counts entries each file leaves out", () => {
    const text = JSON.stringify({ format: "app-notes", version: 1, notes: [lib, { id: "bad" }] });
    const plan = planMerge([{ label: "a", text }, file("b", arena)], TODAY);
    expect(plan.files[0]?.leftOut).toBe(1);
  });

  it("reads at most the file limit", () => {
    const inputs = Array.from({ length: MAX_FILES + 2 }, (_, i) => file(`f${i}`, testNote(`x${i}`, `Place ${i}`)));
    expect(planMerge(inputs, TODAY).files).toHaveLength(MAX_FILES);
  });

  it("reads each Yes or No with the App's rules, so one without a source is UNKNOWN", () => {
    const text = JSON.stringify({
      format: "app-notes",
      version: 1,
      notes: [{ id: "z", placeName: "Zoo", createdOn: "2026-10-01", licence: "CC0-1.0", facts: [{ key: "elevator", value: "yes" }] }],
    });
    const plan = planMerge([{ label: "a", text }, file("b", arena)], TODAY);
    expect(plan.base[0]?.note.facts.find((f) => f.key === "elevator")?.value).toBe("unknown");
  });
});

describe("applyChoices", () => {
  const plan = planMerge([file("a", lib, pool), file("b", libNo, poolCopy, arena)], TODAY);

  it("keeps the earlier version and every copy by default", () => {
    const r = applyChoices(plan, NO_CHOICES);
    expect(r.notes.map((n) => n.id)).toEqual(["n1", "n2", "p9", "n3"]);
    expect(r.notes[0]).toEqual(lib);
    expect(r.renamed).toEqual([]);
  });

  it("can keep the later version in the earlier one's place", () => {
    const r = applyChoices(plan, { clashes: { "n1@1": "later" }, dropCopies: [] });
    expect(r.notes.map((n) => n.id)).toEqual(["n1", "n2", "p9", "n3"]);
    expect(r.notes[0]).toEqual(libNo);
  });

  it("can keep both, giving the later one a fresh id", () => {
    const r = applyChoices(plan, { clashes: { "n1@1": "both" }, dropCopies: [] });
    expect(r.notes.map((n) => n.id)).toEqual(["n1", "n2", "n1-2", "p9", "n3"]);
    expect(r.renamed).toEqual([["n1", "n1-2"]]);
    expect(r.notes.find((n) => n.id === "n1-2")?.facts).toEqual(libNo.facts);
  });

  it("can leave a copy out", () => {
    const r = applyChoices(plan, { clashes: {}, dropCopies: ["p9@1"] });
    expect(r.notes.map((n) => n.id)).toEqual(["n1", "n2", "n3"]);
    expect(r.droppedCopies).toBe(1);
  });

  it("never changes a record", () => {
    const r = applyChoices(plan, { clashes: { "n1@1": "both" }, dropCopies: [] });
    for (const n of r.notes) {
      const from = [lib, libNo, pool, poolCopy, arena].find((x) => x.placeName === n.placeName && JSON.stringify(x.facts) === JSON.stringify(n.facts));
      expect(from, n.id).toBeDefined();
    }
  });

  it("says when the result holds more notes than a device keeps", () => {
    const many = Array.from({ length: LIMITS.notes + 1 }, (_, i) => testNote(`m${i}`, `Place ${i}`, [], `${i} Main St`));
    const big = planMerge([file("a", ...many.slice(0, 150)), file("b", ...many.slice(150))], TODAY);
    expect(applyChoices(big, NO_CHOICES).overDeviceLimit).toBe(true);
    expect(applyChoices(plan, NO_CHOICES).overDeviceLimit).toBe(false);
  });
});

describe("freshId", () => {
  it("adds a number that is not taken, within the id rules", () => {
    expect(freshId("n1", new Set(["n1"]))).toBe("n1-2");
    expect(freshId("n1", new Set(["n1", "n1-2", "n1-3"]))).toBe("n1-4");
    const long = "x".repeat(64);
    const id = freshId(long, new Set([long]));
    expect(id).toHaveLength(64);
    expect(id.endsWith("-2")).toBe(true);
    expect(/^[A-Za-z0-9_-]{1,64}$/.test(id)).toBe(true);
  });

  it("does not reuse an id that is already in the files", () => {
    const taken = testNote("n1-2", "Other", [], "2 King St");
    const plan = planMerge([file("a", lib, taken), file("b", libNo)], TODAY);
    const r = applyChoices(plan, { clashes: { "n1@1": "both" }, dropCopies: [] });
    expect(r.renamed).toEqual([["n1", "n1-3"]]);
    expect(new Set(r.notes.map((n) => n.id)).size).toBe(r.notes.length);
  });
});

describe("mergedExport", () => {
  it("is a notes export the App reads in full", () => {
    const plan = planMerge([file("a", lib, pool), file("b", libNo, poolCopy, arena)], TODAY);
    const text = mergedExport(applyChoices(plan, { clashes: { "n1@1": "both" }, dropCopies: [] }), TODAY);
    const back = importNotes(text);
    expect(back.error).toBeUndefined();
    expect(back.rejected).toBe(0);
    expect(back.notes.map((n) => n.id)).toEqual(["n1", "n2", "n1-2", "p9", "n3"]);
    expect(JSON.parse(text).exportedOn).toBe("2026-11-20");
  });
});

describe("pruneChoices", () => {
  it("drops choices that no longer match a clash or copy", () => {
    const plan = planMerge([file("a", lib, pool), file("b", libNo, poolCopy)], TODAY);
    const kept = pruneChoices(plan, { clashes: { "n1@1": "later", "gone@4": "both" }, dropCopies: ["p9@1", "old@2"] });
    expect(kept).toEqual({ clashes: { "n1@1": "later" }, dropCopies: ["p9@1"] });
  });

  it("drops a value that is not a choice", () => {
    const plan = planMerge([file("a", lib), file("b", libNo)], TODAY);
    expect(pruneChoices(plan, { clashes: { "n1@1": "maybe" as "first" }, dropCopies: [] }).clashes).toEqual({});
  });
});
