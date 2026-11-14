/**
 * Validators for the documents a person writes on Days 19, 23, and 24.
 * They check shape and honesty, not whether the person's verdicts are right.
 *
 * Expected shapes (Markdown):
 *
 * docs/gate-3-log.md (Day 19)
 *   | Criterion | Verdict | Evidence |      Verdict: PASS, FAIL, or CARRIED. One row per D19 criterion id.
 *   Decision: <go, no-go, or go with carried defects>
 *   Reason: <why>
 *   Decision maker: <name>, human owner
 *   | Defect | Reason | Workaround | Fix day |   Required when any verdict is CARRIED.
 *
 * docs/demo-script.md (Day 23)
 *   | Section | Minutes | Fallback | Script |    Minutes add up to 30. Every section has a fallback.
 *
 * docs/rehearsal-log.md (Day 23)
 *   Build: <build identifier>
 *   | Finding | Severity | Script minute | Fix or script change |   Severity: blocker, serious, or minor.
 *
 * docs/presenter-checklist.md (Day 24)
 *   - [x] item ...                            Every item ticked.
 *   Signed: <name>, human owner, YYYY-MM-DD
 *
 * docs/day-24-log.md (Day 24)
 *   Build lock: <build identifier>
 *   Exception process: <who may change the build after the lock, and how it is recorded>
 */
import { blank, checklist, field, findTable } from "./markdown.js";

export interface LogProblem {
  rule: string;
  detail: string;
}

export interface OverclaimRule {
  id: string;
  pattern: RegExp;
}

/** Wording a demo line must not use, on top of the help-article overclaim list. */
export const DEMO_EXTRA_RULES: readonly OverclaimRule[] = [
  { id: "verified-claim", pattern: /(?<!un)(?<!not )\bverified (place|places|data|record|records|accessible|entrance|washroom)\b/i },
  { id: "guarantee", pattern: /(?<!not )(?<!no )\b(guaranteed|always accessible|fully accessible|100% accessible)\b/i },
  { id: "real-time", pattern: /(?<!no )(?<!not )\breal-time\b|(?<!pas )\ben temps réel\b/i },
  { id: "ai-mention", pattern: /\b(AI|A\.I\.|IA|artificial intelligence|intelligence artificielle|machine learning|chatbot|LLM|GPT)\b/ },
  { id: "launch-claim", pattern: /\b(now live|available now|launched|on the app store)\b/i },
];

const SEVERITIES = new Set(["blocker", "serious", "minor"]);
const VERDICTS = new Set(["pass", "fail", "carried"]);
const HUMAN_OWNER = /\bhuman owner\b/i;
const DATE = /\b\d{4}-\d{2}-\d{2}\b/;

function overclaims(text: string, rules: readonly OverclaimRule[]): LogProblem[] {
  const problems: LogProblem[] = [];
  for (const rule of rules) {
    const match = rule.pattern.exec(text);
    if (match) problems.push({ rule: `overclaim:${rule.id}`, detail: `"${match[0]}"` });
  }
  return problems;
}

export function validateGateLog(text: string, criteria: readonly string[], gateDay: number): LogProblem[] {
  const problems: LogProblem[] = [];
  const table = findTable(text, ["criterion", "verdict"]);
  if (!table) return [{ rule: "criteria-table", detail: "No table with Criterion and Verdict columns." }];
  const byId = new Map(table.rows.map((row) => [row.criterion?.split(/\s/)[0] ?? "", row]));
  let carried = 0;
  for (const id of criteria) {
    const row = byId.get(id);
    if (!row) {
      problems.push({ rule: "verdict-missing", detail: `${id} has no row.` });
      continue;
    }
    const verdict = (row.verdict ?? "").toLowerCase();
    if (!VERDICTS.has(verdict)) problems.push({ rule: "verdict-invalid", detail: `${id} verdict "${row.verdict}" is not PASS, FAIL, or CARRIED.` });
    if (verdict === "carried") carried += 1;
  }
  if (blank(field(text, "Decision"))) problems.push({ rule: "decision", detail: "No written decision." });
  if (blank(field(text, "Reason"))) problems.push({ rule: "decision-reason", detail: "The decision has no reason." });
  const maker = field(text, "Decision maker");
  if (blank(maker) || !HUMAN_OWNER.test(maker ?? "")) {
    problems.push({ rule: "decision-maker", detail: "The decision maker must be named as the human owner." });
  }
  if (carried > 0) {
    const defects = findTable(text, ["defect", "reason", "workaround", "fix day"]);
    if (!defects || defects.rows.length < carried) {
      problems.push({ rule: "carried-defects", detail: `${carried} criteria are CARRIED but the defect table lists ${defects?.rows.length ?? 0}.` });
    }
    for (const row of defects?.rows ?? []) {
      const name = row.defect || "(unnamed)";
      for (const column of ["reason", "workaround", "fix day"]) {
        if (blank(row[column])) problems.push({ rule: "carried-defects", detail: `${name} has no ${column}.` });
      }
      const day = Number(/\d+/.exec(row["fix day"] ?? "")?.[0]);
      if (!blank(row["fix day"]) && (!Number.isInteger(day) || day <= gateDay || day > 25)) {
        problems.push({ rule: "fix-day", detail: `${name} fix day "${row["fix day"]}" is not a day after ${gateDay} and by Day 25.` });
      }
    }
  }
  return problems;
}

