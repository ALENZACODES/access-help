import { createElement as h, useState } from "react";
import { ALL_HELP_ARTICLES } from "../integrated-articles.js";
import { searchArticles } from "../search.js";
import type { HelpArticle, Language } from "../types.js";

const words = {
  en: { search: "Search help", empty: "No matching articles", missing: "Article not found", source: "Source", licence: "Licence", date: "Date", tier: "Tier", unknown: "Unknown", does: "What the App does", doesNot: "What the App does not do", data: "Data used", back: "All help articles" },
  fr: { search: "Rechercher dans l’aide", empty: "Aucun article trouvé", missing: "Article introuvable", source: "Source", licence: "Licence", date: "Date", tier: "Niveau", unknown: "Inconnu", does: "Ce que fait l’App", doesNot: "Ce que l’App ne fait pas", data: "Données utilisées", back: "Tous les articles d’aide" },
} as const;

export interface ArticleViewProps { id: string; locale: Language; articles?: readonly HelpArticle[] }
export function ArticleView({ id, locale, articles = ALL_HELP_ARTICLES }: ArticleViewProps) {
  const article = articles.find((entry) => entry.id === id);
  const t = words[locale];
  if (!article) return h("p", { role: "status" }, t.missing);
  const body = article[locale];
  const date = article.sources.map((s) => s.retrieved).sort().at(-1) ?? t.unknown;
  const list = (heading: string, entries: string[]) => h("section", { key: heading }, h("h2", null, heading), h("ul", null, ...entries.map((entry, index) => h("li", { key: index }, entry))));
  return h("article", { lang: locale },
    h("h1", null, body.title), h("p", null, body.summary),
    ...body.sections.map((section, index) => h("section", { key: index }, h("h2", null, section.heading), ...section.paragraphs.map((paragraph, p) => h("p", { key: p }, paragraph)))),
    list(t.does, article.does[locale]), list(t.doesNot, article.doesNot[locale]), list(t.data, article.dataUses[locale]),
    h("section", null, h("h2", null, t.source), h("dl", null,
      h("dt", null, t.source), h("dd", null, "App-authored help centre"),
      h("dt", null, t.licence), h("dd", null, "MIT"),
      h("dt", null, t.date), h("dd", null, date),
      h("dt", null, t.tier), h("dd", null, "E"))),
  );
}

export interface HelpSearchProps { locale: Language; articles?: readonly HelpArticle[]; articleHref?: (id: string) => string }
export function HelpSearch({ locale, articles = ALL_HELP_ARTICLES, articleHref = (id) => `/help/${encodeURIComponent(id)}` }: HelpSearchProps) {
  const [query, setQuery] = useState("");
  const t = words[locale];
  const results = query.trim() ? searchArticles(articles, query, locale).map((hit) => hit.article) : [...articles];
  return h("section", { lang: locale, "aria-label": t.search },
    h("label", { htmlFor: "help-search-input" }, t.search),
    h("input", { id: "help-search-input", type: "search", value: query, onChange: (event: { target: { value: string } }) => setQuery(event.target.value) }),
    results.length ? h("ul", null, ...results.map((article) => h("li", { key: article.id }, h("a", { href: articleHref(article.id), style: { display: "inline-flex", alignItems: "center", minHeight: 44, minWidth: 44 } }, article[locale].title)))) : h("p", { role: "status" }, t.empty),
  );
}
