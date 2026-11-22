/**
 * Entry point for "Add missing addresses" (`@access/onboarding/file-address`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export {
  ADDRESSES_CSV_COLUMNS,
  ADDRESS_ISSUES,
  DEFAULT_ADDRESS_OPTIONS,
  MAX_SUGGESTIONS,
  addressChanges,
  addressProblem,
  addressRows,
  addressedFile,
  addressesCsv,
  applyAddresses,
  copyPlaces,
  hasPostal,
  readsStreet,
  type AddressChange,
  type AddressIssue,
  type AddressOptions,
  type AddressProblem,
  type AddressReport,
  type AddressRow,
  type AddressedCopy,
} from "./addressfill";
export { FILE_ADDRESS_COPY, addressFilename, addressSummary, addressesText, changeText, copySummary, fileAddressStrings, placesLine, rowText, suggestionLabel } from "./fileaddress-copy";
export { mountFileAddress, type FileAddressHandle, type FileAddressOptions } from "./fileaddress-mount";
export { addressOf, readAddressPicks, renderFileAddress, type AddressPick, type FileAddressContext } from "./views-fileaddress";
