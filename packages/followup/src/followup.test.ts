import { describe, expect, it } from "vitest";
import {
  answerPackMarkdown,
  checkInMarkdown,
  emptyRecord,
  ISSUE_TEXT,
  loadRecord,
  questionIssues,
  saveRecord,
  splitTracker,
  STORAGE_KEY,
  textIssues,
  thankYouNote,
  trackerMarkdown,
  validateRecord,
  type DemoRecord,
  type QuestionEntry,
} from "./index.js";

// Synthetic example for tests. Not a record of a real session.
function example(): DemoRecord {
  return {
    build: "example-build",
    date: "2026-11-14",
    roles: ["human-owner", "presenter", "scio-attendee"],
    sectionsShown: ["Place page", "Washroom finder"],
    questions: [
      {
        id: "q1",
        askedBy: "scio-attendee",
        question: "How old is the washroom data?",
        answerGiven: "Each record shows its source date.",
        recordingAgreed: true,
        followUp: { kind: "follow-up", action: "Send the seed-count report", owner: "human-owner", due: "2026-11-20", committedBy: "team", confirmedByOwner: false },
      },
      {
        id: "q2",
        askedBy: "scio-attendee",
        question: "Could peers review entries?",
        answerGiven: "Not answered in the session.",
        recordingAgreed: true,
        followUp: { kind: "follow-up", action: "Decide whether to discuss peer review", owner: "human-owner", due: "2026-11-28", committedBy: "scio", confirmedByOwner: true },
      },
      {
        id: "q3",
        askedBy: "scio-attendee",
        question: "Does it work offline?",
        answerGiven: "The shell does after one load.",
        recordingAgreed: true,
        followUp: { kind: "none", reason: "Answered in the session." },
      },
    ],
    tracker: [
      { id: "t1", questionId: "q1", disposition: "answer-from-evidence", owner: "builder", due: "2026-11-20", status: "open", note: "" },
      { id: "t2", questionId: "q2", disposition: "scio-decision", owner: "human-owner", due: "2026-11-28", status: "open", note: "" },
      { id: "t3", questionId: "q1", disposition: "needs-fresh-evidence", owner: "reviewer", due: "2026-12-01", status: "open", note: "" },
    ],
    answers: [
      {
        id: "a1",
        trackerId: "t1",
        draft: "The count report lists each file by tier.",
        evidence: [{ kind: "seed-counts", ref: "counts.json" }],
        review: { overclaim: true, endorsement: true, health: true },
        approval: "approved",
        sent: false,
      },
    ],
    checks: [{ id: "c1", trackerId: "t3", evidenceNeeded: "Re-read the licence page", owner: "reviewer", opened: "2026-11-14", due: "2026-11-21", status: "open" }],
    checkIns: [{ date: "2026-11-21", roles: ["human-owner", "reviewer"], decisions: [{ decision: "Keep the licence check open one more week.", owner: "reviewer" }] }],
  };
}

function codes(record: DemoRecord): string[] {
  return validateRecord(record).map((issue) => `${issue.where}:${issue.code}`);
}

describe("record rules", () => {
  it("accepts a complete synthetic record", () => {
    expect(codes(example())).toEqual([]);
  });

  it("flags an empty record field by field", () => {
    expect(codes(emptyRecord())).toEqual(["record:missing-build", "record:bad-date", "record:no-roles", "record:no-sections"]);
  });

  it("needs an answer and a follow-up or a reason for every question", () => {
    const base = example().questions[2]!;
    const question: QuestionEntry = { ...base, answerGiven: " ", followUp: { kind: "none", reason: "" } };
    expect(questionIssues(question).map((issue) => issue.code)).toEqual(["empty-answer", "no-follow-up-reason"]);
  });

  it("drops a remark SCIO did not agree to record", () => {
    const record = example();
    record.questions[2] = { ...record.questions[2]!, recordingAgreed: false };
    expect(codes(record)).toEqual(["question q3:not-agreed"]);
  });

  it("refuses an unconfirmed SCIO commitment", () => {
    const record = example();
    const follow = record.questions[1]!.followUp;
    if (follow.kind === "follow-up") follow.confirmedByOwner = false;
    expect(codes(record)).toEqual(["question q2:scio-commitment-unconfirmed"]);
  });

  it("catches endorsement, SCIO claims, and personal details in text", () => {
    expect(textIssues("The App is endorsed by SCIO.")).toContain("overclaim");
    expect(textIssues("SCIO has agreed to adopt it.")).toEqual(["scio-claim"]);
    expect(textIssues("SCIO has not agreed to anything.")).toEqual([]);
    expect(textIssues("Reach me at someone@example.com")).toEqual(["personal-detail"]);
    expect(textIssues("Call 416 555 0100")).toEqual(["personal-detail"]);
    expect(textIssues("Call 911 in an emergency.")).toEqual([]);
    expect(textIssues("SCIO a approuvé le projet.")).toEqual(["scio-claim"]);
  });

  it("requires every promised follow-up to be tracked and every item to point at a question", () => {
    const record = example();
    record.tracker = record.tracker.filter((item) => item.questionId !== "q2");
    record.tracker.push({ id: "t9", questionId: "q404", disposition: "no-action", owner: "builder", due: "2026-11-20", status: "closed", note: "" });
    expect(codes(record)).toEqual(["question q2:follow-up-untracked", "tracker t9:tracker-orphan"]);
  });

  it("keeps SCIO decision questions apart", () => {
    const { team, scioDecisions } = splitTracker(example());
    expect(team.map((item) => item.id)).toEqual(["t1", "t3"]);
    expect(scioDecisions.map((item) => item.id)).toEqual(["t2"]);
  });

  it("allows answers only from evidence, with review before approval and approval before sending", () => {
    const record = example();
    record.answers.push({
      id: "a2",
      trackerId: "t3",
      draft: "",
      evidence: [],
      review: { overclaim: false, endorsement: true, health: true },
      approval: "approved",
      sent: true,
    });
    record.answers.push({ ...record.answers[0]!, id: "a3", approval: "held", sent: true });
    expect(codes(record)).toEqual([
      "answer a2:answer-not-evidence",
      "answer a2:answer-without-evidence",
      "answer a2:answer-unreviewed",
      "answer a3:sent-unapproved",
    ]);
  });

  it("opens dated checks only for fresh-evidence items, with an owner and dates in order", () => {
    const record = example();
    record.checks.push({ id: "c2", trackerId: "t1", evidenceNeeded: "x", owner: "reviewer", opened: "2026-11-14", due: "2026-11-10", status: "open" });
    expect(codes(record)).toEqual(["check c2:check-not-fresh", "check c2:check-due-before-open"]);
  });

  it("needs a dated check-in with an owned decision", () => {
    const record = example();
    record.checkIns.push({ date: "soon", roles: [], decisions: [] });
    expect(codes(record)).toEqual(["check-in 2:check-in-incomplete"]);
  });

  it("finds duplicate ids", () => {
    const record = example();
    record.questions.push({ ...record.questions[2]! });
    expect(codes(record)).toContain("question q3:duplicate-id");
  });

  it("has English and French text for every issue", () => {
    for (const [code, text] of Object.entries(ISSUE_TEXT)) {
      expect(text.en.trim(), code).not.toBe("");
      expect(text.fr.trim(), code).not.toBe("");
      expect(text.fr, code).not.toBe(text.en);
    }
  });
});

