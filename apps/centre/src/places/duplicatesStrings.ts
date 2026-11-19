/**
 * Strings for the saved-twice screen (/places/duplicates). Every English key has a French twin.
 * French uses U+2019 for the apostrophe, U+00A0 before ":" and "%", and U+202F before ; ! ?.
 * The screen points out a person's own observations that may be one place saved more than once.
 * It never removes anything by itself and never chooses between notes that disagree.
 */
export const DUPLICATES_STRINGS = {
  en: {
    link: "Same place twice",
    title: "Notes that may be the same place",
    lead: "Find observations you saved more than once for what looks like one place, and keep the one you want. A group is a suggestion. Nothing is removed until you choose and confirm, and nothing is uploaded.",
    noNotes: "You have no saved observations.",
    addLink: "Add an observation",
    distanceLabel: "How close counts as the same place",
    distanceOption: "{m} m",
    summaryHeading: "What was found",
    groupsHeading: "Groups to look at",
    noGroups: "Nothing here looks like the same place saved twice.",
    groupHeading: "Group {n}: {name}",
    unnamed: "Place without a name",
    keepLegend: "Which note do you keep?",
    keepOption: "Keep: {name}, seen on {date}",
    suggested: "Suggested",
    noSuggestion: "The App suggests none of these. Choose the one that matches what you saw.",
    chooseFirst: "Choose a note to keep first.",
    keepButton: "Keep the chosen note in group {n}",
    confirmWarning: "This removes {count} from this device and keeps the one you chose.",
    confirmButton: "Yes, remove {count} from group {n}",
    cancelButton: "Keep them all",
    differentButton: "These are different places (group {n})",
    hidden: "Group {n} is left alone for this visit.",
    kept: "Kept one and removed {count} from this device.",
    putBackButton: "Put the removed notes back",
    putBack: "Put back on this device: {count}.",
    putBackFailed: "This device could not save, so the notes were not put back.",
    putBackNote: "You can put them back until you leave this page.",
    correctLink: "Correct a note first",
  },
  fr: {
    link: "Même lieu en double",
    title: "Notes qui sont peut-être le même lieu",
    lead: "Trouvez les observations enregistrées plus d’une fois pour ce qui semble être un seul lieu, et gardez celle que vous voulez. Un groupe est une suggestion. Rien n’est retiré avant que vous choisissiez et confirmiez, et rien n’est envoyé.",
    noNotes: "Vous n’avez aucune observation enregistrée.",
    addLink: "Ajouter une observation",
    distanceLabel: "Distance considérée comme le même lieu",
    distanceOption: "{m}\u00a0m",
    summaryHeading: "Ce qui a été trouvé",
    groupsHeading: "Groupes à examiner",
    noGroups: "Rien ici ne ressemble à un lieu enregistré deux fois.",
    groupHeading: "Groupe {n}\u00a0: {name}",
    unnamed: "Lieu sans nom",
    keepLegend: "Quelle note gardez-vous\u202f?",
    keepOption: "Garder\u00a0: {name}, vu le {date}",
    suggested: "Suggérée",
    noSuggestion: "L’application ne suggère aucune de ces notes. Choisissez celle qui correspond à ce que vous avez vu.",
    chooseFirst: "Choisissez d’abord une note à garder.",
    keepButton: "Garder la note choisie du groupe {n}",
    confirmWarning: "Ceci retire {count} de cet appareil et garde celle que vous avez choisie.",
    confirmButton: "Oui, retirer {count} du groupe {n}",
    cancelButton: "Les garder toutes",
    differentButton: "Ce sont des lieux différents (groupe {n})",
    hidden: "Le groupe {n} est laissé tel quel pour cette visite.",
    kept: "Une note gardée et {count} retirées de cet appareil.",
    putBackButton: "Remettre les notes retirées",
    putBack: "Remises sur cet appareil\u00a0: {count}.",
    putBackFailed: "Cet appareil n’a pas pu enregistrer, donc les notes n’ont pas été remises.",
    putBackNote: "Vous pouvez les remettre tant que vous restez sur cette page.",
    correctLink: "Corriger d’abord une note",
  },
} as const;

export type DuplicatesKey = keyof (typeof DUPLICATES_STRINGS)["en"];

export function duplicatesText(language: "en" | "fr", key: DuplicatesKey, vars: Record<string, string | number> = {}): string {
  const template: string = DUPLICATES_STRINGS[language][key];
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

export function missingDuplicatesKeys(): string[] {
  return (Object.keys(DUPLICATES_STRINGS.en) as DuplicatesKey[]).filter((key) => !(key in DUPLICATES_STRINGS.fr) || DUPLICATES_STRINGS.fr[key].trim() === "");
}
