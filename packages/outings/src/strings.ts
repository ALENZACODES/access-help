import type { Lang } from "./types";

export interface Strings {
  appTitle: string;
  intro: string;
  listsHeading: string;
  placesHeading: string;
  back: string;
  noPlaces: string;
  unknown: string;
  yes: string;
  no: string;
  source: string;
  licence: string;
  fetched: string;
  tier: string;
  unverified: string;
  listSources: string;
  syntheticNote: string;
  stepFreeEntrance: string;
  adultChangeTable: string;
  count: (n: number) => string;
}

export const strings: Record<Lang, Strings> = {
  en: {
    appTitle: "Outing lists",
    intro:
      "Lists of places. Every place on a list has the listed fact recorded in a named source. Facts that are missing show as Unknown.",
    listsHeading: "Lists",
    placesHeading: "Places",
    back: "Back to lists",
    noPlaces: "No places yet. This list is filled when real pack ids are pinned.",
    unknown: "Unknown",
    yes: "Yes",
    no: "No",
    source: "Source",
    licence: "Licence",
    fetched: "Last fetched",
    tier: "Tier",
    unverified: "Unverified draft, not shown as a fact",
    listSources: "List sources",
    syntheticNote: "Places in this build are invented test fixtures, not real locations.",
    stepFreeEntrance: "Step-free entrance",
    adultChangeTable: "Adult change table",
    count: (n) => (n === 1 ? "1 place" : `${n} places`),
  },
  fr: {
    appTitle: "Listes de sorties",
    intro:
      "Listes de lieux. Chaque lieu d’une liste a le fait indiqu\u00e9 enregistr\u00e9 dans une source nomm\u00e9e. Les faits manquants s’affichent comme Inconnu.",
    listsHeading: "Listes",
    placesHeading: "Lieux",
    back: "Retour aux listes",
    noPlaces: "Aucun lieu pour l’instant. Cette liste sera remplie quand de vrais identifiants du paquet seront fix\u00e9s.",
    unknown: "Inconnu",
    yes: "Oui",
    no: "Non",
    source: "Source",
    licence: "Licence",
    fetched: "Derni\u00e8re r\u00e9cup\u00e9ration",
    tier: "Niveau",
    unverified: "\u00c9bauche non v\u00e9rifi\u00e9e, non pr\u00e9sent\u00e9e comme un fait",
    listSources: "Sources de la liste",
    syntheticNote: "Les lieux de cette version sont des donn\u00e9es de test invent\u00e9es, pas de vrais lieux.",
    stepFreeEntrance: "Entr\u00e9e sans marche",
    adultChangeTable: "Table \u00e0 langer pour adulte",
    count: (n) => (n === 1 ? "1 lieu" : `${n} lieux`),
  },
};
