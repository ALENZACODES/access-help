/**
 * Entry point for "Details with one report" (`@access/onboarding/file-single`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export {
  BACKINGS,
  DIFFER_CSV_COLUMNS,
  SINGLE_CSV_COLUMNS,
  SINGLE_MODES,
  backedDetails,
  backingOf,
  chosenKeys,
  differCsv,
  differNotesFile,
  differPlaces,
  hasDifferences,
  distinctSources,
  fileSingle,
  isListed,
  isSingleMode,
  placesSingle,
  singleCsv,
  singleNotesFile,
  sourcePairs,
  type BackedDetail,
  type PairDifference,
  type Backing,
  type SingleMode,
  type SinglePlace,
  type SingleReport,
  type SourceAlone,
  type SourcePair,
} from "./corroboration";
export { FILE_SINGLE_COPY, detailText, differHeading, differenceText, keysText, pairLine, sourceLine, fileSingleStrings, singleFilename, singleSummary, singleText } from "./filesingle-copy";
export { mountFileSingle, type FileSingleHandle, type FileSingleOptions } from "./filesingle-mount";
export { START_CHOICE, readSingleForm, renderFileSingle, type FileSingleContext, type SingleChoice } from "./views-filesingle";
