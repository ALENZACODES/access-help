import { describe, expect, it } from "vitest";
import {
  AUDIT_LIMITATION,
  CENTRE_SCREENS,
  labelInName,
  openBlockers,
  validateAuditReport,
  type AuditReport,
  type ControlCheck,
} from "./audit/index.js";
import { CONSENT_CHECKLIST, TASK_SET, prioritiseFixes, summariseUsability, validateSession, type SessionRecord } from "./usability/index.js";

function control(index: number, overrides: Partial<ControlCheck> = {}): ControlCheck {
  return {
    screen: "home",
    language: "en",
    control: `button: Control ${index}`,
    visibleLabel: `Control ${index}`,
    width: 120,
    height: 48,
    inline: false,
    targetOk: true,
    singleActivation: true,
    focusVisible: true,
    labelInName: true,
    ...overrides,
  };
}

function report(overrides: Partial<AuditReport> = {}): AuditReport {
  return {
    schemaVersion: "audit-report-1.0.0",
    buildId: "build-b",
    ranAt: "2026-11-14T12:00:00.000Z",
    screens: CENTRE_SCREENS.flatMap((screen) =>
      (["en", "fr"] as const).map((language) => ({ id: screen.id, language, axeViolations: [], keyboard: { firstStop: "Skip to main content", stops: 12, noTrap: true } })),
    ),
    controls: Array.from({ length: 10 }, (_, index) => control(index)),
    failures: [],
    retests: [],
    limitation: AUDIT_LIMITATION,
    ...overrides,
  };
}

describe("Day 17 audit report", () => {
  it("accepts a report that covers every screen in both languages", () => {
    expect(validateAuditReport(report())).toEqual([]);
  });

  it("names a missing screen, a missing build identifier, and a missing limitation", () => {
    const base = report();
    const rules = validateAuditReport({ ...base, buildId: " ", limitation: "All good.", screens: base.screens.filter((row) => !(row.id === "about" && row.language === "fr")) }).map(
      (issue) => `${issue.rule}: ${issue.detail}`,
    );
    expect(rules).toContain("coverage: about (fr) was not audited.");
    expect(rules.some((rule) => rule.startsWith("build-id"))).toBe(true);
    expect(rules.some((rule) => rule.startsWith("limitation"))).toBe(true);
  });

  it("needs severity, a known screen, a WCAG 2.2 A or AA criterion, reproduction steps, and an observation on each failure", () => {
    const rules = validateAuditReport(
      report({
        failures: [
          { id: "F1", severity: "critical" as never, screen: "map", language: "en", criterion: "4.1.1", reproduction: [" "], observed: "" },
          { id: "F1", severity: "minor", screen: "home", language: "en", criterion: "2.5.5", reproduction: ["Tab once."], observed: "Small." },
        ],
      }),
    ).map((issue) => issue.rule);
    expect(rules).toEqual(
      expect.arrayContaining(["failure-severity", "failure-screen", "failure-criterion", "failure-reproduction", "failure-observed", "failure-id"]),
    );
    expect(rules.filter((rule) => rule === "failure-criterion")).toHaveLength(2);
  });

  it("needs ten controls that meet size, single activation, and focus, and ten whose name matches the label", () => {
    const controls = [...Array.from({ length: 9 }, (_, index) => control(index)), control(9, { focusVisible: false, labelInName: false })];
    const rules = validateAuditReport(report({ controls })).map((issue) => issue.rule);
    expect(rules).toEqual(["controls-target", "controls-name"]);
  });

  it("rejects a targetOk that the measured size does not support, and allows the inline exception", () => {
    const controls = [...Array.from({ length: 10 }, (_, index) => control(index)), control(10, { width: 20, height: 20 }), control(11, { width: 18, height: 18, inline: true })];
    const issues = validateAuditReport(report({ controls }));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.detail).toMatch(/Control 10/);
  });

  it("flags a trapped or empty keyboard path", () => {
    const base = report();
    const screens = base.screens.map((row) => (row.id === "practice" && row.language === "en" ? { ...row, keyboard: { firstStop: "", stops: 0, noTrap: false } } : row));
    expect(validateAuditReport({ ...base, screens }).map((issue) => issue.detail)).toEqual([
      "practice (en) traps keyboard focus.",
      "practice (en) has no Tab stop.",
    ]);
  });

  it("counts a blocker as closed only after a passing retest on this build, found on another", () => {
    const failure = { id: "F2", severity: "blocker" as const, screen: "events", language: "en" as const, criterion: "2.1.1", reproduction: ["Open events.", "Press Tab."], observed: "Focus skips the list." };
    expect(openBlockers(report({ failures: [failure] }))).toHaveLength(1);
    const closed = report({ failures: [failure], retests: [{ failureId: "F2", foundOn: "build-a", retestedOn: "build-b", result: "pass" }] });
    expect(openBlockers(closed)).toEqual([]);
    expect(validateAuditReport(closed)).toEqual([]);
    const sameBuild = report({ failures: [failure], retests: [{ failureId: "F2", foundOn: "build-b", retestedOn: "build-b", result: "pass" }] });
    expect(validateAuditReport(sameBuild).map((issue) => issue.rule)).toEqual(["retest"]);
  });

  it("matches label in name the way WCAG 2.5.3 describes", () => {
    expect(labelInName("Français", "Français")).toBe(true);
    expect(labelInName("Back to help", "Back to help, article list")).toBe(true);
    expect(labelInName("Open the listing", "Open the listing: Demonstration event")).toBe(true);
    expect(labelInName("Search", "Find")).toBe(false);
    expect(labelInName("", "Anything")).toBe(false);
  });
});

