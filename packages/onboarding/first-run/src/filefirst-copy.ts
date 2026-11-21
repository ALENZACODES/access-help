import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import type { FactKey } from "./facts";
import type { FirstOrder, FirstProblem, FirstView, PlaceNeeds, Ranked, StreetNeeds, StreetRanking } from "./lookfirst";

/**
 * Words for "Choose places to look at first", in English and French. French
 * copy uses ’, U+00A0 before ":" and U+202F before ; ! ? and inside « ». A
 * detail with no record is the token UNKNOWN in French.
 */
export const FILE_FIRST_COPY = {
  title: { en: "Choose places to look at first", fr: "Choisir les lieux à regarder en premier" },
  intro: {
    en: "Rank the places in a notes export by what is still open there, and take the first ones as their own notes file, to sort by street, plan visits or record a round.",
    fr: "Classez les lieux d’une exportation de notes selon ce qui reste à regarder, et prenez les premiers dans leur propre fichier de notes, pour les trier par rue, planifier des visites ou noter une tournée.",
  },
  privacy: {
    en: "The ranking only uses what the file records. Nothing is looked up, nothing is saved and nothing is sent anywhere.",
    fr: "Le classement n’utilise que ce que le fichier enregistre. Rien n’est recherché, enregistré ni envoyé.",
  },
  pasteLabel: { en: "Text of the notes file", fr: "Texte du fichier de notes" },
  pasteHint: {
    en: "A notes export is made with “Export notes” on the Notes page.",
    fr: `Une exportation de notes se crée avec «${NN}Exporter les notes${NN}» sur la page Notes.`,
  },
  openLabel: { en: "Or open the file from this device", fr: "Ou ouvrez le fichier depuis cet appareil" },
  read: { en: "Rank the places", fr: "Classer les lieux" },
  clear: { en: "Remove the file and the ranking", fr: "Retirer le fichier et le classement" },
  cleared: { en: "The page is empty. Nothing was saved.", fr: "La page est vide. Rien n’a été enregistré." },
  opened: { en: "The file is in the box. Choose Rank the places when ready.", fr: "Le fichier est dans la zone. Choisissez Classer les lieux quand vous êtes prêt." },
  readFailed: { en: "That file could not be opened. Try pasting its text instead.", fr: "Ce fichier n’a pas pu être ouvert. Essayez plutôt de coller son texte." },
  errorsTitle: { en: "Fix this first", fr: "À corriger d’abord" },
  optionsTitle: { en: "How to rank", fr: "Comment classer" },
  viewLegend: { en: "Show", fr: "Afficher" },
  views: {
    places: { en: "Places, one by one", fr: "Les lieux, un par un" },
    streets: { en: "Streets, with what is open on each", fr: "Les rues, avec ce qui reste à regarder sur chacune" },
  },
  orderLegend: { en: "Put first", fr: "Mettre en premier" },
  orders: {
    most: { en: "Places with the most to look at", fr: "Les lieux où il y a le plus à regarder" },
    differ: { en: "Places where reports differ", fr: "Les lieux aux rapports divergents" },
    oldest: { en: "Places never recorded, then the oldest records", fr: "Les lieux jamais notés, puis les données les plus anciennes" },
  },
  keysLegend: { en: "Details that count", fr: "Détails pris en compte" },
  includeOld: {
    en: "Count recorded details whose newest report is a year old or more",
    fr: "Compter les détails notés dont le rapport le plus récent date d’un an ou plus",
  },
  areaLabel: { en: "Only places whose address holds (optional)", fr: "Seulement les lieux dont l’adresse contient (facultatif)" },
  areaHint: {
    en: "For example King St or M5H. Case and accents do not matter.",
    fr: "Par exemple rue Principale ou M5H. Les majuscules et les accents ne comptent pas.",
  },
  countLabel: { en: "How many places or streets to take first (1 to 200)", fr: "Combien de lieux ou de rues prendre en premier (1 à 200)" },
  update: { en: "Update the ranking", fr: "Mettre le classement à jour" },
  problems: {
    keys: { en: "Choose at least one detail.", fr: "Choisissez au moins un détail." },
    area: { en: "Give at most 60 characters.", fr: "Indiquez au plus 60 caractères." },
    count: { en: "Give a whole number from 1 to 200.", fr: "Indiquez un nombre entier de 1 à 200." },
  },
  listTitle: { en: "First places", fr: "Premiers lieux" },
  streetsTitle: { en: "First streets", fr: "Premières rues" },
  noStreetTitle: { en: "Places with no street in the address", fr: "Lieux sans rue dans l’adresse" },
  noStreetHint: {
    en: "These places have something to look at, but their address gives no house number and street, so they are not put on a street.",
    fr: "Ces lieux ont quelque chose à regarder, mais leur adresse ne donne pas de numéro ni de rue, donc ils ne sont rattachés à aucune rue.",
  },
  downloadStreetNotes: { en: "Download the notes of the places on these streets", fr: "Télécharger les notes des lieux de ces rues" },
  downloadStreetsCsv: { en: "Download the streets as a spreadsheet (CSV)", fr: "Télécharger les rues en tableur (CSV)" },
  downloadText: { en: "Download the list to print", fr: "Télécharger la liste à imprimer" },
  printMade: { en: "Made on", fr: "Créée le" },
  noAddress: { en: "No address", fr: "Aucune adresse" },
  reasons: {
    unknown: { en: "No record", fr: "Aucune donnée" },
    differ: { en: "Reports differ", fr: "Rapports divergents" },
    old: { en: "A year old or more", fr: "Datant d’un an ou plus" },
  },
  newest: { en: "Newest record", fr: "Donnée la plus récente" },
  neverRecorded: { en: "Nothing recorded yet", fr: "Rien de noté pour l’instant" },
  downloadNotes: { en: "Download the notes of these places", fr: "Télécharger les notes de ces lieux" },
  downloadCsv: { en: "Download the ranking as a spreadsheet (CSV)", fr: "Télécharger le classement en tableur (CSV)" },
  nextHint: {
    en: "Open the downloaded notes in Sort a notes file by street, Plan visits by day or Record what you found on a round.",
    fr: "Ouvrez les notes téléchargées dans Trier un fichier de notes par rue, Planifier les visites par jour ou Noter ce que vous avez constaté lors d’une tournée.",
  },
  oldNote: {
    en: "A year-old record is not wrong. It is only worth looking at again.",
    fr: "Une donnée d’un an n’est pas fausse. Elle mérite seulement un nouveau regard.",
  },
  updated: { en: "The ranking is updated.", fr: "Le classement est mis à jour." },
  errors: {
    empty: { en: "The box is empty. Paste the file’s text or open it.", fr: "La zone est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The file is too large to read here.", fr: "Le fichier est trop volumineux pour être lu ici." },
    "not-json": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-format": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-version": { en: "This export comes from a different version and cannot be read.", fr: "Cette exportation provient d’une autre version et ne peut pas être lue." },
    "no-notes": { en: "This file has no note the App can read.", fr: "Ce fichier ne contient aucune note lisible par l’App." },
  },
} as const;

