/**
 * Entry point for "Read a notes file" (`@access/onboarding/file-reader`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export {
  GROUPS,
  PAGE_SIZE,
  START_VIEW,
  groupFound,
  hasMustHaves,
  pageOf,
  readNotesFile,
  searchPlaces,
  setMustHave,
  shownPlaces,
  toggleOpen,
  viewPages,
  withFilter,
  withPage,
  type Group,
  type GroupPage,
  type ReaderFile,
  type ReaderRead,
  type ReaderView,
} from "./filereader";
export { FILE_READER_COPY, fileReaderStrings, readerFilename } from "./filereader-copy";
export { mountFileReader, type FileReaderHandle, type FileReaderOptions } from "./filereader-mount";
export { renderFileReader, type FileReaderContext } from "./views-filereader";
