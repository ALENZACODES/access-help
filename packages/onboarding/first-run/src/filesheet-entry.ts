/**
 * Entry point for "Make a notes file from your own spreadsheet"
 * (`@access/onboarding/file-sheet`). Like the other file tools, it is loaded
 * with a dynamic import() only when a person opens it, so it adds nothing to
 * the first install.
 */
export {
  APP_COLUMNS,
  DEFAULT_WORDS,
  NO_FIXED,
  RECORD_TARGETS,
  TARGETS,
  guessMapping,
  makeNotes,
  readSheet,
  readWord,
  setupProblems,
  sheetColumnFor,
  sheetNotesFile,
  toAppCsv,
  unmatchedWords,
  wordList,
  type FixedValues,
  type Mapping,
  type SetupError,
  type SetupProblem,
  type Sheet,
  type SheetError,
  type SheetRead,
  type SheetResult,
  type Target,
  type ValueWords,
} from "./filesheet";
export { FILE_SHEET_COPY, fileSheetStrings, sheetFilename } from "./filesheet-copy";
export { SETUP_FORMAT, SETUP_VERSION, applySetup, columnKey, parseSetup, setupFilename, setupToJson, type AppliedSetup, type SavedSetup, type SetupFileError } from "./filesheet-setup";
export { mountFileSheet, type FileSheetHandle, type FileSheetOptions } from "./filesheet-mount";
export { renderFileSheet, sheetProblemsCsv, type FileSheetContext } from "./views-filesheet";
