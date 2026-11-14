import { HELP_ARTICLES } from "./content/articles.js";
import { searchArticles } from "./search.js";
import type { HelpArticle, Language, TranslationState } from "./types.js";

/**
 * Adapter for the access-main shell route `/help`.
 *
 * Shape follows `ModuleResult`, `HelpArticle`, and `Provenance` in access-main
 * `packages/shared/src`, contract version 1.1.0. The shell checks each result
 * with `checkModuleResult` before it lists anything.
 *
 * Provenance is built only from what the article already records:
 * - source: this repository's help-centre draft;
 * - licence: MIT, as declared in `packages/help/package.json`;
 * - source date: the latest `retrieved` date on the article's own sources;
 * - tier: `E` (desk check of an official page) when at least one source has
 *   an https URL, otherwise `0`. Both carry `PROTOTYPE-UNVERIFIED`, because
 *   no French or clinical review is recorded.
 * Nothing is marked verified, and no review is claimed.
 */
export const SHELL_CONTRACT_VERSION = "1.1.0";
export const HELP_SOURCE_NAME = "access-help help centre draft";
export const HELP_LICENCE = "MIT";

export interface ShellProvenance {
  source_name: string;
  source_url: string | null;
  licence: string;
  licence_url: string | null;
  source_date: string;
  retrieved_at: string;
  tier: 0 | "E";
  prototype_label: "PROTOTYPE-UNVERIFIED";
  freshness: "unknown";
}

export interface ShellHelpArticle {
  id: string;
  title: string;
  locale: Language;
  /** Extra field. The shell ignores it. A French draft is not reviewed until a reviewer is recorded. */
  translationState: TranslationState;
  provenance: ShellProvenance;
}

export interface HelpShellContext {
  locale: Language;
  offline: boolean;
  nowIso: string;
  query?: string;
}

export interface HelpShellResult {
  moduleId: "help";
  availability: "ready";
  items: ShellHelpArticle[];
  messageKey: string;
  asOf: string | null;
  liveStatus: "unavailable";
}

function latestRetrieved(article: HelpArticle): string | null {
  const dates = article.sources.map((source) => source.retrieved).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date));
  return dates.length > 0 ? [...dates].sort().at(-1)! : null;
}

/** Null when the article does not record a source date. Such an article is left out, not given a date. */
export function toShellArticle(article: HelpArticle, locale: Language, storedAt: string): ShellHelpArticle | null {
  const sourceDate = latestRetrieved(article);
  if (!sourceDate) return null;
  const desk = article.sources.some((source) => source.url?.startsWith("https://"));
  return {
    id: article.id,
    title: article[locale].title,
    locale,
    translationState: article.translation[locale].state,
    provenance: {
      source_name: HELP_SOURCE_NAME,
      source_url: null,
      licence: HELP_LICENCE,
      licence_url: null,
      source_date: sourceDate,
      retrieved_at: storedAt,
      tier: desk ? "E" : 0,
      prototype_label: "PROTOTYPE-UNVERIFIED",
      freshness: "unknown",
    },
  };
}

export function listHelpForShell(ctx: HelpShellContext, articles: readonly HelpArticle[] = HELP_ARTICLES): HelpShellResult {
  const text = ctx.query?.trim() ?? "";
  const chosen = text ? searchArticles(articles, text, ctx.locale).map((hit) => hit.article) : [...articles];
  const items = chosen
    .map((article) => toShellArticle(article, ctx.locale, ctx.nowIso))
    .filter((item): item is ShellHelpArticle => item !== null);
  const dates = items.map((item) => item.provenance.source_date).sort();
  return {
    moduleId: "help",
    availability: "ready",
    items,
    messageKey: "help.shellReady",
    asOf: dates.at(-1) ?? null,
    liveStatus: "unavailable",
  };
}

export const helpShellModule = {
  id: "help" as const,
  list: (ctx: HelpShellContext): Promise<HelpShellResult> => Promise.resolve(listHelpForShell(ctx)),
};
