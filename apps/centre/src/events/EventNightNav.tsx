import { NavLink } from "react-router-dom";
import { eventNightText, type EventNightLanguage } from "./strings.js";

/** The event-night menu. Every static /event-night route has a link here. */
export function EventNightNav({ language }: { language: EventNightLanguage }) {
  return (
    <nav aria-label={eventNightText(language, "menuLabel")} className="event-night-nav">
      <NavLink to="/event-night" end>
        {eventNightText(language, "nav")}
      </NavLink>
      <NavLink to="/event-night/organiser">{eventNightText(language, "organiserLink")}</NavLink>
      <NavLink to="/event-night/open">{eventNightText(language, "openLink")}</NavLink>
      <NavLink to="/event-night/journey">{eventNightText(language, "journeyLink")}</NavLink>
      <NavLink to="/event-night/outing">{eventNightText(language, "outingLink")}</NavLink>
    </nav>
  );
}
