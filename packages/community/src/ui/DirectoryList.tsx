import {
  ATTENDANT_SERVICES_NOTE,
  NO_ENDORSEMENT,
  NO_REPLACEMENT,
  ORGANISATION_CONTACT,
  PROGRAMMES,
} from "../directory.js";
import type { Language } from "../types.js";

export function DirectoryList({ language }: { language: Language }) {
  return (
    <div>
      <h1>{language === "fr" ? "Répertoire des programmes" : "Programme directory"}</h1>
      <p>{NO_REPLACEMENT[language]}</p>
      <p>{NO_ENDORSEMENT[language]}</p>
      <p>{ORGANISATION_CONTACT.limit[language]}</p>
      <p>
        <a href={ORGANISATION_CONTACT.pageUrl[language]} hrefLang={ORGANISATION_CONTACT.pageLanguage[language]}>
          {ORGANISATION_CONTACT.label[language]}
        </a>
      </p>
      <ul>
        {PROGRAMMES.map((programme) => (
          <li key={programme.id}>
            <h2>{programme.name[language]}</h2>
            <p>{programme.description[language]}</p>
            <ul>
              {programme.links.map((link) => (
                <li key={link.href.en}>
                  <a href={link.href[language]} hrefLang={link.pageLanguage[language]}>
                    {link.label[language]}
                  </a>
                  <p>{link.limit[language]}</p>
                </li>
              ))}
            </ul>
            {programme.unknowns.length > 0 ? (
              <p>
                {language === "fr" ? "À vérifier : " : "Still to verify: "}
                {programme.unknowns.join("; ")}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <p>{ATTENDANT_SERVICES_NOTE[language]}</p>
    </div>
  );
}
