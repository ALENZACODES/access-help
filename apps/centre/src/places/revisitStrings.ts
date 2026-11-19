/**
 * Strings for the revisit screen (/places/revisit). Every English key has a French twin.
 * French uses U+2019 for the apostrophe, U+00A0 before ":" and "%", and U+202F before ; ! ?.
 * The screen lists pack places that may be worth another visit. A reason is a prompt to go and
 * look. The order is by straight-line distance and says nothing about the way there.
 */
export const REVISIT_STRINGS = {
  en: {
    link: "Places to revisit",
    title: "Places worth another visit",
    lead: "Pick out places in the packs on this device that may be worth seeing again, and take a sheet along. A reason is a prompt to go and look. It does not say what you will find. Nothing is uploaded.",
    noPacks: "No pack is loaded on this device, so there is no place to list.",
    packsLink: "Load a pack",
    choicesHeading: "What to list",
    reasonsLegend: "Reasons to include",
    reasonCount: "{label} ({n})",
    startLegend: "Where you start (optional)",
    startHelp: "Type the coordinates of your starting point. The App does not read your location.",
    latLabel: "Start latitude",
    lonLabel: "Start longitude",
    startError: "The start is not a pair of coordinates. Latitude is between -90 and 90, longitude between -180 and 180.",
    withinLabel: "How far from the start",
    withinAny: "Any distance",
    withinOption: "Within {km} km",
    limitLabel: "How many places",
    summaryHeading: "Your list",
    noneMatch: "No place matches these choices.",
    unnamed: "Place without a name",
    stopLabel: "Stop {n}",
    coordinates: "Coordinates: {value}",
    openPlace: "Open {name}",
    filesHeading: "Take it with you",
    downloadSheet: "Download the field sheet (.txt)",
    downloadCsv: "Download a sheet to fill in (.csv)",
    filesNote: "The fill-in sheet leaves status, source, licence and date empty for you. Fill them from what you see, then bring the sheet in.",
    importLink: "Bring in a sheet",
  },
  fr: {
    link: "Lieux à revoir",
    title: "Lieux qui méritent une autre visite",
    lead: "Choisissez dans les paquets de cet appareil des lieux qui méritent peut-être d’être revus, et emportez une feuille. Une raison est une invitation à aller voir. Elle ne dit pas ce que vous trouverez. Rien n’est envoyé.",
    noPacks: "Aucun paquet n’est chargé sur cet appareil, donc il n’y a aucun lieu à lister.",
    packsLink: "Charger un paquet",
    choicesHeading: "Quoi lister",
    reasonsLegend: "Raisons à inclure",
    reasonCount: "{label} ({n})",
    startLegend: "Votre point de départ (facultatif)",
    startHelp: "Tapez les coordonnées de votre point de départ. L’application ne lit pas votre position.",
    latLabel: "Latitude de départ",
    lonLabel: "Longitude de départ",
    startError: "Le départ n’est pas une paire de coordonnées. La latitude est entre -90 et 90, la longitude entre -180 et 180.",
    withinLabel: "Distance du départ",
    withinAny: "Toute distance",
    withinOption: "À moins de {km}\u00a0km",
    limitLabel: "Combien de lieux",
    summaryHeading: "Votre liste",
    noneMatch: "Aucun lieu ne correspond à ces choix.",
    unnamed: "Lieu sans nom",
    stopLabel: "Arrêt {n}",
    coordinates: "Coordonnées\u00a0: {value}",
    openPlace: "Ouvrir {name}",
    filesHeading: "À emporter",
    downloadSheet: "Télécharger la feuille de terrain (.txt)",
    downloadCsv: "Télécharger une feuille à remplir (.csv)",
    filesNote: "La feuille à remplir laisse l’état, la source, la licence et la date vides pour vous. Remplissez-les d’après ce que vous voyez, puis importez la feuille.",
    importLink: "Importer une feuille",
  },
} as const;

export type RevisitKey = keyof (typeof REVISIT_STRINGS)["en"];

export function revisitText(language: "en" | "fr", key: RevisitKey, vars: Record<string, string | number> = {}): string {
  const template: string = REVISIT_STRINGS[language][key];
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

export function missingRevisitKeys(): string[] {
  return (Object.keys(REVISIT_STRINGS.en) as RevisitKey[]).filter(
    (key) => !(key in REVISIT_STRINGS.fr) || REVISIT_STRINGS.fr[key].trim() === "",
  );
}
