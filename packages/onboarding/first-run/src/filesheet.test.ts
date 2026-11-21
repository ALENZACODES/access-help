import { describe, expect, it } from "vitest";
import { importNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import {
  APP_COLUMNS,
  DEFAULT_WORDS,
  NO_FIXED,
  guessMapping,
  makeNotes,
  readSheet,
  readWord,
  setupProblems,
  sheetColumnFor,
  sheetNotesFile,
  toAppCsv,
  unmatchedWords,
  wordList,
  type FixedValues,
  type Mapping,
  type Sheet,
} from "./filesheet";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const FIXED: FixedValues = { source: "Mapping day, Elm St", licence: "CC-BY-4.0", recordedOn: "2026-11-14" };

const SHEET_TEXT = [
  "Nom;Adresse;Ascenseur;Ramp?;Notes du jour",
  "Bibliothèque;1 rue King;oui;Y;ok",
  "Piscine;9 Lake Rd;NON;;",
  "Café;12 King St;peut-être;?;",
  ";5 Rink Rd;oui;oui;",
].join("\n");

function sheet(text = SHEET_TEXT): Sheet {
  const r = readSheet(text);
  if (!r.ok) throw new Error(r.error);
  return r.sheet;
}

/** Name, address, elevator, step-free entrance, nothing. */
const MAPPING: Mapping = ["place_name", "address", "elevator", "step-free-entry", ""];

describe("readSheet", () => {
  it("reads semicolons, commas or tabs, with a header and rows", () => {
    expect(sheet().header).toEqual(["Nom", "Adresse", "Ascenseur", "Ramp?", "Notes du jour"]);
    expect(sheet().rows).toHaveLength(4);
    expect(sheet("a\tb\n1\t2").header).toEqual(["a", "b"]);
  });

  it("refuses an empty sheet, a header with no rows and an unclosed quote", () => {
    expect(readSheet("  ")).toEqual({ ok: false, error: "empty" });
    expect(readSheet("a,b\n")).toEqual({ ok: false, error: "no-rows" });
    expect(readSheet('a,b\n"x,1')).toEqual({ ok: false, error: "unclosed-quote" });
  });
});

describe("guessMapping", () => {
  it("guesses from the column names in English and French, once per target", () => {
    expect(guessMapping(["Nom", "Adresse", "Ascenseur", "Ramp?", "Notes du jour"])).toEqual(["place_name", "address", "elevator", "", ""]);
    expect(guessMapping(["Place name", "Address", "Elevator", "Source", "License", "Date recorded"])).toEqual(["place_name", "address", "elevator", "source", "licence", "recorded_on"]);
    expect(guessMapping(["Name", "Name"])).toEqual(["place_name", ""]);
  });

  it("guesses nothing it does not know", () => {
    expect(guessMapping(["Colour", "Ramp?", "Comments"])).toEqual(["", "", ""]);
  });
});

describe("words", () => {
  it("splits and folds the person's word lists", () => {
    expect(wordList(" Oui, Y ,,VRAI ")).toEqual(["oui", "y", "vrai"]);
  });

  it("reads a cell with the lists; blank is always UNKNOWN; anything else is not guessed", () => {
    expect(readWord("OUI", DEFAULT_WORDS)).toBe("yes");
    expect(readWord("Non", DEFAULT_WORDS)).toBe("no");
    expect(readWord("  ", DEFAULT_WORDS)).toBe("unknown");
    expect(readWord("?", DEFAULT_WORDS)).toBe("unknown");
    expect(readWord("peut-être", DEFAULT_WORDS)).toBeUndefined();
    expect(readWord("ramp at side", DEFAULT_WORDS)).toBeUndefined();
  });

  it("can take the person's own words", () => {
    const words = { ...DEFAULT_WORDS, yes: "✓, yep" };
    expect(readWord("YEP", words)).toBe("yes");
    expect(readWord("oui", words)).toBeUndefined();
  });
});

describe("setupProblems", () => {
  it("is empty for a full setup", () => {
    expect(setupProblems(MAPPING, FIXED, DEFAULT_WORDS, TODAY)).toEqual([]);
  });

  it("needs a place column and at least one detail column", () => {
    const codes = setupProblems(["", "address", "", "", ""], FIXED, DEFAULT_WORDS, TODAY).map((p) => p.code);
    expect(codes).toEqual(["no-place-column", "no-detail-column"]);
  });

  it("refuses two columns for one target", () => {
    expect(setupProblems(["place_name", "place_name", "elevator", "", ""], FIXED, DEFAULT_WORDS, TODAY)).toEqual([{ code: "two-columns", target: "place_name" }]);
  });

  it("gives no default source, licence or date: each must come from a column or be typed", () => {
    const codes = setupProblems(MAPPING, NO_FIXED, DEFAULT_WORDS, TODAY).map((p) => p.code);
    expect(codes).toEqual(["no-source", "bad-licence", "bad-date"]);
    expect(setupProblems([...MAPPING.slice(0, 4), "source"], { ...FIXED, source: "" }, DEFAULT_WORDS, TODAY)).toEqual([]);
  });

  it("checks typed values", () => {
    const codes = (f: Partial<FixedValues>): string[] => setupProblems(MAPPING, { ...FIXED, ...f }, DEFAULT_WORDS, TODAY).map((p) => p.code);
    expect(codes({ source: "x".repeat(201) })).toEqual(["source-too-long"]);
    expect(codes({ source: "a\u0007b" })).toEqual(["source-control"]);
    expect(codes({ licence: "All rights reserved" })).toEqual(["bad-licence"]);
    expect(codes({ recordedOn: "2026-02-30" })).toEqual(["bad-date"]);
    expect(codes({ recordedOn: "2026-12-01" })).toEqual(["future-date"]);
  });

  it("refuses a word that is in two lists", () => {
    expect(setupProblems(MAPPING, FIXED, { ...DEFAULT_WORDS, no: "no, oui" }, TODAY)).toEqual([{ code: "word-in-two-lists", word: "oui" }]);
  });
});

describe("toAppCsv", () => {
  it("makes the App's one-row-per-place CSV, row for row, with words read and typed values filled in", () => {
    const lines = toAppCsv(sheet(), MAPPING, FIXED, DEFAULT_WORDS).trimEnd().split("\r\n");
    expect(lines[0]).toBe(APP_COLUMNS.join(","));
    expect(lines).toHaveLength(5);
    // place, address, step-free, washroom, door, elevator, source, licence, date
    expect(lines[1]).toBe("Bibliothèque,1 rue King,yes,,,yes,\"Mapping day, Elm St\",CC-BY-4.0,2026-11-14");
    expect(lines[2]).toBe("Piscine,9 Lake Rd,,,,no,\"Mapping day, Elm St\",CC-BY-4.0,2026-11-14");
    expect(lines[3]).toBe("Café,12 King St,,,,peut-être,\"Mapping day, Elm St\",CC-BY-4.0,2026-11-14");
  });

  it("takes the source, licence and date from columns when they are mapped", () => {
    const s = sheet("Name,Elevator,Who,Lic,When\nPool,yes,Owner,ODbL-1.0,2026-10-01");
    const lines = toAppCsv(s, ["place_name", "elevator", "source", "licence", "recorded_on"], NO_FIXED, DEFAULT_WORDS).trimEnd().split("\r\n");
    expect(lines[1]).toBe("Pool,,,,,yes,Owner,ODbL-1.0,2026-10-01");
  });

  it("passes a row of another width on with another width, so it is reported, never shifted", () => {
    const s = sheet("Name,Elevator\nPool,yes,extra\nArena,no");
    const lines = toAppCsv(s, ["place_name", "elevator"], FIXED, DEFAULT_WORDS).trimEnd().split("\r\n");
    expect(lines[1]).toBe("Pool,");
    expect(lines[2]?.startsWith("Arena,")).toBe(true);
  });
});

describe("makeNotes", () => {
  it("makes notes with the App's own import and reports problems on the person's rows", () => {
    const r = makeNotes(sheet(), MAPPING, FIXED, DEFAULT_WORDS, TODAY);
    if ("error" in r) throw new Error(r.error);
    const p = r.preview;
    expect(p.notes.map((n) => n.placeName)).toEqual(["Bibliothèque", "Piscine"]);
    const lib = p.notes[0];
    expect(lib?.facts.find((f) => f.key === "elevator")).toEqual({ key: "elevator", value: "yes", provenance: { source: "Mapping day, Elm St", licence: "CC-BY-4.0", recordedOn: "2026-11-14" } });
    expect(lib?.facts.find((f) => f.key === "automatic-door")?.value).toBe("unknown");
    expect(p.problems.map((x) => [x.row, x.code])).toEqual([
      [4, "bad-value"],
      [5, "no-place"],
    ]);
  });

  it("lists words in no list so the person can add them", () => {
    const r = makeNotes(sheet(), MAPPING, FIXED, DEFAULT_WORDS, TODAY);
    if ("error" in r) throw new Error(r.error);
    expect(r.unmatched).toEqual([{ word: "peut-être", count: 1 }]);
    const again = makeNotes(sheet(), MAPPING, FIXED, { ...DEFAULT_WORDS, unknown: `${DEFAULT_WORDS.unknown}, peut-être` }, TODAY);
    if ("error" in again) throw new Error(again.error);
    expect(again.unmatched).toEqual([]);
    expect(again.preview.problems.map((x) => x.code)).toEqual(["no-place"]);
  });

  it("counts unmatched words across every detail column, most frequent first", () => {
    const s = sheet("Name,Elevator,Door\nA,maybe,maybe\nB,x,maybe");
    expect(unmatchedWords(s, ["place_name", "elevator", "automatic-door"], DEFAULT_WORDS)).toEqual([
      { word: "maybe", count: 3 },
      { word: "x", count: 1 },
    ]);
  });

  it("makes a notes file the App reads in full", () => {
    const r = makeNotes(sheet(), MAPPING, FIXED, DEFAULT_WORDS, TODAY);
    if ("error" in r) throw new Error(r.error);
    const back = importNotes(sheetNotesFile(r, TODAY));
    expect(back.error).toBeUndefined();
    expect(back.rejected).toBe(0);
    expect(back.notes).toEqual(r.preview.notes);
  });

  it("never turns a blank or unknown cell into a No", () => {
    const r = makeNotes(sheet(), MAPPING, FIXED, DEFAULT_WORDS, TODAY);
    if ("error" in r) throw new Error(r.error);
    const pool = r.preview.notes.find((n) => n.placeName === "Piscine");
    expect(pool?.facts.find((f) => f.key === "step-free-entry")?.value).toBe("unknown");
    for (const n of r.preview.notes) for (const f of n.facts) if (f.value !== "unknown") expect(f.provenance).toBeDefined();
  });

  it("names the person's own column for a problem, or nothing for a typed value", () => {
    const s = sheet();
    expect(sheetColumnFor("elevator", s, MAPPING)).toBe("Ascenseur");
    expect(sheetColumnFor("place_name", s, MAPPING)).toBe("Nom");
    expect(sheetColumnFor("source", s, MAPPING)).toBeUndefined();
    expect(sheetColumnFor("note_id", s, MAPPING)).toBeUndefined();
  });

  it("uses every detail the App has", () => {
    const header = ["Name", ...FACT_KEYS];
    const s = sheet(`${header.join(",")}\nPool,yes,no,yes,no`);
    const r = makeNotes(s, ["place_name", ...FACT_KEYS], FIXED, DEFAULT_WORDS, TODAY);
    if ("error" in r) throw new Error(r.error);
    expect(r.preview.notes[0]?.facts.map((f) => f.value)).toEqual(["yes", "no", "yes", "no"]);
  });
});
