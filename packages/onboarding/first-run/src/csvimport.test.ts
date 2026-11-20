import { describe, expect, it } from "vitest";
import {
  CSV_MAX_ROWS,
  csvAddLabel,
  csvTakeBackLabel,
  csvTakenBackText,
  csvAddedText,
  columnName,
  chosenNotes,
  contentHash,
  detectDelimiter,
  disagreementText,
  disagreements,
  noteDetailsText,
  problemColumn,
  recordProblem,
  csvImportStrings,
  detailFromCell,
  parseCsv,
  previewCsvImport,
  csvPreviewLines,
  problemsCsv,
  templateCsv,
  unguardCell,
  valueFromCell,
  type CsvPreview,
  type CsvResult,
  type Disagreement,
} from "./csvimport";
import { auditCopy, groupPlaces } from "./index";
import { LIMITS, parseNote, type Note } from "./model";
import { CSV_COLUMNS, notesToCsv, notesToWideCsv } from "./notes-csv";
import { makeRng, randomNotes } from "./testkit";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const HEAD = CSV_COLUMNS.join(",");

function ok(r: CsvResult): CsvPreview {
  if (r.error !== undefined) throw new Error(`unexpected ${r.error}`);
  return r;
}

const csv = (...rows: string[]): string => [HEAD, ...rows].join("\r\n");
const row = (place: string, detail: string, value: string, source = "City survey", licence = "CC-BY-4.0", on = "2026-10-01", id = "", address = "1 Main St"): string =>
  [id, place, address, detail, value, source, licence, on, "2026-10-02"].join(",");

describe("reading CSV text", () => {
  it("splits quoted cells, doubled quotes, line breaks inside quotes, CRLF and LF, and skips blank lines", () => {
    expect(parseCsv('\uFEFFa,b\r\n"x, y","he said ""hi"""\n\n"two\nlines",\r\n')).toEqual({
      rows: [
        ["a", "b"],
        ["x, y", 'he said "hi"'],
        ["two\nlines", ""],
      ],
    });
    expect(parseCsv("a,b")).toEqual({ rows: [["a", "b"]] });
    expect(parseCsv("a,,\n")).toEqual({ rows: [["a", "", ""]] });
    expect(parseCsv('a,"b')).toEqual({ error: "unclosed-quote" });
    expect(parseCsv(`h\n${"x\n".repeat(CSV_MAX_ROWS)}`)).toEqual({ rows: [["h"], ...Array.from({ length: CSV_MAX_ROWS }, () => ["x"])] });
    expect(parseCsv(`h\n${"x\n".repeat(CSV_MAX_ROWS + 1)}`)).toEqual({ error: "too-many-rows" });
  });

  it("reads cells the way the App writes them", () => {
    expect(unguardCell("'=SUM(A1)")).toBe("=SUM(A1)");
    expect(unguardCell("'+1")).toBe("+1");
    expect(unguardCell("'hello")).toBe("'hello");
    expect(detailFromCell(" Elevator ")).toBe("elevator");
    expect(detailFromCell("ASCENSEUR")).toBe("elevator");
    expect(detailFromCell("step-free-entry")).toBe("step-free-entry");
    expect(detailFromCell("ramp")).toBeUndefined();
    expect(["yes", "Oui", "NO", "non", "", "UNKNOWN", "maybe"].map(valueFromCell)).toEqual(["yes", "yes", "no", "no", "unknown", "unknown", undefined]);
  });

  it("makes the same short id from the same content", () => {
    expect(contentHash("abc")).toBe(contentHash("abc"));
    expect(contentHash("abc")).not.toBe(contentHash("abd"));
    expect(contentHash("x")).toMatch(/^[a-z0-9]+$/);
  });
});

