/**
 * Entry point for "Rename a place" (`@access/onboarding/file-rename`). Like the
 * other file tools, it is loaded with a dynamic import() only when a person
 * opens it, so it adds nothing to the first install.
 */
export {
  RENAME_FOUND_MAX,
  RENAME_PROBLEMS,
  applyRename,
  checkCopy,
  cleanName,
  joinsWith,
  mixedPlaces,
  placeNameOf,
  placesOf,
  renameProblems,
  renamedFile,
  searchPlaces,
  spellingsOf,
  type CopyCheck,
  type PlaceName,
  type RenameChange,
  type RenameProblem,
  type RenameResult,
  type Spelling,
} from "./renameplace";
export { FILE_RENAME_COPY, changeLine, changesText, fileRenameStrings, renameFilename, type EditProblem } from "./filerename-copy";
export { mountFileRename, type FileRenameHandle, type FileRenameOptions } from "./filerename-mount";
export { renderFileRename, type FileRenameContext } from "./views-filerename";
