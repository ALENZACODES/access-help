import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import type { FactKey } from "./facts";
import { unknownIn, type Cell, type GridOrder, type GridRow, type Page, type Shown } from "./answergrid";

/**
 * Words for "Answers by place, in a table", in English and French. French
 * copy uses ’, U+00A0 before ":" and U+202F before ; ! ? and inside « ».
 */
export const FILE_GRID_COPY = {
  title: { en: "Answers by place, in a table", fr: "Les réponses par lieu, en tableau" },
  intro: {
    en: "One row for each place in a notes file and one column for each detail: what the App shows, the day of the newest record and how many sources it rests on.",
    fr: `Une ligne pour chaque lieu d’un fichier de notes et une colonne pour chaque détail${NB}: ce que l’App affiche, le jour de la donnée la plus récente et le nombre de sources sur lesquelles elle repose.`,
  },
  rule: {
    en: "This shows what is written down. A detail with no record stays Unknown, and nothing here says a place is better or worse.",
    fr: "Ceci montre ce qui est noté. Un détail sans donnée reste UNKNOWN, et rien ici ne dit qu’un lieu est meilleur ou pire.",
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
  filterTitle: { en: "Which places to show", fr: "Quels lieux afficher" },
  textLabel: { en: "Name or address (optional)", fr: "Nom ou adresse (facultatif)" },
  textHint: {
    en: "Every word must be in the place’s name or address; case and accents do not matter.",
    fr: "Chaque mot doit figurer dans le nom ou l’adresse du lieu, sans tenir compte des majuscules ni des accents.",
  },
  keyLabel: { en: "Only places where this detail", fr: "Seulement les lieux où ce détail" },
  anyKey: { en: "Any detail: no narrowing", fr: "N’importe quel détail, sans restriction" },
  anyColumn: { en: "Any detail shown as a column", fr: "N’importe quel détail affiché en colonne" },
  untickAll: { en: "Untick every place", fr: "Décocher tous les lieux" },
  onlyTicked: { en: "Show only the places ticked", fr: "N’afficher que les lieux cochés" },
  tickedHint: {
    en: "Tick places in the table to download only their notes. The ticks stay when you change page.",
    fr: "Cochez des lieux dans le tableau pour ne télécharger que leurs notes. Les coches restent quand vous changez de page.",
  },
  shownLabel: { en: "shows", fr: "affiche" },
  differ: { en: "Reports differ", fr: "Rapports divergents" },
  orderLegend: { en: "Order", fr: "Ordre" },
  order: {
    name: { en: "By name", fr: "Par nom" },
    unknown: { en: "Most details with no record first", fr: "Le plus de détails sans donnée d’abord" },
    newest: { en: "Newest record first", fr: "Donnée la plus récente d’abord" },
  },
  columnsLegend: { en: "Details to show as columns", fr: "Détails à afficher en colonnes" },
  noColumns: { en: "Tick at least one detail to show.", fr: "Cochez au moins un détail à afficher." },
  show: { en: "Show the places", fr: "Afficher les lieux" },
  gotoLabel: { en: "Go to page", fr: "Aller à la page" },
  go: { en: "Go to this page", fr: "Aller à cette page" },
  downloadText: { en: "Download these places (text)", fr: "Télécharger ces lieux (texte)" },
  resultsTitle: { en: "Places and their answers", fr: "Les lieux et leurs réponses" },
  noRows: { en: "No place matches.", fr: "Aucun lieu ne correspond." },
  colPlace: { en: "Place", fr: "Lieu" },
  colUnknown: { en: "Details with no record", fr: "Détails sans donnée" },
  noAddress: { en: "No address", fr: "Aucune adresse" },
  breakdownTitle: { en: "Answers among these places", fr: "Les réponses parmi ces lieux" },
  pagesLabel: { en: "Pages of places", fr: "Pages de lieux" },
  prev: { en: "Previous page", fr: "Page précédente" },
  next: { en: "Next page", fr: "Page suivante" },
  downloadCsv: { en: "Download these places as a table (CSV)", fr: "Télécharger ces lieux en tableau (CSV)" },
  downloadNotes: { en: "Download the notes of these places", fr: "Télécharger les notes de ces lieux" },
  errors: {
    empty: { en: "The box is empty. Paste the file’s text or open it.", fr: "La zone est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The file is too large to read here.", fr: "Le fichier est trop volumineux pour être lu ici." },
    "not-json": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-format": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-version": { en: "This export comes from a different version and cannot be read.", fr: "Cette exportation provient d’une autre version et ne peut pas être lue." },
    "no-notes": { en: "This file has no note the App can read.", fr: "Ce fichier ne contient aucune note lisible par l’App." },
  },
} as const;

export function gridErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_GRID_COPY.errors[e], l);
}

export function orderText(o: GridOrder, l: Locale): string {
  return t(FILE_GRID_COPY.order[o], l);
}

