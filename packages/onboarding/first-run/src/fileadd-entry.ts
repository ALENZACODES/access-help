/**
 * Entry point for "Add one record to many places" (`@access/onboarding/file-add`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export {
  ADDED_CSV_COLUMNS,
  ADD_PROBLEMS,
  EMPTY_ADD,
  addProblems,
  addedCsv,
  addedFile,
  applyAdds,
  hasNoRecord,
  matchingPlaces,
  newIds,
  planAdds,
  sourceOf,
  type AddOptions,
  type AddProblem,
  type AddedCopy,
  type AddedNote,
  type Outcome,
  type PlannedAdd,
  type Who,
} from "./bulkadd";
export { FILE_ADD_COPY, addFilename, copySummary, fileAddStrings, listSummary, plannedText, readingText, recordText } from "./fileadd-copy";
export { mountFileAdd, type FileAddHandle, type FileAddOptions } from "./fileadd-mount";
export { problemTarget, readRecord, readTicked, renderFileAdd, type FileAddContext } from "./views-fileadd";