export function firstErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_FIRST_COPY.errors[e], l);
}

export function problemText(p: FirstProblem["code"], l: Locale): string {
  return t(FILE_FIRST_COPY.problems[p], l);
}

export function viewText(v: FirstView, l: Locale): string {
  return t(FILE_FIRST_COPY.views[v], l);
}

export function orderText(o: FirstOrder, l: Locale): string {
  return t(FILE_FIRST_COPY.orders[o], l);
}

function names(keys: readonly FactKey[], l: Locale): string {
  return keys.map((k) => t(COPY.facts[k], l)).join(", ");
}

/**
 * Why a place ranks where it does, one reason a line:
 * "No record: Elevator, Automatic door". French uses the token UNKNOWN beside
 * the words, so the state reads the same as everywhere else in the App.
 */
export function reasonLines(n: PlaceNeeds, l: Locale): string[] {
  const k = l === "fr" ? `${NB}:` : ":";
  const C = FILE_FIRST_COPY.reasons;
  return [
    ...(n.unknown.length > 0 ? [`${t(C.unknown, l)} (${t(COPY.values.unknown, l)})${k} ${names(n.unknown, l)}`] : []),
    ...(n.differ.length > 0 ? [`${t(C.differ, l)}${k} ${names(n.differ, l)}`] : []),
    ...(n.old.length > 0 ? [`${t(C.old, l)}${k} ${names(n.old, l)}`] : []),
  ];
}

