/**
 * Entry point for "Answers by place, in a table" (`@access/onboarding/file-grid`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export {
  DEFAULT_GRID,
  GRID_CSV_COLUMNS,
  GRID_ORDERS,
  PAGE_SIZE,
  SHOWN,
  cellOf,
  csvWord,
  gridCsv,
  gridRows,
  matchesText,
  parsePage,
  pageOf,
  rowNewest,
  rowOf,
  shownCounts,
  unknownIn,
  type Cell,
  type GridFilter,
  type GridOrder,
  type GridRow,
  type Page,
  type Shown,
} from "./answergrid";
export { FILE_GRID_COPY, badPageText, breakdownText, captionText, cellText, fileGridStrings, gridFilename, gridText, matchText, tickLabel, tickedDownloadText, pageText, shownText } from "./filegrid-copy";
export { mountFileGrid, type FileGridHandle, type FileGridOptions } from "./filegrid-mount";
export { readFilter, renderBreakdown, renderFileGrid, renderTicked, renderTable, type FileGridContext } from "./views-filegrid";
