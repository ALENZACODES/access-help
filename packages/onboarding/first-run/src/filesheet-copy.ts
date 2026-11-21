import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, NN, t, type Pair } from "./copy";
import { ROW_PROBLEMS, type RowProblemCode } from "./csvimport";
import type { SetupError, SheetError, Target } from "./filesheet";
import type { SetupFileError } from "./filesheet-setup";

/**
 * Words for "Make a notes file from your own spreadsheet", in English and
 * French. French copy uses ’, U+00A0 before ":" and U+202F before ; ! ? and
 * inside « ». A blank answer is the token UNKNOWN in French.
 */
export const FILE_SHEET_COPY = {
  title: { en: "Make a notes file from your own spreadsheet", fr: "Créer un fichier de notes à partir de votre tableur" },
  intro: {
    en: "Bring in a spreadsheet with your own column names and your own words for yes and no, say what each column holds, and download a notes file. A blank answer stays Unknown.",
    fr: "Ajoutez un tableur avec vos propres noms de colonnes et vos propres mots pour oui et non, indiquez ce que contient chaque colonne, et téléchargez un fichier de notes. Une réponse vide reste UNKNOWN.",
  },
  privacy: {
    en: "Nothing changes on this device: the spreadsheet is read here, it is not saved and it is not sent anywhere.",
    fr: `Rien ne change sur cet appareil${NB}: le tableur est lu ici, il n’est pas enregistré et n’est envoyé nulle part.`,
  },
  pasteLabel: { en: "Rows of the spreadsheet", fr: "Lignes du tableur" },
  pasteHint: {
    en: "Save the spreadsheet as CSV, or copy its cells, first row included, and paste them here.",
    fr: "Enregistrez le tableur en CSV, ou copiez ses cellules, première ligne comprise, et collez-les ici.",
  },
  openLabel: { en: "Or open a CSV file from this device", fr: "Ou ouvrez un fichier CSV depuis cet appareil" },
  read: { en: "Read the spreadsheet", fr: "Lire le tableur" },
  clear: { en: "Remove the spreadsheet and every choice", fr: "Retirer le tableur et tous les choix" },
  cleared: { en: "The page is empty. Nothing was saved.", fr: "La page est vide. Rien n’a été enregistré." },
  opened: { en: "The file is in the box. Choose Read the spreadsheet when ready.", fr: "Le fichier est dans la zone. Choisissez Lire le tableur quand vous êtes prêt." },
  readFailed: { en: "That file could not be opened. Try pasting its rows instead.", fr: "Ce fichier n’a pas pu être ouvert. Essayez plutôt de coller ses lignes." },
  errorsTitle: { en: "Fix these first", fr: "À corriger d’abord" },
  columnsTitle: { en: "What each column holds", fr: "Ce que contient chaque colonne" },
  columnsHint: {
    en: "The first choices are guesses from the column names. Check each one. Columns marked Not used are left out.",
    fr: "Les premiers choix sont devinés à partir des noms de colonnes. Revoyez chacun. Les colonnes marquées Pas utilisée sont laissées de côté.",
  },
  example: { en: "For example", fr: "Par exemple" },
  targets: {
    none: { en: "Not used", fr: "Pas utilisée" },
    place_name: { en: "Place name", fr: "Nom du lieu" },
    address: { en: "Address", fr: "Adresse" },
    source: { en: "Source of the answers", fr: "Source des réponses" },
    licence: { en: "Licence of the answers", fr: "Licence des réponses" },
    recorded_on: { en: "Day the answers were recorded (YYYY-MM-DD)", fr: "Jour de saisie des réponses (AAAA-MM-JJ)" },
  },
  answerOf: { en: "Answer for", fr: "Réponse pour" },
  fixedTitle: { en: "Where the answers come from", fr: "D’où viennent les réponses" },
  fixedHint: {
    en: "If no column holds the source, the licence or the day, give it here for every row. Nothing is filled in for you.",
    fr: "Si aucune colonne ne contient la source, la licence ou le jour, indiquez-les ici pour toutes les lignes. Rien n’est rempli à votre place.",
  },
  sourceLabel: { en: "Source, for every row", fr: "Source, pour toutes les lignes" },
  sourceHint: { en: "Who recorded the answers, for example “Mapping day, Elm Street”.", fr: `Qui a noté les réponses, par exemple «${NN}Journée de cartographie, rue Elm${NN}».` },
  licenceLabel: { en: "Open licence, for every row", fr: "Licence ouverte, pour toutes les lignes" },
  chooseLicence: { en: "Choose a licence", fr: "Choisissez une licence" },
  dateLabel: { en: "Day recorded, for every row (YYYY-MM-DD)", fr: "Jour de saisie, pour toutes les lignes (AAAA-MM-JJ)" },
  wordsTitle: { en: "Your words for the answers", fr: "Vos mots pour les réponses" },
  wordsHint: {
    en: "Separate words with commas. Capitals and accents do not matter. A blank cell is always Unknown, and a word in no list is not used.",
    fr: "Séparez les mots par des virgules. Les majuscules et les accents ne comptent pas. Une cellule vide est toujours UNKNOWN, et un mot absent des listes n’est pas utilisé.",
  },
  yesWords: { en: "Words that mean Yes", fr: "Mots qui veulent dire Oui" },
  noWords: { en: "Words that mean No", fr: "Mots qui veulent dire Non" },
  unknownWords: { en: "Words that mean Unknown", fr: "Mots qui veulent dire UNKNOWN" },
  make: { en: "Make the notes file", fr: "Créer le fichier de notes" },
  resultsTitle: { en: "The notes file", fr: "Le fichier de notes" },
  countsCaption: { en: "What came out of the spreadsheet", fr: "Ce qui sort du tableur" },
  countsWhat: { en: "From the spreadsheet", fr: "Du tableur" },
  countsNumber: { en: "Count", fr: "Nombre" },
  rows: {
    read: { en: "Rows read", fr: "Lignes lues" },
    notes: { en: "Notes made", fr: "Notes créées" },
    problems: { en: "Rows with something not used", fr: "Lignes avec un élément non utilisé" },
    nothingKnown: { en: "Places with no Yes or No, left out", fr: "Lieux sans Oui ni Non, écartés" },
    noRoom: { en: "Notes past the most one device keeps (200)", fr: "Notes au-delà du maximum d’un appareil (200)" },
  },
  unmatchedTitle: { en: "Answers in none of your word lists", fr: "Réponses absentes de vos listes de mots" },
  unmatchedHint: {
    en: "These were not used. Add them to a word list and make the file again, or leave them out.",
    fr: "Elles n’ont pas été utilisées. Ajoutez-les à une liste de mots et recréez le fichier, ou laissez-les de côté.",
  },
  problemsTitle: { en: "Rows with something not used", fr: "Lignes avec un élément non utilisé" },
  moreProblems: { en: "Only the first 100 are listed. The download has every row.", fr: "Seules les 100 premières sont listées. Le téléchargement contient toutes les lignes." },
  noProblems: { en: "Every row was used.", fr: "Toutes les lignes ont été utilisées." },
  noNotes: { en: "No note could be made. Check the columns, the words and where the answers come from.", fr: "Aucune note n’a pu être créée. Revoyez les colonnes, les mots et la provenance des réponses." },
  downloadNotes: { en: "Download the notes file", fr: "Télécharger le fichier de notes" },
  downloadProblems: { en: "Download the rows not used, with the reason (CSV)", fr: "Télécharger les lignes non utilisées, avec la raison (CSV)" },
  downloadAppCsv: { en: "Download the spreadsheet in the App’s columns (CSV)", fr: "Télécharger le tableur avec les colonnes de l’App (CSV)" },
  updated: { en: "The notes file is updated.", fr: "Le fichier de notes est mis à jour." },
  savedTitle: { en: "Saved choices", fr: "Choix enregistrés" },
  savedHint: {
    en: "If you bring in the same kind of spreadsheet again, download these choices and open them next time. Columns are matched by name. The file stays with you.",
    fr: "Si vous ajoutez de nouveau le même genre de tableur, téléchargez ces choix et ouvrez-les la prochaine fois. Les colonnes sont associées par leur nom. Le fichier reste chez vous.",
  },
  downloadSetup: { en: "Download these choices", fr: "Télécharger ces choix" },
  openSetup: { en: "Open saved choices", fr: "Ouvrir des choix enregistrés" },
  setupApplied: { en: "The saved choices are filled in. Check them, then choose Make the notes file.", fr: "Les choix enregistrés sont remplis. Revoyez-les, puis choisissez Créer le fichier de notes." },
  setupFileErrors: {
    empty: { en: "The choices file is empty.", fr: "Le fichier de choix est vide." },
    "too-large": { en: "The choices file is too large.", fr: "Le fichier de choix est trop volumineux." },
    "not-json": { en: "That file is not a choices file.", fr: "Ce fichier n’est pas un fichier de choix." },
    "wrong-format": { en: "That file is not a choices file.", fr: "Ce fichier n’est pas un fichier de choix." },
    "wrong-version": { en: "That choices file comes from a different version.", fr: "Ce fichier de choix provient d’une autre version." },
  },
  badAnswer: { en: "This answer is in none of your word lists.", fr: "Cette réponse ne figure dans aucune de vos listes de mots." },
  sheetErrors: {
    empty: { en: "The box is empty. Paste the rows or open a file.", fr: "La zone est vide. Collez les lignes ou ouvrez un fichier." },
    "too-large": { en: "This is too large to read here.", fr: "C’est trop volumineux pour être lu ici." },
    "unclosed-quote": { en: "A quotation mark is opened and never closed.", fr: "Un guillemet est ouvert et jamais fermé." },
    "too-many-rows": { en: "There are more than 5000 rows. Split the spreadsheet first.", fr: "Il y a plus de 5000 lignes. Divisez d’abord le tableur." },
    "no-rows": { en: "There is a first row but no rows under it.", fr: "Il y a une première ligne, mais aucune ligne en dessous." },
  },
  setupErrors: {
    "no-place-column": { en: "Choose the column that holds the place name.", fr: "Choisissez la colonne qui contient le nom du lieu." },
    "no-detail-column": { en: "Choose at least one column that holds an answer for a detail.", fr: "Choisissez au moins une colonne qui contient une réponse pour un détail." },
    "two-columns": { en: "Two columns are set to the same thing. Choose one.", fr: "Deux colonnes sont réglées sur la même chose. Choisissez-en une." },
    "no-source": { en: "Give the source of the answers, or choose the column that holds it.", fr: "Indiquez la source des réponses, ou choisissez la colonne qui la contient." },
    "source-too-long": { en: "The source is longer than 200 characters.", fr: "La source dépasse 200 caractères." },
    "source-control": { en: "The source contains a character that cannot be kept.", fr: "La source contient un caractère qui ne peut pas être gardé." },
    "bad-licence": { en: "Choose an open licence for the answers, or the column that holds it.", fr: "Choisissez une licence ouverte pour les réponses, ou la colonne qui la contient." },
    "bad-date": { en: "Give the day the answers were recorded as YYYY-MM-DD, or choose its column.", fr: "Indiquez le jour de saisie des réponses au format AAAA-MM-JJ, ou choisissez sa colonne." },
    "future-date": { en: "The day the answers were recorded is after today.", fr: "Le jour de saisie des réponses est après aujourd’hui." },
    "word-in-two-lists": { en: "is in two word lists. Keep it in one.", fr: "figure dans deux listes de mots. Gardez-le dans une seule." },
  },
} as const;

