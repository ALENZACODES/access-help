import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, NN, t, type Pair } from "./copy";
import type { DetailStatus, FileErrorCode, Side, SideAnswer } from "./filecompare";

/**
 * Words for "Compare two note files", in English and French. French copy uses
 * ’, U+00A0 before ":" and U+202F before ; ! ? and inside « ». The status of a
 * detail with no record is the token UNKNOWN in French.
 */
export const FILE_COMPARE_COPY = {
  title: { en: "Compare two note files", fr: "Comparer deux fichiers de notes" },
  intro: {
    en: "Paste or open two notes exports, such as an older file and a newer one, or your file and one someone sent you. The App shows where they say the same thing and where they differ. It does not say which file is right.",
    fr: "Collez ou ouvrez deux exportations de notes, par exemple un ancien fichier et un plus récent, ou votre fichier et celui qu’une personne vous a envoyé. L’App montre où ils disent la même chose et où ils diffèrent. Elle ne dit pas quel fichier a raison.",
  },
  privacy: {
    en: "Nothing changes on this device: the files are read here, they are not saved and they are not sent anywhere.",
    fr: `Rien ne change sur cet appareil${NB}: les fichiers sont lus ici, ils ne sont pas enregistrés et ne sont envoyés nulle part.`,
  },
  fileA: { en: "File A", fr: "Fichier A" },
  fileB: { en: "File B", fr: "Fichier B" },
  pasteA: { en: "Text of file A", fr: "Texte du fichier A" },
  pasteB: { en: "Text of file B", fr: "Texte du fichier B" },
  openA: { en: "Or open file A from this device", fr: "Ou ouvrez le fichier A depuis cet appareil" },
  openB: { en: "Or open file B from this device", fr: "Ou ouvrez le fichier B depuis cet appareil" },
  pasteHint: {
    en: "Use “Export notes” on the Notes page to make a file. Only notes exports can be compared.",
    fr: `Utilisez «${NN}Exporter les notes${NN}» sur la page Notes pour créer un fichier. Seules les exportations de notes peuvent être comparées.`,
  },
  compare: { en: "Compare the two files", fr: "Comparer les deux fichiers" },
  clear: { en: "Remove both files from the boxes", fr: "Retirer les deux fichiers des zones" },
  cleared: { en: "Both boxes are empty. Nothing was saved.", fr: "Les deux zones sont vides. Rien n’a été enregistré." },
  readFailed: { en: "That file could not be opened. Try pasting its text instead.", fr: "Ce fichier n’a pas pu être ouvert. Essayez plutôt de coller son texte." },
  errorsTitle: { en: "Fix these before comparing", fr: "À corriger avant de comparer" },
  resultsTitle: { en: "What the two files say", fr: "Ce que disent les deux fichiers" },
  glanceCaption: { en: "Each file at a glance", fr: "Chaque fichier en bref" },
  glanceWhat: { en: "In the file", fr: "Dans le fichier" },
  notesRow: { en: "Notes", fr: "Notes" },
  placesRow: { en: "Places", fr: "Lieux" },
  recordsRow: { en: "Yes or No records with a source, licence and date", fr: "Données Oui ou Non avec une source, une licence et une date" },
  rejectedRow: { en: "Entries left out (not valid notes)", fr: "Entrées écartées (notes non valides)" },
  totalsCaption: { en: "Details of the places found in both files", fr: "Détails des lieux présents dans les deux fichiers" },
  totalsWhat: { en: "How the files compare", fr: "Comparaison des fichiers" },
  totalsCount: { en: "Details", fr: "Détails" },
  agree: {
    en: "The two files hold the same places and say the same about every detail.",
    fr: "Les deux fichiers contiennent les mêmes lieux et disent la même chose pour chaque détail.",
  },
  notRanked: {
    en: "A newer record is not shown as more right, and a record in one file only is not shown as wrong. Tier 0 means nobody has reviewed the record.",
    fr: "Une donnée plus récente n’est pas présentée comme plus juste, et une donnée présente dans un seul fichier n’est pas présentée comme fausse. Le niveau 0 signifie que personne n’a examiné la donnée.",
  },
  bothTitle: { en: "Places in both files", fr: "Lieux présents dans les deux fichiers" },
  onlyDiffering: { en: "Show only places where the files differ", fr: "Afficher seulement les lieux où les fichiers diffèrent" },
  noneInBoth: { en: "No place is in both files.", fr: "Aucun lieu ne se trouve dans les deux fichiers." },
  noneDiffer: { en: "No place in both files differs.", fr: "Aucun lieu commun aux deux fichiers ne diffère." },
  differsMark: { en: "The files differ here", fr: "Les fichiers diffèrent ici" },
  sameMark: { en: "The files say the same here", fr: "Les fichiers disent la même chose ici" },
  detailColumn: { en: "Detail", fr: "Détail" },
  compareColumn: { en: "How they compare", fr: "Comparaison" },
  noRecord: { en: "No record in this file", fr: "Aucune donnée dans ce fichier" },
  onlyATitle: { en: "Places only in file A", fr: "Lieux seulement dans le fichier A" },
  onlyBTitle: { en: "Places only in file B", fr: "Lieux seulement dans le fichier B" },
  noneOnly: { en: "None.", fr: "Aucun." },
  maybeSameTitle: { en: "May be the same place", fr: "Peut-être le même lieu" },
  maybeSameIntro: {
    en: "Each of these places is in one file only, but its name or address is close to a place in the other file. The App does not join them. Ask the person who made the file, or the place, if you are not sure.",
    fr: "Chacun de ces lieux ne se trouve que dans un fichier, mais son nom ou son adresse ressemble à un lieu de l’autre fichier. L’App ne les réunit pas. Demandez à la personne qui a créé le fichier, ou au lieu, si vous avez un doute.",
  },
  download: { en: "Download this comparison as text", fr: "Télécharger cette comparaison en texte" },
  status: {
    "different-answers": { en: "Different answers", fr: "Réponses différentes" },
    "only-a": { en: "Recorded in file A only", fr: "Enregistré dans le fichier A seulement" },
    "only-b": { en: "Recorded in file B only", fr: "Enregistré dans le fichier B seulement" },
    "same-answer": { en: "Same answer", fr: "Même réponse" },
    "both-unknown": { en: "No record in either file", fr: "Aucune donnée dans l’un ou l’autre fichier" },
  },
  errors: {
    empty: { en: "is empty. Paste its text or open it.", fr: "est vide. Collez son texte ou ouvrez-le." },
    "too-large": { en: "is too large to read here.", fr: "est trop volumineux pour être lu ici." },
    "not-json": { en: "is not a notes export.", fr: "n’est pas une exportation de notes." },
    "wrong-format": { en: "is not a notes export.", fr: "n’est pas une exportation de notes." },
    "wrong-version": {
      en: "comes from a different version of the notes export and cannot be read.",
      fr: "provient d’une autre version de l’exportation de notes et ne peut pas être lu.",
    },
    "no-notes": { en: "has no note the App can read.", fr: "ne contient aucune note lisible par l’App." },
    "same-text": { en: "is the same text as file A. Pick two different files.", fr: "est le même texte que le fichier A. Choisissez deux fichiers différents." },
  },
  text: {
    heading: { en: "Comparison of two note files", fr: "Comparaison de deux fichiers de notes" },
    made: { en: "Made on", fr: "Créé le" },
    nothingSaved: {
      en: "This text was made on a device. Nothing in it was reviewed. It says where the files agree and differ, not which one is right.",
      fr: "Ce texte a été créé sur un appareil. Rien n’y a été examiné. Il indique où les fichiers concordent et diffèrent, et non lequel a raison.",
    },
  },
} as const;

