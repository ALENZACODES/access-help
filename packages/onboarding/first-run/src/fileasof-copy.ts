import type { Locale } from "../../switch-first/src/index";
import { answeredCount, type Comparison, type Counts, type DayProblem, type DetailChange, type Reading, type ReadingChange, type Snapshot, type QuickDay, type SourceSince, type ToProblem } from "./asof";
import { COPY, NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import type { Place } from "./places";
import { sourceName } from "./sources";

/**
 * Words for "A notes file as it was on a day", in English and French. French
 * copy uses ’, U+00A0 before ":" and U+202F before ; ! ? and inside « ».
 */
export const FILE_ASOF_COPY = {
  title: { en: "A notes file as it was on a day", fr: "Un fichier de notes tel qu’il était à une date" },
  intro: {
    en: "See what a notes file held on a past day, such as the end of a quarter, and what has changed since: detail by detail, how many places had an answer then and how many have one now, and which places got one since.",
    fr: `Voyez ce que contenait un fichier de notes à une date passée, comme la fin d’un trimestre, et ce qui a changé depuis${NB}: détail par détail, combien de lieux avaient une réponse alors et combien en ont une maintenant, et quels lieux en ont reçu une depuis.`,
  },
  rule: {
    en: "A note made after the day is left out, and a record made after it goes back to Unknown, as it was not known yet. The App goes by the dates the notes and records carry: it cannot know when a note was changed before the file was exported.",
    fr: `Une note faite après la date est laissée de côté, et une donnée saisie après redevient UNKNOWN, car elle n’était pas encore connue. L’App se fie aux dates que portent les notes et les données${NN}; elle ne peut pas savoir quand une note a été modifiée avant l’exportation du fichier.`,
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
  clear: { en: "Remove the file and the comparison from the page", fr: "Retirer le fichier et la comparaison de la page" },
  cleared: { en: "The page is empty. Nothing was saved.", fr: "La page est vide. Rien n’a été enregistré." },
  opened: { en: "The file is in the box. Choose Read the file when ready.", fr: "Le fichier est dans la zone. Choisissez Lire le fichier quand vous êtes prêt." },
  readFailed: { en: "That file could not be opened. Try pasting its text instead.", fr: "Ce fichier n’a pas pu être ouvert. Essayez plutôt de coller son texte." },
  errorsTitle: { en: "Fix this first", fr: "À corriger d’abord" },
  dayTitle: { en: "The day to look back to", fr: "La date à laquelle revenir" },
  dayLabel: { en: "Day", fr: "Date" },
  dayHint: { en: "Written like 2026-03-31, today or before.", fr: "Écrite comme 2026-03-31, aujourd’hui ou avant." },
  quickTitle: { en: "Or fill in a day often looked back to", fr: "Ou remplissez une date souvent utilisée" },
  quick: {
    month: { en: "End of last month", fr: "Fin du mois dernier" },
    quarter: { en: "End of last quarter", fr: "Fin du trimestre dernier" },
    year: { en: "End of last year", fr: "Fin de l’année dernière" },
    "year-ago": { en: "A year ago today", fr: "Il y a un an aujourd’hui" },
  },
  quickFilled: { en: "Day filled in:", fr: `Date remplie${NB}:` },
  toLabel: { en: "Compare with another, later day (optional)", fr: "Comparer avec une autre date, plus tard (facultatif)" },
  toHint: { en: "Written like 2026-06-30. Leave it empty to compare with the file now.", fr: "Écrite comme 2026-06-30. Laissez vide pour comparer avec le fichier maintenant." },
  show: { en: "Show the file as it was", fr: "Afficher le fichier tel qu’il était" },
  toProblems: {
    bad: { en: "Write the later day like 2026-06-30, or leave it empty.", fr: "Écrivez la date plus tardive comme 2026-06-30, ou laissez-la vide." },
    future: { en: "Choose a later day that is today or before.", fr: "Choisissez une date plus tardive qui soit aujourd’hui ou avant." },
    "not-after": { en: "Choose a later day after the first one.", fr: "Choisissez une date plus tardive, après la première." },
  },
  readings: {
    yes: { en: "Yes", fr: "Oui" },
    no: { en: "No", fr: "Non" },
    differ: { en: "reports differ", fr: "rapports divergents" },
    unknown: { en: "Unknown", fr: "UNKNOWN" },
    absent: { en: "not in the file", fr: "absent du fichier" },
  },
  changedTitle: { en: "Places that read differently", fr: "Lieux qui se lisent autrement" },
  noneChanged: { en: "No place reads differently for this detail.", fr: "Aucun lieu ne se lit autrement pour ce détail." },
  sourcesTitle: { en: "Records made since the day, by source", fr: "Données saisies depuis la date, par source" },
  noneSources: { en: "No record was made since the day.", fr: "Aucune donnée n’a été saisie depuis la date." },
  problems: {
    empty: { en: "Type the day to look back to.", fr: "Tapez la date à laquelle revenir." },
    bad: { en: "Write the day like 2026-03-31.", fr: "Écrivez la date comme 2026-03-31." },
    future: { en: "Choose today or a day before it.", fr: "Choisissez aujourd’hui ou une date antérieure." },
  },
  tableCaption: { en: "Places with an answer, on the day and now", fr: "Lieux avec une réponse, à la date et maintenant" },
  colDetail: { en: "Detail", fr: "Détail" },
  colThen: { en: "On the day", fr: "À la date" },
  colNow: { en: "Now", fr: "Maintenant" },
  colChange: { en: "Change", fr: "Écart" },
  answeredTitle: { en: "Places with an answer since the day", fr: "Lieux avec une réponse depuis la date" },
  noneAnswered: { en: "No place got an answer for this detail since the day.", fr: "Aucun lieu n’a reçu de réponse pour ce détail depuis la date." },
  downloadCopy: { en: "Download the file as it was (notes file)", fr: "Télécharger le fichier tel qu’il était (fichier de notes)" },
  copyHint: {
    en: "A copy with only what was known on the day. Your file does not change.",
    fr: "Une copie avec seulement ce qui était connu à la date. Votre fichier ne change pas.",
  },
  downloadCsv: { en: "Download the comparison (CSV)", fr: "Télécharger la comparaison (CSV)" },
  downloadText: { en: "Download the comparison (text)", fr: "Télécharger la comparaison (texte)" },
  downloadChanges: { en: "Download the places that read differently (CSV)", fr: "Télécharger les lieux qui se lisent autrement (CSV)" },
  errors: {
    empty: { en: "The box is empty. Paste the file’s text or open it.", fr: "La zone est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The file is too large to read here.", fr: "Le fichier est trop volumineux pour être lu ici." },
    "not-json": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-format": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-version": { en: "This export comes from a different version and cannot be read.", fr: "Cette exportation provient d’une autre version et ne peut pas être lue." },
    "no-notes": { en: "This file has no note the App can read.", fr: "Ce fichier ne contient aucune note lisible par l’App." },
  },
} as const;

export function asofErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_ASOF_COPY.errors[e], l);
}

