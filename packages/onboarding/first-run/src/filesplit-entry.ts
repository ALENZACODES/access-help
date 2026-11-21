/**
 * Entry point for "Split a notes file" (`@access/onboarding/file-split`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export {
  ANSWER_FILTERS,
  NO_FILTERS,
  NO_PICKS,
  detailCounts,
  filterErrors,
  matches,
  noFilterSet,
  partExport,
  prunePicks,
  readSplitFile,
  searchWords,
  splitNotes,
  togglePick,
  type AnswerFilter,
  type FilterError,
  type HandPicks,
  type Split,
  type SplitFile,
  type SplitFilters,
  type SplitRead,
} from "./filesplit";
export { FILE_SPLIT_COPY, fileSplitStrings, splitFilename } from "./filesplit-copy";
export { mountFileSplit, type FileSplitHandle, type FileSplitOptions } from "./filesplit-mount";
export { renderFileSplit, type FileSplitContext } from "./views-filesplit";
