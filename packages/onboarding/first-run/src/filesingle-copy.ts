import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, NN, t, type Pair } from "./copy";
import type { BackedDetail, Backing, PairDifference, SingleMode, SinglePlace, SingleReport, SourceAlone, SourcePair } from "./corroboration";
import type { ImportError } from "./exchange";
import { FACT_KEYS } from "./facts";
import { FIRST_LIMITS } from "./lookfirst";
import { sourceName } from "./sources";

/**
 * Words for "Details with one report", in English and French. French copy
 * uses ’, U+00A0 before ":" and U+202F before ; ! ? and inside « ».
 */
export const FILE_SINGLE_COPY = {
  title: { en: "Details with one report", fr: "Détails avec un seul rapport" },
  intro: {
    en: "Find the recorded details that rest on one report, or on reports from one source only, so a second report from someone else would help most. See also how often two sources say the same when they report the same detail.",
    fr: "Trouvez les détails notés qui reposent sur un seul rapport, ou sur des rapports d’une seule source, là où un second rapport d’une autre personne aiderait le plus. Voyez aussi à quelle fréquence deux sources disent la même chose quand elles rapportent le même détail.",
  },
  meaning: {
    en: "A detail with one report is not wrong, and two sources that agree are not proved right: these counts only say how many reports there are and from whom. Details whose reports differ are open already and are counted apart.",
    fr: `Un détail avec un seul rapport n’est pas faux, et deux sources d’accord n’ont pas pour autant raison${NB}: ces décomptes disent seulement combien de rapports il y a et de qui. Les détails aux rapports divergents sont déjà à revoir et sont comptés à part.`,
  },
  privacy: { en: "Nothing is looked up or saved, and your file does not change.", fr: "Rien n’est recherché ni enregistré, et votre fichier ne change pas." },
  pasteLabel: { en: "Text of the notes file", fr: "Texte du fichier de notes" },
  pasteHint: {
    en: "A notes export is made with “Export notes” on the Notes page.",
    fr: `Une exportation de notes se crée avec «${NN}Exporter les notes${NN}» sur la page Notes.`,
  },
  openLabel: { en: "Or open the file from this device", fr: "Ou ouvrez le fichier depuis cet appareil" },
  read: { en: "Read the file", fr: "Lire le fichier" },
  clear: { en: "Remove the file and the results", fr: "Retirer le fichier et les résultats" },
  cleared: { en: "The page is empty. Nothing was saved.", fr: "La page est vide. Rien n’a été enregistré." },
  opened: { en: "The file is in the box. Choose Read the file when ready.", fr: "Le fichier est dans la zone. Choisissez Lire le fichier quand vous êtes prêt." },
  readFailed: { en: "That file could not be opened. Try pasting its text instead.", fr: "Ce fichier n’a pas pu être ouvert. Essayez plutôt de coller son texte." },
  errorsTitle: { en: "Fix this first", fr: "À corriger d’abord" },
  formTitle: { en: "What to show", fr: "Ce qu’il faut afficher" },
  modeLegend: { en: "List the details", fr: "Lister les détails" },
  modes: {
    report: { en: "With one report", fr: "Avec un seul rapport" },
    source: { en: "With reports from one source only", fr: "Avec des rapports d’une seule source" },
  },
  keysLegend: { en: "Details to look at", fr: "Détails à regarder" },
  keysEmpty: { en: "Choose at least one detail.", fr: "Choisissez au moins un détail." },
  areaLabel: { en: "Only places whose address holds (optional)", fr: "Seulement les lieux dont l’adresse contient (facultatif)" },
  areaShort: { en: "Area", fr: "Secteur" },
  areaHint: {
    en: "For example a street, a town or the first three characters of a postal code. Leave empty for the whole file.",
    fr: "Par exemple une rue, une ville ou les trois premiers caractères d’un code postal. Laissez vide pour tout le fichier.",
  },
  areaLong: { en: `Give at most ${FIRST_LIMITS.area} characters.`, fr: `Indiquez au plus ${FIRST_LIMITS.area}${NB}caractères.` },
  show: { en: "Show the details", fr: "Afficher les détails" },
  shown: { en: "The details are shown.", fr: "Les détails sont affichés." },
  resultsTitle: { en: "Results", fr: "Résultats" },
  noPlaces: { en: "No place in the file has an address holding that text.", fr: "Aucun lieu du fichier n’a une adresse contenant ce texte." },
  noneListed: {
    report: { en: "No recorded detail here rests on one report.", fr: "Aucun détail noté ici ne repose sur un seul rapport." },
    source: { en: "No detail here whose reports agree rests on one source.", fr: "Aucun détail aux rapports concordants ne repose ici sur une seule source." },
  },
  noAddress: { en: "No address", fr: "Aucune adresse" },
  backings: {
    "one-report": { en: "One report", fr: "Un seul rapport" },
    "one-source": { en: "Several reports, one source", fr: "Plusieurs rapports, une seule source" },
    several: { en: "Reports from several sources", fr: "Rapports de plusieurs sources" },
  },
  countsCaption: { en: "Details whose reports agree, by how they are backed", fr: "Détails aux rapports concordants, selon leur appui" },
  countsColumns: {
    backing: { en: "Backed by", fr: "Appuyé par" },
    details: { en: "Details", fr: "Détails" },
  },
  placesTitle: { en: "Places with details listed", fr: "Lieux ayant des détails listés" },
  sourcesTitle: { en: "By source", fr: "Par source" },
  sourcesCaption: { en: "Details each source reports, and those only it reports", fr: "Détails que chaque source rapporte, et ceux qu’elle seule rapporte" },
  sourcesColumns: {
    source: { en: "Source", fr: "Source" },
    alone: { en: "Only this source", fr: "Cette source seule" },
    reports: { en: "Details it reports", fr: "Détails rapportés" },
  },
  pairsTitle: { en: "When two sources report the same detail", fr: "Quand deux sources rapportent le même détail" },
  pairsHint: {
    en: "For each pair of sources, the details of a place that both report, and whether their newest records say the same.",
    fr: "Pour chaque paire de sources, les détails d’un lieu que les deux rapportent, et si leurs données les plus récentes disent la même chose.",
  },
  pairsCaption: { en: "Pairs of sources reporting the same details", fr: "Paires de sources rapportant les mêmes détails" },
  pairsColumns: {
    a: { en: "Source", fr: "Source" },
    b: { en: "Other source", fr: "Autre source" },
    both: { en: "Details both report", fr: "Détails rapportés par les deux" },
    same: { en: "Same answer", fr: "Même réponse" },
    different: { en: "Different answer", fr: "Réponse différente" },
  },
  whereDiffer: { en: "Where they differ", fr: "Là où elles diffèrent" },
  noPairs: { en: "No detail is reported by two sources.", fr: "Aucun détail n’est rapporté par deux sources." },
  downloadCsv: { en: "Download the details listed (CSV)", fr: "Télécharger les détails listés (CSV)" },
  downloadNotes: { en: "Download the notes of these places", fr: "Télécharger les notes de ces lieux" },
  notesHint: {
    en: "After a visit, add what you found with “Record what you found on a round”, giving your visit as the source and its date.",
    fr: `Après une visite, ajoutez ce que vous avez constaté avec «${NN}Noter ce que vous avez constaté lors d’une tournée${NN}», en indiquant votre visite comme source et sa date.`,
  },
  downloadText: { en: "Download the list to print", fr: "Télécharger la liste à imprimer" },
  downloadDiffer: { en: "Download where sources differ (CSV)", fr: "Télécharger les divergences entre sources (CSV)" },
  downloadDifferNotes: { en: "Download the notes of the places where sources differ", fr: "Télécharger les notes des lieux où les sources divergent" },
  errors: {
    empty: { en: "The box is empty. Paste the file’s text or open it.", fr: "La zone est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The file is too large to read here.", fr: "Le fichier est trop volumineux pour être lu ici." },
    "not-json": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-format": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-version": { en: "This export comes from a different version and cannot be read.", fr: "Cette exportation provient d’une autre version et ne peut pas être lue." },
    "no-notes": { en: "This file has no note the App can read.", fr: "Ce fichier ne contient aucune note lisible par l’App." },
  },
} as const;

