/**
 * Entry point for "Credits for sharing a notes file" (`@access/onboarding/file-credits`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export {
  CREDITS_CSV_COLUMNS,
  RECORDS_CSV_COLUMNS,
  collectCredits,
  creditsCsv,
  excludeLicences,
  excludedFile,
  licencesInFile,
  makeCopy,
  recordsCsv,
  renameSources,
  renamesFor,
  sourceKey,
  sourceVariants,
  type Copy,
  type CreditLicence,
  type CreditSource,
  type Credits,
  type Excluded,
  type SourceVariants,
} from "./credits";
export { FILE_CREDITS_COPY, LICENCE_INFO, creditsFilename, creditsMarkdown, creditsSummary, creditsText, mdEscape, excludedSummary, fileCreditsStrings, licenceSummary } from "./filecredits-copy";
export { mountFileCredits, type FileCreditsHandle, type FileCreditsOptions } from "./filecredits-mount";
export { leaveOutProblem, readLeaveOut, readPicks, renderFileCredits, type FileCreditsContext } from "./views-filecredits";
