export type {
  ArticleBody,
  ArticleSection,
  ArticleSource,
  BoundaryRow,
  BoundaryTable,
  HelpArticle,
  HelpCache,
  HelpPack,
  Language,
  SearchHit,
  TranslationState,
} from "./types.js";
export { HELP_ARTICLES, HELP_PACK_ID } from "./content/articles.js";
export { SIGNPOSTS, SIGNPOSTS_RETRIEVED, signpost } from "./signposts.js";
export type { Signpost } from "./signposts.js";
export { auditArticles, OVERCLAIM_PATTERNS } from "./content-rules.js";
export { reviewNotes } from "./review-notes.js";
export type { ContentDefect } from "./content-rules.js";
export { emptySearchMessage, fold, searchArticles } from "./search.js";
export {
  LANGUAGE_STORAGE_KEY,
  createLanguagePreference,
  htmlLang,
  memoryKeyValue,
} from "./language.js";
export type { KeyValueStore, LanguagePreference } from "./language.js";
export { browserHelpCache, indexedDbHelpCache, memoryHelpCache } from "./offline.js";
export {
  HELP_LICENCE,
  HELP_SOURCE_NAME,
  SHELL_CONTRACT_VERSION,
  helpShellModule,
  listHelpForShell,
  toShellArticle,
} from "./shell.js";
export type { HelpShellContext, HelpShellResult, ShellHelpArticle, ShellProvenance } from "./shell.js";

import { HELP_ARTICLES, HELP_PACK_ID } from "./content/articles.js";
import type { HelpPack } from "./types.js";

export function bundledHelpPack(savedAt: string): HelpPack {
  return {
    id: HELP_PACK_ID,
    savedAt,
    articles: [...HELP_ARTICLES],
  };
}
