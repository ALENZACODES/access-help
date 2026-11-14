import { ROLE_LABELS, type DemoRecord, type Language } from "./types.js";
import { splitTracker, textIssues, validateRecord, type Issue } from "./rules.js";

/**
 * Day 25 thank-you note and the Day 26, 29, and 30 tables.
 * Every line comes from the record. Nothing is added that the record does not hold.
 */

export interface Draft {
  text: string;
  /** False until the record has no issue. The draft is still shown so it can be fixed. */
  ready: boolean;
  issues: Issue[];
}

const COPY = {
  en: {
    subject: "Thank you for the demonstration on {date}",
    opening: "Thank you for taking the time to see the prototype of the App on {date}.",
    build: "We showed build {build}.",
    shown: "Sections shown:",
    honesty:
      "As we said in the session, the App is a prototype for evaluation. No data shown is verified. Any elevator outage shown was demonstration data. The App does not give medical advice. French covers the shell only and is pending review. SCIO has not endorsed the App, and this note does not suggest that it has.",
    asked_one: "We recorded {count} question.",
    asked_other: "We recorded {count} questions.",
    ourFollowUps: "We said we would follow up on:",
    yourFollowUps: "You said you would:",
    noFollowUps: "We did not promise any follow-up in the session.",
    due: "by {due}",
    attendees: "Attendees by role: {roles}.",
    closing: "We will send each follow-up only after it has been checked.",
  },
  fr: {
    subject: "Merci pour la démonstration du {date}",
    opening: "Merci d'avoir pris le temps de voir le prototype de l'application le {date}.",
    build: "Nous avons montré la version {build}.",
    shown: "Sections montrées :",
    honesty:
      "Comme nous l'avons dit pendant la séance, l'application est un prototype à évaluer. Aucune donnée montrée n'est vérifiée. Toute panne d'ascenseur montrée était une donnée de démonstration. L'application ne donne pas de conseil médical. Le français couvre l'interface seulement et attend une révision. SCIO n'a pas appuyé l'application, et cette note ne le laisse pas entendre.",
    asked_one: "Nous avons inscrit {count} question.",
    asked_other: "Nous avons inscrit {count} questions.",
    ourFollowUps: "Nous avons dit que nous ferions un suivi sur :",
    yourFollowUps: "Vous avez dit que vous alliez :",
    noFollowUps: "Nous n'avons promis aucun suivi pendant la séance.",
    due: "d'ici le {due}",
    attendees: "Participants par rôle : {roles}.",
    closing: "Nous enverrons chaque suivi seulement après l'avoir vérifié.",
  },
} as const;

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}

export function thankYouNote(record: DemoRecord, language: Language): Draft {
  const c = COPY[language];
  const kept = record.questions.filter((question) => question.recordingAgreed);
  const promises = kept.flatMap((question) => (question.followUp.kind === "follow-up" ? [question.followUp] : []));
  const ours = promises.filter((item) => item.committedBy === "team");
  const theirs = promises.filter((item) => item.committedBy === "scio" && item.confirmedByOwner);
  const lines: string[] = [
    fill(c.subject, { date: record.date || "—" }),
    "",
    fill(c.opening, { date: record.date || "—" }),
    fill(c.build, { build: record.build || "—" }),
    "",
    c.shown,
    ...record.sectionsShown.filter((section) => section.trim()).map((section) => `- ${section.trim()}`),
    "",
    c.honesty,
    "",
    fill(kept.length === 1 ? c.asked_one : c.asked_other, { count: kept.length }),
  ];
  if (ours.length === 0 && theirs.length === 0) lines.push(c.noFollowUps);
  if (ours.length > 0) lines.push(c.ourFollowUps, ...ours.map((item) => `- ${item.action.trim()} (${fill(c.due, { due: item.due })})`));
  if (theirs.length > 0) lines.push(c.yourFollowUps, ...theirs.map((item) => `- ${item.action.trim()}`));
  lines.push("", fill(c.attendees, { roles: record.roles.map((role) => ROLE_LABELS[role]?.[language] ?? role).join(", ") || "—" }), "", c.closing);
  const text = `${lines.join("\n")}\n`;
  const issues = [...validateRecord(record), ...textIssues(text).map((code) => ({ code, where: "thank-you note", field: "text" }))];
  return { text, ready: issues.length === 0, issues };
}

