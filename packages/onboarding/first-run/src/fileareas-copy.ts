import type { Locale } from "../../switch-first/src/index";
import type { AreaBy, AreaOrder, AreaReport, AreaRow, DetailCount, PlaceGaps } from "./areacover";
import { COPY, NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import type { FactKey } from "./facts";

/**
 * Words for "Where records are missing", in English and French. French copy
 * uses ’, U+00A0 before ":" and U+202F before ; ! ? and inside « ».
 */
export const FILE_AREAS_COPY = {
  title: { en: "Where records are missing", fr: "Où les données manquent" },
  intro: {
    en: "See a notes file by postal area or by street: for each, detail by detail, how many places have a record and how many have none, to plan where to look next.",
    fr: `Voyez un fichier de notes par secteur postal ou par rue${NB}: pour chacun, détail par détail, combien de lieux ont une donnée et combien n’en ont pas, pour choisir où regarder ensuite.`,
  },
  rule: {
    en: "This counts what is written down. It does not say that an area or a place is better or worse, and a detail with no record stays Unknown.",
    fr: "Ceci compte ce qui est noté. Cela ne dit pas qu’un secteur ou un lieu est meilleur ou pire, et un détail sans donnée reste UNKNOWN.",
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
  optionsTitle: { en: "How to group the places", fr: "Comment regrouper les lieux" },
  byLegend: { en: "Group by", fr: "Regrouper par" },
  by: {
    postal: { en: "Postal area (first three characters of the postal code)", fr: "Secteur postal (trois premiers caractères du code postal)" },
    street: { en: "Street", fr: "Rue" },
  },
  keysLegend: { en: "Details to count", fr: "Détails à compter" },
  orderLegend: { en: "Order", fr: "Ordre" },
  order: {
    gaps: { en: "Most details with no record first", fr: "Le plus de détails sans donnée d’abord" },
    name: { en: "By name", fr: "Par nom" },
  },
  hideFull: { en: "Leave out areas where every chosen detail has a record", fr: "Omettre les secteurs où chaque détail choisi a une donnée" },
  show: { en: "Show the areas", fr: "Afficher les secteurs" },
  noKeys: { en: "Tick at least one detail to count.", fr: "Cochez au moins un détail à compter." },
  resultsTitle: { en: "Areas", fr: "Secteurs" },
  noRows: {
    en: "Every area has a record for each chosen detail, so none is listed. Untick the option to leave them out to see them.",
    fr: "Chaque secteur a une donnée pour chaque détail choisi, donc aucun n’est listé. Décochez l’option qui les omet pour les voir.",
  },
  noArea: { en: "No area in the address", fr: "Aucun secteur dans l’adresse" },
  tableCaption: { en: "Places with a record, by area and detail", fr: "Lieux avec une donnée, par secteur et par détail" },
  colArea: { en: "Area", fr: "Secteur" },
  colPlaces: { en: "Places", fr: "Lieux" },
  colGaps: { en: "Details with no record", fr: "Détails sans donnée" },
  colNotes: { en: "For the area", fr: "Pour le secteur" },
  downloadArea: { en: "Download", fr: "Télécharger" },
  downloadCsv: { en: "Download the table (CSV)", fr: "Télécharger le tableau (CSV)" },
  downloadText: { en: "Download the areas (text)", fr: "Télécharger les secteurs (texte)" },
  noAddress: { en: "No address", fr: "Aucune adresse" },
  missing: { en: "No record (Unknown)", fr: "Aucune donnée (UNKNOWN)" },
  differ: { en: "Reports differ", fr: "Rapports divergents" },
  allRecorded: { en: "Every chosen detail has a record.", fr: "Chaque détail choisi a une donnée." },
  closePlaces: { en: "Hide the list of places", fr: "Masquer la liste des lieux" },
  placesHint: {
    en: "What each place has no record for, among the chosen details: what to look at on a visit. Nothing here says a place is better or worse.",
    fr: "Ce qui manque pour chaque lieu parmi les détails choisis, à regarder lors d’une visite. Rien ici ne dit qu’un lieu est meilleur ou pire.",
  },
  notesHint: {
    en: "An area’s notes download as a notes file, to take on a visit or open in the other file tools.",
    fr: "Les notes d’un secteur se téléchargent en fichier de notes, à emporter lors d’une visite ou à ouvrir dans les autres outils de fichiers.",
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

export function areasErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_AREAS_COPY.errors[e], l);
}

export function byText(b: AreaBy, l: Locale): string {
  return t(FILE_AREAS_COPY.by[b], l);
}

export function orderText(o: AreaOrder, l: Locale): string {
  return t(FILE_AREAS_COPY.order[o], l);
}

const count = (n: number, one: string, many: string, l: Locale): string => `${n} ${(l === "fr" ? n > 1 : n !== 1) ? many : one}`;

/** "M5V", "King Street West", or the words for places with no area. */
export function areaName(a: AreaRow, l: Locale): string {
  return a.key === "" ? t(FILE_AREAS_COPY.noArea, l) : a.label;
}

/** "3 of 5 (1 differ)": places with a record for the detail, out of the area's places. */
export function cellText(c: DetailCount, l: Locale): string {
  const recorded = c.answered + c.differ;
  const total = recorded + c.unknown;
  const base = l === "fr" ? `${recorded} sur ${total}` : `${recorded} of ${total}`;
  if (c.differ === 0) return base;
  return l === "fr" ? `${base} (${c.differ} avec rapports divergents)` : `${base} (${c.differ} with reports that differ)`;
}

/** "1 area where every chosen detail has a record is left out." */
export function hiddenText(n: number, l: Locale): string {
  if (l === "fr") return n > 1 ? `${n} secteurs où chaque détail choisi a une donnée sont omis.` : `${n} secteur où chaque détail choisi a une donnée est omis.`;
  return n === 1 ? "1 area where every chosen detail has a record is left out." : `${n} areas where every chosen detail has a record are left out.`;
}

/** "12 areas, 40 places: 63 details with no record." and how many areas are left out, if any. */
export function reportSummary(r: AreaReport, l: Locale): string {
  const areas = r.rows.filter((a) => a.key !== "").length;
  const left = r.hidden > 0 ? ` ${hiddenText(r.hidden, l)}` : "";
  if (l === "fr")
    return `${count(areas, "secteur", "secteurs", l)}, ${count(r.places, "lieu", "lieux", l)}${NB}: ${count(r.gaps, "détail sans donnée", "détails sans donnée", l)}.${left}`;
  return `${count(areas, "area", "areas", l)}, ${count(r.places, "place", "places", l)}: ${count(r.gaps, "detail", "details", l)} with no record.${left}`;
}

/** "Show the places in M5V": a button name that says which area. */
export function showPlacesLabel(a: AreaRow, l: Locale): string {
  if (a.key === "") return l === "fr" ? "Afficher les lieux sans secteur" : "Show the places with no area";
  return l === "fr" ? `Afficher les lieux ${de(a.label)}` : `Show the places in ${a.label}`;
}

/** "Places in M5V (2)". */
export function placesTitle(a: AreaRow, l: Locale): string {
  const n = a.places.length;
  if (a.key === "") return l === "fr" ? `Lieux sans secteur dans l’adresse (${n})` : `Places with no area in the address (${n})`;
  return l === "fr" ? `Lieux ${de(a.label)} (${n})` : `Places in ${a.label} (${n})`;
}

/** The lines under a place: details with no record, then details whose reports differ; or that every chosen detail has a record. */
export function placeGapLines(g: PlaceGaps, l: Locale): string[] {
  const k = l === "fr" ? `${NB}:` : ":";
  const names = (keys: readonly FactKey[]): string => keys.map((key) => t(COPY.facts[key], l)).join(", ");
  const lines: string[] = [];
  if (g.missing.length > 0) lines.push(`${t(FILE_AREAS_COPY.missing, l)}${k} ${names(g.missing)}`);
  if (g.differ.length > 0) lines.push(`${t(FILE_AREAS_COPY.differ, l)}${k} ${names(g.differ)}`);
  return lines.length > 0 ? lines : [t(FILE_AREAS_COPY.allRecorded, l)];
}

/** French "de M5V", "d’Avenue Road". */
const de = (name: string): string => (/^[aeiouyàâäéèêëîïôöûüù]/i.test(name) ? `d’${name}` : `de ${name}`);

/** "M5V" or "the places with no area", after "notes for" / "les notes". */
function whose(a: AreaRow, l: Locale): string {
  if (a.key === "") return l === "fr" ? "des lieux sans secteur" : "the places with no area";
  return l === "fr" ? de(a.label) : a.label;
}

/** "Download notes for M5V (3 places)": a link name that says which area. */
export function areaLinkLabel(a: AreaRow, l: Locale): string {
  const n = count(a.places.length, l === "fr" ? "lieu" : "place", l === "fr" ? "lieux" : "places", l);
  return l === "fr" ? `${t(FILE_AREAS_COPY.downloadArea, l)} les notes ${whose(a, l)} (${n})` : `${t(FILE_AREAS_COPY.downloadArea, l)} notes for ${whose(a, l)} (${n})`;
}

/** The areas as plain text, to print or keep: each area, its gaps, and each detail. */
export function areasText(r: AreaReport, today: Date, l: Locale): string {
  const k = l === "fr" ? `${NB}:` : ":";
  const lines = [t(FILE_AREAS_COPY.title, l), `${byText(r.by, l)} — ${today.toISOString().slice(0, 10)}`, "", t(FILE_AREAS_COPY.rule, l), reportSummary(r, l), ""];
  for (const a of r.rows) {
    const gaps = count(a.gaps, l === "fr" ? "détail sans donnée" : "detail with no record", l === "fr" ? "détails sans donnée" : "details with no record", l);
    lines.push(`${areaName(a, l)} — ${count(a.places.length, l === "fr" ? "lieu" : "place", l === "fr" ? "lieux" : "places", l)}, ${gaps}`);
    for (const key of r.keys) lines.push(`    ${t(COPY.facts[key as FactKey], l)}${k} ${cellText(a.counts[key], l)}`);
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

/** File names: the table, the text, and an area's notes ("notes-area-m5v-2026-11-21.json"). */
export function areasFilename(kind: "csv" | "text" | "notes", today: Date, l: Locale, area?: AreaRow): string {
  const day = today.toISOString().slice(0, 10);
  if (kind === "csv") return l === "fr" ? `secteurs-${day}.csv` : `areas-${day}.csv`;
  if (kind === "text") return l === "fr" ? `secteurs-${day}.txt` : `areas-${day}.txt`;
  const slug =
    area && area.key !== ""
      ? area.label
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 40) || "area"
      : l === "fr"
        ? "sans-secteur"
        : "no-area";
  return l === "fr" ? `notes-secteur-${slug}-${day}.json` : `notes-area-${slug}-${day}.json`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileAreasStrings(): Array<[string, Pair]> {
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
  walk("fileAreas", FILE_AREAS_COPY);
  return out;
}
