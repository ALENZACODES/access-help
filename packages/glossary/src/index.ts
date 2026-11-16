export { TERMS, TERM_BY_ID } from "./terms.js";
export type { Term, Role } from "./terms.js";
export { frenchPunctuationIssues, lintCatalogs, parseCatalog } from "./catalog.js";
export type { Catalog, Finding, Rule } from "./catalog.js";
export { UI } from "./strings.js";

export { lookupTerm, listTerms, searchTerms, termCountLabel } from "./glossary.js";
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

export * from "./audit.js";
export * from "./auditCss.js";
export * from "./auditHtml.js";
export * from "./auditTerms.js";
export { finding } from "./auditTypes.js";
export type { Finding as AuditFinding, Severity as AuditSeverity } from "./auditTypes.js";
export * from "./csvImport.js";
export * from "./exportGlossary.js";
export * from "./offlineCache.js";
export * from "./placeRender.js";
export * from "./places.js";
export * from "./theme.js";
export * from "./compare.js";
export * from "./dataset.js";
export * from "./filters.js";
export * from "./finderMount.js";
export * from "./finderRender.js";
export * from "./finderText.js";
export * from "./placeSearch.js";
export * from "./coverage.js";
export * from "./view.js";
export * from "./sorting.js";
export * from "./favourites.js";
export * from "./synonyms.js";
export * from "./textExport.js";
export * from "./prefs.js";
export * from "./questions.js";
export * from "./notes.js";
export * from "./placeText.js";
export * from "./changes.js";
export * from "./quality.js";
export * from "./plan.js";
export * from "./outingMessage.js";
export * from "./claimRules.js";
export * from "./deepScan.js";
export * from "./links.js";
export * from "./helpCopy.js";
export * from "./helpRender.js";
export * from "./inventory.js";
export * from "./parity.js";
export * from "./helpView.js";
export * from "./readability.js";
export * from "./helpIndex.js";
export * from "./related.js";
export * from "./copyReport.js";
export * from "./helpSuggest.js";
export * from "./copyReportCli.js";
