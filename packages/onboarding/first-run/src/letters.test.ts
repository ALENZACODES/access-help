import { describe, expect, it } from "vitest";
import { exportNotes, importNotes } from "./exchange";
import { readStreetFile, type StreetFile } from "./filestreets";
import {
  CONTACT_MAX,
  LETTERS_CSV_COLUMNS,
  LETTER_LANGUAGES,
  MAX_LETTERS,
  SENDER_MAX,
  asksFor,
  isLetterLanguage,
  letterProblems,
  lettersCsv,
  lettersNotesFile,
  makeLetters,
  oneLine,
} from "./letters";
import type { Note } from "./model";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const BELL = String.fromCharCode(7);
const BOM = String.fromCharCode(0xfeff);
const ALL_YES = [
  { key: "step-free-entry", value: "yes" },
  { key: "accessible-washroom", value: "yes" },
  { key: "automatic-door", value: "yes" },
  { key: "elevator", value: "yes" },
] as const;

function lettersNotes(): Note[] {
  return [
    testNote("a", "Library", [{ key: "elevator", value: "yes" }], "100 King St W, Toronto ON M5H 2N2"),
    testNote("b", "Bank", ALL_YES, "40 King St W, Toronto ON M5H 1A1"),
    testNote("c", "Deli", [{ key: "step-free-entry", value: "yes", on: "2024-01-15" }, ...ALL_YES.slice(1)], "7 Queen St E, Toronto ON M5C 2N8"),
    testNote("d1", "Café", [{ key: "elevator", value: "yes" }], "12 King St W, Toronto ON M5H 2N3"),
    testNote("d2", "Café", [{ key: "elevator", value: "no", source: "Visit" }], "12 King St W, Toronto ON M5H 2N3"),
    testNote("n", "Cart", [], null),
  ];
}

