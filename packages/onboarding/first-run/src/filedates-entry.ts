/**
 * Entry point for "Fix record dates" (`@access/onboarding/file-dates`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export {
  DATES_CSV_COLUMNS,
  KEEP,
  SLIP_KINDS,
  applyDates,
  bySource,
  commonSlip,
  copyChanges,
  dateProblem,
  datesCsv,
  fixedFile,
  futureRecords,
  recordId,
  suggestDates,
  type DateChange,
  type DateChoice,
  type DateProblem,
  type DateSuggestion,
  type DatesReport,
  type FixedCopy,
  type FutureRecord,
  type SlipKind,
  type SourceDates,
} from "./recorddates";
export { FILE_DATES_COPY, changeText, copySummary, datesFilename, datesSummary, datesText, fileDatesStrings, sourceLine, recordText, suggestionLabel } from "./filedates-copy";
export { mountFileDates, type FileDatesHandle, type FileDatesOptions } from "./filedates-mount";
export { choiceOf, readPicks, renderFileDates, type DatePick, type FileDatesContext } from "./views-filedates";
