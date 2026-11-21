/**
 * Entry point for "Prepare a file to publish" (`@access/onboarding/file-publish`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export {
  DATASET_COLUMNS,
  DICT_LANGUAGES,
  LAYOUTS,
  NOTE_TEXT_COLUMN,
  TITLE_MAX,
  datasetColumns,
  datasetCsv,
  datasetRows,
  fileLicences,
  isDictLanguage,
  isLayout,
  isPersonal,
  licenceLeftOut,
  placeColumns,
  placeLayoutRows,
  placesCsv,
  scopedPlaces,
  publishChecks,
  publishProblems,
  publishedLicences,
  sourceCounts,
  type DatasetRow,
  type DictLanguage,
  type Layout,
  type PlaceCell,
  type PlaceRow,
  type PublishChecks,
  type PublishOptions,
  type PublishProblem,
} from "./publishpack";
export { FILE_PUBLISH_COPY, README_TEXT, checkLines, filePublishStrings, layoutText, publishFilename, readmeText, type ReadmeExtra } from "./filepublish-copy";
export { mountFilePublish, type FilePublishHandle, type FilePublishOptions } from "./filepublish-mount";
export { readPublishForm, renderFilePublish, startOptions, type FilePublishContext } from "./views-filepublish";
