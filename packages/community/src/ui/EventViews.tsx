import { DEMONSTRATION_EVENTS, presentEvent } from "../events.js";
import type { Language } from "../types.js";

export function EventList({ language, onOpen }: { language: Language; onOpen: (id: string) => void }) {
  return (
    <div>
      <h1>{language === "fr" ? "Événements de démonstration" : "Demonstration events"}</h1>
      <p>
        {language === "fr"
          ? "Ces trois fiches montrent la forme d'une liste. Ce ne sont pas de vrais événements et ce n'est pas le calendrier de SCIO. L'application ne prend pas les inscriptions."
          : "These three listings show the shape of a list. They are not real events and they are not SCIO's calendar. The App does not take registrations."}
      </p>
      <ul>
        {DEMONSTRATION_EVENTS.map((event) => {
          const view = presentEvent(event, language);
          return (
            <li key={event.id}>
              <h2>{view.title}</h2>
              <p>{view.when}</p>
              <p>{view.where}</p>
              <p>{view.confirmationNotice}</p>
              <button type="button" onClick={() => onOpen(event.id)}>
                {language === "fr" ? "Ouvrir la fiche" : "Open the listing"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function EventDetail({ language, id }: { language: Language; id: string }) {
  const event = DEMONSTRATION_EVENTS.find((item) => item.id === id);
  if (!event) {
    return <p>{language === "fr" ? "Fiche introuvable." : "Listing not found."}</p>;
  }
  const view = presentEvent(event, language);
  const rows: Array<[string, string]> = [
    [language === "fr" ? "Quand" : "When", view.when],
    [language === "fr" ? "Où" : "Where", view.where],
    [language === "fr" ? "Comment s'y rendre" : "How to get there", view.arrival],
    [language === "fr" ? "Entrée pour cet événement" : "Entrance for this event", view.entrance],
    [language === "fr" ? "Places" : "Seating", view.seating],
    [language === "fr" ? "Toilettes pour cet événement" : "Washrooms for this event", view.washrooms],
    [language === "fr" ? "Soutien" : "Support", view.support],
    [language === "fr" ? "Coût" : "Cost", view.cost],
    [language === "fr" ? "Personne de soutien" : "Support person", view.supportPersonAdmission],
  ];
  return (
    <article>
      <h1>{view.title}</h1>
      <p>{view.confirmationNotice}</p>
      <p>
        {language === "fr" ? "Étiquette : " : "Label: "}
        {language === "fr" ? "Niveau canonique" : "Canonical tier"} {view.tier}.{" "}
        {language === "fr" ? "Étiquette de prototype" : "Prototype label"} {view.prototypeLabel}. {view.source}
      </p>
      <dl>
        {rows.map(([term, detail]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{detail}</dd>
          </div>
        ))}
      </dl>
      {view.platformNote ? <p>{view.platformNote}</p> : null}
      <p>
        <a href={view.registrationUrl}>
          {language === "fr"
            ? "Inscription sur le site de l'organisme, pas dans l'application"
            : "Registration on the organisation's website, not in the App"}
        </a>
      </p>
      <p>
        {language === "fr" ? "Téléphone : " : "Phone: "}
        {view.registrationPhone}
      </p>
    </article>
  );
}
