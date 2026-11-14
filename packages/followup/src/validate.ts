import { lintText, RECORD_RULES, type LintRule } from "./lint.js";
import {
  CITATION_KINDS,
  DISPOSITIONS,
  GATE4_CRITERIA,
  GATE4_OUTCOMES,
  HONESTY_STATEMENTS,
  OWNER_ROLES,
  ROLES,
  SEVERITIES,
  type AnswerDraft,
  type CheckIn,
  type DefectEntry,
  type DemoDayLog,
  type FollowUpRecord,
  type QuestionEntry,
  type RecordDefect,
  type RecordPart,
  type RegressionRun,
  type ThankYouNote,
  type TriageItem,
} from "./types.js";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function filled(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

class Collector {
  readonly defects: RecordDefect[] = [];

  add(part: RecordPart, ref: string, rule: string, severity: RecordDefect["severity"], detail: string): void {
    this.defects.push({ part, ref, rule, severity, detail });
  }

  text(part: RecordPart, ref: string, value: string, rules: readonly LintRule[] = RECORD_RULES): void {
    for (const hit of lintText(value, rules)) {
      this.add(part, ref, `text-${hit.rule}`, hit.severity, `${hit.id}: "${hit.match}"`);
    }
  }
}

function checkFollowUp(out: Collector, part: RecordPart, ref: string, entry: QuestionEntry): void {
  const followUp = entry.followUp;
  if (!followUp || (followUp.kind !== "promised" && followUp.kind !== "none")) {
    out.add(part, ref, "follow-up-missing", "blocker", "Each question needs a follow-up or an explicit no-follow-up note.");
    return;
  }
  if (followUp.kind === "none") {
    if (!filled(followUp.note)) out.add(part, ref, "no-follow-up-note", "blocker", "A question with no follow-up needs a note saying so.");
    else out.text(part, ref, followUp.note);
    if (entry.answerKind === "deferred") {
      out.add(part, ref, "deferred-without-follow-up", "blocker", "A deferred question must be recorded as a follow-up, not left open.");
    }
    return;
  }
  if (!filled(followUp.action)) out.add(part, ref, "follow-up-action", "blocker", "A promised follow-up needs the action.");
  else out.text(part, ref, followUp.action);
  if (!(OWNER_ROLES as readonly string[]).includes(followUp.owner)) {
    out.add(part, ref, "follow-up-owner", "blocker", "A promised follow-up needs a team owner role.");
  }
  if (!isDate(followUp.due)) out.add(part, ref, "follow-up-due", "blocker", "A promised follow-up needs a due date (YYYY-MM-DD).");
}

/** Day 25 acceptance test 3. */
export function validateQuestions(questions: QuestionEntry[], part: RecordPart = "questions"): RecordDefect[] {
  const out = new Collector();
  const ids = new Set<string>();
  questions.forEach((entry, index) => {
    const ref = filled(entry.id) ? entry.id : `row ${index + 1}`;
    if (!filled(entry.id)) out.add(part, ref, "id", "blocker", "Each question needs an id.");
    else if (ids.has(entry.id)) out.add(part, ref, "duplicate-id", "blocker", "Question ids must be unique.");
    ids.add(entry.id);
    if (entry.recordingAgreed !== true) {
      out.add(part, ref, "recording-not-agreed", "blocker", "SCIO did not agree this can be recorded. Remove the row.");
    }
    if (!filled(entry.question)) out.add(part, ref, "question", "blocker", "The question is empty.");
    else out.text(part, ref, entry.question);
    if (!filled(entry.answerGiven)) out.add(part, ref, "answer", "blocker", "Record the answer given, or say it was deferred.");
    else out.text(part, ref, entry.answerGiven);
    if (entry.answerKind !== "answered" && entry.answerKind !== "deferred") {
      out.add(part, ref, "answer-kind", "blocker", "answerKind is answered or deferred.");
    }
    checkFollowUp(out, part, ref, entry);
  });
  return out.defects;
}

function severityRank(outcome: string): number {
  return (GATE4_OUTCOMES as readonly string[]).indexOf(outcome);
}

/** Day 25 acceptance tests 4 and 6, and the Gate 4 record. */
export function validateDemoDay(log: DemoDayLog): RecordDefect[] {
  const out = new Collector();
  const part: RecordPart = "demo-day";
  if (!isDate(log.date)) out.add(part, "date", "date", "blocker", "The demo date is missing or not YYYY-MM-DD.");
  if (!Array.isArray(log.attendees) || log.attendees.length === 0) {
    out.add(part, "attendees", "attendees", "blocker", "List the attendees by role.");
  } else {
    for (const attendee of log.attendees) {
      if (!(ROLES as readonly string[]).includes(attendee.role)) out.add(part, "attendees", "role", "blocker", `"${String(attendee.role)}" is not a role.`);
      if (!Number.isInteger(attendee.count) || attendee.count < 1) out.add(part, "attendees", "count", "serious", `Count for ${attendee.role} must be a whole number of at least 1.`);
    }
    if (!log.attendees.some((attendee) => attendee.role === "human-owner")) {
      out.add(part, "attendees", "human-owner", "blocker", "The human owner makes the Gate 4 decision and must be listed.");
    }
  }
  if (!filled(log.build?.id)) out.add(part, "build.id", "build-id", "blocker", "Record the build identifier demonstrated.");
  if (log.build && (!log.build.unchangedDuringSession || log.build.fallbackUsed) && !filled(log.build.changeNote)) {
    out.add(part, "build.changeNote", "change-note", "blocker", "A changed build or a used fallback needs a note on what failed and what was done.");
  }
  if (log.durationMinutes === null || log.durationMinutes === undefined) {
    out.add(part, "durationMinutes", "duration-unknown", "serious", "Nobody recorded the length, so the 30 ± 2 minute test cannot pass.");
  } else if (log.durationMinutes < 28 || log.durationMinutes > 32) {
    out.add(part, "durationMinutes", "duration-out-of-range", "serious", `${log.durationMinutes} minutes is outside 30 ± 2.`);
  }
  if (!Array.isArray(log.sectionsShown) || log.sectionsShown.length === 0) {
    out.add(part, "sectionsShown", "sections", "blocker", "List the sections shown.");
  }
  for (const statement of HONESTY_STATEMENTS) {
    if (log.honestyStatements?.[statement] !== true) {
      out.add(part, `honestyStatements.${statement}`, "honesty-statement", "blocker", `The ${statement} statement is not recorded as delivered.`);
    }
  }
  out.defects.push(...validateQuestions(log.questions ?? [], part));

  const gate = log.gate4;
  if (!gate) {
    out.add(part, "gate4", "gate4", "blocker", "The Gate 4 decision is missing.");
    return out.defects;
  }
  let worst = 0;
  for (const criterion of GATE4_CRITERIA) {
    const outcome = gate.criteria?.[criterion];
    if (!(GATE4_OUTCOMES as readonly string[]).includes(outcome)) {
      out.add(part, `gate4.criteria.${criterion}`, "gate4-criterion", "blocker", `No outcome for ${criterion}.`);
    } else {
      worst = Math.max(worst, severityRank(outcome));
    }
  }
  if (!(GATE4_OUTCOMES as readonly string[]).includes(gate.decision)) {
    out.add(part, "gate4.decision", "gate4-decision", "blocker", "The decision is continue, fix-and-re-demo, or pause-and-re-plan.");
  } else if (severityRank(gate.decision) < worst) {
    out.add(
      part,
      "gate4.decision",
      "gate4-softer-than-criteria",
      "blocker",
      `The decision ${gate.decision} is softer than a criterion outcome (${GATE4_OUTCOMES[worst]}).`,
    );
  }
  if (gate.criteria?.["build-stability"] === "continue" && log.build?.fallbackUsed && !filled(log.build.changeNote)) {
    out.add(part, "gate4.criteria.build-stability", "gate4-stability", "serious", "The fallback was used, so say how it covered the failure.");
  }
  if (gate.decidedBy !== "human-owner") out.add(part, "gate4.decidedBy", "gate4-owner", "blocker", "The human owner makes the Gate 4 decision.");
  if (!filled(gate.scioAskedNext)) out.add(part, "gate4.scioAskedNext", "gate4-asked", "blocker", "Record what SCIO asked for next, or that SCIO asked for nothing.");
  else out.text(part, "gate4.scioAskedNext", gate.scioAskedNext);
  if (!filled(gate.nextSteps)) out.add(part, "gate4.nextSteps", "gate4-next", "blocker", "Record what the team will do in Days 26 to 90.");
  else out.text(part, "gate4.nextSteps", gate.nextSteps);
  return out.defects;
}

/** Day 25 acceptance test 5. */
export function validateThankYou(note: ThankYouNote, questions: QuestionEntry[]): RecordDefect[] {
  const out = new Collector();
  const part: RecordPart = "thank-you";
  const ref = `note.${note.language}`;
  if (!filled(note.text)) {
    out.add(part, ref, "empty", "blocker", "The note is empty.");
    return out.defects;
  }
  out.text(part, ref, note.text, [...RECORD_RULES, "ai-mention", "commitment"]);
  if (!/\bprototype\b/i.test(note.text)) out.add(part, ref, "prototype-status", "blocker", "The note must say the App is a prototype.");
  const promised = new Set(questions.filter((entry) => entry.followUp?.kind === "promised").map((entry) => entry.id));
  const listed = new Set(note.followUpIds ?? []);
  for (const id of promised) {
    if (!listed.has(id)) out.add(part, ref, "follow-up-omitted", "blocker", `Promised follow-up ${id} is not in the note.`);
  }
  for (const id of listed) {
    if (!promised.has(id)) out.add(part, ref, "unmade-commitment", "blocker", `${id} is listed as a follow-up but nothing was promised for it in the questions log.`);
  }
  if (promised.size === 0 && lintText(note.text, ["commitment"]).length > 0) {
    out.add(part, ref, "unmade-commitment", "blocker", "The note makes a commitment, but the questions log has no promised follow-up.");
  }
  return out.defects;
}

/** Day 26 done criteria. */
export function validateTriage(triage: { date: string; items: TriageItem[] }, questions: QuestionEntry[] = []): RecordDefect[] {
  const out = new Collector();
  const part: RecordPart = "triage";
  if (!isDate(triage.date)) out.add(part, "date", "date", "blocker", "The triage date is missing or not YYYY-MM-DD.");
  const ids = new Set<string>();
  for (const item of triage.items ?? []) {
    const ref = filled(item.id) ? item.id : "item";
    if (ids.has(ref)) out.add(part, ref, "duplicate-id", "blocker", "Triage ids must be unique.");
    ids.add(ref);
    if (!filled(item.summary)) out.add(part, ref, "summary", "blocker", "Each item needs a summary.");
    else out.text(part, ref, item.summary);
    if (!(DISPOSITIONS as readonly string[]).includes(item.disposition)) {
      out.add(part, ref, "disposition", "blocker", "Each item needs a disposition.");
    }
    if (!item.owner || !(OWNER_ROLES as readonly string[]).includes(item.owner)) out.add(part, ref, "owner", "blocker", "Each item needs a team owner role.");
    if (!isDate(item.due)) out.add(part, ref, "due", "blocker", "Each item needs a due date.");
    else if (isDate(triage.date) && item.due < triage.date) out.add(part, ref, "due-before-triage", "serious", "The due date is before the triage date.");
    if (item.disposition === "decline-with-reason" && !filled(item.reason)) {
      out.add(part, ref, "decline-reason", "blocker", "A declined item needs the reason.");
    }
    if (item.disposition === "scio-decision" && item.owner !== "human-owner") {
      out.add(part, ref, "scio-decision-owner", "serious", "SCIO decision questions are raised by the human owner.");
    }
  }
  const covered = new Set((triage.items ?? []).filter((item) => item.origin?.kind === "question").map((item) => item.origin.ref));
  for (const entry of questions) {
    if (entry.followUp?.kind === "promised" && !covered.has(entry.id)) {
      out.add(part, entry.id, "follow-up-untriaged", "blocker", `Promised follow-up ${entry.id} has no triage item.`);
    }
  }
  return out.defects;
}

/** Days 27 and 28 done criteria. */
export function validateDefects(defects: DefectEntry[]): RecordDefect[] {
  const out = new Collector();
  const part: RecordPart = "defects";
  for (const defect of defects) {
    const ref = filled(defect.id) ? defect.id : "defect";
    if (!(SEVERITIES as readonly string[]).includes(defect.severity)) out.add(part, ref, "severity", "blocker", "Severity is blocker, serious, moderate, or minor.");
    if (!filled(defect.summary)) out.add(part, ref, "summary", "blocker", "Each defect needs a summary.");
    if (!filled(defect.foundOnBuild)) out.add(part, ref, "found-on", "blocker", "Record the build the defect was found on.");
    const retest = defect.fix?.retest;
    const fixed = Boolean(defect.fix && retest && retest.result === "pass");
    if (defect.fix) {
      if (!filled(defect.fix.build)) out.add(part, ref, "fix-build", "blocker", "A fix needs the build it shipped in.");
      else if (defect.fix.build === defect.foundOnBuild) out.add(part, ref, "fix-same-build", "blocker", "The fix build must differ from the build the defect was found on.");
      if (!retest) out.add(part, ref, "not-retested", "blocker", "Every fix is re-tested on the new build.");
      else {
        if (retest.build !== defect.fix.build) out.add(part, ref, "retest-wrong-build", "blocker", "The re-test must run on the fix build, not an earlier one.");
        if (!isDate(retest.date)) out.add(part, ref, "retest-date", "serious", "The re-test needs a date.");
        if (!(OWNER_ROLES as readonly string[]).includes(retest.role)) out.add(part, ref, "retest-role", "serious", "Record the role that re-tested.");
      }
    }
    const urgent = defect.severity === "blocker" || defect.severity === "serious";
    if (defect.origin === "demonstration-fallback" && urgent && !fixed) {
      out.add(part, ref, "demonstration-defect-open", "blocker", "Day 27: blockers and serious demonstration defects are fixed and re-tested.");
    }
    if (!fixed && defect.origin !== "demonstration-fallback") {
      if (!defect.plan) out.add(part, ref, "carried-without-plan", "blocker", "Day 28: a carried defect without a passing re-test needs a dated plan.");
      else {
        if (!isDate(defect.plan.due)) out.add(part, ref, "plan-due", "blocker", "The plan needs a due date.");
        if (!(OWNER_ROLES as readonly string[]).includes(defect.plan.owner)) out.add(part, ref, "plan-owner", "blocker", "The plan needs an owner role.");
        if (!filled(defect.plan.note)) out.add(part, ref, "plan-note", "serious", "Say what the plan is.");
      }
    }
  }
  return out.defects;
}

/** Day 28: a run is evidence only for the build it ran on. */
export function validateRegressionRun(run: RegressionRun): RecordDefect[] {
  const out = new Collector();
  const part: RecordPart = "regression";
  const ref = `${run.repository}@${run.buildId || "?"}`;
  if (run.format !== "regression-run-1.0.0") out.add(part, ref, "format", "blocker", "Expected regression-run-1.0.0.");
  if (!filled(run.repository)) out.add(part, ref, "repository", "blocker", "Name the repository.");
  if (!filled(run.buildId) || /^(?:dev|e2e|unidentified|unknown)$|-dirty$/i.test(run.buildId.trim())) {
    out.add(part, ref, "build-unidentified", "blocker", "A run without a reproducible build identifier (not dev, e2e, or a -dirty commit) cannot be gate evidence.");
  }
  if (!isDate(run.ranOn)) out.add(part, ref, "ran-on", "serious", "Record the run date.");
  if (!Array.isArray(run.checks) || run.checks.length === 0) out.add(part, ref, "no-checks", "blocker", "The run has no checks.");
  for (const check of run.checks ?? []) {
    if (check.buildId !== run.buildId) {
      out.add(part, `${ref}:${check.id}`, "evidence-from-other-build", "blocker", `Check ran on ${check.buildId}, not ${run.buildId}. Re-run it.`);
    }
    if (check.status === "not-run" && !filled(check.reason)) {
      out.add(part, `${ref}:${check.id}`, "not-run-without-reason", "blocker", "A check that could not be re-run needs the reason.");
    }
    if (!["pass", "fail", "not-run"].includes(check.status)) out.add(part, `${ref}:${check.id}`, "status", "blocker", "Status is pass, fail, or not-run.");
  }
  return out.defects;
}

/** Day 29 done criteria. */
export function validateAnswers(answers: AnswerDraft[], triage?: { items: TriageItem[] }): RecordDefect[] {
  const out = new Collector();
  const part: RecordPart = "answers";
  const byItem = new Map(answers.map((answer) => [answer.itemId, answer]));
  for (const item of triage?.items ?? []) {
    if (item.disposition === "answer-from-evidence" && !byItem.has(item.id)) {
      out.add(part, item.id, "answer-missing", "blocker", "An evidence-answerable item has no draft.");
    }
  }
  const known = new Set((triage?.items ?? []).map((item) => item.id));
  for (const answer of answers) {
    const ref = answer.itemId || "answer";
    if (triage && !known.has(answer.itemId)) out.add(part, ref, "unknown-item", "serious", "The draft answers no triage item.");
    if (!filled(answer.text?.en)) out.add(part, ref, "text", "blocker", "The draft is empty.");
    else out.text(part, `${ref}.en`, answer.text.en, [...RECORD_RULES, "ai-mention"]);
    if (filled(answer.text?.fr)) out.text(part, `${ref}.fr`, answer.text.fr, [...RECORD_RULES, "ai-mention"]);
    if (!Array.isArray(answer.citations) || answer.citations.length === 0) {
      out.add(part, ref, "no-citation", "blocker", "Cite the build, a seed count, research, the day log, or a regression run.");
    }
    for (const citation of answer.citations ?? []) {
      if (!(CITATION_KINDS as readonly string[]).includes(citation.kind) || !filled(citation.ref)) {
        out.add(part, ref, "citation", "blocker", "Each citation needs a kind and a reference.");
      }
    }
    if (answer.approval === "approved" && answer.approvedBy !== "human-owner") {
      out.add(part, ref, "approval-owner", "blocker", "Only the human owner approves an answer.");
    }
    if (answer.sent && answer.approval !== "approved") {
      out.add(part, ref, "sent-unapproved", "blocker", "An answer was sent without approval.");
    }
  }
  return out.defects;
}

/** Day 30 done criteria. */
export function validateCheckIn(checkIn: CheckIn, triage?: { items: TriageItem[] }): RecordDefect[] {
  const out = new Collector();
  const part: RecordPart = "check-in";
  if (!isDate(checkIn.date)) out.add(part, "date", "date", "blocker", "The check-in date is missing.");
  if (!Array.isArray(checkIn.decisions) || checkIn.decisions.length === 0) {
    out.add(part, "decisions", "no-decisions", "blocker", "Log the decisions, or one decision saying none was made.");
  }
  for (const [index, decision] of (checkIn.decisions ?? []).entries()) {
    const ref = `decision ${index + 1}`;
    if (!filled(decision.text)) out.add(part, ref, "decision-text", "blocker", "The decision is empty.");
    else out.text(part, ref, decision.text);
    if (!(ROLES as readonly string[]).includes(decision.decidedBy)) out.add(part, ref, "decided-by", "blocker", "Record the role that decided.");
  }
  const counts = new Map<string, number>();
  for (const check of checkIn.checks ?? []) {
    counts.set(check.itemId, (counts.get(check.itemId) ?? 0) + 1);
    const ref = check.itemId || "check";
    if (!filled(check.evidenceNeeded)) out.add(part, ref, "evidence-needed", "blocker", "Say what fresh evidence the check needs.");
    if (!isDate(check.openedOn)) out.add(part, ref, "opened-on", "blocker", "Each check is dated.");
    if (!check.owner || !(OWNER_ROLES as readonly string[]).includes(check.owner)) out.add(part, ref, "owner", "blocker", "Each check is owned.");
    if (!isDate(check.due)) out.add(part, ref, "due", "blocker", "Each check has a due date.");
    else if (isDate(check.openedOn) && check.due < check.openedOn) out.add(part, ref, "due-before-opened", "serious", "Due is before the check was opened.");
  }
  for (const item of triage?.items ?? []) {
    if (item.disposition !== "needs-fresh-evidence") continue;
    const count = counts.get(item.id) ?? 0;
    if (count === 0) out.add(part, item.id, "check-missing", "blocker", "An item that needs fresh evidence has no check.");
    if (count > 1) out.add(part, item.id, "check-duplicated", "serious", "Open one check per item.");
  }
  const sample = checkIn.deepSample;
  if (!sample || sample.status === "not-started") {
    out.add(part, "deepSample", "deep-sample-not-started", "blocker", "Day 30: the seed-data deep sample is under way.");
  } else if (sample.status === "filed" && !filled(sample.reportRef)) {
    out.add(part, "deepSample", "deep-sample-ref", "serious", "A filed deep sample needs the report reference.");
  }
  return out.defects;
}

/**
 * Validates the parts a day needs. Day 25 needs the demo-day log and the
 * thank-you note; each later day adds its part.
 */
export function validateRecord(record: FollowUpRecord, throughDay = 30): RecordDefect[] {
  const out: RecordDefect[] = [];
  const need = (day: number, present: unknown, part: RecordPart, what: string) => {
    if (throughDay >= day && !present) out.push({ part, ref: part, rule: "missing-part", severity: "blocker", detail: `Day ${day} needs ${what}.` });
  };
  if (record.format !== "demo-follow-up-1.0.0") {
    out.push({ part: "record", ref: "format", rule: "format", severity: "blocker", detail: "Expected demo-follow-up-1.0.0." });
  }
  need(25, record.demoDay, "demo-day", "the demo-day log");
  need(25, record.thankYou?.length, "thank-you", "the thank-you and follow-up note");
  need(26, record.triage, "triage", "the triage tracker");
  need(27, record.defects, "defects", "the defect list (empty if there were none)");
  need(28, record.regressionRuns?.length, "regression", "a regression run");
  need(29, record.answers, "answers", "the answer pack");
  need(30, record.checkIn, "check-in", "the check-in log");
  const questions = record.demoDay?.questions ?? [];
  if (record.demoDay) out.push(...validateDemoDay(record.demoDay));
  for (const note of record.thankYou ?? []) out.push(...validateThankYou(note, questions));
  if (record.triage) out.push(...validateTriage(record.triage, questions));
  if (record.defects) out.push(...validateDefects(record.defects));
  for (const run of record.regressionRuns ?? []) out.push(...validateRegressionRun(run));
  if (record.answers) out.push(...validateAnswers(record.answers, record.triage));
  if (record.checkIn) out.push(...validateCheckIn(record.checkIn, record.triage));
  return out;
}

const RANK: Record<RecordDefect["severity"], number> = { blocker: 0, serious: 1, review: 2 };

export function sortDefects(defects: RecordDefect[]): RecordDefect[] {
  return [...defects].sort((a, b) => RANK[a.severity] - RANK[b.severity] || a.part.localeCompare(b.part) || a.ref.localeCompare(b.ref));
}

/** Days 27 and 28 list defects in severity order. */
export function defectsBySeverity(defects: DefectEntry[]): DefectEntry[] {
  return [...defects].sort(
    (a, b) => (SEVERITIES as readonly string[]).indexOf(a.severity) - (SEVERITIES as readonly string[]).indexOf(b.severity) || a.id.localeCompare(b.id),
  );
}
