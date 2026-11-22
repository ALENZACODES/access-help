/**
 * Entry point for "Move a note to another place" (`@access/onboarding/file-move`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export {
  MOVE_FOUND_MAX,
  MOVE_PROBLEMS,
  applyMove,
  checkMoves,
  existingPlace,
  findPlaces,
  moveProblems,
  movedFile,
  noteNameOf,
  placeNameOf,
  placeOfNote,
  placesOf,
  recordCount,
  targetName,
  type MoveChange,
  type MoveCheck,
  type MoveProblem,
  type MoveResult,
  type MoveTarget,
  type PlaceName,
} from "./movenote";
export { FILE_MOVE_COPY, changeLine, changesText, fileMoveStrings, moveFilename, noteSummary, type StepProblem } from "./filemove-copy";
export { mountFileMove, type FileMoveHandle, type FileMoveOptions } from "./filemove-mount";
export { renderFileMove, type FileMoveContext } from "./views-filemove";
