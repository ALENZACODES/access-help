import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import { FIRST_LIMITS } from "./lookfirst";
import type { DayProblem, DayState, FileOnDay } from "./recordasof";
import { MAX_PERIODS, percentRecorded, totalRecords, type PeriodRow, type TimeStep, type Timeline } from "./recordtimeline";

/**
 * Words for "Records over time", in English and French. French copy uses ’,
 * U+00A0 before ":" and U+202F before ; ! ? and inside « ».
 */
export const FILE_TIME_COPY = {
  title: { en: "Records over time", fr: "Les données au fil du temps" },
  intro: {
    en: "See how the records in a notes export built up, month by month or year by year: how many were recorded, which details and places got their first record, and how many details had reports that differ.",
    fr: `Voyez comment les données d’une exportation de notes se sont accumulées, mois par mois ou année par année${NB}: combien ont été notées, quels détails et quels lieux ont reçu leur première donnée, et combien de détails avaient des rapports divergents.`,
  },
  privacy: {
    en: "Nothing is looked up or saved, and your file does not change.",
    fr: "Rien n’est recherché ni enregistré, et votre fichier ne change pas.",
  },
  meaning: {
    en: "The counts use the date each record says it was recorded on, not the day it was added to the App. Every place in the file counts toward the total of details, even a place with no record yet.",
    fr: "Les décomptes utilisent la date à laquelle chaque donnée indique avoir été notée, et non le jour de son ajout à l’App. Chaque lieu du fichier compte dans le total des détails, même un lieu sans donnée.",
  },
  pasteLabel: { en: "Text of the notes file", fr: "Texte du fichier de notes" },
  pasteHint: {
    en: "A notes export is made with “Export notes” on the Notes page.",
    fr: `Une exportation de notes se crée avec «${NN}Exporter les notes${NN}» sur la page Notes.`,
  },
  openLabel: { en: "Or open the file from this device", fr: "Ou ouvrez le fichier depuis cet appareil" },
  read: { en: "Read the file", fr: "Lire le fichier" },
  clear: { en: "Remove the file and the timeline", fr: "Retirer le fichier et la chronologie" },
  cleared: { en: "The page is empty. Nothing was saved.", fr: "La page est vide. Rien n’a été enregistré." },
  opened: { en: "The file is in the box. Choose Read the file when ready.", fr: "Le fichier est dans la zone. Choisissez Lire le fichier quand vous êtes prêt." },
  readFailed: { en: "That file could not be opened. Try pasting its text instead.", fr: "Ce fichier n’a pas pu être ouvert. Essayez plutôt de coller son texte." },
  errorsTitle: { en: "Fix this first", fr: "À corriger d’abord" },
  formTitle: { en: "What to show", fr: "Ce qu’il faut afficher" },
  stepLegend: { en: "One row for each", fr: "Une ligne pour chaque" },
  steps: {
    month: { en: "Month", fr: "Mois" },
    year: { en: "Year", fr: "Année" },
  },
  areaLabel: { en: "Only places whose address holds (optional)", fr: "Seulement les lieux dont l’adresse contient (facultatif)" },
  areaShort: { en: "Area", fr: "Secteur" },
  areaHint: {
    en: "For example a street, a town or the first three characters of a postal code. Leave empty for the whole file.",
    fr: "Par exemple une rue, une ville ou les trois premiers caractères d’un code postal. Laissez vide pour tout le fichier.",
  },
  areaLong: { en: `Give at most ${FIRST_LIMITS.area} characters.`, fr: `Indiquez au plus ${FIRST_LIMITS.area}${NB}caractères.` },
  show: { en: "Show the timeline", fr: "Afficher la chronologie" },
  shown: { en: "The timeline is ready.", fr: "La chronologie est prête." },
  resultsTitle: { en: "Timeline", fr: "Chronologie" },
  tableCaption: { en: "Records by period, oldest first", fr: "Données par période, de la plus ancienne à la plus récente" },
  columns: {
    period: { en: "Period", fr: "Période" },
    records: { en: "Records dated in the period", fr: "Données datées de la période" },
    firstRecords: { en: "Details with their first record", fr: "Détails ayant leur première donnée" },
    placesStarted: { en: "Places with their first record", fr: "Lieux ayant leur première donnée" },
    recorded: { en: "Details with a record by the end", fr: "Détails ayant une donnée à la fin" },
    differing: { en: "Details where reports differ by the end", fr: "Détails aux rapports divergents à la fin" },
  },
  detailTitle: { en: "By detail", fr: "Par détail" },
  detailCaption: { en: "Records of each detail in the timeline", fr: "Données de chaque détail dans la chronologie" },
  detailColumns: {
    detail: { en: "Detail", fr: "Détail" },
    records: { en: "Records", fr: "Données" },
    places: { en: "Places with a record", fr: "Lieux ayant une donnée" },
    oldest: { en: "Oldest record", fr: "Donnée la plus ancienne" },
    newest: { en: "Newest record", fr: "Donnée la plus récente" },
  },
  none: { en: "none", fr: "aucune" },
  noDates: {
    en: "No record here is dated on or before today, so there is no timeline. Every detail stays Unknown until a record is added.",
    fr: "Aucune donnée ici n’est datée d’aujourd’hui ou d’avant, il n’y a donc pas de chronologie. Chaque détail reste UNKNOWN jusqu’à l’ajout d’une donnée.",
  },
  noPlaces: { en: "No place in the file has an address holding that text.", fr: "Aucun lieu du fichier n’a une adresse contenant ce texte." },
  downloadCsv: { en: "Download the timeline (CSV)", fr: "Télécharger la chronologie (CSV)" },
  downloadText: { en: "Download the timeline to print", fr: "Télécharger la chronologie à imprimer" },
  day: {
    title: { en: "As it stood on a day", fr: "L’état à une date" },
    intro: {
      en: "Choose a day in the past to see what the file said then, using only records dated on or before it. A detail whose only records are dated later is Unknown on that day.",
      fr: "Choisissez une date passée pour voir ce que disait le fichier à ce moment, d’après les seules données datées de ce jour ou d’avant. Un détail dont toutes les données sont postérieures est UNKNOWN à cette date.",
    },
    label: { en: "Day", fr: "Date" },
    hint: { en: "Written like 2026-03-31.", fr: "Écrite comme 2026-03-31." },
    show: { en: "Show that day", fr: "Afficher cette date" },
    shown: { en: "The day is shown.", fr: "La date est affichée." },
    caption: { en: "Places by answer on that day", fr: "Lieux par réponse à cette date" },
    detail: { en: "Detail", fr: "Détail" },
    download: { en: "Download the notes as they stood that day", fr: "Télécharger les notes telles qu’elles étaient à cette date" },
    downloadHint: {
      en: "Every note stays in the copy. A Yes or No recorded after that day becomes Unknown, so the copy holds only what was recorded by then.",
      fr: "Chaque note reste dans la copie. Un Oui ou un Non noté après cette date devient UNKNOWN, la copie ne contient donc que ce qui était noté à ce moment.",
    },
    problems: {
      empty: { en: "Type a day, written like 2026-03-31.", fr: "Tapez une date, écrite comme 2026-03-31." },
      "not-date": { en: "Write the day like 2026-03-31.", fr: "Écrivez la date comme 2026-03-31." },
      "after-today": { en: "Choose today or a day before it.", fr: "Choisissez aujourd’hui ou une date antérieure." },
    },
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

export function timeErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_TIME_COPY.errors[e], l);
}