export function setupFileErrorText(e: SetupFileError, l: Locale): string {
  return t(FILE_SHEET_COPY.setupFileErrors[e], l);
}

export function sheetErrorText(e: SheetError, l: Locale): string {
  return t(FILE_SHEET_COPY.sheetErrors[e], l);
}

/** A setup problem in words. A word in two lists is named, in quotes. */
export function setupErrorText(code: SetupError, l: Locale, word?: string): string {
  const text = t(FILE_SHEET_COPY.setupErrors[code], l);
  if (code !== "word-in-two-lists") return text;
  return l === "fr" ? `«${NN}${word ?? ""}${NN}» ${text}` : `“${word ?? ""}” ${text}`;
}

/** What a target is called in the column lists. */
export function targetText(target: Target, l: Locale): string {
  if (target === "") return t(FILE_SHEET_COPY.targets.none, l);
  if (target === "place_name" || target === "address" || target === "source" || target === "licence" || target === "recorded_on") return t(FILE_SHEET_COPY.targets[target], l);
  return `${t(FILE_SHEET_COPY.answerOf, l)} ${t(COPY.facts[target], l).toLowerCase()}`;
}

/** The reason a row was not used. An answer word in no list says so in the person's terms. */
export function rowReasonText(code: RowProblemCode, l: Locale): string {
  return code === "bad-value" ? t(FILE_SHEET_COPY.badAnswer, l) : t(ROW_PROBLEMS[code], l);
}

