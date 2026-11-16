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
