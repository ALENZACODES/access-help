import { describe, expect, it } from "vitest";
import { exportNotes } from "./exchange";
import { CONTRIBUTOR_SOURCE } from "./facts";
import { readStreetFile, type StreetFile } from "./filestreets";
import { parseNote, type Note } from "./model";
import { placeId } from "./places";
import {
  DATASET_COLUMNS,
  DICT_LANGUAGES,
  LAYOUTS,
  NOTE_TEXT_COLUMN,
  datasetColumns,
  datasetCsv,
  datasetRows,
  fileLicences,
  isDictLanguage,
  isLayout,
  isPersonal,
  licenceLeftOut,
  placeColumns,
  placeLayoutRows,
  placesCsv,
  publishChecks,
  publishProblems,
  publishedLicences,
  scopedPlaces,
  sourceCounts,
  type PublishOptions,
} from "./publishpack";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const BOM = String.fromCharCode(0xfeff);
const OPTS: PublishOptions = { title: "", language: "en", withUnknown: false, withNoteText: false, layout: "records", area: "", licences: undefined };

function withText(n: Note, note: string): Note {
  const next = parseNote({ ...n, note });
  if (!next) throw new Error("bad note");
  return next;
}

function fileOf(list: Note[]): StreetFile {
  const r = readStreetFile(exportNotes(list, "2026-11-01"), TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

/**
 * Library: elevator yes (City survey, 2026-03-01), door no (Contributor report, 2026-04-02) with a note text.
 * Library again: elevator no (Visit, 2026-12-30), dated after today.
 * Cart: no record, no address, a note text with a phone number.
 */
function notes(): Note[] {
  return [
    withText(
      testNote("a1", "Library", [
        { key: "elevator", value: "yes", on: "2026-03-01" },
        { key: "automatic-door", value: "no", on: "2026-04-02", source: CONTRIBUTOR_SOURCE },
      ], "100 King St W"),
      "Ramp at the side door.",
    ),
    testNote("a2", "Library", [{ key: "elevator", value: "no", on: "2026-12-30", source: "Visit" }], "100 King St W"),
    withText(testNote("c", "Cart", [], null), "Call Sam at 416 555 0100"),
  ];
}

describe("options", () => {
  it("knows the languages of the text", () => {
    expect(DICT_LANGUAGES).toEqual(["en", "fr", "both"]);
    expect(isDictLanguage("both")).toBe(true);
    expect(isDictLanguage("es")).toBe(false);
  });

  it("refuses a title too long or on two lines, and note text that looks personal", () => {
    const c = publishChecks(fileOf(notes()), TODAY);
    expect(publishProblems(OPTS, c)).toEqual([]);
    expect(publishProblems({ ...OPTS, title: "x".repeat(121) }, c)).toEqual(["title-long"]);
    expect(publishProblems({ ...OPTS, title: "a\nb", withNoteText: true }, c)).toEqual(["title-control", "personal-text"]);
    const clean = publishChecks(fileOf(notes().slice(0, 2)), TODAY);
    expect(publishProblems({ ...OPTS, withNoteText: true }, clean)).toEqual([]);
  });

  it("knows text that looks like an email address or a phone number", () => {
    expect(isPersonal("write to sam@example.org")).toBe(true);
    expect(isPersonal("(416) 555-0100")).toBe(true);
    expect(isPersonal("Ramp at the side door.")).toBe(false);
    expect(isPersonal(undefined)).toBe(false);
  });
});

describe("checks", () => {
  it("counts places, notes, records, dates, unknown details, text, personal text and missing addresses", () => {
    expect(publishChecks(fileOf(notes()), TODAY)).toEqual({
      places: 2,
      notes: 3,
      records: 2,
      future: 1,
      // The Library's elevator has a record from 2026-03-01; the later one does not change that.
      unknown: 6,
      notesWithText: 2,
      personalNotes: 1,
      placesNoAddress: 1,
      oldest: "2026-03-01",
      newest: "2026-04-02",
    });
  });
});

describe("rows", () => {
  it("gives one row per record dated on or before today, with tier and kind, places in name order", () => {
    const rows = datasetRows(fileOf(notes()), OPTS, TODAY);
    const id = placeId({ placeName: "Library", address: "100 King St W" });
    expect(rows).toEqual([
      { placeId: id, placeName: "Library", address: "100 King St W", key: "automatic-door", value: "no", source: CONTRIBUTOR_SOURCE, licence: "CC0-1.0", recordedOn: "2026-04-02", tier: "0", kind: "person", noteId: "a1", noteText: "" },
      { placeId: id, placeName: "Library", address: "100 King St W", key: "elevator", value: "yes", source: "City survey", licence: "CC0-1.0", recordedOn: "2026-03-01", tier: "0", kind: "named-source", noteId: "a1", noteText: "" },
    ]);
  });

  it("adds an unknown row for each detail with no record when asked", () => {
    const rows = datasetRows(fileOf(notes()), { ...OPTS, withUnknown: true }, TODAY);
    expect(rows.map((r) => [r.placeName, r.key, r.value])).toEqual([
      ["Cart", "step-free-entry", "unknown"],
      ["Cart", "accessible-washroom", "unknown"],
      ["Cart", "automatic-door", "unknown"],
      ["Cart", "elevator", "unknown"],
      ["Library", "step-free-entry", "unknown"],
      ["Library", "accessible-washroom", "unknown"],
      ["Library", "automatic-door", "no"],
      ["Library", "elevator", "yes"],
    ]);
    expect(rows[0]).toMatchObject({ source: "", licence: "", recordedOn: "", tier: "", kind: "", noteId: "" });
  });

  it("treats a detail whose only record is dated after today as having no record, in the rows and the checks", () => {
    const f = fileOf([testNote("x", "Kiosk", [{ key: "elevator", value: "yes", on: "2027-01-01" }], "1 Elm St")]);
    const rows = datasetRows(f, { ...OPTS, withUnknown: true }, TODAY);
    expect(rows.find((r) => r.key === "elevator")?.value).toBe("unknown");
    expect(publishChecks(f, TODAY)).toMatchObject({ unknown: 4, records: 0, future: 1 });
  });

  it("lists newest record first within a detail", () => {
    const rows = datasetRows(
      fileOf([
        testNote("o", "Kiosk", [{ key: "elevator", value: "yes", on: "2025-01-01" }], "1 Elm St"),
        testNote("n", "Kiosk", [{ key: "elevator", value: "no", on: "2026-01-01", source: "Visit" }], "1 Elm St"),
      ]),
      OPTS,
      TODAY,
    );
    expect(rows.map((r) => r.recordedOn)).toEqual(["2026-01-01", "2025-01-01"]);
  });

  it("adds each note's own text only when asked", () => {
    const rows = datasetRows(fileOf(notes().slice(0, 2)), { ...OPTS, withNoteText: true }, TODAY);
    expect(rows.map((r) => r.noteText)).toEqual(["Ramp at the side door.", "Ramp at the side door."]);
  });
});

describe("CSV", () => {
  it("has the columns, and note_text only when asked", () => {
    expect(datasetColumns(OPTS)).toEqual([...DATASET_COLUMNS]);
    expect(datasetColumns({ withNoteText: true })).toEqual([...DATASET_COLUMNS, NOTE_TEXT_COLUMN]);
  });

  it("writes guarded rows with a byte order mark and CRLF line ends", () => {
    const csv = datasetCsv(datasetRows(fileOf(notes()), OPTS, TODAY), OPTS);
    expect(csv.startsWith(BOM)).toBe(true);
    const lines = csv.slice(1).split("\r\n");
    expect(lines[0]).toBe(DATASET_COLUMNS.join(","));
    expect(lines[2]).toBe(`${placeId({ placeName: "Library", address: "100 King St W" })},Library,100 King St W,elevator,yes,City survey,CC0-1.0,2026-03-01,0,named-source,a1`);
    expect(lines.at(-1)).toBe("");
    const guarded = datasetCsv(datasetRows(fileOf([testNote("g", "=Kiosk", [{ key: "elevator", value: "yes", source: "@src" }], "1 Elm St")]), OPTS, TODAY), OPTS);
    expect(guarded.split("\r\n")[1]).toContain(",'=Kiosk,1 Elm St,elevator,yes,'@src,");
  });

  it("quotes note text with commas and line breaks", () => {
    const f = fileOf([withText(testNote("q", "Kiosk", [{ key: "elevator", value: "yes" }], "1 Elm St"), "Side door, then\nleft")]);
    const csv = datasetCsv(datasetRows(f, { ...OPTS, withNoteText: true }, TODAY), { withNoteText: true });
    expect(csv).toContain(',"Side door, then\nleft"\r\n');
  });
});

describe("licences and sources", () => {
  it("credits only the records published, leaving out those dated after today", () => {
    const rows = publishedLicences(fileOf(notes()), TODAY);
    expect(rows.map((r) => [r.licence, r.records, r.sources])).toEqual([["CC0-1.0", 2, ["City survey", CONTRIBUTOR_SOURCE]]]);
  });

  it("counts records by source, most first", () => {
    const rows = datasetRows(
      fileOf([
        testNote("a", "A", [{ key: "elevator", value: "yes" }, { key: "automatic-door", value: "yes" }], "1 Elm St"),
        testNote("b", "B", [{ key: "elevator", value: "yes", source: "Visit" }], "2 Elm St"),
      ]),
      { ...OPTS, withUnknown: true },
      TODAY,
    );
    expect(sourceCounts(rows)).toEqual([
      { source: "City survey", records: 2 },
      { source: "Visit", records: 1 },
    ]);
  });
});

describe("area and licences", () => {
  const mixed = (): StreetFile =>
    fileOf([
      testNote("a", "Library", [{ key: "elevator", value: "yes", on: "2026-03-01" }, { key: "automatic-door", value: "yes", on: "2026-03-01", licence: "CC-BY-SA-4.0" }], "100 King St W"),
      testNote("b", "Bank", [{ key: "elevator", value: "no", on: "2026-04-04", licence: "CC-BY-4.0", source: "Visit" }], "40 Queen St E"),
    ]);

  it("lists the file's licences in name order", () => {
    expect(fileLicences(mixed())).toEqual(["CC-BY-4.0", "CC-BY-SA-4.0", "CC0-1.0"]);
  });

  it("keeps only the places in the area, in name order", () => {
    expect(scopedPlaces(mixed(), { area: " queen " }).map((p) => p.name)).toEqual(["Bank"]);
    expect(scopedPlaces(mixed(), { area: "" }).map((p) => p.name)).toEqual(["Bank", "Library"]);
    expect(datasetRows(mixed(), { ...OPTS, area: "king" }, TODAY).map((r) => r.placeName)).toEqual(["Library", "Library"]);
  });

  it("leaves out records under a licence not chosen, counting them, and credits only the rest", () => {
    const o = { ...OPTS, licences: ["CC0-1.0", "CC-BY-4.0"] };
    expect(datasetRows(mixed(), o, TODAY).map((r) => [r.placeName, r.key, r.licence])).toEqual([
      ["Bank", "elevator", "CC-BY-4.0"],
      ["Library", "elevator", "CC0-1.0"],
    ]);
    expect(licenceLeftOut(mixed(), o, TODAY)).toEqual([{ licence: "CC-BY-SA-4.0", records: 1 }]);
    expect(licenceLeftOut(mixed(), OPTS, TODAY)).toEqual([]);
    expect(publishedLicences(mixed(), TODAY, o).map((r) => r.licence)).toEqual(["CC0-1.0", "CC-BY-4.0"]);
  });

  it("does not hold back rows for each place over note text, which they never carry", () => {
    const c = publishChecks(fileOf(notes()), TODAY);
    expect(publishProblems({ ...OPTS, withNoteText: true, layout: "places" }, c)).toEqual([]);
    expect(publishProblems({ ...OPTS, withNoteText: true }, c)).toEqual(["personal-text"]);
  });

  it("asks for a licence and for a shorter area", () => {
    const c = publishChecks(mixed(), TODAY);
    expect(publishProblems({ ...OPTS, licences: [] }, c)).toEqual(["no-licence"]);
    expect(publishProblems({ ...OPTS, area: "x".repeat(61) }, c)).toEqual(["area-long"]);
  });
});

describe("one row for each place", () => {
  it("knows its two layouts", () => {
    expect(LAYOUTS).toEqual(["records", "places"]);
    expect(isLayout("places")).toBe(true);
    expect(isLayout("wide")).toBe(false);
  });

  it("gives each detail its state, records and newest date, with differ where records disagree", () => {
    const f = fileOf([
      testNote("x1", "Kiosk", [{ key: "elevator", value: "yes", on: "2026-01-01" }, { key: "automatic-door", value: "no", on: "2026-02-02" }], "1 Elm St"),
      testNote("x2", "Kiosk", [{ key: "elevator", value: "no", on: "2026-05-05", source: "Visit" }], "1 Elm St"),
    ]);
    const [row] = placeLayoutRows(datasetRows(f, OPTS, TODAY));
    expect(row?.cells).toEqual({
      "step-free-entry": { state: "unknown", records: 0, newest: "" },
      "accessible-washroom": { state: "unknown", records: 0, newest: "" },
      "automatic-door": { state: "no", records: 1, newest: "2026-02-02" },
      elevator: { state: "differ", records: 2, newest: "2026-05-05" },
    });
  });

  it("keeps a place with no record when unknown rows are asked for, as all unknown", () => {
    const rows = placeLayoutRows(datasetRows(fileOf(notes()), { ...OPTS, withUnknown: true }, TODAY));
    expect(rows.map((r) => r.placeName)).toEqual(["Cart", "Library"]);
    expect(Object.values(rows[0]?.cells ?? {}).every((c) => c.state === "unknown")).toBe(true);
  });

  it("writes a guarded CSV with three columns for each detail", () => {
    expect(placeColumns()).toEqual([
      "place_id",
      "place_name",
      "address",
      "step-free-entry",
      "step-free-entry_records",
      "step-free-entry_newest",
      "accessible-washroom",
      "accessible-washroom_records",
      "accessible-washroom_newest",
      "automatic-door",
      "automatic-door_records",
      "automatic-door_newest",
      "elevator",
      "elevator_records",
      "elevator_newest",
    ]);
    const csv = placesCsv(placeLayoutRows(datasetRows(fileOf([testNote("g", "=Kiosk", [{ key: "elevator", value: "yes", on: "2026-01-01" }], "1 Elm St")]), OPTS, TODAY)));
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv.split("\r\n")[1]).toBe(`${placeId({ placeName: "=Kiosk", address: "1 Elm St" })},'=Kiosk,1 Elm St,unknown,0,,unknown,0,,unknown,0,,yes,1,2026-01-01`);
  });
});
