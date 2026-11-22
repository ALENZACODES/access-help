/**
 * Entry point for "Remove repeated notes" (`@access/onboarding/file-repeats`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export {
  DEFAULT_REPEATS,
  REPEAT_CSV_COLUMNS,
  checkRepeats,
  contentKey,
  findRepeats,
  groupId,
  isWithin,
  removeRepeats,
  repeatCount,
  repeatFiles,
  repeatsCsv,
  sortGroups,
  type RepeatCheck,
  type RepeatGroup,
  type RepeatOptions,
  type RepeatRemoval,
} from "./repeatnotes";
export { FILE_REPEAT_COPY, fileRepeatStrings, foundSummary, groupDetail, groupLabel, noteHeading, recordLines, showNotesLabel, removalSummary, repeatFilename, repeatsText } from "./filerepeat-copy";
export { mountFileRepeat, type FileRepeatHandle, type FileRepeatOptions } from "./filerepeat-mount";
export { renderFileRepeat, type FileRepeatContext, type RepeatOutcome } from "./views-filerepeat";
