export { UNKNOWN } from "./types.js";
export type {
  Bilingual,
  EventAccessRecord,
  EventConfirmation,
  EventFormat,
  Fact,
  Lang,
  ParkingType,
  PrototypeLabel,
  SupportPolicy,
  Tier,
  Unknown,
  YesNo,
} from "./types.js";
export { DEMONSTRATION_RECORDS, findRecord } from "./fixtures.js";
export { messages, interpolate } from "./i18n.js";
export type { MessageKey } from "./i18n.js";
export { FIELD_DEFS, mayStateConfirmed, projectFact, projectRecord, unknownFieldIds } from "./project.js";
export type { ProjectedField, ProjectedRecord, ProjectedSection, SectionId } from "./project.js";
export { fixtureRuleViolations, validateEventAccessRecord } from "./validate.js";
export type { ValidationReport } from "./validate.js";
