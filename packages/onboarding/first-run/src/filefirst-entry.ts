/**
 * Entry point for "Choose places to look at first" (`@access/onboarding/file-first`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export {
  DEFAULT_FIRST,
  FIRST_CSV_COLUMNS,
  FIRST_LIMITS,
  FIRST_ORDERS,
  FIRST_VIEWS,
  STREETS_CSV_COLUMNS,
  checkFirstForm,
  firstCsv,
  firstNotesFile,
  formFor,
  inArea,
  newestRecord,
  openCount,
  pickFirst,
  pickStreets,
  placeNeeds,
  rankPlaces,
  rankStreets,
  streetsCsv,
  streetsNotesFile,
  type FirstCheck,
  type FirstField,
  type FirstForm,
  type FirstOptions,
  type FirstOrder,
  type FirstProblem,
  type FirstView,
  type StreetNeeds,
  type StreetRanking,
  type PlaceNeeds,
  type Ranked,
} from "./lookfirst";
export { FILE_FIRST_COPY, fileFirstStrings, firstFilename, rankedSummary, rankingText, reasonLines, streetLine, streetsSummary, streetsText } from "./filefirst-copy";
export { mountFileFirst, type FileFirstHandle, type FileFirstOptions } from "./filefirst-mount";
export { readFirstForm, renderFileFirst, type FileFirstContext } from "./views-filefirst";
