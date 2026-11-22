/**
 * Entry point for "Where records are missing" (`@access/onboarding/file-areas`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export {
  AREA_BYS,
  AREA_CSV_COLUMNS,
  AREA_ORDERS,
  DEFAULT_AREA,
  areaCsv,
  areaOf,
  areaReport,
  countDetail,
  findArea,
  placeGaps,
  shareRecorded,
  type AreaBy,
  type AreaOptions,
  type AreaOrder,
  type AreaReport,
  type AreaRow,
  type DetailCount,
  type PlaceGaps,
} from "./areacover";
export { FILE_AREAS_COPY, areaLinkLabel, areaName, areasFilename, areasText, cellText, fileAreasStrings, hiddenText, placeGapLines, placesTitle, reportSummary, showPlacesLabel } from "./fileareas-copy";
export { mountFileAreas, type FileAreasHandle, type FileAreasOptions } from "./fileareas-mount";
export { readOptions, renderFileAreas, renderPlaces, renderTable, type FileAreasContext } from "./views-fileareas";
