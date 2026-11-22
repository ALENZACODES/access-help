/**
 * Entry point for "Fill gaps from another file" (`@access/onboarding/file-gaps`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export {
  DEFAULT_FILL,
  FILL_CSV_COLUMNS,
  checkFill,
  fillCopy,
  fillPlan,
  filledCsv,
  filledFile,
  planCounts,
  sinceOk,
  type FillCheck,
  type FillNote,
  type FillOptions,
  type FillPlace,
  type FillPlan,
  type Filled,
} from "./fillgaps";
export { FILE_GAPS_COPY, fileGapsStrings, filledText, noteHeading, recordLines, showNotesLabel, tickedText, gapsFilename, leftOutText, placeDetail, planSummary } from "./filegaps-copy";
export { mountFileGaps, type FileGapsHandle, type FileGapsOptions } from "./filegaps-mount";
export { renderFileGaps, renderPlaceNotes, type FileGapsContext, type GapsOutcome } from "./views-filegaps";
