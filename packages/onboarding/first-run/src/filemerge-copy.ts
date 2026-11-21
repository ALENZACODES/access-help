import type { Locale } from "../../switch-first/src/index";
import { NB, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import type { ClashChoice } from "./filemerge";

/**
 * Words for "Combine note files", in English and French. French copy uses ’,
 * U+00A0 before ":" and U+202F before ; ! ? and inside « ».
 */
export const FILE_MERGE_COPY = {
  title: { en: "Combine note files", fr: "Réunir des fichiers de notes" },
  intro: {
    en: "Add two or more notes exports, such as one from each person after a mapping day, and download them as one notes file. Where two files hold different versions of the same note, you choose which to keep.",
    fr: "Ajoutez deux exportations de notes ou plus, par exemple une par personne après une journée de cartographie, et téléchargez-les en un seul fichier de notes. Quand deux fichiers contiennent des versions différentes d’une même note, vous choisissez laquelle garder.",
  },
  privacy: {
    en: "Nothing changes on this device: the files are read here, they are not saved and they are not sent anywhere.",
    fr: `Rien ne change sur cet appareil${NB}: les fichiers sont lus ici, ils ne sont pas enregistrés et ne sont envoyés nulle part.`,
  },
  pasteLabel: { en: "Text of a notes file", fr: "Texte d’un fichier de notes" },
  pasteHint: {
    en: "Paste one file at a time and choose Add this file, or open several files at once.",
    fr: "Collez un fichier à la fois et choisissez Ajouter ce fichier, ou ouvrez plusieurs fichiers à la fois.",
  },
  nameLabel: { en: "Name for this file (optional)", fr: "Nom de ce fichier (facultatif)" },
  add: { en: "Add this file", fr: "Ajouter ce fichier" },
  openLabel: { en: "Or open files from this device", fr: "Ou ouvrez des fichiers depuis cet appareil" },
  filesTitle: { en: "Files to combine", fr: "Fichiers à réunir" },
  noFiles: { en: "No file added yet.", fr: "Aucun fichier ajouté pour le moment." },
  combine: { en: "Combine the files", fr: "Réunir les fichiers" },
  clearAll: { en: "Remove every file from the list", fr: "Retirer tous les fichiers de la liste" },
  cleared: { en: "The list is empty. Nothing was saved.", fr: "La liste est vide. Rien n’a été enregistré." },
  readFailed: { en: "A file could not be opened. Try pasting its text instead.", fr: "Un fichier n’a pas pu être ouvert. Essayez plutôt de coller son texte." },
  errorsTitle: { en: "Fix these before combining", fr: "À corriger avant de réunir" },
  needTwo: { en: "Add at least two files that hold notes.", fr: "Ajoutez au moins deux fichiers qui contiennent des notes." },
  emptyPaste: { en: "Paste a file’s text before adding it.", fr: "Collez le texte d’un fichier avant de l’ajouter." },
  tooMany: { en: "At most 10 files can be combined at once.", fr: "Au plus 10 fichiers peuvent être réunis à la fois." },
  resultsTitle: { en: "The combined file", fr: "Le fichier réuni" },
  totalsCaption: { en: "What goes into the combined file", fr: "Ce qui entre dans le fichier réuni" },
  totalsWhat: { en: "Notes", fr: "Notes" },
  totalsCount: { en: "Count", fr: "Nombre" },
  rows: {
    read: { en: "Notes read from the files", fr: "Notes lues dans les fichiers" },
    leftOut: { en: "Entries the App leaves out (not valid notes)", fr: "Entrées que l’App écarte (notes non valides)" },
    sameAgain: { en: "Same note found again, kept once", fr: "Même note trouvée de nouveau, gardée une fois" },
    clashes: { en: "Notes with two versions", fr: "Notes en deux versions" },
    copies: { en: "Copies under another id", fr: "Copies sous un autre identifiant" },
    result: { en: "Notes in the combined file", fr: "Notes dans le fichier réuni" },
  },
  overLimit: {
    en: "The combined file holds more than 200 notes. A device keeps at most 200, so an import there stops at 200.",
    fr: "Le fichier réuni contient plus de 200 notes. Un appareil en garde au plus 200, donc une importation s’y arrête à 200.",
  },
  clashesTitle: { en: "Notes with two versions", fr: "Notes en deux versions" },
  clashesIntro: {
    en: "These notes have the same id in two files but say different things. The earlier file’s version is kept unless you choose otherwise. Nothing says which version is right.",
    fr: "Ces notes ont le même identifiant dans deux fichiers, mais disent des choses différentes. La version du premier fichier est gardée sauf si vous choisissez autrement. Rien n’indique quelle version est juste.",
  },
  choices: {
    first: { en: "Keep the earlier file’s version", fr: "Garder la version du premier fichier" },
    later: { en: "Keep the later file’s version", fr: "Garder la version du fichier suivant" },
    both: { en: "Keep both, the later one under a new id", fr: "Garder les deux, la suivante sous un nouvel identifiant" },
  },
  copiesTitle: { en: "Copies under another id", fr: "Copies sous un autre identifiant" },
  copiesIntro: {
    en: "These notes say exactly the same as a note already in the combined file, under another id. They are kept unless you leave them out.",
    fr: "Ces notes disent exactement la même chose qu’une note déjà dans le fichier réuni, sous un autre identifiant. Elles sont gardées sauf si vous les écartez.",
  },
  dropCopy: { en: "Leave this copy out", fr: "Écarter cette copie" },
  download: { en: "Download the combined notes file", fr: "Télécharger le fichier de notes réuni" },
  downloadReport: { en: "Download what was combined, as text", fr: "Télécharger le résumé de la réunion en texte" },
  updated: { en: "The combined file is updated.", fr: "Le fichier réuni est mis à jour." },
  noRecord: { en: "No Yes or No recorded", fr: "Aucun Oui ni Non enregistré" },
  errors: {
    empty: { en: "is empty.", fr: "est vide." },
    "too-large": { en: "is too large to read here.", fr: "est trop volumineux pour être lu ici." },
    "not-json": { en: "is not a notes export.", fr: "n’est pas une exportation de notes." },
    "wrong-format": { en: "is not a notes export.", fr: "n’est pas une exportation de notes." },
    "wrong-version": { en: "comes from a different version and cannot be read.", fr: "provient d’une autre version et ne peut pas être lu." },
    "no-notes": { en: "has no note the App can read.", fr: "ne contient aucune note lisible par l’App." },
  },
  text: {
    heading: { en: "Combined notes files", fr: "Fichiers de notes réunis" },
    made: { en: "Made on", fr: "Créé le" },
    files: { en: "Files", fr: "Fichiers" },
    renamed: { en: "Later versions kept under a new id", fr: "Versions suivantes gardées sous un nouvel identifiant" },
    nothingReviewed: {
      en: "This text was made on a device. Nothing in it was reviewed, and no version was judged right or wrong.",
      fr: "Ce texte a été créé sur un appareil. Rien n’y a été examiné, et aucune version n’a été jugée juste ou fausse.",
    },
  },
} as const;

export function choiceText(c: ClashChoice, l: Locale): string {
  return t(FILE_MERGE_COPY.choices[c], l);
}

/** "File 2 (Sam's notes) has no note the App can read." */
export function fileProblemText(index: number, label: string, error: ImportError | "no-notes", l: Locale): string {
  return `${fileName(index, label, l)} ${t(FILE_MERGE_COPY.errors[error], l)}`;
}

/** "File 2 (sam.json)", "Fichier 2 (sam.json)". The label is the person's own text. */
export function fileName(index: number, label: string, l: Locale): string {
  const head = l === "fr" ? `Fichier ${index + 1}` : `File ${index + 1}`;
  return label === `#${index + 1}` ? head : `${head} (${label})`;
}

/** The label of a file's remove button names the file, so each button says what it removes. */
export function removeFileText(index: number, label: string, l: Locale): string {
  return l === "fr" ? `Retirer ${fileName(index, label, l).replace(/^F/, "f")} de la liste` : `Remove ${fileName(index, label, l).replace(/^F/, "f")} from the list`;
}

/** "3 notes, 1 entry left out". */
export function fileSummaryText(notes: number, leftOut: number, l: Locale): string {
  if (l === "fr") return `${notes} ${notes > 1 ? "notes" : "note"}, ${leftOut} ${leftOut > 1 ? "entrées écartées" : "entrée écartée"}`;
  return `${notes} ${notes === 1 ? "note" : "notes"}, ${leftOut} ${leftOut === 1 ? "entry" : "entries"} left out`;
}

/** Announced after adding files. */
export function addedText(count: number, l: Locale): string {
  if (l === "fr") return count === 1 ? "1 fichier dans la liste." : `${count} fichiers dans la liste.`;
  return count === 1 ? "1 file in the list." : `${count} files in the list.`;
}

/** Announced after combining. */
export function combinedText(notes: number, clashes: number, copies: number, l: Locale): string {
  if (l === "fr") return `Fichiers réunis. Notes${NB}: ${notes}. Notes en deux versions${NB}: ${clashes}. Copies${NB}: ${copies}.`;
  return `Files combined. Notes: ${notes}. Notes with two versions: ${clashes}. Copies: ${copies}.`;
}

/** "Library (id n1): file 1 and file 3." */
export function clashLegend(name: string, id: string, first: number, later: number, l: Locale): string {
  return l === "fr"
    ? `${name} (identifiant ${id})${NB}: fichier ${first + 1} et fichier ${later + 1}`
    : `${name} (id ${id}): file ${first + 1} and file ${later + 1}`;
}

/** "Same as Library (id n1) from file 1." */
export function copyText(id: string, keptName: string, keptId: string, keptFile: number, l: Locale): string {
  return l === "fr"
    ? `${id}${NB}: identique à ${keptName} (identifiant ${keptId}) du fichier ${keptFile + 1}.`
    : `${id}: same as ${keptName} (id ${keptId}) from file ${keptFile + 1}.`;
}

/** "n1 is kept as n1-2." */
export function renamedText(from: string, to: string, l: Locale): string {
  return l === "fr" ? `${from} est gardée sous ${to}.` : `${from} is kept as ${to}.`;
}

/** ASCII file names with the date. */
export function mergeFilename(kind: "notes" | "report", today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  if (kind === "notes") return l === "fr" ? `notes-reunies-${day}.json` : `notes-combined-${day}.json`;
  return l === "fr" ? `reunion-fichiers-${day}.txt` : `combined-files-${day}.txt`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileMergeStrings(): Array<[string, Pair]> {
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
  walk("fileMerge", FILE_MERGE_COPY);
  return out;
}
