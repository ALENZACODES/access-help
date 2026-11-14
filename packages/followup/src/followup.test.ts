import { describe, expect, it } from "vitest";
import {
  createQuestionsStore,
  defectsBySeverity,
  emptyDraft,
  lintText,
  renderDemoDayLog,
  renderRegression,
  renderTracker,
  SYNTHETIC_RECORD,
  validateAnswers,
  validateCheckIn,
  validateDefects,
  validateDemoDay,
  validateRecord,
  validateRegressionRun,
  validateThankYou,
  validateTriage,
  type DemoDayLog,
  type FollowUpRecord,
  type KeyValue,
} from "./index.js";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function rules(defects: { rule: string }[]): string[] {
  return defects.map((defect) => defect.rule);
}

describe("synthetic record", () => {
  it("passes every day from 25 to 30", () => {
    expect(validateRecord(SYNTHETIC_RECORD, 30)).toEqual([]);
  });

  it("asks only for the parts due by a given day", () => {
    const dayOne: FollowUpRecord = { format: "demo-follow-up-1.0.0", demoDay: SYNTHETIC_RECORD.demoDay, thankYou: SYNTHETIC_RECORD.thankYou };
    expect(validateRecord(dayOne, 25)).toEqual([]);
    expect(validateRecord(dayOne, 26).map((defect) => defect.detail)).toEqual(["Day 26 needs the triage tracker."]);
    expect(validateRecord(dayOne, 30)).toHaveLength(5);
  });
});

describe("lint", () => {
  it("catches endorsement in English and French", () => {
    expect(lintText("SCIO has endorsed the App.").map((hit) => hit.rule)).toEqual(["endorsement"]);
    expect(lintText("Built with SCIO's support.").map((hit) => hit.rule)).toEqual(["endorsement"]);
    expect(lintText("Lésions Médullaires Ontario a approuvé l'application.").map((hit) => hit.rule)).toEqual(["endorsement"]);
    expect(lintText("Endorsed by SCIO.").map((hit) => hit.id)).toContain("endorsed-by");
    expect(lintText("SCIO has not endorsed the App.")).toEqual([]);
  });

  it("allows a negated verification or live claim and blocks a bare one", () => {
    expect(lintText("No data shown is verified.")).toEqual([]);
    expect(lintText("All places are verified.").map((hit) => hit.rule)).toEqual(["verified-claim"]);
    expect(lintText("Aucune donnée n'est vérifiée.")).toEqual([]);
    expect(lintText("Les données vérifiées sont à jour.").map((hit) => hit.rule)).toEqual(["verified-claim"]);
    expect(lintText("Live elevator status is not shown.")).toEqual([]);
    expect(lintText("It shows real-time elevator status.").map((hit) => hit.rule)).toEqual(["live-claim"]);
  });

  it("checks negation per sentence", () => {
    expect(lintText("Nothing is sent. All records are verified.").map((hit) => hit.rule)).toEqual(["verified-claim"]);
  });

  it("blocks health claims and AI mentions", () => {
    expect(lintText("The games improve memory.").map((hit) => hit.rule)).toEqual(["health-claim"]);
    expect(lintText("Ces jeux améliorent la mémoire.").map((hit) => hit.rule)).toEqual(["health-claim"]);
    expect(lintText("Ces jeux n'améliorent pas la mémoire.")).toEqual([]);
    expect(lintText("Ce jeu améliore la mémoire.").map((hit) => hit.rule)).toEqual(["health-claim"]);
    expect(lintText("Drafted with ChatGPT.").map((hit) => hit.rule)).toEqual(["ai-mention"]);
    expect(lintText("Rédigé par IA.").map((hit) => hit.rule)).toEqual(["ai-mention"]);
    expect(lintText("Said and done.")).toEqual([]);
  });

  it("withholds the matched value for privacy rules", () => {
    const hits = lintText("Reach me at person@example.com or 416-555-0100 at M5V 2T6.");
    expect(hits.map((hit) => hit.rule)).toEqual(["email", "phone", "postal-code"]);
    expect(hits.every((hit) => hit.match === "(withheld)")).toBe(true);
  });

  it("finds unfilled placeholders but not markdown links", () => {
    expect(lintText("Thank you on [date].").map((hit) => hit.rule)).toEqual(["placeholder"]);
    expect(lintText("See [the page](https://example.org).")).toEqual([]);
  });
});

