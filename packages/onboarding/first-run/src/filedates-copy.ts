import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import { bySource, commonSlip, type DateChange, type DateProblem, type DatesReport, type FixedCopy, type FutureRecord, type SlipKind, type SourceDates } from "./recorddates";

/**
 * Words for "Fix record dates", in English and French. French copy uses ’,
 * U+00A0 before ":" and U+202F before ; ! ? and inside « ».
 */
export const FILE_DATES_COPY = {
  title: { en: "Fix record dates", fr: "Corriger les dates des données" },
  intro: {
    en: "Find the records in a notes export dated after today. The App leaves them out wherever it counts by date. For each one, keep it, pick a suggested date, type the right date, or set the detail back to Unknown, and download a copy.",
    fr: `Trouvez les données d’une exportation de notes datées d’après aujourd’hui. L’App les laisse de côté partout où elle compte par date. Pour chacune, gardez-la, choisissez une date proposée, tapez la bonne date, ou remettez le détail à UNKNOWN, puis téléchargez une copie.`,
  },
  rule: {
    en: "A date is suggested only when one plain typing slip gives a real day on or before today. The App never picks one: you know when the record was made.",
    fr: `Une date n’est proposée que si une simple erreur de frappe donne un vrai jour, aujourd’hui ou avant. L’App n’en choisit jamais${NB}: vous savez quand la donnée a été recueillie.`,
  },
  privacy: {
    en: "Nothing is looked up or saved, and your file does not change: the fixes go in a copy.",
    fr: `Rien n’est recherché ni enregistré, et votre fichier ne change pas${NB}: les corrections vont dans une copie.`,
  },
  pasteLabel: { en: "Text of the notes file", fr: "Texte du fichier de notes" },
  pasteHint: {
    en: "A notes export is made with “Export notes” on the Notes page.",
    fr: `Une exportation de notes se crée avec «${NN}Exporter les notes${NN}» sur la page Notes.`,
  },
  openLabel: { en: "Or open the file from this device", fr: "Ou ouvrez le fichier depuis cet appareil" },
  read: { en: "Read the file", fr: "Lire le fichier" },
  clear: { en: "Remove the file and the copy", fr: "Retirer le fichier et la copie" },
  cleared: { en: "The page is empty. Nothing was saved.", fr: "La page est vide. Rien n’a été enregistré." },
  opened: { en: "The file is in the box. Choose Read the file when ready.", fr: "Le fichier est dans la zone. Choisissez Lire le fichier quand vous êtes prêt." },
  readFailed: { en: "That file could not be opened. Try pasting its text instead.", fr: "Ce fichier n’a pas pu être ouvert. Essayez plutôt de coller son texte." },
  errorsTitle: { en: "Fix this first", fr: "À corriger d’abord" },
  resultsTitle: { en: "Records dated after today", fr: "Données datées d’après aujourd’hui" },
  none: { en: "No record in this file is dated after today.", fr: "Aucune donnée de ce fichier n’est datée d’après aujourd’hui." },
  keep: { en: "Keep this date", fr: "Garder cette date" },
  use: { en: "Use", fr: "Utiliser" },
  typed: { en: "Use the date I type", fr: "Utiliser la date que je tape" },
  typedLabel: { en: "Date for record", fr: "Date pour la donnée" },
  typedHint: { en: "Written like 2026-03-31, today or before.", fr: "Écrite comme 2026-03-31, aujourd’hui ou avant." },
  unknown: { en: "Set the detail back to Unknown (removes this record)", fr: "Remettre le détail à UNKNOWN (retire cette donnée)" },
  slips: {
    "year-digits": { en: "the last two digits of the year swapped", fr: "les deux derniers chiffres de l’année inversés" },
    "day-month": { en: "day and month swapped", fr: "jour et mois inversés" },
    "year-high": { en: "the year one too high", fr: "l’année un an trop loin" },
  },
  noSuggestion: { en: "No plain typing slip gives a date on or before today.", fr: "Aucune simple erreur de frappe ne donne une date d’aujourd’hui ou d’avant." },
  recordLegend: { en: "What to do with record", fr: "Que faire de la donnée" },
  make: { en: "Make the copy", fr: "Créer la copie" },
  noneChanged: { en: "Choose a new date or Unknown for at least one record.", fr: "Choisissez une nouvelle date ou UNKNOWN pour au moins une donnée." },
  problems: {
    empty: { en: "Type a date, written like 2026-03-31.", fr: "Tapez une date, écrite comme 2026-03-31." },
    "not-date": { en: "Write the date like 2026-03-31.", fr: "Écrivez la date comme 2026-03-31." },
    "after-today": { en: "Choose today or a day before it.", fr: "Choisissez aujourd’hui ou une date antérieure." },
  },
  copyTitle: { en: "Copy with the dates fixed", fr: "Copie avec les dates corrigées" },
  made: { en: "The copy is ready.", fr: "La copie est prête." },
  downloadCopy: { en: "Download the copy", fr: "Télécharger la copie" },
  copyHint: {
    en: "Bring the copy in with “Import notes”, or use it with the other file tools. Your file does not change.",
    fr: `Importez la copie avec «${NN}Importer des notes${NN}», ou utilisez-la avec les autres outils de fichiers. Votre fichier ne change pas.`,
  },
  downloadCsv: { en: "Download the list (CSV)", fr: "Télécharger la liste (CSV)" },
  downloadText: { en: "Download the list (text)", fr: "Télécharger la liste (texte)" },
  sourcesTitle: { en: "Where these records come from", fr: "D’où viennent ces données" },
  sourcesHint: {
    en: "Many from one source can mean the same slip was made each time. Each record is still yours to decide.",
    fr: "Plusieurs données d’une même source peuvent venir d’une même erreur répétée. C’est à vous de trancher pour chaque donnée.",
  },
  textIntro: {
    en: "Records dated after today, from a notes export. The App leaves them out wherever it counts by date.",
    fr: "Données datées d’après aujourd’hui, tirées d’une exportation de notes. L’App les laisse de côté partout où elle compte par date.",
  },
  textSuggested: { en: "Suggested", fr: "Proposé" },
  changesTitle: { en: "What the copy changes", fr: "Ce que la copie change" },
  errors: {
    empty: { en: "The box is empty. Paste the file’s text or open it.", fr: "La zone est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The file is too large to read here.", fr: "Le fichier est trop volumineux pour être lu ici." },
    "not-json": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-format": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-version": { en: "This export comes from a different version and cannot be read.", fr: "Cette exportation provient d’une autre version et ne peut pas être lue." },
    "no-notes": { en: "This file has no note the App can read.", fr: "Ce fichier ne contient aucune note lisible par l’App." },
  },
} as const;

