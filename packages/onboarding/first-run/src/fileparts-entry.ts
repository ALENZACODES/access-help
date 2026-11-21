/**
 * Entry point for "Compare parts of a file" (`@access/onboarding/file-parts`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export {
  MAX_PARTS,
  PARTS_CSV_COLUMNS,
  PART_TEXT_MAX,
  checkParts,
  inPart,
  openPlaces,
  partNotesFile,
  partsCsv,
  partsReport,
  postalAreasIn,
  recordedPercent,
  streetsIn,
  summarize,
  writtenStreet,
  type DetailCounts,
  type PartProblem,
  type PartSummary,
  type PartsCheck,
  type PartsReport,
} from "./partsummary";
export {
  FILE_PARTS_COPY,
  countsText,
  detailLine,
  filePartsStrings,
  partCountsLine,
  partFacts,
  partsFilename,
  partsText,
  reportSummary,
  sourcesText,
  topSources,
  yearOldText,
} from "./fileparts-copy";
export { mountFileParts, type FilePartsHandle, type FilePartsOptions } from "./fileparts-mount";
export { PARTS_VIEWS, isPartsView, readBoxes, readView, renderFileParts, type FilePartsContext, type PartsView } from "./views-fileparts";
