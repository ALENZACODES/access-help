/**
 * Entry point for "Check the addresses in a file" (`@access/onboarding/file-address`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export {
  ADDRESS_CSV_COLUMNS,
  ISSUE_KINDS,
  NO_FIXES,
  addressCsv,
  applyFixes,
  checkAddresses,
  checkPostal,
  countIssues,
  fixedAddress,
  fixedFile,
  isIntersection,
  namesAtOneAddress,
  placeIssues,
  postalOutliers,
  streetSpellings,
  validPostalCode,
  type AddressIssue,
  type AddressReport,
  type FixedCopy,
  type Fixes,
  type IssueKind,
  type NameGroup,
  type StreetSpellings,
} from "./addresscheck";
export { FILE_ADDRESS_COPY, addressFilename, addressText, copySummary, fileAddressStrings, reportSummary } from "./fileaddress-copy";
export { mountFileAddress, type FileAddressHandle, type FileAddressOptions } from "./fileaddress-mount";
export { readFixes, renderFileAddress, type FileAddressContext } from "./views-fileaddress";
