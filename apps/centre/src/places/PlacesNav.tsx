import { NavLink } from "react-router-dom";
import { moreText } from "./moreStrings.js";
import { placesText } from "./strings.js";
import { toolsText } from "./toolsStrings.js";
import type { Language } from "./types.js";

export function PlacesNav({ language }: { language: Language }) {
  return (
    <nav aria-label={language === "fr" ? "Lieux" : "Places"} className="places-nav">
      <NavLink to="/places" end>
        {placesText(language, "nav")}
      </NavLink>
      <NavLink to="/places/saved">{moreText(language, "savedLink")}</NavLink>
      <NavLink to="/places/plan">{moreText(language, "planLink")}</NavLink>
      <NavLink to="/places/sources">{moreText(language, "sourcesLink")}</NavLink>
      <NavLink to="/places/quality">{toolsText(language, "qualityLink")}</NavLink>
      <NavLink to="/places/changes">{toolsText(language, "changesLink")}</NavLink>
      <NavLink to="/places/inspect">{toolsText(language, "inspectLink")}</NavLink>
      <NavLink to="/places/status">{placesText(language, "statusLink")}</NavLink>
      <NavLink to="/places/contribute">{placesText(language, "contributeLink")}</NavLink>
    </nav>
  );
}
