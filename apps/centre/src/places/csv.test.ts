import { describe, expect, it } from "vitest";
import { CSV_COLUMNS, csvFilename, csvText, toCsv } from "./csv.js";
import { sampleRecords } from "./testing.js";

describe("csvText", () => {
  it("quotes commas, quotes, and line breaks", () => {
    expect(csvText("plain")).toBe("plain");
    expect(csvText("a, b")).toBe('"a, b"');
    expect(csvText('say "hi"')).toBe('"say ""hi"""');
    expect(csvText("two\nlines")).toBe('"two\nlines"');
  });

  it("neutralises cells a spreadsheet would read as a formula", () => {
    for (const start of ["=1+1", "+1", "-1", "@SUM(A1)", "\tx", "\rx"]) {
      expect(csvText(start).replace(/^"/, "").startsWith("'")).toBe(true);
    }
    expect(csvText("=HYPERLINK(\"http://x\",\"y\")")).toBe('"\'=HYPERLINK(""http://x"",""y"")"');
    expect(csvText("Café")).toBe("Café");
  });
});

describe("toCsv", () => {
  it("writes a header, one row per place, CRLF line ends, and a byte order mark", () => {
    const text = toCsv(sampleRecords().map((record) => ({ record, note: "" })));
    expect(text.startsWith("﻿" + CSV_COLUMNS.join(","))).toBe(true);
    const lines = text.slice(1).split("\r\n");
    expect(lines).toHaveLength(7);
    expect(lines.at(-1)).toBe("");
  });

  it("keeps UNKNOWN, source, licence, date, and a note on every row", () => {
    const records = sampleRecords();
    const text = toCsv([
      { record: records[3]!, note: "" },
      { record: { ...records[0]!, wheelchair: "UNKNOWN" }, note: "packs disagree (status)" },
    ]);
    const rows = text.slice(1).split("\r\n");
    expect(rows[1]).toBe("s4,Sample Clinic Annex,UNKNOWN,43.85,-79.43,sample data for tests,ODbL-1.0,2026-10-30,");
    expect(rows[2]).toBe("s1,Sample Library,UNKNOWN,43.85,-79.43,sample data for tests,CC0-1.0,2026-11-01,packs disagree (status)");
  });

  it("does not alter negative coordinates", () => {
    const row = toCsv([{ record: sampleRecords()[0]!, note: "" }]).split("\r\n")[1]!;
    expect(row).toContain(",-79.43,");
    expect(row).not.toContain("'-79");
  });

  it("writes a header only for no places and names the file by date", () => {
    expect(toCsv([])).toBe(`﻿${CSV_COLUMNS.join(",")}\r\n`);
    expect(csvFilename("2026-11-15")).toBe("places-2026-11-15.csv");
  });
});
