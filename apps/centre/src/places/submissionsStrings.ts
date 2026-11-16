/**
 * Strings for the submissions screen (/places/submissions). Every English key has a French twin.
 * French uses U+2019 for the apostrophe, U+00A0 before ":" and "%", and U+202F before ; ! ?.
 * The screen records what a person says they submitted to OpenStreetMap. The App cannot see
 * OpenStreetMap, so it never says a submission was received or accepted. It gives no medical
 * or eligibility advice and uploads nothing.
 */
export const SUBMISSION_STRINGS = {
  en: {
    link: "My submissions",
    title: "Mark what you submitted",
    lead: "Keep a list of the observations you submitted to OpenStreetMap yourself. You mark them here. The App cannot see OpenStreetMap, so this list is only what you tell it. Nothing is uploaded.",
    noDrafts: "You have no saved observations to mark.",
    addLink: "Add an observation",
    summaryHeading: "Where you are",
    nextHeading: "Not marked yet, oldest first",
    nextNone: "Every saved observation is marked.",
    nextLine: "{name}, seen on {date}",
    followHeading: "You may want to look again",
    followLead: "These are suggestions. Looking at a place on the map again can show whether your edit is still there.",
    listHeading: "Your observations",
    unnamed: "Place without a name",
    seenLine: "Seen on {date}.",
    markHeading: "Mark as submitted",
    markedOnLabel: "Day you submitted (YYYY-MM-DD)",
    changesetLabel: "Changeset number (optional)",
    changesetHelp: "The number OpenStreetMap gave your edit. You can leave it empty. The App cannot check that it exists.",
    noteLabel: "Note (optional)",
    markButton: "Mark {name} as submitted",
    markedLine: "Marked as submitted on {date}.",
    changesetLine: "Changeset number {id}.",
    noChangeset: "No changeset number given.",
    noteLine: "Note: {note}",
    lookedLine: "You noted a second look on {date}.",
    noLook: "No second look noted.",
    lookLabel: "Day you looked again (YYYY-MM-DD)",
    lookButton: "Note a second look at {name}",
    unmarkButton: "Remove the mark from {name}",
    errorSummary: "Fix these before saving:",
    didMark: "{name} is marked as submitted.",
    didLook: "A second look at {name} is noted.",
    didUnmark: "The mark is removed from {name}.",
    saveFailed: "This device could not save your change. It will not be kept after you leave.",
    filesHeading: "Files",
    downloadCsv: "Download my list (.csv)",
    downloadBackup: "Download a backup (.json)",
    filesNote: "The files are made on this device. Nothing is sent anywhere.",
    restoreHeading: "Restore from a backup",
    restoreLabel: "Backup file (.json)",
    restoreNote: "Only marks for observations saved on this device are brought back. A later mark is never replaced by an earlier one.",
    restoreFailed: "The file was not restored.",
  },
  fr: {
    link: "Mes soumissions",
    title: "Marquer ce que vous avez soumis",
    lead: "Gardez une liste des observations que vous avez soumises vous-même à OpenStreetMap. Vous les marquez ici. L’application ne peut pas voir OpenStreetMap, donc cette liste n’est que ce que vous lui dites. Rien n’est envoyé.",
    noDrafts: "Vous n’avez aucune observation enregistrée à marquer.",
    addLink: "Ajouter une observation",
    summaryHeading: "Où vous en êtes",
    nextHeading: "Pas encore marquées, les plus anciennes d’abord",
    nextNone: "Chaque observation enregistrée est marquée.",
    nextLine: "{name}, vu le {date}",
    followHeading: "Vous voudrez peut-être revoir",
    followLead: "Ce sont des suggestions. Revoir un lieu sur la carte peut montrer si votre modification y est toujours.",
    listHeading: "Vos observations",
    unnamed: "Lieu sans nom",
    seenLine: "Vu le {date}.",
    markHeading: "Marquer comme soumis",
    markedOnLabel: "Jour de la soumission (AAAA-MM-JJ)",
    changesetLabel: "Numéro de lot de modifications (facultatif)",
    changesetHelp: "Le numéro qu’OpenStreetMap a donné à votre modification. Vous pouvez le laisser vide. L’application ne peut pas vérifier qu’il existe.",
    noteLabel: "Note (facultatif)",
    markButton: "Marquer {name} comme soumis",
    markedLine: "Marqué comme soumis le {date}.",
    changesetLine: "Numéro de lot de modifications {id}.",
    noChangeset: "Aucun numéro de lot de modifications indiqué.",
    noteLine: "Note : {note}",
    lookedLine: "Vous avez noté un second regard le {date}.",
    noLook: "Aucun second regard noté.",
    lookLabel: "Jour où vous avez revu (AAAA-MM-JJ)",
    lookButton: "Noter un second regard sur {name}",
    unmarkButton: "Retirer la marque de {name}",
    errorSummary: "Corrigez ceci avant d’enregistrer :",
    didMark: "{name} est marqué comme soumis.",
    didLook: "Un second regard sur {name} est noté.",
    didUnmark: "La marque est retirée de {name}.",
    saveFailed: "Cet appareil n’a pas pu enregistrer votre changement. Il ne sera pas conservé quand vous partirez.",
    filesHeading: "Fichiers",
    downloadCsv: "Télécharger ma liste (.csv)",
    downloadBackup: "Télécharger une sauvegarde (.json)",
    filesNote: "Les fichiers sont faits sur cet appareil. Rien n’est envoyé.",
    restoreHeading: "Restaurer à partir d’une sauvegarde",
    restoreLabel: "Fichier de sauvegarde (.json)",
    restoreNote: "Seules les marques des observations enregistrées sur cet appareil reviennent. Une marque plus récente n’est jamais remplacée par une plus ancienne.",
    restoreFailed: "Le fichier n’a pas été restauré.",
  },
} as const;

export type SubmissionKey = keyof (typeof SUBMISSION_STRINGS)["en"];

export function submissionText(language: "en" | "fr", key: SubmissionKey, vars: Record<string, string | number> = {}): string {
  const template: string = SUBMISSION_STRINGS[language][key];
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

export function missingSubmissionKeys(): string[] {
  return (Object.keys(SUBMISSION_STRINGS.en) as SubmissionKey[]).filter(
    (key) => !(key in SUBMISSION_STRINGS.fr) || SUBMISSION_STRINGS.fr[key].trim() === "",
  );
}
