/**
 * Entry point for "Record what you found on a round" (`@access/onboarding/file-round`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export {
  ANSWERS,
  ROUND_CSV_COLUMNS,
  ROUND_MAX_PLACES,
  SOURCE_MAX,
  beforeValue,
  buildRound,
  changeKind,
  defaultSettings,
  detailsToAsk,
  makeRound,
  roundCounts,
  roundCsv,
  roundNoteId,
  roundOnlyFile,
  roundProblems,
  roundWithFile,
  settingsProblems,
  type Answer,
  type AskFor,
  type Change,
  type ChangeKind,
  type Entries,
  type PlaceEntry,
  type Round,
  type RoundPlace,
  type RoundProblem,
  type RoundResult,
  type RoundSettings,
  type SettingsProblem,
} from "./visitrecord";
export { FILE_ROUND_COPY, fileRoundStrings, resultSummary, roundFilename, roundReport, roundSummary } from "./fileround-copy";
export { mountFileRound, type FileRoundHandle, type FileRoundOptions } from "./fileround-mount";
export { readEntries, readSettings, renderFileRound, type FileRoundContext } from "./views-fileround";
