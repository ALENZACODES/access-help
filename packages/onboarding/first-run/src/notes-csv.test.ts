// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FACT_KEYS, auditCopy, type Note } from "./index";
import {
  CSV_COLUMNS,
  CSV_COPY,
  WIDE_CSV_COLUMNS,
  csvField,
  csvFilename,
  csvHref,
  csvStrings,
  guardCell,
  notesToCsv,
  notesToRows,
  notesToWideCsv,
  notesToWideRows,
  wideCsvFilename,
} from "./notes-csv";
import { act, createHarness, type Harness } from "./shelltest";
import { makeRng, randomNotes } from "./testkit";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));

/** A strict reader for the files this module writes: RFC 4180 quoting, CRLF line ends, a byte order mark first. */
function readCsv(text: string): string[][] {
  expect(text.charCodeAt(0)).toBe(0xfeff);
  const body = text.slice(1);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i] as string;
    if (quoted) {
      if (ch === '"' && body[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === "") quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\r" && body[i + 1] === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
    } else field += ch;
  }
  expect(row).toEqual([]);
  expect(field).toBe("");
  return rows;
}

describe("cells", () => {
  it("turns formulas into plain text", () => {
    for (const s of ["=SUM(A1)", "+1", "-1", "@cmd", "\tx", "\rx"]) expect(guardCell(s)).toBe(`'${s}`);
    for (const s of ["Library", "1 Main St", "", "a=b", "Café"]) expect(guardCell(s)).toBe(s);
  });

  it("quotes only when needed, doubling quotes", () => {
    expect(csvField("plain")).toBe("plain");
    expect(csvField("a,b")).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField("two\nlines")).toBe('"two\nlines"');
  });
});

describe("rows", () => {
  const notes = (): Note[] => [
    { ...testNote("n1", "Library, Main", [{ key: "elevator", value: "yes", on: "2026-11-10", licence: "ODbL-1.0" }]), createdOn: "2026-11-11" },
    testNote("n2", "=HYPERLINK(\"x\")", [{ key: "step-free-entry", value: "no", source: "@City" }], null),
  ];

  it("has one header and one row per note and detail, in the App's order", () => {
    const rows = notesToRows(notes());
    expect(rows[0]).toEqual([...CSV_COLUMNS]);
    expect(rows).toHaveLength(1 + 2 * FACT_KEYS.length);
    expect(rows.slice(1, 5).map((r) => r[3])).toEqual(FACT_KEYS);
  });

  it("writes Yes and No with their source, licence and date, and UNKNOWN with nothing", () => {
    const rows = notesToRows(notes());
    expect(rows[4]).toEqual(["n1", "Library, Main", "1 Main St", "elevator", "yes", "City survey", "ODbL-1.0", "2026-11-10", "2026-11-11"]);
    expect(rows[1]).toEqual(["n1", "Library, Main", "1 Main St", "step-free-entry", "UNKNOWN", "", "", "", "2026-11-11"]);
  });

  it("guards what people typed, and the source, against formulas", () => {
    const rows = notesToRows(notes());
    expect(rows[5]).toEqual(["n2", `'=HYPERLINK("x")`, "", "step-free-entry", "no", "'@City", "CC0-1.0", "2026-10-01", "2026-10-01"]);
  });

  it("is just the header with no notes", () => {
    expect(notesToRows([])).toEqual([[...CSV_COLUMNS]]);
  });
});

