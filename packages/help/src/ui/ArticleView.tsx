import { reviewNotes } from "../review-notes.js";
import type { HelpArticle, Language } from "../types.js";

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
      <h2>{language === "fr" ? "Sources" : "Sources"}</h2>
      <ul>
        {article.sources.map((source) => (
          <li key={source.title.en}>
            {source.url ? <a href={source.url}>{source.title[language]}</a> : source.title[language]}
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
