import { MODERATION_EXPLAINER, NOT_RUNNING } from "../directory.js";
import type { Language } from "../types.js";

export function ModerationExplainer({ language }: { language: Language }) {
  return (
    <div>
      <h1>{language === "fr" ? "Ce qu'une communauté en service exigerait" : "What a live community would require"}</h1>
      <p>{NOT_RUNNING[language]}</p>
      {MODERATION_EXPLAINER.map((section) => (
        <section key={section.id}>
          <h2>{section.title[language]}</h2>
          <p>{section.body[language]}</p>
          <p>{NOT_RUNNING[language]}</p>
        </section>
      ))}
    </div>
  );
}
