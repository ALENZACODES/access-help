/**
 * Entry point for "Summarize a notes file" (`@access/onboarding/file-summary`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export { detailRows, differingPlaces, readSummaryFile, summarize, summaryConsistent, type DetailRow, type FileSummary, type SummaryRead } from "./filesummary";
export { FILE_SUMMARY_COPY, fileSummaryStrings, summaryFilename } from "./filesummary-copy";
export { mountFileSummary, type FileSummaryHandle, type FileSummaryOptions } from "./filesummary-mount";
export { renderFileSummary, summaryText, type FileSummaryContext } from "./views-filesummary";
