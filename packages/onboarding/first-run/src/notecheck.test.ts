import { describe, expect, it } from "vitest";
import { COPY, NOTE_FLAGS, OLD_RECORD_MONTHS, checkNotes, findBanned, flagLabel, noteCheckFilename, noteCheckToText, noteFlags, type Note } from "./index";
import { makeRng, randomNotes } from "./testkit";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));

const NOTES = (): Note[] => [
  testNote("e1", "Arena", []),
  testNote("o1", "Bakery", [{ key: "elevator", value: "yes", on: "2024-11-19" }, { key: "automatic-door", value: "no", on: "2023-01-01" }], "2 Main St"),
  testNote("m1", "Cafe", [{ key: "elevator", value: "yes", on: "2024-11-19" }, { key: "step-free-entry", value: "yes", on: "2026-01-01" }], "3 Main St"),
  testNote("n1", "Deli", [{ key: "elevator", value: "yes" }], null),
  testNote("x1", "Hall", [], null),
];

const flagsOf = (id: string): string[] => noteFlags(NOTES().find((n) => n.id === id) as Note, TODAY);

describe("noteFlags", () => {
  it("flags a note with no Yes or No", () => {
    expect(flagsOf("e1")).toEqual(["empty"]);
  });

  it("flags a note whose every record is two years old or more, counting whole months", () => {
    expect(OLD_RECORD_MONTHS).toBe(24);
    expect(flagsOf("o1")).toEqual(["old"]);
    const justUnder = testNote("u1", "Bakery", [{ key: "elevator", value: "yes", on: "2024-11-20" }]);
    expect(noteFlags(justUnder, TODAY)).toEqual([]);
  });

  it("does not flag a note with at least one newer record", () => {
    expect(flagsOf("m1")).toEqual([]);
  });

  it("flags a missing address, alone or with another flag, and never calls an empty note old", () => {
    expect(flagsOf("n1")).toEqual(["noAddress"]);
    expect(flagsOf("x1")).toEqual(["empty", "noAddress"]);
  });
});

describe("checkNotes", () => {
  it("lists flagged notes by name and counts each flag", () => {
    const c = checkNotes(NOTES(), TODAY);
    expect(c.notes).toBe(5);
    expect(c.flagged.map((x) => x.note.placeName)).toEqual(["Arena", "Bakery", "Deli", "Hall"]);
    expect(c.counts).toEqual({ empty: 2, old: 1, noAddress: 2 });
  });

  it("puts the newest note first when two share a name", () => {
    const a = { ...testNote("a1", "Hall", [], null), createdOn: "2026-01-01" };
    const b = { ...testNote("b1", "Hall", [], null), createdOn: "2026-05-05" };
    expect(checkNotes([a, b], TODAY).flagged.map((x) => x.note.id)).toEqual(["b1", "a1"]);
  });

  it("counts agree with the flags on random notes, and never change a note", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const notes = randomNotes(makeRng(seed), 15);
      const before = JSON.stringify(notes);
      const c = checkNotes(notes, TODAY);
      expect(JSON.stringify(notes), String(seed)).toBe(before);
      for (const f of NOTE_FLAGS) expect(c.counts[f], `${seed} ${f}`).toBe(notes.filter((n) => noteFlags(n, TODAY).includes(f)).length);
      for (const x of c.flagged) {
        expect(x.flags.length, String(seed)).toBeGreaterThan(0);
        expect(x.flags.includes("empty") && x.flags.includes("old"), String(seed)).toBe(false);
      }
      expect(c.flagged.length, String(seed)).toBe(notes.filter((n) => noteFlags(n, TODAY).length > 0).length);
    }
  });
});

describe("wording and text", () => {
  it("names the flags in both languages", () => {
    expect(NOTE_FLAGS.map((f) => flagLabel(f, "en"))).toEqual(["No Yes or No recorded", "Every record is 2 years old or more", "No address"]);
    expect(NOTE_FLAGS.map((f) => flagLabel(f, "fr"))).toEqual(["Aucun Oui ni Non enregistré", "Toutes les données datent de 2 ans ou plus", "Pas d’adresse"]);
  });

  it("writes the counts and each flagged note with its flags", () => {
    const text = noteCheckToText(checkNotes(NOTES(), TODAY), "en", TODAY);
    expect(text.startsWith("Notes to check\n==============\n\n")).toBe(true);
    expect(text).toContain("No Yes or No recorded: 2\nEvery record is 2 years old or more: 1\nNo address: 2\n");
    expect(text).toContain("- Bakery, 2 Main St (added 2026-10-01)\n  * Every record is 2 years old or more\n");
    expect(text).toContain("- Hall (added 2026-10-01)\n  * No Yes or No recorded\n  * No address\n");
    expect(text).not.toContain("Cafe");
    expect(text.endsWith("Made on 2026-11-19.\n")).toBe(true);
  });

  it("says when there are no notes, or nothing to check", () => {
    expect(noteCheckToText(checkNotes([], TODAY), "en", TODAY)).toContain(COPY.noteCheck.noNotes.en);
    expect(noteCheckToText(checkNotes([NOTES()[2] as Note], TODAY), "en", TODAY)).toContain(COPY.noteCheck.none.en);
  });

  it("keeps French typography and never calls a note wrong", () => {
    const fr = noteCheckToText(checkNotes(NOTES(), TODAY), "fr", TODAY);
    expect(fr).toContain("Pas d’adresse\u00A0: 2");
    expect(fr).not.toMatch(/[^\u00A0\u202F](?=[:;?!])/u);
    for (const l of ["en", "fr"] as const) {
      const text = noteCheckToText(checkNotes(NOTES(), TODAY), l, TODAY).replace(COPY.noteCheck.notFault[l], "");
      expect(findBanned(text), l).toBeUndefined();
      expect(text, l).not.toMatch(/\b(wrong|invalid|bad|error|faux|invalide|erreur|inconnu)/i);
    }
  });

  it("names the file by date and language", () => {
    expect(noteCheckFilename(TODAY, "en")).toBe("notes-to-check-2026-11-19-en.txt");
    expect(noteCheckFilename(TODAY, "fr")).toBe("notes-a-revoir-2026-11-19-fr.txt");
  });
});
