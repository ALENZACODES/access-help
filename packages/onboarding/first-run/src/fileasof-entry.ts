/**
 * Entry point for "A notes file as it was on a day" (`@access/onboarding/file-asof`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export {
  ASOF_CSV_COLUMNS,
  QUICK_DAYS,
  quickDay,
  CHANGES_CSV_COLUMNS,
  changesCsv,
  answeredCount,
  compare,
  comparisonCsv,
  countsFor,
  dayProblem,
  reading,
  snapshot,
  snapshotFile,
  sourcesSince,
  toProblem,
  type Comparison,
  type Counts,
  type QuickDay,
  type DayProblem,
  type DetailChange,
  type Reading,
  type ReadingChange,
  type Snapshot,
  type SourceSince,
  type ToProblem,
} from "./asof";
export { FILE_ASOF_COPY, asofFilename, changeText, comparisonText, countsText, changedLine, detailLine, fileAsofStrings, nowLabel, readingText, snapshotSummary, sourceSinceLine } from "./fileasof-copy";
export { mountFileAsof, type FileAsofHandle, type FileAsofOptions } from "./fileasof-mount";
export { renderFileAsof, renderTable, type FileAsofContext } from "./views-fileasof";