function cell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

/** Day 26 one-page tracker. SCIO decision questions are a separate table. */
export function trackerMarkdown(record: DemoRecord): string {
  const { team, scioDecisions } = splitTracker(record);
  const questions = new Map(record.questions.map((question) => [question.id, question.question]));
  const table = (rows: typeof team) =>
    rows.length === 0
      ? ["None."]
      : [
          "| Item | Question | Disposition | Owner | Due | Status |",
          "| --- | --- | --- | --- | --- | --- |",
          ...rows.map(
            (item) =>
              `| ${cell(item.id)} | ${cell(questions.get(item.questionId) ?? "missing question")} | ${item.disposition} | ${ROLE_LABELS[item.owner]?.en ?? item.owner} | ${item.due} | ${item.status} |`,
          ),
        ];
  return [
    "# Demo follow-up tracker",
    "",
    `Build ${cell(record.build || "not recorded")}. Demonstration ${record.date || "not recorded"}.`,
    "",
    "## Team items",
    "",
    ...table(team),
    "",
    "## Questions for SCIO to decide",
    "",
    ...table(scioDecisions),
    "",
  ].join("\n");
}

/** Day 29 answer pack. A draft is never shown as sent unless it was approved. */
export function answerPackMarkdown(record: DemoRecord): string {
  const lines = ["# Evidence answer pack", "", "Each answer cites existing evidence. The human owner approves or holds each one.", ""];
  if (record.answers.length === 0) lines.push("No answer has been drafted.");
  for (const answer of record.answers) {
    const reviewed = answer.review.overclaim && answer.review.endorsement && answer.review.health;
    lines.push(
      `## ${cell(answer.id)} (tracker ${cell(answer.trackerId)})`,
      "",
      answer.draft.trim() || "No draft text.",
      "",
      `Evidence: ${answer.evidence.map((item) => `${item.kind} ${item.ref}`).join("; ") || "none"}`,
      `Review for overclaim, endorsement, and health claims: ${reviewed ? "done" : "not done"}`,
      `Decision: ${answer.approval}. Sent: ${answer.sent && answer.approval === "approved" ? "yes" : "no"}.`,
      "",
    );
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

/** Day 30 dated checks and check-in decisions. */
export function checkInMarkdown(record: DemoRecord): string {
  const lines = ["# Checks and check-in decisions", "", "## Dated checks", ""];
  if (record.checks.length === 0) lines.push("No check is open.");
  else {
    lines.push("| Check | Tracker item | Evidence needed | Owner | Opened | Due | Status |", "| --- | --- | --- | --- | --- | --- | --- |");
    for (const check of record.checks) {
      lines.push(
        `| ${cell(check.id)} | ${cell(check.trackerId)} | ${cell(check.evidenceNeeded)} | ${ROLE_LABELS[check.owner]?.en ?? check.owner} | ${check.opened} | ${check.due} | ${check.status} |`,
      );
    }
  }
  lines.push("", "## Check-in decisions", "");
  if (record.checkIns.length === 0) lines.push("No check-in has been held.");
  for (const meeting of record.checkIns) {
    lines.push(`### ${meeting.date}`, "", `Roles: ${meeting.roles.map((role) => ROLE_LABELS[role]?.en ?? role).join(", ")}`, "");
    for (const item of meeting.decisions) lines.push(`- ${item.decision.trim()} (owner: ${ROLE_LABELS[item.owner]?.en ?? item.owner})`);
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}
