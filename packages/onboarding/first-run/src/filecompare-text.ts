import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, groupHeading, t } from "./copy";
import { coverageLabel } from "./coverage";
import { FACT_KEYS } from "./facts";
import { DETAIL_STATUSES, SIDES, placesToShow, type DetailComparison, type FileComparison, type FileSummary, type OnePlace, type Side } from "./filecompare";
import { FILE_COMPARE_COPY as C, answerText, otherAddressText, otherNameText, recordLine, sharedText, sideName, statusText } from "./filecompare-copy";
import type { Observation } from "./places";
import { recordTier, shownSource, tierLabel } from "./tier";
import { reasonText } from "./views-similar";

/**
 * The comparison as plain text, for a download link. It holds the same facts
 * as the page, in the same order: every record keeps its source, licence,
 * date and tier, and a detail with no record in a file says so.
 */

const colon = (l: Locale): string => (l === "fr" ? `${NB}:` : ":");

/** One record in one line, with the tier the App gives every record on a device. */
export function observationLine(o: Observation, l: Locale): string {
  const tier = `${t(COPY.tier.column, l)} ${recordTier(o.provenance)} (${tierLabel(l)})`;
  return recordLine(o.value, shownSource(o.provenance.source, l), o.provenance.licence, o.provenance.recordedOn, tier, l);
}

function summaryLines(side: Side, s: FileSummary, l: Locale): string[] {
  const c = colon(l);
  return [
    `${sideName(side, l)}`,
    `  ${t(C.notesRow, l)}${c} ${s.notes}`,
    `  ${t(C.placesRow, l)}${c} ${s.places}`,
    `  ${t(C.recordsRow, l)}${c} ${s.records}`,
    `  ${t(C.rejectedRow, l)}${c} ${s.rejected}`,
  ];
}

export function detailLines(d: DetailComparison, l: Locale): string[] {
  const c = colon(l);
  const out = [
    `  ${t(COPY.facts[d.key], l)}${c} ${sideName("a", l)} ${answerText(d.a, l)}, ${sideName("b", l)} ${answerText(d.b, l)} (${statusText(d.status, l)})`,
  ];
  for (const side of SIDES) {
    const list = side === "a" ? d.recordsA : d.recordsB;
    if (list.length === 0) out.push(`    ${sideName(side, l)}${c} ${t(C.noRecord, l)}`);
    for (const o of list) out.push(`    ${sideName(side, l)}${c} ${observationLine(o, l)}`);
  }
  if (d.shared > 0) out.push(`    ${sharedText(d.shared, l)}`);
  return out;
}

function onlyLines(list: readonly OnePlace[], l: Locale): string[] {
  if (list.length === 0) return [`- ${t(C.noneOnly, l)}`];
  return list.map((o) => `- ${o.place.name}, ${o.place.address ?? t(COPY.similar.noAddress, l)} (${coverageLabel(o.recorded, FACT_KEYS.length, l)})`);
}

export function comparisonText(c: FileComparison, l: Locale, today: Date): string {
  const k = colon(l);
  const lines: string[] = [t(C.text.heading, l), `${t(C.text.made, l)} ${today.toISOString().slice(0, 10)}`, t(C.text.nothingSaved, l), t(C.notRanked, l), ""];
  lines.push(...summaryLines("a", c.summaryA, l), ...summaryLines("b", c.summaryB, l), "");
  lines.push(`${t(C.totalsCaption, l)}${k}`);
  for (const s of DETAIL_STATUSES) lines.push(`- ${statusText(s, l)}${k} ${c.totals[s]}`);
  lines.push("");
  lines.push(groupHeading(t(C.bothTitle, l), c.both.length));
  if (c.both.length === 0) lines.push(`- ${t(C.noneInBoth, l)}`);
  for (const p of placesToShow(c, false)) {
    lines.push("", `== ${p.nameA}, ${p.addressA ?? t(COPY.similar.noAddress, l)} (${t(p.differs ? C.differsMark : C.sameMark, l)})`);
    if (p.nameB !== p.nameA) lines.push(`  ${otherNameText("b", p.nameB, l)}`);
    if (p.addressB !== p.addressA) lines.push(`  ${otherAddressText("b", p.addressB, l)}`);
    for (const d of p.details) lines.push(...detailLines(d, l));
  }
  lines.push("", groupHeading(t(C.onlyATitle, l), c.onlyA.length), ...onlyLines(c.onlyA, l));
  lines.push("", groupHeading(t(C.onlyBTitle, l), c.onlyB.length), ...onlyLines(c.onlyB, l));
  if (c.maybeSame.length > 0) {
    lines.push("", groupHeading(t(C.maybeSameTitle, l), c.maybeSame.length));
    for (const m of c.maybeSame) {
      lines.push(`- ${sideName("a", l)}${k} ${m.a.name} / ${sideName("b", l)}${k} ${m.b.name}. ${reasonText(m.reason, l)}`);
    }
  }
  return `${lines.join("\n")}\n`;
}
