export { TERMS, TERM_BY_ID } from "./terms.js";
export type { Term, Role } from "./terms.js";
export { frenchPunctuationIssues, lintCatalogs, parseCatalog } from "./catalog.js";
export type { Catalog, Finding, Rule } from "./catalog.js";
export { UI } from "./strings.js";

export { lookupTerm, listTerms, searchTerms } from "./glossary.js";
export type { ResolvedTerm } from "./glossary.js";
export {
  TERMS as PLAIN_TERMS,
  UNKNOWN_TERM,
  GLOSSARY_META,
  UNKNOWN_ID,
} from "./plainTerms.js";
export type { Lang, LocalisedText, GlossaryTerm } from "./plainTerms.js";
