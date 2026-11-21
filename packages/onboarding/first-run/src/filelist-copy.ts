import type { Locale } from "../../switch-first/src/index";
import { NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import { countBy, type ColumnsProblem, type Decision, type ListCheck, type ListRead, type ListStatus } from "./placelist";

/**
 * Words for "Check your list of places against a notes file", in English and
 * French. French copy uses ’, U+00A0 before ":" and U+202F before ; ! ? and
 * inside « ». A detail with no record is the token UNKNOWN in French.
 */
export const FILE_LIST_COPY = {
  title: { en: "Check your list of places against a notes file", fr: "Comparer votre liste de lieux à un fichier de notes" },
  intro: {
    en: "Paste your own list of places, from a spreadsheet with a name column and an address column, and a notes export. See which places have notes, which may be the same place under another name, and which have none yet.",
    fr: "Collez votre propre liste de lieux, tirée d’un tableur avec une colonne de noms et une colonne d’adresses, et une exportation de notes. Voyez quels lieux ont des notes, lesquels sont peut-être le même lieu sous un autre nom, et lesquels n’en ont pas encore.",
  },
  privacy: {
    en: "Places are matched by the text of their names and addresses. Nothing is looked up, nothing is saved and nothing is sent anywhere.",
    fr: "Les lieux sont rapprochés d’après le texte de leurs noms et adresses. Rien n’est recherché, enregistré ni envoyé.",
  },
  notesLabel: { en: "Text of the notes file", fr: "Texte du fichier de notes" },
  notesHint: {
    en: "A notes export is made with “Export notes” on the Notes page.",
    fr: `Une exportation de notes se crée avec «${NN}Exporter les notes${NN}» sur la page Notes.`,
  },
  notesOpen: { en: "Or open the notes file from this device", fr: "Ou ouvrez le fichier de notes depuis cet appareil" },
  listLabel: { en: "Your list of places", fr: "Votre liste de lieux" },
  listHint: {
    en: "Copy the cells from your spreadsheet, or save it as CSV and paste the text. The first row names the columns.",
    fr: "Copiez les cellules de votre tableur, ou enregistrez-le en CSV et collez le texte. La première ligne nomme les colonnes.",
  },
  listOpen: { en: "Or open the list from this device", fr: "Ou ouvrez la liste depuis cet appareil" },
  read: { en: "Check the list", fr: "Comparer la liste" },
  clear: { en: "Remove the file, the list and the results", fr: "Retirer le fichier, la liste et les résultats" },
  cleared: { en: "The page is empty. Nothing was saved.", fr: "La page est vide. Rien n’a été enregistré." },
  opened: { en: "The file is in the box. Choose Check the list when ready.", fr: "Le fichier est dans la zone. Choisissez Comparer la liste quand vous êtes prêt." },
  readFailed: { en: "That file could not be opened. Try pasting its text instead.", fr: "Ce fichier n’a pas pu être ouvert. Essayez plutôt de coller son texte." },
  errorsTitle: { en: "Fix this first", fr: "À corriger d’abord" },
  columnsTitle: { en: "Columns of your list", fr: "Colonnes de votre liste" },
  nameColumn: { en: "Column with the place’s name", fr: "Colonne du nom du lieu" },
  addressColumn: { en: "Column with the address", fr: "Colonne de l’adresse" },
  noColumn: { en: "No address column", fr: "Aucune colonne d’adresse" },
  columnOption: { en: "Column", fr: "Colonne" },
  licenceLabel: { en: "Licence for starter notes", fr: "Licence des notes de départ" },
  licenceHint: {
    en: "Starter notes record nothing yet, but every note carries an open licence.",
    fr: "Les notes de départ n’enregistrent encore rien, mais chaque note porte une licence ouverte.",
  },
  update: { en: "Check again with these columns", fr: "Comparer de nouveau avec ces colonnes" },
  problems: {
    name: { en: "Choose the column with the place’s name.", fr: "Choisissez la colonne du nom du lieu." },
    same: { en: "The name and the address must be in different columns.", fr: "Le nom et l’adresse doivent être dans des colonnes différentes." },
    licence: { en: "Choose an open licence from the list.", fr: "Choisissez une licence ouverte dans la liste." },
  },
  notesErrors: {
    empty: { en: "The notes box is empty. Paste the file’s text or open it.", fr: "La zone de notes est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The notes file is too large to read here.", fr: "Le fichier de notes est trop volumineux pour être lu ici." },
    "not-json": { en: "The notes text is not a notes export.", fr: "Le texte des notes n’est pas une exportation de notes." },
    "wrong-format": { en: "The notes text is not a notes export.", fr: "Le texte des notes n’est pas une exportation de notes." },
    "wrong-version": { en: "This export comes from a different version and cannot be read.", fr: "Cette exportation provient d’une autre version et ne peut pas être lue." },
    "no-notes": { en: "The notes file has no note the App can read.", fr: "Le fichier de notes ne contient aucune note lisible par l’App." },
  },
  listErrors: {
    empty: { en: "The list box is empty. Paste your list or open it.", fr: "La zone de liste est vide. Collez votre liste ou ouvrez-la." },
    "too-large": { en: "The list is too large to read here.", fr: "La liste est trop volumineuse pour être lue ici." },
    "unclosed-quote": { en: "A quotation mark in the list is opened and never closed.", fr: "Un guillemet de la liste est ouvert et jamais fermé." },
    "too-many-rows": { en: "The list has more than 5000 rows. Split it first.", fr: "La liste compte plus de 5000 lignes. Divisez-la d’abord." },
    "no-rows": { en: "The list has a first row but no rows under it.", fr: "La liste a une première ligne, mais aucune ligne en dessous." },
    "no-entries": { en: "No row of the list has a name in the chosen column.", fr: "Aucune ligne de la liste n’a de nom dans la colonne choisie." },
  },
  statusTitle: {
    found: { en: "Places with notes", fr: "Lieux avec des notes" },
    "same-address": { en: "Same address, another name", fr: "Même adresse, autre nom" },
    missing: { en: "Places with no notes yet", fr: "Lieux sans notes pour l’instant" },
  },
  statusHint: {
    found: {
      en: "The name and address match a place in the file, the way the App groups notes.",
      fr: "Le nom et l’adresse correspondent à un lieu du fichier, comme l’App regroupe les notes.",
    },
    "same-address": {
      en: "A place in the file has the same house number and street but another name. It may be the same place, or two places at one address. The App does not decide.",
      fr: "Un lieu du fichier a le même numéro et la même rue, mais un autre nom. C’est peut-être le même lieu, ou deux lieux à une même adresse. L’App ne tranche pas.",
    },
    missing: {
      en: "No place in the file has this name and address, or this address. Starter notes let you take these places on a round.",
      fr: "Aucun lieu du fichier n’a ce nom et cette adresse, ni cette adresse. Les notes de départ vous permettent d’inclure ces lieux dans une tournée.",
    },
  },
  decideLegend: { en: "Is this the same place?", fr: `Est-ce le même lieu${NN}?` },
  decisions: {
    same: { en: "Same place", fr: "Même lieu" },
    different: { en: "Different places", fr: "Lieux différents" },
    unsure: { en: "Not sure", fr: "Pas sûr" },
  },
  decideHint: {
    en: "Only you can tell. Same place counts it as having notes; different places gives it a starter note; not sure leaves it here.",
    fr: `Vous seul pouvez le dire. Même lieu le compte comme ayant des notes${NN}; lieux différents lui donne une note de départ${NN}; pas sûr le laisse ici.`,
  },
  decide: { en: "Use my answers", fr: "Utiliser mes réponses" },
  decided: {
    same: { en: "You said this is the same place.", fr: "Vous avez indiqué que c’est le même lieu." },
    different: { en: "You said these are different places.", fr: "Vous avez indiqué que ce sont des lieux différents." },
    unsure: { en: "You are not sure yet.", fr: "Vous n’êtes pas encore sûr." },
  },
  notInListTitle: { en: "Places in the file but not on your list", fr: "Lieux du fichier absents de votre liste" },
  inFile: { en: "In the file", fr: "Dans le fichier" },
  row: { en: "Row", fr: "Ligne" },
  noAddress: { en: "No address", fr: "Aucune adresse" },
  downloadStarter: { en: "Download starter notes for the places with no notes", fr: "Télécharger des notes de départ pour les lieux sans notes" },
  starterHint: {
    en: "Every detail in a starter note is Unknown. Open them in Record what you found on a round to add what you find.",
    fr: "Chaque détail d’une note de départ est UNKNOWN. Ouvrez-les dans Noter ce que vous avez constaté lors d’une tournée pour ajouter ce que vous trouvez.",
  },
  downloadFound: { en: "Download the notes of the places on your list", fr: "Télécharger les notes des lieux de votre liste" },
  downloadCsv: { en: "Download the results as a spreadsheet (CSV)", fr: "Télécharger les résultats en tableur (CSV)" },
  downloadText: { en: "Download the results to print", fr: "Télécharger les résultats à imprimer" },
  downloadNotInList: { en: "Download the notes of the places not on your list", fr: "Télécharger les notes des lieux absents de votre liste" },
  printMade: { en: "Made on", fr: "Créé le" },
  updated: { en: "The results are updated.", fr: "Les résultats sont mis à jour." },
} as const;

export function notesErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_LIST_COPY.notesErrors[e], l);
}

