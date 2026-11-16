/**
 * Builds what the submissions screen shows from the saved observations and the person's marks.
 * Pure: the day and the language come in as arguments. The screen records what the person says.
 * It never says a submission was received or accepted.
 */
import {
  entryIssueText,
  followUpText,
  ledgerCsv,
  ledgerEntryFor,
  ledgerFilename,
  ledgerJson,
  ledgerSummaryText,
  nextToSubmit,
  submissionStatusOf,
  summariseLedger,
  type EntryField,
  type EntryIssue,
  type FollowUp,
  type Ledger,
  type LedgerEntry,
  type LedgerSummary,
  type SubmissionStatus,
} from "./docs-bridge.js";
import type { Language, PlaceRecord } from "./types.js";

export interface SubmissionRow {
  record: PlaceRecord;
  entry: LedgerEntry | undefined;
  status: SubmissionStatus;
  followUp: FollowUp | null;
  followUpText: string | null;
}

export interface SubmissionsView {
  rows: SubmissionRow[];
  summary: LedgerSummary;
  summaryText: string;
  /** Observations not yet marked, oldest first. */
  next: PlaceRecord[];
}

export function buildSubmissionsView(records: readonly PlaceRecord[], ledger: Ledger, today: string, language: Language): SubmissionsView {
  const summary = summariseLedger(records, ledger, today);
  const dueById = new Map(summary.followUps.map((item) => [item.recordId, item] as const));
  const rows: SubmissionRow[] = records.map((record) => {
    const entry = ledgerEntryFor(ledger, record.id);
    const followUp = dueById.get(record.id) ?? null;
    return {
      record,
      entry,
      status: submissionStatusOf(entry),
      followUp,
      followUpText: followUp === null ? null : followUpText(followUp, language),
    };
  });
  const nextIds = nextToSubmit(records, ledger, 5).map((r) => r.id);
  const byId = new Map(records.map((r) => [r.id, r] as const));
  return {
    rows,
    summary,
    summaryText: ledgerSummaryText(summary, language),
    next: nextIds.map((id) => byId.get(id)).filter((r): r is PlaceRecord => r !== undefined),
  };
}

/** Issue texts keyed by the field they belong to. */
export function issuesByField(issues: readonly EntryIssue[], language: Language): Partial<Record<EntryField, string>> {
  const out: Partial<Record<EntryField, string>> = {};
  for (const issue of issues) out[issue.field] ??= entryIssueText(issue, language);
  return out;
}

export type SubmissionFileKind = "csv" | "backup";

export interface SubmissionFile {
  filename: string;
  mime: string;
  content: string;
}

export function submissionFile(
  kind: SubmissionFileKind,
  records: readonly PlaceRecord[],
  ledger: Ledger,
  today: string,
  language: Language,
): SubmissionFile {
  return kind === "csv"
    ? { filename: ledgerFilename("csv", today), mime: "text/csv", content: ledgerCsv(records, ledger, language) }
    : { filename: ledgerFilename("json", today), mime: "application/json", content: ledgerJson(ledger) };
}
