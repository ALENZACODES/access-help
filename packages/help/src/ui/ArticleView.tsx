import { useId } from "react";
import { reviewNotes } from "../review-notes.js";
import type { HelpArticle, Language } from "../types.js";

/** Language of a retrieved page, so a French screen can mark an English link. */
export function linkLanguage(url: string): "en" | "fr" {
  try {
    const path = new URL(url).pathname;
    return /\/fr(\/|$)/.test(path) ? "fr" : "en";
  } catch {
    return "en";
  }
}

export interface ArticleViewProps {
  article: HelpArticle;
  language: Language;
  packSavedAt: string | null;
}

export function ArticleView({ article, language, packSavedAt }: ArticleViewProps) {
  const body = article[language];
  return (
    <article>
      <h1>{body.title}</h1>
      {reviewNotes(article, language).map((note) => (
        <p className="review-note" key={note}>
          {note}
        </p>
      ))}
      <p>{body.summary}</p>
      <h2>{language === "fr" ? "Ce que l'application fait" : "What the App does"}</h2>
      <ul>
        {article.does[language].map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h2>{language === "fr" ? "Ce que l'application ne fait pas" : "What the App does not do"}</h2>
      <ul>
        {article.doesNot[language].map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h2>{language === "fr" ? "Quelles données sont utilisées" : "What data it uses"}</h2>
      <ul>
        {article.dataUses[language].map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {body.sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
      {article.boundaryTable ? <BoundaryTableView table={article.boundaryTable[language]} /> : null}
      <h2>{language === "fr" ? "Sources" : "Sources"}</h2>
      <ul>
        {article.sources.map((source) => (
          <li key={source.title.en}>
            {source.url ? (
              <a href={source.url} hrefLang={linkLanguage(source.url)}>
                {source.title[language]}
              </a>
            ) : (
              source.title[language]
            )}
            {". "}
            {language === "fr" ? "Lu le" : "Read"} {source.retrieved}. {source.limit[language]}
          </li>
        ))}
      </ul>
      <p>
        {language === "fr"
          ? "Le texte anglais est aussi dans ce paquet."
          : "The French text is in this pack too."}
      </p>
      {packSavedAt ? (
        <p>
          {language === "fr"
            ? `Paquet d'aide enregistré sur cet appareil le ${packSavedAt}.`
            : `Help pack saved on this device at ${packSavedAt}.`}
        </p>
      ) : null}
    </article>
  );
}

function BoundaryTableView({ table }: { table: NonNullable<HelpArticle["boundaryTable"]>[Language] }) {
  const captionId = useId();
  return (
    <div className="boundary-table-wrap" tabIndex={0} role="region" aria-labelledby={captionId}>
      <table className="boundary-table">
        <caption id={captionId}>{table.caption}</caption>
        <thead>
          <tr>
            <th scope="col">{table.columns.domain}</th>
            <th scope="col">{table.columns.does}</th>
            <th scope="col">{table.columns.doesNot}</th>
            <th scope="col">{table.columns.governance}</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.domain}>
              <th scope="row">{row.domain}</th>
              <td>{row.does}</td>
              <td>{row.doesNot}</td>
              <td>{row.governance}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