/** "Column 3: Ramp?" — the label of a column's choice; the name is the person's own text. */
export function columnLabel(index: number, name: string, l: Locale): string {
  return l === "fr" ? `Colonne ${index + 1}${NB}: ${name}` : `Column ${index + 1}: ${name}`;
}

/** "Row 4, column Ascenseur: This answer is in none of your word lists." */
export function problemLine(row: number, column: string | undefined, reason: string, l: Locale): string {
  const head = l === "fr" ? `Ligne ${row}` : `Row ${row}`;
  const col = column === undefined || column === "" ? "" : l === "fr" ? `, colonne ${column}` : `, column ${column}`;
  return l === "fr" ? `${head}${col}${NB}: ${reason}` : `${head}${col}: ${reason}`;
}

/** "“maybe” (3 cells)" for the list of answers in no word list; the word is the person's own text. */
export function unmatchedText(word: string, count: number, l: Locale): string {
  if (l === "fr") return `«${NN}${word}${NN}» (${count} ${count > 1 ? "cellules" : "cellule"})`;
  return `“${word}” (${count} ${count === 1 ? "cell" : "cells"})`;
}

/** "These saved columns are not in this spreadsheet: Ramp, Notes." The names are the person's own. */
export function missingColumnsText(names: readonly string[], l: Locale): string {
  if (names.length === 0) return "";
  return l === "fr" ? `Colonnes enregistrées absentes de ce tableur${NB}: ${names.join(", ")}.` : `Saved columns not in this spreadsheet: ${names.join(", ")}.`;
}

