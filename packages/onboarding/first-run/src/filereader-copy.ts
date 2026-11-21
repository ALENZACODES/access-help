import type { Locale } from "../../switch-first/src/index";
import { NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import type { Group } from "./filereader";

/**
 * Words for "Read a notes file", in English and French. French copy uses ’,
 * U+00A0 before ":" and U+202F before ; ! ? and inside « ». A detail with no
 * record is the token UNKNOWN in French.
 */
export const FILE_READER_COPY = {
  title: { en: "Read a notes file", fr: "Lire un fichier de notes" },
  intro: {
    en: "See the places in a notes export, place by place, without bringing anything into this device. Search, and set must-haves to sort the places into three groups.",
    fr: "Consultez les lieux d’une exportation de notes, lieu par lieu, sans rien importer sur cet appareil. Cherchez, et choisissez des incontournables pour classer les lieux en trois groupes.",
  },
  privacy: {
    en: "Nothing changes on this device: the file is read here, it is not saved and it is not sent anywhere.",
    fr: `Rien ne change sur cet appareil${NB}: le fichier est lu ici, il n’est pas enregistré et n’est envoyé nulle part.`,
  },
  pasteLabel: { en: "Text of the notes file", fr: "Texte du fichier de notes" },
  pasteHint: {
    en: "A notes export is made with “Export notes” on the Notes page.",
    fr: `Une exportation de notes se crée avec «${NN}Exporter les notes${NN}» sur la page Notes.`,
  },
  openLabel: { en: "Or open the file from this device", fr: "Ou ouvrez le fichier depuis cet appareil" },
  read: { en: "Show the places in this file", fr: "Afficher les lieux de ce fichier" },
  clear: { en: "Remove the file from the page", fr: "Retirer le fichier de la page" },
  cleared: { en: "The page is empty. Nothing was saved.", fr: "La page est vide. Rien n’a été enregistré." },
  opened: { en: "The file is in the box. Choose Show the places when ready.", fr: "Le fichier est dans la zone. Choisissez Afficher les lieux quand vous êtes prêt." },
  readFailed: { en: "That file could not be opened. Try pasting its text instead.", fr: "Ce fichier n’a pas pu être ouvert. Essayez plutôt de coller son texte." },
  errorsTitle: { en: "Fix this first", fr: "À corriger d’abord" },
  exported: { en: "The file says it was exported on", fr: "Le fichier indique une exportation le" },
  findTitle: { en: "Search and must-haves", fr: "Recherche et incontournables" },
  searchLabel: { en: "Words in the place name or address", fr: "Mots dans le nom du lieu ou l’adresse" },
  searchHint: { en: "Every word must appear. Capitals and accents do not matter.", fr: "Chaque mot doit figurer. Les majuscules et les accents ne comptent pas." },
  mustHaveHint: {
    en: "A must-have is a detail and the answer you need. Places with no record for it are not ruled out: they go in their own group.",
    fr: `Un incontournable est un détail et la réponse dont vous avez besoin. Les lieux sans donnée pour ce détail ne sont pas écartés${NB}: ils forment leur propre groupe.`,
  },
  noMustHave: { en: "Not a must-have", fr: "Pas un incontournable" },
  mustYes: { en: "Must be Yes", fr: "Doit être Oui" },
  mustNo: { en: "Must be No", fr: "Doit être Non" },
  show: { en: "Show matching places", fr: "Afficher les lieux correspondants" },
  resetFind: { en: "Remove the search and every must-have", fr: "Retirer la recherche et tous les incontournables" },
  groups: {
    all: { en: "Places in the file", fr: "Lieux du fichier" },
    match: { en: "Every must-have matches", fr: "Tous les incontournables correspondent" },
    unknown: { en: "A must-have is Unknown or reports differ", fr: "Un incontournable est UNKNOWN ou les rapports divergent" },
    excluded: { en: "A must-have is answered the other way", fr: "Un incontournable a la réponse contraire" },
  },
  notRanked: {
    en: "The groups follow your must-haves. They are not a ranking, and Unknown does not mean No.",
    fr: "Les groupes suivent vos incontournables. Ce n’est pas un classement, et UNKNOWN ne veut pas dire Non.",
  },
  noPlaces: { en: "No place.", fr: "Aucun lieu." },
  showDetails: { en: "Show details", fr: "Afficher les détails" },
  hideDetails: { en: "Hide details", fr: "Masquer les détails" },
  previous: { en: "Previous page", fr: "Page précédente" },
  next: { en: "Next page", fr: "Page suivante" },
  download: { en: "Download the places shown, as text", fr: "Télécharger les lieux affichés en texte" },
  updated: { en: "The list is updated.", fr: "La liste est mise à jour." },
  errors: {
    empty: { en: "The box is empty. Paste the file’s text or open it.", fr: "La zone est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The file is too large to read here.", fr: "Le fichier est trop volumineux pour être lu ici." },
    "not-json": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-format": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-version": { en: "This export comes from a different version and cannot be read.", fr: "Cette exportation provient d’une autre version et ne peut pas être lue." },
    "no-notes": { en: "This file has no note the App can read.", fr: "Ce fichier ne contient aucune note lisible par l’App." },
  },
} as const;

export function readerErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_READER_COPY.errors[e], l);
}

