import { NavLink } from "react-router-dom";
import { dayText } from "./mappingDayStrings.js";
import { presubmitText } from "./presubmitStrings.js";
import { placesText } from "./strings.js";
import type { Language } from "./types.js";

export function PlacesNav({ language }: { language: Language }) {
  return (
    <nav aria-label={language === "fr" ? "Lieux" : "Places"} className="places-nav">
      <NavLink to="/places" end>
        {placesText(language, "nav")}
      </NavLink>
      <NavLink to="/places/status">{placesText(language, "statusLink")}</NavLink>
      <NavLink to="/places/contribute">{placesText(language, "contributeLink")}</NavLink>
      <NavLink to="/places/mapping-day">{dayText(language, "link")}</NavLink>
      <NavLink to="/places/check">{presubmitText(language, "link")}</NavLink>
    </nav>
  );
}