describe("Day 25 records", () => {
  const log = (): DemoDayLog => clone(SYNTHETIC_RECORD.demoDay!);

  it("refuses a row SCIO did not agree to record, and a deferred question with no follow-up", () => {
    const value = log();
    value.questions[0]!.recordingAgreed = false;
    value.questions[1]!.followUp = { kind: "none", note: "Nothing." };
    expect(rules(validateDemoDay(value))).toEqual(["recording-not-agreed", "deferred-without-follow-up"]);
  });

  it("needs owner and due date on a promised follow-up", () => {
    const value = log();
    value.questions[1]!.followUp = { kind: "promised", action: "Send it.", owner: "scio-attendee" as never, due: "soon" };
    expect(rules(validateDemoDay(value))).toEqual(["follow-up-owner", "follow-up-due"]);
  });

  it("checks length, honesty statements, and that the decision is not softer than a criterion", () => {
    const value = log();
    value.durationMinutes = 41;
    value.honestyStatements["french-shell-limit"] = false;
    value.gate4.criteria["data-honesty"] = "pause-and-re-plan";
    expect(rules(validateDemoDay(value))).toEqual(["duration-out-of-range", "honesty-statement", "gate4-softer-than-criteria"]);
    value.gate4.decision = "pause-and-re-plan";
    expect(rules(validateDemoDay(value))).not.toContain("gate4-softer-than-criteria");
  });

  it("needs a note when the build changed or the fallback ran, and the human owner listed", () => {
    const value = log();
    value.build.fallbackUsed = true;
    value.attendees = value.attendees.filter((attendee) => attendee.role !== "human-owner");
    expect(rules(validateDemoDay(value))).toEqual(["human-owner", "change-note", "gate4-stability"]);
  });

  it("refuses an endorsement in what SCIO asked for next", () => {
    const value = log();
    value.gate4.scioAskedNext = "SCIO agreed to adopt the App.";
    expect(rules(validateDemoDay(value))).toEqual(["text-endorsement"]);
  });

  it("checks the thank-you note against the questions log", () => {
    const questions = SYNTHETIC_RECORD.demoDay!.questions;
    const note = clone(SYNTHETIC_RECORD.thankYou![0]!);
    expect(validateThankYou(note, questions)).toEqual([]);
    note.followUpIds = ["Q02", "Q01"];
    note.text = "Thank you, [name]. Our AI tool showed the App.";
    expect(rules(validateThankYou(note, questions)).sort()).toEqual(
      ["follow-up-omitted", "prototype-status", "text-ai-mention", "text-placeholder", "unmade-commitment"].sort(),
    );
  });

  it("refuses a commitment when nothing was promised", () => {
    const note = { language: "en" as const, text: "Thank you. We showed a prototype. We will deliver a pilot.", followUpIds: [] };
    const answered = [SYNTHETIC_RECORD.demoDay!.questions[0]!];
    expect(rules(validateThankYou(note, answered))).toContain("unmade-commitment");
  });

  it("renders the demo-day log with every required part", () => {
    const markdown = renderDemoDayLog(SYNTHETIC_RECORD.demoDay!);
    for (const heading of ["Date: 2000-01-03", "Attendees by role", "Build demonstrated: synthetic-build-1", "## Sections shown", "## Questions and answers", "## Gate 4", "Decision: **continue**"]) {
      expect(markdown).toContain(heading);
    }
    expect(markdown).toContain("| Q02 | Synthetic question: which licences cover the transit data? | Deferred.");
  });
});

