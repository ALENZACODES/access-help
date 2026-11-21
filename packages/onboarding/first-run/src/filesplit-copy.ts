import type { Locale } from "../../switch-first/src/index";
import { NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import type { AnswerFilter, FilterError } from "./filesplit";

/**
 * Words for "Split a notes file", in English and French. French copy uses ’,
 * U+00A0 before ":" and U+202F before ; ! ? and inside « ». A detail with no
 * record is the token UNKNOWN in French.
 */
export const FILE_SPLIT_COPY = {
  title: { en: "Split a notes file", fr: "Diviser un fichier de notes" },
  intro: {
    en: "Choose some of the notes in a notes export, with filters or one by one, and download them as their own file. You can also download the notes you did not choose.",
    fr: "Choisissez une partie des notes d’une exportation de notes, avec des filtres ou une à une, et téléchargez-les dans leur propre fichier. Vous pouvez aussi télécharger les notes que vous n’avez pas choisies.",
  },
  privacy: {
    en: "Nothing changes on this device: the file is read here, it is not saved and it is not sent anywhere. Choosing notes never changes them.",
    fr: `Rien ne change sur cet appareil${NB}: le fichier est lu ici, il n’est pas enregistré et n’est envoyé nulle part. Choisir des notes ne les modifie jamais.`,
  },
  pasteLabel: { en: "Text of the notes file", fr: "Texte du fichier de notes" },
  pasteHint: {
    en: "A notes export is made with “Export notes” on the Notes page.",
    fr: `Une exportation de notes se crée avec «${NN}Exporter les notes${NN}» sur la page Notes.`,
  },
  openLabel: { en: "Or open the file from this device", fr: "Ou ouvrez le fichier depuis cet appareil" },
  read: { en: "Read this file", fr: "Lire ce fichier" },
  clear: { en: "Remove the file and every choice", fr: "Retirer le fichier et tous les choix" },
  cleared: { en: "The box is empty. Nothing was saved.", fr: "La zone est vide. Rien n’a été enregistré." },
  opened: { en: "The file is in the box. Choose Read this file when ready.", fr: "Le fichier est dans la zone. Choisissez Lire ce fichier quand vous êtes prêt." },
  readFailed: { en: "That file could not be opened. Try pasting its text instead.", fr: "Ce fichier n’a pas pu être ouvert. Essayez plutôt de coller son texte." },
  errorsTitle: { en: "Fix these first", fr: "À corriger d’abord" },
  fileRead: { en: "notes read from the file", fr: "notes lues dans le fichier" },
  filtersTitle: { en: "Choose with filters", fr: "Choisir avec des filtres" },
  filtersHint: {
    en: "Notes that pass every filter you set are chosen. With no filter set, no note is chosen until you tick it.",
    fr: "Les notes qui passent tous les filtres choisis sont retenues. Sans filtre, aucune note n’est retenue tant que vous ne la cochez pas.",
  },
  wordsLabel: { en: "Words in the place name or address", fr: "Mots dans le nom du lieu ou l’adresse" },
  wordsHint: { en: "Every word must appear. Capitals and accents do not matter.", fr: "Chaque mot doit figurer. Les majuscules et les accents ne comptent pas." },
  detailLabel: { en: "Detail", fr: "Détail" },
  anyDetail: { en: "Any detail (no filter)", fr: "N’importe quel détail (aucun filtre)" },
  answerLabel: { en: "Answer for that detail", fr: "Réponse pour ce détail" },
  answers: {
    any: { en: "Any recorded Yes or No", fr: "Tout Oui ou Non enregistré" },
    yes: { en: "Yes", fr: "Oui" },
    no: { en: "No", fr: "Non" },
    unknown: { en: "Unknown (no record)", fr: "UNKNOWN (aucune donnée)" },
  },
  sourceLabel: { en: "Source of a record", fr: "Source d’une donnée" },
  anySource: { en: "Any source", fr: "N’importe quelle source" },
  licenceLabel: { en: "Licence", fr: "Licence" },
  anyLicence: { en: "Any licence", fr: "N’importe quelle licence" },
  fromLabel: { en: "Records dated from (YYYY-MM-DD)", fr: "Données datées à partir du (AAAA-MM-JJ)" },
  toLabel: { en: "Records dated up to (YYYY-MM-DD)", fr: "Données datées jusqu’au (AAAA-MM-JJ)" },
  apply: { en: "Apply the filters", fr: "Appliquer les filtres" },
  resetFilters: { en: "Remove every filter", fr: "Retirer tous les filtres" },
  applied: { en: "Filters applied.", fr: "Filtres appliqués." },
  notesTitle: { en: "Notes in the file", fr: "Notes du fichier" },
  notesHint: {
    en: "Tick a note to choose it, or untick it to leave it out, whatever the filters say.",
    fr: "Cochez une note pour la retenir, ou décochez-la pour l’écarter, quoi que disent les filtres.",
  },
  byHand: { en: "chosen by hand", fr: "choisie à la main" },
  leftByHand: { en: "left out by hand", fr: "écartée à la main" },
  chooseNote: { en: "Choose", fr: "Retenir" },
  chosenTitle: { en: "The chosen notes", fr: "Les notes retenues" },
  countsCaption: { en: "Answers in the chosen notes", fr: "Réponses dans les notes retenues" },
  countsDetail: { en: "Detail", fr: "Détail" },
  countsYes: { en: "Yes", fr: "Oui" },
  countsNo: { en: "No", fr: "Non" },
  countsUnknown: { en: "No record (Unknown)", fr: "Aucune donnée (UNKNOWN)" },
  notRanked: {
    en: "These are counts of answers, not a score. Unknown does not mean No.",
    fr: "Ce sont des nombres de réponses, pas une note. UNKNOWN ne veut pas dire Non.",
  },
  downloadChosen: { en: "Download the chosen notes", fr: "Télécharger les notes retenues" },
  downloadRest: { en: "Download the notes not chosen", fr: "Télécharger les notes non retenues" },
  downloadCsv: { en: "Download the chosen notes as a spreadsheet (CSV)", fr: "Télécharger les notes retenues en tableur (CSV)" },
  noneChosen: { en: "No note is chosen yet.", fr: "Aucune note n’est retenue pour le moment." },
  allChosen: { en: "Every note is chosen, so nothing is left for a second file.", fr: "Toutes les notes sont retenues, il ne reste donc rien pour un second fichier." },
  updated: { en: "The choice is updated.", fr: "Le choix est mis à jour." },
  filterErrors: {
    "bad-from": { en: "The start date is not a real date in the form YYYY-MM-DD.", fr: "La date de début n’est pas une vraie date au format AAAA-MM-JJ." },
    "bad-to": { en: "The end date is not a real date in the form YYYY-MM-DD.", fr: "La date de fin n’est pas une vraie date au format AAAA-MM-JJ." },
    "from-after-to": { en: "The start date is after the end date.", fr: "La date de début est après la date de fin." },
    "bad-detail": { en: "Choose a detail from the list.", fr: "Choisissez un détail dans la liste." },
    "bad-answer": { en: "Choose an answer from the list.", fr: "Choisissez une réponse dans la liste." },
    "bad-licence": { en: "Choose a licence from the list.", fr: "Choisissez une licence dans la liste." },
  },
  errors: {
    empty: { en: "The box is empty. Paste the file’s text or open it.", fr: "La zone est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The file is too large to read here.", fr: "Le fichier est trop volumineux pour être lu ici." },
    "not-json": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-format": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-version": { en: "This export comes from a different version and cannot be read.", fr: "Cette exportation provient d’une autre version et ne peut pas être lue." },
    "no-notes": { en: "This file has no note the App can read.", fr: "Ce fichier ne contient aucune note lisible par l’App." },
  },
} as const;

export function answerFilterText(a: AnswerFilter, l: Locale): string {
  return t(FILE_SPLIT_COPY.answers[a], l);
}

export function filterErrorText(e: FilterError, l: Locale): string {
  return t(FILE_SPLIT_COPY.filterErrors[e], l);
}

export function splitErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_SPLIT_COPY.errors[e], l);
}

