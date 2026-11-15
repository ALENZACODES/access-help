import { useEffect, useState } from "react";
import { DEMONSTRATION_RECORDS, findRecord } from "../fixtures.js";
import { messages } from "../i18n.js";
import type { Lang } from "../types.js";
import { EventAccessPage } from "../ui/EventAccessPage.js";

function initialLang(): Lang {
  return new URLSearchParams(window.location.search).get("lang") === "fr" ? "fr" : "en";
}

function initialEventId(): string {
  const wanted = new URLSearchParams(window.location.search).get("event");
  return wanted && findRecord(wanted) ? wanted : (DEMONSTRATION_RECORDS[0]?.eventId ?? "");
}

export function App() {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [eventId, setEventId] = useState<string>(initialEventId);
  const m = messages[lang];
  const record = findRecord(eventId);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = record ? `${m.appTitle} - ${record.eventLabel[lang]}` : m.appTitle;
    const url = new URL(window.location.href);
    url.searchParams.set("lang", lang);
    url.searchParams.set("event", eventId);
    window.history.replaceState(null, "", url);
  }, [lang, eventId, record, m.appTitle]);

  return (
    <>
      <header className="bar">
        <p className="brand">{m.appTitle}</p>
        <div role="group" aria-label={m.languageGroup} className="langs">
          <button type="button" lang="en" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
            {messages.en.langEnglish}
          </button>
          <button type="button" lang="fr" aria-pressed={lang === "fr"} onClick={() => setLang("fr")}>
            {messages.fr.langFrench}
          </button>
        </div>
        <div className="picker">
          <label htmlFor="event-picker">{m.eventPicker}</label>
          <select id="event-picker" value={eventId} onChange={(e) => setEventId(e.target.value)}>
            {DEMONSTRATION_RECORDS.map((r) => (
              <option key={r.eventId} value={r.eventId}>
                {r.eventLabel[lang]}
              </option>
            ))}
          </select>
        </div>
      </header>
      <main>{record ? <EventAccessPage record={record} lang={lang} /> : <p>{m.notFound}</p>}</main>
    </>
  );
}
