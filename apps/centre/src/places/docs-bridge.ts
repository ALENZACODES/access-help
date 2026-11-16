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
