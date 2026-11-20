/**
 * Strings for the tag page (/places/tags). Every English key has a French twin.
 * French uses U+2019 for the apostrophe, U+00A0 before ":" and "%", U+202F before ; ! ? and
 * inside « ». The page shows the OpenStreetMap tags for one of a person's own observations so
 * they can type them by hand. The App adds nothing to the map and cannot see what was saved there.
 */
export const TAGS_STRINGS = {
  en: {
    link: "Tags to type",
    title: "Tags to type by hand",
    lead: "See the OpenStreetMap tags for one of your own observations before you type them in an editor. Everything is worked out on this device and nothing is uploaded.",
    noNotes: "You have no saved observations.",
    addLink: "Add an observation",
    chooseLabel: "Observation",
    unnamed: "Place without a name",
    optionLabel: "{name}, {day}, {status}",
    shown: "Showing the tags for {name}.",
    recordHeading: "This observation",
    tagsHeading: "Tags",
    tagsCaption: "Tags for this observation, the same as in the App’s OpenStreetMap file.",
    colKey: "Key",
    colValue: "Value",
    noTags: "There is no tag to type for this observation.",
    copyLabel: "Tags to copy",
    copyHelp: "Select the text and copy it, or type the tags one at a time.",
    heldBackHeading: "Left out",
    problemsHeading: "Look at these before you type",
    stepsHeading: "Steps",
    pasteHeading: "Beside the tags on the map",
    pasteLabel: "Tags on the map now",
    pasteHelp: "Optional. In the editor, open the text view of the tags, copy the lines and paste them here, one key=value per line. They stay on this page and are not saved.",
    clearPaste: "Clear the pasted tags",
    pasteCleared: "The pasted tags are cleared.",
    compareCaption: "Your tags beside the tags on the map.",
    colMine: "Yours",
    colOnMap: "On the map",
    colWhat: "What typing would do",
    none: "none",
    cautionsHeading: "Before you change anything",
    changesetHeading: "Changeset draft",
    commentLabel: "Comment draft",
    sourceLabel: "Source draft",
    filesHeading: "File",
    download: "Download this sheet (.txt)",
    filesNote: "The sheet is made on this device. It holds the tags, the steps and the draft. No file is sent anywhere.",
    checkLink: "Check my observations before I add them",
  },
  fr: {
    link: "Balises à taper",
    title: "Balises à taper à la main",
    lead: "Voyez les balises OpenStreetMap d’une de vos propres observations avant de les taper dans un éditeur. Tout est calculé sur cet appareil et rien n’est envoyé.",
    noNotes: "Vous n’avez aucune observation enregistrée.",
    addLink: "Ajouter une observation",
    chooseLabel: "Observation",
    unnamed: "Lieu sans nom",
    optionLabel: "{name}, {day}, {status}",
    shown: "Balises affichées pour {name}.",
    recordHeading: "Cette observation",
    tagsHeading: "Balises",
    tagsCaption: "Balises de cette observation, les mêmes que dans le fichier OpenStreetMap de l’application.",
    colKey: "Clé",
    colValue: "Valeur",
    noTags: "Il n’y a aucune balise à taper pour cette observation.",
    copyLabel: "Balises à copier",
    copyHelp: "Sélectionnez le texte et copiez-le, ou tapez les balises une à la fois.",
    heldBackHeading: "Laissé de côté",
    problemsHeading: "À regarder avant de taper",
    stepsHeading: "Étapes",
    pasteHeading: "À côté des balises de la carte",
    pasteLabel: "Balises sur la carte maintenant",
    pasteHelp: "Facultatif. Dans l’éditeur, ouvrez la vue texte des balises, copiez les lignes et collez-les ici, une clé=valeur par ligne. Elles restent sur cette page et ne sont pas enregistrées.",
    clearPaste: "Effacer les balises collées",
    pasteCleared: "Les balises collées sont effacées.",
    compareCaption: "Vos balises à côté des balises de la carte.",
    colMine: "Les vôtres",
    colOnMap: "Sur la carte",
    colWhat: "Ce que la saisie ferait",
    none: "aucune",
    cautionsHeading: "Avant de changer quoi que ce soit",
    changesetHeading: "Brouillon du lot de modifications",
    commentLabel: "Brouillon du commentaire",
    sourceLabel: "Brouillon de la source",
    filesHeading: "Fichier",
    download: "Télécharger cette fiche (.txt)",
    filesNote: "La fiche est faite sur cet appareil. Elle contient les balises, les étapes et le brouillon. Aucun fichier n’est envoyé où que ce soit.",
    checkLink: "Contrôler mes observations avant de les ajouter",
  },
} as const;

export type TagsKey = keyof (typeof TAGS_STRINGS)["en"];

export function tagsText(language: "en" | "fr", key: TagsKey, vars: Record<string, string | number> = {}): string {
  const template: string = TAGS_STRINGS[language][key];
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

export function missingTagsKeys(): string[] {
  return (Object.keys(TAGS_STRINGS.en) as TagsKey[]).filter((key) => !(key in TAGS_STRINGS.fr) || TAGS_STRINGS.fr[key].trim() === "");
}
