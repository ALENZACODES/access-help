import { useMemo, useState, type FormEvent } from "react";
import { CommunityStore } from "../store.js";
import type { Language, ReportReason } from "../types.js";

const REPORT_REASONS: ReportReason[] = ["advice", "inaccuracy", "abuse", "privacy", "safeguarding"];

/**
 * On-device practice for the staffed review steps.
 * Not linked from the Day 16 prototype navigation.
 * Nothing here is a live community, a message, or a mentor match.
 */
export function ReviewPractice({ language }: { language: Language }) {
  const store = useMemo(() => new CommunityStore(), []);
  const [revision, setRevision] = useState(0);
  const bump = () => setRevision((value) => value + 1);
  const [text, setText] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [topic, setTopic] = useState("entrances");
  const [tipLanguage, setTipLanguage] = useState<Language>(language);
  const [audience, setAudience] = useState<"general" | "family">("general");
  const [age, setAge] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [crisisContacts, setCrisisContacts] = useState<Array<{ id: string; contact: string; url?: string }>>([]);

  void revision;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setCrisisContacts([]);
    const result = store.submitTip({
      postType: "venue_tip",
      audience,
      language: tipLanguage,
      text,
      displayName,
      topic,
      confirmedAge16Plus: age,
    });
    if (result.kind === "crisis") {
      setNotice(
        language === "fr"
          ? "L'App n'enregistre pas ce texte. Si vous êtes en danger, composez le 911. Pour parler, appelez ou textez le 9-8-8."
          : "The App does not save this text. If you are in danger, call 911. To talk, call or text 9-8-8.",
      );
      setCrisisContacts(result.contacts);
      setText("");
    } else if (result.kind === "rejected_input") {
      setNotice(
        language === "fr"
          ? "Le brouillon n'a pas été gardé. Vérifiez le nom d'affichage, le texte et la confirmation d'âge (16 ans ou plus)."
          : "The draft was not kept. Check the display name, the text, and the age confirmation (16 or older).",
      );
    } else {
      setNotice(
        result.tip.holdCodes.length
          ? language === "fr"
            ? "Le brouillon est dans la file de cet appareil. Une personne doit le refuser. Il ne peut pas être publié."
            : "The draft is in the queue on this device. A person has to reject it. It cannot be published."
          : language === "fr"
            ? "Le brouillon attend une revue sur cet appareil. Personne d'autre ne le voit."
            : "The draft is waiting for review on this device. Nobody else can see it.",
      );
      setText("");
    }
    bump();
  }

  const queue = store.listQueue();
  const published = store.listPublic("all");

  return (
    <div>
      <h1>{language === "fr" ? "Exercice de revue sur cet appareil" : "Review practice on this device"}</h1>
      <p>
        {language === "fr"
          ? "Ceci n'est pas une communauté en service. Il n'y a pas de messages et pas de jumelage. Les brouillons restent sur cet appareil."
          : "This is not a live community. There is no messaging and no matching. Drafts stay on this device."}
      </p>
      <form onSubmit={onSubmit}>
        <label htmlFor="tip-name">{language === "fr" ? "Nom d'affichage" : "Display name"}</label>
        <input id="tip-name" name="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        <label htmlFor="tip-text">{language === "fr" ? "Conseil pratique" : "Practical tip"}</label>
        <textarea id="tip-text" name="tip" value={text} onChange={(event) => setText(event.target.value)} rows={5} />
        <label htmlFor="tip-topic">{language === "fr" ? "Sujet" : "Topic"}</label>
        <input id="tip-topic" name="topic" value={topic} onChange={(event) => setTopic(event.target.value)} />
        <fieldset>
          <legend>{language === "fr" ? "Langue du conseil" : "Tip language"}</legend>
          <label>
            <input type="radio" name="tip-language" checked={tipLanguage === "en"} onChange={() => setTipLanguage("en")} />
            English
          </label>
          <label>
            <input type="radio" name="tip-language" checked={tipLanguage === "fr"} onChange={() => setTipLanguage("fr")} />
            Français
          </label>
        </fieldset>
        <fieldset>
          <legend>{language === "fr" ? "Espace" : "Space"}</legend>
          <label>
            <input type="radio" name="audience" checked={audience === "general"} onChange={() => setAudience("general")} />
            {language === "fr" ? "Général" : "General"}
          </label>
          <label>
            <input type="radio" name="audience" checked={audience === "family"} onChange={() => setAudience("family")} />
            {language === "fr" ? "Familles" : "Families"}
          </label>
        </fieldset>
        <label>
          <input type="checkbox" checked={age} onChange={(event) => setAge(event.target.checked)} />
          {language === "fr" ? "J'ai 16 ans ou plus." : "I am 16 or older."}
        </label>
        <button type="submit">{language === "fr" ? "Envoyer pour revue sur cet appareil" : "Submit for review on this device"}</button>
      </form>
      {notice ? <p role="status">{notice}</p> : null}
      {crisisContacts.length > 0 ? (
        <ul>
          {crisisContacts.map((contact) => (
            <li key={contact.id ?? contact.contact}>
              {contact.url ? <a href={contact.url}>{contact.contact}</a> : contact.contact}
            </li>
          ))}
        </ul>
      ) : null}
      <h2>{language === "fr" ? "File d'attente" : "Queue"}</h2>
      {queue.length === 0 ? <p>{language === "fr" ? "La file est vide." : "The queue is empty."}</p> : null}
      <ul>
        {queue.map((tip) => (
          <li key={tip.id}>
            <p>{tip.text}</p>
            <p>{tip.moderationState}</p>
            <button
              type="button"
              onClick={() => {
                try {
                  store.publish(tip.id, {
                    moderatorId: "practice-reviewer",
                    moderatorLanguages: [tip.language],
                    placeCheck: "no_contradiction",
                    humanReview: true,
                  });
                  setNotice(language === "fr" ? "Publié sur cet appareil comme conseil de pair." : "Published on this device as a peer tip.");
                } catch (error) {
                  setNotice(error instanceof Error ? error.message : "Rejected.");
                }
                bump();
              }}
            >
              {language === "fr" ? "Publier après revue humaine" : "Publish after human review"}
            </button>
            <button
              type="button"
              onClick={() => {
                const codes = tip.holdCodes.length ? tip.holdCodes : (["not_on_topic"] as const);
                store.reject(tip.id, "practice-reviewer", [...codes]);
                setNotice(store.authorReason(tip.id)?.[language] ?? "");
                bump();
              }}
            >
              {language === "fr" ? "Refuser" : "Reject"}
            </button>
          </li>
        ))}
      </ul>
      <h2>{language === "fr" ? "Visible sur cet appareil" : "Visible on this device"}</h2>
      {published.length === 0 ? (
        <p>{language === "fr" ? "Les conseils communautaires ne sont pas encore disponibles." : "Community tips are not yet available."}</p>
      ) : (
        <ul>
          {published.map((tip) => (
            <li key={tip.id}>
              <p>{tip.text}</p>
              <p>{tip.label[language]}</p>
              <p>
                {tip.displayName} — {tip.createdAt}
              </p>
              <button type="button" onClick={() => { store.markHelpful(tip.id, "this-device"); bump(); }}>
                {language === "fr" ? `Utile (${tip.helpfulCount})` : `Helpful (${tip.helpfulCount})`}
              </button>
              <label htmlFor={`report-${tip.id}`}>{language === "fr" ? "Motif du signalement" : "Report reason"}</label>
              <select id={`report-${tip.id}`} name={`report-${tip.id}`} defaultValue="inaccuracy">
                {REPORT_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const select = document.getElementById(`report-${tip.id}`) as HTMLSelectElement | null;
                  const reason = (select?.value ?? "inaccuracy") as ReportReason;
                  store.report(tip.id, reason, "Practice report", "this-device");
                  setNotice(language === "fr" ? "Le conseil est caché en attendant une revue." : "The tip is hidden until review.");
                  bump();
                }}
              >
                {language === "fr" ? "Signaler ce conseil" : "Report this tip"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
