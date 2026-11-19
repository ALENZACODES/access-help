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
/** Bring in a sheet of your own observations: pure CSV reading, row checks and the plan. */
export {
  MAX_SHEET_ROWS,
  actionLabel as sheetActionLabel,
  missingColumnsText as sheetMissingColumnsText,
  planImport as planSheetImport,
  planSummaryText as sheetPlanSummaryText,
  provenanceLine as sheetProvenanceLine,
  readSheet,
  recordsSheet,
  repeatedColumnsText as sheetRepeatedColumnsText,
  rowIssueText as sheetRowIssueText,
  rowNoteText as sheetRowNoteText,
  sheetFailureText,
  templateFilename as sheetTemplateFilename,
  templateSheet,
  tierNoteText as sheetTierNoteText,
  unkeptColumnsText as sheetUnkeptColumnsText,
} from "../../../../docs/sheet-import/index.js";
export type { ImportPlan as SheetImportPlan, PlanAction as SheetPlanAction } from "../../../../docs/sheet-import/index.js";
/** My notes beside the packs: pure matching and comparison of a person's observations with loaded packs. */
export {
  DEFAULT_RADIUS as COMPARE_DEFAULT_RADIUS,
  OUTCOME_ORDER as COMPARE_OUTCOMES,
  RADIUS_CHOICES as COMPARE_RADIUS_CHOICES,
  compareAll as compareNotes,
  compareCsv as compareNotesCsv,
  compareFilename as compareNotesFilename,
  compareSummaryText as compareNotesSummary,
  compareText as compareNotesText,
  flagTexts as compareFlagTexts,
  matchKindText as compareMatchText,
  outcomeAdvice as compareOutcomeAdvice,
  outcomeLabel as compareOutcomeLabel,
  recordLine as compareRecordLine,
  withOutcome as compareWithOutcome,
} from "../../../../docs/compare-notes/index.js";
export type { CompareReport as CompareNotesReport, Outcome as CompareOutcome } from "../../../../docs/compare-notes/index.js";
/** Places to revisit: pure reasons, list, visiting order and field sheet from the loaded packs. */
export {
  DEFAULT_LIMIT as REVISIT_DEFAULT_LIMIT,
  LIMIT_CHOICES as REVISIT_LIMIT_CHOICES,
  REASONS as REVISIT_REASONS,
  WITHIN_KM_CHOICES as REVISIT_KM_CHOICES,
  buildRevisitList,
  cleanReasons as cleanRevisitReasons,
  coordinatesText as revisitCoordinatesText,
  fieldSheetText as revisitFieldSheet,
  fillInCsv as revisitFillInCsv,
  legText as revisitLegText,
  listSummaryText as revisitSummaryText,
  orderNoteText as revisitOrderNote,
  reasonLabel as revisitReasonLabel,
  reasonText as revisitReasonText,
  recordLine as revisitRecordLine,
  revisitFilename,
  visitOrder as revisitVisitOrder,
} from "../../../../docs/revisit-list/index.js";
export type { Reason as RevisitReason, RevisitList, VisitOrder as RevisitOrder } from "../../../../docs/revisit-list/index.js";
/** My observations: pure search, sort, counts, change preview and a one-visit undo list. */
export {
  SORTS as MINE_SORTS,
  addStep as addMineStep,
  canUndo as canUndoMine,
  changeText as mineChangeText,
  changesObservation as mineChangesObservation,
  cleanSort as cleanMineSort,
  noteChanges as mineNoteChanges,
  noteLine as mineNoteLine,
  notesSummaryLines as mineSummaryLines,
  observationWarning as mineObservationWarning,
  searchNotes as searchMine,
  shownText as mineShownText,
  sortLabel as mineSortLabel,
  sortNotes as sortMine,
  summariseNotes as summariseMine,
  undoLast as undoLastMine,
  undoResultText as mineUndoText,
} from "../../../../docs/my-notes/index.js";
export type { Sort as MineSort, Step as MineStep } from "../../../../docs/my-notes/index.js";
/** Notes saved twice: pure grouping of a person's own observations that may be one place. */
export {
  DEFAULT_DISTANCE as DUPLICATE_DEFAULT_DISTANCE,
  DISTANCE_CHOICES as DUPLICATE_DISTANCE_CHOICES,
  cautionTexts as duplicateCautionTexts,
  groupNotes as groupOwnNotes,
  kindAdvice as duplicateKindAdvice,
  kindLabel as duplicateKindLabel,
  linkText as duplicateLinkText,
  ownNoteLine as duplicateNoteLine,
  planKeep as planKeepOwnNote,
  reportGroups as reportOwnGroups,
  reportSummaryText as duplicateSummaryText,
} from "../../../../docs/own-duplicates/index.js";
export type { DuplicateReport as OwnDuplicateReport, Group as OwnNoteGroup, GroupKind as OwnGroupKind } from "../../../../docs/own-duplicates/index.js";
/** Day log: a person's own observations grouped by the day seen, a month calendar and day notes. Pure. */
export {
  MAX_DAY_NOTE,
  addMonths as addLogMonths,
  buildDayLog,
  calendarCellText as logCalendarCellText,
  cleanDayNotes,
  compareMonths as compareLogMonths,
  countsForMonth as logCountsForMonth,
  dayCountText as logDayCountText,
  dayGroup as logDayGroup,
  dayHeading as logDayHeading,
  dayNoteFor,
  dayReportFilename,
  dayReportText,
  dayStatLines as logDayStatLines,
  daysCsv as logDaysCsv,
  daysCsvFilename as logDaysCsvFilename,
  logNoteLine,
  logTotals,
  monthGrid as logMonthGrid,
  monthKey as logMonthKey,
  monthName as logMonthName,
  noteLength as dayNoteLength,
  parseMonth as parseLogMonth,
  setDayNote,
  totalsLines as logTotalsLines,
  weekdayNames as logWeekdayNames,
} from "../../../../docs/day-log/index.js";
export type { DayGroup as LogDayGroup, DayLog, DayNotes, MonthRef as LogMonthRef } from "../../../../docs/day-log/index.js";
/** Licence guide and sharing plan: what the licences on a set of records ask, credits, notice and a checklist. Pure. */
export { buildLicenceGuide, guideFilename as licenceGuideFilename, guideText as licenceGuideText } from "../../../../docs/licence-guide/index.js";
export type { LicenceFacts as GuideLicenceFacts, LicenceGuide } from "../../../../docs/licence-guide/index.js";
export {
  NOTICE_FORMS as SHARE_NOTICE_FORMS,
  buildSharePlan,
  checklistProgress as shareChecklistProgress,
  creditAskedText as shareCreditAskedText,
  keepTicks as keepShareTicks,
  leftOutLines as shareLeftOutLines,
  noticeFilename as shareNoticeFilename,
  noticeHint as shareNoticeHint,
  partDutyLines as sharePartDutyLines,
  partFileStem as sharePartFileStem,
  partFor as sharePartFor,
  partHeading as sharePartHeading,
  partRecords as sharePartRecords,
  partSourcesText as sharePartSourcesText,
  scopeCountText as shareScopeCountText,
  sharePlanFilename,
  sharePlanText,
  sourceName as shareSourceName,
  sourceRowText as shareSourceRowText,
  sourcesCsv as shareSourcesCsv,
  sourcesCsvFilename as shareSourcesCsvFilename,
  spanText as shareSpanText,
  splitAdvice as shareSplitAdvice,
  splitKindLabel as shareSplitKindLabel,
  statusCountsText as shareStatusCountsText,
  toggleCheck as toggleShareCheck,
} from "../../../../docs/share-plan/index.js";
export type { CheckId as ShareCheckId, CheckItem as ShareCheckItem, NoticeForm as ShareNoticeForm, SharePlan } from "../../../../docs/share-plan/index.js";