describe("what a file would add", () => {
  it("refuses an empty, oversized or headless file, and says which columns are missing", () => {
    expect(previewCsvImport([], "  \n", TODAY)).toEqual({ error: "empty" });
    expect(previewCsvImport([], "x".repeat(LIMITS.importChars + 1), TODAY)).toEqual({ error: "too-large" });
    expect(previewCsvImport([], "place_name,value\nLibrary,yes", TODAY)).toEqual({ error: "missing-columns", missing: ["detail"] });
    expect(previewCsvImport([], 'place_name,detail,value\n"Library', TODAY)).toEqual({ error: "unclosed-quote" });
  });

  it("groups a place's rows into one note with each record's source, licence and day", () => {
    const p = ok(previewCsvImport([], csv(row("Library", "elevator", "yes"), row("Library", "automatic-door", "no", "Site visit", "CC-BY-4.0", "2026-09-01"), row("Library", "accessible-washroom", "UNKNOWN", "", "", "")), TODAY));
    expect(p.notes).toHaveLength(1);
    const n = p.notes[0] as Note;
    expect(n).toMatchObject({ placeName: "Library", address: "1 Main St", createdOn: "2026-10-02", licence: "CC-BY-4.0", note: undefined });
    expect(n.facts.map((f) => [f.key, f.value, f.provenance?.source ?? null])).toEqual([
      ["step-free-entry", "unknown", null],
      ["accessible-washroom", "unknown", null],
      ["automatic-door", "no", "Site visit"],
      ["elevator", "yes", "City survey"],
    ]);
    // A note made here is one the App would keep.
    expect(parseNote(n)).toEqual(n);
    expect(p.rowsRead).toBe(3);
    expect(p.problems).toEqual([]);
  });

  it("never makes up a record: a Yes or No with no source, licence or day is not used", () => {
    const p = ok(
      previewCsvImport(
        [],
        csv(row("A", "elevator", "yes", ""), row("B", "elevator", "yes", "S", "MIT"), row("C", "elevator", "no", "S", "CC0-1.0", "01/02/2026"), row("D", "elevator", "no", "S", "CC0-1.0", "2026-11-21"), row("E", "lift", "yes"), row("F", "elevator", "maybe")),
        TODAY,
      ),
    );
    expect(p.notes).toEqual([]);
    expect(p.problems.map((x) => [x.row, x.code])).toEqual([
      [2, "no-source"],
      [3, "bad-licence"],
      [4, "bad-date"],
      [5, "future-date"],
      [6, "bad-detail"],
      [7, "bad-value"],
    ]);
  });

  it("counts notes that only say UNKNOWN as having nothing to add", () => {
    const p = ok(previewCsvImport([], csv(row("Pool", "elevator", "UNKNOWN", "", "", ""), row("Pool", "automatic-door", "", "", "", "")), TODAY));
    expect([p.notes.length, p.nothingKnown, p.problems.length]).toEqual([0, 1, 0]);
  });

  it("lists row problems with the row number and keeps the rest", () => {
    const p = ok(previewCsvImport([], csv(row("", "elevator", "yes"), "too,few", row("x".repeat(121), "elevator", "yes"), row("Ok", "elevator", "yes", "S\u0007"), row("Ok", "elevator", "yes")), TODAY));
    expect(p.problems.map((x) => [x.row, x.code])).toEqual([
      [2, "no-place"],
      [3, "wrong-width"],
      [4, "place-too-long"],
      [5, "control-chars"],
    ]);
    expect(p.notes.map((n) => n.placeName)).toEqual(["Ok"]);
  });

  it("refuses the same detail given twice differently for one note, and a note id reused for another place", () => {
    const p = ok(previewCsvImport([], csv(row("A", "elevator", "yes"), row("A", "elevator", "no"), row("A", "elevator", "yes"), row("B", "elevator", "yes", "S", "CC0-1.0", "2026-10-01", "n1"), row("C", "elevator", "yes", "S", "CC0-1.0", "2026-10-01", "n1")), TODAY));
    expect(p.problems.map((x) => [x.row, x.code])).toEqual([
      [3, "repeated-detail"],
      [6, "note-mismatch"],
    ]);
    expect(p.notes.map((n) => [n.id.startsWith("csv-") ? "made" : n.id, n.placeName])).toEqual([
      ["made", "A"],
      ["n1", "B"],
    ]);
  });

  it("keeps rows with different licences for one place as separate notes", () => {
    const p = ok(previewCsvImport([], csv(row("A", "elevator", "yes", "S", "CC0-1.0"), row("A", "automatic-door", "yes", "S", "ODbL-1.0")), TODAY));
    expect(p.notes.map((n) => n.licence)).toEqual(["CC0-1.0", "ODbL-1.0"]);
  });

  it("adds the same rows once, whether the file has ids or not, and leaves notes here alone", () => {
    const text = csv(row("A", "elevator", "yes"));
    const first = ok(previewCsvImport([], text, TODAY));
    const again = ok(previewCsvImport(first.notes, text, TODAY));
    expect([again.notes.length, again.alreadyHere]).toEqual([0, 1]);
    const here = [testNote("n9", "Library", [{ key: "elevator", value: "yes" }])];
    const withId = ok(previewCsvImport(here, csv(row("Changed name", "elevator", "no", "S", "CC0-1.0", "2026-10-01", "n9")), TODAY));
    expect([withId.notes.length, withId.alreadyHere]).toEqual([0, 1]);
  });

  it("stops at the most notes this device keeps", () => {
    const here = Array.from({ length: LIMITS.notes - 1 }, (_, i) => testNote(`h${i}`, `Place ${i}`, []));
    const p = ok(previewCsvImport(here, csv(row("A", "elevator", "yes"), row("B", "elevator", "yes"), row("C", "elevator", "yes")), TODAY));
    expect([p.notes.length, p.noRoom]).toEqual([1, 2]);
  });

  it("takes the day added only when it is a real day not after today", () => {
    const line = (added: string): string => ["", "A", "", "elevator", "yes", "S", "CC0-1.0", "2026-10-01", added].join(",");
    expect(ok(previewCsvImport([], csv(line("2026-11-30")), TODAY)).notes[0]?.createdOn).toBe("2026-11-20");
    expect(ok(previewCsvImport([], csv(line("nope")), TODAY)).notes[0]?.createdOn).toBe("2026-11-20");
    expect(ok(previewCsvImport([], csv(line("2025-05-05")), TODAY)).notes[0]?.address).toBeUndefined();
  });

  it("takes columns in any order and case, with the others left out", () => {
    const p = ok(previewCsvImport([], "Value,Detail,Place_Name,Licence,Source,Recorded_On\nyes,Elevator,Arena,CC0-1.0,City,2026-01-01", TODAY));
    expect(p.notes[0]).toMatchObject({ placeName: "Arena", address: undefined, licence: "CC0-1.0" });
  });
});