/** Announced once the notes are made. */
export function madeText(notes: number, problems: number, l: Locale): string {
  if (l === "fr") return `${notes} ${notes > 1 ? "notes créées" : "note créée"}. Lignes avec un élément non utilisé${NB}: ${problems}.`;
  return `${notes} ${notes === 1 ? "note" : "notes"} made. Rows with something not used: ${problems}.`;
}

/** Announced once the spreadsheet is read. */
export function readText(columns: number, rows: number, l: Locale): string {
  if (l === "fr") return `Tableur lu${NB}: ${columns} ${columns > 1 ? "colonnes" : "colonne"}, ${rows} ${rows > 1 ? "lignes" : "ligne"}.`;
  return `Spreadsheet read: ${columns} ${columns === 1 ? "column" : "columns"}, ${rows} ${rows === 1 ? "row" : "rows"}.`;
}

export function sheetFilename(kind: "notes" | "problems" | "app", today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  if (kind === "notes") return l === "fr" ? `notes-du-tableur-${day}.json` : `notes-from-spreadsheet-${day}.json`;
  if (kind === "problems") return l === "fr" ? `lignes-non-utilisees-${day}.csv` : `rows-not-used-${day}.csv`;
  return l === "fr" ? `tableur-colonnes-app-${day}.csv` : `spreadsheet-app-columns-${day}.csv`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileSheetStrings(): Array<[string, Pair]> {
  const out: Array<[string, Pair]> = [];
  const walk = (path: string, v: unknown): void => {
    if (!v || typeof v !== "object") return;
    const o = v as Record<string, unknown>;
    if (typeof o["en"] === "string" && typeof o["fr"] === "string") {
      out.push([path, { en: o["en"], fr: o["fr"] }]);
      return;
    }
    for (const [k, c] of Object.entries(o)) walk(`${path}.${k}`, c);
  };
  walk("fileSheet", FILE_SHEET_COPY);
  return out;
}