export function validateDemoScript(text: string, rules: readonly OverclaimRule[], totalMinutes = 30): LogProblem[] {
  const table = findTable(text, ["section", "minutes", "fallback"]);
  if (!table || table.rows.length === 0) return [{ rule: "sections", detail: "No table with Section, Minutes, and Fallback columns." }];
  const problems: LogProblem[] = [];
  let total = 0;
  for (const row of table.rows) {
    const name = row.section || "(unnamed)";
    const minutes = Number(row.minutes);
    if (!Number.isFinite(minutes) || minutes <= 0) problems.push({ rule: "minutes", detail: `${name} minutes "${row.minutes}" is not a positive number.` });
    else total += minutes;
    if (blank(row.fallback)) problems.push({ rule: "fallback", detail: `${name} has no fallback.` });
  }
  if (Math.abs(total - totalMinutes) > 1e-9) problems.push({ rule: "total", detail: `Sections total ${total} minutes, not ${totalMinutes}.` });
  problems.push(...overclaims(text, rules));
  return problems;
}

export function validateRehearsalLog(text: string, totalMinutes = 30): LogProblem[] {
  const problems: LogProblem[] = [];
  if (blank(field(text, "Build"))) problems.push({ rule: "build", detail: "The log does not state the build identifier." });
  const table = findTable(text, ["finding", "severity", "script minute", "fix or script change"]);
  if (!table) return [...problems, { rule: "findings", detail: "No findings table. Write one row per finding, or one row saying there were none." }];
  for (const row of table.rows) {
    const name = row.finding || "(unnamed)";
    if (/^no findings?\b/i.test(name)) continue;
    if (!SEVERITIES.has((row.severity ?? "").toLowerCase())) problems.push({ rule: "severity", detail: `${name} severity "${row.severity}" is not blocker, serious, or minor.` });
    const minute = Number(row["script minute"]);
    if (!Number.isFinite(minute) || minute < 0 || minute > totalMinutes) {
      problems.push({ rule: "minute", detail: `${name} minute "${row["script minute"]}" is not between 0 and ${totalMinutes}.` });
    }
    if (blank(row["fix or script change"])) problems.push({ rule: "fix", detail: `${name} has no fix or script change.` });
  }
  return problems;
}

export function validatePresenterChecklist(text: string): LogProblem[] {
  const items = checklist(text);
  const problems: LogProblem[] = [];
  if (items.length === 0) problems.push({ rule: "items", detail: "No checklist items." });
  for (const item of items.filter((entry) => !entry.done)) problems.push({ rule: "unticked", detail: item.text });
  const signed = field(text, "Signed");
  if (blank(signed) || !HUMAN_OWNER.test(signed ?? "") || !DATE.test(signed ?? "")) {
    problems.push({ rule: "signature", detail: "Signed must name the human owner and a date (YYYY-MM-DD)." });
  }
  return problems;
}

export function validateBuildLock(text: string): LogProblem[] {
  const problems: LogProblem[] = [];
  if (blank(field(text, "Build lock"))) problems.push({ rule: "build-lock", detail: "The day log does not state the locked build." });
  const exception = field(text, "Exception process");
  if (blank(exception) || (exception ?? "").split(/\s+/).length < 6) {
    problems.push({ rule: "exception-process", detail: "The day log does not describe the exception process." });
  }
  return problems;
}