describe("a spreadsheet with one row per place", () => {
  const WIDE = ["Place,Address,Elevator,Automatic door,Accessible washroom,Source,Licence,Date", "Arena,5 Park Rd,yes,no,,City survey,CC0-1.0,2026-10-01", "Pool,,Oui,,,,CC0-1.0,2026-10-01", "Rink,,,,,,,"].join("\n");

  it("reads a column for each detail, with the row's source, licence and day for each", () => {
    const p = ok(previewCsvImport([], WIDE, TODAY));
    expect(p.notes.map((n) => [n.placeName, n.address, n.facts.filter((f) => f.value !== "unknown").map((f) => `${f.key}=${f.value}:${f.provenance?.source}`)])).toEqual([["Arena", "5 Park Rd", ["automatic-door=no:City survey", "elevator=yes:City survey"]]]);
    expect(p.rowsRead).toBe(3);
  });

  it("says each reason once for a row, and counts a row with nothing filled in as having nothing to add", () => {
    const p = ok(previewCsvImport([], WIDE, TODAY));
    expect(p.problems.map((x) => [x.row, x.code])).toEqual([[3, "no-source"]]);
    expect(p.nothingKnown).toBe(1);
  });

  it("names the detail columns in French too, and still needs a place column", () => {
    expect(ok(previewCsvImport([], "lieu,ascenseur,source,licence,date\nGare,non,Relevé,CC0-1.0,2026-09-09", TODAY)).notes[0]?.facts.find((f) => f.key === "elevator")?.value).toBe("no");
    expect(previewCsvImport([], "ascenseur,source\nyes,x", TODAY)).toEqual({ error: "missing-columns", missing: ["place_name"] });
    expect(previewCsvImport([], "lieu,colour\nGare,red", TODAY)).toEqual({ error: "missing-columns", missing: ["detail", "value"] });
  });

  it("knows other names for the App's columns", () => {
    expect(["Place", "Nom", " recorded ", "Licence", "License", "Note ID", "détail"].map(columnName)).toEqual(["place_name", "place_name", "recorded_on", "licence", "licence", "note_id", "detail"]);
  });
});

