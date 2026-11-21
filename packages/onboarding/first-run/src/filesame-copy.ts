import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import { FACT_KEYS } from "./facts";
import { LIMITS } from "./model";
import { MAX_GROUPS, type JoinedCopy, type MatchLink, type MatchReport, type TypedProblem } from "./placematch";
import type { Place } from "./places";
import type { SimilarReason } from "./similar";

/**
 * Words for "Places that may be the same", in English and French. French copy
 * uses ’, U+00A0 before ":" and U+202F before ; ! ? and inside « ».
 */
export const FILE_SAME_COPY = {
  title: { en: "Places that may be the same", fr: "Lieux qui sont peut-être les mêmes" },
  intro: {
    en: "After notes from several people are put together, one place can show up twice, written two ways. Find the places in a notes export that may be one place, and join the ones you choose in a copy.",
    fr: "Quand on réunit les notes de plusieurs personnes, un même lieu peut apparaître deux fois, écrit de deux façons. Trouvez les lieux d’une exportation de notes qui sont peut-être un seul lieu, et réunissez ceux de votre choix dans une copie.",
  },
  rule: {
    en: "The App suggests places with the same address under another name, and places with the same name, or a name one or two letters apart, when one has no address. Two different street addresses are always different places. It only suggests: you decide.",
    fr: `L’App propose les lieux ayant la même adresse sous un autre nom, et les lieux ayant le même nom, ou un nom différent d’une ou deux lettres, quand l’un n’a pas d’adresse. Deux adresses différentes sont toujours deux lieux différents. Elle ne fait que proposer${NB}: vous décidez.`,
  },
  privacy: {
    en: "Nothing is looked up or saved, and your file does not change: the joined notes go in a copy.",
    fr: `Rien n’est recherché ni enregistré, et votre fichier ne change pas${NB}: les notes réunies vont dans une copie.`,
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
  resultsTitle: { en: "Possible matches", fr: "Correspondances possibles" },
  none: { en: "No two places in this file look like one place by the App's rule.", fr: "Aucun couple de lieux de ce fichier ne semble être un seul lieu selon la règle de l’App." },
  group: { en: "Group", fr: "Groupe" },
  placesCaption: { en: "The places in group", fr: "Les lieux du groupe" },
  choiceLegend: { en: "What to do with group", fr: "Que faire du groupe" },
  keepApart: { en: "Keep them as separate places", fr: "Les garder comme des lieux distincts" },
  joinAs: { en: "Join them as", fr: "Les réunir sous" },
  joinTyped: { en: "Join them under a name I type", fr: "Les réunir sous un nom que je tape" },
  typedName: { en: "Name for group", fr: "Nom pour le groupe" },
  typedAddress: { en: "Address for group (optional)", fr: "Adresse pour le groupe (facultatif)" },
  typedHint: {
    en: "Used only when “Join them under a name I type” is chosen. No email address or phone number.",
    fr: `Utilisé seulement si «${NN}Les réunir sous un nom que je tape${NN}» est choisi. Aucune adresse courriel ni aucun numéro de téléphone.`,
  },
  problems: {
    "name-empty": { en: "Type a name.", fr: "Tapez un nom." },
    "name-long": { en: `Give a name of at most ${LIMITS.placeName} characters.`, fr: `Indiquez un nom d’au plus ${LIMITS.placeName}${NB}caractères.` },
    "name-control": { en: "Give the name on one line.", fr: "Indiquez le nom sur une seule ligne." },
    "address-long": { en: `Give an address of at most ${LIMITS.address} characters.`, fr: `Indiquez une adresse d’au plus ${LIMITS.address}${NB}caractères.` },
    "address-control": { en: "Give the address on one line.", fr: "Indiquez l’adresse sur une seule ligne." },
    personal: { en: "Leave out email addresses and phone numbers.", fr: "Retirez les adresses courriel et les numéros de téléphone." },
  },
  includeLegend: { en: "Places to join, in group", fr: "Lieux à réunir, dans le groupe" },
  includeHint: {
    en: "Untick a place that is not the same as the others; it stays as it is. The place whose name you keep is always joined.",
    fr: `Décochez un lieu qui n’est pas le même que les autres${NN}; il reste tel quel. Le lieu dont vous gardez le nom est toujours réuni.`,
  },
  tooFew: { en: "Leave at least two places ticked to join them.", fr: "Laissez au moins deux lieux cochés pour les réunir." },
  recordsCaption: { en: "What each place records, in group", fr: "Ce que chaque lieu note, dans le groupe" },
  downloadText: { en: "Download the groups to print", fr: "Télécharger les groupes à imprimer" },
  noAddress: { en: "no address", fr: "aucune adresse" },
  reasons: {
    "same-address": { en: "same address, another name", fr: "même adresse, autre nom" },
    "same-name": { en: "same name, one has no address", fr: "même nom, l’un sans adresse" },
    "similar-name": { en: "names a letter or two apart, one has no address", fr: "noms différents d’une ou deux lettres, l’un sans adresse" },
  },
  why: { en: "Why", fr: "Pourquoi" },
  joinNote: {
    en: "Joining gives these notes one name and address. Every record keeps its value, source, licence and date; where they disagree, the App shows reports that differ.",
    fr: `Réunir donne à ces notes un seul nom et une seule adresse. Chaque donnée garde sa valeur, sa source, sa licence et sa date${NN}; là où elles divergent, l’App montre des rapports divergents.`,
  },
  make: { en: "Make the copy", fr: "Créer la copie" },
  noneChosen: { en: "Choose a name to join under for at least one group.", fr: "Choisissez un nom sous lequel réunir au moins un groupe." },
  copyTitle: { en: "Copy with joined places", fr: "Copie avec les lieux réunis" },
  made: { en: "The copy is ready.", fr: "La copie est prête." },
  downloadCopy: { en: "Download the copy", fr: "Télécharger la copie" },
  copyHint: {
    en: "Bring the copy in with “Import notes”, or use it with the other file tools. Your file does not change.",
    fr: `Importez la copie avec «${NN}Importer des notes${NN}», ou utilisez-la avec les autres outils de fichiers. Votre fichier ne change pas.`,
  },
  downloadCsv: { en: "Download the groups (CSV)", fr: "Télécharger les groupes (CSV)" },
  columns: {
    place: { en: "Place", fr: "Lieu" },
    notes: { en: "Notes", fr: "Notes" },
    recorded: { en: "Details recorded", fr: "Détails notés" },
    newest: { en: "Newest record", fr: "Donnée la plus récente" },
  },
  noRecord: { en: "none", fr: "aucune" },
  errors: {
    empty: { en: "The box is empty. Paste the file’s text or open it.", fr: "La zone est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The file is too large to read here.", fr: "Le fichier est trop volumineux pour être lu ici." },
    "not-json": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-format": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-version": { en: "This export comes from a different version and cannot be read.", fr: "Cette exportation provient d’une autre version et ne peut pas être lue." },
    "no-notes": { en: "This file has no note the App can read.", fr: "Ce fichier ne contient aucune note lisible par l’App." },
  },
} as const;

export function sameErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_SAME_COPY.errors[e], l);
}

