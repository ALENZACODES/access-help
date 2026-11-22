import type { Locale } from "../../switch-first/src/index";
import { NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import type { CopyCheck, PlaceName, RenameChange, RenameProblem, Spelling } from "./renameplace";

/**
 * Words for "Rename a place", in English and French. French copy uses ’,
 * U+00A0 before ":" and U+202F before ; ! ? and inside « ».
 */
export const FILE_RENAME_COPY = {
  title: { en: "Rename a place", fr: "Renommer un lieu" },
  intro: {
    en: "Change the name or the address of a place in every note about it, in a copy of a notes file: for a place that was renamed, or an address written two ways.",
    fr: `Changez le nom ou l’adresse d’un lieu dans toutes les notes à son sujet, dans une copie d’un fichier de notes${NB}: pour un lieu qui a changé de nom, ou une adresse écrite de deux façons.`,
  },
  rule: {
    en: "Only the name and the address change. Every record keeps its answer, source, licence and date, and every other note stays as it was. The copy is read back before you can download it.",
    fr: "Seuls le nom et l’adresse changent. Chaque donnée garde sa réponse, sa source, sa licence et sa date, et toutes les autres notes restent telles quelles. La copie est relue avant que vous puissiez la télécharger.",
  },
  privacy: {
    en: "Nothing is looked up or saved, and your file does not change.",
    fr: "Rien n’est recherché ni enregistré, et votre fichier ne change pas.",
  },
  pasteLabel: { en: "Text of the notes file", fr: "Texte du fichier de notes" },
  pasteHint: {
    en: "A notes export is made with “Export notes” on the Notes page.",
    fr: `Une exportation de notes se crée avec «${NN}Exporter les notes${NN}» sur la page Notes.`,
  },
  openLabel: { en: "Or open the file from this device", fr: "Ou ouvrez le fichier depuis cet appareil" },
  read: { en: "Read the file", fr: "Lire le fichier" },
  clear: { en: "Remove the file from the page", fr: "Retirer le fichier de la page" },
  cleared: { en: "The page is empty. Nothing was saved.", fr: "La page est vide. Rien n’a été enregistré." },
  opened: { en: "The file is in the box. Choose Read the file when ready.", fr: "Le fichier est dans la zone. Choisissez Lire le fichier quand vous êtes prêt." },
  readFailed: { en: "That file could not be opened. Try pasting its text instead.", fr: "Ce fichier n’a pas pu être ouvert. Essayez plutôt de coller son texte." },
  errorsTitle: { en: "Fix this first", fr: "À corriger d’abord" },
  findTitle: { en: "Find the place", fr: "Trouver le lieu" },
  searchLabel: { en: "Name or address", fr: "Nom ou adresse" },
  searchHint: {
    en: "Every word must be in the place’s name or address; case and accents do not matter. Leave it empty to list every place.",
    fr: "Chaque mot doit figurer dans le nom ou l’adresse du lieu, sans tenir compte des majuscules ni des accents. Laissez vide pour lister tous les lieux.",
  },
  find: { en: "Find places", fr: "Trouver les lieux" },
  foundLegend: { en: "Place to rename", fr: "Lieu à renommer" },
  noneFound: { en: "No place has every word of the search in its name or address.", fr: "Aucun lieu n’a tous les mots de la recherche dans son nom ou son adresse." },
  noAddress: { en: "No address", fr: "Aucune adresse" },
  choose: { en: "Rename this place", fr: "Renommer ce lieu" },
  mixedTitle: { en: "Places written more than one way", fr: "Lieux écrits de plusieurs façons" },
  mixedHint: {
    en: "The notes about these places write the name or the address in different ways. The App already reads each as one place; renaming writes one way into every note.",
    fr: "Les notes au sujet de ces lieux écrivent le nom ou l’adresse de différentes façons. L’App lit déjà chacun comme un seul lieu, et le renommer écrit une seule façon dans chaque note.",
  },
  nameLabel: { en: "Name", fr: "Nom" },
  addressLabel: { en: "Address (leave empty for no address)", fr: "Adresse (laissez vide s’il n’y en a pas)" },
  editHint: {
    en: "As it should be written in every note about the place. Records are not changed.",
    fr: "Tel qu’il doit être écrit dans chaque note au sujet du lieu. Les données ne changent pas.",
  },
  joinLabel: { en: "These are the same place: read them as one", fr: "C’est le même lieu, les lire comme un seul" },
  save: { en: "Make this change in the copy", fr: "Faire cette modification dans la copie" },
  back: { en: "Choose another place", fr: "Choisir un autre lieu" },
  problems: {
    "no-choice": { en: "Choose a place to rename.", fr: "Choisissez un lieu à renommer." },
    "name-empty": { en: "Write a name.", fr: "Écrivez un nom." },
    "name-long": { en: "The name is longer than 120 characters.", fr: "Le nom dépasse 120 caractères." },
    "name-control": { en: "The name cannot hold line breaks or tabs.", fr: "Le nom ne peut pas contenir de sauts de ligne ni de tabulations." },
    "address-long": { en: "The address is longer than 200 characters.", fr: "L’adresse dépasse 200 caractères." },
    "address-control": { en: "The address cannot hold line breaks or tabs.", fr: "L’adresse ne peut pas contenir de sauts de ligne ni de tabulations." },
    unchanged: {
      en: "Every note about the place already has this name and address.",
      fr: "Chaque note au sujet du lieu a déjà ce nom et cette adresse.",
    },
    joins: {
      en: "Another place in the file has this name and address. Tick the box if they are the same place.",
      fr: "Un autre lieu du fichier a ce nom et cette adresse. Cochez la case s’il s’agit du même lieu.",
    },
  },
  changesTitle: { en: "Changes in the copy", fr: "Modifications dans la copie" },
  noChanges: { en: "No change yet.", fr: "Aucune modification pour l’instant." },
  undo: { en: "Remove the last change", fr: "Retirer la dernière modification" },
  undone: { en: "The last change was taken back.", fr: "La dernière modification a été annulée." },
  saved: { en: "The change is in the copy.", fr: "La modification est dans la copie." },
  failed: {
    en: "The App could not write this name and address into the notes. Nothing changed.",
    fr: "L’App n’a pas pu écrire ce nom et cette adresse dans les notes. Rien n’a changé.",
  },
  copyTitle: { en: "The copy", fr: "La copie" },
  checkOk: {
    en: "The copy was read back as the App would read it: every note is there, the notes changed have only their new name and address, and every other note is as it was.",
    fr: `La copie a été relue comme l’App la lirait${NB}: chaque note y figure, les notes modifiées n’ont changé que de nom et d’adresse, et toutes les autres sont telles quelles.`,
  },
  checkFailed: {
    en: "The copy could not be read back as expected, so it is not offered. Your file has not changed.",
    fr: "La copie n’a pas pu être relue comme prévu, elle n’est donc pas proposée. Votre fichier n’a pas changé.",
  },
  downloadCopy: { en: "Download the copy", fr: "Télécharger la copie" },
  downloadList: { en: "Download the list of changes (text)", fr: "Télécharger la liste des modifications (texte)" },
  errors: {
    empty: { en: "The box is empty. Paste the file’s text or open it.", fr: "La zone est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The file is too large to read here.", fr: "Le fichier est trop volumineux pour être lu ici." },
    "not-json": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-format": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-version": { en: "This export comes from a different version and cannot be read.", fr: "Cette exportation provient d’une autre version et ne peut pas être lue." },
    "no-notes": { en: "This file has no note the App can read.", fr: "Ce fichier ne contient aucune note lisible par l’App." },
  },
} as const;

export type EditProblem = RenameProblem | "no-choice";

export function renameErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_RENAME_COPY.errors[e], l);
}

