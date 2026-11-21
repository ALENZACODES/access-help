/**
 * Entry point for "Records over time" (`@access/onboarding/file-time`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export {
  MAX_PERIODS,
  TIMELINE_CSV_COLUMNS,
  TIME_STEPS,
  fileTimeline,
  isTimeStep,
  nextPeriod,
  percentRecorded,
  periodOf,
  periodsBetween,
  placesTimeline,
  timelineCsv,
  totalRecords,
  type DetailRow,
  type PeriodRow,
  type TimeStep,
  type Timeline,
} from "./recordtimeline";
export {
  DAY_STATES,
  dayProblem,
  fileOnDay,
  notesOnDay,
  placesOnDay,
  stateOn,
  type DayProblem,
  type DayState,
  type DetailOnDay,
  type FileOnDay,
  type NotesOnDay,
} from "./recordasof";
export { FILE_TIME_COPY, dayFilename, daySummary, fileTimeStrings, percentText, periodText, rowCells, timeFilename, timelineSummary, timelineText } from "./filetime-copy";
export { mountFileTime, type FileTimeHandle, type FileTimeOptions } from "./filetime-mount";
export { readTimeForm, renderDay, renderFileTime, type FileTimeContext, type TimeChoice } from "./views-filetime";
