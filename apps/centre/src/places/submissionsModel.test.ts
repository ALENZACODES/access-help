import { describe, expect, it } from "vitest";
import { buildSubmissionsView, issuesByField, submissionFile } from "./submissionsModel.js";
import { sampleRecords, SAMPLE_TODAY } from "./testing.js";
import type { Ledger } from "./docs-bridge.js";

const records = sampleRecords();
const ledger: Ledger = {
  version: 1,
  entries: [
    { recordId: "s1", markedOn: "2026-09-01", changeset: "123", note: "door", lookedAgainOn: null },
    { recordId: "s2", markedOn: "2026-11-10", changeset: null, note: "", lookedAgainOn: null },
  ],
};

describe("buildSubmissionsView", () => {
  const view = buildSubmissionsView(records, ledger, SAMPLE_TODAY, "en");
  it("has one row per record, in order, with its status", () => {
    expect(view.rows.map((r) => r.record.id)).toEqual(records.map((r) => r.id));
    expect(view.rows.map((r) => r.status)).toEqual(["marked", "marked", "not-marked", "not-marked", "not-marked"]);
  });
  it("attaches the entry to the row", () => {
    expect(view.rows[0]?.entry?.changeset).toBe("123");
    expect(view.rows[2]?.entry).toBeUndefined();
  });
  it("lists a follow-up only for a mark that is old enough, with its words", () => {
    expect(view.rows[0]?.followUp?.reason).toBe("never-looked");
    expect(view.rows[0]?.followUpText).toContain("You may want to look at the place on the map again");
    expect(view.rows[1]?.followUp).toBeNull();
    expect(view.rows[1]?.followUpText).toBeNull();
  });
  it("lists the unmarked observations, oldest first", () => {
    const dates = view.next.map((r) => r.observedOn);
    expect([...dates].sort()).toEqual(dates);
    expect(view.next.map((r) => r.id)).not.toContain("s1");
  });
  it("words the summary as what the person told the App", () => {
    expect(view.summaryText).toContain("These counts are what you told the App.");
    expect(view.summary.marked).toBe(2);
  });
  it("is empty and calm with no records", () => {
    const empty = buildSubmissionsView([], { version: 1, entries: [] }, SAMPLE_TODAY, "en");
    expect(empty.rows).toEqual([]);
    expect(empty.summaryText).toBe("You have no saved observations.");
  });
  it("ignores marks for places that are not saved", () => {
    const v = buildSubmissionsView(records.slice(1), ledger, SAMPLE_TODAY, "en");
    expect(v.summary.marked).toBe(1);
    expect(v.summary.orphans).toBe(1);
  });
  it("writes French when asked", () => {
    expect(buildSubmissionsView(records, ledger, SAMPLE_TODAY, "fr").summaryText).toContain("Elle ne peut pas voir OpenStreetMap.");
  });
  it("does not change the records or the ledger", () => {
    const r = JSON.parse(JSON.stringify(records));
    const l = JSON.parse(JSON.stringify(ledger));
    buildSubmissionsView(records, ledger, SAMPLE_TODAY, "en");
    expect(records).toEqual(r);
    expect(ledger).toEqual(l);
  });
});

describe("issuesByField", () => {
  it("keeps the first text for each field", () => {
    const out = issuesByField([{ field: "markedOn", code: "date-future" }, { field: "markedOn", code: "date-invalid" }, { field: "note", code: "note-too-long" }], "en");
    expect(Object.keys(out).sort()).toEqual(["markedOn", "note"]);
    expect(out.markedOn).toBe("The date is after today. Enter the day you submitted.");
  });
  it("is empty for no issues", () => expect(issuesByField([], "fr")).toEqual({}));
});

describe("submissionFile", () => {
  it("makes a csv named by day", () => {
    const f = submissionFile("csv", records, ledger, SAMPLE_TODAY, "en");
    expect(f).toMatchObject({ filename: "my-submissions-2026-11-15.csv", mime: "text/csv" });
    expect(f.content.split("\r\n")).toHaveLength(records.length + 2);
  });
  it("makes a json backup that restores to the same ledger", () => {
    const f = submissionFile("backup", records, ledger, SAMPLE_TODAY, "en");
    expect(f).toMatchObject({ filename: "my-submissions-backup-2026-11-15.json", mime: "application/json" });
    expect(JSON.parse(f.content)).toEqual(ledger);
  });
});
