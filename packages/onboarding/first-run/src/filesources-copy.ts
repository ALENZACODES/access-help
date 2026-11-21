import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import type { FactKey } from "./facts";
import type { AloneAnswer, Overlap, OverlapRow, SourceOrder, SourceReport, SourceRow } from "./sourcecover";
import { sourceName } from "./sources";

/**
 * Words for "Which sources the answers rest on", in English and French.
 * French copy uses ’, U+00A0 before ":" and U+202F before ; ! ? and inside « ».
 */
export const FILE_SOURCES_COPY = {
  title: { en: "Which sources the answers rest on", fr: "Sur quelles sources reposent les réponses" },
  intro: {
    en: "For each source in a notes file: how many records it holds, for how many places, and how many answers rest on it alone, so that without it the detail would be Unknown.",
    fr: `Pour chaque source d’un fichier de notes${NB}: combien de données elle fournit, pour combien de lieux, et combien de réponses reposent sur elle seule, si bien que sans elle le détail serait UNKNOWN.`,
  },
  rule: {
    en: "This counts records. It does not say that a source is better or worse, and a detail with no record stays Unknown.",
    fr: "Ceci compte des données. Cela ne dit pas qu’une source est meilleure ou pire, et un détail sans donnée reste UNKNOWN.",
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
  optionsTitle: { en: "What to count", fr: "Ce qu’il faut compter" },
  keysLegend: { en: "Details", fr: "Détails" },
  orderLegend: { en: "Order", fr: "Ordre" },
  order: {
    records: { en: "Most records first", fr: "Le plus de données d’abord" },
    alone: { en: "Most answers resting on it alone first", fr: "Le plus de réponses reposant sur elle seule d’abord" },
    name: { en: "By name", fr: "Par nom" },
  },
  show: { en: "Show the sources", fr: "Afficher les sources" },
  noKeys: { en: "Tick at least one detail to count.", fr: "Cochez au moins un détail à compter." },
  resultsTitle: { en: "Sources in the file", fr: "Sources du fichier" },
  noSources: { en: "No record in this file has a Yes or a No for the details chosen.", fr: "Aucune donnée de ce fichier n’a de Oui ni de Non pour les détails choisis." },
  tableCaption: { en: "Records and answers by source", fr: "Données et réponses par source" },
  colSource: { en: "Source", fr: "Source" },
  colRecords: { en: "Records", fr: "Données" },
  colPlaces: { en: "Places", fr: "Lieux" },
  colShown: { en: "Answers shown from it", fr: "Réponses affichées d’après elle" },
  colAlone: { en: "Answers resting on it alone", fr: "Réponses reposant sur elle seule" },
  colDays: { en: "Days recorded", fr: "Jours des données" },
  colLicences: { en: "Licences used", fr: "Licences utilisées" },
  colList: { en: "List", fr: "Liste" },
  shownHint: {
    en: "An answer is shown from a source when its record is the newest for that place and detail.",
    fr: "Une réponse est affichée d’après une source quand sa donnée est la plus récente pour ce lieu et ce détail.",
  },
  aloneHint: {
    en: "Without this source these details would be Unknown. Download the notes of these places to look again, or to ask another source.",
    fr: "Sans cette source, ces détails seraient UNKNOWN. Téléchargez les notes de ces lieux pour les revoir, ou pour interroger une autre source.",
  },
  differ: { en: "Reports differ", fr: "Rapports divergents" },
  noAddress: { en: "No address", fr: "Aucune adresse" },
  downloadAlone: { en: "Download the notes of these places", fr: "Télécharger les notes de ces lieux" },
  closeAlone: { en: "Hide the list", fr: "Masquer la liste" },
  compareTitle: { en: "Where two sources answer the same detail", fr: "Là où deux sources répondent au même détail" },
  compareHint: {
    en: "For each place and detail both sources answer, their newest answers are compared. This does not say which source is right.",
    fr: "Pour chaque lieu et détail auxquels les deux sources répondent, leurs réponses les plus récentes sont comparées. Cela ne dit pas quelle source a raison.",
  },
  firstSource: { en: "First source", fr: "Première source" },
  secondSource: { en: "Second source", fr: "Deuxième source" },
  compare: { en: "Compare the two sources", fr: "Comparer les deux sources" },
  sameSource: { en: "Choose two different sources.", fr: "Choisissez deux sources différentes." },
  downloadCsv: { en: "Download the table (CSV)", fr: "Télécharger le tableau (CSV)" },
  downloadText: { en: "Download the sources (text)", fr: "Télécharger les sources (texte)" },
  errors: {
    empty: { en: "The box is empty. Paste the file’s text or open it.", fr: "La zone est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The file is too large to read here.", fr: "Le fichier est trop volumineux pour être lu ici." },
    "not-json": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-format": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-version": { en: "This export comes from a different version and cannot be read.", fr: "Cette exportation provient d’une autre version et ne peut pas être lue." },
    "no-notes": { en: "This file has no note the App can read.", fr: "Ce fichier ne contient aucune note lisible par l’App." },
  },
} as const;

export function sourcesErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_SOURCES_COPY.errors[e], l);
}

export function orderText(o: SourceOrder, l: Locale): string {
  return t(FILE_SOURCES_COPY.order[o], l);
}

const count = (n: number, one: string, many: string, l: Locale): string => `${n} ${(l === "fr" ? n > 1 : n !== 1) ? many : one}`;

