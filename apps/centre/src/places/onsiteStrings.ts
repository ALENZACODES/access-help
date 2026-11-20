/**
 * Strings for the on-site measuring page (/places/onsite). Every English key has a French
 * twin. French uses U+2019 for the apostrophe, U+00A0 before ":" and U+202F before ; ! ? and
 * inside « ». The page asks one question at a time at a place the person is at, keeps a
 * skipped question UNKNOWN, and saves nothing to their measures until they say so.
 */
const N = "\u00a0";

export const ONSITE_STRINGS = {
  en: {
    link: "Measure on site",
    title: "Measure on site",
    lead: "At a place you saved, answer one question at a time with large buttons. Your answers are kept on this device as you go, and nothing changes in your measures until you save at the end.",
    noNotes: "You have no saved observations to measure.",
    addLink: "Add an observation",
    startHeading: "Choose the place you are at",
    chooseLabel: "Observation",
    unnamed: "Place without a name",
    optionLabel: "{name}, {day}",
    optionMeasured: "{name}, {day}, has measures",
    start: "Start the questions",
    startFromSaved: "Start from what I saved",
    started: "Questions started for {name}.",
    resumed: "You are back where the questions stopped at {name}.",
    placeLabel: "Place: {name}.",
    answerLabel: "Your answer",
    stepsLabel: "Number of steps",
    lengthLabel: "Length in {unit}",
    unitLegend: "Unit",
    fewer: "One fewer",
    more: "One more",
    less: "Half a unit less",
    greater: "Half a unit more",
    back: "Back",
    skip: "Skip, leave UNKNOWN",
    next: "Keep and go on",
    moved: "{position}. {question}",
    reviewHeading: "Look over your answers",
    reviewCaption: "Your answers for {name}. A skipped question reads UNKNOWN.",
    colQuestion: "Question",
    colAnswer: "Answer",
    colChange: "Change",
    change: "Change: {name}",
    changesHeading: "What saving will do",
    changesCaption: "Each fact against what is saved now.",
    colFact: "Fact",
    colEffect: "On saving",
    save: "Save these measures",
    saved: "Measures saved for {name}. The questions are closed.",
    notSaved: "The measures could not be saved on this device. Your answers are still here.",
    full: "The device holds as many measured places as the App keeps. Remove one on the measuring page first.",
    notKept: "Your answer could not be kept on this device. It will be lost if you close this page.",
    cannotSave: "These answers cannot be saved as they are. Start again from the first question.",
    discard: "Stop and discard these answers",
    discarded: "Answers discarded for {name}. Nothing changed in your measures.",
    measureLink: "See and edit the measures",
    doneHeading: "Saved",
    again: "Measure another place",
    replaceNote: "Saving replaces the measures of this place with the answers above.",
  },
  fr: {
    link: "Mesurer sur place",
    title: "Mesurer sur place",
    lead: "Dans un lieu que vous avez enregistré, répondez à une question à la fois avec de grands boutons. Vos réponses sont gardées sur cet appareil au fur et à mesure, et rien ne change dans vos mesures tant que vous n’enregistrez pas à la fin.",
    noNotes: "Vous n’avez aucune observation enregistrée à mesurer.",
    addLink: "Ajouter une observation",
    startHeading: "Choisissez le lieu où vous êtes",
    chooseLabel: "Observation",
    unnamed: "Lieu sans nom",
    optionLabel: "{name}, {day}",
    optionMeasured: "{name}, {day}, a des mesures",
    start: "Commencer les questions",
    startFromSaved: "Partir de ce que j’ai enregistré",
    started: "Questions commencées pour {name}.",
    resumed: "Vous reprenez là où les questions s’étaient arrêtées à {name}.",
    placeLabel: `Lieu${N}: {name}.`,
    answerLabel: "Votre réponse",
    stepsLabel: "Nombre de marches",
    lengthLabel: "Longueur en {unit}",
    unitLegend: "Unité",
    fewer: "Une de moins",
    more: "Une de plus",
    less: "Une demi-unité de moins",
    greater: "Une demi-unité de plus",
    back: "Retour",
    skip: "Passer, laisser UNKNOWN",
    next: "Garder et continuer",
    moved: "{position}. {question}",
    reviewHeading: "Relisez vos réponses",
    reviewCaption: "Vos réponses pour {name}. Une question passée indique UNKNOWN.",
    colQuestion: "Question",
    colAnswer: "Réponse",
    colChange: "Modifier",
    change: `Modifier${N}: {name}`,
    changesHeading: "Ce que l’enregistrement fera",
    changesCaption: "Chaque fait par rapport à ce qui est enregistré maintenant.",
    colFact: "Fait",
    colEffect: "À l’enregistrement",
    save: "Enregistrer ces mesures",
    saved: "Mesures enregistrées pour {name}. Les questions sont fermées.",
    notSaved: "Les mesures n’ont pas pu être enregistrées sur cet appareil. Vos réponses sont toujours ici.",
    full: "L’appareil contient autant de lieux mesurés que l’application en garde. Retirez-en un d’abord sur la page des mesures.",
    notKept: "Votre réponse n’a pas pu être gardée sur cet appareil. Elle sera perdue si vous fermez cette page.",
    cannotSave: "Ces réponses ne peuvent pas être enregistrées telles quelles. Recommencez à la première question.",
    discard: "Arrêter et jeter ces réponses",
    discarded: "Réponses jetées pour {name}. Rien n’a changé dans vos mesures.",
    measureLink: "Voir et modifier les mesures",
    doneHeading: "Enregistré",
    again: "Mesurer un autre lieu",
    replaceNote: "L’enregistrement remplace les mesures de ce lieu par les réponses ci-dessus.",
  },
} as const;

export type OnsiteKey = keyof (typeof ONSITE_STRINGS)["en"];

export function onsiteText(language: "en" | "fr", key: OnsiteKey, vars: Record<string, string | number> = {}): string {
  return ONSITE_STRINGS[language][key].replace(/\{(\w+)\}/g, (whole, name: string) => (Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole));
}

/** English keys with no French twin. Empty when the two tables match. */
export function missingOnsiteKeys(): string[] {
  const fr = ONSITE_STRINGS.fr as Record<string, string>;
  return Object.keys(ONSITE_STRINGS.en).filter((key) => typeof fr[key] !== "string" || fr[key] === "");
}