describe("the column a reason is about", () => {
  it("is named as in the file's first row, or the detail's own column in one row per note", () => {
    const p = ok(previewCsvImport([], "Lieu,Elevator,Elevator_Source,Licence,Date\nHall,yes,,CC0-1.0,2026-01-01\nGym,yes,S,MIT,2026-01-01\nRink,maybe,S,CC0-1.0,2026-01-01\n,yes,S,CC0-1.0,2026-01-01\nx", TODAY));
    expect(p.problems.map((x) => [x.row, x.code, x.column])).toEqual([
      [2, "no-source", "Elevator_Source"],
      [3, "bad-licence", "Licence"],
      [4, "bad-value", "Elevator"],
      [5, "no-place", "Lieu"],
      [6, "wrong-width", ""],
    ]);
  });

  it("is the App's name for each reason", () => {
    const none = (): boolean => false;
    expect(problemColumn("future-date", undefined, none)).toBe("recorded_on");
    expect(problemColumn("note-mismatch", undefined, none)).toBe("note_id");
    expect(problemColumn("repeated-detail", "elevator", none)).toBe("elevator");
    expect(problemColumn("control-chars", undefined, none)).toBeUndefined();
    expect(problemColumn("bad-licence", "elevator", (n) => n === "elevator_licence")).toBe("elevator_licence");
  });
});

describe("the reason a record is not used", () => {
  const good = { placeName: "A", address: "", source: "S", recordedOn: "2026-10-01", licence: "CC0-1.0", noteId: "", key: "elevator" as const, value: "yes" as const };
  it("comes in the order the columns are read, and an UNKNOWN needs no record", () => {
    expect(recordProblem(good, "2026-11-20")).toBeUndefined();
    expect(recordProblem({ ...good, placeName: "", source: "" }, "2026-11-20")).toBe("no-place");
    expect(recordProblem({ ...good, value: "unknown", source: "", licence: "", recordedOn: "" }, "2026-11-20")).toBeUndefined();
    expect(recordProblem({ ...good, source: "x".repeat(201) }, "2026-11-20")).toBe("source-too-long");
    expect(recordProblem({ ...good, address: "y".repeat(201) }, "2026-11-20")).toBe("address-too-long");
    expect(recordProblem({ ...good, key: undefined, value: undefined }, "2026-11-20")).toBe("bad-detail");
  });
});

describe("other separators", () => {
  it("finds the separator the first line uses, outside quotes", () => {
    expect(detectDelimiter("a,b,c\nx;y")).toBe(",");
    expect(detectDelimiter("\uFEFFa;b;c")).toBe(";");
    expect(detectDelimiter("a\tb\tc")).toBe("\t");
    expect(detectDelimiter('"x,y";b;c')).toBe(";");
    expect(detectDelimiter("place_name")).toBe(",");
    expect(parseCsv("a;b\n\"1;2\";3", ";")).toEqual({ rows: [["a", "b"], ["1;2", "3"]] });
  });

  it("reads a file saved with semicolons, and cells pasted from a spreadsheet", () => {
    const semi = ["place_name;detail;value;source;licence;recorded_on", "Gare;ascenseur;oui;Relevé;CC0-1.0;2026-09-09"].join("\r\n");
    expect(ok(previewCsvImport([], semi, TODAY)).notes[0]?.facts.find((f) => f.key === "elevator")?.value).toBe("yes");
    const pasted = ["Place\tElevator\tSource\tLicence\tDate", "Gym\tNo\tSite visit\tCC-BY-4.0\t2026-08-08"].join("\n");
    expect(ok(previewCsvImport([], pasted, TODAY)).notes.map((n) => n.placeName)).toEqual(["Gym"]);
  });
});