describe("thank-you note", () => {
  it("states what was shown, the honesty position, and only confirmed promises", () => {
    const note = thankYouNote(example(), "en");
    expect(note.ready).toBe(true);
    expect(note.text).toContain("We showed build example-build.");
    expect(note.text).toContain("- Washroom finder");
    expect(note.text).toContain("SCIO has not endorsed the App");
    expect(note.text).toContain("- Send the seed-count report (by 2026-11-20)");
    expect(note.text).toContain("You said you would:\n- Decide whether to discuss peer review");
    expect(note.text).toContain("We recorded 3 questions.");
    expect(note.text).toContain("Attendees by role: Human owner, Presenter, SCIO attendee.");
  });

  it("leaves out an unconfirmed SCIO promise and is not ready", () => {
    const record = example();
    const follow = record.questions[1]!.followUp;
    if (follow.kind === "follow-up") follow.confirmedByOwner = false;
    const note = thankYouNote(record, "en");
    expect(note.text).not.toContain("Decide whether to discuss peer review");
    expect(note.ready).toBe(false);
  });

  it("has a French version with French punctuation", () => {
    const note = thankYouNote(example(), "fr");
    expect(note.text).toContain("Nous avons montré la version example-build.");
    expect(note.text).toContain("Sections montrées :");
    expect(note.text).toContain("SCIO n'a pas appuyé l'application");
    expect(note.text).not.toMatch(/ :/);
  });

  it("says no follow-up was promised when none was", () => {
    const record = example();
    record.questions = [record.questions[2]!];
    record.tracker = [];
    record.answers = [];
    record.checks = [];
    const note = thankYouNote(record, "en");
    expect(note.text).toContain("We did not promise any follow-up in the session.");
    expect(note.text).toContain("We recorded 1 question.");
  });
});

describe("tables", () => {
  it("prints the tracker with SCIO decisions apart", () => {
    const markdown = trackerMarkdown(example());
    const scio = markdown.indexOf("## Questions for SCIO to decide");
    expect(markdown.indexOf("| t2 |")).toBeGreaterThan(scio);
    expect(markdown.indexOf("| t1 |")).toBeLessThan(scio);
  });

  it("never shows an unapproved answer as sent", () => {
    const record = example();
    record.answers[0] = { ...record.answers[0]!, approval: "held", sent: true };
    expect(answerPackMarkdown(record)).toContain("Decision: held. Sent: no.");
    expect(answerPackMarkdown(emptyRecord())).toContain("No answer has been drafted.");
  });

  it("prints checks and decisions with owners", () => {
    const markdown = checkInMarkdown(example());
    expect(markdown).toContain("| c1 | t3 | Re-read the licence page | Reviewer | 2026-11-14 | 2026-11-21 | open |");
    expect(markdown).toContain("- Keep the licence check open one more week. (owner: Reviewer)");
  });
});

describe("storage", () => {
  function memory(): Storage {
    const map = new Map<string, string>();
    return {
      getItem: (key) => map.get(key) ?? null,
      setItem: (key, value) => void map.set(key, value),
      removeItem: (key) => void map.delete(key),
      clear: () => map.clear(),
      key: () => null,
      length: 0,
    };
  }

  it("round-trips a record and reports damage instead of repairing it", () => {
    const storage = memory();
    expect(saveRecord(storage, example())).toBe(true);
    expect(loadRecord(storage).record).toEqual(example());
    storage.setItem(STORAGE_KEY, "{not json");
    expect(loadRecord(storage)).toEqual({ record: emptyRecord(), damaged: true });
    storage.setItem(STORAGE_KEY, JSON.stringify({ questions: "x" }));
    expect(loadRecord(storage).damaged).toBe(true);
  });
});
