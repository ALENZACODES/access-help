/**
 * Entry point for "Questions to ask" (`@access/onboarding/file-ask`). Like the
 * other file tools, it is loaded with a dynamic import() only when a person
 * opens it, so it adds nothing to the first install.
 */
export {
  ASK_CSV_COLUMNS,
  ASK_ORDERS,
  ASK_REASONS,
  DEFAULT_ASK,
  askCsv,
  askList,
  byDetail,
  chosenKeys,
  isAskOrder,
  questionsForPlace,
  readAskFile,
  type AskDetail,
  type AskFile,
  type AskOrder,
  type AskList,
  type AskOptions,
  type AskPlace,
  type AskRead,
} from "./fileask";
export { FILE_ASK_COPY, askFilename, fileAskStrings } from "./fileask-copy";
export { mountFileAsk, type FileAskHandle, type FileAskOptions } from "./fileask-mount";
export { askText, renderFileAsk, type FileAskContext } from "./views-fileask";
