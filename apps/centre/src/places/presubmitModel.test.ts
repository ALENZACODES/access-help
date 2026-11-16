import { describe, expect, it } from "vitest";
import { buildPresubmitView, presubmitFile, visibleRows } from "./presubmitModel.js";
import { sampleRecords, SAMPLE_TODAY } from "./testing.js";

const records = sampleRecords();

describe("buildPresubmitView", () => {
  const view = buildPresubmitView(records, SAMPLE_TODAY, "en");
  it("has one row per record", () => {
    expect(view.rows).toHaveLength(records.length);
    expect(view.rows.map((r) => r.record.id).sort()).toEqual(records.map((r) => r.id).sort());
  });
  it("orders what needs attention before the rest", () => {
    const order = { fix: 0, look: 1, note: 2, clear: 3 } as const;
    const ranks = view.rows.map((r) => order[r.group]);
    expect([...ranks].sort()).toEqual(ranks);
  });
  it("gives each row words, a label and its tag block", () => {
    for (const row of view.rows) {
      expect(row.groupLabel.length).toBeGreaterThan(3);
      expect(row.findings).toHaveLength(view.report.items.find((i) => i.record.id === row.record.id)?.findings.length ?? -1);
      expect(row.tagBlock).not.toContain("UNKNOWN");
    }
  });
  it("flags the old observations as something to look at", () => {
    const old = view.rows.find((r) => r.record.id === "s3");
    expect(old?.findings.join(" ")).toMatch(/days ago/);
  });
  it("leaves the wheelchair tag out for an UNKNOWN status", () => {
    const row = view.rows.find((r) => r.record.id === "s4");
    expect(row?.record.wheelchair).toBe("UNKNOWN");
    expect(row?.tagBlock).not.toMatch(/wheelchair/);
  });
  it("writes the comment, source, licences and six steps", () => {
    expect(view.comment).toMatch(/^Add wheelchair access/);
    expect(view.source).toBe("sample data for tests and sample field notes");
    expect(view.licenceLines).toEqual(["CC0-1.0: 4 places", "ODbL-1.0: 1 place"]);
    expect(view.steps).toHaveLength(6);
  });
  it("says the checks look for slips only", () => expect(view.summaryText).toContain("look for slips only"));
  it("is empty and calm with no records", () => {
    const empty = buildPresubmitView([], SAMPLE_TODAY, "en");
    expect(empty.rows).toEqual([]);
    expect(empty.comment).toBe("");
    expect(empty.summaryText).toBe("You have no saved observations to check.");
  });
  it("writes French when asked", () => {
    const fr = buildPresubmitView(records, SAMPLE_TODAY, "fr");
    expect(fr.summaryText).toContain("Ces contrôles ne cherchent que des oublis.");
    expect(fr.licenceLines[0]).toBe("CC0-1.0 : 4 lieux");
  });
  it("does not change the records", () => {
    const copy = JSON.parse(JSON.stringify(records));
    buildPresubmitView(records, SAMPLE_TODAY, "en");
    expect(records).toEqual(copy);
  });
});

describe("tidy on a row", () => {
  it("offers a tidy only for text that has stray spacing", () => {
    const messy = [{ ...records[0]!, name: " Sample  Library " }, records[1]!];
    const rows = buildPresubmitView(messy, SAMPLE_TODAY, "en").rows;
    expect(rows.find((r) => r.record.id === messy[0]!.id)?.tidy).toHaveLength(1);
    expect(rows.find((r) => r.record.id === messy[1]!.id)?.tidy).toEqual([]);
  });
});

describe("visibleRows", () => {
  const rows = buildPresubmitView(records, SAMPLE_TODAY, "en").rows;
  it("returns all rows by default, as a copy", () => {
    const all = visibleRows(rows, false);
    expect(all).toEqual(rows);
    expect(all).not.toBe(rows);
  });
  it("keeps only fix and look rows when asked", () => {
    for (const row of visibleRows(rows, true)) expect(["fix", "look"]).toContain(row.group);
  });
});

describe("presubmitFile", () => {
  const report = buildPresubmitView(records, SAMPLE_TODAY, "en").report;
  it("makes a text report named by day", () => {
    const f = presubmitFile("txt", report, SAMPLE_TODAY, "en");
    expect(f).toMatchObject({ filename: "check-before-submit-2026-11-15.txt", mime: "text/plain" });
    expect(f.content).toContain("Check before you submit, 2026-11-15");
  });
  it("makes a csv report with its header", () => {
    const f = presubmitFile("csv", report, SAMPLE_TODAY, "en");
    expect(f.mime).toBe("text/csv");
    expect(f.content.startsWith("id,name,group,finding,tags\r\n")).toBe(true);
  });
});
