import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GLOSSARY_META, listTerms, searchTerms, termCountLabel, type Lang } from "@access/glossary";

interface GlossaryPageProps {
  language: Lang;
}

export function GlossaryPage({ language }: GlossaryPageProps) {
  const english = language === "en";
  const [query, setQuery] = useState("");
  const terms = useMemo(
    () => (query.trim() === "" ? listTerms(language) : searchTerms(query, language)),
    [query, language],
  );

  return (
    <>
      <h1>{english ? "Accessibility terms" : "Termes d’accessibilité"}</h1>
      <p>
        {english
          ? "Plain-language terms used in help. A missing term is shown as Unknown. This is not medical or eligibility advice."
          : "Termes en langage clair utilisés dans l’aide. Un terme manquant est affiché comme Inconnu. Ce n’est pas un avis médical ni d’admissibilité."}
      </p>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <label htmlFor="glossary-query">{english ? "Search terms" : "Rechercher des termes"}</label>
        <input
          id="glossary-query"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{ minHeight: 44 }}
        />
      </form>
      <p role="status">
        {termCountLabel(terms.length, language)}
      </p>
      <dl>
        {terms.map((term) => (
          <div key={term.id}>
            <dt>{term.term}</dt>
            <dd>{term.plain}</dd>
          </div>
        ))}
      </dl>
      <p>
        {english
          ? `Source: ${GLOSSARY_META.source}. Licence: ${GLOSSARY_META.licence}. Dated ${GLOSSARY_META.date}.`
          : `Source\u00a0: ${GLOSSARY_META.source}. Licence\u00a0: ${GLOSSARY_META.licence}. Daté du ${GLOSSARY_META.date}.`}
      </p>
      <p>
        <Link to="/" className="min-target" style={{ minHeight: 44, minWidth: 44, display: "inline-flex", alignItems: "center" }}>
          {english ? "Open help" : "Ouvrir l’aide"}
        </Link>
      </p>
    </>
  );
}