export type ListError = keyof typeof FILE_LIST_COPY.listErrors;

export function listErrorText(e: ListError, l: Locale): string {
  return t(FILE_LIST_COPY.listErrors[e], l);
}

export function columnsProblemText(p: ColumnsProblem, l: Locale): string {
  return t(FILE_LIST_COPY.problems[p], l);
}

export function decisionText(d: Decision, l: Locale): string {
  return t(FILE_LIST_COPY.decisions[d], l);
}

export function decidedText(d: Decision, l: Locale): string {
  return t(FILE_LIST_COPY.decided[d], l);
}

export function statusTitle(s: ListStatus, l: Locale): string {
  return t(FILE_LIST_COPY.statusTitle[s], l);
}

/** "Column 2: Address" for the column choices; an empty header still gets its number. */
export function columnLabel(index: number, header: string, l: Locale): string {
  const n = `${t(FILE_LIST_COPY.columnOption, l)} ${index + 1}`;
  return header === "" ? n : `${n}${l === "fr" ? NB : ""}: ${header}`;
}

const placesCount = (n: number, l: Locale): string => (l === "fr" ? `${n} ${n > 1 ? "lieux" : "lieu"}` : `${n} ${n === 1 ? "place" : "places"}`);
const rowsCount = (n: number, l: Locale): string => (l === "fr" ? `${n} ${n > 1 ? "lignes" : "ligne"}` : `${n} ${n === 1 ? "row" : "rows"}`);

