import type { Locale } from "../../switch-first/src/index";
import { NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import type { Note } from "./model";
import { recordCount, type MoveChange, type MoveCheck, type MoveProblem, type PlaceName } from "./movenote";

/**
 * Words for "Move a note to another place", in English and French. French
 * copy uses ’, U+00A0 before ":" and U+202F before ; ! ? and inside « ».
 */
export const FILE_MOVE_COPY = {
  title: { en: "Move a note to another place", fr: "Déplacer une note vers un autre lieu" },
  intro: {
    en: "Give a note written under the wrong place the name and address of the right one, in a copy of a notes file.",
    fr: "Donnez à une note écrite sous le mauvais lieu le nom et l’adresse du bon lieu, dans une copie d’un fichier de notes.",
  },
  rule: {
    en: "Only the note’s name and address change. Its records, text, licence and date stay as they were, and so does every other note. The copy is read back before you can download it.",
    fr: "Seuls le nom et l’adresse de la note changent. Ses données, son texte, sa licence et sa date restent tels quels, comme toutes les autres notes. La copie est relue avant que vous puissiez la télécharger.",
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
  findTitle: { en: "Find the place the note is under", fr: "Trouver le lieu sous lequel est la note" },
  searchLabel: { en: "Name or address", fr: "Nom ou adresse" },
  searchHint: {
    en: "Every word must be in the place’s name or address; case and accents do not matter. Leave it empty to list every place.",
    fr: "Chaque mot doit figurer dans le nom ou l’adresse du lieu, sans tenir compte des majuscules ni des accents. Laissez vide pour lister tous les lieux.",
  },
  find: { en: "Find places", fr: "Trouver les lieux" },
  noneFound: { en: "No place has every word of the search in its name or address.", fr: "Aucun lieu n’a tous les mots de la recherche dans son nom ou son adresse." },
  placesLegend: { en: "Place", fr: "Lieu" },
  showNotes: { en: "Show its notes", fr: "Afficher ses notes" },
  noAddress: { en: "No address", fr: "Aucune adresse" },
  notesLegend: { en: "Note to move", fr: "Note à déplacer" },
  chooseNote: { en: "Move this note", fr: "Déplacer cette note" },
  backToPlaces: { en: "Choose another place", fr: "Choisir un autre lieu" },
  targetLegend: { en: "Move it to", fr: "La déplacer vers" },
  targetSearchLabel: { en: "Find a place in the file", fr: "Trouver un lieu du fichier" },
  newPlace: { en: "A place not in the file", fr: "Un lieu absent du fichier" },
  newName: { en: "Name of that place", fr: "Nom de ce lieu" },
  newAddress: { en: "Its address (leave empty for no address)", fr: "Son adresse (laissez vide s’il n’y en a pas)" },
  newHint: {
    en: "Only for a place not in the file. For a place in the file, choose it above so the note takes its name and address as the App shows them.",
    fr: "Seulement pour un lieu absent du fichier. Pour un lieu du fichier, choisissez-le plus haut pour que la note prenne son nom et son adresse tels que l’App les affiche.",
  },
  save: { en: "Move the note in the copy", fr: "Déplacer la note dans la copie" },
  backToNotes: { en: "Choose another note", fr: "Choisir une autre note" },
  noText: { en: "No text", fr: "Aucun texte" },
  problems: {
    "no-place": { en: "Choose a place.", fr: "Choisissez un lieu." },
    "no-note": { en: "Choose a note to move.", fr: "Choisissez une note à déplacer." },
    "no-target": { en: "Choose where the note goes.", fr: "Choisissez où va la note." },
    "same-place": { en: "The note is already under this place.", fr: "La note est déjà sous ce lieu." },
    "name-empty": { en: "Write the name of the place.", fr: "Écrivez le nom du lieu." },
    "name-long": { en: "The name is longer than 120 characters.", fr: "Le nom dépasse 120 caractères." },
    "name-control": { en: "The name cannot hold line breaks or tabs.", fr: "Le nom ne peut pas contenir de sauts de ligne ni de tabulations." },
    "address-long": { en: "The address is longer than 200 characters.", fr: "L’adresse dépasse 200 caractères." },
    "address-control": { en: "The address cannot hold line breaks or tabs.", fr: "L’adresse ne peut pas contenir de sauts de ligne ni de tabulations." },
    exists: {
      en: "This place is already in the file: find it and choose it in the list instead.",
      fr: `Ce lieu est déjà dans le fichier${NB}: trouvez-le et choisissez-le plutôt dans la liste.`,
    },
  },
  changesTitle: { en: "Moves in the copy", fr: "Déplacements dans la copie" },
  noChanges: { en: "No move yet.", fr: "Aucun déplacement pour l’instant." },
  undo: { en: "Remove the last move", fr: "Retirer le dernier déplacement" },
  undone: { en: "The last move was taken back.", fr: "Le dernier déplacement a été annulé." },
  saved: { en: "The note was moved in the copy.", fr: "La note a été déplacée dans la copie." },
  failed: {
    en: "The App could not write this name and address into the note. Nothing changed.",
    fr: "L’App n’a pas pu écrire ce nom et cette adresse dans la note. Rien n’a changé.",
  },
  copyTitle: { en: "The copy", fr: "La copie" },
  checkOk: {
    en: "The copy was read back as the App would read it: every note is there, the notes moved have only their new name and address, and every other note is as it was.",
    fr: `La copie a été relue comme l’App la lirait${NB}: chaque note y figure, les notes déplacées n’ont changé que de nom et d’adresse, et toutes les autres sont telles quelles.`,
  },
  checkFailed: {
    en: "The copy could not be read back as expected, so it is not offered. Your file has not changed.",
    fr: "La copie n’a pas pu être relue comme prévu, elle n’est donc pas proposée. Votre fichier n’a pas changé.",
  },
  downloadCopy: { en: "Download the copy", fr: "Télécharger la copie" },
  downloadList: { en: "Download the list of moves (text)", fr: "Télécharger la liste des déplacements (texte)" },
  errors: {
    empty: { en: "The box is empty. Paste the file’s text or open it.", fr: "La zone est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The file is too large to read here.", fr: "Le fichier est trop volumineux pour être lu ici." },
    "not-json": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-format": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-version": { en: "This export comes from a different version and cannot be read.", fr: "Cette exportation provient d’une autre version et ne peut pas être lue." },
    "no-notes": { en: "This file has no note the App can read.", fr: "Ce fichier ne contient aucune note lisible par l’App." },
  },
} as const;

/** Problems with the choices on the page, and with the move itself. */
export type StepProblem = MoveProblem | "no-place" | "no-note";

export function moveErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_MOVE_COPY.errors[e], l);
}

