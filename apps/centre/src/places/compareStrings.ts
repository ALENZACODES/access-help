/**
 * Strings for the comparison screen (/places/compare). Every English key has a French twin.
 * French uses U+2019 for the apostrophe, U+00A0 before ":" and "%", and U+202F before ; ! ?.
 * The screen sets a person's own observations beside the packs on the device. It suggests
 * matches, never says two records are the same place, and never says which one is right.
 */
export const COMPARE_STRINGS = {
  en: {
    link: "My notes beside the packs",
    title: "Set my notes beside the packs",
    lead: "See how your saved observations sit next to the places in the packs on this device, before you add anything to the map. A match is a suggestion. The App does not say which record is right, and nothing is uploaded.",
    noDrafts: "You have no saved observations to compare.",
    addLink: "Add an observation",
    noPacks: "No pack is loaded on this device, so there is nothing to compare with.",
    packsLink: "Load a pack",
    radiusLabel: "How close counts as nearby",
    radiusOption: "{m} m",
    showLabel: "Show",
    showAll: "All ({n})",
    showOption: "{label} ({n})",
    summaryHeading: "Where your notes stand",
    listHeading: "Your notes, one by one",
    noneShown: "No note is in this group.",
    unnamed: "Place without a name",
    mineHeading: "Your note",
    packHeading: "Pack place",
    otherNearby: "Other pack places within the distance: {n}.",
    openPlace: "Open {name} in the packs",
    filesHeading: "Files",
    downloadText: "Download this comparison (.txt)",
    downloadCsv: "Download this comparison (.csv)",
    filesNote: "The files are made on this device. Nothing is sent anywhere.",
  },
  fr: {
    link: "Mes notes à côté des paquets",
    title: "Mettre mes notes à côté des paquets",
    lead: "Voyez où se situent vos observations enregistrées par rapport aux lieux des paquets de cet appareil, avant d’ajouter quoi que ce soit à la carte. Un rapprochement est une suggestion. L’application ne dit pas quelle fiche est juste, et rien n’est envoyé.",
    noDrafts: "Vous n’avez aucune observation enregistrée à comparer.",
    addLink: "Ajouter une observation",
    noPacks: "Aucun paquet n’est chargé sur cet appareil, donc il n’y a rien avec quoi comparer.",
    packsLink: "Charger un paquet",
    radiusLabel: "Distance considérée comme proche",
    radiusOption: "{m}\u00a0m",
    showLabel: "Afficher",
    showAll: "Toutes ({n})",
    showOption: "{label} ({n})",
    summaryHeading: "Où en sont vos notes",
    listHeading: "Vos notes, une par une",
    noneShown: "Aucune note dans ce groupe.",
    unnamed: "Lieu sans nom",
    mineHeading: "Votre note",
    packHeading: "Lieu du paquet",
    otherNearby: "Autres lieux du paquet dans la distance\u00a0: {n}.",
    openPlace: "Ouvrir {name} dans les paquets",
    filesHeading: "Fichiers",
    downloadText: "Télécharger cette comparaison (.txt)",
    downloadCsv: "Télécharger cette comparaison (.csv)",
    filesNote: "Les fichiers sont faits sur cet appareil. Rien n’est envoyé.",
  },
} as const;

export type CompareKey = keyof (typeof COMPARE_STRINGS)["en"];

export function compareText(language: "en" | "fr", key: CompareKey, vars: Record<string, string | number> = {}): string {
  const template: string = COMPARE_STRINGS[language][key];
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

export function missingCompareKeys(): string[] {
  return (Object.keys(COMPARE_STRINGS.en) as CompareKey[]).filter(
    (key) => !(key in COMPARE_STRINGS.fr) || COMPARE_STRINGS.fr[key].trim() === "",
  );
}
