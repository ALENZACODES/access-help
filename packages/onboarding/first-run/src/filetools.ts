import type { Locale } from "../../switch-first/src/index";
import type { Announcer } from "./announce";
import type { Violation } from "./audit";
import { NB, t, type Pair } from "./copy";

/**
 * "Note files": one page that lists the App's tools for notes export files
 * (read, summarize, questions to ask, sort by street, check, compare, combine, split, from a spreadsheet) and opens one
 * at a time. Each tool is loaded with a dynamic import() only when it is
 * opened, so this page and the tools add nothing to the first install.
 */

export type ToolId = "read" | "summary" | "ask" | "streets" | "visits" | "round" | "first" | "address" | "contacts" | "replace" | "add" | "asof" | "areas" | "drop" | "rename" | "repeats" | "move" | "sources" | "check" | "compare" | "merge" | "split" | "sheet";
export const TOOL_IDS: readonly ToolId[] = ["read", "summary", "ask", "streets", "visits", "round", "first", "address", "contacts", "replace", "add", "asof", "areas", "drop", "rename", "repeats", "move", "sources", "check", "compare", "merge", "split", "sheet"];

/** What every file tool's mount function takes and returns. */
export interface ToolMountOptions {
  readonly locale: Locale;
  readonly announcer?: Announcer;
  readonly onAudit?: (violations: Violation[]) => void;
}

export interface ToolHandle {
  setLocale(locale: Locale): void;
  destroy(): void;
}

export type ToolMount = (root: HTMLElement, opts: ToolMountOptions) => ToolHandle;
export type ToolLoader = () => Promise<ToolMount>;

/** The real loaders: each one is its own chunk. */
export const TOOL_LOADERS: Readonly<Record<ToolId, ToolLoader>> = {
  read: () => import("./filereader-entry").then((m) => m.mountFileReader),
  summary: () => import("./filesummary-entry").then((m) => m.mountFileSummary),
  ask: () => import("./fileask-entry").then((m) => m.mountFileAsk),
  streets: () => import("./filestreets-entry").then((m) => m.mountFileStreets),
  visits: () => import("./filevisits-entry").then((m) => m.mountFileVisits),
  round: () => import("./fileround-entry").then((m) => m.mountFileRound),
  first: () => import("./filefirst-entry").then((m) => m.mountFileFirst),
  address: () => import("./fileaddress-entry").then((m) => m.mountFileAddress),
  contacts: () => import("./filecontacts-entry").then((m) => m.mountFileContacts),
  replace: () => import("./filereplace-entry").then((m) => m.mountFileReplace),
  add: () => import("./fileadd-entry").then((m) => m.mountFileAdd),
  asof: () => import("./fileasof-entry").then((m) => m.mountFileAsof),
  areas: () => import("./fileareas-entry").then((m) => m.mountFileAreas),
  drop: () => import("./filedrop-entry").then((m) => m.mountFileDrop),
  rename: () => import("./filerename-entry").then((m) => m.mountFileRename),
  repeats: () => import("./filerepeat-entry").then((m) => m.mountFileRepeat),
  move: () => import("./filemove-entry").then((m) => m.mountFileMove),
  sources: () => import("./filesources-entry").then((m) => m.mountFileSources),
  check: () => import("./filecheck-entry").then((m) => m.mountFileCheck),
  compare: () => import("./filecompare-entry").then((m) => m.mountFileCompare),
  merge: () => import("./filemerge-entry").then((m) => m.mountFileMerge),
  split: () => import("./filesplit-entry").then((m) => m.mountFileSplit),
  sheet: () => import("./filesheet-entry").then((m) => m.mountFileSheet),
};

