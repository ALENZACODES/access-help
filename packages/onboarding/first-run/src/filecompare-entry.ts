/**
 * Entry point for "Compare two note files" (`@access/onboarding/file-compare`).
 *
 * It is kept out of the package's main entry and out of the first-run shell on
 * purpose: a host loads it with a dynamic import() only when a person opens the
 * comparison, so it adds nothing to what the App installs on first visit.
 */
export {
  DETAIL_STATUSES,
  MAX_MAYBE_SAME,
  SIDES,
  compareFiles,
  compareNotes,
  comparePlace,
  detailStatus,
  filesAgree,
  placesToShow,
  sharedRecords,
  sideAnswer,
  type CompareResult,
  type DetailComparison,
  type DetailStatus,
  type FileComparison,
  type FileError,
  type FileErrorCode,
  type FileSummary,
  type MaybeSame,
  type OnePlace,
  type PlaceComparison,
  type Side,
  type SideAnswer,
} from "./filecompare";
export { FILE_COMPARE_COPY, compareFilename, fileCompareStrings, fileErrorText } from "./filecompare-copy";
export { comparisonText } from "./filecompare-text";
export { MAX_FILE_BYTES, firstErrorText, mountFileCompare, readFileText, type FileCompareHandle, type FileCompareOptions, type FileReaderFn } from "./filecompare-mount";
export { renderFileCompare, type FileCompareContext } from "./views-filecompare";
