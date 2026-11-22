/**
 * Entry point for "Remove places from a file" (`@access/onboarding/file-drop`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export {
  FOUND_MAX,
  LIST_MAX,
  REASON_PROBLEMS,
  chosenInOrder,
  findPlaces,
  listLines,
  listTooLong,
  matchList,
  placeMatches,
  readBack,
  reasonProblem,
  removalFiles,
  removePlaces,
  searchWords,
  type FoundPlaces,
  type ListMatch,
  type ReadBack,
  type ReasonProblem,
  type Removal,
} from "./dropplaces";
export { FILE_DROP_COPY, dropFilename, fileDropStrings, foundText, listResultText, removalSummary, removalText, type DropProblem } from "./filedrop-copy";
export { mountFileDrop, type FileDropHandle, type FileDropOptions } from "./filedrop-mount";
export { renderFileDrop, type DropOutcome, type FileDropContext } from "./views-filedrop";