export function datesErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_DATES_COPY.errors[e], l);
}

export function dateProblemText(p: DateProblem, l: Locale): string {
  return t(FILE_DATES_COPY.problems[p], l);
}

export function slipText(s: SlipKind, l: Locale): string {
  return t(FILE_DATES_COPY.slips[s], l);
}

const count = (n: number, one: string, many: string, l: Locale): string => `${n} ${(l === "fr" ? n > 1 : n !== 1) ? many : one}`;

/** "Library, 100 King St W" or the name alone. */
export function placeText(f: FutureRecord): string {
  return f.place.address ? `${f.place.name}, ${f.place.address}` : f.place.name;
}

/** "Elevator: Yes — City survey, CC0-1.0, dated 2062-03-01". */
export function recordText(f: FutureRecord, l: Locale): string {
  const k = l === "fr" ? `${NB}:` : ":";
  const dated = l === "fr" ? `datée du ${f.recordedOn}` : `dated ${f.recordedOn}`;
  return `${t(COPY.facts[f.key], l)}${k} ${t(COPY.values[f.value], l)} — ${f.source}, ${f.licence}, ${dated}`;
}

/** "Use 2026-03-01 (the last two digits of the year swapped)". */
export function suggestionLabel(date: string, slip: SlipKind, l: Locale): string {
  return `${t(FILE_DATES_COPY.use, l)} ${date} (${slipText(slip, l)})`;
}

