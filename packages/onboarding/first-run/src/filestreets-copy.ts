import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import type { FactKey } from "./facts";
import { batchPlaces, differingDetails, unknownDetails, type Batch, type GroupBy, type ListGroup } from "./filestreets";
import type { Place } from "./places";

/**
 * Words for "Sort a notes file by street", in English and French. French copy
 * uses ’, U+00A0 before ":" and U+202F before ; ! ? and inside « ». A detail
 * with no record is the token UNKNOWN in French.
 */
export const FILE_STREETS_COPY = {
  title: { en: "Sort a notes file by street", fr: "Trier un fichier de notes par rue" },
  intro: {
    en: "Group the places in a notes export by the street in their address, in house-number order, for a walk or a round of calls. You can share the streets among several people.",
    fr: "Regroupez les lieux d’une exportation de notes selon la rue de leur adresse, dans l’ordre des numéros, pour une tournée à pied ou une série d’appels. Vous pouvez répartir les rues entre plusieurs personnes.",
  },
  privacy: {
    en: "Streets are read from the addresses as typed. Nothing is looked up, nothing is saved and nothing is sent anywhere.",
    fr: "Les rues sont lues dans les adresses telles qu’elles ont été saisies. Rien n’est recherché, enregistré ni envoyé.",
  },
  pasteLabel: { en: "Text of the notes file", fr: "Texte du fichier de notes" },
  pasteHint: {
    en: "A notes export is made with “Export notes” on the Notes page.",
    fr: `Une exportation de notes se crée avec «${NN}Exporter les notes${NN}» sur la page Notes.`,
  },
  openLabel: { en: "Or open the file from this device", fr: "Ou ouvrez le fichier depuis cet appareil" },
  read: { en: "Sort the places by street", fr: "Trier les lieux par rue" },
  clear: { en: "Remove the file and the lists", fr: "Retirer le fichier et les listes" },
  cleared: { en: "The page is empty. Nothing was saved.", fr: "La page est vide. Rien n’a été enregistré." },
  opened: { en: "The file is in the box. Choose Sort the places when ready.", fr: "Le fichier est dans la zone. Choisissez Trier les lieux quand vous êtes prêt." },
  readFailed: { en: "That file could not be opened. Try pasting its text instead.", fr: "Ce fichier n’a pas pu être ouvert. Essayez plutôt de coller son texte." },
  errorsTitle: { en: "Fix this first", fr: "À corriger d’abord" },
  optionsTitle: { en: "How to make the lists", fr: "Comment faire les listes" },
  byLegend: { en: "Group the places by", fr: "Regrouper les lieux par" },
  byOptions: {
    street: { en: "Street", fr: "Rue" },
    postal: { en: "Postal area (first three characters of the postal code)", fr: "Zone postale (trois premiers caractères du code postal)" },
  },
  bothSides: { en: "Walk one side of each street, then come back on the other (odd numbers, then even)", fr: "Parcourir un côté de chaque rue, puis revenir par l’autre (numéros impairs, puis pairs)" },
  onlyOpen: {
    en: "Only places with something to look at (a detail with no record, or reports that differ)",
    fr: "Seulement les lieux où il y a quelque chose à regarder (un détail sans donnée ou des rapports divergents)",
  },
  peopleLabel: { en: "Share the groups among how many people? (1 to 20)", fr: `Répartir les groupes entre combien de personnes${NN}? (1 à 20)` },
  peopleHint: {
    en: "Each person gets whole groups, with about the same number of places. With 1, each group is its own list.",
    fr: "Chaque personne reçoit des groupes entiers, avec à peu près le même nombre de lieux. Avec 1, chaque groupe forme sa propre liste.",
  },
  share: { en: "Update the lists", fr: "Mettre les listes à jour" },
  badPeople: { en: "Give a whole number from 1 to 20.", fr: "Indiquez un nombre entier de 1 à 20." },
  groupsTitle: {
    street: { en: "Streets", fr: "Rues" },
    postal: { en: "Postal areas", fr: "Zones postales" },
  },
  ungroupedTitle: {
    street: { en: "Places with no street in the address", fr: "Lieux sans rue dans l’adresse" },
    postal: { en: "Places with no postal code in the address", fr: "Lieux sans code postal dans l’adresse" },
  },
  ungroupedHint: {
    street: {
      en: "The address of these places has no house number followed by a street, or no address at all. They are not guessed onto a street.",
      fr: "L’adresse de ces lieux n’a pas de numéro suivi d’une rue, ou il n’y a pas d’adresse. Ils ne sont pas rattachés à une rue au hasard.",
    },
    postal: {
      en: "The address of these places has no postal code. They are not guessed into an area.",
      fr: "L’adresse de ces lieux n’a pas de code postal. Ils ne sont pas rattachés à une zone au hasard.",
    },
  },
  downloadCsv: { en: "Download every list as a spreadsheet (CSV)", fr: "Télécharger toutes les listes en tableur (CSV)" },
  batchesTitle: { en: "Lists for each person", fr: "Listes pour chaque personne" },
  noAddress: { en: "No address", fr: "Aucune adresse" },
  downloadNotes: { en: "Download the notes", fr: "Télécharger les notes" },
  downloadSheet: { en: "Download the visit sheet", fr: "Télécharger la fiche de visite" },
  downloadAll: { en: "Download every list as one text", fr: "Télécharger toutes les listes en un seul texte" },
  sheetHeading: { en: "Visit sheet", fr: "Fiche de visite" },
  sheetMade: { en: "Made on", fr: "Créé le" },
  sheetNote: {
    en: "Unknown means no note records the detail; it does not mean No. Write what you find, then add a note with a source, a licence and a date.",
    fr: "UNKNOWN veut dire qu’aucune note n’enregistre le détail, et non pas Non. Notez ce que vous trouvez, puis ajoutez une note avec une source, une licence et une date.",
  },
  toLookAt: { en: "To look at", fr: "À regarder" },
  reportsDiffer: { en: "reports differ", fr: "rapports divergents" },
  nothingOpen: { en: "Every detail has a record.", fr: "Chaque détail a une donnée." },
  foundLine: { en: "Found: ________", fr: `Constaté${NB}: ________` },
  updated: { en: "The lists are updated.", fr: "Les listes sont mises à jour." },
  errors: {
    empty: { en: "The box is empty. Paste the file’s text or open it.", fr: "La zone est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The file is too large to read here.", fr: "Le fichier est trop volumineux pour être lu ici." },
    "not-json": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-format": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-version": { en: "This export comes from a different version and cannot be read.", fr: "Cette exportation provient d’une autre version et ne peut pas être lue." },
    "no-notes": { en: "This file has no note the App can read.", fr: "Ce fichier ne contient aucune note lisible par l’App." },
  },
} as const;

