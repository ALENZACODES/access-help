/**
 * Builds what the check screen shows from the saved observations. Pure: the day and the
 * language come in as arguments. It reports slips and never says a record is correct.
 */
import {
  changesetComment,
  changesetSource,
  presubmitCheckAll,
  presubmitFindingText,
  presubmitLicenceLine,
  presubmitReportCsv,
  presubmitReportFilename,
  presubmitReportText,
  presubmitSeverityLabel,
  presubmitSteps,
  presubmitSummaryText,
  presubmitTagBlock,
  presubmitTidyChanges,
  type PresubmitReport,
  type PresubmitStep,
  type PresubmitTidy,
} from "./docs-bridge.js";
import type { Language, PlaceRecord } from "./types.js";

export interface PresubmitRow {
  record: PlaceRecord;
  group: "fix" | "look" | "note" | "clear";
  groupLabel: string;
  findings: string[];
  tagBlock: string;
  tidy: PresubmitTidy[];
}

export interface PresubmitView {
  report: PresubmitReport;
  summaryText: string;
  licenceLines: string[];
  comment: string;
  source: string;
  steps: PresubmitStep[];
  rows: PresubmitRow[];
}

export function buildPresubmitView(records: readonly PlaceRecord[], today: string, language: Language): PresubmitView {
  const report = presubmitCheckAll(records, today);
  const rows: PresubmitRow[] = report.items.map((item) => ({
    record: item.record as PlaceRecord,
    group: item.worst,
    groupLabel: presubmitSeverityLabel(item.worst, language),
    findings: item.findings.map((finding) => presubmitFindingText(finding, language)),
    tagBlock: presubmitTagBlock(item.record),
    tidy: presubmitTidyChanges(item.record),
  }));
  return {
    report,
    summaryText: presubmitSummaryText(report.counts, language),
    licenceLines: report.byLicence.map((entry) => presubmitLicenceLine(entry.licence, entry.count, language)),
    comment: changesetComment(records, language),
    source: changesetSource(records, language),
    steps: presubmitSteps(language),
    rows,
  };
}

/** Rows to show: all of them, or only the ones with something to fix or look at. */
export function visibleRows(rows: readonly PresubmitRow[], onlyOpen: boolean): PresubmitRow[] {
  return onlyOpen ? rows.filter((row) => row.group === "fix" || row.group === "look") : [...rows];
}

export type PresubmitFileKind = "txt" | "csv";

export interface PresubmitFile {
  filename: string;
  mime: string;
  content: string;
}

export function presubmitFile(kind: PresubmitFileKind, report: PresubmitReport, today: string, language: Language): PresubmitFile {
  return kind === "csv"
    ? { filename: presubmitReportFilename("csv", today), mime: "text/csv", content: presubmitReportCsv(report, language) }
    : { filename: presubmitReportFilename("txt", today), mime: "text/plain", content: presubmitReportText(report, today, language) };
}
