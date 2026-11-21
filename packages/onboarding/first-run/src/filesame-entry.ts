/**
 * Entry point for "Places that may be the same" (`@access/onboarding/file-same`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export {
  MATCH_CSV_COLUMNS,
  MAX_GROUPS,
  TYPED,
  fileMatches,
  joinCount,
  joinedCopy,
  joinedFile,
  joinedPlaces,
  joinsTooFew,
  matchCsv,
  matchGroups,
  matchLinks,
  newestRecord,
  recordedCount,
  targetOf,
  typedProblems,
  type JoinChoices,
  type JoinedCopy,
  type LeftOut,
  type MatchGroup,
  type MatchLink,
  type MatchReport,
  type TypedName,
  type TypedNames,
  type TypedProblem,
} from "./placematch";
export { FILE_SAME_COPY, copySummary, fileSameStrings, joinedLine, linkText, matchSummary, placeLabel, sameFilename, sameText, stateText, typedProblemText } from "./filesame-copy";
export { mountFileSame, type FileSameHandle, type FileSameOptions } from "./filesame-mount";
export { readChoices, readLeft, readTyped, renderFileSame, renderRecords, type FileSameContext } from "./views-filesame";
