import { useState } from "react";
import { Link } from "react-router-dom";
import { ALL_DEMONSTRATION_RECORDS, localToday } from "@access/event-access";
import { JourneyPanel, OpenOrganiserFile, OrganiserForm } from "@access/event-access/ui";
import { EventOutingPlanner } from "@access/outings";
import { EventNightNav } from "./EventNightNav.js";
import { eventNightText, type EventNightKey, type EventNightLanguage } from "./strings.js";
import "./event-night.css";

interface ViewProps {
  language: EventNightLanguage;
}

const LINKS: readonly { to: string; link: EventNightKey; about: EventNightKey }[] = [
  { to: "/event-night/organiser", link: "organiserLink", about: "organiserAbout" },
  { to: "/event-night/open", link: "openLink", about: "openAbout" },
  { to: "/event-night/journey", link: "journeyLink", about: "journeyAbout" },
  { to: "/event-night/outing", link: "outingLink", about: "outingAbout" },
];

/** /event-night: what the event-night tools are, and a link to each. */
export function EventNightHome({ language }: ViewProps) {
  const t = (key: EventNightKey) => eventNightText(language, key);
  return (
    <div className="event-night">
      <h1>{t("title")}</h1>
      <EventNightNav language={language} />
      <p>{t("lead")}</p>
      <p>{t("onDevice")}</p>
      <p>{t("notChecked")}</p>
      <h2>{t("listHeading")}</h2>
      <ul className="event-night-list">
        {LINKS.map((item) => (
          <li key={item.to}>
            <Link className="min-target" to={item.to}>
              {t(item.link)}
            </Link>
            <p>{t(item.about)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** /event-night/organiser: the organiser checklist. It saves a file; it sends nothing. */
export function EventOrganiserView({ language }: ViewProps) {
  const [today] = useState(() => localToday());
  return (
    <div className="event-night">
      <EventNightNav language={language} />
      <OrganiserForm lang={language} today={today} />
    </div>
  );
}

/** /event-night/open: read an organiser's file on this device. */
export function EventOpenFileView({ language }: ViewProps) {
  const [today] = useState(() => localToday());
  return (
    <div className="event-night">
      <EventNightNav language={language} />
      <OpenOrganiserFile lang={language} today={today} />
    </div>
  );
}

/** /event-night/journey: the hand-off a journey planner would be given, for a demonstration event. */
export function EventJourneyView({ language }: ViewProps) {
  const [today] = useState(() => localToday());
  const [eventId, setEventId] = useState(() => ALL_DEMONSTRATION_RECORDS[0]?.eventId ?? "");
  const record = ALL_DEMONSTRATION_RECORDS.find((item) => item.eventId === eventId);
  const t = (key: EventNightKey) => eventNightText(language, key);
  return (
    <div className="event-night">
      <EventNightNav language={language} />
      <div className="control">
        <label htmlFor="event-night-picker">{t("journeyPickerLabel")}</label>
        <select id="event-night-picker" value={eventId} aria-describedby="event-night-picker-help" onChange={(event) => setEventId(event.target.value)}>
          {ALL_DEMONSTRATION_RECORDS.map((item) => (
            <option key={item.eventId} value={item.eventId}>
              {item.eventLabel[language]}
            </option>
          ))}
        </select>
        <p className="hint" id="event-night-picker-help">
          {t("journeyPickerHelp")}
        </p>
      </div>
      {record ? (
        <JourneyPanel key={record.eventId} record={record} lang={language} today={today} />
      ) : (
        <>
          <h1>{t("journeyLink")}</h1>
          <p>{t("journeyNone")}</p>
        </>
      )}
    </div>
  );
}

/** /event-night/outing: a personal list for an outing to an event, kept on this device. */
export function EventOutingView({ language }: ViewProps) {
  return (
    <div className="event-night">
      <EventNightNav language={language} />
      <EventOutingPlanner lang={language} />
    </div>
  );
}
