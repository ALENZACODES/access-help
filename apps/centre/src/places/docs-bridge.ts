/**
 * Single place where the App imports the docs tooling (mapping-day export,
 * offline pack builder, data-status explainer). Everything here is pure and
 * makes no network request.
 */
export {
  OPEN_LICENCES,
  buildExport,
  normalizeWheelchair,
  toGeoJson,
  toOsmChange,
  buildPackManifest,
  serializePack,
  packAttribution,
  explainRecord,
  freshness,
} from "../../../../docs/index.js";
export type {
  Contribution,
  ExportRecord,
  Freshness,
  PackManifest,
  Wheelchair,
} from "../../../../docs/index.js";
export * from "../../../../docs/mapping-day/index-day.js";

/** Submit-review tooling: pure checks, tag drafts and handoff text for a person's own submission. */
export {
  STEP_IDS,
  SEVERITY_LABEL,
  allLicenceNotes,
  changesetComment,
  cleanTicks as cleanReviewTicks,
  handoffText,
  heldBack,
  issueText,
  issuesCsv,
  nextStep,
  progressText as reviewProgressText,
  reviewBatch,
  setTick as setReviewTick,
  stepsFor,
  summaryText,
  tagText,
} from "../../../../docs/submit-review/index.js";
export type {
  BatchReview,
  Issue,
  RecordReview,
  Severity,
  StepId,
  Ticks as ReviewTicks,
} from "../../../../docs/submit-review/index.js";

/** Submissions ledger: a person's own list of what they say they submitted. Pure. */
export {
  LOOK_AGAIN_AFTER_DAYS,
  MAX_NOTE,
  emptyLedger,
  entryFor as ledgerEntryFor,
  entryIssueText,
  followUpText,
  ledgerCsv,
  ledgerFilename,
  ledgerJson,
  ledgerSummaryText,
  markSubmitted,
  mergeRestored,
  nextToSubmit,
  parseLedgerBackup,
  pruneLedger,
  readLedger,
  recordLookedAgain,
  restoreFailureText,
  restoreSummaryText,
  statusOf as submissionStatusOf,
  statusText as submissionStatusText,
  summarise as summariseLedger,
  unmark as unmarkSubmitted,
} from "../../../../docs/submissions/index.js";
export type {
  EntryField,
  EntryIssue,
  FollowUp,
  Ledger,
  LedgerEntry,
  SubmissionStatus,
  SubmitInput,
  Summary as LedgerSummary,
} from "../../../../docs/submissions/index.js";
/** Check before you submit: pure checks, tag preview, changeset words and steps. */
export {
  changesetComment as presubmitChangesetComment,
  changesetSource as presubmitChangesetSource,
  checkAll as presubmitCheckAll,
  findingText as presubmitFindingText,
  licenceLine as presubmitLicenceLine,
  reportCsv as presubmitReportCsv,
  reportFilename as presubmitReportFilename,
  reportText as presubmitReportText,
  severityLabel as presubmitSeverityLabel,
  submissionSteps as presubmitSteps,
  summaryText as presubmitSummaryText,
  tagBlock as presubmitTagBlock,
  tidyChanges as presubmitTidyChanges,
  tidyRecord as presubmitTidyRecord,
} from "../../../../docs/presubmit/index.js";
export type {
  CheckedItem as PresubmitItem,
  CheckReport as PresubmitReport,
  Step as PresubmitStep,
  TidyChange as PresubmitTidy,
} from "../../../../docs/presubmit/index.js";