/** "Your list has 12 places: 7 with notes, 2 at the same address under another name, 3 with no notes yet." */
export function checkSummary(check: ListCheck, l: Locale): string {
  const c = countBy(check);
  const total = check.matches.length;
  if (l === "fr") {
    const head = `Votre liste compte ${placesCount(total, l)}${NB}: ${c.found} avec des notes, ${c["same-address"]} à la même adresse sous un autre nom, ${c.missing} sans notes pour l’instant.`;
    return check.notInList.length > 0 ? `${head} ${placesCount(check.notInList.length, l)} du fichier ${check.notInList.length > 1 ? "ne sont" : "n’est"} pas sur la liste.` : head;
  }
  const head = `Your list has ${placesCount(total, l)}: ${c.found} with notes, ${c["same-address"]} at the same address under another name, ${c.missing} with no notes yet.`;
  return check.notInList.length > 0 ? `${head} ${placesCount(check.notInList.length, l)} in the file ${check.notInList.length === 1 ? "is" : "are"} not on the list.` : head;
}

/** What was set aside while reading the list: empty names, rows the App cannot keep, repeated places. */
export function setAsideText(read: ListRead, l: Locale): string {
  const parts: string[] = [];
  const rowsList = (rows: readonly number[]): string => rows.slice(0, 10).join(", ") + (rows.length > 10 ? "…" : "");
  if (l === "fr") {
    if (read.blank > 0) parts.push(`${rowsCount(read.blank, l)} sans nom ${read.blank > 1 ? "sont laissées" : "est laissée"} de côté.`);
    if (read.unusable.length > 0) parts.push(`${rowsCount(read.unusable.length, l)} avec un nom ou une adresse trop long ou des caractères que l’App ne peut pas garder${NB}: ${rowsList(read.unusable)}.`);
    if (read.repeats.length > 0) parts.push(`${rowsCount(read.repeats.length, l)} ${read.repeats.length > 1 ? "répètent" : "répète"} un lieu déjà listé${NB}: ${rowsList(read.repeats)}.`);
  } else {
    if (read.blank > 0) parts.push(`${rowsCount(read.blank, l)} with no name ${read.blank === 1 ? "is" : "are"} left out.`);
    if (read.unusable.length > 0) parts.push(`${rowsCount(read.unusable.length, l)} with a name or address too long, or with characters the App cannot keep: ${rowsList(read.unusable)}.`);
    if (read.repeats.length > 0) parts.push(`${rowsCount(read.repeats.length, l)} ${read.repeats.length === 1 ? "repeats" : "repeat"} a place already listed: ${rowsList(read.repeats)}.`);
  }
  return parts.join(" ");
}

