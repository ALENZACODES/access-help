import {
  ATTENDANT_SERVICES_NOTE,
  NO_ENDORSEMENT,
  NO_REPLACEMENT,
  PROGRAMMES,
} from "../directory.js";
import type { Language } from "../types.js";

export function DirectoryList({ language }: { language: Language }) {
  return (
    <div>
      <h1>{language === "fr" ? "Répertoire des programmes" : "Programme directory"}</h1>
      <p>{NO_REPLACEMENT[language]}</p>
      <p>{NO_ENDORSEMENT[language]}</p>
      <ul>
        {PROGRAMMES.map((programme) => (
          <li key={programme.id}>
            <h2>{programme.name[language]}</h2>
            <p>{programme.description[language]}</p>
            <p>
              <a href={programme.href}>
                {language === "fr" ? "Site de Spinal Cord Injury Ontario" : "Spinal Cord Injury Ontario website"}
              </a>
            </p>
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