describe("Day 26 to 30 records", () => {
  it("triage needs disposition, owner, and due, and covers every promised follow-up", () => {
    const triage = clone(SYNTHETIC_RECORD.triage!);
    triage.items[0]!.owner = null;
    triage.items[1]!.owner = "builder";
    triage.items = triage.items.filter((item) => item.id !== "T04");
    triage.items.push({ id: "T05", origin: { kind: "request", ref: "x" }, summary: "Synthetic.", disposition: "decline-with-reason", owner: "builder", due: "1999-12-31" });
    expect(rules(validateTriage(triage, SYNTHETIC_RECORD.demoDay!.questions))).toEqual([
      "owner",
      "scio-decision-owner",
      "due-before-triage",
      "decline-reason",
    ]);
    triage.items = triage.items.filter((item) => item.origin.ref !== "Q02");
    expect(rules(validateTriage(triage, SYNTHETIC_RECORD.demoDay!.questions))).toContain("follow-up-untriaged");
  });

  it("the tracker lists SCIO decision questions apart", () => {
    const markdown = renderTracker(SYNTHETIC_RECORD.triage!);
    const [team, scio] = markdown.split("## Questions for SCIO to decide");
    expect(team).toContain("T01");
    expect(team).not.toContain("T02");
    expect(scio).toContain("T02");
  });

  it("Day 27 refuses an open demonstration blocker and a re-test on the wrong build", () => {
    const defects = clone(SYNTHETIC_RECORD.defects!);
    defects[0]!.fix!.retest!.build = "synthetic-build-1";
    defects.push({ id: "D03", severity: "blocker", summary: "Synthetic.", origin: "demonstration-fallback", foundOnBuild: "b1" });
    expect(rules(validateDefects(defects))).toEqual(["retest-wrong-build", "demonstration-defect-open"]);
  });

  it("Day 28 needs a dated plan for a carried defect and sorts by severity", () => {
    const defects = clone(SYNTHETIC_RECORD.defects!);
    delete defects[1]!.plan;
    expect(rules(validateDefects(defects))).toEqual(["carried-without-plan"]);
    expect(defectsBySeverity([...defects].reverse()).map((defect) => defect.id)).toEqual(["D01", "D02"]);
  });

  it("a regression run is evidence only for its own build", () => {
    const run = clone(SYNTHETIC_RECORD.regressionRuns![0]!);
    run.checks[0]!.buildId = "synthetic-build-1";
    delete run.checks[1]!.reason;
    expect(rules(validateRegressionRun(run))).toEqual(["evidence-from-other-build", "not-run-without-reason"]);
    expect(rules(validateRegressionRun({ ...run, buildId: "dev", checks: [] }))).toEqual(["build-unidentified", "no-checks"]);
    expect(renderRegression(SYNTHETIC_RECORD.regressionRuns!)).toContain("1 passed, 0 failed, 1 not run.");
  });

  it("Day 29 needs a cited draft for each evidence item and never a sent, unapproved answer", () => {
    const answers = clone(SYNTHETIC_RECORD.answers!);
    answers[0]!.citations = [];
    answers[0]!.approval = "pending";
    answers[0]!.sent = true;
    answers[0]!.text.en = "Every washroom is verified.";
    expect(rules(validateAnswers(answers, SYNTHETIC_RECORD.triage))).toEqual(["text-verified-claim", "no-citation", "sent-unapproved"]);
    expect(rules(validateAnswers([], SYNTHETIC_RECORD.triage))).toEqual(["answer-missing"]);
  });

  it("Day 30 needs one owned, dated check per fresh-evidence item and the deep sample under way", () => {
    const checkIn = clone(SYNTHETIC_RECORD.checkIn!);
    checkIn.checks = [];
    checkIn.deepSample = { status: "not-started" };
    expect(rules(validateCheckIn(checkIn, SYNTHETIC_RECORD.triage))).toEqual(["check-missing", "deep-sample-not-started"]);
    checkIn.checks = [{ itemId: "T01", evidenceNeeded: "x", openedOn: "2000-01-07", owner: null, due: null }];
    checkIn.deepSample = { status: "filed" };
    expect(rules(validateCheckIn(checkIn, SYNTHETIC_RECORD.triage))).toEqual(["owner", "due", "deep-sample-ref"]);
  });
});

describe("on-device questions store", () => {
  function storage(): KeyValue & { map: Map<string, string> } {
    const map = new Map<string, string>();
    return { map, getItem: (key) => map.get(key) ?? null, setItem: (key, value) => void map.set(key, value), removeItem: (key) => void map.delete(key) };
  }

  it("refuses an incomplete draft and points to the field", () => {
    const store = createQuestionsStore(storage());
    const result = store.add({ ...emptyDraft(), question: "Synthetic question?", answerGiven: "Synthetic.", note: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.map((problem) => problem.field)).toEqual(["recordingAgreed", "followUpKind"]);
  });

  it("points a privacy hit to the field that holds it", () => {
    const store = createQuestionsStore(storage());
    const result = store.add({
      ...emptyDraft(),
      question: "Synthetic question?",
      answerGiven: "Call 416-555-0100.",
      followUpKind: "none",
      note: "None.",
      recordingAgreed: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.map((problem) => [problem.field, problem.defect.rule])).toEqual([["answerGiven", "text-phone"]]);
  });

  it("keeps rows, numbers them, triages them, and clears them", () => {
    const backing = storage();
    const store = createQuestionsStore(backing);
    const base = { ...emptyDraft(), question: "Synthetic?", answerGiven: "Synthetic.", recordingAgreed: true };
    expect(store.add({ ...base, followUpKind: "none", note: "None needed." }).ok).toBe(true);
    const second = store.add({ ...base, answerKind: "deferred", followUpKind: "promised", action: "Synthetic action.", owner: "builder", due: "2000-01-10" });
    expect(second.ok && second.entry.id).toBe("Q02");
    expect(store.triageDefects("2000-01-04").map((defect) => defect.rule)).toEqual(["follow-up-untriaged"]);
    store.setTriage("Q02", { disposition: "needs-fresh-evidence", owner: "builder", due: "2000-01-10" });
    expect(store.triageDefects("2000-01-04")).toEqual([]);
    expect(createQuestionsStore(backing).load().questions).toHaveLength(2);
    store.remove("Q01");
    expect(store.load().questions.map((entry) => entry.id)).toEqual(["Q02"]);
    store.clear();
    expect(backing.map.size).toBe(0);
  });

  it("falls back to memory when storage is refused, and says so", () => {
    const refusing: KeyValue = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => undefined,
    };
    const store = createQuestionsStore(refusing);
    expect(store.memoryOnly).toBe(true);
    expect(createQuestionsStore(null).memoryOnly).toBe(true);
  });
});
