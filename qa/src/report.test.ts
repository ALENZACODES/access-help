import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ACCEPTANCE_CHECKS } from "./days/catalog.js";
import { foreignDisposition, runAcceptance, summarise } from "./days/run.js";
import { REVIEW_ITEMS, assessReview, type ReviewPacket } from "./reviewer/checklist.js";

describe("acceptance report", () => {
  it("covers days 1 through 25 and does not fail an automated check", () => {
    const days = new Set(ACCEPTANCE_CHECKS.map((check) => check.day));
    for (let day = 1; day <= 25; day += 1) {
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

  it("never fails or invents a log a person has not written", () => {
    const results = runAcceptance();
    for (const id of ["D19-6", "D23-1", "D23-6", "D24-5", "D24-6"]) {
      const result = results.find((item) => item.id === id);
      expect(result, id).toBeDefined();
      expect(["blocked", "pass"], `${id} ${result?.detail}`).toContain(result?.status);
    }
  });

  it("treats a missing sibling and a checked-out sibling as different honest states", () => {
    expect(foreignDisposition({ directory: false, packageJson: false })).toBe("blocked");
    expect(foreignDisposition({ directory: true, packageJson: false })).toBe("blocked");
    expect(foreignDisposition({ directory: false, packageJson: true })).toBe("blocked");
    expect(foreignDisposition({ directory: true, packageJson: true })).toBe("manual");
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
