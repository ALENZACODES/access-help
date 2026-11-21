/**
 * Entry point for "Check a notes file" (`@access/onboarding/file-check`).
 *
 * Like the file comparison, it is kept out of the package's main entry and the
 * first-run shell, so a host loads it with a dynamic import() only when a
 * person opens it, and it adds nothing to what the App installs on first visit.
 */
export {
  DROP_REASONS,
  ENTRY_PROBLEMS,
  MAX_ENTRIES,
  MAX_REPORTED,
  NOTICES,
  checkFile,
  cleanedCopy,
  dropReasons,
  droppedEntries,
  entryProblems,
  fileIsClean,
  leftOutEntries,
  noticeCounts,
  noticedEntries,
  type DropReason,
  type DroppedDetail,
  type EntryProblem,
  type EntryReport,
  type FileCheck,
  type FileCheckResult,
  type FileCheckTotals,
  type Notice,
} from "./filecheck";
export { FILE_CHECK_COPY, checkFilename, fileCheckStrings } from "./filecheck-copy";
export { checkText } from "./filecheck-text";
export { checkErrorMessage, mountFileCheck, type FileCheckHandle, type FileCheckOptions } from "./filecheck-mount";
export { renderFileCheck, type FileCheckContext } from "./views-filecheck";
