import type { Locale } from "../../switch-first/src/index";
import { NB, NN, t, type Pair } from "./copy";
import type { ListMatch, Removal, ReadBack, ReasonProblem } from "./dropplaces";
import type { ImportError } from "./exchange";
import type { Place } from "./places";

/**
 * Words for "Remove places from a file", in English and French. French copy
 * uses ’, U+00A0 before ":" and U+202F before ; ! ? and inside « ».
 */
export const FILE_DROP_COPY = {
  title: { en: "Remove places from a file", fr: "Retirer des lieux d’un fichier" },
  intro: {
    en: "Take places that have closed or moved, with every note about them, out of a copy of a notes file. Find them by name or address and tick them.",
    fr: "Retirez d’une copie d’un fichier de notes les lieux qui ont fermé ou déménagé, avec toutes les notes à leur sujet. Trouvez-les par nom ou par adresse et cochez-les.",
  },
  rule: {
    en: "Every other note stays exactly as it was. The copy is read back before you can download it, and the notes taken out can be downloaded too, so nothing is lost.",
    fr: "Toutes les autres notes restent exactement telles quelles. La copie est relue avant que vous puissiez la télécharger, et les notes retirées peuvent aussi être téléchargées, pour que rien ne soit perdu.",
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
  findTitle: { en: "Find places", fr: "Trouver des lieux" },
  searchLabel: { en: "Name or address", fr: "Nom ou adresse" },
  searchHint: {
    en: "Every word must be in the place’s name or address; case and accents do not matter. Leave it empty to list every place.",
    fr: "Chaque mot doit figurer dans le nom ou l’adresse du lieu, sans tenir compte des majuscules ni des accents. Laissez vide pour lister tous les lieux.",
  },
  find: { en: "Find places", fr: "Trouver les lieux" },
  foundLegend: { en: "Places found: tick those to remove", fr: "Lieux trouvés, cochez ceux à retirer" },
  noneFound: { en: "No place has every word of the search in its name or address.", fr: "Aucun lieu n’a tous les mots de la recherche dans son nom ou son adresse." },
  noAddress: { en: "No address", fr: "Aucune adresse" },
  listTitle: { en: "Tick places from a list", fr: "Cocher des lieux à partir d’une liste" },
  listLabel: { en: "Places to tick, one per line", fr: "Lieux à cocher, un par ligne" },
  listHint: {
    en: "Write each place’s name, or its name and address with a comma between them. A name shared by places at different addresses ticks none of them: find those by address instead.",
    fr: `Écrivez le nom de chaque lieu, ou son nom et son adresse séparés par une virgule. Un nom porté par des lieux à des adresses différentes n’en coche aucun${NB}: trouvez-les plutôt par adresse.`,
  },
  listButton: { en: "Tick the places on the list", fr: "Cocher les lieux de la liste" },
  noneChosen: { en: "No place is ticked yet.", fr: "Aucun lieu n’est encore coché." },
  removeNone: { en: "Remove the ticked places from the copy", fr: "Retirer les lieux cochés de la copie" },
  reasonLabel: { en: "Why (optional)", fr: "Pourquoi (facultatif)" },
  reasonHint: {
    en: "For example: closed, or moved. It goes in the list of places taken out, not in the copy.",
    fr: `Par exemple${NB}: fermé, ou déménagé. Ceci va dans la liste des lieux retirés, pas dans la copie.`,
  },
  problems: {
    none: { en: "Tick at least one place to remove.", fr: "Cochez au moins un lieu à retirer." },
    "too-long": { en: "The reason is longer than 500 characters.", fr: "La raison dépasse 500 caractères." },
    control: { en: "The reason cannot hold line breaks or tabs.", fr: "La raison ne peut pas contenir de sauts de ligne ni de tabulations." },
    "list-empty": { en: "The list is empty. Write one place per line.", fr: "La liste est vide. Écrivez un lieu par ligne." },
    "list-long": {
      en: "The list has more than 200 lines. Split it and tick the places in parts.",
      fr: "La liste compte plus de 200 lignes. Divisez-la et cochez les lieux en plusieurs fois.",
    },
  },
  resultTitle: { en: "The copy", fr: "La copie" },
  readBackOk: {
    en: "The copy was read back as the App would read it: every note kept is there and unchanged, and none is about a place taken out.",
    fr: `La copie a été relue comme l’App la lirait${NB}: chaque note gardée y figure sans changement, et aucune ne porte sur un lieu retiré.`,
  },
  readBackFailed: {
    en: "The copy could not be read back as expected, so it is not offered. Your file has not changed.",
    fr: "La copie n’a pas pu être relue comme prévu, elle n’est donc pas proposée. Votre fichier n’a pas changé.",
  },
  removedTitle: { en: "Places taken out", fr: "Lieux retirés" },
  downloadCopy: { en: "Download the copy", fr: "Télécharger la copie" },
  downloadRemoved: { en: "Download the notes taken out", fr: "Télécharger les notes retirées" },
  downloadList: { en: "Download the list of places taken out (text)", fr: "Télécharger la liste des lieux retirés (texte)" },
  downloadsHint: {
    en: "Keep the notes taken out if you may want them back: Combine note files can add them to the copy again.",
    fr: `Gardez les notes retirées si vous pourriez en avoir besoin${NB}: Réunir des fichiers de notes peut les rajouter à la copie.`,
  },
  changed: {
    en: "The choice changed, so the copy was put away. Remove the places again to make a new one.",
    fr: "Le choix a changé, la copie a donc été rangée. Retirez de nouveau les lieux pour en créer une nouvelle.",
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

export type DropProblem = "none" | ReasonProblem | "list-empty" | "list-long";

export function dropErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_DROP_COPY.errors[e], l);
}

export function problemText(p: DropProblem, l: Locale): string {
  return t(FILE_DROP_COPY.problems[p], l);
}

const count = (n: number, one: string, many: string, l: Locale): string => `${n} ${(l === "fr" ? n > 1 : n !== 1) ? many : one}`;
const places = (n: number, l: Locale): string => count(n, l === "fr" ? "lieu" : "place", l === "fr" ? "lieux" : "places", l);
const notes = (n: number, l: Locale): string => count(n, "note", "notes", l);

/** "3 places found." or "40 places found; the first 30 are listed. Add words to narrow the search." */
export function foundText(shown: number, total: number, l: Locale): string {
  if (total === 0) return t(FILE_DROP_COPY.noneFound, l);
  if (shown >= total) return l === "fr" ? `${count(total, "lieu trouvé", "lieux trouvés", l)}.` : `${places(total, l)} found.`;
  return l === "fr"
    ? `${count(total, "lieu trouvé", "lieux trouvés", l)}${NN}; les ${shown} premiers sont listés. Ajoutez des mots pour préciser la recherche.`
    : `${places(total, l)} found; the first ${shown} are listed. Add words to narrow the search.`;
}

const quote = (s: string, l: Locale): string => (l === "fr" ? `«${NN}${s}${NN}»` : `“${s}”`);

/** What a list ticked: lines that ticked a place, lines that named none, and lines that named more than one. */
export function listResultText(m: ListMatch, l: Locale): string {
  const lines = (n: number): string => count(n, l === "fr" ? "ligne" : "line", l === "fr" ? "lignes" : "lines", l);
  const out: string[] = [];
  if (l === "fr") {
    out.push(m.matched === 0 ? "Aucune ligne n’a coché de lieu." : `${lines(m.matched)} ${m.matched > 1 ? "ont" : "a"} coché un lieu.`);
    if (m.unmatched.length > 0)
      out.push(`${lines(m.unmatched.length)} ne ${m.unmatched.length > 1 ? "nomment" : "nomme"} aucun lieu du fichier${NB}: ${m.unmatched.map((x) => quote(x, l)).join(", ")}.`);
    if (m.ambiguous.length > 0)
      out.push(
        `${lines(m.ambiguous.length)} ${m.ambiguous.length > 1 ? "nomment" : "nomme"} plus d’un lieu${NB}: ${m.ambiguous.map((a) => `${quote(a.line, l)} (${a.places} lieux)`).join(", ")}. Trouvez-les par adresse.`,
      );
    return out.join(" ");
  }
  out.push(m.matched === 0 ? "No line ticked a place." : `${lines(m.matched)} ticked a place.`);
  if (m.unmatched.length > 0) out.push(`${lines(m.unmatched.length)} ${m.unmatched.length === 1 ? "names" : "name"} no place in the file: ${m.unmatched.map((x) => quote(x, l)).join(", ")}.`);
  if (m.ambiguous.length > 0)
    out.push(`${lines(m.ambiguous.length)} ${m.ambiguous.length === 1 ? "names" : "name"} more than one place: ${m.ambiguous.map((a) => `${quote(a.line, l)} (${a.places} places)`).join(", ")}. Find those by address.`);
  return out.join(" ");
}

/** "Places to remove (2)". */
export function chosenTitle(n: number, l: Locale): string {
  return l === "fr" ? `Lieux à retirer (${n})` : `Places to remove (${n})`;
}

/** "Do not remove Café A": a button name that says which place. */
export function keepLabel(place: Place, l: Locale): string {
  return l === "fr" ? `Ne pas retirer ${place.name}` : `Do not remove ${place.name}`;
}

/** "Remove 3 places from the copy". */
export function removeLabel(n: number, l: Locale): string {
  if (n === 0) return t(FILE_DROP_COPY.removeNone, l);
  return l === "fr" ? `Retirer ${places(n, l)} de la copie` : `Remove ${places(n, l)} from the copy`;
}

/** "Café A, 10 King St W" or "Café A, No address". */
export function placeLine(place: Place, l: Locale): string {
  return `${place.name}, ${place.address ?? t(FILE_DROP_COPY.noAddress, l)}`;
}

/** "2 places and 3 notes taken out; 37 places and 80 notes kept." */
export function removalSummary(r: Removal, l: Locale): string {
  if (l === "fr")
    return `${places(r.removed.length, l)} et ${notes(r.removedNotes.length, l)} ${r.removedNotes.length > 1 ? "retirées" : "retirée"}${NN}; ${places(r.keptPlaces, l)} et ${notes(r.kept.length, l)} ${r.kept.length > 1 ? "gardées" : "gardée"}.`;
  return `${places(r.removed.length, l)} and ${notes(r.removedNotes.length, l)} taken out; ${places(r.keptPlaces, l)} and ${notes(r.kept.length, l)} kept.`;
}

export function readBackText(b: ReadBack, l: Locale): string {
  return t(b.ok ? FILE_DROP_COPY.readBackOk : FILE_DROP_COPY.readBackFailed, l);
}

/** The list of places taken out, as plain text to keep with the copy. */
export function removalText(r: Removal, reason: string, today: Date, l: Locale): string {
  const k = l === "fr" ? `${NB}:` : ":";
  const lines = [t(FILE_DROP_COPY.removedTitle, l), today.toISOString().slice(0, 10), "", removalSummary(r, l)];
  const why = reason.trim();
  if (why !== "") lines.push(`${t(FILE_DROP_COPY.reasonLabel, l).replace(/ \(.*\)$/, "")}${k} ${why}`);
  lines.push("");
  for (const p of r.removed) lines.push(`- ${placeLine(p, l)} (${notes(p.notes.length, l)})`);
  return `${lines.join("\n")}\n`;
}

/** File names for the copy, the notes taken out and the list. */
export function dropFilename(kind: "copy" | "removed" | "list", n: number, today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  const what = l === "fr" ? `${n}-${n > 1 ? "lieux" : "lieu"}` : `${n}-${n === 1 ? "place" : "places"}`;
  if (kind === "copy") return l === "fr" ? `notes-sans-${what}-${day}.json` : `notes-without-${what}-${day}.json`;
  if (kind === "removed") return l === "fr" ? `notes-retirees-${what}-${day}.json` : `notes-taken-out-${what}-${day}.json`;
  return l === "fr" ? `lieux-retires-${what}-${day}.txt` : `places-taken-out-${what}-${day}.txt`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileDropStrings(): Array<[string, Pair]> {
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
  walk("fileDrop", FILE_DROP_COPY);
  return out;
}
