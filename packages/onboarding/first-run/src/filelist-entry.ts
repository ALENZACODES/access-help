/**
 * Entry point for "Check your list of places against a notes file"
 * (`@access/onboarding/file-list`). Like the other file tools, it is loaded
 * with a dynamic import() only when a person opens it, so it adds nothing to
 * the first install.
 */
export {
  DECISIONS,
  LIST_CHECK_COLUMNS,
  LIST_STATUSES,
  applyDecisions,
  checkList,
  columnsProblems,
  countBy,
  foundFile,
  guessColumns,
  listCheckCsv,
  notInListFile,
  readEntries,
  recordedDetails,
  starterFile,
  starterNotes,
  type ColumnsProblem,
  type Decision,
  type Decisions,
  type EntryMatch,
  type ListCheck,
  type ListColumns,
  type ListEntry,
  type ListRead,
  type ListStatus,
} from "./placelist";
export { FILE_LIST_COPY, checkSummary, checkText, fileListStrings, listFilename, setAsideText } from "./filelist-copy";
export { mountFileList, type FileListHandle, type FileListOptions } from "./filelist-mount";
export { readColumns, readDecisions, renderFileList, type FileListContext } from "./views-filelist";
