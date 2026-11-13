import type { HelpArticle, Language } from "./types.js";

/**
 * Phrases that would claim endorsement, a medical instruction, eligibility,
 * or a compliance finding. Matching is case-insensitive on the folded article text.
 * Negated sentences such as "The App is not endorsed" are allowed because the
 * banned phrases are the positive claims, not the word "endorsed" alone.
 */
export const OVERCLAIM_PATTERNS: readonly { id: string; pattern: RegExp }[] = [
  { id: "endorsed-by", pattern: /\bendorsed by\b/i },
  { id: "approuve-par", pattern: /\bapprouv[ée]e? par\b/i },
  { id: "official-scio-app", pattern: /\bofficial scio app\b/i },
  { id: "application-officielle-de-scio", pattern: /\bapplication officielle de scio\b/i },
  { id: "in-partnership", pattern: /\bin partnership with\b/i },
  { id: "en-partenariat", pattern: /\ben partenariat avec\b/i },
  { id: "partnered-with", pattern: /\bpartnered with (scio|accessnow|google|the ttc|metrolinx)\b/i },
  { id: "aoda-compliant", pattern: /\baoda[- ]compliant\b/i },
  { id: "conforme-aoda", pattern: /\bconforme (?:à la |a la )?aoda\b/i },
  { id: "you-are-eligible", pattern: /\byou (?:are|qualify as) eligible\b/i },
  { id: "vous-etes-admissible", pattern: /\bvous êtes admissible\b/i },
  { id: "take-this-dose", pattern: /\btake \d+\s?mg\b/i },
  { id: "catheter-interval", pattern: /\bcatheteri[sz]e every\b/i },
  { id: "lumosity", pattern: /\blumosity\b/i },
  { id: "wheelchair-bound", pattern: /\bwheelchair-bound\b/i },
  { id: "cloue-au-fauteuil", pattern: /\bcloué au fauteuil\b/i },
];

export interface ContentDefect {
  articleId: string;
  rule: string;
  detail: string;
}

function tableBlob(article: HelpArticle, language: Language): string {
  const table = article.boundaryTable?.[language];
  if (!table) {
    return "";
  }
  return [
    table.caption,
    table.columns.domain,
    table.columns.does,
    table.columns.doesNot,
    table.columns.governance,
    ...table.rows.flatMap((row) => [row.domain, row.does, row.doesNot, row.governance]),
  ].join("\n");
}

function combined(article: HelpArticle): string {
  const parts = [article.en, article.fr].flatMap((body) => [
    body.title,
    body.summary,
    ...body.sections.flatMap((section) => [section.heading, ...section.paragraphs]),
  ]);
  parts.push(tableBlob(article, "en"), tableBlob(article, "fr"));
  const lists = (["en", "fr"] as const).flatMap((language) => [
    ...article.does[language],
    ...article.doesNot[language],
    ...article.dataUses[language],
    ...article.sources.flatMap((source) => [source.title[language], source.limit[language]]),
  ]);
  return [...lists, ...parts].join("\n");
}

