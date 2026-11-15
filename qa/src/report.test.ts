import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ACCEPTANCE_CHECKS } from "./days/catalog.js";
import { foreignDisposition, hasTaggedTest, runAcceptance, summarise } from "./days/run.js";
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
    expect(summary.pass + summary.fail + summary.manual + summary.playwright + summary.blocked + summary.located).toBe(results.length);
    expect(summary.manual + summary.blocked).toBeGreaterThan(0);
  });

  it("points every Day 1 to 6 check owned by a sibling repository at a tagged test, except the seed and the human gate", () => {
    const sibling = ACCEPTANCE_CHECKS.filter((check) => check.day >= 1 && check.day <= 6 && check.owner !== "access-help" && check.owner !== "cross");
    const unlocated = sibling.filter((check) => !check.locatedIn?.length).map((check) => check.id);
    // Day 2 needs the open-data seed (access-maps pull request 1). D05-6 is a decision by the human owner.
    expect(unlocated.filter((id) => !id.startsWith("D02-"))).toEqual(["D05-6"]);
    for (const check of sibling.filter((item) => item.locatedIn)) {
      for (const location of check.locatedIn ?? []) {
        expect(location.file, check.id).toMatch(/\.(test|spec)\.tsx?$/);
      }
    }
  });

  it("reports a located test as read, not run, and never as a pass", () => {
    const results = runAcceptance();
    const located = results.filter((result) => result.status === "located");
    for (const result of located) {
      expect(result.detail).toContain("did not run the test");
    }
    const ids = new Set(ACCEPTANCE_CHECKS.filter((check) => check.locatedIn?.length).map((check) => check.id));
    for (const result of results.filter((item) => ids.has(item.id))) {
      expect(["located", "blocked", "manual"]).toContain(result.status);
    }
  });

  it("matches a test title that starts with the check id, and nothing else", () => {
    expect(hasTaggedTest('  it("D06-2 a power chair profile flags places", () => {', "D06-2")).toBe(true);
    expect(hasTaggedTest("test(`D04-5 planning works by keyboard`, async () => {", "D04-5")).toBe(true);
    expect(hasTaggedTest('  it("D06-20 another check", () => {', "D06-2")).toBe(false);
    expect(hasTaggedTest("// D06-2 is covered elsewhere", "D06-2")).toBe(false);
    expect(hasTaggedTest('describe("D06-2 group", () => {', "D06-2")).toBe(false);
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