describe("where the file and the notes here disagree", () => {
  const here = groupPlaces(
    [
      testNote("h1", "Library", [{ key: "elevator", value: "yes" }, { key: "automatic-door", value: "no" }]),
      testNote("h2", "Library", [{ key: "automatic-door", value: "yes" }]),
    ],
    "en",
  );
  const fromFile = ok(previewCsvImport([], csv(row("Library", "elevator", "no"), row("Library", "automatic-door", "yes"), row("Library", "step-free-entry", "yes")), TODAY)).notes[0] as Note;

  it("lists only the details the notes already answer differently, or already differ on", () => {
    expect(disagreements(fromFile, here)).toEqual([
      { key: "automatic-door", file: "yes", notes: "differ" },
      { key: "elevator", file: "no", notes: "yes" },
    ]);
    expect(disagreements({ ...fromFile, placeName: "Elsewhere" }, here)).toEqual([]);
  });

  it("says so in both languages", () => {
    const [door, lift] = disagreements(fromFile, here);
    expect(disagreementText(lift as Disagreement, "en")).toBe("Elevator: this file says No; your notes say Yes.");
    expect(disagreementText(door as Disagreement, "en")).toBe("Automatic door: this file says Yes; your notes already differ.");
    expect(disagreementText(lift as Disagreement, "fr")).toBe("Ascenseur\u00A0: ce fichier dit Non\u202F; vos notes disent Oui.");
  });
});

describe("the one-row-per-note download comes back unchanged", () => {
  it("for random notes, each detail with its own source, licence and day", () => {
    const later = new Date(Date.UTC(2030, 0, 1));
    for (let seed = 1; seed <= 40; seed++) {
      const notes = randomNotes(makeRng(seed), 12).filter((n) => n.facts.some((f) => f.value !== "unknown"));
      const p = ok(previewCsvImport([], notesToWideCsv(notes), later));
      expect(p.problems, `seed ${seed}`).toEqual([]);
      expect(p.notes.map((n) => [n.id, n.placeName, n.address, n.createdOn, n.facts]), `seed ${seed}`).toEqual(notes.map((n) => [n.id, n.placeName, n.address, n.createdOn, n.facts]));
    }
  });

  it("uses a row's own source when a detail has no column for it", () => {
    const text = "place_name,elevator,elevator_source,automatic-door,source,licence,recorded_on\nHall,yes,Own visit,no,City list,CC0-1.0,2026-10-01";
    const n = ok(previewCsvImport([], text, TODAY)).notes[0] as Note;
    expect(n.facts.filter((f) => f.value !== "unknown").map((f) => `${f.key}:${f.provenance?.source}`)).toEqual(["automatic-door:City list", "elevator:Own visit"]);
  });
});

describe("the rows to fix come back", () => {
  it("once fixed, the download of rows not used reads like any other file, its reason column left aside", () => {
    const first = ok(previewCsvImport([], csv(row("Arena", "elevator", "yes", "")), TODAY));
    const fixed = problemsCsv(first, "en").replace(",,CC-BY-4.0,", ",Site visit,CC-BY-4.0,");
    const again = ok(previewCsvImport([], fixed, TODAY));
    expect(again.problems).toEqual([]);
    expect(again.notes[0]?.facts.find((f) => f.key === "elevator")?.provenance?.source).toBe("Site visit");
  });
});