export function streetsErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_STREETS_COPY.errors[e], l);
}

const count = (n: number, l: Locale): string => (l === "fr" ? `${n} ${n > 1 ? "lieux" : "lieu"}` : `${n} ${n === 1 ? "place" : "places"}`);

/** "King Street West (3 places)". The group's name comes from the person's addresses. */
export function groupHeading(g: ListGroup, l: Locale): string {
  return `${g.name} (${count(g.places.length, l)})`;
}

export function groupsTitle(by: GroupBy, l: Locale): string {
  return t(FILE_STREETS_COPY.groupsTitle[by], l);
}

export function ungroupedTitle(by: GroupBy, l: Locale): string {
  return t(FILE_STREETS_COPY.ungroupedTitle[by], l);
}

/** "3 places with nothing to look at are left out." */
export function leftOutDoneText(n: number, l: Locale): string {
  if (l === "fr") return n === 1 ? "1 lieu sans rien à regarder est laissé de côté." : `${n} lieux sans rien à regarder sont laissés de côté.`;
  return n === 1 ? "1 place with nothing to look at is left out." : `${n} places with nothing to look at are left out.`;
}

/** "Person 2": the name of one person's list, used in its links. */
export function batchName(b: Batch, l: Locale): string {
  return `${l === "fr" ? "Personne" : "Person"} ${b.index + 1}`;
}

/** "Person 2 (14 places)". */
export function batchHeading(b: Batch, l: Locale): string {
  return `${batchName(b, l)} (${count(b.size, l)})`;
}

