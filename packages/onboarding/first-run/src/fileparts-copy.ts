import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import { FACT_KEYS, type FactKey } from "./facts";
import { sourceName } from "./sources";
import { recordedPercent, type DetailCounts, type PartProblem, type PartSummary, type PartsReport } from "./partsummary";

/**
 * Words for "Compare parts of a file", in English and French. French copy
 * uses ’, U+00A0 before ":" and U+202F before ; ! ? and inside « ». A detail
 * with no record is the token UNKNOWN in French.
 */
export const FILE_PARTS_COPY = {
  title: { en: "Compare parts of a file", fr: "Comparer des parties d’un fichier" },
  intro: {
    en: "Name up to four parts of a notes export by text their addresses hold, such as a street or a postal area, and see how much is recorded in each, detail by detail, beside the rest of the file.",
    fr: "Nommez jusqu’à quatre parties d’une exportation de notes d’après un texte contenu dans leurs adresses, comme une rue ou une zone postale, et voyez ce qui est noté dans chacune, détail par détail, à côté du reste du fichier.",
  },
  notRank: {
    en: "The counts say how much is recorded where. More records do not make a part better.",
    fr: "Les chiffres disent ce qui est noté et où. Plus de données ne rendent pas une partie meilleure.",
  },
  privacy: {
    en: "Nothing is looked up, nothing is saved and nothing is sent anywhere.",
    fr: "Rien n’est recherché, enregistré ni envoyé.",
  },
  pasteLabel: { en: "Text of the notes file", fr: "Texte du fichier de notes" },
  pasteHint: {
    en: "A notes export is made with “Export notes” on the Notes page.",
    fr: `Une exportation de notes se crée avec «${NN}Exporter les notes${NN}» sur la page Notes.`,
  },
  openLabel: { en: "Or open the file from this device", fr: "Ou ouvrez le fichier depuis cet appareil" },
  read: { en: "Read the file", fr: "Lire le fichier" },
  clear: { en: "Remove the file and the parts", fr: "Retirer le fichier et les parties" },
  cleared: { en: "The page is empty. Nothing was saved.", fr: "La page est vide. Rien n’a été enregistré." },
  opened: { en: "The file is in the box. Choose Read the file when ready.", fr: "Le fichier est dans la zone. Choisissez Lire le fichier quand vous êtes prêt." },
  readFailed: { en: "That file could not be opened. Try pasting its text instead.", fr: "Ce fichier n’a pas pu être ouvert. Essayez plutôt de coller son texte." },
  errorsTitle: { en: "Fix this first", fr: "À corriger d’abord" },
  partsTitle: { en: "Parts to compare", fr: "Parties à comparer" },
  partsHint: {
    en: "In each box, type text the addresses of a part hold, for example King St or M5H. Case and accents do not matter. Leave the boxes you do not need empty.",
    fr: "Dans chaque zone, tapez un texte contenu dans les adresses d’une partie, par exemple rue Principale ou M5H. Les majuscules et les accents ne comptent pas. Laissez vides les zones inutiles.",
  },
  partLabel: { en: "Part", fr: "Partie" },
  compare: { en: "Compare the parts", fr: "Comparer les parties" },
  postalTitle: { en: "Postal areas in this file", fr: "Zones postales de ce fichier" },
  postalNone: { en: "No address in this file has a postal code.", fr: "Aucune adresse de ce fichier n’a de code postal." },
  usePostal: { en: "Compare the largest postal areas", fr: "Comparer les plus grandes zones postales" },
  streetsTitle: { en: "Streets in this file, as their places write them", fr: "Rues de ce fichier, telles que leurs lieux les écrivent" },
  streetsNone: { en: "No address in this file has a house number and a street.", fr: "Aucune adresse de ce fichier n’a de numéro et de rue." },
  useStreets: { en: "Compare the largest streets", fr: "Comparer les plus grandes rues" },
  placesTitle: { en: "Places in this part", fr: "Lieux de cette partie" },
  downloadOpen: { en: "Download the notes of places with something to look at", fr: "Télécharger les notes des lieux où il y a quelque chose à regarder" },
  problems: {
    long: { en: "Give at most 60 characters.", fr: "Indiquez au plus 60 caractères." },
    repeat: { en: "This is the same as an earlier part.", fr: "C’est la même chose qu’une partie précédente." },
    "none-match": { en: "No place’s address holds this text.", fr: "Aucune adresse de lieu ne contient ce texte." },
    empty: { en: "Type text for at least one part.", fr: "Tapez un texte pour au moins une partie." },
  },
  resultsTitle: { en: "The parts side by side", fr: "Les parties côte à côte" },
  viewLegend: { en: "Show the comparison", fr: "Afficher la comparaison" },
  views: {
    part: { en: "Part by part", fr: "Partie par partie" },
    detail: { en: "Detail by detail", fr: "Détail par détail" },
  },
  restTitle: { en: "Rest of the file", fr: "Reste du fichier" },
  restEmpty: { en: "Every place is in one of the parts.", fr: "Chaque lieu fait partie d’une des parties." },
  newest: { en: "Newest record", fr: "Donnée la plus récente" },
  oldest: { en: "oldest", fr: "la plus ancienne" },
  nothingRecorded: { en: "Nothing recorded yet", fr: "Rien de noté pour l’instant" },
  recordedBy: { en: "Recorded by", fr: "Noté par" },
  downloadNotes: { en: "Download the notes of this part", fr: "Télécharger les notes de cette partie" },
  downloadCsv: { en: "Download the comparison as a spreadsheet (CSV)", fr: "Télécharger la comparaison en tableur (CSV)" },
  downloadText: { en: "Download the comparison to print", fr: "Télécharger la comparaison à imprimer" },
  printMade: { en: "Made on", fr: "Créé le" },
  updated: { en: "The comparison is updated.", fr: "La comparaison est mise à jour." },
  errors: {
    empty: { en: "The box is empty. Paste the file’s text or open it.", fr: "La zone est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The file is too large to read here.", fr: "Le fichier est trop volumineux pour être lu ici." },
    "not-json": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-format": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-version": { en: "This export comes from a different version and cannot be read.", fr: "Cette exportation provient d’une autre version et ne peut pas être lue." },
    "no-notes": { en: "This file has no note the App can read.", fr: "Ce fichier ne contient aucune note lisible par l’App." },
  },
} as const;

