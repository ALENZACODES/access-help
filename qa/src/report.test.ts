import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ACCEPTANCE_CHECKS } from "./days/catalog.js";
import { followupRecordCheck, foreignDisposition, runAcceptance, summarise } from "./days/run.js";
import { REVIEW_ITEMS, assessReview, type ReviewPacket } from "./reviewer/checklist.js";

describe("acceptance report", () => {
  it("covers days 1 through 30 and does not fail an automated check", () => {
    const days = new Set(ACCEPTANCE_CHECKS.map((check) => check.day));
    for (let day = 1; day <= 30; day += 1) {
      expect(days.has(day), `missing day ${day}`).toBe(true);
    }
    const results = runAcceptance();
    const summary = summarise(results);
    const failures = results.filter((result) => result.status === "fail");
    // Printed so the check command leaves a readable report in the test log.
    console.log(JSON.stringify({ summary, failures }, null, 2));
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
    expect(summary.pass).toBeGreaterThan(10);
    expect(summary.pass + summary.fail + summary.manual + summary.playwright + summary.blocked).toBe(results.length);
    expect(summary.manual + summary.blocked).toBeGreaterThan(0);
  });

  it("treats a missing sibling and a checked-out sibling as different honest states", () => {
    expect(foreignDisposition({ directory: false, packageJson: false })).toBe("blocked");
    expect(foreignDisposition({ directory: true, packageJson: false })).toBe("blocked");
    expect(foreignDisposition({ directory: false, packageJson: true })).toBe("blocked");
    expect(foreignDisposition({ directory: true, packageJson: true })).toBe("manual");
  });
});

describe("follow-up record checks", () => {
  it("stay manual when no record is filed, and validate one that is", async () => {
    const { mkdtempSync, writeFileSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { SYNTHETIC_RECORD } = await import("@access/followup");
    const dir = mkdtempSync(join(tmpdir(), "followup-"));
    expect(followupRecordCheck(26, join(dir, "absent.json")).status).toBe("manual");
    const path = join(dir, "record.json");
    writeFileSync(path, JSON.stringify(SYNTHETIC_RECORD));
    expect(followupRecordCheck(30, path).status).toBe("pass");
    const broken = structuredClone(SYNTHETIC_RECORD);
    broken.answers![0]!.sent = true;
    broken.answers![0]!.approval = "pending";
    writeFileSync(path, JSON.stringify(broken));
    const result = followupRecordCheck(29, path);
    expect(result.status).toBe("fail");
    expect(result.detail).toContain("answers:T03:sent-unapproved");
    writeFileSync(path, "{");
    expect(followupRecordCheck(25, path).status).toBe("fail");
  });

  it("the Day 25 to 30 rule self-test passes", () => {
    expect(runAcceptance().filter((result) => result.id.startsWith("D25-7"))).toMatchObject([{ status: "pass" }]);
  });
});

describe("reviewer checklist", () => {
  const checklist = readFileSync(resolve(import.meta.dirname, "../REVIEWER-CHECKLIST.md"), "utf8");

  it("documents every review item", () => {
    for (const item of REVIEW_ITEMS) {
      expect(checklist).toContain(item.id);
    }
  });

  it("rejects an empty packet and accepts a complete one", () => {
    const empty = assessReview({
      reviewerRole: "reviewer",
      buildId: "",
      verdict: "PASS",
      readHelpArticles: false,
      checkedEndorsement: false,
      checkedMedicalAdvice: false,
      checkedUnknowns: false,
      checkedFrenchDraft: false,
      checkedNoMessaging: false,
      checkedCrisisNotStored: false,
      axeOutputRecorded: false,
      keyboardChecked: false,
      defects: [],
      notes: "",
    });
    expect(empty.length).toBeGreaterThan(5);

    const packet: ReviewPacket = {
      reviewerRole: "reviewer",
      buildId: "access-help-0.1.0",
      verdict: "PASS WITH FIXES",
      readHelpArticles: true,
      checkedEndorsement: true,
      checkedMedicalAdvice: true,
      checkedUnknowns: true,
      checkedFrenchDraft: true,
      checkedNoMessaging: true,
      checkedCrisisNotStored: true,
      axeOutputRecorded: true,
      keyboardChecked: true,
      defects: [
        {
          severity: "minor",
          location: "docs/privacy-impact-assessment.md",
          reproduction: "Counsel has not signed P1.",
        },
      ],
      notes: "French remains a draft.",
    };
    expect(assessReview(packet)).toEqual([]);
  });

  it("refuses PASS while a blocker is open", () => {
    const gaps = assessReview({
      reviewerRole: "reviewer",
      buildId: "access-help-0.1.0",
      verdict: "PASS",
      readHelpArticles: true,
      checkedEndorsement: true,
      checkedMedicalAdvice: true,
      checkedUnknowns: true,
      checkedFrenchDraft: true,
      checkedNoMessaging: true,
      checkedCrisisNotStored: true,
      axeOutputRecorded: true,
      keyboardChecked: true,
      defects: [{ severity: "blocker", location: "help", reproduction: "Open the crisis article." }],
      notes: "",
    });
    expect(gaps).toContain("R12:pass-with-a-blocker");
  });
});
