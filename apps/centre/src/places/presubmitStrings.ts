/**
 * Strings for the check screen (/places/check). Every English key has a French twin.
 * French uses U+2019 for the apostrophe, U+00A0 before ":" and "%", and U+202F before ; ! ?.
 * The screen looks for slips before a person submits to OpenStreetMap themselves. The App
 * cannot see OpenStreetMap, uploads nothing, and never says an edit will be taken.
 */
export const PRESUBMIT_STRINGS = {
  en: {
    link: "Check before you submit",
    title: "Check before you submit",
    lead: "Look over your saved observations before you add them to OpenStreetMap yourself. The checks look for slips. They do not say the map will take an edit. Nothing is uploaded.",
    noDrafts: "You have no saved observations to check.",
    addLink: "Add an observation",
    onlyOpen: "Show only places with something to fix or look at",
    stepsHeading: "How you submit it yourself",
    wordsHeading: "Words for the changeset",
    wordsLead: "Change these so they are true for what you did. The App does not send them anywhere.",
    commentLabel: "Changeset comment",
    sourceLabel: "Changeset source",
    copy: "Copy",
    copyField: "Copy {what}",
    copied: "Copied.",
    copyFailed: "This browser did not allow copying. Select the text and copy it yourself.",
    placesHeading: "Your places",
    noneShown: "Nothing here has something to fix or look at.",
    unnamed: "Place without a name",
    meta: "Seen on {date}. Source: {source}. Licence: {licence}.",
    tagsHeading: "Tags to add",
    noTags: "There is nothing to add for this place.",
    copyTags: "Copy the tags for {name}",
    tidyHeading: "Tidy the typed text",
    tidyLine: "{field}: “{before}” becomes “{after}”",
    tidyName: "Name",
    tidySource: "Source",
    tidyButton: "Tidy the text of {name}",
    didTidy: "The text of {name} is tidied and saved on this device.",
    saveFailed: "This device could not save your change.",
    filesHeading: "Files",
    downloadText: "Download the report (.txt)",
    downloadCsv: "Download the report (.csv)",
    filesNote: "The files are made on this device. Nothing is sent anywhere.",
  },
  fr: {
    link: "Contrôle avant soumission",
    title: "Contrôler avant de soumettre",
    lead: "Relisez vos observations enregistrées avant de les ajouter vous-même à OpenStreetMap. Les contrôles cherchent des oublis. Ils ne disent pas que la carte acceptera une modification. Rien n’est envoyé.",
    noDrafts: "Vous n’avez aucune observation enregistrée à contrôler.",
    addLink: "Ajouter une observation",
    onlyOpen: "Montrer seulement les lieux à corriger ou à revoir",
    stepsHeading: "Comment vous la soumettez vous-même",
    wordsHeading: "Mots pour le lot de modifications",
    wordsLead: "Changez-les pour qu’ils soient vrais pour ce que vous avez fait. L’application ne les envoie nulle part.",
    commentLabel: "Commentaire du lot de modifications",
    sourceLabel: "Source du lot de modifications",
    copy: "Copier",
    copyField: "Copier {what}",
    copied: "Copié.",
    copyFailed: "Ce navigateur n’a pas permis la copie. Sélectionnez le texte et copiez-le vous-même.",
    placesHeading: "Vos lieux",
    noneShown: "Rien ici n’est à corriger ou à revoir.",
    unnamed: "Lieu sans nom",
    meta: "Vu le {date}. Source : {source}. Licence : {licence}.",
    tagsHeading: "Étiquettes à ajouter",
    noTags: "Il n’y a rien à ajouter pour ce lieu.",
    copyTags: "Copier les étiquettes de {name}",
    tidyHeading: "Ranger le texte saisi",
    tidyLine: "{field} : «\u202f{before}\u202f» devient «\u202f{after}\u202f»",
    tidyName: "Nom",
    tidySource: "Source",
    tidyButton: "Ranger le texte de {name}",
    didTidy: "Le texte de {name} est rangé et enregistré sur cet appareil.",
    saveFailed: "Cet appareil n’a pas pu enregistrer votre changement.",
    filesHeading: "Fichiers",
    downloadText: "Télécharger le rapport (.txt)",
    downloadCsv: "Télécharger le rapport (.csv)",
    filesNote: "Les fichiers sont faits sur cet appareil. Rien n’est envoyé.",
  },
} as const;

export type PresubmitKey = keyof (typeof PRESUBMIT_STRINGS)["en"];

export function presubmitText(language: "en" | "fr", key: PresubmitKey, vars: Record<string, string | number> = {}): string {
  const template: string = PRESUBMIT_STRINGS[language][key];
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

export function missingPresubmitKeys(): string[] {
  return (Object.keys(PRESUBMIT_STRINGS.en) as PresubmitKey[]).filter(
    (key) => !(key in PRESUBMIT_STRINGS.fr) || PRESUBMIT_STRINGS.fr[key].trim() === "",
  );
}
