import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import type { FactKey } from "./facts";
import type { QuestionReason } from "./plan";

/**
 * Words for "Questions to ask", in English and French. French copy uses ’,
 * U+00A0 before ":" and U+202F before ; ! ? and inside « ». A detail with no
 * record is the token UNKNOWN in French.
 */
export const FILE_ASK_COPY = {
  title: { en: "Questions to ask", fr: "Questions à poser" },
  intro: {
    en: "For the places in a notes export, the questions to ask each place about details that are Unknown, where reports differ, or where the newest record is a year old or more.",
    fr: "Pour les lieux d’une exportation de notes, les questions à poser à chaque lieu sur les détails UNKNOWN, ceux où les rapports divergent, ou ceux dont la donnée la plus récente a un an ou plus.",
  },
  privacy: {
    en: "Nothing changes on this device and nobody is contacted. An answer becomes a record only when you add a note with a source, a licence and a date.",
    fr: "Rien ne change sur cet appareil et personne n’est contacté. Une réponse devient une donnée seulement quand vous ajoutez une note avec une source, une licence et une date.",
  },
  pasteLabel: { en: "Text of the notes file", fr: "Texte du fichier de notes" },
  pasteHint: {
    en: "A notes export is made with “Export notes” on the Notes page.",
    fr: `Une exportation de notes se crée avec «${NN}Exporter les notes${NN}» sur la page Notes.`,
  },
  openLabel: { en: "Or open the file from this device", fr: "Ou ouvrez le fichier depuis cet appareil" },
  read: { en: "Make the list of questions", fr: "Préparer la liste des questions" },
  clear: { en: "Remove the file and the list", fr: "Retirer le fichier et la liste" },
  cleared: { en: "The page is empty. Nothing was saved.", fr: "La page est vide. Rien n’a été enregistré." },
  opened: { en: "The file is in the box. Choose Make the list when ready.", fr: "Le fichier est dans la zone. Choisissez Préparer la liste quand vous êtes prêt." },
  readFailed: { en: "That file could not be opened. Try pasting its text instead.", fr: "Ce fichier n’a pas pu être ouvert. Essayez plutôt de coller son texte." },
  errorsTitle: { en: "Fix this first", fr: "À corriger d’abord" },
  optionsTitle: { en: "What to ask about", fr: "Sur quoi poser des questions" },
  detailsLegend: { en: "Details to ask about", fr: "Détails à demander" },
  detailsHint: { en: "At least one detail stays ticked.", fr: "Au moins un détail reste coché." },
  includeOld: {
    en: "Also ask whether answers a year old or more are still the case",
    fr: "Demander aussi si les réponses d’un an ou plus sont toujours valables",
  },
  searchLabel: { en: "Only places with these words in the name or address", fr: "Seulement les lieux avec ces mots dans le nom ou l’adresse" },
  update: { en: "Update the list", fr: "Mettre la liste à jour" },
  orderLegend: { en: "Order of the list", fr: "Ordre de la liste" },
  orders: {
    place: { en: "Place by place, for calling or visiting each place", fr: "Lieu par lieu, pour appeler ou visiter chaque lieu" },
    detail: { en: "Detail by detail, for asking one thing at every place", fr: "Détail par détail, pour poser une même question à chaque lieu" },
  },
  listTitle: { en: "Places to ask", fr: "Lieux à questionner" },
  nothing: { en: "Nothing to ask: every chosen detail has a recent answer at every place shown.", fr: `Rien à demander${NB}: chaque détail choisi a une réponse récente pour chaque lieu affiché.` },
  nothingCount: { en: "Places with nothing to ask", fr: "Lieux sans question" },
  reasons: {
    unknown: { en: "No record (Unknown)", fr: "Aucune donnée (UNKNOWN)" },
    differ: { en: "Reports differ", fr: "Rapports divergents" },
    old: { en: "Newest record a year old or more", fr: "Donnée la plus récente d’un an ou plus" },
  },
  countsCaption: { en: "Questions by reason", fr: "Questions selon la raison" },
  countsReason: { en: "Reason", fr: "Raison" },
  countsNumber: { en: "Questions", fr: "Nombre de questions" },
  answerLine: { en: "Answer: ________  Who answered: ________  Date: ________", fr: `Réponse${NB}: ________  Qui a répondu${NB}: ________  Date${NB}: ________` },
  downloadText: { en: "Download the questions as text to print", fr: "Télécharger les questions en texte à imprimer" },
  downloadCsv: { en: "Download the questions as a spreadsheet (CSV)", fr: "Télécharger les questions en tableur (CSV)" },
  updated: { en: "The list is updated.", fr: "La liste est mise à jour." },
  textHeading: { en: "Questions to ask places", fr: "Questions à poser aux lieux" },
  textMade: { en: "Made on", fr: "Créé le" },
  errors: {
    empty: { en: "The box is empty. Paste the file’s text or open it.", fr: "La zone est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The file is too large to read here.", fr: "Le fichier est trop volumineux pour être lu ici." },
    "not-json": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-format": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-version": { en: "This export comes from a different version and cannot be read.", fr: "Cette exportation provient d’une autre version et ne peut pas être lue." },
    "no-notes": { en: "This file has no note the App can read.", fr: "Ce fichier ne contient aucune note lisible par l’App." },
  },
} as const;

export function askErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_ASK_COPY.errors[e], l);
}

export function reasonText(r: QuestionReason, l: Locale): string {
  return t(FILE_ASK_COPY.reasons[r], l);
}

/** "Elevator — No record (Unknown)": the detail, then why it is asked. */
export function questionHead(key: FactKey, reason: QuestionReason, l: Locale): string {
  return `${t(COPY.facts[key], l)} — ${reasonText(reason, l)}`;
}

/** "Elevator: 3 places" — the heading of one detail in the by-detail order. */
export function detailHeading(key: FactKey, places: number, l: Locale): string {
  const n = l === "fr" ? `${places} ${places > 1 ? "lieux" : "lieu"}` : `${places} ${places === 1 ? "place" : "places"}`;
  return `${t(COPY.facts[key], l)} (${n})`;
}

/** "4 places to ask, 9 questions." */
export function askSummaryText(places: number, questions: number, l: Locale): string {
  if (l === "fr") return `${places} ${places > 1 ? "lieux" : "lieu"} à questionner, ${questions} ${questions > 1 ? "questions" : "question"}.`;
  return `${places} ${places === 1 ? "place" : "places"} to ask, ${questions} ${questions === 1 ? "question" : "questions"}.`;
}

export function askFilename(kind: "text" | "csv", today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  const base = l === "fr" ? `questions-a-poser-${day}` : `questions-to-ask-${day}`;
  return `${base}.${kind === "csv" ? "csv" : "txt"}`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileAskStrings(): Array<[string, Pair]> {
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
  walk("fileAsk", FILE_ASK_COPY);
  return out;
}
