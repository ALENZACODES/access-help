/**
 * Entry point for "Remove contact details" (`@access/onboarding/file-contacts`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export {
  CONTACTS_CSV_COLUMNS,
  CONTACT_FIELDS,
  MAX_SOURCE,
  applyContacts,
  canClear,
  canRemove,
  cleanedFile,
  contactChanges,
  contactFindings,
  contactsCsv,
  findContacts,
  hasContact,
  newText,
  textProblem,
  withoutContacts,
  type CleanedCopy,
  type Contact,
  type ContactChange,
  type ContactChoice,
  type ContactField,
  type ContactKind,
  type ContactProblem,
  type ContactsReport,
  type Finding,
} from "./contactdetails";
export { FILE_CONTACTS_COPY, changeText, contactsFilename, contactsSummary, copySummary, fileContactsStrings, findingHeading, kindsText } from "./filecontacts-copy";
export { mountFileContacts, type FileContactsHandle, type FileContactsOptions } from "./filecontacts-mount";
export { CONTACT_PICKS, choiceOf, markedText, picksFor, readContactPicks, renderFileContacts, type ContactPick, type FileContactsContext } from "./views-filecontacts";