/** "12 places on 4 streets; 2 places with no street." or the same in postal areas. */
export function sortedText(places: number, groups: number, ungrouped: number, l: Locale, by: GroupBy = "street"): string {
  if (l === "fr") {
    const g = by === "street" ? `${groups} ${groups > 1 ? "rues" : "rue"}` : `${groups} ${groups > 1 ? "zones postales" : "zone postale"}`;
    return `${count(places, l)} ${by === "street" ? "sur" : "dans"} ${g}${NN}; ${count(ungrouped, l)} ${by === "street" ? "sans rue" : "sans code postal"}.`;
  }
  const g = by === "street" ? `${groups} ${groups === 1 ? "street" : "streets"}` : `${groups} postal ${groups === 1 ? "area" : "areas"}`;
  return `${count(places, l)} ${by === "street" ? "on" : "in"} ${g}; ${count(ungrouped, l)} with no ${by === "street" ? "street" : "postal code"}.`;
}

/** "Download the notes (King Street West)": each link names its group, so no two links share a name. */
export function groupLinkText(label: Pair, group: string, l: Locale): string {
  return `${t(label, l)} (${group})`;
}

function detailNames(keys: readonly FactKey[], l: Locale): string {
  return keys.map((k) => t(COPY.facts[k], l)).join(", ");
}

/** One place on a visit sheet: name, address, what to look at, and a line to write what was found. */
export function placeLines(p: Place, l: Locale): string[] {
  const unknown = unknownDetails(p);
  const differ = differingDetails(p);
  const k = l === "fr" ? `${NB}:` : ":";
  const open = [
    ...(unknown.length > 0 ? [`${detailNames(unknown, l)} (${t(COPY.values.unknown, l)})`] : []),
    ...(differ.length > 0 ? [`${detailNames(differ, l)} (${t(FILE_STREETS_COPY.reportsDiffer, l)})`] : []),
  ];
  return [
    `[ ] ${p.name}`,
    `    ${p.address ?? t(FILE_STREETS_COPY.noAddress, l)}`,
    `    ${t(FILE_STREETS_COPY.toLookAt, l)}${k} ${open.length > 0 ? open.join(l === "fr" ? `${NN}; ` : "; ") : t(FILE_STREETS_COPY.nothingOpen, l)}`,
    `    ${t(FILE_STREETS_COPY.foundLine, l)}`,
  ];
}

/** A visit sheet for one street or one person's batch. */
export function visitSheet(title: string, groups: ReadonlyArray<{ name: string; places: readonly Place[] }>, l: Locale, today: Date): string {
  const lines: string[] = [`${t(FILE_STREETS_COPY.sheetHeading, l)}${l === "fr" ? NB : ""}: ${title}`, `${t(FILE_STREETS_COPY.sheetMade, l)} ${today.toISOString().slice(0, 10)}`, t(FILE_STREETS_COPY.sheetNote, l), ""];
  for (const g of groups) {
    if (g.places.length === 0) continue;
    lines.push(g.name, "-".repeat(Math.min(Math.max(g.name.length, 3), 72)));
    for (const p of g.places) lines.push(...placeLines(p, l));
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

/** The groups of a list as visit-sheet sections: its groups, then its places in no group. */
export function batchSections(b: Batch, by: GroupBy, l: Locale): Array<{ name: string; places: Place[] }> {
  return [...b.groups.map((g) => ({ name: g.name, places: [...g.places] })), { name: ungroupedTitle(by, l), places: [...b.ungrouped] }];
}

/** Every list's sheet one after another, for printing in one go. */
export function allSheets(batches: readonly Batch[], by: GroupBy, l: Locale, today: Date): string {
  return batches
    .filter((b) => batchPlaces(b).length > 0)
    .map((b) => visitSheet(batchHeading(b, l), batchSections(b, by, l), l, today))
    .join("\n");
}

export function streetsFilename(kind: "notes" | "sheet" | "all" | "csv", group: number, today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  if (kind === "all") return l === "fr" ? `fiches-de-visite-${day}.txt` : `visit-sheets-${day}.txt`;
  if (kind === "csv") return l === "fr" ? `listes-de-visite-${day}.csv` : `visit-lists-${day}.csv`;
  const n = String(group + 1).padStart(2, "0");
  if (kind === "notes") return l === "fr" ? `notes-liste-${n}-${day}.json` : `notes-list-${n}-${day}.json`;
  return l === "fr" ? `fiche-liste-${n}-${day}.txt` : `sheet-list-${n}-${day}.txt`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileStreetsStrings(): Array<[string, Pair]> {
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
  walk("fileStreets", FILE_STREETS_COPY);
  return out;
}
