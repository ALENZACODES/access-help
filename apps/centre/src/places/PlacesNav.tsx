import { NavLink } from "react-router-dom";
import { compareText } from "./compareStrings.js";
import { daysText } from "./daysStrings.js";
import { duplicatesText } from "./duplicatesStrings.js";
import { importText } from "./importStrings.js";
import { licencesText } from "./licencesStrings.js";
import { dayText } from "./mappingDayStrings.js";
import { mineText } from "./mineStrings.js";
import { reviewText } from "./reviewStrings.js";
import { moreText } from "./moreStrings.js";
import { presubmitText } from "./presubmitStrings.js";
import { revisitText } from "./revisitStrings.js";
import { placesText } from "./strings.js";
import { toolsText } from "./toolsStrings.js";
import { submissionText } from "./submissionsStrings.js";
import { askText } from "./askStrings.js";
import { cardsText } from "./cardsStrings.js";
import { onsiteText } from "./onsiteStrings.js";
import { matchPageText } from "./matchStrings.js";
import { measureText } from "./measureStrings.js";
import { sittingStringText } from "./sittingStrings.js";
import { tagsText } from "./tagsStrings.js";
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
      <NavLink to="/places/compare">{compareText(language, "link")}</NavLink>
      <NavLink to="/places/days">{daysText(language, "link")}</NavLink>
      <NavLink to="/places/duplicates">{duplicatesText(language, "link")}</NavLink>
      <NavLink to="/places/licences">{licencesText(language, "link")}</NavLink>
      <NavLink to="/places/measure">{measureText(language, "link")}</NavLink>
      <NavLink to="/places/onsite">{onsiteText(language, "link")}</NavLink>
      <NavLink to="/places/ask">{askText(language, "link")}</NavLink>
      <NavLink to="/places/numbers">{matchPageText(language, "link")}</NavLink>
      <NavLink to="/places/cards">{cardsText(language, "link")}</NavLink>
      <NavLink to="/places/sitting">{sittingStringText(language, "link")}</NavLink>
      <NavLink to="/places/tags">{tagsText(language, "link")}</NavLink>
      <NavLink to="/places/mine">{mineText(language, "link")}</NavLink>
      <NavLink to="/places/revisit">{revisitText(language, "link")}</NavLink>
      <NavLink to="/places/import">{importText(language, "link")}</NavLink>
      <NavLink to="/places/mapping-day">{dayText(language, "link")}</NavLink>
      <NavLink to="/places/review">{reviewText(language, "nav")}</NavLink>
      <NavLink to="/places/submissions">{submissionText(language, "link")}</NavLink>
      <NavLink to="/places/check">{presubmitText(language, "link")}</NavLink>
    </nav>
  );
}