export function problemText(p: EditProblem, l: Locale): string {
  return t(FILE_RENAME_COPY.problems[p], l);
}

const count = (n: number, one: string, many: string, l: Locale): string => `${n} ${(l === "fr" ? n > 1 : n !== 1) ? many : one}`;
const notes = (n: number, l: Locale): string => count(n, "note", "notes", l);
const quote = (s: string, l: Locale): string => (l === "fr" ? `«${NN}${s}${NN}»` : `“${s}”`);

/** "Café A, 10 King St W" or "Kiosk, No address". */
export function nameLine(n: PlaceName, l: Locale): string {
  return `${n.name}, ${n.address === "" ? t(FILE_RENAME_COPY.noAddress, l) : n.address}`;
}

/** "3 places found." or "40 places found; the first 30 are listed. Add words to narrow the search." */
export function foundText(shown: number, total: number, l: Locale): string {
  if (total === 0) return t(FILE_RENAME_COPY.noneFound, l);
  if (shown >= total) return l === "fr" ? `${count(total, "lieu trouvé", "lieux trouvés", l)}.` : `${count(total, "place", "places", l)} found.`;
  return l === "fr"
    ? `${count(total, "lieu trouvé", "lieux trouvés", l)}${NN}; les ${shown} premiers sont listés. Ajoutez des mots pour préciser la recherche.`
    : `${count(total, "place", "places", l)} found; the first ${shown} are listed. Add words to narrow the search.`;
}

/** "Rename “Café A, 10 King St W”". */
export function editTitle(from: PlaceName, l: Locale): string {
  return l === "fr" ? `Renommer ${quote(nameLine(from, l), l)}` : `Rename ${quote(nameLine(from, l), l)}`;
}