/** The heading of a group; without must-haves there is one group of every place. */
export function groupTitle(g: Group, withMustHaves: boolean, l: Locale): string {
  return t(withMustHaves ? FILE_READER_COPY.groups[g] : FILE_READER_COPY.groups.all, l);
}

/** "12 places from 15 notes, 1 entry left out." */
export function fileSummaryText(places: number, notes: number, leftOut: number, l: Locale): string {
  if (l === "fr") {
    return `${places} ${places > 1 ? "lieux" : "lieu"} tirés de ${notes} ${notes > 1 ? "notes" : "note"}, ${leftOut} ${leftOut > 1 ? "entrées écartées" : "entrée écartée"}.`;
  }
  return `${places} ${places === 1 ? "place" : "places"} from ${notes} ${notes === 1 ? "note" : "notes"}, ${leftOut} ${leftOut === 1 ? "entry" : "entries"} left out.`;
}

/** "Page 2 of 3, places 21 to 40 of 45." */
export function pageText(page: number, pageCount: number, from: number, to: number, total: number, l: Locale): string {
  if (l === "fr") return `Page ${page + 1} sur ${pageCount}, lieux ${from} à ${to} sur ${total}.`;
  return `Page ${page + 1} of ${pageCount}, places ${from} to ${to} of ${total}.`;
}

/** The name of a details button holds the place, so each button has its own name. */
export function detailsButtonText(open: boolean, name: string, l: Locale): string {
  return `${t(open ? FILE_READER_COPY.hideDetails : FILE_READER_COPY.showDetails, l)}${l === "fr" ? NB : ""}: ${name}`;
}

/** Paging buttons name their group, so the buttons of two groups do not share a name. */
export function pageButtonText(which: "previous" | "next", groupName: string, l: Locale): string {
  return `${t(FILE_READER_COPY[which], l)} (${groupName})`;
}

/** Announced after a search: how many places in each group. */
export function foundText(counts: readonly number[], withMustHaves: boolean, l: Locale): string {
  const [m = 0, u = 0, x = 0] = counts;
  if (!withMustHaves) return l === "fr" ? `${m} ${m > 1 ? "lieux affichés" : "lieu affiché"}.` : `${m} ${m === 1 ? "place" : "places"} shown.`;
  if (l === "fr") return `Correspondent${NB}: ${m}. UNKNOWN ou divergents${NB}: ${u}. Réponse contraire${NB}: ${x}.`;
  return `Match: ${m}. Unknown or differing: ${u}. Answered the other way: ${x}.`;
}

export function readerFilename(today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  return l === "fr" ? `lieux-du-fichier-${day}.txt` : `places-in-file-${day}.txt`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileReaderStrings(): Array<[string, Pair]> {
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
  walk("fileReader", FILE_READER_COPY);
  return out;
}
