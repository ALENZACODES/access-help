export * from "./paths.js";

export {
  initialState,
  reduce,
  visibleSteps,
  renderStep,
  attachRovingFocus,
  SCAN_INTERVALS_MS,
  COPY as SWITCH_FIRST_COPY,
  COPY_META as SWITCH_FIRST_META,
  secondsLabel,
} from "../switch-first/src/index.js";
export type {
  FirstRunState,
  FirstRunAction,
  MoveMode,
  StepId,
  ScanMs,
} from "../switch-first/src/index.js";

export {
  mountShell,
  COPY as FIRST_RUN_COPY,
  COPY_META as FIRST_RUN_META,
} from "../first-run/src/index.js";
export type { ShellHandle, ShellOptions, View as FirstRunView } from "../first-run/src/index.js";

export { mountStatementReader } from "../first-run/src/statement-mount.js";
export type { StatementHandle, StatementOptions } from "../first-run/src/statement-mount.js";
export {
  readStatement,
  readSentence,
  splitSentences,
  cueCounts,
  emptyStatementForm,
  validateStatement,
  statementNote,
  CUES,
} from "../first-run/src/statement.js";
export type { Cue, Finding, Mention, StatementForm, StatementError } from "../first-run/src/statement.js";
export { STATEMENT_COPY, CUE_COPY, statementStrings } from "../first-run/src/statement-copy.js";
export { renderStatement } from "../first-run/src/views-statement.js";
export type { StatementContext } from "../first-run/src/views-statement.js";
export { CHECK_COPY, knownPlace, notesSay, statementText, checkStrings } from "../first-run/src/statement-check.js";
export type { NotesSay } from "../first-run/src/statement-check.js";
export { ASK_COPY, LETTER, buildLetter, defaultAskKeys, toggleAskKey, mailtoHref, parseMailto, letterText, askStrings } from "../first-run/src/askplace.js";
export type { Letter } from "../first-run/src/askplace.js";
export { renderAskPlace } from "../first-run/src/views-ask.js";
export type { AskContext } from "../first-run/src/views-ask.js";
export { ASKED_COPY, WAY_COPY, ASK_WAYS, recordAsk, markReplied, markNoReply, markWaiting, removeAsk, splitAsked, loadAsked, saveAsked, parseAsked, askedStrings } from "../first-run/src/asked.js";
export type { AskRecord, AskWay, AskState } from "../first-run/src/asked.js";
export { renderAsked } from "../first-run/src/views-asked.js";
export { BIN_COPY, BIN_DAYS, addToBin, restoreFromBin, deleteFromBin, expireBin, loadBin, saveBin, parseBin, binStrings } from "../first-run/src/bin.js";
export type { BinEntry, RestoreResult } from "../first-run/src/bin.js";
export { renderBin } from "../first-run/src/views-bin.js";
export { EDIT_COPY, editable, formFromNote, correctNote, diffNotes, logCorrection, loadCorrections, saveCorrections, editStrings } from "../first-run/src/noteedit.js";
export type { Correction, NoteChange, Editable } from "../first-run/src/noteedit.js";
export { CSV_COLUMNS, CSV_COPY, notesToCsv, notesToRows, guardCell, csvField, csvFilename } from "../first-run/src/notes-csv.js";
export { MOVE_COPY, DEVICE_FORMAT, PARTS, exportDevice, importDevice, mergeDevice, partCount, moveStrings } from "../first-run/src/devicefile.js";
export type { DeviceData, Part, PartPlan, DeviceError } from "../first-run/src/devicefile.js";
export { renderMove } from "../first-run/src/views-move.js";
export { SHARE_COPY, sharedNotes, shareText, filterNotes, shareStrings } from "../first-run/src/share.js";
export { renderShare } from "../first-run/src/views-share.js";
export { CARD_COPY, cardHtml, cardsHtml, cardsDocument, cardsFilename, cardNeedsLines, cardStrings } from "../first-run/src/placecard.js";
export { renderCards } from "../first-run/src/views-cards.js";
export type { CardsContext } from "../first-run/src/views-cards.js";
export {
  PASSPORT_COPY,
  PASSPORT_ERRORS,
  emptyPassport,
  loadPassport,
  savePassport,
  parsePassport,
  validatePassport,
  passportLines,
  passportHtml,
  passportText,
  passportStrings,
} from "../first-run/src/passport.js";
export type { Passport, PassportError, DeviceKind } from "../first-run/src/passport.js";
export { renderPassport } from "../first-run/src/views-passport.js";
export type { PassportContext } from "../first-run/src/views-passport.js";
export { SHOW_COPY, DEFAULT_SHOW, showHtml, bilingualText, showStrings } from "../first-run/src/showcard.js";
export type { ShowOptions, ShowSize } from "../first-run/src/showcard.js";
export { renderShowCard } from "../first-run/src/views-showcard.js";
export type { ShowCardContext } from "../first-run/src/views-showcard.js";
export {
  VISIT_COPY,
  VISIT_ERRORS,
  emptyVisitDraft,
  validateVisit,
  makeVisit,
  compareVisit,
  formFromVisit,
  loadVisits,
  saveVisits,
  parseVisits,
  visitsText,
  visitStrings,
} from "../first-run/src/visits.js";
export type { Visit, VisitDraft, VisitError, VisitVerdict } from "../first-run/src/visits.js";
export { renderVisits, renderVisitForm, renderPlaceVisits } from "../first-run/src/views-visits.js";
export type { VisitsContext, VisitFormContext } from "../first-run/src/views-visits.js";
export { VISIT_CSV_COLUMNS, visitsToCsv, visitsCsvFilename } from "../first-run/src/visits-csv.js";
export {
  CSV_IMPORT_COPY,
  CSV_FILE_ERRORS,
  ROW_PROBLEMS,
  parseCsv,
  previewCsvImport,
  problemsCsv,
  templateCsv,
  csvImportStrings,
} from "../first-run/src/csvimport.js";
export type { CsvPreview, CsvResult, CsvFileError, RowProblem, RowProblemCode } from "../first-run/src/csvimport.js";
export { renderCsvImport, renderCsvPreview, renderCsvNotes } from "../first-run/src/views-csvimport.js";
export { chosenNotes, columnName, recordProblem, noteDetailsText, detectDelimiter, disagreements, disagreementText, csvTakeBackLabel } from "../first-run/src/csvimport.js";
export type { Delimiter, Disagreement } from "../first-run/src/csvimport.js";
export { WIDE_CSV_COLUMNS, notesToWideCsv, notesToWideRows, wideCsvFilename } from "../first-run/src/notes-csv.js";
export { SHORTLIST_CSV_COPY, shortlistCsvColumns, shortlistToRows, shortlistToCsv, shortlistCsvFilename } from "../first-run/src/shortlist-csv.js";
export type { CsvImportContext } from "../first-run/src/views-csvimport.js";
export { filterVisits, followUps, NO_FILTER } from "../first-run/src/visits.js";
export type { VisitFilter, FollowUp } from "../first-run/src/visits.js";
