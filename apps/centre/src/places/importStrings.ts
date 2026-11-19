/**
 * Strings for the sheet screen (/places/import). Every English key has a French twin.
 * French uses U+2019 for the apostrophe, U+00A0 before ":" and "%", and U+202F before ; ! ?.
 * The screen reads a sheet of a person's own observations on the device. Nothing is uploaded,
 * nothing is saved before the person confirms, and an unclear status stays UNKNOWN.
 */
export const IMPORT_STRINGS = {
  en: {
    link: "Bring in a sheet",
    title: "Bring in a sheet of your own notes",
    lead: "If you wrote your observations in a spreadsheet, save it as CSV and open it here. The App reads it on this device and shows what it found before anything is saved. Nothing is uploaded.",
    columnsHeading: "What the sheet needs",
    columnsBody: "The first line holds the column names. Every place needs latitude, longitude, source, licence (CC0-1.0 or ODbL-1.0) and the date you saw it (YYYY-MM-DD). Name, status and id are optional. A status that is empty or unclear is kept as UNKNOWN.",
    templateButton: "Download an empty sheet (.csv)",
    mySheetButton: "Download my saved observations as a sheet (.csv)",
    fileLabel: "Sheet file (.csv)",
    pasteLabel: "Or paste the sheet text",
    checkButton: "Read this sheet",
    readFailed: "This device could not read the file.",
    nothingToRead: "Choose a file or paste the sheet text first.",
    problemHeading: "The sheet could not be read",
    resultHeading: "What the sheet holds",
    linesHeading: "Lines",
    lineLabel: "Line {line}",
    unnamed: "Place without a name",
    statusLine: "Status: {status}",
    changedLine: "Changes: {fields}",
    consentLabel: "These are my own observations, and I agree to share each one under the licence written on its line.",
    consentError: "Tick the box to confirm.",
    saveButton: "Save {count} to my observations",
    nothingToSave: "No line can be saved from this sheet.",
    saved: "{count} saved to your observations on this device.",
    savedPartly: "{count} saved, then this device could not save more.",
    saveFailed: "This device could not save the observations.",
    afterSave: "See them under Contribute, or check them before you submit.",
    checkLink: "Check before you submit",
    showOnlyProblems: "Show only lines with a problem",
    noProblemLines: "No line has a problem.",
    "field.lat": "latitude",
    "field.lon": "longitude",
    "field.name": "name",
    "field.wheelchair": "status",
    "field.source": "source",
    "field.licence": "licence",
    "field.observedOn": "date seen",
    "field.id": "id",
  },
  fr: {
    link: "Importer une feuille",
    title: "Importer une feuille de vos propres notes",
    lead: "Si vous avez écrit vos observations dans un tableur, enregistrez-le en CSV et ouvrez-le ici. L’application le lit sur cet appareil et montre ce qu’elle a trouvé avant tout enregistrement. Rien n’est envoyé.",
    columnsHeading: "Ce qu’il faut dans la feuille",
    columnsBody: "La première ligne contient les noms des colonnes. Chaque lieu a besoin de la latitude, de la longitude, de la source, de la licence (CC0-1.0 ou ODbL-1.0) et de la date où vous l’avez vu (AAAA-MM-JJ). Le nom, l’état et l’identifiant sont facultatifs. Un état vide ou peu clair est conservé comme UNKNOWN.",
    templateButton: "Télécharger une feuille vide (.csv)",
    mySheetButton: "Télécharger mes observations enregistrées en feuille (.csv)",
    fileLabel: "Fichier de la feuille (.csv)",
    pasteLabel: "Ou collez le texte de la feuille",
    checkButton: "Lire cette feuille",
    readFailed: "Cet appareil n’a pas pu lire le fichier.",
    nothingToRead: "Choisissez d’abord un fichier ou collez le texte de la feuille.",
    problemHeading: "La feuille n’a pas pu être lue",
    resultHeading: "Ce que contient la feuille",
    linesHeading: "Lignes",
    lineLabel: "Ligne {line}",
    unnamed: "Lieu sans nom",
    statusLine: "État\u00a0: {status}",
    changedLine: "Changements\u00a0: {fields}",
    consentLabel: "Ce sont mes propres observations, et j’accepte de partager chacune sous la licence écrite sur sa ligne.",
    consentError: "Cochez la case pour confirmer.",
    saveButton: "Enregistrer {count} dans mes observations",
    nothingToSave: "Aucune ligne de cette feuille ne peut être enregistrée.",
    saved: "{count} enregistrées dans vos observations sur cet appareil.",
    savedPartly: "{count} enregistrées, puis cet appareil n’a pas pu en enregistrer davantage.",
    saveFailed: "Cet appareil n’a pas pu enregistrer les observations.",
    afterSave: "Retrouvez-les sous Contribuer, ou contrôlez-les avant de soumettre.",
    checkLink: "Contrôle avant soumission",
    showOnlyProblems: "Montrer seulement les lignes avec un problème",
    noProblemLines: "Aucune ligne n’a de problème.",
    "field.lat": "latitude",
    "field.lon": "longitude",
    "field.name": "nom",
    "field.wheelchair": "état",
    "field.source": "source",
    "field.licence": "licence",
    "field.observedOn": "date d’observation",
    "field.id": "identifiant",
  },
} as const;

export type ImportKey = keyof (typeof IMPORT_STRINGS)["en"];

export function importText(language: "en" | "fr", key: ImportKey, vars: Record<string, string | number> = {}): string {
  const template: string = IMPORT_STRINGS[language][key];
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

export function missingImportKeys(): string[] {
  return (Object.keys(IMPORT_STRINGS.en) as ImportKey[]).filter(
    (key) => !(key in IMPORT_STRINGS.fr) || IMPORT_STRINGS.fr[key].trim() === "",
  );
}
