import type { HelpArticle, Language } from "../types.js";

export interface ArticleViewProps {
  article: HelpArticle;
  language: Language;
  packSavedAt: string | null;
}

export function ArticleView({ article, language, packSavedAt }: ArticleViewProps) {
  const body = article[language];
  const other = language === "fr" ? "en" : "fr";
  const reviewNote =
    language === "fr"
      ? "Brouillon en français. Une révision franco-ontarienne n'est pas encore enregistrée. Ce texte n'est pas une traduction automatique."
      : article.safetyCritical
        ? "Draft. Clinical review is not recorded yet. This is general information, not personal advice."
        : "Draft in plain language. Lived-experience review is not recorded yet.";
  return (
    <article>
      <h1>{body.title}</h1>
      <p className="review-note">{reviewNote}</p>
      <p>{body.summary}</p>
      <h2>{language === "fr" ? "Ce que l'App fait" : "What the App does"}</h2>
      <ul>
        {article.does.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h2>{language === "fr" ? "Ce que l'App ne fait pas" : "What the App does not do"}</h2>
      <ul>
        {article.doesNot.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h2>{language === "fr" ? "Quelles données sont utilisées" : "What data it uses"}</h2>
      <ul>
        {article.dataUses.map((item) => (
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
          <li key={source.title}>
            {source.url ? (
              <a href={source.url}>{source.title}</a>
            ) : (
              source.title
            )}
            {". "}
            {language === "fr" ? "Lu le" : "Read"} {source.retrieved}. {source.limit}
          </li>
        ))}
      </ul>
      <p>
        {language === "fr"
          ? `Le texte ${other === "en" ? "anglais" : "français"} est aussi dans ce paquet.`
          : `The ${other === "fr" ? "French" : "English"} text is in this pack too.`}
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
