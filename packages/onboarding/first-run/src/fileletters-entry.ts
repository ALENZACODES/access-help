/**
 * Entry point for "Letters to places" (`@access/onboarding/file-letters`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export {
  CONTACT_MAX,
  LETTERS_CSV_COLUMNS,
  LETTER_LANGUAGES,
  MAX_LETTERS,
  SENDER_MAX,
  asksFor,
  isLetterLanguage,
  letterProblems,
  lettersCsv,
  lettersNotesFile,
  makeLetters,
  oneLine,
  type Ask,
  type AskReason,
  type Letter,
  type LetterLanguage,
  type LetterOptions,
  type LetterProblem,
  type LetterSet,
} from "./letters";
export {
  FOLLOW_UP_DAYS,
  TRACK_PROBLEMS,
  TRACK_REQUIRED,
  dueForFollowUp,
  readTracking,
  rowProblem,
  sortTracking,
  trackTotal,
  type TrackFileError,
  type TrackProblem,
  type TrackResult,
  type TrackRow,
  type Tracking,
  type Waiting,
} from "./lettertrack";
export { FILE_LETTERS_COPY, FRENCH_VERSION, LETTER_TEXT, allLetters, fileLettersStrings, letterText, lettersFilename, setSummary, trackSummary } from "./fileletters-copy";
export { mountFileLetters, type FileLettersHandle, type FileLettersOptions } from "./fileletters-mount";
export { readLetterForm, renderFileLetters, renderTracking, type FileLettersContext, type TrackContext } from "./views-fileletters";