describe("the App's own download comes back unchanged", () => {
  it("for random notes, every Yes and No with its record, and the same ids", () => {
    // Random notes can be dated up to a few weeks ahead of TODAY, so "today" here is later than all of them.
    const later = new Date(Date.UTC(2030, 0, 1));
    for (let seed = 1; seed <= 40; seed++) {
      const notes = randomNotes(makeRng(seed), 15).filter((n) => n.facts.some((f) => f.value !== "unknown"));
      const p = ok(previewCsvImport([], notesToCsv(notes), later));
      expect(p.problems, `seed ${seed}`).toEqual([]);
      expect(
        p.notes.map((n) => [n.id, n.placeName, n.address, n.facts]),
        `seed ${seed}`,
      ).toEqual(notes.map((n) => [n.id, n.placeName, n.address, n.facts]));
      expect(ok(previewCsvImport(p.notes, notesToCsv(notes), later)).alreadyHere, `seed ${seed}`).toBe(notes.length);
    }
  });
});

describe("words and downloads", () => {
  const p = ok(previewCsvImport([testNote("n1", "Here", [])], csv(row("A", "elevator", "yes"), row("", "elevator", "yes"), row("B", "elevator", "UNKNOWN", "", "", "")), TODAY));

  it("says what would happen, in both languages", () => {
    expect(csvPreviewLines(p, "en")).toEqual(["Rows read: 3.", "Notes to add: 1.", "1 note with no Yes or No: nothing to add.", "1 row not used."]);
    expect(csvPreviewLines(p, "fr")).toEqual(["Lignes lues\u00A0: 3.", "Notes à ajouter\u00A0: 1.", "1 note sans Oui ni Non\u00A0: rien à ajouter.", "1 ligne non utilisée."]);
    expect([csvAddLabel(1, "en"), csvAddLabel(3, "fr"), csvAddedText(1, "en"), csvAddedText(2, "fr")]).toEqual(["Add 1 note", "Ajouter 3 notes", "1 note was added from the spreadsheet.", "2 notes ont été ajoutées depuis le tableur."]);
  });

  it("writes a note's details on one line, and keeps the notes not left out", () => {
    const n = p.notes[0] as Note;
    expect(noteDetailsText(n, "en")).toBe("Elevator: Yes");
    const two = { ...n, facts: n.facts.map((f) => (f.key === "automatic-door" ? { ...f, value: "no" as const, provenance: f.provenance ?? { source: "S", licence: "CC0-1.0", recordedOn: "2026-01-01" } } : f)) };
    expect(noteDetailsText(two, "fr")).toBe("Porte automatique\u00A0: Non\u202F; Ascenseur\u00A0: Oui");
    expect(chosenNotes(p, new Set())).toEqual(p.notes);
    expect(chosenNotes(p, new Set([n.id]))).toEqual([]);
  });

  it("names what taking back removes", () => {
    expect([csvTakeBackLabel(1, "en"), csvTakeBackLabel(2, "en"), csvTakeBackLabel(1, "fr"), csvTakeBackLabel(4, "fr")]).toEqual([
      "Take back the note just added",
      "Take back the 2 notes just added",
      "Retirer la note qui vient d’être ajoutée",
      "Retirer les 4 notes qui viennent d’être ajoutées",
    ]);
    expect([csvTakenBackText(1, "en"), csvTakenBackText(3, "fr")]).toEqual(["The note from the spreadsheet was taken back.", "Les 3 notes du tableur ont été retirées."]);
  });

  it("gives the rows not used back, with the file's header and a reason", () => {
    const lines = problemsCsv(p, "en").split("\r\n");
    expect(lines[0]).toBe(`\uFEFF${HEAD},column,reason`);
    expect(lines[1]).toBe(",,1 Main St,elevator,yes,City survey,CC-BY-4.0,2026-10-01,2026-10-02,place_name,The place name is empty.");
    expect(problemsCsv(p, "fr").split("\r\n")[0]?.endsWith(",colonne,raison")).toBe(true);
    expect(templateCsv()).toBe(`\uFEFF${HEAD}\r\n`);
  });

  it("passes the App's copy audit and never says UNKNOWN another way", () => {
    expect(auditCopy(csvImportStrings())).toEqual([]);
    expect(csvImportStrings().map(([, x]) => x.fr).join(" ")).not.toMatch(/inconnu/i);
  });
});
