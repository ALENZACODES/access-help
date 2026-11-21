/**
 * Entry point for "Find and replace in notes" (`@access/onboarding/file-replace`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export {
  DEFAULT_REPLACE,
  MAX_FIND,
  MAX_REPLACE,
  OPTION_PROBLEMS,
  REPLACE_CSV_COLUMNS,
  REPLACE_FIELDS,
  applyReplace,
  copyPlaces,
  findHits,
  findPattern,
  hitProblem,
  matchesIn,
  optionProblems,
  replaceChanges,
  replaceCsv,
  replaceIn,
  replacedFile,
  type Hit,
  type HitProblem,
  type Match,
  type OptionProblem,
  type ReplaceChange,
  type ReplaceField,
  type ReplaceOptions,
  type ReplaceReport,
  type ReplacedCopy,
} from "./textreplace";
export { FILE_REPLACE_COPY, acceptLabel, changeText, copySummary, fileReplaceStrings, hitHeading, joinsText, placesLine, replaceFilename, replaceSummary, searchText } from "./filereplace-copy";
export { mountFileReplace, type FileReplaceHandle, type FileReplaceOptions } from "./filereplace-mount";
export { markedBefore, problemTarget, readAccepted, readOptions, renderFileReplace, type FileReplaceContext } from "./views-filereplace";