export function dayProblemText(p: DayProblem, l: Locale): string {
  return t(FILE_ASOF_COPY.problems[p], l);
}

export function toProblemText(p: ToProblem, l: Locale): string {
  return t(FILE_ASOF_COPY.toProblems[p], l);
}

/** "End of last quarter (2026-09-30)". */
export function quickLabel(kind: QuickDay, day: string, l: Locale): string {
  return `${t(FILE_ASOF_COPY.quick[kind], l)} (${day})`;
}

export function readingText(r: Reading, l: Locale): string {
  return t(FILE_ASOF_COPY.readings[r], l);
}

/** "Now", or "On 2026-06-30" when there is a second day. */
export function nowLabel(to: string | undefined, l: Locale): string {
  if (to === undefined) return t(FILE_ASOF_COPY.colNow, l);
  return l === "fr" ? `Au ${to}` : `On ${to}`;
}

/** "Library, 1 King St W: Yes → reports differ". */
export function changedLine(c: ReadingChange, l: Locale): string {
  const k = l === "fr" ? `${NB}:` : ":";
  return `${placeLine(c.place)}${k} ${readingText(c.then, l)} → ${readingText(c.now, l)}`;
}

/** "City survey: 3 records at 2 places". The App's own label is shown in the person's language. */
export function sourceSinceLine(s: SourceSince, l: Locale): string {
  const k = l === "fr" ? `${NB}:` : ":";
  if (l === "fr") return `${sourceName(s.source, l)}${k} ${count(s.records, "donnée", "données", l)} pour ${count(s.places, "lieu", "lieux", l)}`;
  return `${sourceName(s.source, l)}${k} ${count(s.records, "record", "records", l)} at ${count(s.places, "place", "places", l)}`;
}

const count = (n: number, one: string, many: string, l: Locale): string => `${n} ${(l === "fr" ? n > 1 : n !== 1) ? many : one}`;

/** "The file on 2026-03-31", or "The file from 2026-03-31 to 2026-06-30". */
export function resultsTitle(day: string, l: Locale, to?: string): string {
  if (to !== undefined) return l === "fr" ? `Le fichier du ${day} au ${to}` : `The file from ${day} to ${to}`;
  return l === "fr" ? `Le fichier au ${day}` : `The file on ${day}`;
}

