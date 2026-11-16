/**
 * Builds what the review screen shows from the saved observations. Pure: the date and the
 * language come in as arguments. The review lists things to look at. It never changes a status
 * and never claims an observation is right.
 */
import {
  changesetComment,
  handoffText,
  heldBack,
  issueText,
  issuesCsv,
  reviewBatch,
  summaryText,
  tagText,
  STEP_IDS,
  type BatchReview,
  type RecordReview,
  type Severity,
  type StepId,
} from "./docs-bridge.js";
import type { Language, PlaceRecord } from "./types.js";

export interface ReviewRow {
  record: PlaceRecord;
  review: RecordReview;
  leftOut: boolean;
  /** Issue texts grouped by severity, in display order. */
  notes: { severity: Severity; texts: string[] }[];
}

export interface ReviewView {
  batch: BatchReview;
  rows: ReviewRow[];
  /** Records that will go into the draft: not left out and with no item to fix first. */
  included: PlaceRecord[];
  /** Review of the included records alone, so the draft counts only what it contains. */
  includedBatch: BatchReview;
  summary: string;
  comment: string;
  tags: string;
  heldBackSteps: StepId[];
}

const ORDER: readonly Severity[] = ["blocker", "check", "note"];

export function buildReviewView(
  records: readonly PlaceRecord[],
  leftOut: readonly string[],
  today: string,
  language: Language,
): ReviewView {
  const batch = reviewBatch(records, { today });
  const left = new Set(leftOut);
  const rows: ReviewRow[] = records.map((record, index) => {
    const review = batch.records[index] as RecordReview;
    const notes = ORDER.map((severity) => ({
      severity,
      texts: review.issues.filter((issue) => issue.severity === severity).map((issue) => issueText(issue, language)),
    })).filter((group) => group.texts.length > 0);
    return { record, review, leftOut: left.has(record.id), notes };
  });
  const included = rows.filter((row) => !row.leftOut && row.review.canSubmit).map((row) => row.record);
  const includedBatch = reviewBatch(included, { today });
  return {
    batch,
    rows,
    included,
    includedBatch,
    summary: summaryText(batch, language),
    comment: changesetComment(included, language),
    tags: tagText(included, language),
    heldBackSteps: STEP_IDS.filter((id) => heldBack(id, batch)),
  };
}

export type ReviewFileKind = "handoff" | "issues";

export interface ReviewFile {
  filename: string;
  mime: string;
  content: string;
}

export function reviewFile(kind: ReviewFileKind, view: ReviewView, today: string, language: Language): ReviewFile {
  if (kind === "issues") {
    return {
      filename: `observation-review-${today}.csv`,
      mime: "text/csv",
      content: issuesCsv(view.batch, language),
    };
  }
  return {
    filename: `observation-draft-${today}.txt`,
    mime: "text/plain",
    content: handoffText(view.included, view.includedBatch, today, language),
  };
}

/** Number of observations with something to fix first, for a short status line. */
export function blockedIds(view: ReviewView): string[] {
  return view.rows.filter((row) => !row.review.canSubmit).map((row) => row.record.id);
}