const count = (n: number, one: string, many: string, l: Locale): string => `${n} ${(l === "fr" ? n > 1 : n !== 1) ? many : one}`;

/** "Yes", "No", the Unknown word of the language, or "Reports differ". */
export function shownText(s: Shown, l: Locale): string {
  return s === "differ" ? t(FILE_GRID_COPY.differ, l) : t(COPY.values[s], l);
}

/** "Yes, 2026-10-01, 2 sources", or the Unknown word alone. */
export function cellText(c: Cell, l: Locale): string {
  if (c.shown === "unknown") return shownText("unknown", l);
  return `${shownText(c.shown, l)}, ${c.newest}, ${count(c.sources, "source", "sources", l)}`;
}

/** "Places 26 to 50 of 230", the table's caption. */
export function captionText(p: Page, l: Locale): string {
  if (p.total === 0) return t(FILE_GRID_COPY.noRows, l);
  return l === "fr" ? `Lieux ${p.first} à ${p.last} sur ${p.total}` : `Places ${p.first} to ${p.last} of ${p.total}`;
}

/** "Page 2 of 10". */
export function pageText(p: Page, l: Locale): string {
  return l === "fr" ? `Page ${p.page} sur ${p.pages}` : `Page ${p.page} of ${p.pages}`;
}

/** "12 places match." */
export function matchText(total: number, l: Locale): string {
  if (total === 0) return t(FILE_GRID_COPY.noRows, l);
  return l === "fr" ? `${count(total, "lieu correspond", "lieux correspondent", l)}.` : `${count(total, "place matches", "places match", l)}.`;
}

/** "Elevator: 3 Yes, 1 No, 5 Unknown, 0 where reports differ." */
export function breakdownText(key: FactKey, counts: Readonly<Record<Shown, number>>, l: Locale): string {
  const k = l === "fr" ? `${NB}:` : ":";
  const differ = l === "fr" ? `${counts.differ} aux rapports divergents` : `${counts.differ} where reports differ`;
  return `${t(COPY.facts[key], l)}${k} ${counts.yes} ${shownText("yes", l)}, ${counts.no} ${shownText("no", l)}, ${counts.unknown} ${shownText("unknown", l)}, ${differ}.`;
}

/** "Choose Café, 1 King St W": a tick box's name, which says which place. */
export function tickLabel(name: string, address: string | undefined, l: Locale): string {
  const where = address ?? t(FILE_GRID_COPY.noAddress, l);
  return l === "fr" ? `Choisir ${name}, ${where}` : `Choose ${name}, ${where}`;
}

/** "Download the notes of the 3 places ticked". */
export function tickedDownloadText(n: number, l: Locale): string {
  return l === "fr" ? `Télécharger les notes ${n > 1 ? `des ${n} lieux cochés` : "du lieu coché"}` : `Download the notes of the ${n === 1 ? "place" : `${n} places`} ticked`;
}

/** "Write a page number from 1 to 3." */
export function badPageText(pages: number, l: Locale): string {
  return l === "fr" ? `Écrivez un numéro de page de 1 à ${pages}.` : `Write a page number from 1 to ${pages}.`;
}

/** The places shown as plain text, with each detail shown, to print or keep. */
export function gridText(rows: readonly GridRow[], columns: readonly FactKey[], today: Date, l: Locale): string {
  const k = l === "fr" ? `${NB}:` : ":";
  const lines = [t(FILE_GRID_COPY.title, l), today.toISOString().slice(0, 10), "", t(FILE_GRID_COPY.rule, l), matchText(rows.length, l), ""];
  for (const r of rows) {
    lines.push(`${r.place.name}, ${r.place.address ?? t(FILE_GRID_COPY.noAddress, l)}`);
    for (const key of columns) lines.push(`    ${t(COPY.facts[key], l)}${k} ${cellText(r.cells[key], l)}`);
    lines.push(`    ${t(FILE_GRID_COPY.colUnknown, l)}${k} ${unknownIn(r, columns)}`);
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

/** File names for the table, the text and the notes of the places shown. */
export function gridFilename(kind: "csv" | "text" | "notes", n: number, today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  if (kind === "text") return l === "fr" ? `lieux-${n}-${day}.txt` : `places-${n}-${day}.txt`;
  if (kind === "csv") return l === "fr" ? `tableau-${n}-${n > 1 ? "lieux" : "lieu"}-${day}.csv` : `table-${n}-${n === 1 ? "place" : "places"}-${day}.csv`;
  return l === "fr" ? `notes-${n}-${n > 1 ? "lieux" : "lieu"}-${day}.json` : `notes-${n}-${n === 1 ? "place" : "places"}-${day}.json`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileGridStrings(): Array<[string, Pair]> {
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
  walk("fileGrid", FILE_GRID_COPY);
  return out;
}