/** "On 2026-03-31 the file held 12 of its 20 notes and 30 places; 8 notes were made later, and 3 records in the others were made later." */
export function snapshotSummary(s: Snapshot, c: Comparison, l: Locale): string {
  const kept = s.notes.length;
  const total = kept + s.leftOut;
  if (l === "fr") {
    const later = `${count(s.leftOut, "note a été faite", "notes ont été faites", l)} plus tard, et ${count(s.hidden, "donnée des autres a été saisie", "données des autres ont été saisies", l)} plus tard`;
    return `Au ${s.day}, le fichier contenait ${kept} de ses ${count(total, "note", "notes", l)}, soit ${count(c.placesThen, "lieu", "lieux", l)} sur ${c.placesNow}${NN}; ${later}.`;
  }
  const later = `${count(s.leftOut, "note was", "notes were", l)} made later, and ${count(s.hidden, "record", "records", l)} in the others ${s.hidden === 1 ? "was" : "were"} made later`;
  return `On ${s.day} the file held ${kept} of its ${count(total, "note", "notes", l)}, ${count(c.placesThen, "place", "places", l)} of ${c.placesNow}; ${later}.`;
}

/** "4 Yes, 2 No, 1 with reports that differ, 3 Unknown". */
export function countsText(c: Counts, l: Locale): string {
  const differ = l === "fr" ? `${c.differ} avec rapports divergents` : `${c.differ} with reports that differ`;
  return `${c.yes} ${t(COPY.values.yes, l)}, ${c.no} ${t(COPY.values.no, l)}, ${differ}, ${c.unknown} ${t(COPY.values.unknown, l)}`;
}

/** "+3", "−1" or "0": the change in places with an answer. */
export function changeText(then: number, now: number): string {
  const d = now - then;
  return d > 0 ? `+${d}` : d < 0 ? `−${-d}` : "0";
}

/** "Elevator: 12 places with an answer on the day, 15 now; 4 places read differently now." */
export function detailLine(d: DetailChange, l: Locale, to?: string): string {
  const k = l === "fr" ? `${NB}:` : ":";
  const then = answeredCount(d.then);
  const now = answeredCount(d.now);
  if (l === "fr") {
    const when = to === undefined ? "maintenant" : `au ${to}`;
    return `${t(COPY.facts[d.key], l)}${k} ${count(then, "lieu", "lieux", l)} avec une réponse à la date, ${now} ${when}${NN}; ${count(d.changed, "lieu se lit", "lieux se lisent", l)} autrement ${when}.`;
  }
  const when = to === undefined ? "now" : `on ${to}`;
  return `${t(COPY.facts[d.key], l)}${k} ${count(then, "place", "places", l)} with an answer on the day, ${now} ${when}; ${count(d.changed, "place reads", "places read", l)} differently ${when}.`;
}

/** "Library, 1 King St W". */
export function placeLine(p: Place): string {
  return p.address ? `${p.name}, ${p.address}` : p.name;
}

/** The comparison as plain text, to print or keep. */
export function comparisonText(s: Snapshot, c: Comparison, today: Date, l: Locale, sources: readonly SourceSince[] = []): string {
  const k = l === "fr" ? `${NB}:` : ":";
  const lines = [t(FILE_ASOF_COPY.title, l), resultsTitle(c.day, l, c.to), today.toISOString().slice(0, 10), "", snapshotSummary(s, c, l), t(FILE_ASOF_COPY.rule, l), ""];
  for (const d of c.details) {
    lines.push(detailLine(d, l, c.to), `    ${t(FILE_ASOF_COPY.colThen, l)}${k} ${countsText(d.then, l)}`, `    ${nowLabel(c.to, l)}${k} ${countsText(d.now, l)}`);
    if (d.differently.length > 0) {
      lines.push(`    ${t(FILE_ASOF_COPY.changedTitle, l)}${k}`);
      for (const x of d.differently) lines.push(`      - ${changedLine(x, l)}`);
    }
    lines.push("");
  }
  if (sources.length > 0) {
    lines.push(`${t(FILE_ASOF_COPY.sourcesTitle, l)}${k}`);
    for (const x of sources) lines.push(`- ${sourceSinceLine(x, l)}`);
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

export function asofFilename(kind: "copy" | "csv" | "text" | "changes", day: string, l: Locale, to?: string): string {
  if (kind === "changes") {
    const span = to === undefined ? day : `${day}-${to}`;
    return l === "fr" ? `lieux-changes-${span}.csv` : `places-changed-${span}.csv`;
  }
  if (to !== undefined && kind !== "copy") {
    const span = `${day}-${to}`;
    return kind === "csv" ? (l === "fr" ? `comparaison-${span}.csv` : `comparison-${span}.csv`) : l === "fr" ? `comparaison-${span}.txt` : `comparison-${span}.txt`;
  }
  if (kind === "csv") return l === "fr" ? `comparaison-depuis-${day}.csv` : `comparison-since-${day}.csv`;
  if (kind === "text") return l === "fr" ? `comparaison-depuis-${day}.txt` : `comparison-since-${day}.txt`;
  return l === "fr" ? `notes-au-${day}.json` : `notes-as-of-${day}.json`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileAsofStrings(): Array<[string, Pair]> {
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
  walk("fileAsof", FILE_ASOF_COPY);
  return out;
}