export function stepText(s: TimeStep, l: Locale): string {
  return t(FILE_TIME_COPY.steps[s], l);
}

const plural = (n: number, one: string, many: string, l: Locale): string => `${n} ${(l === "fr" ? n > 1 : n !== 1) ? many : one}`;

/** "42 %" in French (with U+202F), "42%" in English. */
export function percentText(n: number, l: Locale): string {
  return l === "fr" ? `${n}${NN}%` : `${n}%`;
}

/** "2026-03" → "March 2026" / "mars 2026"; a year stays as it is. */
export function periodText(period: string, l: Locale): string {
  if (period.length === 4) return period;
  const month = Number(period.slice(5, 7));
  const name = new Date(Date.UTC(2000, month - 1, 1)).toLocaleDateString(l === "fr" ? "fr-CA" : "en-CA", { month: "long", timeZone: "UTC" });
  return `${name} ${period.slice(0, 4)}`;
}

/** The headline: how many records over which periods, and where the file stands now. */
export function timelineSummary(tl: Timeline, l: Locale): string {
  const last = tl.rows.at(-1);
  const first = tl.rows[0];
  const places = l === "fr" ? plural(tl.places, "lieu", "lieux", l) : plural(tl.places, "place", "places", l);
  if (!last || !first) return l === "fr" ? `${places}, aucune donnée datée.` : `${places}, no dated record.`;
  const records = l === "fr" ? plural(totalRecords(tl), "donnée", "données", l) : plural(totalRecords(tl), "record", "records", l);
  const pct = percentText(percentRecorded(last.recorded, tl.details), l);
  const span = first.period === last.period ? periodText(first.period, l) : `${periodText(first.period, l)} – ${periodText(last.period, l)}`;
  const parts =
    l === "fr"
      ? [
          `${places}, ${records} datées de ${span}.`,
          `À la fin, ${last.recorded} des ${tl.details}${NB}détails ont une donnée (${pct})${NN}; ${plural(last.differing, "détail a", "détails ont", l)} des rapports divergents.`,
        ]
      : [
          `${places}, ${records} dated ${span}.`,
          `By the end, ${last.recorded} of ${tl.details} details have a record (${pct}); ${plural(last.differing, "detail has", "details have", l)} reports that differ.`,
        ];
  if (tl.hidden > 0)
    parts.push(
      l === "fr"
        ? `Les ${MAX_PERIODS}${NB}dernières périodes sont affichées${NN}; les ${tl.hidden} précédentes comptent dans les totaux.`
        : `The last ${MAX_PERIODS} periods are shown; the ${tl.hidden} before them count in the totals.`,
    );
  if (tl.future > 0)
    parts.push(
      l === "fr"
        ? `${plural(tl.future, "donnée est datée", "données sont datées", l)} d’après aujourd’hui et ${tl.future > 1 ? "ne sont pas comptées" : "n’est pas comptée"}.`
        : `${plural(tl.future, "record is", "records are", l)} dated after today and left out.`,
    );
  return parts.join(" ");
}

