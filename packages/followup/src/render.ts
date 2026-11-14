import { defectsBySeverity } from "./validate.js";
import {
  GATE4_CRITERIA,
  HONESTY_STATEMENTS,
  type AnswerDraft,
  type CheckIn,
  type DefectEntry,
  type DemoDayLog,
  type QuestionEntry,
  type RecordDefect,
  type RegressionRun,
  type TriageItem,
} from "./types.js";

/** Team records are filed in English. The on-device screen is in English and French. */
function cell(value: unknown): string {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ").trim();
}

function table(head: string[], rows: unknown[][]): string[] {
  return [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`)];
}

export function renderQuestionsLog(questions: QuestionEntry[]): string {
  if (questions.length === 0) return "No questions were recorded.";
  return table(
    ["Id", "Question", "Answer given", "Follow-up", "Owner", "Due"],
    questions.map((entry) => [
      entry.id,
      entry.question,
      entry.answerKind === "deferred" ? `Deferred. ${entry.answerGiven}` : entry.answerGiven,
      entry.followUp.kind === "promised" ? entry.followUp.action : `None. ${entry.followUp.note}`,
      entry.followUp.kind === "promised" ? entry.followUp.owner : "",
      entry.followUp.kind === "promised" ? entry.followUp.due : "",
    ]),
  ).join("\n");
}

export function renderDemoDayLog(log: DemoDayLog): string {
  const out = ["# Demo-day log", ""];
  out.push(`Date: ${log.date}`, "");
  out.push(`Attendees by role: ${log.attendees.map((attendee) => `${attendee.role} (${attendee.count})`).join(", ")}`, "");
  out.push(`Build demonstrated: ${log.build.id}`, "");
  out.push(
    log.build.unchangedDuringSession && !log.build.fallbackUsed
      ? "The build was unchanged during the session. The fallback was not used."
      : `Build change or fallback: ${log.build.changeNote ?? "no note recorded"}`,
    "",
  );
  out.push(`Length: ${log.durationMinutes === null ? "not recorded" : `${log.durationMinutes} minutes`}`, "");
  out.push("## Sections shown", "", ...log.sectionsShown.map((section) => `- ${section}`), "");
  out.push("## Honesty statements", "");
  for (const statement of HONESTY_STATEMENTS) out.push(`- ${statement}: ${log.honestyStatements[statement] ? "delivered" : "**not delivered**"}`);
  out.push("", "## Questions and answers", "", renderQuestionsLog(log.questions), "");
  out.push("## Gate 4", "");
  out.push(...table(["Criterion", "Outcome"], GATE4_CRITERIA.map((criterion) => [criterion, log.gate4.criteria[criterion]])), "");
  out.push(`Decision: **${log.gate4.decision}**, made by the ${log.gate4.decidedBy}.`, "");
  out.push(`What SCIO asked for next: ${log.gate4.scioAskedNext}`, "");
  out.push(`What the team will do in Days 26 to 90: ${log.gate4.nextSteps}`, "");
  return out.join("\n");
}

/** Day 26: the one-page tracker, with SCIO decision questions listed apart. */
export function renderTracker(triage: { date: string; items: TriageItem[] }): string {
  const team = triage.items.filter((item) => item.disposition !== "scio-decision");
  const scio = triage.items.filter((item) => item.disposition === "scio-decision");
  const row = (item: TriageItem) => [item.id, `${item.origin.kind} ${item.origin.ref}`, item.summary, item.disposition, item.owner ?? "not set", item.due ?? "not set"];
  const out = ["# Follow-up tracker", "", `Triaged ${triage.date}.`, "", "## Team items", ""];
  out.push(...(team.length ? table(["Id", "From", "Summary", "Disposition", "Owner", "Due"], team.map(row)) : ["None."]), "");
  out.push("## Questions for SCIO to decide", "");
  out.push(...(scio.length ? table(["Id", "From", "Summary", "Disposition", "Owner", "Due"], scio.map(row)) : ["None."]), "");
  return out.join("\n");
}

export function renderDefects(defects: DefectEntry[]): string {
  if (defects.length === 0) return "No defects recorded.";
  return table(
    ["Id", "Severity", "Origin", "Summary", "Found on", "Fix build", "Re-test", "Plan"],
    defectsBySeverity(defects).map((defect) => [
      defect.id,
      defect.severity,
      defect.origin,
      defect.summary,
      defect.foundOnBuild,
      defect.fix?.build ?? "",
      defect.fix?.retest ? `${defect.fix.retest.result} on ${defect.fix.retest.build}, ${defect.fix.retest.date}` : "not re-tested",
      defect.plan ? `${defect.plan.owner} by ${defect.plan.due}: ${defect.plan.note}` : "",
    ]),
  ).join("\n");
}

/** Day 28: the check-by-check table, one block per run. */
export function renderRegression(runs: RegressionRun[]): string {
  const out = ["# Post-demo regression audit", ""];
  for (const run of runs) {
    const counts = { pass: 0, fail: 0, "not-run": 0 };
    for (const check of run.checks) counts[check.status] += 1;
    out.push(`## ${run.repository}, build ${run.buildId}, ${run.ranOn}`, "");
    out.push(`${counts.pass} passed, ${counts.fail} failed, ${counts["not-run"]} not run.`, "");
    out.push(...table(["Check", "Gate", "Title", "Status", "Build", "Reason"], run.checks.map((check) => [check.id, check.gate, check.title, check.status, check.buildId, check.reason ?? ""])), "");
  }
  return out.join("\n");
}

export function renderAnswerPack(answers: AnswerDraft[]): string {
  const out = ["# Answer pack", "", "Nothing here is sent until the human owner approves it.", ""];
  for (const answer of answers) {
    out.push(`## ${answer.itemId}: ${answer.approval}${answer.sent ? ", sent" : ", not sent"}`, "", answer.text.en, "");
    if (answer.text.fr) out.push(answer.text.fr, "");
    out.push("Evidence:", "", ...answer.citations.map((citation) => `- ${citation.kind}: ${citation.ref}`), "");
  }
  return out.join("\n");
}

export function renderCheckIn(checkIn: CheckIn): string {
  const out = ["# Check-in decision log", "", `Held ${checkIn.date}.`, "", "## Decisions", ""];
  out.push(...checkIn.decisions.map((decision) => `- ${decision.text} (decided by ${decision.decidedBy})`), "");
  out.push("## Checks needing fresh evidence", "");
  out.push(
    ...(checkIn.checks.length
      ? table(["Item", "Evidence needed", "Opened", "Owner", "Due"], checkIn.checks.map((check) => [check.itemId, check.evidenceNeeded, check.openedOn, check.owner ?? "not set", check.due ?? "not set"]))
      : ["None."]),
    "",
  );
  out.push(`Seed-data deep sample: ${checkIn.deepSample.status}${checkIn.deepSample.reportRef ? ` (${checkIn.deepSample.reportRef})` : ""}.`, "");
  return out.join("\n");
}

export function renderDefectList(defects: RecordDefect[]): string {
  if (defects.length === 0) return "No record defects.";
  return table(
    ["Severity", "Part", "Ref", "Rule", "Detail"],
    defects.map((defect) => [defect.severity, defect.part, defect.ref, defect.rule, defect.detail]),
  ).join("\n");
}