function fileOf(notes: Note[]): StreetFile {
  const r = readStreetFile(exportNotes(notes, "2026-11-01"), TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const place = (f: StreetFile, name: string) => {
  const p = f.places.find((x) => x.name === name);
  if (!p) throw new Error(name);
  return p;
};

describe("languages", () => {
  it("knows the three languages a letter can be in, and nothing else", () => {
    expect(LETTER_LANGUAGES).toEqual(["en", "fr", "both"]);
    for (const x of LETTER_LANGUAGES) expect(isLetterLanguage(x)).toBe(true);
    for (const x of ["", "EN", "de", undefined, null]) expect(isLetterLanguage(x)).toBe(false);
  });
});

describe("the signer's name and contact", () => {
  it("needs a name and takes an empty contact", () => {
    expect(letterProblems({ sender: "Ana", contact: "" })).toEqual([]);
    expect(letterProblems({ sender: "   ", contact: "" })).toEqual(["sender-empty"]);
  });

  it("counts the length after trimming, at the limits and one past", () => {
    expect(letterProblems({ sender: ` ${"a".repeat(SENDER_MAX)} `, contact: "b".repeat(CONTACT_MAX) })).toEqual([]);
    expect(letterProblems({ sender: "a".repeat(SENDER_MAX + 1), contact: "b".repeat(CONTACT_MAX + 1) })).toEqual(["sender-long", "contact-long"]);
  });

  it("refuses control characters and line breaks in either field", () => {
    expect(letterProblems({ sender: `Ana${BELL}`, contact: "x" })).toEqual(["sender-control"]);
    expect(letterProblems({ sender: "Ana", contact: "a@b.ca\nmore" })).toEqual(["contact-control"]);
  });

  it("makes typed text one tidy line", () => {
    expect(oneLine("  Ana   and\tLuc  ")).toBe("Ana and Luc");
    expect(oneLine("")).toBe("");
  });
});

describe("what to ask a place", () => {
  it("asks about details with no record, in the App's order", () => {
    expect(asksFor(place(fileOf(lettersNotes()), "Library"), false, TODAY)).toEqual([
      { key: "step-free-entry", reason: "unknown" },
      { key: "accessible-washroom", reason: "unknown" },
      { key: "automatic-door", reason: "unknown" },
    ]);
  });

  it("asks about reports that differ, with the reason", () => {
    const asks = asksFor(place(fileOf(lettersNotes()), "Café"), false, TODAY);
    expect(asks.find((a) => a.key === "elevator")).toEqual({ key: "elevator", reason: "differ" });
    expect(asks).toHaveLength(4);
  });

  it("asks about a record a year old or more only when the person wants it", () => {
    const deli = place(fileOf(lettersNotes()), "Deli");
    expect(asksFor(deli, false, TODAY)).toEqual([]);
    expect(asksFor(deli, true, TODAY)).toEqual([{ key: "step-free-entry", reason: "old" }]);
  });

  it("asks nothing of a place whose details all have recent records", () => {
    expect(asksFor(place(fileOf(lettersNotes()), "Bank"), true, TODAY)).toEqual([]);
  });
});

describe("the letters", () => {
  it("writes one letter for each place with something to ask, in walking order, places with no street last", () => {
    const set = makeLetters(fileOf(lettersNotes()), false, TODAY, "en");
    expect(set.letters.map((l) => l.place.name)).toEqual(["Café", "Library", "Cart"]);
    expect(set.nothingOpen).toBe(2);
    expect(set.over).toBe(0);
  });

  it("adds the places with old records when asked", () => {
    const set = makeLetters(fileOf(lettersNotes()), true, TODAY, "en");
    expect(set.letters.map((l) => l.place.name)).toEqual(["Café", "Library", "Deli", "Cart"]);
    expect(set.nothingOpen).toBe(1);
  });

  it("writes nothing when no place has anything to ask", () => {
    const set = makeLetters(fileOf([testNote("b", "Bank", ALL_YES, "40 King St W")]), false, TODAY, "en");
    expect(set).toEqual({ letters: [], nothingOpen: 1, over: 0 });
  });

  it(`stops at ${MAX_LETTERS} letters and says how many places were left out`, () => {
    const notes = Array.from({ length: MAX_LETTERS + 3 }, (_, i) => testNote(`p${i}`, `Place ${i}`, [], `${i + 1} Elm St`));
    const set = makeLetters(fileOf(notes), false, TODAY, "en");
    expect(set.letters).toHaveLength(MAX_LETTERS);
    expect(set.over).toBe(3);
    expect(set.letters[0]?.place.name).toBe("Place 0");
    expect(set.letters.at(-1)?.place.name).toBe(`Place ${MAX_LETTERS - 1}`);
  });
});

describe("downloads", () => {
  it("gives the notes of the places written to, and only those, as a file the App reads back", () => {
    const set = makeLetters(fileOf(lettersNotes()), false, TODAY, "en");
    const back = importNotes(lettersNotesFile(set, TODAY));
    expect(back.error).toBeUndefined();
    expect(back.rejected).toBe(0);
    expect(back.notes.map((n) => n.id).sort()).toEqual(["a", "d1", "d2", "n"]);
  });

  it("gives a CSV to track letters and replies, with empty columns to fill in", () => {
    const set = makeLetters(fileOf(lettersNotes()), false, TODAY, "en");
    const csv = lettersCsv(set);
    expect(csv.startsWith(BOM)).toBe(true);
    const rows = csv.slice(1).trimEnd().split("\r\n");
    expect(rows[0]).toBe(LETTERS_CSV_COLUMNS.join(","));
    expect(rows).toHaveLength(4);
    expect(rows[2]).toBe('Library,"100 King St W, Toronto ON M5H 2N2",step-free-entry accessible-washroom automatic-door,unknown unknown unknown,,');
    expect(rows[3]).toBe("Cart,,step-free-entry accessible-washroom automatic-door elevator,unknown unknown unknown unknown,,");
  });

  it("guards a cell a spreadsheet would run as a formula", () => {
    const set = makeLetters(fileOf([testNote("x", "=SUM(A1)", [], "+1 Elm St")]), false, TODAY, "en");
    const row = lettersCsv(set).split("\r\n")[1];
    expect(row?.startsWith("'=SUM(A1),'+1 Elm St,")).toBe(true);
  });
});