export function reasonText(r: SimilarReason, l: Locale): string {
  return t(FILE_SAME_COPY.reasons[r], l);
}

const count = (n: number, one: string, many: string, l: Locale): string => `${n} ${(l === "fr" ? n > 1 : n !== 1) ? many : one}`;

export function typedProblemText(p: TypedProblem, l: Locale): string {
  return t(FILE_SAME_COPY.problems[p], l);
}

/** A place's state for one detail, in the App's words: Yes, No, Reports differ or Unknown (UNKNOWN in French). */
export function stateText(p: Place, key: (typeof FACT_KEYS)[number], l: Locale): string {
  const r = p.resolutions[key];
  if (r.kind === "agree") return t(COPY.values[r.value], l);
  if (r.kind === "differ") return t(COPY.places.differ, l);
  return t(COPY.values.unknown, l);
}

/** The groups as text to print: each group's places with their answers, then why the App put them together. */
export function sameText(r: MatchReport, today: Date, l: Locale): string {
  const k = l === "fr" ? `${NB}:` : ":";
  const lines = [t(FILE_SAME_COPY.title, l), `${l === "fr" ? "Créé le" : "Made on"} ${today.toISOString().slice(0, 10)}`, "", matchSummary(r, l), ""];
  r.groups.forEach((g, i) => {
    const heading = groupHeading(i, g.places.length, l);
    lines.push(heading, "-".repeat(Math.min(heading.length, 72)));
    for (const p of g.places) lines.push(placeLabel(p, l), `  ${FACT_KEYS.map((key) => `${t(COPY.facts[key], l)}${k} ${stateText(p, key, l)}`).join(" · ")}`);
    lines.push(`${t(FILE_SAME_COPY.why, l)}${k}`, ...g.links.map((x) => `  - ${linkText(x, l)}`), "");
  });
  return `${lines.join("\n")}\n`;
}

