/**
 * Entry point for "Sort a notes file by street" (`@access/onboarding/file-streets`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export { compareBothSides, compareOnStreet, parseStreet, postalArea, type StreetAddress } from "./streets";
export {
  DEFAULT_LIST_OPTIONS,
  GROUP_BYS,
  LIST_CSV_COLUMNS,
  MAX_PEOPLE,
  batchPlaces,
  batchesComplete,
  differingDetails,
  groupFile,
  hasOpenDetail,
  listsCsv,
  placesExport,
  readStreetFile,
  shareGroups,
  unknownDetails,
  type Batch,
  type GroupBy,
  type Grouped,
  type ListGroup,
  type ListOptions,
  type StreetFile,
  type StreetRead,
} from "./filestreets";
export { FILE_STREETS_COPY, allSheets, fileStreetsStrings, streetsFilename, visitSheet } from "./filestreets-copy";
export { mountFileStreets, type FileStreetsHandle, type FileStreetsOptions } from "./filestreets-mount";
export { peopleFrom, renderFileStreets, type FileStreetsContext } from "./views-filestreets";
