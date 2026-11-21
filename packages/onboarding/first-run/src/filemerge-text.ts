import type { Locale } from "../../switch-first/src/index";
import { NB, groupHeading, t } from "./copy";
import { clashChoice, type Choices, type MergePlan, type MergeResult } from "./filemerge";
import { FILE_MERGE_COPY as C, choiceText, clashLegend, copyText, fileName, fileProblemText, fileSummaryText, renamedText } from "./filemerge-copy";

/**
 * What was combined, as plain text: the files, the counts, each clash with the
 * version kept, each copy and whether it was left out, and new ids.
 */

const colon = (l: Locale): string => (l === "fr" ? `${NB}:` : ":");

/** The totals rows, in order, as [label, count]. */
export function mergeTotals(plan: MergePlan, result: MergeResult, l: Locale): Array<[string, number]> {
  const read = plan.files.reduce((n, f) => n + f.notes.length, 0);
  const leftOut = plan.files.reduce((n, f) => n + f.leftOut, 0);
  return [
    [t(C.rows.read, l), read],
    [t(C.rows.leftOut, l), leftOut],
    [t(C.rows.sameAgain, l), plan.sameAgain],
    [t(C.rows.clashes, l), plan.clashes.length],
    [t(C.rows.copies, l), plan.copies.length],
    [t(C.rows.result, l), result.notes.length],
  ];
}

export function mergeText(plan: MergePlan, choices: Choices, result: MergeResult, l: Locale, today: Date): string {
  const k = colon(l);
  const lines: string[] = [t(C.text.heading, l), `${t(C.text.made, l)} ${today.toISOString().slice(0, 10)}`, t(C.text.nothingReviewed, l), ""];
  lines.push(`${t(C.text.files, l)}${k}`);
  for (const f of plan.files) lines.push(`- ${fileName(f.index, f.label, l)}${k} ${fileSummaryText(f.notes.length, f.leftOut, l)}`);
  for (const p of plan.problems) lines.push(`- ${fileProblemText(p.index, p.label, p.error, l)}`);
  lines.push("");
  for (const [name, n] of mergeTotals(plan, result, l)) lines.push(`${name}${k} ${n}`);
  if (result.overDeviceLimit) lines.push("", t(C.overLimit, l));
  if (plan.clashes.length > 0) {
    lines.push("", groupHeading(t(C.clashesTitle, l), plan.clashes.length));
    for (const c of plan.clashes) {
      lines.push(`- ${clashLegend(c.first.note.placeName, c.id, c.first.file, c.later.file, l)}. ${choiceText(clashChoice(choices, c.key), l)}.`);
    }
  }
  if (plan.copies.length > 0) {
    const dropped = new Set(choices.dropCopies);
    lines.push("", groupHeading(t(C.copiesTitle, l), plan.copies.length));
    for (const c of plan.copies) {
      lines.push(`- ${copyText(c.copy.note.id, c.kept.note.placeName, c.kept.note.id, c.kept.file, l)}${dropped.has(c.key) ? ` ${t(C.dropCopy, l)}.` : ""}`);
    }
  }
  if (result.renamed.length > 0) {
    lines.push("", `${t(C.text.renamed, l)}${k}`);
    for (const [from, to] of result.renamed) lines.push(`- ${renamedText(from, to, l)}`);
  }
  return `${lines.join("\n")}\n`;
}
