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
      <section aria-labelledby="organisation-contact-heading">
        <h2 id="organisation-contact-heading">
          {language === "fr" ? "Joindre Spinal Cord Injury Ontario" : "Contact Spinal Cord Injury Ontario"}
        </h2>
        <p>{ORGANISATION_CONTACT.limit[language]}</p>
        <ul>
          <li>
            <a href={`tel:${ORGANISATION_CONTACT.phone.replaceAll("-", "")}`}>{ORGANISATION_CONTACT.phone}</a>
          </li>
          <li>
            <a href={`tel:${ORGANISATION_CONTACT.tollFree.replaceAll("-", "")}`}>{ORGANISATION_CONTACT.tollFree}</a>
          </li>
          <li>
            <a href={`mailto:${ORGANISATION_CONTACT.email}`}>{ORGANISATION_CONTACT.email}</a>
          </li>
          <li>
            <a href={`mailto:${ORGANISATION_CONTACT.referralsEmail}`}>{ORGANISATION_CONTACT.referralsEmail}</a>
          </li>
        </ul>
        <p>{ORGANISATION_CONTACT.frenchLine[language]}</p>
        <p>
          <a href={ORGANISATION_CONTACT.pageUrl}>
            {language === "fr"
              ? "Page de contact de SCIO (en anglais, lue le 13 novembre 2026)"
              : "SCIO contact page (English, read 13 November 2026)"}
          </a>
        </p>
      </section>
      <ul>
        {PROGRAMMES.map((programme) => (
          <li key={programme.id}>
            <h2>{programme.name[language]}</h2>
            <p>{programme.description[language]}</p>
            <ul>
              {programme.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label[language]}</a>
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