/** "Library, 100 King St W" or "Library (no address)". */
export function placeLabel(p: Place, l: Locale): string {
  return p.address ? `${p.name}, ${p.address}` : `${p.name} (${t(FILE_SAME_COPY.noAddress, l)})`;
}

/** "Library and Library (no address): same name, one has no address". */
export function linkText(link: MatchLink, l: Locale): string {
  const and = l === "fr" ? "et" : "and";
  return `${placeLabel(link.a, l)} ${and} ${placeLabel(link.b, l)}${l === "fr" ? NB : ""}: ${reasonText(link.reason, l)}`;
}

/** "Group 2: 3 places". */
export function groupHeading(index: number, places: number, l: Locale): string {
  return `${t(FILE_SAME_COPY.group, l)} ${index + 1}${l === "fr" ? NB : ""}: ${l === "fr" ? count(places, "lieu", "lieux", l) : count(places, "place", "places", l)}`;
}

export function matchSummary(r: MatchReport, l: Locale): string {
  const inGroups = r.groups.reduce((n, g) => n + g.places.length, 0);
  const fr = l === "fr";
  const head = fr
    ? `${count(r.places, "lieu", "lieux", l)}${NB}: ${count(r.groups.length, "groupe", "groupes", l)} de lieux qui sont peut-être les mêmes, soit ${count(inGroups, "lieu", "lieux", l)}.`
    : `${count(r.places, "place", "places", l)}: ${count(r.groups.length, "group", "groups", l)} of places that may be the same, ${count(inGroups, "place", "places", l)} in all.`;
  if (r.over === 0) return head;
  return fr
    ? `${head} Les ${MAX_GROUPS}${NB}premiers sont affichés${NN}; ${count(r.over, "autre groupe est laissé", "autres groupes sont laissés", l)} de côté. Divisez le fichier pour les voir.`
    : `${head} The first ${MAX_GROUPS} are shown; ${count(r.over, "more group is", "more groups are", l)} left out. Split the file to see them.`;
}

export function copySummary(c: JoinedCopy, l: Locale): string {
  const fr = l === "fr";
  const head = fr
    ? `${count(c.groups, "groupe réuni", "groupes réunis", l)}${NB}: ${count(c.changed, "note a reçu", "notes ont reçu", l)} un autre nom ou une autre adresse.`
    : `${count(c.groups, "group", "groups", l)} joined: ${count(c.changed, "note was", "notes were", l)} given another name or address.`;
  const places = fr
    ? ` La copie compte ${count(c.placesAfter, "lieu", "lieux", l)} (${c.placesBefore} avant).`
    : ` The copy has ${count(c.placesAfter, "place", "places", l)} (${c.placesBefore} before).`;
  if (c.kept === 0) return `${head}${places}`;
  return fr
    ? `${head}${places} ${count(c.kept, "note n’a pas pu être changée et garde", "notes n’ont pas pu être changées et gardent", l)} ${c.kept > 1 ? "leurs" : "son"} nom et adresse.`
    : `${head}${places} ${count(c.kept, "note could not be changed and keeps its", "notes could not be changed and keep their", l)} name and address.`;
}

/** "Group 2: 3 places now Central Library, 100 King St W". */
export function joinedLine(j: JoinedCopy["joined"][number], l: Locale): string {
  const where = j.address ? `${j.name}, ${j.address}` : `${j.name} (${t(FILE_SAME_COPY.noAddress, l)})`;
  return l === "fr"
    ? `${t(FILE_SAME_COPY.group, l)} ${j.group}${NB}: ${count(j.places, "lieu", "lieux", l)} ${j.places > 1 ? "deviennent" : "devient"} ${where}`
    : `${t(FILE_SAME_COPY.group, l)} ${j.group}: ${count(j.places, "place", "places", l)} now ${where}`;
}

export function sameFilename(kind: "copy" | "csv" | "text", today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  if (kind === "text") return l === "fr" ? `lieux-peut-etre-les-memes-${day}.txt` : `places-that-may-be-the-same-${day}.txt`;
  if (kind === "csv") return l === "fr" ? `lieux-peut-etre-les-memes-${day}.csv` : `places-that-may-be-the-same-${day}.csv`;
  return l === "fr" ? `notes-lieux-reunis-${day}.json` : `notes-places-joined-${day}.json`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileSameStrings(): Array<[string, Pair]> {
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
  walk("fileSame", FILE_SAME_COPY);
  return out;
}