export function singleErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_SINGLE_COPY.errors[e], l);
}

export function modeText(m: SingleMode, l: Locale): string {
  return t(FILE_SINGLE_COPY.modes[m], l);
}

export function backingText(b: Backing, l: Locale): string {
  return t(FILE_SINGLE_COPY.backings[b], l);
}

const count = (n: number, one: string, many: string, l: Locale): string => `${n} ${(l === "fr" ? n > 1 : n !== 1) ? many : one}`;

/** "Elevator: Yes — 1 report, City survey, newest 2026-01-10". */
export function detailText(d: BackedDetail, l: Locale): string {
  const k = l === "fr" ? `${NB}:` : ":";
  const reports = l === "fr" ? count(d.reports, "rapport", "rapports", l) : count(d.reports, "report", "reports", l);
  const newest = l === "fr" ? `le plus récent ${d.newest}` : `newest ${d.newest}`;
  return `${t(COPY.facts[d.key], l)}${k} ${t(COPY.values[d.value], l)} — ${reports}, ${d.sources.map((s) => sourceName(s, l)).join(", ")}, ${newest}`;
}

/** "Where City survey and Visit differ (2)". */
export function differHeading(p: SourcePair, l: Locale): string {
  const a = sourceName(p.a, l);
  const b = sourceName(p.b, l);
  return l === "fr" ? `Là où ${a} et ${b} diffèrent (${p.differences.length})` : `Where ${a} and ${b} differ (${p.differences.length})`;
}

/** "Elevator: City survey Yes (2026-10-01), Visit No (2026-09-12)". The place is shown apart. */
export function differenceText(d: PairDifference, p: SourcePair, l: Locale): string {
  const k = l === "fr" ? `${NB}:` : ":";
  return `${t(COPY.facts[d.key], l)}${k} ${sourceName(p.a, l)} ${t(COPY.values[d.a.value], l)} (${d.a.on}), ${sourceName(p.b, l)} ${t(COPY.values[d.b.value], l)} (${d.b.on})`;
}