/** Structural and wording checks for the help pack. A failure blocks the content gate. */
export function auditArticles(articles: readonly HelpArticle[]): ContentDefect[] {
  const defects: ContentDefect[] = [];
  const ids = new Set<string>();
  for (const article of articles) {
    if (ids.has(article.id)) {
      defects.push({ articleId: article.id, rule: "unique-id", detail: "Duplicate article id." });
    }
    ids.add(article.id);
    if (article.machineTranslated !== false) {
      defects.push({ articleId: article.id, rule: "no-machine-translation", detail: "Help text must not be machine-translated." });
    }
    for (const language of ["en", "fr"] as const) {
      if (article.does[language].length === 0 || article.doesNot[language].length === 0 || article.dataUses[language].length === 0) {
        defects.push({
          articleId: article.id,
          rule: "does-and-does-not",
          detail: `${language} needs a does list, a does-not list, and a data-uses list.`,
        });
      }
      if (article.does.fr.length !== article.does.en.length || article.doesNot.fr.length !== article.doesNot.en.length) {
        defects.push({
          articleId: article.id,
          rule: "boundary-parity",
          detail: "French does and does-not lists must have the same length as English.",
        });
      }
      if (article.dataUses.fr.length !== article.dataUses.en.length) {
        defects.push({
          articleId: article.id,
          rule: "data-uses-parity",
          detail: "French data-uses must have the same length as English.",
        });
      }
    }
    for (const language of ["en", "fr"] as const) {
      const body = article[language];
      if (!body.title.trim() || !body.summary.trim()) {
        defects.push({ articleId: article.id, rule: "title-summary", detail: `${language} title and summary are required.` });
      }
      if (body.sections.length < 2) {
        defects.push({ articleId: article.id, rule: "sections", detail: `${language} needs at least two sections.` });
      }
      if (language === "fr" && body.sections.length !== article.en.sections.length) {
        defects.push({
          articleId: article.id,
          rule: "section-parity",
          detail: "French and English must have the same number of sections.",
        });
      }
      if (language === "fr") {
        body.sections.forEach((section, index) => {
          const english = article.en.sections[index];
          if (english && section.paragraphs.length !== english.paragraphs.length) {
            defects.push({
              articleId: article.id,
              rule: "paragraph-parity",
              detail: `Section ${index + 1} has a different paragraph count in French.`,
            });
          }
        });
      }
      for (const section of body.sections) {
        if (!section.heading.trim() || section.paragraphs.length === 0 || section.paragraphs.some((p) => !p.trim())) {
          defects.push({ articleId: article.id, rule: "section-text", detail: `${language} section "${section.heading}" is empty.` });
        }
      }
      const record = article.translation[language];
      if (language === "fr" && record.state === "reviewed" && !record.reviewer) {
        defects.push({ articleId: article.id, rule: "french-review", detail: "A reviewed French article needs a named reviewer." });
      }
      if (language === "fr" && record.state !== "draft_awaiting_franco_ontarian_review" && record.state !== "reviewed") {
        defects.push({
          articleId: article.id,
          rule: "french-state",
          detail: "French help in this draft must wait for Franco-Ontarian review, or be marked reviewed with a reviewer.",
        });
      }
    }
    if (article.safetyCritical && article.translation.en.state === "reviewed" && article.translation.en.reviewer === null) {
      defects.push({ articleId: article.id, rule: "clinical-review", detail: "Reviewed safety text needs a reviewer." });
    }
    const text = combined(article);
    for (const rule of OVERCLAIM_PATTERNS) {
      if (rule.pattern.test(text)) {
        defects.push({ articleId: article.id, rule: rule.id, detail: "Overclaim pattern matched article text." });
      }
    }
    const englishTable = article.boundaryTable?.en;
    const frenchTable = article.boundaryTable?.fr;
    if (article.id === "clinical-boundaries") {
      if (!englishTable || !frenchTable) {
        defects.push({ articleId: article.id, rule: "boundary-table", detail: "The clinical boundaries article needs an English and a French table." });
      } else if (englishTable.rows.length !== frenchTable.rows.length) {
        defects.push({ articleId: article.id, rule: "boundary-table", detail: "The English and French tables need the same number of rows." });
      } else {
        englishTable.rows.forEach((row, index) => {
          const french = frenchTable.rows[index];
          if (!row.governance.includes("The default is no change.") || !french?.governance.includes("Le défaut est de ne rien changer.")) {
            defects.push({
              articleId: article.id,
              rule: "boundary-table",
              detail: `Row ${index + 1} needs the default-is-no-change sentence in both languages.`,
            });
          }
        });
        const domains = englishTable.rows.map((row) => row.domain);
        if (!domains.includes("Equipment") || !domains.includes("Benefits and funding")) {
          defects.push({ articleId: article.id, rule: "boundary-table", detail: "Equipment and Benefits and funding rows are required." });
        }
      }
    }
    if (article.sources.length === 0) {
      defects.push({ articleId: article.id, rule: "sources", detail: "Every article needs at least one source note." });
    }
    for (const source of article.sources) {
      if (!source.title.fr.trim() || !source.limit.fr.trim() || !source.title.en.trim() || !source.limit.en.trim()) {
        defects.push({ articleId: article.id, rule: "source-language", detail: "Each source needs an English and a French title and limit." });
      }
      if (source.limit.fr === source.limit.en) {
        defects.push({ articleId: article.id, rule: "source-language", detail: "A French source limit must not be a copy of the English limit." });
      }
    }
  }
  return defects;
}