export const FILE_TOOLS_COPY = {
  title: { en: "Note files", fr: "Fichiers de notes" },
  intro: {
    en: "Tools for notes export files, such as a file you made with Export notes or one someone sent you. Each tool reads files here and saves nothing.",
    fr: "Des outils pour les exportations de notes, comme un fichier créé avec Exporter les notes ou envoyé par une autre personne. Chaque outil lit les fichiers ici et n’enregistre rien.",
  },
  tools: {
    read: {
      title: { en: "Read a notes file", fr: "Lire un fichier de notes" },
      summary: {
        en: "See the places in a file one by one, with search and must-haves, without bringing anything into this device.",
        fr: "Consultez les lieux d’un fichier un à un, avec recherche et incontournables, sans rien importer sur cet appareil.",
      },
      open: { en: "Open Read a notes file", fr: "Ouvrir Lire un fichier de notes" },
    },
    summary: {
      title: { en: "Summarize a notes file", fr: "Résumer un fichier de notes" },
      summary: {
        en: "Counts for a file: how much is recorded, the answers for each detail, how old the records are and where they come from.",
        fr: `Des chiffres sur un fichier${NB}: ce qui est enregistré, les réponses pour chaque détail, l’âge des données et leur provenance.`,
      },
      open: { en: "Open Summarize a notes file", fr: "Ouvrir Résumer un fichier de notes" },
    },
    ask: {
      title: { en: "Questions to ask", fr: "Questions à poser" },
      summary: {
        en: "For each place in a file, the questions to ask about details that are Unknown, differ or are a year old, to print or open as a spreadsheet.",
        fr: "Pour chaque lieu d’un fichier, les questions à poser sur les détails UNKNOWN, divergents ou d’un an, à imprimer ou à ouvrir en tableur.",
      },
      open: { en: "Open Questions to ask", fr: "Ouvrir Questions à poser" },
    },
    streets: {
      title: { en: "Sort a notes file by street", fr: "Trier un fichier de notes par rue" },
      summary: {
        en: "Group the places in a file by street, in house-number order, and share the streets among several people, with a visit sheet for each list.",
        fr: "Regroupez les lieux d’un fichier par rue, dans l’ordre des numéros, et répartissez les rues entre plusieurs personnes, avec une fiche de visite par liste.",
      },
      open: { en: "Open Sort a notes file by street", fr: "Ouvrir Trier un fichier de notes par rue" },
    },
    visits: {
      title: { en: "Plan visits by day", fr: "Planifier les visites par jour" },
      summary: {
        en: "Spread the places in a file over the days you choose, street by street, with a time for each visit, to add to a calendar or print.",
        fr: "Répartissez les lieux d’un fichier sur les jours de votre choix, rue par rue, avec une heure pour chaque visite, à ajouter à un agenda ou à imprimer.",
      },
      open: { en: "Open Plan visits by day", fr: "Ouvrir Planifier les visites par jour" },
    },
    round: {
      title: { en: "Record what you found on a round", fr: "Noter ce que vous avez constaté lors d’une tournée" },
      summary: {
        en: "After visiting the places in a file, say what you found for each detail, with a source, a licence and the day, and get a new notes file.",
        fr: "Après avoir visité les lieux d’un fichier, indiquez ce que vous avez constaté pour chaque détail, avec une source, une licence et le jour, et obtenez un nouveau fichier de notes.",
      },
      open: { en: "Open Record what you found on a round", fr: "Ouvrir Noter ce que vous avez constaté lors d’une tournée" },
    },
    first: {
      title: { en: "Choose places to look at first", fr: "Choisir les lieux à regarder en premier" },
      summary: {
        en: "Rank the places in a file by what is still open there, with the reasons, and take the first ones as their own notes file.",
        fr: "Classez les lieux d’un fichier selon ce qui reste à regarder, avec les raisons, et prenez les premiers dans leur propre fichier de notes.",
      },
      open: { en: "Open Choose places to look at first", fr: "Ouvrir Choisir les lieux à regarder en premier" },
    },
    address: {
      title: { en: "Add missing addresses", fr: "Ajouter les adresses manquantes" },
      summary: {
        en: "Find the places in a notes file with no address, or none the App can read a street from, and add addresses in a copy: type one, or pick one another place with the same name already has in the file.",
        fr: `Trouvez les lieux d’un fichier de notes sans adresse, ou dont l’App ne peut pas lire la rue, et ajoutez des adresses dans une copie${NB}: tapez-en une, ou choisissez celle qu’un autre lieu du même nom a déjà dans le fichier.`,
      },
      open: { en: "Open Add missing addresses", fr: "Ouvrir Ajouter les adresses manquantes" },
    },
    contacts: {
      title: { en: "Remove contact details", fr: "Retirer les coordonnées" },
      summary: {
        en: "Before you share a notes file, find the emails and phone numbers in its note text, place names and source names, and remove the ones you choose in a copy.",
        fr: "Avant de partager un fichier de notes, trouvez les courriels et numéros de téléphone dans le texte des notes, les noms de lieux et les noms de sources, et retirez ceux que vous choisissez dans une copie.",
      },
      open: { en: "Open Remove contact details", fr: "Ouvrir Retirer les coordonnées" },
    },
    replace: {
      title: { en: "Find and replace in notes", fr: "Rechercher et remplacer dans les notes" },
      summary: {
        en: "Change the same words in many place names, addresses or note texts at once, in a copy. See every change first and leave out any you do not want. Records are never changed.",
        fr: "Changez les mêmes mots dans plusieurs noms de lieux, adresses ou textes de notes à la fois, dans une copie. Voyez chaque changement d’abord et laissez de côté ceux que vous ne voulez pas. Les données ne sont jamais changées.",
      },
      open: { en: "Open Find and replace in notes", fr: "Ouvrir Rechercher et remplacer dans les notes" },
    },
    add: {
      title: { en: "Add one record to many places", fr: "Ajouter une donnée à plusieurs lieux" },
      summary: {
        en: "When one source gives the same answer about a detail for many places, add it to each place you tick, in a copy, with its source, licence and date. Earlier records stay.",
        fr: "Quand une source donne la même réponse sur un détail pour plusieurs lieux, ajoutez-la à chaque lieu coché, dans une copie, avec sa source, sa licence et sa date. Les données plus anciennes restent.",
      },
      open: { en: "Open Add one record to many places", fr: "Ouvrir Ajouter une donnée à plusieurs lieux" },
    },
    asof: {
      title: { en: "A notes file as it was on a day", fr: "Un fichier de notes tel qu’il était à une date" },
      summary: {
        en: "See what a file held on a past day and what has changed since: how many places had an answer then and now, detail by detail, and which places got one since.",
        fr: `Voyez ce que contenait un fichier à une date passée et ce qui a changé depuis${NB}: combien de lieux avaient une réponse alors et maintenant, détail par détail, et quels lieux en ont reçu une depuis.`,
      },
      open: { en: "Open A notes file as it was on a day", fr: "Ouvrir Un fichier de notes tel qu’il était à une date" },
    },
    areas: {
      title: { en: "Where records are missing", fr: "Où les données manquent" },
      summary: {
        en: "See a notes file by postal area or by street: for each, detail by detail, how many places have a record and how many have none, and download an area's notes for a visit.",
        fr: `Voyez un fichier de notes par secteur postal ou par rue${NB}: pour chacun, détail par détail, combien de lieux ont une donnée et combien n’en ont pas, et téléchargez les notes d’un secteur pour une visite.`,
      },
      open: { en: "Open Where records are missing", fr: "Ouvrir Où les données manquent" },
    },
    drop: {
      title: { en: "Remove places from a file", fr: "Retirer des lieux d’un fichier" },
      summary: {
        en: "Take places that have closed or moved, with every note about them, out of a copy of a notes file, and keep the notes taken out in a file of their own.",
        fr: "Retirez d’une copie d’un fichier de notes les lieux qui ont fermé ou déménagé, avec toutes les notes à leur sujet, et gardez les notes retirées dans un fichier à part.",
      },
      open: { en: "Open Remove places from a file", fr: "Ouvrir Retirer des lieux d’un fichier" },
    },
    rename: {
      title: { en: "Rename a place", fr: "Renommer un lieu" },
      summary: {
        en: "Change the name or the address of a place in every note about it, in a copy of a notes file, and keep a list of the changes.",
        fr: "Changez le nom ou l’adresse d’un lieu dans toutes les notes à son sujet, dans une copie d’un fichier de notes, et gardez la liste des modifications.",
      },
      open: { en: "Open Rename a place", fr: "Ouvrir Renommer un lieu" },
    },
    repeats: {
      title: { en: "Remove repeated notes", fr: "Retirer les notes répétées" },
      summary: {
        en: "Find notes that say exactly the same thing as another note about the same place, and take the repeats out of a copy without changing any place’s answers.",
        fr: "Trouvez les notes qui disent exactement la même chose qu’une autre note sur le même lieu, et retirez les répétitions d’une copie sans changer les réponses d’aucun lieu.",
      },
      open: { en: "Open Remove repeated notes", fr: "Ouvrir Retirer les notes répétées" },
    },
    move: {
      title: { en: "Move a note to another place", fr: "Déplacer une note vers un autre lieu" },
      summary: {
        en: "Give a note written under the wrong place the name and address of the right one, in a copy of a notes file, and keep a list of the moves.",
        fr: "Donnez à une note écrite sous le mauvais lieu le nom et l’adresse du bon lieu, dans une copie d’un fichier de notes, et gardez la liste des déplacements.",
      },
      open: { en: "Open Move a note to another place", fr: "Ouvrir Déplacer une note vers un autre lieu" },
    },
    sources: {
      title: { en: "Which sources the answers rest on", fr: "Sur quelles sources reposent les réponses" },
      summary: {
        en: "See for each source how many records it holds and how many answers rest on it alone, and download the notes of the places that depend on it.",
        fr: "Voyez pour chaque source combien de données elle fournit et combien de réponses reposent sur elle seule, et téléchargez les notes des lieux qui en dépendent.",
      },
      open: { en: "Open Which sources the answers rest on", fr: "Ouvrir Sur quelles sources reposent les réponses" },
    },
    check: {
      title: { en: "Check a notes file", fr: "Revoir un fichier de notes" },
      summary: {
        en: "See what the App would read in a file before you share it or bring it in, and download a cleaned copy.",
        fr: "Voyez ce que l’App lirait dans un fichier avant de le partager ou de l’importer, et téléchargez une copie nettoyée.",
      },
      open: { en: "Open Check a notes file", fr: "Ouvrir Revoir un fichier de notes" },
    },
    compare: {
      title: { en: "Compare two note files", fr: "Comparer deux fichiers de notes" },
      summary: {
        en: "See where two files say the same thing and where they differ, detail by detail.",
        fr: "Voyez où deux fichiers disent la même chose et où ils diffèrent, détail par détail.",
      },
      open: { en: "Open Compare two note files", fr: "Ouvrir Comparer deux fichiers de notes" },
    },
    merge: {
      title: { en: "Combine note files", fr: "Réunir des fichiers de notes" },
      summary: {
        en: "Join two or more files into one, choosing which version to keep where they differ.",
        fr: "Réunissez deux fichiers ou plus en un seul, en choisissant la version à garder là où ils diffèrent.",
      },
      open: { en: "Open Combine note files", fr: "Ouvrir Réunir des fichiers de notes" },
    },
    split: {
      title: { en: "Split a notes file", fr: "Diviser un fichier de notes" },
      summary: {
        en: "Choose some of the notes in a file, with filters or one by one, and download them as their own file.",
        fr: "Choisissez une partie des notes d’un fichier, avec des filtres ou une à une, et téléchargez-les dans leur propre fichier.",
      },
      open: { en: "Open Split a notes file", fr: "Ouvrir Diviser un fichier de notes" },
    },
    sheet: {
      title: { en: "Make a notes file from your own spreadsheet", fr: "Créer un fichier de notes à partir de votre tableur" },
      summary: {
        en: "Turn a spreadsheet with your own columns and words into a notes file, saying where the answers come from.",
        fr: "Transformez un tableur avec vos propres colonnes et mots en fichier de notes, en indiquant d’où viennent les réponses.",
      },
      open: { en: "Open Make a notes file from your own spreadsheet", fr: "Ouvrir Créer un fichier de notes à partir de votre tableur" },
    },
  },
  back: { en: "Back to the list of note file tools", fr: "Retour à la liste des outils de fichiers de notes" },
  loading: { en: "Opening the tool…", fr: "Ouverture de l’outil…" },
  loadFailed: {
    en: "This tool could not be opened on this device right now. If you are offline, try again once you are connected.",
    fr: "Cet outil n’a pas pu s’ouvrir sur cet appareil pour le moment. Si vous êtes hors ligne, réessayez une fois connecté.",
  },
} as const;

export function toolTitle(id: ToolId, l: Locale): string {
  return t(FILE_TOOLS_COPY.tools[id].title, l);
}

/** Announced when a tool is open. */
export function openedToolText(id: ToolId, l: Locale): string {
  return l === "fr" ? `Outil ouvert${NB}: ${toolTitle(id, l)}.` : `Tool open: ${toolTitle(id, l)}.`;
}

export function isToolId(s: string | undefined): s is ToolId {
  return s !== undefined && (TOOL_IDS as readonly string[]).includes(s);
}

/** Every EN/FR pair of this page, for the copy audit. */
export function fileToolsStrings(): Array<[string, Pair]> {
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
  walk("fileTools", FILE_TOOLS_COPY);
  return out;
}
