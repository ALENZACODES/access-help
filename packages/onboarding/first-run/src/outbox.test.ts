import { describe, expect, it } from "vitest";
import {
  LIMITS,
  NOTES_KEY,
  addNote,
  clearNotes,
  emptyForm,
  loadNotes,
  memoryStore,
  removeNote,
  saveNotes,
  toNote,
  type KeyValueStore,
  type Note,
} from "./index";

const TODAY = new Date(Date.UTC(2026, 10, 15));

function mk(id: string, name = `Place ${id}`): Note {
  const f = emptyForm(TODAY);
  return toNote({ ...f, placeName: name, licence: "CC0-1.0", details: { ...f.details, elevator: "yes" } }, TODAY, () => id);
}

describe("notes storage", () => {
  it("adds newest first and reads back", () => {
    const s = memoryStore();
    addNote(s, mk("a"));
    const r = addNote(s, mk("b"));
    expect(r.result).toBe("saved");
    expect(loadNotes(s).notes.map((n) => n.id)).toEqual(["b", "a"]);
  });

  it("replaces a note with the same id instead of duplicating it", () => {
    const s = memoryStore();
    addNote(s, mk("a", "First"));
    addNote(s, mk("a", "Second"));
    const notes = loadNotes(s).notes;
    expect(notes.length).toBe(1);
    expect(notes[0]?.placeName).toBe("Second");
  });

  it("removes by id and ignores unknown ids", () => {
    const s = memoryStore();
    addNote(s, mk("a"));
    addNote(s, mk("b"));
    expect(removeNote(s, "a").notes.map((n) => n.id)).toEqual(["b"]);
    expect(removeNote(s, "zzz").notes.length).toBe(1);
  });

  it("refuses to go past the limit without changing anything", () => {
    const s = memoryStore();
    saveNotes(s, Array.from({ length: LIMITS.notes }, (_, i) => mk(`n${i}`)));
    const r = addNote(s, mk("extra"));
    expect(r.result).toBe("full");
    expect(loadNotes(s).notes.length).toBe(LIMITS.notes);
    expect(saveNotes(s, Array.from({ length: LIMITS.notes + 1 }, (_, i) => mk(`m${i}`)))).toBe("full");
  });

  it("drops invalid and duplicate entries when loading and counts them", () => {
    const s = memoryStore();
    const good = mk("ok");
    s.setItem(NOTES_KEY, JSON.stringify([good, { id: "bad" }, good, 5, null]));
    const r = loadNotes(s);
    expect(r.notes.map((n) => n.id)).toEqual(["ok"]);
    expect(r.dropped).toBe(4);
  });

  it("returns an empty list for corrupt or missing data", () => {
    const s = memoryStore();
    expect(loadNotes(s)).toEqual({ notes: [], dropped: 0 });
    s.setItem(NOTES_KEY, "{");
    expect(loadNotes(s).notes).toEqual([]);
    s.setItem(NOTES_KEY, '{"a":1}');
    expect(loadNotes(s).notes).toEqual([]);
    expect(loadNotes(undefined).notes).toEqual([]);
  });

  it("reports unavailable storage and never throws", () => {
    const broken: KeyValueStore = {
      getItem: () => { throw new Error("denied"); },
      setItem: () => { throw new Error("full"); },
      removeItem: () => { throw new Error("denied"); },
    };
    expect(saveNotes(broken, [])).toBe("unavailable");
    expect(saveNotes(undefined, [])).toBe("unavailable");
    expect(addNote(broken, mk("a")).result).toBe("unavailable");
    expect(loadNotes(broken).notes).toEqual([]);
    expect(() => clearNotes(broken)).not.toThrow();
  });

  it("clears everything", () => {
    const s = memoryStore();
    addNote(s, mk("a"));
    clearNotes(s);
    expect(s.getItem(NOTES_KEY)).toBeNull();
  });
});
