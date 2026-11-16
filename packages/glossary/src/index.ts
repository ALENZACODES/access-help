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

export * from "./annotate.js";
export * from "./copyRules.js";
export * from "./frTypography.js";
export * from "./locale.js";
export * from "./offlineIndex.js";
export * from "./plainLanguage.js";
export * from "./provenance.js";
export {
  GLOSSARY_CSS,
  countText,
  resultsFor,
  renderResults,
  renderShell,
  mountGlossary,
  UI as GLOSSARY_SHELL_UI,
} from "./render.js";
export type { ShellOptions, MountElement, MountRoot, MountOptions, GlossaryController } from "./render.js";
export * from "./status.js";
export * from "./text.js";
