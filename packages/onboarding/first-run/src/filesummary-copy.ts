import type { Locale } from "../../switch-first/src/index";
import { NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";

/**
 * Words for "Summarize a notes file", in English and French. French copy uses
 * ’, U+00A0 before ":" and U+202F before ; ! ? and inside « ». The tables reuse
 * the App's own words for record ages and sources.
 */
export const FILE_SUMMARY_COPY = {
  title: { en: "Summarize a notes file", fr: "Résumer un fichier de notes" },
  intro: {
    en: "Counts for a notes export: how much each place has recorded, the answers for each detail, how old the records are, and where they come from.",
    fr: `Des chiffres sur une exportation de notes${NB}: ce que chaque lieu a d’enregistré, les réponses pour chaque détail, l’âge des données et leur provenance.`,
  },
  privacy: {
    en: "Nothing changes on this device: the file is read here, it is not saved and it is not sent anywhere.",
    fr: `Rien ne change sur cet appareil${NB}: le fichier est lu ici, il n’est pas enregistré et n’est envoyé nulle part.`,
  },
  notScored: {
    en: "These are counts. They do not score places or sources, and Unknown does not mean No.",
    fr: "Ce sont des chiffres. Ils ne notent ni les lieux ni les sources, et UNKNOWN ne veut pas dire Non.",
  },
  pasteLabel: { en: "Text of the notes file", fr: "Texte du fichier de notes" },
  pasteHint: {
    en: "A notes export is made with “Export notes” on the Notes page.",
    fr: `Une exportation de notes se crée avec «${NN}Exporter les notes${NN}» sur la page Notes.`,
  },
  openLabel: { en: "Or open the file from this device", fr: "Ou ouvrez le fichier depuis cet appareil" },
  read: { en: "Summarize this file", fr: "Résumer ce fichier" },
  clear: { en: "Remove the file and the summary", fr: "Retirer le fichier et le résumé" },
  cleared: { en: "The page is empty. Nothing was saved.", fr: "La page est vide. Rien n’a été enregistré." },
  opened: { en: "The file is in the box. Choose Summarize this file when ready.", fr: "Le fichier est dans la zone. Choisissez Résumer ce fichier quand vous êtes prêt." },
  readFailed: { en: "That file could not be opened. Try pasting its text instead.", fr: "Ce fichier n’a pas pu être ouvert. Essayez plutôt de coller son texte." },
  errorsTitle: { en: "Fix this first", fr: "À corriger d’abord" },
  resultsTitle: { en: "Summary of the file", fr: "Résumé du fichier" },
  exported: { en: "The file says it was exported on", fr: "Le fichier indique une exportation le" },
  numbersCaption: { en: "The file in numbers", fr: "Le fichier en chiffres" },
  numbersWhat: { en: "In the file", fr: "Dans le fichier" },
  numbersCount: { en: "Count", fr: "Nombre" },
  rows: {
    notes: { en: "Notes the App reads", fr: "Notes que l’App lit" },
    places: { en: "Places", fr: "Lieux" },
    leftOut: { en: "Entries the App leaves out", fr: "Entrées que l’App écarte" },
    noAddress: { en: "Places with no address", fr: "Lieux sans adresse" },
    severalNotes: { en: "Places with more than one note", fr: "Lieux avec plus d’une note" },
  },
  answersTitle: { en: "Answers for each detail", fr: "Réponses pour chaque détail" },
  answersCaption: {
    en: "Places by answer, one row for each detail. Each row adds up to the number of places.",
    fr: "Lieux selon la réponse, une ligne par détail. Chaque ligne totalise le nombre de lieux.",
  },
  answersDetail: { en: "Detail", fr: "Détail" },
  answersYes: { en: "Yes", fr: "Oui" },
  answersNo: { en: "No", fr: "Non" },
  answersDiffer: { en: "Reports differ", fr: "Rapports divergents" },
  answersUnknown: { en: "No record (Unknown)", fr: "Aucune donnée (UNKNOWN)" },
  differTitle: { en: "Places where reports differ", fr: "Lieux aux rapports divergents" },
  differIntro: {
    en: "These places have reports that say different things about a detail. Nothing here says which report is right; it may be worth asking the place.",
    fr: "Ces lieux ont des rapports qui disent des choses différentes sur un détail. Rien n’indique ici quel rapport est juste. Il peut être utile de demander au lieu.",
  },
  noneDiffer: { en: "No place in this file has reports that differ.", fr: "Aucun lieu de ce fichier n’a de rapports divergents." },
  download: { en: "Download this summary as text", fr: "Télécharger ce résumé en texte" },
  textHeading: { en: "Summary of a notes file", fr: "Résumé d’un fichier de notes" },
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

export function summaryErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_SUMMARY_COPY.errors[e], l);
}

export function summaryFilename(today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  return l === "fr" ? `resume-fichier-${day}.txt` : `file-summary-${day}.txt`;
}

/** Announced once the summary is shown. */
export function summarizedText(places: number, notes: number, l: Locale): string {
  if (l === "fr") return `Résumé prêt. ${places} ${places > 1 ? "lieux" : "lieu"}, ${notes} ${notes > 1 ? "notes" : "note"}.`;
  return `Summary ready. ${places} ${places === 1 ? "place" : "places"}, ${notes} ${notes === 1 ? "note" : "notes"}.`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileSummaryStrings(): Array<[string, Pair]> {
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
  walk("fileSummary", FILE_SUMMARY_COPY);
  return out;
}
