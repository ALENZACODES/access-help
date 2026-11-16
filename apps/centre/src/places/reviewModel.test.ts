import { describe, expect, it } from "vitest";
import { blockedIds, buildReviewView, reviewFile } from "./reviewModel.js";
import { sampleRecords, SAMPLE_TODAY } from "./testing.js";
import type { PlaceRecord } from "./types.js";

const records = (): PlaceRecord[] => sampleRecords();
const near = (record: PlaceRecord, id: string): PlaceRecord => ({ ...record, id, lat: record.lat + 0.00005 });

describe("buildReviewView", () => {
  it("builds one row per record, in order", () => {
    const view = buildReviewView(records(), [], SAMPLE_TODAY, "en");
    expect(view.rows.map((row) => row.record.id)).toEqual(records().map((r) => r.id));
    expect(view.batch.records).toHaveLength(records().length);
  });
  it("groups notes by severity in display order and only for groups that have notes", () => {
    const view = buildReviewView(records(), [], SAMPLE_TODAY, "en");
    for (const row of view.rows) {
      const order = row.notes.map((group) => group.severity);
      expect(order).toEqual(["blocker", "check", "note"].filter((s) => order.includes(s as never)));
      for (const group of row.notes) expect(group.texts.length).toBeGreaterThan(0);
    }
  });
  it("flags the old sample observation and keeps UNKNOWN as UNKNOWN", () => {
    const view = buildReviewView(records(), [], SAMPLE_TODAY, "en");
    const arena = view.rows.find((row) => row.record.id === "s3");
    expect(arena?.notes.flatMap((g) => g.texts).join(" ")).toMatch(/days old/);
    const annex = view.rows.find((row) => row.record.id === "s4");
    expect(annex?.record.wheelchair).toBe("UNKNOWN");
    expect(view.tags).toContain("Access status: UNKNOWN");
  });
  it("leaves a record out when the person chose to", () => {
    const view = buildReviewView(records(), ["s1"], SAMPLE_TODAY, "en");
    expect(view.included.map((r) => r.id)).not.toContain("s1");
    expect(view.rows.find((row) => row.record.id === "s1")?.leftOut).toBe(true);
    expect(view.tags).not.toContain("Sample Library");
    expect(view.includedBatch.records).toHaveLength(view.included.length);
  });
  it("excludes everything when every record is left out", () => {
    const all = records().map((r) => r.id);
    const view = buildReviewView(records(), all, SAMPLE_TODAY, "en");
    expect(view.included).toEqual([]);
    expect(view.comment).toBe("");
    expect(view.tags).toBe("");
  });
  it("keeps a record with a blocker out of the draft", () => {
    const bad = { ...records()[0]!, id: "bad", observedOn: "2999-01-01" };
    const view = buildReviewView([bad, ...records()], [], SAMPLE_TODAY, "en");
    expect(view.included.map((r) => r.id)).not.toContain("bad");
    expect(blockedIds(view)).toEqual(["bad"]);
    expect(view.heldBackSteps).toEqual(["tags", "changeset", "submit"]);
  });
  it("counts only included records in the changeset comment", () => {
    const view = buildReviewView(records(), ["s1", "s2"], SAMPLE_TODAY, "en");
    expect(view.comment).toContain(`for ${view.included.length} places`);
  });
  it("flags near duplicates on both rows without blocking them", () => {
    const first = records()[0]!;
    const view = buildReviewView([first, near(first, "twin")], [], SAMPLE_TODAY, "en");
    for (const row of view.rows) {
      expect(row.review.canSubmit).toBe(true);
      expect(row.notes.flatMap((g) => g.texts).join(" ")).toMatch(/may be the same place|Ce pourrait/);
    }
    expect(view.included).toHaveLength(2);
  });
  it("writes the summary and notes in French", () => {
    const view = buildReviewView(records(), [], SAMPLE_TODAY, "fr");
    expect(view.summary).toContain("observations :");
    expect(view.rows.flatMap((r) => r.notes.flatMap((g) => g.texts)).join(" ")).toContain("’");
  });
  it("handles no records", () => {
    const view = buildReviewView([], [], SAMPLE_TODAY, "en");
    expect(view.rows).toEqual([]);
    expect(view.summary).toBe("There are no saved observations to review.");
    expect(view.batch.allReady).toBe(false);
  });
  it("does not change the records it is given", () => {
    const input = records();
    const copy = JSON.parse(JSON.stringify(input));
    buildReviewView(input, ["s1"], SAMPLE_TODAY, "en");
    expect(input).toEqual(copy);
  });
});

describe("reviewFile", () => {
  const view = buildReviewView(records(), [], SAMPLE_TODAY, "en");
  it("names the draft and the list by date", () => {
    expect(reviewFile("handoff", view, SAMPLE_TODAY, "en").filename).toBe("observation-draft-2026-11-15.txt");
    expect(reviewFile("issues", view, SAMPLE_TODAY, "en").filename).toBe("observation-review-2026-11-15.csv");
  });
  it("writes text and csv with the right types", () => {
    expect(reviewFile("handoff", view, SAMPLE_TODAY, "en").mime).toBe("text/plain");
    expect(reviewFile("issues", view, SAMPLE_TODAY, "en").mime).toBe("text/csv");
  });
  it("puts only included records in the draft but all items in the list", () => {
    const some = buildReviewView(records(), ["s1"], SAMPLE_TODAY, "en");
    const draft = reviewFile("handoff", some, SAMPLE_TODAY, "en").content;
    expect(draft).not.toContain("Sample Library");
    expect(draft).toContain("Nothing was sent. I submit it myself.");
    const csv = reviewFile("issues", some, SAMPLE_TODAY, "en").content;
    expect(csv.startsWith("id,severity,note\r\n")).toBe(true);
  });
  it("says in the draft that nothing was uploaded, in both languages", () => {
    expect(reviewFile("handoff", view, SAMPLE_TODAY, "fr").content).toContain("Rien n’a été envoyé");
  });
});
