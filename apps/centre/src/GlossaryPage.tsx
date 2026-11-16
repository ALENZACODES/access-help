import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GLOSSARY_META, connectionText, formatProvenance, listTerms, searchTerms, type Lang } from "@access/glossary";

interface GlossaryPageProps {
  language: Lang;
}

export function GlossaryPage({ language }: GlossaryPageProps) {
  const english = language === "en";
  const [query, setQuery] = useState("");
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  const offlineMessage = connectionText(online, language);
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
      {offlineMessage ? (
        <p className="gl-offline" role="status" data-gl-offline>
          {offlineMessage}
        </p>
      ) : null}
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
        {english ? `${terms.length} terms` : `${terms.length} termes`}
      </p>
      <dl>
        {terms.map((term) => (
          <div key={term.id}>
            <dt>{term.term}</dt>
            <dd>{term.plain}</dd>
          </div>
        ))}
      </dl>
      <p>{formatProvenance(GLOSSARY_META, language)}</p>
      <p>
        <Link to="/" className="min-target" style={{ minHeight: 44, minWidth: 44, display: "inline-flex", alignItems: "center" }}>
          {english ? "Open help" : "Ouvrir l’aide"}
        </Link>
      </p>
    </>
  );
}