export function datesSummary(r: DatesReport, l: Locale): string {
  const n = r.future.length;
  const suggested = r.future.filter((f) => f.suggestions.length > 0).length;
  if (l === "fr")
    return `${count(r.places, "lieu", "lieux", l)}, ${count(r.records, "donnée", "données", l)}${NB}: ${count(n, "est datée", "sont datées", l)} d’après aujourd’hui, dont ${suggested} avec une date proposée.`;
  return `${count(r.places, "place", "places", l)}, ${count(r.records, "record", "records", l)}: ${n} ${n === 1 ? "is" : "are"} dated after today, ${suggested} with a suggested date.`;
}

export function copySummary(c: FixedCopy, l: Locale): string {
  if (l === "fr")
    return `${count(c.redated, "donnée a reçu", "données ont reçu", l)} une autre date, ${count(c.cleared, "est remise", "sont remises", l)} à UNKNOWN, ${c.kept} ${c.kept > 1 ? "gardent leur" : "garde sa"} date d’après aujourd’hui.`;
  return `${count(c.redated, "record was", "records were", l)} given another date, ${c.cleared} set back to Unknown, ${c.kept} kept with ${c.kept === 1 ? "its" : "their"} date after today.`;
}

/** "City survey: 3 records, 2 with a suggested date. The same slip could explain 2: day and month swapped." */
export function sourceLine(s: SourceDates, l: Locale): string {
  const slip = commonSlip(s);
  const k = l === "fr" ? `${NB}:` : ":";
  if (l === "fr") {
    const base = `${s.source}${k} ${count(s.records, "donnée", "données", l)}, dont ${s.suggested} avec une date proposée.`;
    return slip ? `${base} La même erreur pourrait en expliquer ${s.slips[slip]}${k} ${slipText(slip, l)}.` : base;
  }
  const base = `${s.source}${k} ${count(s.records, "record", "records", l)}, ${s.suggested} with a suggested date.`;
  return slip ? `${base} The same slip could explain ${s.slips[slip]}: ${slipText(slip, l)}.` : base;
}

/** "Library, 100 King St W — Elevator: 2062-03-01 → 2026-03-01" or "… — Elevator: set back to Unknown". */
export function changeText(c: DateChange, l: Locale): string {
  const k = l === "fr" ? `${NB}:` : ":";
  const what = c.to === "unknown" ? (l === "fr" ? "remis à UNKNOWN" : "set back to Unknown") : `${c.record.recordedOn} → ${c.to}`;
  return `${placeText(c.record)} — ${t(COPY.facts[c.record.key], l)}${k} ${what}`;
}

/** The list as plain text, to print or keep: each record with its place, line and suggestions. */
export function datesText(r: DatesReport, today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  const k = l === "fr" ? `${NB}:` : ":";
  const lines = [t(FILE_DATES_COPY.resultsTitle, l), day, "", t(FILE_DATES_COPY.textIntro, l), datesSummary(r, l), ""];
  r.future.forEach((f, i) => {
    lines.push(`${i + 1}. ${placeText(f)}`, `    ${recordText(f, l)}`);
    for (const s of f.suggestions) lines.push(`    ${t(FILE_DATES_COPY.textSuggested, l)}${k} ${s.date} (${slipText(s.slip, l)})`);
    if (f.suggestions.length === 0) lines.push(`    ${t(FILE_DATES_COPY.noSuggestion, l)}`);
    lines.push("");
  });
  const sources = bySource(r);
  if (sources.length > 0) {
    lines.push(t(FILE_DATES_COPY.sourcesTitle, l));
    for (const s of sources) lines.push(`- ${sourceLine(s, l)}`);
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

export function datesFilename(kind: "copy" | "csv" | "text", today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  if (kind === "text") return l === "fr" ? `donnees-datees-apres-aujourdhui-${day}.txt` : `records-dated-after-today-${day}.txt`;
  if (kind === "csv") return l === "fr" ? `donnees-datees-apres-aujourdhui-${day}.csv` : `records-dated-after-today-${day}.csv`;
  return l === "fr" ? `notes-dates-corrigees-${day}.json` : `notes-dates-fixed-${day}.json`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileDatesStrings(): Array<[string, Pair]> {
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
  walk("fileDates", FILE_DATES_COPY);
  return out;
}
