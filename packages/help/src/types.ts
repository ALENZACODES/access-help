/** Languages the help centre ships. French is a draft until a Franco-Ontarian review is recorded. */
export type Language = "en" | "fr";

export type TranslationState =
  | "draft_plain_language"
  | "draft_awaiting_franco_ontarian_review"
  | "draft_awaiting_clinical_review"
  | "reviewed";

export interface ArticleSection {
  heading: string;
  paragraphs: string[];
}

export interface ArticleBody {
  title: string;
  summary: string;
  sections: ArticleSection[];
}

export interface ArticleSource {
  /** What was checked, in plain language. */
  title: string;
  /** URL when one was retrieved. Omit when the source is the master plan's own limit. */
  url?: string;
  /** ISO date (YYYY-MM-DD) the source was read for this draft. */
  retrieved: string;
  /** What this source does not establish. */
  limit: string;
}

/**
 * A help article. English and French are both written for this draft.
 * `machineTranslated` is always false: machine translation is not used for help.
 */
export interface HelpArticle {
  id: string;
  topics: string[];
  /** Safety, emergency, health, or legal boundary text. */
  safetyCritical: boolean;
  /** What the App does, in the article's own words. Required on every article. */
  does: string[];
  /** What the App does not do. Required on every article. */
  doesNot: string[];
  /** What data the feature uses. Shown after does and does-not. */
  dataUses: string[];
  synonyms: Record<Language, string[]>;
  translation: Record<
    Language,
    { state: TranslationState; translator: string; reviewer: string | null; reviewed: string | null }
  >;
  machineTranslated: false;
  sources: ArticleSource[];
  en: ArticleBody;
  fr: ArticleBody;
}

export interface SearchHit {
  article: HelpArticle;
  /** Lower is better. */
  score: number;
  language: Language;
  matchedIn: Array<"title" | "summary" | "body" | "synonym">;
}

export interface HelpPack {
  /** Stable id for the bundled article set. */
  id: string;
  savedAt: string;
  articles: HelpArticle[];
}

export interface HelpCache {
  load(): Promise<HelpPack | null>;
  save(pack: HelpPack): Promise<void>;
  clear(): Promise<void>;
}