export function partsErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_PARTS_COPY.errors[e], l);
}

export function partProblemText(p: PartProblem | "empty", l: Locale): string {
  return t(FILE_PARTS_COPY.problems[p], l);
}

/** "Part 2". */
export function partLabel(index: number, l: Locale): string {
  return `${t(FILE_PARTS_COPY.partLabel, l)} ${index + 1}`;
}

const placesCount = (n: number, l: Locale): string => (l === "fr" ? `${n} ${n > 1 ? "lieux" : "lieu"}` : `${n} ${n === 1 ? "place" : "places"}`);

/** "“King St” (12 places)", or "Rest of the file (3 places)". */
export function partHeading(s: PartSummary, l: Locale): string {
  const name = s.text === undefined ? t(FILE_PARTS_COPY.restTitle, l) : l === "fr" ? `«${NN}${s.text}${NN}»` : `“${s.text}”`;
  return `${name} (${placesCount(s.places.length, l)})`;
}

/** "5 Yes, 2 No, 4 Unknown, 1 with reports that differ": every count said, zeros included, so two parts read the same way. */
export function countsText(c: DetailCounts, l: Locale): string {
  if (l === "fr") return `${c.yes} ${t(COPY.values.yes, l)}, ${c.no} ${t(COPY.values.no, l)}, ${c.unknown} ${t(COPY.values.unknown, l)}, ${c.differ} aux rapports divergents`;
  return `${c.yes} Yes, ${c.no} No, ${c.unknown} Unknown, ${c.differ} with reports that differ`;
}

/** "Elevator: 5 Yes, 2 No, 4 Unknown, 1 with reports that differ". */
export function detailLine(k: FactKey, c: DetailCounts, l: Locale): string {
  return `${t(COPY.facts[k], l)}${l === "fr" ? NB : ""}: ${countsText(c, l)}`;
}

/**
 * "42% of details have a record. Newest record: 2026-10-01 (oldest
 * 2024-05-02). 3 recorded details are a year old or more."
 */
export function partFacts(s: PartSummary, l: Locale): string {
  const pct = recordedPercent(s);
  const share = l === "fr" ? `${pct}${NB}% des détails ont une donnée.` : `${pct}% of details have a record.`;
  if (s.newest === undefined) return `${share} ${t(FILE_PARTS_COPY.nothingRecorded, l)}.`;
  const range = s.oldest !== undefined && s.oldest !== s.newest ? ` (${t(FILE_PARTS_COPY.oldest, l)} ${s.oldest})` : "";
  const dates = `${share} ${t(FILE_PARTS_COPY.newest, l)}${l === "fr" ? NB : ""}: ${s.newest}${range}.`;
  return s.yearOld === 0 ? dates : `${dates} ${yearOldText(s.yearOld, l)}`;
}

/** "3 recorded details are a year old or more." A year-old record is not wrong; it is only worth another look. */
export function yearOldText(n: number, l: Locale): string {
  if (l === "fr") return n === 1 ? "1 détail noté date d’un an ou plus." : `${n} détails notés datent d’un an ou plus.`;
  return n === 1 ? "1 recorded detail is a year old or more." : `${n} recorded details are a year old or more.`;
}

/** The five sources of a part with most records, and how many others there are. */
export function topSources(s: PartSummary): { readonly top: PartSummary["sources"]; readonly more: number } {
  const top = s.sources.slice(0, 5);
  return { top, more: s.sources.length - top.length };
}