/** "Elevator, Automatic door" — the details considered, when not all of them. */
export function keysText(r: SingleReport, l: Locale): string {
  return r.keys.map((k) => t(COPY.facts[k], l)).join(", ");
}

export function singleSummary(r: SingleReport, l: Locale): string {
  const c = r.counts;
  const agreed = c["one-report"] + c["one-source"] + c.several;
  const listed = r.list.reduce((n, p) => n + p.details.length, 0);
  const fr = l === "fr";
  const head = fr
    ? `${count(r.places, "lieu", "lieux", l)}, ${count(agreed, "détail aux rapports concordants", "détails aux rapports concordants", l)}${NB}: ${c["one-report"]} avec un seul rapport, ${c["one-source"]} avec plusieurs rapports d’une seule source, ${c.several} avec des rapports de plusieurs sources.`
    : `${count(r.places, "place", "places", l)}, ${count(agreed, "detail", "details", l)} whose reports agree: ${c["one-report"]} with one report, ${c["one-source"]} with several reports from one source, ${c.several} with reports from several sources.`;
  const listedText = fr
    ? `${count(listed, "détail listé", "détails listés", l)} dans ${count(r.list.length, "lieu", "lieux", l)}. Rapports divergents${NB}: ${r.differ}.`
    : `${count(listed, "detail", "details", l)} listed at ${count(r.list.length, "place", "places", l)}. Reports that differ: ${r.differ}.`;
  return `${head} ${listedText}`;
}

function placeLine(p: SinglePlace): string {
  return `${p.place.name}${p.place.address ? `, ${p.place.address}` : ""}`;
}

/** "City survey: only this source 2, details it reports 4". */
export function sourceLine(s: SourceAlone, l: Locale): string {
  const c = FILE_SINGLE_COPY.sourcesColumns;
  const k = l === "fr" ? `${NB}:` : ":";
  return `${sourceName(s.source, l)}${k} ${t(c.alone, l).toLowerCase()} ${s.alone}, ${t(c.reports, l).toLowerCase()} ${s.reports}`;
}

/** "City survey / Visit: details both report 2, same answer 1, different answer 1". */
export function pairLine(p: SourcePair, l: Locale): string {
  const c = FILE_SINGLE_COPY.pairsColumns;
  const k = l === "fr" ? `${NB}:` : ":";
  return `${sourceName(p.a, l)} / ${sourceName(p.b, l)}${k} ${t(c.both, l).toLowerCase()} ${p.both}, ${t(c.same, l).toLowerCase()} ${p.same}, ${t(c.different, l).toLowerCase()} ${p.different}`;
}

/** The list as text to print. */
export function singleText(r: SingleReport, area: string, today: Date, l: Locale): string {
  const T = FILE_SINGLE_COPY;
  const k = l === "fr" ? `${NB}:` : ":";
  const lines = [t(T.title, l), `${l === "fr" ? "Créée le" : "Made on"} ${today.toISOString().slice(0, 10)}`, `${t(T.modeLegend, l)}${k} ${modeText(r.mode, l).toLowerCase()}`];
  if (r.keys.length < FACT_KEYS.length) lines.push(`${t(T.keysLegend, l)}${k} ${keysText(r, l)}`);
  if (area.trim() !== "") lines.push(`${t(T.areaShort, l)}${k} ${area.trim()}`);
  lines.push("", singleSummary(r, l), "");
  for (const p of r.list) lines.push(placeLine(p), ...p.details.map((d) => `  - ${detailText(d, l)}`));
  const heading = (s: string): void => void lines.push("", s, "-".repeat(Math.min(s.length, 72)));
  if (r.bySource.length > 0) {
    heading(t(T.sourcesTitle, l));
    lines.push(...r.bySource.map((s) => sourceLine(s, l)));
  }
  if (r.pairs.length > 0) {
    heading(t(T.pairsTitle, l));
    for (const p of r.pairs) {
      lines.push(pairLine(p, l));
      for (const d of p.differences) lines.push(`  - ${d.place.name}${d.place.address ? `, ${d.place.address}` : ""} — ${differenceText(d, p, l)}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

export function singleFilename(kind: "csv" | "notes" | "text" | "differ" | "differ-notes", mode: SingleMode, today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  const what = l === "fr" ? (mode === "report" ? "un-seul-rapport" : "une-seule-source") : mode === "report" ? "one-report" : "one-source";
  const stem = l === "fr" ? `details-${what}-${day}` : `details-with-${what}-${day}`;
  if (kind === "notes") return `${stem}-notes.json`;
  if (kind === "differ-notes") return l === "fr" ? `lieux-ou-les-sources-divergent-${day}-notes.json` : `places-where-sources-differ-${day}-notes.json`;
  if (kind === "differ") return l === "fr" ? `divergences-entre-sources-${day}.csv` : `where-sources-differ-${day}.csv`;
  return `${stem}.${kind === "csv" ? "csv" : "txt"}`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileSingleStrings(): Array<[string, Pair]> {
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
  walk("fileSingle", FILE_SINGLE_COPY);
  return out;
}
