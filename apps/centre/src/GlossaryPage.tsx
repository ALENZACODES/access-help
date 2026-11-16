import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GLOSSARY_META, connectionText, formatProvenance, helpView, listTerms, relatedSegments, searchTerms, termCountLabel, type Lang } from "@access/glossary";

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
  const [helpQuery, setHelpQuery] = useState("");
  const terms = useMemo(
    () => (query.trim() === "" ? listTerms(language) : searchTerms(query, language)),
    [query, language],
  );

  // Help links point at definitions on this page, so they are links only while that definition is listed.
  const listed = useMemo(() => new Set(terms.map((t) => t.id)), [terms]);
  const help = useMemo(() => helpView(helpQuery, language, listed), [helpQuery, language, listed]);

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
        {termCountLabel(terms.length, language)}
      </p>
      <dl>
        {terms.map((term) => (
          <div key={term.id}>
            <dt>{term.term}</dt>
            <dd id={`gl-fd-${term.id}`}>
              {term.plain}
              {relatedSegments(term.id, language, listed).length > 0 ? (
                <>
                  <br />
                  <span className="gl-note">
                    {relatedSegments(term.id, language, listed).map((seg, k) =>
                      seg.kind === "term" ? (
                        <a key={k} className="gl-term" href={seg.href}>
                          {seg.label}
                        </a>
                      ) : (
                        seg.text
                      ),
                    )}
                  </span>
                </>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
      <p>{formatProvenance(GLOSSARY_META, language)}</p>
      <section aria-labelledby="gl-help-title">
        <h2 id="gl-help-title">{help.title}</h2>
        <label htmlFor="gl-hq">{help.searchLabel}</label>
        <input
          id="gl-hq"
          type="search"
          value={helpQuery}
          onChange={(event) => setHelpQuery(event.target.value)}
          style={{ minHeight: 44 }}
        />
        <p role="status" aria-live="polite">
          {help.count}
        </p>
        {help.suggestion !== null && help.suggestionText !== null ? (
          <p>
            <button type="button" className="gl-btn" style={{ minHeight: 44 }} onClick={() => setHelpQuery(help.suggestion ?? "")}>
              {help.suggestionText}
            </button>
          </p>
        ) : null}
        {help.topics.map((topic) => (
          <section key={topic.id} id={`gl-help-${topic.id}`} aria-labelledby={`gl-help-${topic.id}-t`}>
            <h3 id={`gl-help-${topic.id}-t`}>
              {topic.titlePieces.map((piece, k) => (piece.match ? <mark key={k}>{piece.text}</mark> : piece.text))}
            </h3>
            {topic.paragraphs.map((segments, i) => (
              <p key={i}>
                {segments.map((seg, j) =>
                  seg.kind === "term" ? (
                    <a key={j} className="gl-term" href={seg.href}>
                      {seg.label}
                    </a>
                  ) : seg.kind === "mark" ? (
                    <mark key={j}>{seg.text}</mark>
                  ) : (
                    seg.text
                  ),
                )}
              </p>
            ))}
          </section>
        ))}
      </section>
      <p>
        <Link to="/" className="min-target" style={{ minHeight: 44, minWidth: 44, display: "inline-flex", alignItems: "center" }}>
          {english ? "Open help" : "Ouvrir l’aide"}
        </Link>
      </p>
    </>
  );
}