/** "4 sources. 30 answers: 18 rest on one source alone, 12 on two sources or more." */
export function reportSummary(r: SourceReport, l: Locale): string {
  if (r.rows.length === 0) return t(FILE_SOURCES_COPY.noSources, l);
  if (l === "fr")
    return `${count(r.rows.length, "source", "sources", l)}. ${count(r.answers, "réponse", "réponses", l)}${NB}: ${r.alone} ${r.alone > 1 ? "reposent" : "repose"} sur une seule source, ${r.several} sur deux sources ou plus.`;
  return `${count(r.rows.length, "source", "sources", l)}. ${count(r.answers, "answer", "answers", l)}: ${r.alone} ${r.alone === 1 ? "rests" : "rest"} on one source alone, ${r.several} on two sources or more.`;
}

/** "2026-01-05 to 2026-10-01", or one day. */
export function daysText(row: SourceRow, l: Locale): string {
  if (row.first === row.last) return row.first;
  return l === "fr" ? `du ${row.first} au ${row.last}` : `${row.first} to ${row.last}`;
}

/** The source's name as the reader's language writes it. */
export function sourceLabel(source: string, l: Locale): string {
  return sourceName(source, l);
}

/** "Show the answers that rest on City survey alone (3)": a button name that says which source. */
export function showAloneLabel(row: SourceRow, l: Locale): string {
  const name = sourceLabel(row.source, l);
  return l === "fr" ? `Afficher les réponses reposant sur ${name} seule (${row.alone})` : `Show the answers that rest on ${name} alone (${row.alone})`;
}

/** "Answers that rest on City survey alone (3)". */
export function aloneTitle(source: string, n: number, l: Locale): string {
  const name = sourceLabel(source, l);
  return l === "fr" ? `Réponses reposant sur ${name} seule (${n})` : `Answers that rest on ${name} alone (${n})`;
}

/** "Elevator: Yes", or "Elevator: Reports differ". */
export function aloneLine(a: AloneAnswer, l: Locale): string {
  const k = l === "fr" ? `${NB}:` : ":";
  const value = a.value === "differ" ? t(FILE_SOURCES_COPY.differ, l) : t(COPY.values[a.value], l);
  return `${t(COPY.facts[a.key], l)}${k} ${value}`;
}

/** "City survey and Visit both answer 5 details: the same answer for 3, different answers for 2." */
export function overlapSummary(a: string, b: string, o: Overlap, l: Locale): string {
  const na = sourceLabel(a, l);
  const nb = sourceLabel(b, l);
  const d = o.differ.length;
  if (o.both === 0) return l === "fr" ? `${na} et ${nb} ne répondent à aucun détail en commun.` : `${na} and ${nb} do not answer any detail in common.`;
  if (l === "fr")
    return `${na} et ${nb} répondent tous deux à ${count(o.both, "détail", "détails", l)}${NB}: la même réponse pour ${o.same}, des réponses différentes pour ${d}.`;
  return `${na} and ${nb} both answer ${count(o.both, "detail", "details", l)}: the same answer for ${o.same}, different answers for ${d}.`;
}

/** "Elevator: City survey Yes, Visit No". */
export function overlapLine(row: OverlapRow, a: string, b: string, l: Locale): string {
  const k = l === "fr" ? `${NB}:` : ":";
  return `${t(COPY.facts[row.key], l)}${k} ${sourceLabel(a, l)} ${t(COPY.values[row.a], l)}, ${sourceLabel(b, l)} ${t(COPY.values[row.b], l)}`;
}

/** The sources as plain text, to print or keep. */
export function sourcesText(r: SourceReport, today: Date, l: Locale): string {
  const k = l === "fr" ? `${NB}:` : ":";
  const lines = [t(FILE_SOURCES_COPY.title, l), today.toISOString().slice(0, 10), "", t(FILE_SOURCES_COPY.rule, l), reportSummary(r, l), ""];
  for (const s of r.rows) {
    lines.push(sourceLabel(s.source, l));
    lines.push(`    ${t(FILE_SOURCES_COPY.colRecords, l)}${k} ${s.records}`);
    lines.push(`    ${t(FILE_SOURCES_COPY.colPlaces, l)}${k} ${s.places}`);
    lines.push(`    ${t(FILE_SOURCES_COPY.colShown, l)}${k} ${s.shown}`);
    lines.push(`    ${t(FILE_SOURCES_COPY.colAlone, l)}${k} ${s.alone}`);
    lines.push(`    ${t(FILE_SOURCES_COPY.colDays, l)}${k} ${daysText(s, l)}`);
    lines.push(`    ${t(FILE_SOURCES_COPY.colLicences, l)}${k} ${s.licences.join(", ")}`);
    for (const key of r.keys) lines.push(`    ${t(COPY.facts[key as FactKey], l)}${k} ${s.byKey[key].records} / ${s.byKey[key].alone}`);
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

/** File names for the table, the text and the notes of the places resting on one source. */
export function sourcesFilename(kind: "csv" | "text" | "notes", today: Date, l: Locale, source?: string): string {
  const day = today.toISOString().slice(0, 10);
  if (kind === "csv") return `sources-${day}.csv`;
  if (kind === "text") return `sources-${day}.txt`;
  const slug =
    (source ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "source";
  return l === "fr" ? `notes-seulement-${slug}-${day}.json` : `notes-only-${slug}-${day}.json`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileSourcesStrings(): Array<[string, Pair]> {
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
  walk("fileSources", FILE_SOURCES_COPY);
  return out;
}