const SIDE_NAME: Readonly<Record<Side, Pair>> = { a: FILE_COMPARE_COPY.fileA, b: FILE_COMPARE_COPY.fileB };

export function sideName(side: Side, l: Locale): string {
  return t(SIDE_NAME[side], l);
}

/** "fichier A", for the middle of a French sentence. */
function inSentence(side: Side): string {
  return side === "a" ? "fichier A" : "fichier B";
}

/** "File A is empty. Paste its text or open it." */
export function fileErrorText(side: Side, code: FileErrorCode, l: Locale): string {
  return `${sideName(side, l)} ${t(FILE_COMPARE_COPY.errors[code], l)}`;
}

export function statusText(s: DetailStatus, l: Locale): string {
  return t(FILE_COMPARE_COPY.status[s], l);
}

/** The answer one file gives for a detail: Yes, No, reports that differ, or no record. */
export function answerText(a: SideAnswer, l: Locale): string {
  if (a === "unknown") return t(COPY.values.unknown, l);
  if (a === "differ") return t(COPY.places.differ, l);
  return t(COPY.values[a], l);
}

/** "3 records are in both files." */
export function sharedText(n: number, l: Locale): string {
  if (l === "fr") return n === 1 ? "1 donnée se trouve dans les deux fichiers." : `${n} données se trouvent dans les deux fichiers.`;
  return n === 1 ? "1 record is in both files." : `${n} records are in both files.`;
}

