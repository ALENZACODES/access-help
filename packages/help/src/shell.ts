import { ALL_HELP_ARTICLES } from "./integrated-articles.js";
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
 * - tier: `0` only. This adapter does not emit another tier. An https URL
 *   is not evidence and is never used to infer tier E. All adapter results
 *   carry `PROTOTYPE-UNVERIFIED`.
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
  tier: 0;
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
      tier: 0,
      prototype_label: "PROTOTYPE-UNVERIFIED",
      freshness: "unknown",
    },
  };
}

export function listHelpForShell(ctx: HelpShellContext, articles: readonly HelpArticle[] = ALL_HELP_ARTICLES): HelpShellResult {
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

export interface HelpShellDetailResult {
  moduleId: "help";
  availability: "ready" | "empty";
  item: ShellHelpArticle | null;
  messageKey: string;
  asOf: string | null;
  liveStatus: "unavailable";
}

export function getHelpForShell(id: string, ctx: HelpShellContext, articles: readonly HelpArticle[] = ALL_HELP_ARTICLES): HelpShellDetailResult {
  const article = articles.find((candidate) => candidate.id === id);
  const item = article ? toShellArticle(article, ctx.locale, ctx.nowIso) : null;
  return {
    moduleId: "help",
    availability: item ? "ready" : "empty",
    item,
    messageKey: item ? "help.shellReady" : "help.notFound",
    asOf: item?.provenance.source_date ?? null,
    liveStatus: "unavailable",
  };
}

export const helpShellModule = {
  id: "help" as const,
  list: (ctx: HelpShellContext): Promise<HelpShellResult> => Promise.resolve(listHelpForShell(ctx)),
  get: (id: string, ctx: HelpShellContext): Promise<HelpShellDetailResult> => Promise.resolve(getHelpForShell(id, ctx)),
};