function session(id: string, overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    schemaVersion: "usability-session-1.0.0",
    sessionId: id,
    buildId: "access-help-0.1.0",
    taskSetVersion: "centre-tasks-1.0.0",
    date: "2026-11-20",
    language: "en",
    consent: { consent: true, "right-to-stop": true, "no-travel": true, "no-health-details": true },
    tasksAttempted: ["T1", "T4"],
    findings: [
      {
        taskId: "T4",
        behaviour: "Looked for a register button inside the event page before finding the outside link.",
        paraphrase: "Expected to sign up without leaving the page.",
        severity: "serious",
        fix: "Say near the top that registration happens on the organisation's site.",
      },
    ],
    ...overrides,
  };
}

describe("Day 18 usability records", () => {
  it("has five tasks and a consent checklist with consent, stopping, no travel, and no health details, in both languages", () => {
    expect(TASK_SET.map((task) => task.id)).toEqual(["T1", "T2", "T3", "T4", "T5"]);
    expect(CONSENT_CHECKLIST.map((item) => item.id)).toEqual(["consent", "right-to-stop", "no-travel", "no-health-details"]);
    for (const item of CONSENT_CHECKLIST) {
      expect(item.text.en.length).toBeGreaterThan(20);
      expect(item.text.fr.length).toBeGreaterThan(20);
    }
    expect(CONSENT_CHECKLIST[1]?.text.en).toMatch(/stop at any time/);
    expect(CONSENT_CHECKLIST[2]?.text.en).toMatch(/do not have to travel/);
    expect(CONSENT_CHECKLIST[3]?.text.en).toMatch(/not ask about your health/);
  });

  it("accepts a complete anonymous session", () => {
    expect(validateSession(session("S1"))).toEqual([]);
  });

  it("refuses a session without every consent item", () => {
    const issues = validateSession(session("S1", { consent: { consent: true, "right-to-stop": true, "no-travel": false, "no-health-details": true } }));
    expect(issues.map((issue) => issue.rule)).toEqual(["consent"]);
  });

  it("refuses identity: a name as the id, extra fields, email, phone, postal code, and age", () => {
    const named = validateSession({ ...session("Jane"), participantName: "Jane" }).map((issue) => issue.rule);
    expect(named).toEqual(expect.arrayContaining(["anonymous-id", "unknown-field"]));
    const leaks = [
      "Wrote to jane@example.com after the task.",
      "Gave a call-back number 416 555 0199 before starting.",
      "Lives near M5V 2T6 and uses the downtown stops.",
      "Is 34 years old and new to tablets in general.",
    ];
    for (const behaviour of leaks) {
      const rules = validateSession(session("S2", { findings: [{ ...session("S2").findings[0]!, behaviour }] })).map((issue) => issue.rule);
      expect(rules, behaviour).toContain("identity");
    }
  });

  it("refuses health detail in English and French", () => {
    const leaks = [
      "Mentioned a C5 injury while reaching for the screen.",
      "Talked about bladder routines during the event task.",
      "Said the medication made reading slow today.",
      "Parlait de sa lésion incomplète pendant la tâche.",
      "Had pain in one hand and switched to voice input.",
    ];
    for (const behaviour of leaks) {
      const rules = validateSession(session("S3", { findings: [{ ...session("S3").findings[0]!, behaviour }] })).map((issue) => issue.rule);
      expect(rules, behaviour).toContain("health");
    }
  });

  it("needs task, behaviour, paraphrase, severity, and fix on each finding, and no direct quote", () => {
    const issues = validateSession(
      session("S4", {
        findings: [{ taskId: "T9", behaviour: "", paraphrase: "“I give up”, they said clearly.", severity: "major" as never, fix: "" }],
      }),
    ).map((issue) => issue.rule);
    expect(issues).toEqual(expect.arrayContaining(["finding-task", "finding-behaviour", "finding-fix", "finding-severity", "finding-paraphrase"]));
  });

  it("prioritises fixes: blockers, then serious, then minor, merging the same fix", () => {
    const fix = (taskId: string, severity: "blocker" | "serious" | "minor", text: string) => ({
      taskId,
      behaviour: "Behaviour seen during the task.",
      paraphrase: "Summary of what the person said.",
      severity,
      fix: text,
    });
    const sessions = [
      session("S1", { tasksAttempted: ["T1", "T2"], findings: [fix("T2", "minor", "Make the language button larger."), fix("T1", "serious", "Link the article from home.")] }),
      session("S2", { tasksAttempted: ["T2", "T4"], findings: [fix("T2", "serious", "make the language button larger."), fix("T4", "blocker", "Name the registration link.")] }),
      session("S3", { tasksAttempted: ["T1"], findings: [fix("T1", "minor", "Shorten the article title.")] }),
    ];
    expect(prioritiseFixes(sessions).map((item) => `${item.severity} ${item.taskId} ${item.seenIn.join("+")}`)).toEqual([
      "blocker T4 S2",
      "serious T2 S1+S2",
      "serious T1 S1",
      "minor T1 S3",
    ]);
  });

  it("needs three valid sessions on the tested build, and reports zero honestly", () => {
    expect(summariseUsability([], "access-help-0.1.0")).toMatchObject({ sessions: 0, enoughSessions: false, buildMatches: false });
    const three = [session("S1"), session("S2"), session("S3")];
    expect(summariseUsability(three, "access-help-0.1.0")).toMatchObject({ sessions: 3, enoughSessions: true, buildMatches: true });
    expect(summariseUsability(three, "access-help-0.2.0").buildMatches).toBe(false);
    const mixed = summariseUsability([session("S1"), session("S2"), session("S3", { buildId: "other" })], "access-help-0.1.0");
    expect(mixed.buildsSeen).toEqual(["access-help-0.1.0", "other"]);
    expect(mixed.buildMatches).toBe(false);
    expect(summariseUsability([session("S1"), session("S1")], "access-help-0.1.0").issues.map((issue) => issue.rule)).toEqual(["duplicate"]);
  });
});
