/**
 * Strings for the day log (/places/days). Every English key has a French twin.
 * French uses U+2019 for the apostrophe, U+00A0 before ":" and "%", U+202F before ; ! ? and
 * inside « ». The screen shows a person's own observations by the day they were seen. It counts
 * and lists; it gives no score, and a day note is the person's own words and stays on the device.
 */
export const DAYS_STRINGS = {
  en: {
    link: "My days",
    title: "My observing days",
    lead: "See your own observations by the day you made them, and keep a short note for a day if you like. The counts are only counts. Everything stays on this device and nothing is uploaded.",
    noNotes: "You have no saved observations.",
    addLink: "Add an observation",
    totalsHeading: "All your days",
    calendarHeading: "Calendar",
    calendarCaption: "{month}. Days with observations are buttons.",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    showMonth: "Showing {month}.",
    dayButton: "{label}. Show this day.",
    monthEmpty: "No observations in {month}.",
    daysHeading: "Days in {month}",
    openDay: "Show {day}, {count}",
    dayHeading: "Day: {day}",
    pickDay: "Choose a day in the calendar or the list to see it.",
    placesHeading: "Places seen",
    unnamed: "Place without a name",
    noteHeading: "My note for this day",
    noteLabel: "Note for {day}",
    noteHelp: "Up to {max} characters. Your note stays on this device and is not added to any observation.",
    noteCount: "{n} of {max} characters",
    saveNote: "Save the note",
    noteSaved: "The note for {day} is saved on this device.",
    noteRemoved: "The note for {day} is removed.",
    noteFailed: "This device could not save the note.",
    noteTooMany: "You have the most day notes this device keeps. Remove one first.",
    filesHeading: "Files",
    downloadDay: "Download this day (.txt)",
    downloadDayOsm: "Download this day for OpenStreetMap (.osc)",
    downloadDays: "Download a line per day (.csv)",
    filesNote: "The files are made on this device. The day file includes your note. The OpenStreetMap file and the list of days do not.",
    undatedHeading: "Observations with a date that is not a real day",
    undatedBody: "These are not placed on any day. Correct the date to place them.",
    correctLink: "Correct an observation",
  },
  fr: {
    link: "Mes journées",
    title: "Mes journées d’observation",
    lead: "Voyez vos propres observations selon le jour où vous les avez faites, et gardez une courte note pour une journée si vous le voulez. Les décomptes ne sont que des décomptes. Tout reste sur cet appareil et rien n’est envoyé.",
    noNotes: "Vous n’avez aucune observation enregistrée.",
    addLink: "Ajouter une observation",
    totalsHeading: "Toutes vos journées",
    calendarHeading: "Calendrier",
    calendarCaption: "{month}. Les jours avec des observations sont des boutons.",
    previousMonth: "Mois précédent",
    nextMonth: "Mois suivant",
    showMonth: "Mois affiché\u00a0: {month}.",
    dayButton: "{label}. Afficher ce jour.",
    monthEmpty: "Aucune observation en {month}.",
    daysHeading: "Jours de {month}",
    openDay: "Afficher le {day}, {count}",
    dayHeading: "Jour\u00a0: {day}",
    pickDay: "Choisissez un jour dans le calendrier ou la liste pour l’afficher.",
    placesHeading: "Lieux vus",
    unnamed: "Lieu sans nom",
    noteHeading: "Ma note pour cette journée",
    noteLabel: "Note pour le {day}",
    noteHelp: "Jusqu’à {max} caractères. Votre note reste sur cet appareil et n’est ajoutée à aucune observation.",
    noteCount: "{n} caractères sur {max}",
    saveNote: "Enregistrer la note",
    noteSaved: "La note du {day} est enregistrée sur cet appareil.",
    noteRemoved: "La note du {day} est retirée.",
    noteFailed: "Cet appareil n’a pas pu enregistrer la note.",
    noteTooMany: "Vous avez le maximum de notes de journée que cet appareil conserve. Retirez-en une d’abord.",
    filesHeading: "Fichiers",
    downloadDay: "Télécharger cette journée (.txt)",
    downloadDayOsm: "Télécharger cette journée pour OpenStreetMap (.osc)",
    downloadDays: "Télécharger une ligne par jour (.csv)",
    filesNote: "Les fichiers sont faits sur cet appareil. Le fichier de la journée contient votre note. Le fichier OpenStreetMap et la liste des jours ne la contiennent pas.",
    undatedHeading: "Observations dont la date n’est pas un vrai jour",
    undatedBody: "Elles ne sont placées sur aucun jour. Corrigez la date pour les placer.",
    correctLink: "Corriger une observation",
  },
} as const;

export type DaysKey = keyof (typeof DAYS_STRINGS)["en"];

export function daysText(language: "en" | "fr", key: DaysKey, vars: Record<string, string | number> = {}): string {
  const template: string = DAYS_STRINGS[language][key];
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

export function missingDaysKeys(): string[] {
  return (Object.keys(DAYS_STRINGS.en) as DaysKey[]).filter((key) => !(key in DAYS_STRINGS.fr) || DAYS_STRINGS.fr[key].trim() === "");
}