export function problemText(p: StepProblem, l: Locale): string {
  return t(FILE_MOVE_COPY.problems[p], l);
}

const count = (n: number, one: string, many: string, l: Locale): string => `${n} ${(l === "fr" ? n > 1 : n !== 1) ? many : one}`;
const quote = (s: string, l: Locale): string => (l === "fr" ? `«${NN}${s}${NN}»` : `“${s}”`);

/** "Café A, 10 King St W" or "Kiosk, No address". */
export function nameLine(n: PlaceName, l: Locale): string {
  return `${n.name}, ${n.address === "" ? t(FILE_MOVE_COPY.noAddress, l) : n.address}`;
}

/** "3 places found." or "40 places found; the first 30 are listed. Add words to narrow the search." */
export function foundText(shown: number, total: number, l: Locale): string {
  if (total === 0) return t(FILE_MOVE_COPY.noneFound, l);
  if (shown >= total) return l === "fr" ? `${count(total, "lieu trouvé", "lieux trouvés", l)}.` : `${count(total, "place", "places", l)} found.`;
  return l === "fr"
    ? `${count(total, "lieu trouvé", "lieux trouvés", l)}${NN}; les ${shown} premiers sont listés. Ajoutez des mots pour préciser la recherche.`
    : `${count(total, "place", "places", l)} found; the first ${shown} are listed. Add words to narrow the search.`;
}

