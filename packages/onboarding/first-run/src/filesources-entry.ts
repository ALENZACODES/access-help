/**
 * Entry point for "Which sources the answers rest on"
 * (`@access/onboarding/file-sources`). Like the other file tools, it is loaded
 * with a dynamic import() only when a person opens it, so it adds nothing to
 * the first install.
 */
export {
  DEFAULT_SOURCES,
  SOURCE_CSV_COLUMNS,
  SOURCE_ORDERS,
  aloneAnswers,
  newestFrom,
  placesOfAnswers,
  sourceCsv,
  sourceOverlap,
  sourceReport,
  sourcesOf,
  type AloneAnswer,
  type DetailUse,
  type Overlap,
  type OverlapRow,
  type SourceOptions,
  type SourceOrder,
  type SourceReport,
  type SourceRow,
} from "./sourcecover";
export { FILE_SOURCES_COPY, aloneLine, aloneTitle, daysText, fileSourcesStrings, overlapLine, overlapSummary, reportSummary, showAloneLabel, sourcesFilename, sourcesText } from "./filesources-copy";
export { mountFileSources, type FileSourcesHandle, type FileSourcesOptions } from "./filesources-mount";
export { readOptions, renderAlone, renderCompare, renderFileSources, renderTable, type FileSourcesContext } from "./views-filesources";
