import { describe, expect, it } from "vitest";
import {
  FACT_KEYS,
  LIMITS,
  exportNotes,
  importNotes,
  isEmptyPreview,
  mergeNotes,
  parseNote,
  previewNotesImport,
  roomFor,
  type Note,
  type NotesPreview,
} from "./index";
import { makeRng, randomNotes } from "./testkit";

function note(id: string, name: string, address?: string, source = "City survey"): Note {
  const facts = FACT_KEYS.map((key) => (key === "elevator" ? { key, value: "yes", provenance: { source, licence: "CC0-1.0", recordedOn: "2026-10-01" } } : { key, value: "unknown" }));
  const n = parseNote({ id, placeName: name, address, createdOn: "2026-10-01", licence: "CC0-1.0", facts });
  if (!n) throw new Error(`bad ${id}`);
  return n;
}

const text = (notes: Note[]): string => exportNotes(notes, "2026-11-15");
const ok = (p: ReturnType<typeof previewNotesImport>): NotesPreview => {
  if (p.error !== undefined) throw new Error(`expected a preview, got ${p.error}`);
  return p;
};

describe("previewNotesImport", () => {
  const existing = [note("a", "Library", "1 Main St"), note("b", "Bakery", "2 Side Rd")];

  it("counts what is new, what is already here and what is not valid", () => {
    const incoming = text([note("a", "Library", "1 Main St"), note("c", "Cinema", "3 High St"), note("d", "Library", "1 Main St", "Town data")]);
    const withBad = incoming.replace('"notes": [', '"notes": [\n    {"nope": 1},');
    const p = ok(previewNotesImport(existing, withBad, "en"));
    expect(p).toMatchObject({ inText: 3, added: 2, alreadyHere: 1, overLimit: 0, rejected: 1 });
  });

  it("lists places that exist only in the new notes, and counts places that get more notes", () => {
    const p = ok(previewNotesImport(existing, text([note("c", "Cinema", "3 High St"), note("d", "Archive"), note("e", "Library", "1 Main St")]), "en"));
    expect(p.newPlaces).toEqual(["Archive", "Cinema"]);
    expect(p.morePlaces).toBe(1);
  });

  it("names each source once, in order", () => {
    const p = ok(previewNotesImport(existing, text([note("c", "C", "1 A St", "Zed"), note("d", "D", "2 A St", "Alpha"), note("e", "E", "3 A St", "Zed")]), "en"));
    expect(p.sources).toEqual(["Alpha", "Zed"]);
  });

  it("does not count sources of notes that would not be added", () => {
    const p = ok(previewNotesImport(existing, text([note("a", "Library", "1 Main St", "Only here")]), "en"));
    expect(p.sources).toEqual([]);
    expect(p.added).toBe(0);
    expect(isEmptyPreview(p)).toBe(true);
  });

  it("reports the same errors as the import itself", () => {
    for (const bad of ["", "   ", "{", "[]", '{"format":"other","notes":[]}', '{"format":"app-notes","version":9,"notes":[]}', "x".repeat(LIMITS.importChars + 1)]) {
      const p = previewNotesImport(existing, bad, "en");
      expect(p.error, bad.slice(0, 20)).toBe(importNotes(bad).error);
      expect(p.error).toBeDefined();
    }
  });

  it("leaves what is on the device alone", () => {
    const before = JSON.stringify(existing);
    previewNotesImport(existing, text([note("c", "Cinema", "3 High St")]), "en");
    expect(JSON.stringify(existing)).toBe(before);
  });

  it("says how many would be left out when the device is full", () => {
    const full = randomNotes(makeRng(2), LIMITS.notes).map((n, i) => ({ ...n, id: `old${i}` }));
    expect(roomFor(full)).toBe(0);
    const p = ok(previewNotesImport(full, text([note("new1", "Cinema", "3 High St"), note("new2", "Dojo", "4 High St")]), "en"));
    expect(p).toMatchObject({ inText: 2, added: 0, overLimit: 2, alreadyHere: 0 });
  });

  it("agrees with what the import really adds, for random notes", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const mine = randomNotes(makeRng(seed), 5 + (seed % 7));
      const theirs = randomNotes(makeRng(seed + 500), 6).map((n, i) => (i % 3 === 0 ? (mine[i % mine.length] as Note) : { ...n, id: `t${seed}-${i}` }));
      const p = ok(previewNotesImport(mine, text(theirs), "en"));
      const real = mergeNotes(mine, importNotes(text(theirs)).notes);
      expect(p.added, `seed ${seed}`).toBe(real.added);
      expect(p.added + p.alreadyHere + p.overLimit, `seed ${seed}`).toBe(p.inText);
    }
  });
});

describe("roomFor", () => {
  it("is the space left, never negative", () => {
    expect(roomFor([])).toBe(LIMITS.notes);
    expect(roomFor(randomNotes(makeRng(1), 3))).toBe(LIMITS.notes - 3);
    expect(roomFor(Array.from({ length: LIMITS.notes + 5 }, (_, i) => note(`n${i}`, "X")))).toBe(0);
  });
});