/** "Row 4" beside each entry, so the person can find it in their spreadsheet. */
export function rowText(row: number, l: Locale): string {
  return `${t(FILE_LIST_COPY.row, l)} ${row}`;
}

/** "3 of 4 details recorded" for a place found in the file. */
export function recordedText(n: number, total: number, l: Locale): string {
  return l === "fr" ? `${n} détail${n > 1 ? "s" : ""} sur ${total} ${n > 1 ? "notés" : "noté"}` : `${n} of ${total} details recorded`;
}

/**
 * The results as text to print: the summary, then each status with its rows,
 * a box to tick beside each place with no notes, and the places in the file
 * that are not on the list.
 */
export function checkText(check: ListCheck, l: Locale, today: Date): string {
  const C = FILE_LIST_COPY;
  const k = l === "fr" ? `${NB}:` : ":";
  const where = (name: string, address: string | undefined): string => `${name}, ${address ?? t(C.noAddress, l)}`;
  const lines: string[] = [t(C.title, l), `${t(C.printMade, l)} ${today.toISOString().slice(0, 10)}`, checkSummary(check, l), ""];
  for (const s of ["found", "same-address", "missing"] as const) {
    const mine = check.matches.filter((m) => m.status === s);
    if (mine.length === 0) continue;
    lines.push(`${statusTitle(s, l)} (${mine.length})`);
    for (const m of mine) {
      lines.push(`${s === "missing" ? "[ ] " : ""}${rowText(m.entry.row, l)}${k} ${where(m.entry.name, m.entry.address)}`);
      if (s === "same-address") for (const p of m.places) lines.push(`    ${t(C.inFile, l)}${k} ${where(p.name, p.address)}`);
      if (m.decided) lines.push(`    ${decidedText(m.decided, l)}`);
    }
    lines.push("");
  }
  if (check.notInList.length > 0) {
    lines.push(`${t(C.notInListTitle, l)} (${check.notInList.length})`);
    for (const p of check.notInList) lines.push(where(p.name, p.address));
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

export function listFilename(kind: "starter" | "found" | "csv" | "text" | "not-in-list", today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  if (kind === "text") return l === "fr" ? `comparaison-de-liste-${day}.txt` : `list-check-${day}.txt`;
  if (kind === "not-in-list") return l === "fr" ? `notes-hors-de-votre-liste-${day}.json` : `notes-not-on-your-list-${day}.json`;
  if (kind === "csv") return l === "fr" ? `comparaison-de-liste-${day}.csv` : `list-check-${day}.csv`;
  if (kind === "found") return l === "fr" ? `notes-de-votre-liste-${day}.json` : `notes-on-your-list-${day}.json`;
  return l === "fr" ? `notes-de-depart-${day}.json` : `starter-notes-${day}.json`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileListStrings(): Array<[string, Pair]> {
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
  walk("fileList", FILE_LIST_COPY);
  return out;
}