/** "12 notes read from the file, 1 entry left out." */
export function fileReadText(notes: number, leftOut: number, l: Locale): string {
  if (l === "fr") return `${notes} ${t(FILE_SPLIT_COPY.fileRead, l)}, ${leftOut} ${leftOut > 1 ? "entrées écartées" : "entrée écartée"}.`;
  return `${notes} ${t(FILE_SPLIT_COPY.fileRead, l)}, ${leftOut} ${leftOut === 1 ? "entry" : "entries"} left out.`;
}

/** "3 of 12 notes chosen." */
export function chosenText(chosen: number, total: number, l: Locale): string {
  if (l === "fr") return `${chosen} ${chosen > 1 ? "notes retenues" : "note retenue"} sur ${total}.`;
  return `${chosen} of ${total} ${total === 1 ? "note" : "notes"} chosen.`;
}

/** The label of one note's box names the note, so every box has its own name. */
export function chooseNoteText(name: string, id: string, l: Locale): string {
  return l === "fr" ? `${t(FILE_SPLIT_COPY.chooseNote, l)} ${name} (identifiant ${id})` : `${t(FILE_SPLIT_COPY.chooseNote, l)} ${name} (id ${id})`;
}

/** ASCII file names with the date. */
export function splitFilename(kind: "chosen" | "rest" | "csv", today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  if (kind === "csv") return l === "fr" ? `notes-retenues-${day}.csv` : `notes-chosen-${day}.csv`;
  if (kind === "chosen") return l === "fr" ? `notes-retenues-${day}.json` : `notes-chosen-${day}.json`;
  return l === "fr" ? `notes-non-retenues-${day}.json` : `notes-not-chosen-${day}.json`;
}

/** "Filters: words “king”; Elevator, Yes." in plain words, for the status line. */
export function filtersSummary(parts: readonly string[], l: Locale): string {
  if (parts.length === 0) return l === "fr" ? "Aucun filtre." : "No filter.";
  return l === "fr" ? `Filtres${NB}: ${parts.join(`${NN}; `)}.` : `Filters: ${parts.join("; ")}.`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileSplitStrings(): Array<[string, Pair]> {
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
  walk("fileSplit", FILE_SPLIT_COPY);
  return out;
}
