import type { HelpArticle, Language } from "./types.js";

/**
 * Notes shown above an article. Safety articles carry the clinical-review
 * warning in both languages. French also says the Franco-Ontarian review
 * is not recorded. These notes are drafts, not a completed review.
 */
export function reviewNotes(article: Pick<HelpArticle, "safetyCritical">, language: Language): string[] {
  if (language === "fr") {
    return [
      "Brouillon en français. Une révision franco-ontarienne n'est pas encore enregistrée. Ce texte n'est pas une traduction automatique.",
      article.safetyCritical
        ? "Brouillon. Une révision clinique n'est pas encore enregistrée. Ceci est une information générale, pas un conseil personnel."
        : "Brouillon en langage clair. Une révision par des personnes concernées n'est pas encore enregistrée.",
    ];
  }
  return [
    article.safetyCritical
      ? "Draft. Clinical review is not recorded yet. This is general information, not personal advice."
      : "Draft in plain language. Lived-experience review is not recorded yet.",
  ];
}
