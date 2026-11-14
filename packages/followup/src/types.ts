export type Language = "en" | "fr";

/**
 * People are recorded by role only. A name, an email address, or a phone
 * number is not stored in these records.
 */
export const ROLES = [
  "human-owner",
  "presenter",
  "builder",
  "reviewer",
  "integrator",
  "scio-attendee",
  "other-attendee",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, Record<Language, string>> = {
  "human-owner": { en: "Human owner", fr: "Responsable humain" },
  presenter: { en: "Presenter", fr: "Présentateur ou présentatrice" },
  builder: { en: "Builder", fr: "Développement" },
  reviewer: { en: "Reviewer", fr: "Révision" },
  integrator: { en: "Integrator", fr: "Intégration" },
  "scio-attendee": { en: "SCIO attendee", fr: "Participant de SCIO" },
  "other-attendee": { en: "Other attendee", fr: "Autre participant" },
};

/** Day 25: one row per question asked during the demonstration. */
export interface QuestionEntry {
  id: string;
  askedBy: Role;
  question: string;
  /** What was said in the session. "Not answered in the session" is allowed. */
  answerGiven: string;
  /** SCIO agreed this question may be recorded. Private remarks are not kept. */
  recordingAgreed: boolean;
  followUp: FollowUpPromise | NoFollowUp;
}

export interface FollowUpPromise {
  kind: "follow-up";
  action: string;
  owner: Role;
  /** YYYY-MM-DD */
  due: string;
  /** Who committed. A SCIO commitment needs the human owner's confirmation. */
  committedBy: "team" | "scio";
  confirmedByOwner: boolean;
}

export interface NoFollowUp {
  kind: "none";
  reason: string;
}

/** Day 26: triage of every follow-up. */
export const DISPOSITIONS = ["answer-from-evidence", "needs-fresh-evidence", "fix-defect", "scio-decision", "no-action"] as const;
export type Disposition = (typeof DISPOSITIONS)[number];

export interface TrackerItem {
  id: string;
  questionId: string;
  disposition: Disposition;
  owner: Role;
  due: string;
  status: "open" | "closed";
  note: string;
}

/** Day 29: an answer drawn only from existing evidence. */
export const EVIDENCE_KINDS = ["build", "seed-counts", "research", "day-log"] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export interface EvidenceRef {
  kind: EvidenceKind;
  /** A file path, a build identifier, or a URL. */
  ref: string;
}

export interface EvidenceAnswer {
  id: string;
  trackerId: string;
  draft: string;
  evidence: EvidenceRef[];
  review: { overclaim: boolean; endorsement: boolean; health: boolean };
  approval: "pending" | "approved" | "held";
  sent: boolean;
}

/** Day 30: a check that needs fresh evidence. */
export interface DatedCheck {
  id: string;
  trackerId: string;
  evidenceNeeded: string;
  owner: Role;
  opened: string;
  due: string;
  status: "open" | "done";
}

export interface CheckInDecision {
  decision: string;
  owner: Role;
}

export interface CheckIn {
  date: string;
  roles: Role[];
  decisions: CheckInDecision[];
}

/** The whole record from demo day to the first check-in. */
export interface DemoRecord {
  /** Build identifier that was demonstrated. */
  build: string;
  /** YYYY-MM-DD */
  date: string;
  roles: Role[];
  sectionsShown: string[];
  questions: QuestionEntry[];
  tracker: TrackerItem[];
  answers: EvidenceAnswer[];
  checks: DatedCheck[];
  checkIns: CheckIn[];
}

export function emptyRecord(): DemoRecord {
  return { build: "", date: "", roles: [], sectionsShown: [], questions: [], tracker: [], answers: [], checks: [], checkIns: [] };
}
