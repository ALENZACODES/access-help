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

/** Check before you submit: pure checks, tag preview, changeset words and steps. */
export {
  changesetComment,
  changesetSource,
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
