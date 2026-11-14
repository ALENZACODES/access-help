import { OVERCLAIM_PATTERNS } from "@access/help";
import {
  DISPOSITIONS,
  EVIDENCE_KINDS,
  ROLES,
  type DemoRecord,
  type EvidenceAnswer,
  type Language,
  type QuestionEntry,
  type Role,
} from "./types.js";

/**
 * Honesty rules for demo-day records, from master plan Days 25 to 30.
 * Each issue names the record and the field so a person can fix it.
 */

export type IssueCode =
  | "missing-build"
  | "bad-date"
  | "no-roles"
  | "no-sections"
  | "unknown-role"
  | "empty-question"
  | "empty-answer"
  | "not-agreed"
  | "follow-up-incomplete"
  | "no-follow-up-reason"
  | "scio-commitment-unconfirmed"
  | "personal-detail"
  | "overclaim"
  | "scio-claim"
  | "duplicate-id"
  | "tracker-orphan"
  | "follow-up-untracked"
  | "bad-disposition"
  | "answer-orphan"
  | "answer-not-evidence"
  | "answer-without-evidence"
  | "answer-unreviewed"
  | "sent-unapproved"
  | "check-orphan"
  | "check-not-fresh"
  | "check-due-before-open"
  | "check-in-incomplete";

export interface Issue {
  code: IssueCode;
  /** For example question q1, or record. */
  where: string;
  field: string;
}

