import { describe, expect, it } from "vitest";
import { exportNotes, importNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import {
  ENTRY_PROBLEMS,
  MAX_ENTRIES,
  MAX_REPORTED,
  checkFile,
  cleanedCopy,
  dropReasons,
  droppedEntries,
  entryProblems,
  fileIsClean,
  leftOutEntries,
  noticeCounts,
  noticedEntries,
  type FileCheck,
} from "./filecheck";
import { LIMITS, parseNote } from "./model";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const PROV = { source: "City survey", licence: "CC0-1.0", recordedOn: "2026-10-01" };

/** A raw entry as it appears in a file. */
function raw(over: Record<string, unknown> = {}): Record<string, unknown> {
  return { id: "n1", placeName: "Library", address: "1 Main St", createdOn: "2026-10-01", licence: "CC0-1.0", facts: [], ...over };
}

const fileOf = (notes: unknown[], extra: Record<string, unknown> = {}): string => JSON.stringify({ format: "app-notes", version: 1, exportedOn: "2026-11-01", notes, ...extra });

function ok(text: string): FileCheck {
  const r = checkFile(text, TODAY);
  if (!r.ok) throw new Error(`expected a check, got ${r.error}`);
  return r.check;
}

describe("file-level errors", () => {
  it("match the import's", () => {
    const cases: Array<[string, string]> = [
      ["  ", "empty"],
      ["{", "not-json"],
      ["[]", "wrong-format"],
      ['"text"', "wrong-format"],
      [JSON.stringify({ format: "other", notes: [] }), "wrong-format"],
      [JSON.stringify({ format: "app-notes", version: 1 }), "wrong-format"],
      [JSON.stringify({ format: "app-notes", version: 2, notes: [] }), "wrong-version"],
    ];
    for (const [text, want] of cases) {
      const r = checkFile(text, TODAY);
      expect(r.ok, text).toBe(false);
      if (!r.ok) expect(r.error, text).toBe(want);
      expect(importNotes(text).error, text).toBe(want);
    }
  });

  it("refuses text over the import limit", () => {
    const r = checkFile(" ".repeat(LIMITS.importChars) + "x", TODAY);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("too-large");
  });
});

describe("entryProblems", () => {
  it("is empty for a note the App reads", () => {
    expect(entryProblems(raw())).toEqual([]);
    expect(parseNote(raw())).toBeDefined();
  });

  it("gives every reason, not only the first", () => {
    expect(entryProblems(raw({ id: "bad id!", placeName: "", createdOn: "2026-02-30", licence: "All rights reserved" }))).toEqual([
      "bad-id",
      "no-name",
      "bad-created-date",
      "licence-not-open",
    ]);
  });

  it("names each rule", () => {
    expect(entryProblems(null)).toEqual(["not-object"]);
    expect(entryProblems([1])).toEqual(["not-object"]);
    expect(entryProblems(raw({ placeName: "x".repeat(LIMITS.placeName + 1) }))).toEqual(["name-too-long"]);
    expect(entryProblems(raw({ placeName: "Lib\u0007rary" }))).toEqual(["name-control"]);
    expect(entryProblems(raw({ address: 12 }))).toEqual(["bad-address"]);
    expect(entryProblems(raw({ note: "x".repeat(LIMITS.note + 1) }))).toEqual(["bad-note-text"]);
    expect(entryProblems(raw({ note: "line one\nline two" }))).toEqual([]);
    expect(entryProblems(raw({ placeName: 7 }))).toEqual(["no-name"]);
  });
});

describe("dropReasons", () => {
  it("is empty for a full record", () => {
    expect(dropReasons(PROV)).toEqual([]);
  });

  it("says which part is missing", () => {
    expect(dropReasons(undefined)).toEqual(["no-provenance"]);
    expect(dropReasons({ ...PROV, source: " " })).toEqual(["no-source"]);
    expect(dropReasons({ ...PROV, licence: "CC-BY-NC-4.0" })).toEqual(["record-licence-not-open"]);
    expect(dropReasons({ ...PROV, recordedOn: "2026-13-01" })).toEqual(["bad-record-date"]);
    expect(dropReasons({})).toEqual(["no-source", "record-licence-not-open", "bad-record-date"]);
  });
});

describe("checkFile", () => {
  it("reads a clean file and says so", () => {
    const text = exportNotes([testNote("a", "Library", [{ key: "elevator", value: "yes" }]), testNote("b", "Pool")], "2026-11-01");
    const c = ok(text);
    expect(c.totals).toEqual({ entries: 2, readable: 2, leftOut: 0, dropped: 0, personal: 0 });
    expect(fileIsClean(c)).toBe(true);
    expect(c.exportedOn).toBe("2026-11-01");
  });

  it("leaves out bad entries with their reasons and keeps the rest", () => {
    const c = ok(fileOf([raw(), raw({ id: "n2", licence: "" }), 5, raw({ id: "n1", placeName: "Other" })]));
    expect(c.totals.readable).toBe(1);
    expect(leftOutEntries(c).map((e) => [e.position, e.problems])).toEqual([
      [2, ["licence-not-open"]],
      [3, ["not-object"]],
      [4, ["duplicate-id"]],
    ]);
    expect(leftOutEntries(c)[2]?.name).toBe("Other");
    expect(fileIsClean(c)).toBe(false);
  });

  it("reports Yes or No answers read as UNKNOWN, with what each lacks", () => {
    const c = ok(
      fileOf([
        raw({
          facts: [
            { key: "elevator", value: "yes" },
            { key: "automatic-door", value: "no", provenance: { ...PROV, licence: "Proprietary" } },
            { key: "step-free-entry", value: "yes", provenance: PROV },
          ],
        }),
      ]),
    );
    const e = droppedEntries(c)[0];
    expect(e?.dropped).toEqual([
      { key: "automatic-door", value: "no", reasons: ["record-licence-not-open"] },
      { key: "elevator", value: "yes", reasons: ["no-provenance"] },
    ]);
    expect(e?.note?.facts.find((f) => f.key === "elevator")?.value).toBe("unknown");
    expect(e?.note?.facts.find((f) => f.key === "step-free-entry")?.value).toBe("yes");
    expect(c.totals.dropped).toBe(2);
  });

  it("uses the first entry for a detail, as the App does, and notes the repeat", () => {
    const c = ok(fileOf([raw({ facts: [{ key: "elevator", value: "yes", provenance: PROV }, { key: "elevator", value: "no" }] })]));
    const e = c.entries[0];
    expect(e?.dropped).toEqual([]);
    expect(e?.notices).toContain("repeated-detail");
    expect(e?.note?.facts.find((f) => f.key === "elevator")?.value).toBe("yes");
  });

  it("notes other details, odd answers and future dates without changing the note", () => {
    const c = ok(
      fileOf([
        raw({
          facts: [
            { key: "parking", value: "yes", provenance: PROV },
            { key: "elevator", value: "maybe" },
            { key: "automatic-door", value: "yes", provenance: { ...PROV, recordedOn: "2027-01-01" } },
          ],
        }),
      ]),
    );
    expect(c.entries[0]?.notices).toEqual(expect.arrayContaining(["other-detail", "odd-value", "future-date"]));
    expect(c.entries[0]?.dropped).toEqual([]);
  });

  it("does not call an Unknown answer odd", () => {
    const c = ok(fileOf([raw({ facts: [{ key: "elevator", value: "unknown" }] })]));
    expect(c.entries[0]?.notices).not.toContain("odd-value");
  });

  it("notes an email address or phone number in a note's own words", () => {
    const c = ok(fileOf([raw({ note: "Ask Sam at sam@example.org" }), raw({ id: "n2", note: "Call 416 555 0100 first" }), raw({ id: "n3", note: "Ramp at the side" })]));
    expect(c.entries.map((e) => e.notices.filter((n) => n.endsWith("-in-text")))).toEqual([["email-in-text"], ["phone-in-text"], []]);
    expect(c.totals.personal).toBe(2);
  });

  it("carries the notes-to-check flags", () => {
    const c = ok(fileOf([raw({ address: undefined, facts: [{ key: "elevator", value: "yes", provenance: { ...PROV, recordedOn: "2020-01-01" } }] })]));
    expect(c.entries[0]?.notices).toEqual(expect.arrayContaining(["old", "noAddress"]));
    expect(noticeCounts(c).old).toBe(1);
    expect(noticedEntries(c)).toHaveLength(1);
  });

  it("leaves out entries past the App's limit and lists only the first ones", () => {
    const notes = Array.from({ length: MAX_ENTRIES + 3 }, (_, i) => raw({ id: `n${i}` }));
    const c = ok(fileOf(notes));
    expect(c.totals.entries).toBe(MAX_ENTRIES + 3);
    expect(c.totals.readable).toBe(MAX_ENTRIES);
    expect(c.totals.leftOut).toBe(3);
    expect(c.entries.length).toBe(Math.min(MAX_REPORTED, MAX_ENTRIES + 3));
  });

  it("ignores an exportedOn that is not a date", () => {
    expect(ok(fileOf([raw()], { exportedOn: "soon" })).exportedOn).toBeUndefined();
  });

  it("has a word for every problem the check can name", () => {
    expect(new Set(ENTRY_PROBLEMS).size).toBe(ENTRY_PROBLEMS.length);
  });
});

describe("cleanedCopy", () => {
  const text = fileOf([raw({ note: "Ask Sam at sam@example.org", facts: [{ key: "elevator", value: "yes" }, { key: "automatic-door", value: "no", provenance: PROV }] }), raw({ id: "x x" })]);
  const c = ok(text);

  it("is a notes export the App reads in full, with only the readable notes", () => {
    const copy = cleanedCopy(c, TODAY, true);
    const back = importNotes(copy);
    expect(back.error).toBeUndefined();
    expect(back.rejected).toBe(0);
    expect(back.notes.map((n) => n.id)).toEqual(["n1"]);
    expect(JSON.parse(copy).exportedOn).toBe("2026-11-20");
  });

  it("keeps answers with full records and turns the others into UNKNOWN", () => {
    const back = importNotes(cleanedCopy(c, TODAY, true)).notes[0];
    expect(back?.facts.find((f) => f.key === "elevator")?.value).toBe("unknown");
    expect(back?.facts.find((f) => f.key === "automatic-door")).toEqual({ key: "automatic-door", value: "no", provenance: PROV });
  });

  it("can leave out the notes' own words", () => {
    const back = importNotes(cleanedCopy(c, TODAY, false)).notes[0];
    expect(back?.note).toBeUndefined();
    expect(cleanedCopy(c, TODAY, false)).not.toContain("sam@example.org");
  });

  it("is clean when checked again", () => {
    expect(fileIsClean(ok(cleanedCopy(c, TODAY, true)))).toBe(true);
  });
});

/** A small seeded generator, so the fuzz test is the same on every run. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe("agreement with the App's import", () => {
  it("reads exactly the notes an import reads, for many odd files", () => {
    const r = rng(20261120);
    const pick = <T>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)] as T;
    const ids = ["a", "b", "c", "bad id", "", 3, undefined, "x".repeat(65)];
    const names = ["Library", " ", "", "Lib\u0001", "x".repeat(121), 4, undefined, "  Pool  "];
    const addrs = [undefined, null, "", "1 Main St", 9, "x".repeat(201), "a\nb"];
    const texts = [undefined, "", "Note", "a\nb", "a\u0002b", "x".repeat(501), {}];
    const dates = ["2026-10-01", "2026-02-29", "2024-02-29", "26-10-01", 5, undefined];
    const licences = ["CC0-1.0", "ODbL-1.0", "", "MIT", undefined];
    const values = ["yes", "no", "unknown", "maybe", undefined];
    const provs = [PROV, undefined, {}, { ...PROV, source: "" }, { ...PROV, recordedOn: "2026-02-30" }, { ...PROV, licence: "x" }];
    for (let round = 0; round < 300; round++) {
      const n = Math.floor(r() * 8);
      const notes: unknown[] = [];
      for (let i = 0; i < n; i++) {
        if (r() < 0.08) {
          notes.push(pick([null, 1, "text", [], true]));
          continue;
        }
        const facts = Array.from({ length: Math.floor(r() * 5) }, () => ({ key: pick([...FACT_KEYS, "parking"]), value: pick(values), provenance: pick(provs) }));
        notes.push({ id: pick(ids), placeName: pick(names), address: pick(addrs), note: pick(texts), createdOn: pick(dates), licence: pick(licences), facts });
      }
      const text = fileOf(notes);
      const c = ok(text);
      const imp = importNotes(text);
      expect(c.readable, text).toEqual(imp.notes);
      expect(c.totals.leftOut, text).toBe(imp.rejected);
      for (const e of c.entries) expect(e.note === undefined, text).toBe(e.problems.length > 0);
      for (const e of c.entries) {
        if (!e.note) continue;
        const unknownByDrop = e.dropped.map((d) => d.key);
        for (const k of unknownByDrop) expect(e.note.facts.find((f) => f.key === k)?.value).toBe("unknown");
      }
    }
  });
});
