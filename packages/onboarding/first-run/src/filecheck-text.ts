import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, groupHeading, t } from "./copy";
import { MAX_REPORTED, droppedEntries, fileIsClean, leftOutEntries, noticedEntries, type EntryReport, type FileCheck } from "./filecheck";
import { FILE_CHECK_COPY as C, droppedText, entryLabel, leftOutText, noticeText } from "./filecheck-copy";

/**
 * The check as plain text, for a download link. Same facts and order as the
 * page: totals, entries left out with every reason, answers read as UNKNOWN
 * with what each one lacks, and things to look at.
 */

const colon = (l: Locale): string => (l === "fr" ? `${NB}:` : ":");

/** The rows of the totals table, in order, as [label, count]. */
export function totalsRows(c: FileCheck, l: Locale): Array<[string, number]> {
  return [
    [t(C.rows.entries, l), c.totals.entries],
    [t(C.rows.readable, l), c.totals.readable],
    [t(C.rows.leftOut, l), c.totals.leftOut],
    [t(C.rows.dropped, l), c.totals.dropped],
    [t(C.rows.personal, l), c.totals.personal],
  ];
}

function label(e: EntryReport, l: Locale): string {
  return entryLabel(e.position, e.note?.placeName ?? e.name, e.note?.id ?? e.id, l);
}

/** Lines for one entry with answers read as UNKNOWN: the entry, then one line per answer. */
export function droppedLines(e: EntryReport, l: Locale): string[] {
  return [`- ${label(e, l)}`, ...e.dropped.map((d) => `  ${droppedText(t(COPY.facts[d.key], l), d.value, d.reasons, l)}`)];
}

export function checkText(c: FileCheck, l: Locale, today: Date): string {
  const k = colon(l);
  const lines: string[] = [t(C.text.heading, l), `${t(C.text.made, l)} ${today.toISOString().slice(0, 10)}`, t(C.text.nothingReviewed, l), ""];
  if (c.exportedOn) lines.push(`${t(C.exported, l)} ${c.exportedOn}.`, "");
  for (const [name, n] of totalsRows(c, l)) lines.push(`${name}${k} ${n}`);
  if (fileIsClean(c)) lines.push("", t(C.clean, l));
  const left = leftOutEntries(c);
  lines.push("", groupHeading(t(C.leftOutTitle, l), c.totals.leftOut));
  if (left.length === 0) lines.push(`- ${t(C.none, l)}`);
  for (const e of left) lines.push(`- ${label(e, l)}. ${leftOutText(e.problems, l)}`);
  const dropped = droppedEntries(c);
  lines.push("", groupHeading(t(C.droppedTitle, l), c.totals.dropped), t(C.droppedIntro, l));
  if (dropped.length === 0) lines.push(`- ${t(C.none, l)}`);
  for (const e of dropped) lines.push(...droppedLines(e, l));
  const noticed = noticedEntries(c);
  lines.push("", groupHeading(t(C.noticesTitle, l), noticed.length), t(C.noticesIntro, l));
  if (noticed.length === 0) lines.push(`- ${t(C.none, l)}`);
  for (const e of noticed) {
    lines.push(`- ${label(e, l)}`);
    for (const n of e.notices) lines.push(`  ${noticeText(n, l)}.`);
  }
  if (c.totals.entries > MAX_REPORTED) lines.push("", t(C.moreEntries, l));
  return `${lines.join("\n")}\n`;
}