/** " and 2 more" / " et 2 autres", or nothing. */
export function moreText(more: number, l: Locale): string {
  if (more === 0) return "";
  return l === "fr" ? ` et ${more} autre${more > 1 ? "s" : ""}` : ` and ${more} more`;
}

/** "Recorded by: City survey (3), Walk group (1) and 2 more", for text. */
export function sourcesText(s: PartSummary, l: Locale): string {
  const { top, more } = topSources(s);
  const names = top.map((x) => `${sourceName(x.source, l)} (${x.records})`).join(", ");
  return `${t(FILE_PARTS_COPY.recordedBy, l)}${l === "fr" ? NB : ""}: ${names}${moreText(more, l)}`;
}

/** "3 parts compared with the rest of the file (8 places). 2 places are in two parts or more and are counted in each." */
export function reportSummary(r: PartsReport, l: Locale): string {
  const n = r.parts.length;
  const head =
    l === "fr"
      ? `${n} ${n > 1 ? "parties comparées" : "partie comparée"} avec le reste du fichier (${placesCount(r.rest.places.length, l)}).`
      : `${n} ${n === 1 ? "part" : "parts"} compared with the rest of the file (${placesCount(r.rest.places.length, l)}).`;
  if (r.inSeveral === 0) return head;
  return l === "fr"
    ? `${head} ${placesCount(r.inSeveral, l)} ${r.inSeveral > 1 ? "font partie de plusieurs parties et sont comptés" : "fait partie de plusieurs parties et est compté"} dans chacune.`
    : `${head} ${placesCount(r.inSeveral, l)} ${r.inSeveral === 1 ? "is in two parts or more and is" : "are in two parts or more and are"} counted in each.`;
}

/** "The file has 14 places. Name the parts to compare." */
export function readText(places: number, l: Locale): string {
  return l === "fr"
    ? `Le fichier compte ${placesCount(places, l)}. Nommez les parties à comparer.`
    : `The file has ${placesCount(places, l)}. Name the parts to compare.`;
}

/** "1 of 4 details recorded" beside a place. */
export function placeRecorded(n: number, total: number, l: Locale): string {
  return l === "fr" ? `${n} détail${n > 1 ? "s" : ""} sur ${total} ${n > 1 ? "notés" : "noté"}` : `${n} of ${total} details recorded`;
}

/** "King St W (2 places), Queen St E (1 place)". */
export function streetsLine(streets: ReadonlyArray<{ street: string; places: number }>, l: Locale): string {
  return streets.map((s) => `${s.street} (${placesCount(s.places, l)})`).join(", ");
}

/** "“King St” (12 places): 5 Yes, 2 No, 4 Unknown, 1 with reports that differ", for the detail-by-detail view. */
export function partCountsLine(s: PartSummary, k: FactKey, l: Locale): string {
  return `${partHeading(s, l)}${l === "fr" ? NB : ""}: ${countsText(s.perDetail[k], l)}`;
}

/** "M5H (12 places), K7L (3 places)". */
export function postalLine(areas: ReadonlyArray<{ area: string; places: number }>, l: Locale): string {
  return areas.map((a) => `${a.area} (${placesCount(a.places, l)})`).join(", ");
}

/** The comparison as text to print. */
export function partsText(r: PartsReport, l: Locale, today: Date): string {
  const lines: string[] = [t(FILE_PARTS_COPY.title, l), `${t(FILE_PARTS_COPY.printMade, l)} ${today.toISOString().slice(0, 10)}`, reportSummary(r, l), t(FILE_PARTS_COPY.notRank, l), ""];
  for (const s of [...r.parts, r.rest]) {
    const heading = partHeading(s, l);
    lines.push(heading, "-".repeat(Math.min(heading.length, 72)));
    if (s.places.length === 0) lines.push(t(FILE_PARTS_COPY.restEmpty, l));
    else {
      lines.push(partFacts(s, l));
      if (s.sources.length > 0) lines.push(sourcesText(s, l));
      for (const k of FACT_KEYS) lines.push(`  ${detailLine(k, s.perDetail[k], l)}`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

export function partsFilename(kind: "csv" | "text" | "notes" | "open", index: number, today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  if (kind === "open") return l === "fr" ? `notes-a-regarder-partie-${index + 1}-${day}.json` : `notes-to-look-at-part-${index + 1}-${day}.json`;
  if (kind === "csv") return l === "fr" ? `comparaison-de-parties-${day}.csv` : `parts-comparison-${day}.csv`;
  if (kind === "text") return l === "fr" ? `comparaison-de-parties-${day}.txt` : `parts-comparison-${day}.txt`;
  return l === "fr" ? `notes-partie-${index + 1}-${day}.json` : `notes-part-${index + 1}-${day}.json`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function filePartsStrings(): Array<[string, Pair]> {
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
  walk("fileParts", FILE_PARTS_COPY);
  return out;
}
