/**
 * Entry point for the "Note files" page (`@access/onboarding/file-tools`).
 * A host loads this page with a dynamic import(); the page in turn loads each
 * tool only when it is opened. Nothing here is part of the first install.
 */
export {
  FILE_TOOLS_COPY,
  TOOL_IDS,
  TOOL_LOADERS,
  fileToolsStrings,
  isToolId,
  openedToolText,
  toolTitle,
  type ToolHandle,
  type ToolId,
  type ToolLoader,
  type ToolMount,
  type ToolMountOptions,
} from "./filetools";
export { mountFileTools, openToolTitle, renderToolFrame, renderToolList, type FileToolsHandle, type FileToolsOptions } from "./filetools-mount";
