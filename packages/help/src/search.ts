import type { HelpArticle, Language, SearchHit } from "./types.js";

/** Fold accents so "ascenseur" and a typed "ascenseur" match, and "toilette" matches with or without accents. */
export function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en-CA");
}

function articleText(article: HelpArticle, language: Language): { title: string; summary: string; body: string } {
  const body = article[language];
  return {
    title: body.title,
    summary: body.summary,
    body: body.sections.map((section) => `${section.heading}\n${section.paragraphs.join("\n")}`).join("\n"),
  };
}

/**
 * Search help articles in the active language, with synonyms from both languages
 * so a French word can still find an article while the interface is in English.
 * Empty and whitespace-only queries return no hits. There is no "did you mean" that invents a topic.
 */
export function searchArticles(articles: readonly HelpArticle[], query: string, language: Language): SearchHit[] {
  const needle = fold(query).trim();
  if (needle.length === 0) {
    return [];
  }
  const hits: SearchHit[] = [];
  for (const article of articles) {
    const text = articleText(article, language);
    const matchedIn: SearchHit["matchedIn"] = [];
    let score = 0;
    if (fold(text.title).includes(needle)) {
      matchedIn.push("title");
      score += 5;
    }
    if (fold(text.summary).includes(needle)) {
      matchedIn.push("summary");
      score += 3;
    }
    if (fold(text.body).includes(needle)) {
      matchedIn.push("body");
      score += 1;
    }
    const synonyms = [...article.synonyms.en, ...article.synonyms.fr];
    if (synonyms.some((word) => fold(word).includes(needle) || needle.includes(fold(word)))) {
      matchedIn.push("synonym");
      score += 4;
    }
    if (score > 0) {
      hits.push({ article, score: -score, language, matchedIn });
    }
  }
  hits.sort((a, b) => a.score - b.score || a.article.id.localeCompare(b.article.id));
  return hits;
}

export function emptySearchMessage(language: Language, query: string): string {
  const term = query.trim();
  if (language === "fr") {
    return `Aucun article d'aide ne correspond à « ${term} ». Essayez un autre mot, comme urgence, vie privée, toilette ou événement. L'application n'invente pas de réponse.`;
  }
  return `No help article matches “${term}”. Try another word, such as emergency, privacy, washroom, or event. The App does not invent an answer.`;
}
