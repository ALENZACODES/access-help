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