/** "“Café A, 10 King St W” (2 notes), “Cafe A, 10 King St. W.” (1 note)". */
export function spellingsText(spellings: readonly Spelling[], l: Locale): string {
  return spellings.map((s) => `${quote(nameLine(s, l), l)} (${notes(s.notes, l)})`).join(", ");
}

/** "Rename Café A": a button name that says which place. */
export function renamePlaceLabel(name: string, l: Locale): string {
  return l === "fr" ? `Renommer ${name}` : `Rename ${name}`;
}

/** "Places written more than one way (2)". */
export function mixedTitle(n: number, l: Locale): string {
  return `${t(FILE_RENAME_COPY.mixedTitle, l)} (${n})`;
}

/** "The change goes in 2 notes." */
export function notesText(n: number, l: Locale): string {
  return l === "fr" ? `La modification s’applique à ${notes(n, l)}.` : `The change goes in ${notes(n, l)}.`;
}

/** Says which place the renamed one would be read as one with. */
export function joinsText(other: PlaceName, l: Locale): string {
  return l === "fr"
    ? `${quote(nameLine(other, l), l)} est déjà dans le fichier. Avec cette modification, les deux seraient lus comme un seul lieu.`
    : `${quote(nameLine(other, l), l)} is already in the file. With this change the two would be read as one place.`;
}

/** "“Café A, 10 King St W” became “Café B, 10 King St W” (2 notes)". */
export function changeLine(c: RenameChange, l: Locale): string {
  const base =
    l === "fr"
      ? `${quote(nameLine(c.from, l), l)} est devenu ${quote(nameLine(c.to, l), l)} (${notes(c.noteIds.length, l)})`
      : `${quote(nameLine(c.from, l), l)} became ${quote(nameLine(c.to, l), l)} (${notes(c.noteIds.length, l)})`;
  if (!c.joined) return base;
  return l === "fr" ? `${base}, lu désormais comme un seul lieu avec celui qui portait déjà ce nom` : `${base}, now read as one place with the one already named so`;
}

/** "Changes in the copy (2)". */
export function changesTitle(n: number, l: Locale): string {
  return `${t(FILE_RENAME_COPY.changesTitle, l)} (${n})`;
}

/** "2 changes, 3 notes changed; 40 notes in all, read as 38 places." */
export function copySummary(changes: readonly RenameChange[], c: CopyCheck & { ok: true }, l: Locale): string {
  const changed = new Set(changes.flatMap((x) => x.noteIds)).size;
  if (l === "fr")
    return `${count(changes.length, "modification", "modifications", l)}, ${count(changed, "note modifiée", "notes modifiées", l)}${NN}; ${notes(c.notes, l)} en tout, lues comme ${count(c.places, "lieu", "lieux", l)}.`;
  return `${count(changes.length, "change", "changes", l)}, ${count(changed, "note", "notes", l)} changed; ${notes(c.notes, l)} in all, read as ${count(c.places, "place", "places", l)}.`;
}

export function checkText(c: CopyCheck, l: Locale): string {
  return t(c.ok ? FILE_RENAME_COPY.checkOk : FILE_RENAME_COPY.checkFailed, l);
}

/** The changes as plain text, to keep with the copy. */
export function changesText(changes: readonly RenameChange[], today: Date, l: Locale): string {
  const lines = [t(FILE_RENAME_COPY.changesTitle, l), today.toISOString().slice(0, 10), "", t(FILE_RENAME_COPY.rule, l), ""];
  changes.forEach((c, i) => lines.push(`${i + 1}. ${changeLine(c, l)}`));
  return `${lines.join("\n")}\n`;
}

/** File names for the copy and the list of changes, with the number of changes. */
export function renameFilename(kind: "copy" | "list", n: number, today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  const what = l === "fr" ? `${n}-${n > 1 ? "modifications" : "modification"}` : `${n}-${n === 1 ? "change" : "changes"}`;
  if (kind === "copy") return l === "fr" ? `notes-renommees-${what}-${day}.json` : `notes-renamed-${what}-${day}.json`;
  return l === "fr" ? `lieux-renommes-${what}-${day}.txt` : `places-renamed-${what}-${day}.txt`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileRenameStrings(): Array<[string, Pair]> {
  const out: Array<[string, Pair]> = [];
  const walk = (path: string, v: unknown): void => {
    if (!v || typeof v !== "object") return;
    const o = v as Record<string, unknown>;
    if (typeof o["en"] === "string" && typeof o["fr"] === "string") {
      out.push([path, { en: o["en"], fr: o["fr"] }]);
      return;
    }
    for (const [key, c] of Object.entries(o)) walk(`${path}.${key}`, c);
  };
  walk("fileRename", FILE_RENAME_COPY);
  return out;
}
