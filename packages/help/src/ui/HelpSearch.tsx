import type { HelpArticle, Language, SearchHit } from "../types.js";
import { emptySearchMessage, searchArticles } from "../search.js";

export interface HelpSearchProps {
  articles: readonly HelpArticle[];
  language: Language;
  query: string;
  onQueryChange: (query: string) => void;
  onOpen: (articleId: string) => void;
}

export function HelpSearch({ articles, language, query, onQueryChange, onOpen }: HelpSearchProps) {
  const hits: SearchHit[] = query.trim() ? searchArticles(articles, query, language) : [];
  const label = language === "fr" ? "Rechercher dans l'aide" : "Search help";
  const showEmpty = query.trim().length > 0 && hits.length === 0;
  return (
    <form role="search" onSubmit={(event) => event.preventDefault()}>
      <label htmlFor="help-search">{label}</label>
      <input
        id="help-search"
        name="help-search"
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        autoComplete="off"
      />
      {showEmpty ? <p role="status">{emptySearchMessage(language, query)}</p> : null}
      {hits.length > 0 ? (
        <ul>
          {hits.map((hit) => (
            <li key={hit.article.id}>
              <button type="button" onClick={() => onOpen(hit.article.id)}>
                {hit.article[language].title}
              </button>
              <p>{hit.article[language].summary}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