const COLUMN_KEYS = ["records", "firstRecords", "placesStarted", "recorded", "differing"] as const;

/** The cells of one row, as printed and shown: counts, with the share of details beside "with a record". */
export function rowCells(r: PeriodRow, details: number, l: Locale): string[] {
  return [periodText(r.period, l), ...COLUMN_KEYS.map((k) => (k === "recorded" ? `${r.recorded} (${percentText(percentRecorded(r.recorded, details), l)})` : String(r[k])))];
}

/** The timeline as text to print. */
export function timelineText(tl: Timeline, area: string, today: Date, l: Locale): string {
  const C = FILE_TIME_COPY;
  const k = l === "fr" ? `${NB}:` : ":";
  const lines = [t(C.title, l), `${l === "fr" ? "Créée le" : "Made on"} ${today.toISOString().slice(0, 10)}`];
  if (area.trim() !== "") lines.push(`${t(C.areaShort, l)}${k} ${area.trim()}`);
  lines.push("", timelineSummary(tl, l), "", t(C.meaning, l), "");
  if (tl.rows.length > 0) {
    lines.push(t(C.tableCaption, l));
    for (const r of tl.rows) {
      const cells = rowCells(r, tl.details, l);
      lines.push(`  ${cells[0]}${k} ${COLUMN_KEYS.map((c, i) => `${t(C.columns[c], l)} ${cells[i + 1]}`).join(" · ")}`);
    }
    lines.push("");
  }
  lines.push(t(C.detailCaption, l));
  for (const d of tl.byDetail) {
    const dates = d.oldest && d.newest ? `${d.oldest} – ${d.newest}` : t(C.none, l);
    lines.push(`  ${t(COPY.facts[d.key], l)}${k} ${t(C.detailColumns.records, l)} ${d.records} · ${t(C.detailColumns.places, l)} ${d.places} · ${dates}`);
  }
  return `${lines.join("\n")}\n`;
}

export function dayProblemText(p: DayProblem, l: Locale): string {
  return t(FILE_TIME_COPY.day.problems[p], l);
}

/** The App's own words for each state, Unknown being UNKNOWN in French. */
export function dayStateText(s: DayState, l: Locale): string {
  return s === "differ" ? t(COPY.places.differ, l) : t(COPY.values[s], l);
}

/** "On 2026-03-31, 5 of 12 details had a record (41%) and 1 had reports that differ. 3 records dated later are left out." */
export function daySummary(d: FileOnDay, l: Locale): string {
  const details = d.details;
  const pct = percentText(percentRecorded(d.recorded, details), l);
  const head =
    l === "fr"
      ? `Au ${d.day}, ${d.recorded} des ${details}${NB}détails avaient une donnée (${pct}) et ${d.differing} des rapports divergents.`
      : `On ${d.day}, ${d.recorded} of ${details} details had a record (${pct}) and ${d.differing} had reports that differ.`;
  if (d.later === 0) return head;
  const later =
    l === "fr"
      ? `${plural(d.later, "donnée datée", "données datées", l)} d’après cette date ${d.later > 1 ? "sont laissées" : "est laissée"} de côté.`
      : `${plural(d.later, "record", "records", l)} dated later ${d.later === 1 ? "is" : "are"} left out.`;
  return `${head} ${later}`;
}

export function dayFilename(day: string, l: Locale): string {
  return l === "fr" ? `notes-au-${day}.json` : `notes-as-of-${day}.json`;
}

export function timeFilename(kind: "csv" | "text", step: TimeStep, today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  const by = l === "fr" ? (step === "month" ? "par-mois" : "par-annee") : step === "month" ? "by-month" : "by-year";
  const stem = l === "fr" ? `donnees-au-fil-du-temps-${by}-${day}` : `records-over-time-${by}-${day}`;
  return `${stem}.${kind === "csv" ? "csv" : "txt"}`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileTimeStrings(): Array<[string, Pair]> {
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
  walk("fileTime", FILE_TIME_COPY);
  return out;
}