/** "Notes under “Café A, 10 King St W” (3)". */
export function notesTitle(place: PlaceName, n: number, l: Locale): string {
  return l === "fr" ? `Notes sous ${quote(nameLine(place, l), l)} (${n})` : `Notes under ${quote(nameLine(place, l), l)} (${n})`;
}

/** "Made on 2026-10-01, 2 records. Text: “Ramp at back”." — enough to tell the notes of a place apart. */
export function noteSummary(n: Note, l: Locale): string {
  const r = count(recordCount(n), l === "fr" ? "donnée" : "record", l === "fr" ? "données" : "records", l);
  const text = n.note ? quote(n.note, l) : t(FILE_MOVE_COPY.noText, l);
  return l === "fr" ? `Créée le ${n.createdOn}, ${r}. Texte${NB}: ${text}.` : `Made on ${n.createdOn}, ${r}. Text: ${text}.`;
}

/** "Move the note made on 2026-10-01 from “Café A, 10 King St W”". */
export function targetTitle(n: Note, l: Locale): string {
  const from = quote(nameLine({ name: n.placeName, address: n.address ?? "" }, l), l);
  return l === "fr" ? `Déplacer la note créée le ${n.createdOn}, sous ${from}` : `Move the note made on ${n.createdOn}, under ${from}`;
}

/** "The note made on 2026-10-01 went from “A” to “B”", noting a place not in the file before. */
export function changeLine(c: MoveChange, l: Locale): string {
  const base =
    l === "fr"
      ? `La note créée le ${c.createdOn} est passée de ${quote(nameLine(c.from, l), l)} à ${quote(nameLine(c.to, l), l)}`
      : `The note made on ${c.createdOn} went from ${quote(nameLine(c.from, l), l)} to ${quote(nameLine(c.to, l), l)}`;
  if (c.existing) return base;
  return l === "fr" ? `${base} (un lieu absent du fichier)` : `${base} (a place not in the file)`;
}

/** "Moves in the copy (2)". */
export function changesTitle(n: number, l: Locale): string {
  return `${t(FILE_MOVE_COPY.changesTitle, l)} (${n})`;
}

/** "2 notes moved; 40 notes in all, read as 38 places." Each note counts once, however often it moved. */
export function copySummary(changes: readonly MoveChange[], c: MoveCheck & { ok: true }, l: Locale): string {
  const moved = new Set(changes.map((x) => x.noteId)).size;
  if (l === "fr")
    return `${count(moved, "note déplacée", "notes déplacées", l)}${NN}; ${count(c.notes, "note", "notes", l)} en tout, lues comme ${count(c.places, "lieu", "lieux", l)}.`;
  return `${count(moved, "note", "notes", l)} moved; ${count(c.notes, "note", "notes", l)} in all, read as ${count(c.places, "place", "places", l)}.`;
}

export function checkText(c: MoveCheck, l: Locale): string {
  return t(c.ok ? FILE_MOVE_COPY.checkOk : FILE_MOVE_COPY.checkFailed, l);
}

/** The moves as plain text, to keep with the copy. */
export function changesText(changes: readonly MoveChange[], today: Date, l: Locale): string {
  const lines = [t(FILE_MOVE_COPY.changesTitle, l), today.toISOString().slice(0, 10), "", t(FILE_MOVE_COPY.rule, l), ""];
  changes.forEach((c, i) => lines.push(`${i + 1}. ${changeLine(c, l)}`));
  return `${lines.join("\n")}\n`;
}

/** File names for the copy and the list of moves, with the number of moves. */
export function moveFilename(kind: "copy" | "list", n: number, today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  const what = l === "fr" ? `${n}-${n > 1 ? "deplacements" : "deplacement"}` : `${n}-${n === 1 ? "move" : "moves"}`;
  if (kind === "copy") return `notes-${what}-${day}.json`;
  return l === "fr" ? `liste-${what}-${day}.txt` : `list-${what}-${day}.txt`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileMoveStrings(): Array<[string, Pair]> {
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
  walk("fileMove", FILE_MOVE_COPY);
  return out;
}