/** "Newest record: 2025-03-01" or "Nothing recorded yet". */
export function newestText(n: PlaceNeeds, l: Locale): string {
  if (n.newest === undefined) return t(FILE_FIRST_COPY.neverRecorded, l);
  return `${t(FILE_FIRST_COPY.newest, l)}${l === "fr" ? NB : ""}: ${n.newest}`;
}

const placesCount = (n: number, l: Locale): string => (l === "fr" ? `${n} ${n > 1 ? "lieux" : "lieu"}` : `${n} ${n === 1 ? "place" : "places"}`);

/** "14 places have something to look at; the first 10 are listed. 3 places have nothing to look at." */
export function rankedSummary(r: Ranked, shown: number, area: string, l: Locale): string {
  const n = r.ranked.length;
  const parts: string[] = [];
  if (l === "fr") {
    parts.push(
      n === 0
        ? "Aucun lieu n’a quelque chose à regarder."
        : `${placesCount(n, l)} ${n > 1 ? "ont" : "a"} quelque chose à regarder${NN}; ${shown === n ? (n > 1 ? "tous sont listés" : "il est listé") : shown === 1 ? "le premier est listé" : `les ${shown} premiers sont listés`}.`,
    );
    if (r.nothingOpen > 0) parts.push(`${placesCount(r.nothingOpen, l)} sans rien à regarder.`);
    if (r.outsideArea > 0) parts.push(`${placesCount(r.outsideArea, l)} dont l’adresse ne contient pas «${NN}${area}${NN}».`);
  } else {
    parts.push(
      n === 0
        ? "No place has anything to look at."
        : `${placesCount(n, l)} ${n === 1 ? "has" : "have"} something to look at; ${shown === n ? (n === 1 ? "it is listed" : "all are listed") : shown === 1 ? "the first is listed" : `the first ${shown} are listed`}.`,
    );
    if (r.nothingOpen > 0) parts.push(`${placesCount(r.nothingOpen, l)} with nothing to look at.`);
    if (r.outsideArea > 0) parts.push(`${placesCount(r.outsideArea, l)} whose address does not hold “${area}”.`);
  }
  return parts.join(" ");
}

const detailsCount = (n: number, l: Locale): string => (l === "fr" ? `${n} ${n > 1 ? "détails" : "détail"}` : `${n} ${n === 1 ? "detail" : "details"}`);

/**
 * "3 places, 7 details to look at: 4 with no record, 1 where reports differ,
 * 2 a year old or more. 1 place never recorded."
 */
export function streetLine(s: StreetNeeds, l: Locale): string {
  const parts: string[] = [];
  if (l === "fr") {
    if (s.unknown > 0) parts.push(`${s.unknown} sans donnée`);
    if (s.differ > 0) parts.push(`${s.differ} aux rapports divergents`);
    if (s.old > 0) parts.push(`${s.old} datant d’un an ou plus`);
    const head = `${placesCount(s.places.length, l)}, ${detailsCount(s.open, l)} à regarder${NB}: ${parts.join(", ")}.`;
    return s.neverRecorded > 0 ? `${head} ${placesCount(s.neverRecorded, l)} jamais ${s.neverRecorded > 1 ? "notés" : "noté"}.` : head;
  }
  if (s.unknown > 0) parts.push(`${s.unknown} with no record`);
  if (s.differ > 0) parts.push(`${s.differ} where reports differ`);
  if (s.old > 0) parts.push(`${s.old} a year old or more`);
  const head = `${placesCount(s.places.length, l)}, ${detailsCount(s.open, l)} to look at: ${parts.join(", ")}.`;
  return s.neverRecorded > 0 ? `${head} ${placesCount(s.neverRecorded, l)} never recorded.` : head;
}

