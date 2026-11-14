/**
 * Records for master plan Days 25 to 30: the demonstration, its follow-ups,
 * and the first post-demo check-in. Every field is typed in by a person from
 * what happened. Nothing here is filled in by the software.
 */

/** Calendar date, YYYY-MM-DD. */
export type IsoDate = string;

/** Roles only. The records never hold a person's name. */
export const ROLES = [
  "human-owner",
  "presenter",
  "integrator",
  "builder",
  "reviewer",
  "scio-attendee",
  "observer",
] as const;
export type Role = (typeof ROLES)[number];

/** Who can own a follow-up. A SCIO attendee is never the owner of a team task. */
export const OWNER_ROLES = ["human-owner", "integrator", "builder", "reviewer"] as const satisfies readonly Role[];
export type OwnerRole = (typeof OWNER_ROLES)[number];

export type FollowUp =
  | { kind: "promised"; action: string; owner: OwnerRole; due: IsoDate }
  | { kind: "none"; note: string };

/** Day 25 questions log row. */
export interface QuestionEntry {
  /** Stable id, for example Q01. */
  id: string;
  question: string;
  /** What was said in the room, in the recorder's words. */
  answerGiven: string;
  /** "deferred" means the question could not be answered honestly in the room. */
  answerKind: "answered" | "deferred";
  followUp: FollowUp;
  /** SCIO agreed this question can be recorded. A row without that agreement is removed, not kept. */
  recordingAgreed: boolean;
}

/** The six statements the demo script requires (Day 25, definition of done 2). */
export const HONESTY_STATEMENTS = [
  "prototype-status",
  "unverified-data",
  "demonstration-outage-data",
  "no-endorsement",
  "no-medical-advice",
  "french-shell-limit",
] as const;
export type HonestyStatement = (typeof HONESTY_STATEMENTS)[number];

/** Gate 4 criteria from the Day 25 table. */
export const GATE4_CRITERIA = [
  "demonstration-delivery",
  "data-honesty",
  "scio-engagement",
  "build-stability",
  "record-accuracy",
] as const;
export type Gate4Criterion = (typeof GATE4_CRITERIA)[number];

/** Ordered from least to most severe. */
export const GATE4_OUTCOMES = ["continue", "fix-and-re-demo", "pause-and-re-plan"] as const;
export type Gate4Outcome = (typeof GATE4_OUTCOMES)[number];

export interface DemoDayLog {
  date: IsoDate;
  attendees: { role: Role; count: number }[];
  build: {
    id: string;
    unchangedDuringSession: boolean;
    fallbackUsed: boolean;
    /** Required when the build changed or the fallback was used: what failed and what was done. */
    changeNote?: string;
  };
  /** Measured length of the demonstration. Null if nobody timed it. */
  durationMinutes: number | null;
  sectionsShown: string[];
  honestyStatements: Record<HonestyStatement, boolean>;
  questions: QuestionEntry[];
  gate4: {
    criteria: Record<Gate4Criterion, Gate4Outcome>;
    decision: Gate4Outcome;
    decidedBy: "human-owner";
    scioAskedNext: string;
    nextSteps: string;
  };
}

export interface ThankYouNote {
  language: "en" | "fr";
  text: string;
  /** Ids of the promised follow-ups the note lists. */
  followUpIds: string[];
}

/** Day 26 triage. */
export const DISPOSITIONS = [
  "answer-from-evidence",
  "needs-fresh-evidence",
  "fix",
  "carry-with-plan",
  "decline-with-reason",
  "scio-decision",
] as const;
export type Disposition = (typeof DISPOSITIONS)[number];

export interface TriageItem {
  id: string;
  origin: { kind: "question" | "defect" | "request"; ref: string };
  summary: string;
  disposition: Disposition;
  owner: OwnerRole | null;
  due: IsoDate | null;
  /** Required for decline-with-reason. */
  reason?: string;
}

/** Days 27 and 28. */
export const SEVERITIES = ["blocker", "serious", "moderate", "minor"] as const;
export type Severity = (typeof SEVERITIES)[number];

export interface DefectEntry {
  id: string;
  severity: Severity;
  summary: string;
  origin: "demonstration-fallback" | "gate-3-carried" | "gate-4-carried" | "regression";
  foundOnBuild: string;
  fix?: {
    build: string;
    retest?: { build: string; result: "pass" | "fail"; date: IsoDate; role: OwnerRole };
  };
  /** A carried defect with no passing re-test needs a dated plan. */
  plan?: { owner: OwnerRole; due: IsoDate; note: string };
}

/**
 * Day 28 regression run. The same format is written by the Playwright
 * reporters in access-main and access-tools.
 */
export interface RegressionRun {
  format: "regression-run-1.0.0";
  repository: string;
  buildId: string;
  ranOn: IsoDate;
  checks: {
    id: string;
    gate: string;
    title: string;
    status: "pass" | "fail" | "not-run";
    /** Build the check ran on. Must equal the run's build. */
    buildId: string;
    reason?: string;
  }[];
}

/** Day 29. */
export const CITATION_KINDS = ["build", "seed-count", "research", "day-log", "regression-run"] as const;
export type CitationKind = (typeof CITATION_KINDS)[number];

export interface AnswerDraft {
  /** Triage item this answers. */
  itemId: string;
  text: { en: string; fr?: string };
  citations: { kind: CitationKind; ref: string }[];
  approval: "pending" | "approved" | "held";
  approvedBy?: "human-owner";
  sent: boolean;
}

/** Day 30. */
export interface FreshCheck {
  itemId: string;
  evidenceNeeded: string;
  openedOn: IsoDate;
  owner: OwnerRole | null;
  due: IsoDate | null;
}

export interface CheckIn {
  date: IsoDate;
  decisions: { text: string; decidedBy: Role }[];
  checks: FreshCheck[];
  deepSample: { status: "not-started" | "under-way" | "filed"; reportRef?: string };
}

/** Everything for Days 25 to 30. Later parts are optional until their day. */
export interface FollowUpRecord {
  format: "demo-follow-up-1.0.0";
  demoDay?: DemoDayLog;
  thankYou?: ThankYouNote[];
  triage?: { date: IsoDate; items: TriageItem[] };
  defects?: DefectEntry[];
  regressionRuns?: RegressionRun[];
  answers?: AnswerDraft[];
  checkIn?: CheckIn;
}

export type RecordPart =
  | "questions"
  | "demo-day"
  | "thank-you"
  | "triage"
  | "defects"
  | "regression"
  | "answers"
  | "check-in"
  | "record";

export interface RecordDefect {
  part: RecordPart;
  /** Row or field the defect is on, for example Q03 or gate4.decision. */
  ref: string;
  rule: string;
  severity: "blocker" | "serious" | "review";
  detail: string;
}
