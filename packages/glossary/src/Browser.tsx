import { useEffect, useMemo, useState } from "react";
import { TERMS } from "./terms.js";
import { UI, type Language } from "./strings.js";
import "./style.css";

export function GlossaryBrowser() {
  const [language, setLanguage] = useState<Language>("en");
  const [query, setQuery] = useState("");
  const strings = UI[language];
  const roles = UI[language].roles;
  useEffect(() => { document.documentElement.lang = `${language}-CA`; }, [language]);
  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return TERMS.filter((term) => [term.id, term.en, term.fr, term.note, term.noteFr, term.role]
      .some((value) => value.toLocaleLowerCase().includes(needle)));
  }, [query]);
  return (
    <>
      <a className="skip" href="#main">{strings.skip}</a>
      <header className="header">
        <div className="container header-inner">
          <strong>{strings.heading}</strong>
          <fieldset className="language">
            <legend>{strings.language}</legend>
            <label><input type="radio" name="language" checked={language === "en"} onChange={() => setLanguage("en")} />{strings.english}</label>
            <label><input type="radio" name="language" checked={language === "fr"} onChange={() => setLanguage("fr")} />{strings.french}</label>
          </fieldset>
        </div>
      </header>
      <main id="main" className="container" tabIndex={-1}>
        <h1>{strings.heading}</h1>
        <p>{strings.lead}</p>
        <div className="search">
          <label htmlFor="term-query">{strings.searchLabel}</label>
          <p id="search-help">{strings.searchHint}</p>
          <div className="search-row">
            <input id="term-query" type="search" value={query} aria-describedby="search-help" onChange={(event) => setQuery(event.target.value)} />
            <button type="button" onClick={() => setQuery("")}>{strings.clear}</button>
          </div>
        </div>
        <h2 aria-live="polite">{strings.results} ({matches.length})</h2>
        {matches.length === 0 ? <p>{strings.noResults}</p> : (
          <ul className="terms">
            {matches.map((term) => (
              <li key={term.id} className="term">
                <h3>{language === "en" ? term.en : term.fr}</h3>
                <dl>
                  <div><dt>{strings.englishHeading}</dt><dd lang="en-CA">{term.en}</dd></div>
                  <div><dt>{strings.frenchHeading}</dt><dd lang="fr-CA">{term.fr}</dd></div>
                  <div><dt>{strings.role}</dt><dd>{roles[term.role]}</dd></div>
                  <div><dt>{strings.note}</dt><dd lang={language === "fr" ? "fr-CA" : "en-CA"}>{language === "fr" ? term.noteFr : term.note}</dd></div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