export const ISSUE_TEXT: Record<IssueCode, Record<Language, string>> = {
  "missing-build": { en: "Record the build identifier that was demonstrated.", fr: "Inscrivez l'identifiant de la version présentée." },
  "bad-date": { en: "Use a calendar date, YYYY-MM-DD.", fr: "Utilisez une date du calendrier, AAAA-MM-JJ." },
  "no-roles": { en: "List the attendees by role.", fr: "Indiquez les participants par rôle." },
  "no-sections": { en: "List the sections shown.", fr: "Indiquez les sections montrées." },
  "unknown-role": { en: "Choose a role from the list. Names are not recorded.", fr: "Choisissez un rôle dans la liste. Les noms ne sont pas inscrits." },
  "empty-question": { en: "Write the question as it was asked.", fr: "Écrivez la question telle qu'elle a été posée." },
  "empty-answer": {
    en: "Write the answer given, or write that it was not answered in the session.",
    fr: "Écrivez la réponse donnée, ou indiquez qu'il n'y a pas eu de réponse pendant la séance.",
  },
  "not-agreed": {
    en: "Keep a question only if SCIO agreed it can be recorded.",
    fr: "Ne gardez une question que si SCIO a accepté qu'elle soit inscrite.",
  },
  "follow-up-incomplete": { en: "A follow-up needs an action, an owner, and a due date.", fr: "Un suivi doit avoir une action, un responsable et une date d'échéance." },
  "no-follow-up-reason": { en: "Say why no follow-up is needed.", fr: "Dites pourquoi aucun suivi n'est nécessaire." },
  "scio-commitment-unconfirmed": {
    en: "A commitment by SCIO is recorded only after the human owner confirms SCIO made it.",
    fr: "Un engagement de SCIO n'est inscrit qu'après confirmation par le responsable humain que SCIO l'a pris.",
  },
  "personal-detail": {
    en: "Remove the email address or phone number. Record people by role.",
    fr: "Retirez l'adresse courriel ou le numéro de téléphone. Inscrivez les personnes par rôle.",
  },
  overclaim: {
    en: "Remove the endorsement, eligibility, compliance, or health claim.",
    fr: "Retirez l'affirmation d'appui, d'admissibilité, de conformité ou de santé.",
  },
  "scio-claim": {
    en: "Do not say SCIO agreed, approved, endorsed, or will adopt the App.",
    fr: "N'écrivez pas que SCIO a accepté, approuvé ou appuyé l'application, ou qu'il l'adoptera.",
  },
  "duplicate-id": { en: "Each id must be unique.", fr: "Chaque identifiant doit être unique." },
  "tracker-orphan": { en: "The tracker item points to a question that is not in the log.", fr: "L'élément du suivi renvoie à une question absente du registre." },
  "follow-up-untracked": { en: "Every promised follow-up needs a tracker item.", fr: "Chaque suivi promis doit avoir un élément dans le suivi." },
  "bad-disposition": { en: "Choose a disposition from the list.", fr: "Choisissez une décision dans la liste." },
  "answer-orphan": { en: "The answer points to a tracker item that does not exist.", fr: "La réponse renvoie à un élément de suivi qui n'existe pas." },
  "answer-not-evidence": {
    en: "Only items marked answer from evidence get a draft answer.",
    fr: "Seuls les éléments marqués réponse à partir des preuves reçoivent une ébauche.",
  },
  "answer-without-evidence": { en: "Cite the build, seed counts, research, or day log.", fr: "Citez la version, les comptes de départ, la recherche ou le journal." },
  "answer-unreviewed": {
    en: "Check the draft for overclaim, endorsement wording, and health claims before approval.",
    fr: "Vérifiez l'ébauche pour l'exagération, l'appui et les affirmations de santé avant l'approbation.",
  },
  "sent-unapproved": { en: "Nothing is sent before the human owner approves it.", fr: "Rien n'est envoyé avant l'approbation du responsable humain." },
  "check-orphan": { en: "The check points to a tracker item that does not exist.", fr: "La vérification renvoie à un élément de suivi qui n'existe pas." },
  "check-not-fresh": {
    en: "Open a dated check only for an item that needs fresh evidence.",
    fr: "N'ouvrez une vérification datée que pour un élément qui demande de nouvelles preuves.",
  },
  "check-due-before-open": { en: "The due date is before the open date.", fr: "L'échéance précède la date d'ouverture." },
  "check-in-incomplete": {
    en: "A check-in needs a date, roles, and at least one decision with an owner.",
    fr: "Une rencontre de suivi doit avoir une date, des rôles et au moins une décision avec un responsable.",
  },
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/;
const SCIO_CLAIM =
  /\bSCIO\b[^.]{0,40}\b(?:agreed to|has agreed|approved|endorsed|endorses|will adopt|committed to|partnered)\b|\bSCIO\b[^.]{0,40}\b(?:a accepté|a approuvé|appuie|adoptera|s'est engagé)/i;
const NEGATED = /\b(?:not|never|no|n'a pas|ne\s+\S+\s+pas)\b/i;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Returns issue codes for free text the App would keep or send. */
export function textIssues(text: string): IssueCode[] {
  const codes: IssueCode[] = [];
  if (EMAIL.test(text) || PHONE.test(text)) codes.push("personal-detail");
  if (OVERCLAIM_PATTERNS.some((rule) => rule.pattern.test(text))) codes.push("overclaim");
  const sentences = text.split(/(?<=[.!?])\s+/);
  if (sentences.some((sentence) => SCIO_CLAIM.test(sentence) && !NEGATED.test(sentence))) codes.push("scio-claim");
  return codes;
}

function push(issues: Issue[], code: IssueCode, where: string, field: string): void {
  issues.push({ code, where, field });
}

function checkText(issues: Issue[], text: string, where: string, field: string): void {
  for (const code of textIssues(text)) push(issues, code, where, field);
}

export function questionIssues(question: QuestionEntry): Issue[] {
  const issues: Issue[] = [];
  const where = `question ${question.id}`;
  if (!isRole(question.askedBy)) push(issues, "unknown-role", where, "askedBy");
  if (!question.question.trim()) push(issues, "empty-question", where, "question");
  if (!question.answerGiven.trim()) push(issues, "empty-answer", where, "answerGiven");
  if (!question.recordingAgreed) push(issues, "not-agreed", where, "recordingAgreed");
  checkText(issues, question.question, where, "question");
  checkText(issues, question.answerGiven, where, "answerGiven");
  const follow = question.followUp;
  if (follow.kind === "none") {
    if (follow.reason.trim().length < 3) push(issues, "no-follow-up-reason", where, "followUp.reason");
  } else {
    if (!follow.action.trim() || !isRole(follow.owner) || !isIsoDate(follow.due)) push(issues, "follow-up-incomplete", where, "followUp");
    if (follow.committedBy === "scio" && !follow.confirmedByOwner) push(issues, "scio-commitment-unconfirmed", where, "followUp.committedBy");
    checkText(issues, follow.action, where, "followUp.action");
  }
  return issues;
}

function unique(issues: Issue[], ids: string[], where: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) push(issues, "duplicate-id", `${where} ${id}`, "id");
    seen.add(id);
  }
}

function answerIssues(answer: EvidenceAnswer): Issue[] {
  const issues: Issue[] = [];
  const where = `answer ${answer.id}`;
  if (answer.evidence.length === 0 || answer.evidence.some((item) => !(EVIDENCE_KINDS as readonly string[]).includes(item.kind) || !item.ref.trim())) {
    push(issues, "answer-without-evidence", where, "evidence");
  }
  checkText(issues, answer.draft, where, "draft");
  const reviewed = answer.review.overclaim && answer.review.endorsement && answer.review.health;
  if (answer.approval === "approved" && !reviewed) push(issues, "answer-unreviewed", where, "review");
  if (answer.sent && answer.approval !== "approved") push(issues, "sent-unapproved", where, "sent");
  return issues;
}

export function validateRecord(record: DemoRecord): Issue[] {
  const issues: Issue[] = [];
  if (!record.build.trim()) push(issues, "missing-build", "record", "build");
  if (!isIsoDate(record.date)) push(issues, "bad-date", "record", "date");
  if (record.roles.length === 0) push(issues, "no-roles", "record", "roles");
  if (record.roles.some((role) => !isRole(role))) push(issues, "unknown-role", "record", "roles");
  if (record.sectionsShown.filter((section) => section.trim()).length === 0) push(issues, "no-sections", "record", "sectionsShown");
  for (const section of record.sectionsShown) checkText(issues, section, "record", "sectionsShown");

  unique(issues, record.questions.map((item) => item.id), "question");
  unique(issues, record.tracker.map((item) => item.id), "tracker");
  unique(issues, record.answers.map((item) => item.id), "answer");
  unique(issues, record.checks.map((item) => item.id), "check");

  for (const question of record.questions) issues.push(...questionIssues(question));

  const questionIds = new Set(record.questions.map((item) => item.id));
  const tracked = new Set(record.tracker.map((item) => item.questionId));
  for (const question of record.questions) {
    if (question.followUp.kind === "follow-up" && !tracked.has(question.id)) push(issues, "follow-up-untracked", `question ${question.id}`, "followUp");
  }
  const trackerById = new Map(record.tracker.map((item) => [item.id, item]));
  for (const item of record.tracker) {
    const where = `tracker ${item.id}`;
    if (!questionIds.has(item.questionId)) push(issues, "tracker-orphan", where, "questionId");
    if (!(DISPOSITIONS as readonly string[]).includes(item.disposition)) push(issues, "bad-disposition", where, "disposition");
    if (!isRole(item.owner)) push(issues, "unknown-role", where, "owner");
    if (!isIsoDate(item.due)) push(issues, "bad-date", where, "due");
    checkText(issues, item.note, where, "note");
  }

  for (const answer of record.answers) {
    const item = trackerById.get(answer.trackerId);
    if (!item) push(issues, "answer-orphan", `answer ${answer.id}`, "trackerId");
    else if (item.disposition !== "answer-from-evidence") push(issues, "answer-not-evidence", `answer ${answer.id}`, "trackerId");
    issues.push(...answerIssues(answer));
  }

  for (const check of record.checks) {
    const where = `check ${check.id}`;
    const item = trackerById.get(check.trackerId);
    if (!item) push(issues, "check-orphan", where, "trackerId");
    else if (item.disposition !== "needs-fresh-evidence") push(issues, "check-not-fresh", where, "trackerId");
    if (!isRole(check.owner)) push(issues, "unknown-role", where, "owner");
    if (!isIsoDate(check.opened)) push(issues, "bad-date", where, "opened");
    if (!isIsoDate(check.due)) push(issues, "bad-date", where, "due");
    if (isIsoDate(check.opened) && isIsoDate(check.due) && check.due < check.opened) push(issues, "check-due-before-open", where, "due");
    checkText(issues, check.evidenceNeeded, where, "evidenceNeeded");
  }

  record.checkIns.forEach((meeting, index) => {
    const where = `check-in ${index + 1}`;
    const complete =
      isIsoDate(meeting.date) &&
      meeting.roles.length > 0 &&
      meeting.roles.every(isRole) &&
      meeting.decisions.length > 0 &&
      meeting.decisions.every((item) => item.decision.trim() && isRole(item.owner));
    if (!complete) push(issues, "check-in-incomplete", where, "decisions");
    for (const item of meeting.decisions) checkText(issues, item.decision, where, "decisions");
  });
  return issues;
}

/** Day 26: SCIO decision questions are listed apart from the team's own work. */
export function splitTracker(record: DemoRecord): { team: DemoRecord["tracker"]; scioDecisions: DemoRecord["tracker"] } {
  return {
    team: record.tracker.filter((item) => item.disposition !== "scio-decision"),
    scioDecisions: record.tracker.filter((item) => item.disposition === "scio-decision"),
  };
}
