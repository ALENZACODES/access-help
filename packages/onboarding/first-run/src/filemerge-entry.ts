/**
 * Entry point for "Combine note files" (`@access/onboarding/file-merge`).
 *
 * Like the file comparison and the file check, it is kept out of the package's
 * main entry and the first-run shell: a host loads it with a dynamic import()
 * only when a person opens it, so it adds nothing to the first install.
 */
export {
  CLASH_CHOICES,
  MAX_FILES,
  NO_CHOICES,
  applyChoices,
  clashChoice,
  cleanLabel,
  freshId,
  mergedExport,
  planMerge,
  pruneChoices,
  type Choices,
  type Clash,
  type ClashChoice,
  type Copy,
  type FileProblem,
  type MergeInput,
  type MergePlan,
  type MergeResult,
} from "./filemerge";
export { FILE_MERGE_COPY, fileMergeStrings, mergeFilename } from "./filemerge-copy";
export { mergeText, mergeTotals } from "./filemerge-text";
export { listFile, mountFileMerge, type FileMergeHandle, type FileMergeOptions } from "./filemerge-mount";
export { renderFileMerge, type FileMergeContext, type ListedFile } from "./views-filemerge";