describe("the file", () => {
  it("reads back exactly, accents and all", () => {
    const notes = [testNote("n1", "Café « Bleu », \"chez nous\"", [{ key: "elevator", value: "yes" }], "12, rue Principale")];
    const csv = notesToCsv(notes);
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(readCsv(csv)).toEqual(notesToRows(notes));
  });

  it("reads back exactly for random notes, with every detail accounted for", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const notes = randomNotes(makeRng(seed), 6);
      const rows = readCsv(notesToCsv(notes));
      expect(rows).toEqual(notesToRows(notes));
      expect(rows).toHaveLength(1 + notes.length * FACT_KEYS.length);
      for (const r of rows.slice(1)) {
        expect(["yes", "no", "UNKNOWN"]).toContain(r[4]);
        // A value with no record never carries a source; a Yes or No always carries all three.
        if (r[4] === "UNKNOWN") expect(r.slice(5, 8)).toEqual(["", "", ""]);
        else expect(r.slice(5, 8).every((x) => x !== "")).toBe(true);
        for (const cell of r) expect(cell).not.toMatch(/^[=+\-@]/);
      }
    }
  });

  it("has a name and a data address", () => {
    expect(csvFilename(TODAY, "en")).toBe("notes-2026-11-19.csv");
    expect(csvFilename(TODAY, "fr")).toBe("notes-2026-11-19-fr.csv");
    expect(decodeURIComponent(csvHref("a,b\r\n").split(",").slice(1).join(","))).toBe("a,b\r\n");
    expect(csvHref("x").startsWith("data:text/csv;charset=utf-8,")).toBe(true);
  });

  it("passes the App's copy audit", () => {
    expect(auditCopy(csvStrings())).toEqual([]);
    expect(CSV_COPY.hint.fr).toContain("UNKNOWN");
  });
});

describe("one row per note", () => {
  it("has the note's columns, then each detail with its own record", () => {
    expect(WIDE_CSV_COLUMNS.slice(0, 8)).toEqual(["note_id", "place_name", "address", "note_added_on", "step-free-entry", "step-free-entry_source", "step-free-entry_licence", "step-free-entry_recorded_on"]);
    expect(WIDE_CSV_COLUMNS).toHaveLength(4 + 4 * FACT_KEYS.length);
  });

  it("writes UNKNOWN with nothing after it, and guards typed text", () => {
    const n = testNote("w1", "=Hall", [{ key: "elevator", value: "no" }], "+5 Main");
    const [head, row] = notesToWideRows([n]);
    expect(head).toEqual([...WIDE_CSV_COLUMNS]);
    expect(row?.slice(0, 8)).toEqual(["w1", "'=Hall", "'+5 Main", n.createdOn, "UNKNOWN", "", "", ""]);
    const lift = row?.slice(4 + 4 * FACT_KEYS.indexOf("elevator"), 8 + 4 * FACT_KEYS.indexOf("elevator"));
    const f = n.facts.find((x) => x.key === "elevator");
    expect(lift).toEqual(["no", f?.provenance?.source, f?.provenance?.licence, f?.provenance?.recordedOn]);
  });

  it("is a well-formed file for random notes, one line per note", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const notes = randomNotes(makeRng(seed), 12);
      const rows = readCsv(notesToWideCsv(notes));
      expect(rows, `seed ${seed}`).toHaveLength(1 + notes.length);
      for (const r of rows) expect(r, `seed ${seed}`).toHaveLength(WIDE_CSV_COLUMNS.length);
    }
    expect(wideCsvFilename(TODAY)).toBe("notes-by-note-2026-11-19.csv");
  });
});

describe("on My notes", () => {
  let h: Harness;
  beforeEach(() => {
    h = createHarness(TODAY);
  });
  afterEach(() => {
    h.destroy();
  });

  it("offers the spreadsheet only when there are notes, with the same file", () => {
    h.mount("en");
    h.click(act("view", "notes"));
    expect(h.root.querySelector("[data-notes-csv]")).toBeNull();
    const notes = [testNote("a", "Library", [{ key: "elevator", value: "yes" }])];
    h.seed(notes);
    h.mount("fr");
    h.click(act("view", "notes"));
    const link = h.root.querySelector<HTMLAnchorElement>("[data-notes-csv]");
    expect(link?.getAttribute("download")).toBe("notes-2026-11-19-fr.csv");
    expect(link?.textContent).toBe(CSV_COPY.download.fr);
    const href = link?.getAttribute("href") ?? "";
    expect(decodeURIComponent(href.slice("data:text/csv;charset=utf-8,".length))).toBe(notesToCsv(notes));
    const wide = h.root.querySelector<HTMLAnchorElement>("[data-notes-wide-csv]");
    expect(wide?.textContent).toBe(CSV_COPY.wide.fr);
    expect(decodeURIComponent((wide?.getAttribute("href") ?? "").slice("data:text/csv;charset=utf-8,".length))).toBe(notesToWideCsv(notes));
    expect(h.auditLines()).toEqual([]);
  });
});