/** "5 streets have something to look at; the first 3 are listed. 2 places with no street." */
export function streetsSummary(s: StreetRanking, shown: number, l: Locale): string {
  const n = s.streets.length;
  const streets = l === "fr" ? `${n} ${n > 1 ? "rues" : "rue"}` : `${n} ${n === 1 ? "street" : "streets"}`;
  const listed =
    l === "fr"
      ? shown === n
        ? n > 1
          ? "toutes sont listées"
          : "elle est listée"
        : shown === 1
          ? "la première est listée"
          : `les ${shown} premières sont listées`
      : shown === n
        ? n === 1
          ? "it is listed"
          : "all are listed"
        : shown === 1
          ? "the first is listed"
          : `the first ${shown} are listed`;
  const head =
    n === 0
      ? l === "fr"
        ? "Aucune rue n’a quelque chose à regarder."
        : "No street has anything to look at."
      : l === "fr"
        ? `${streets} ${n > 1 ? "ont" : "a"} quelque chose à regarder${NN}; ${listed}.`
        : `${streets} ${n === 1 ? "has" : "have"} something to look at; ${listed}.`;
  if (s.noStreet.length === 0) return head;
  return `${head} ${placesCount(s.noStreet.length, l)} ${l === "fr" ? "sans rue dans l’adresse" : "with no street in the address"}.`;
}

export function firstFilename(kind: "notes" | "csv" | "text" | "street-notes" | "streets-csv" | "streets-text", count: number, today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  if (kind === "text") return l === "fr" ? `liste-${count}-lieux-${day}.txt` : `list-${count}-places-${day}.txt`;
  if (kind === "streets-text") return l === "fr" ? `liste-${count}-rues-${day}.txt` : `list-${count}-streets-${day}.txt`;
  if (kind === "street-notes") return l === "fr" ? `notes-${count}-premieres-rues-${day}.json` : `notes-first-${count}-streets-${day}.json`;
  if (kind === "streets-csv") return l === "fr" ? `classement-${count}-rues-${day}.csv` : `ranking-${count}-streets-${day}.csv`;
  if (kind === "csv") return l === "fr" ? `classement-${count}-lieux-${day}.csv` : `ranking-${count}-places-${day}.csv`;
  return l === "fr" ? `notes-${count}-premiers-lieux-${day}.json` : `notes-first-${count}-places-${day}.json`;
}

function printHead(title: string, summary: string, l: Locale, today: Date): string[] {
  return [title, `${t(FILE_FIRST_COPY.printMade, l)} ${today.toISOString().slice(0, 10)}`, summary, ""];
}

/** The first places as text to print: rank, name, address, reasons and newest record. */
export function rankingText(picked: readonly PlaceNeeds[], summary: string, l: Locale, today: Date): string {
  const lines = printHead(t(FILE_FIRST_COPY.listTitle, l), summary, l, today);
  picked.forEach((n, i) => {
    lines.push(`${i + 1}. ${n.place.name}`, `    ${n.place.address ?? t(FILE_FIRST_COPY.noAddress, l)}`);
    for (const r of reasonLines(n, l)) lines.push(`    ${r}`);
    lines.push(`    ${newestText(n, l)}`, "");
  });
  return `${lines.join("\n")}\n`;
}

/** The first streets as text to print: each street with what is open and its places, then places with no street. */
export function streetsText(s: StreetRanking, picked: readonly StreetNeeds[], summary: string, l: Locale, today: Date): string {
  const lines = printHead(t(FILE_FIRST_COPY.streetsTitle, l), summary, l, today);
  picked.forEach((x, i) => {
    lines.push(`${i + 1}. ${x.name}`, `    ${streetLine(x, l)}`);
    for (const n of x.places) lines.push(`    [ ] ${n.place.name}, ${n.place.address ?? ""}`);
    lines.push("");
  });
  if (s.noStreet.length > 0) {
    lines.push(t(FILE_FIRST_COPY.noStreetTitle, l));
    for (const n of s.noStreet) lines.push(`    [ ] ${n.place.name}, ${n.place.address ?? t(FILE_FIRST_COPY.noAddress, l)}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileFirstStrings(): Array<[string, Pair]> {
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
  walk("fileFirst", FILE_FIRST_COPY);
  return out;
}