/** "File B names it “Central Library”." The name is the file's own text. */
export function otherNameText(side: Side, name: string, l: Locale): string {
  return l === "fr" ? `Le ${inSentence(side)} le nomme «${NN}${name}${NN}».` : `${sideName(side, l)} names it “${name}”.`;
}

/** "File B gives the address 2 King St." */
export function otherAddressText(side: Side, address: string | undefined, l: Locale): string {
  if (address === undefined) return l === "fr" ? `Le ${inSentence(side)} ne donne pas d’adresse.` : `${sideName(side, l)} gives no address.`;
  return l === "fr" ? `Le ${inSentence(side)} donne l’adresse ${address}.` : `${sideName(side, l)} gives the address ${address}.`;
}

/** Announced after a comparison. */
export function comparedText(both: number, onlyA: number, onlyB: number, l: Locale): string {
  if (l === "fr") return `Comparaison faite. Lieux dans les deux fichiers${NB}: ${both}. Seulement dans le fichier A${NB}: ${onlyA}. Seulement dans le fichier B${NB}: ${onlyB}.`;
  return `Compared. Places in both files: ${both}. Only in file A: ${onlyA}. Only in file B: ${onlyB}.`;
}

/** Announced when the filter changes. */
export function shownText(n: number, l: Locale): string {
  if (l === "fr") return n === 1 ? "1 lieu affiché." : `${n} lieux affichés.`;
  return n === 1 ? "1 place shown." : `${n} places shown.`;
}

/** Announced when a file is opened into its box. */
export function openedText(side: Side, l: Locale): string {
  return l === "fr" ? `Le ${inSentence(side)} est dans sa zone. Choisissez Comparer quand les deux sont prêts.` : `${sideName(side, l)} is in its box. Choose Compare when both are ready.`;
}

/** "Yes, Survey 2026, CC0-1.0, 2026-10-01, Tier 0, not reviewed" — one record, in one line. */
export function recordLine(value: "yes" | "no", source: string, licence: string, date: string, tier: string, l: Locale): string {
  const answer = t(COPY.values[value], l);
  return l === "fr"
    ? `${answer}${NB}: ${source}, licence ${licence}, ${date}, ${tier}`
    : `${answer}: ${source}, licence ${licence}, ${date}, ${tier}`;
}

/** Caption for one place's table. */
export function placeCaption(name: string, l: Locale): string {
  return l === "fr" ? `${name}${NB}: ce que dit chaque fichier` : `${name}: what each file says`;
}

/** The download's file name; ASCII only, with the date. */
export function compareFilename(today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  return l === "fr" ? `comparaison-fichiers-${day}.txt` : `file-comparison-${day}.txt`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileCompareStrings(): Array<[string, Pair]> {
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
  walk("fileCompare", FILE_COMPARE_COPY);
  return out;
}
