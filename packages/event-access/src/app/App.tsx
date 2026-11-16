import { useEffect, useState } from "react";
import { ALL_DEMONSTRATION_RECORDS, findRecord } from "../fixtures.js";
import { messages, type MessageKey } from "../i18n.js";
import { localToday } from "../timing.js";
import type { Lang } from "../types.js";
import { EventAccessPage } from "../ui/EventAccessPage.js";
import { JourneyPanel } from "../ui/JourneyPanel.js";
import { OpenOrganiserFile } from "../ui/OpenOrganiserFile.js";
import { OrganiserForm } from "../ui/OrganiserForm.js";

const VIEWS = ["record", "journey", "organiser", "open"] as const;
type View = (typeof VIEWS)[number];

function initialLang(): Lang {
  return new URLSearchParams(window.location.search).get("lang") === "fr" ? "fr" : "en";
}

function initialEventId(): string {
  const wanted = new URLSearchParams(window.location.search).get("event");
  return wanted && findRecord(wanted) ? wanted : (ALL_DEMONSTRATION_RECORDS[0]?.eventId ?? "");
}

function initialView(): View {
  const wanted = new URLSearchParams(window.location.search).get("view");
  return VIEWS.find((view) => view === wanted) ?? "record";
}

export function App() {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [eventId, setEventId] = useState<string>(initialEventId);
  const [view, setView] = useState<View>(initialView);
  const [today] = useState<string>(() => localToday());
  const m = messages[lang];
  const record = findRecord(eventId);
  const usesEvent = view === "record" || view === "journey";

  useEffect(() => {
    document.documentElement.lang = lang;
    const viewTitle = view === "record" ? null : m[`view_${view}` as MessageKey];
    const eventTitle = usesEvent && record ? record.eventLabel[lang] : null;
    document.title = [m.appTitle, viewTitle, eventTitle].filter(Boolean).join(" - ");
    const url = new URL(window.location.href);
    url.searchParams.set("lang", lang);
    url.searchParams.set("event", eventId);
    if (view === "record") url.searchParams.delete("view");
    else url.searchParams.set("view", view);
    window.history.replaceState(null, "", url);
  }, [lang, eventId, view, record, usesEvent, m]);

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
        <div role="group" aria-label={m.navGroup} className="views">
          {VIEWS.map((item) => (
            <button key={item} type="button" data-view={item} aria-pressed={view === item} onClick={() => setView(item)}>
              {m[`view_${item}` as MessageKey]}
            </button>
          ))}
        </div>
        {usesEvent ? (
          <div className="picker">
            <label htmlFor="event-picker">{m.eventPicker}</label>
            <select id="event-picker" value={eventId} onChange={(e) => setEventId(e.target.value)}>
              {ALL_DEMONSTRATION_RECORDS.map((r) => (
                <option key={r.eventId} value={r.eventId}>
                  {r.eventLabel[lang]}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </header>
      <main>
        {view === "organiser" ? <OrganiserForm lang={lang} today={today} /> : null}
        {view === "open" ? <OpenOrganiserFile lang={lang} today={today} /> : null}
        {usesEvent && !record ? <p>{m.notFound}</p> : null}
        {view === "record" && record ? <EventAccessPage record={record} lang={lang} today={today} /> : null}
        {view === "journey" && record ? <JourneyPanel record={record} lang={lang} today={today} /> : null}
      </main>
    </>
  );
}
