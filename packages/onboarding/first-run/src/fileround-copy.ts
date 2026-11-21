import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import type { FactKey } from "./facts";
import { FILE_STREETS_COPY } from "./filestreets-copy";
import type { Resolution } from "./places";
import { roundCounts, type Answer, type Change, type ChangeKind, type Round, type RoundResult, type RoundSettings, type SettingsProblem } from "./visitrecord";

/**
 * Words for "Record what you found on a round", in English and French. French
 * copy uses ’, U+00A0 before ":" and U+202F before ; ! ? and inside « ». A
 * detail with no record is the token UNKNOWN in French.
 */
export const FILE_ROUND_COPY = {
  title: { en: "Record what you found on a round", fr: "Noter ce que vous avez constaté lors d’une tournée" },
  intro: {
    en: "After visiting the places in a notes file, say what you found for each detail you looked at. You get a new notes file to add to the App or share.",
    fr: "Après avoir visité les lieux d’un fichier de notes, indiquez ce que vous avez constaté pour chaque détail regardé. Vous obtenez un nouveau fichier de notes à ajouter à l’App ou à partager.",
  },
  rule: {
    en: "Only say Yes or No for what you saw yourself on the visit. Anything left as Not checked stays Unknown.",
    fr: "N’indiquez Oui ou Non que pour ce que vous avez vu vous-même lors de la visite. Tout ce qui reste à Pas regardé reste UNKNOWN.",
  },
  privacy: {
    en: "Nothing is looked up, nothing is saved and nothing is sent anywhere. What you enter is gone when you leave this page, unless you download it.",
    fr: "Rien n’est recherché, enregistré ni envoyé. Ce que vous saisissez disparaît quand vous quittez cette page, à moins de le télécharger.",
  },
  pasteLabel: { en: "Text of the notes file", fr: "Texte du fichier de notes" },
  pasteHint: {
    en: "A notes export is made with “Export notes” on the Notes page.",
    fr: `Une exportation de notes se crée avec «${NN}Exporter les notes${NN}» sur la page Notes.`,
  },
  openLabel: { en: "Or open the file from this device", fr: "Ou ouvrez le fichier depuis cet appareil" },
  read: { en: "Start the round", fr: "Commencer la tournée" },
  clear: { en: "Remove the file and what you entered", fr: "Retirer le fichier et ce que vous avez saisi" },
  cleared: { en: "The page is empty. Nothing was saved.", fr: "La page est vide. Rien n’a été enregistré." },
  opened: { en: "The file is in the box. Choose Start the round when ready.", fr: "Le fichier est dans la zone. Choisissez Commencer la tournée quand vous êtes prêt." },
  readFailed: { en: "That file could not be opened. Try pasting its text instead.", fr: "Ce fichier n’a pas pu être ouvert. Essayez plutôt de coller son texte." },
  errorsTitle: { en: "Fix this first", fr: "À corriger d’abord" },
  askLegend: { en: "Details to ask about at each place", fr: "Détails à demander pour chaque lieu" },
  askFor: {
    open: { en: "Only details with no record or with reports that differ", fr: "Seulement les détails sans donnée ou aux rapports divergents" },
    all: { en: "Every detail", fr: "Tous les détails" },
  },
  askUpdate: { en: "Show these details", fr: "Afficher ces détails" },
  settingsTitle: { en: "About your visits", fr: "À propos de vos visites" },
  visitedOnLabel: { en: "Day of the visits", fr: "Jour des visites" },
  visitedOnHint: { en: "Year-month-day, for example 2026-11-20. Not after today.", fr: "Année-mois-jour, par exemple 2026-11-20. Pas après aujourd’hui." },
  sourceLabel: { en: "Source", fr: "Source" },
  sourceHint: {
    en: "Who saw it, for example Contributor report or the name of your group. It is written on every Yes and No.",
    fr: "Qui l’a vu, par exemple Contributor report ou le nom de votre groupe. Elle est inscrite sur chaque Oui et chaque Non.",
  },
  licenceLabel: { en: "Licence for what you record", fr: "Licence de ce que vous notez" },
  licenceHint: { en: "An open licence lets others reuse the notes.", fr: "Une licence ouverte permet à d’autres de réutiliser les notes." },
  placesTitle: { en: "Places on the round", fr: "Lieux de la tournée" },
  nothingToAsk: { en: "Every detail here has a record.", fr: "Chaque détail a ici une donnée." },
  answers: {
    yes: { en: "Yes", fr: "Oui" },
    no: { en: "No", fr: "Non" },
    skip: { en: "Not checked", fr: "Pas regardé" },
  },
  inFile: { en: "In the file now", fr: "Dans le fichier maintenant" },
  reportsDiffer: { en: "Reports differ", fr: "Rapports divergents" },
  noteLabel: { en: "Note about this place (optional)", fr: "Note sur ce lieu (facultatif)" },
  noAddress: { en: "No address", fr: "Aucune adresse" },
  make: { en: "Make the notes file", fr: "Créer le fichier de notes" },
  problems: {
    date: { en: "Give the day as year-month-day, for example 2026-11-20.", fr: "Indiquez le jour sous la forme année-mois-jour, par exemple 2026-11-20." },
    future: { en: "The day of the visits cannot be after today.", fr: "Le jour des visites ne peut pas être après aujourd’hui." },
    source: { en: "Give a source of 1 to 120 characters on one line.", fr: "Indiquez une source de 1 à 120 caractères sur une ligne." },
    licence: { en: "Choose an open licence from the list.", fr: "Choisissez une licence ouverte dans la liste." },
    "note-long": { en: "This note is longer than 500 characters.", fr: "Cette note dépasse 500 caractères." },
    "note-control": { en: "This note holds characters the App cannot keep.", fr: "Cette note contient des caractères que l’App ne peut pas garder." },
    empty: { en: "Nothing is recorded yet. Choose Yes or No for a detail you looked at, or write a note.", fr: "Rien n’est encore noté. Choisissez Oui ou Non pour un détail regardé, ou écrivez une note." },
  },
  resultTitle: { en: "Your new notes", fr: "Vos nouvelles notes" },
  downloadOnly: { en: "Download only the new notes", fr: "Télécharger seulement les nouvelles notes" },
  downloadWith: { en: "Download the file with the new notes added", fr: "Télécharger le fichier avec les nouvelles notes ajoutées" },
  keptHint: {
    en: "The notes already in the file are not changed. Where a new answer and an older one differ, the App shows that the reports differ.",
    fr: "Les notes déjà présentes dans le fichier ne changent pas. Là où une nouvelle réponse et une plus ancienne diffèrent, l’App indique que les rapports divergent.",
  },
  changesTitle: { en: "What the new notes say", fr: "Ce que disent les nouvelles notes" },
  downloadCsv: { en: "Download the answers as a spreadsheet (CSV)", fr: "Télécharger les réponses en tableur (CSV)" },
  downloadReport: { en: "Download a report of the round to print or share", fr: "Télécharger un compte rendu de la tournée à imprimer ou partager" },
  reportHeading: { en: "Round of visits", fr: "Tournée de visites" },
  reportDay: { en: "Day of the visits", fr: "Jour des visites" },
  reportSource: { en: "Source", fr: "Source" },
  reportLicence: { en: "Licence", fr: "Licence" },
  reportMade: { en: "Made on", fr: "Créé le" },
  reportNoteLabel: { en: "Note", fr: "Remarque" },
  reportNothing: { en: "Only a note was written for this place.", fr: "Seule une note a été écrite pour ce lieu." },
  kinds: {
    new: { en: "no record before", fr: "aucune donnée avant" },
    same: { en: "the same as the file", fr: "comme dans le fichier" },
    different: { en: "differs from the file, so the reports will differ", fr: "diffère du fichier, donc les rapports divergeront" },
    differ: { en: "the file’s reports already differ", fr: "les rapports du fichier divergent déjà" },
  },
  edited: { en: "You changed an answer. Make the notes file again to include it.", fr: "Vous avez changé une réponse. Créez de nouveau le fichier de notes pour l’inclure." },
  errors: {
    empty: { en: "The box is empty. Paste the file’s text or open it.", fr: "La zone est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The file is too large to read here.", fr: "Le fichier est trop volumineux pour être lu ici." },
    "not-json": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-format": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-version": { en: "This export comes from a different version and cannot be read.", fr: "Cette exportation provient d’une autre version et ne peut pas être lue." },
    "no-notes": { en: "This file has no note the App can read.", fr: "Ce fichier ne contient aucune note lisible par l’App." },
  },
} as const;

export function roundErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_ROUND_COPY.errors[e], l);
}

export function problemText(code: SettingsProblem | "note-long" | "note-control" | "empty", l: Locale): string {
  return t(FILE_ROUND_COPY.problems[code], l);
}

export function answerText(a: Answer, l: Locale): string {
  return t(FILE_ROUND_COPY.answers[a], l);
}

export function factName(k: FactKey, l: Locale): string {
  return t(COPY.facts[k], l);
}

/** What the file says now about a detail: "Unknown", "Yes (2 reports)", "Reports differ". */
export function inFileText(r: Resolution, l: Locale): string {
  if (r.kind === "unknown") return t(COPY.values.unknown, l);
  if (r.kind === "differ") return t(FILE_ROUND_COPY.reportsDiffer, l);
  const n = r.observations.length;
  const reports = l === "fr" ? `${n} ${n > 1 ? "rapports" : "rapport"}` : `${n} ${n === 1 ? "report" : "reports"}`;
  return `${t(COPY.values[r.value], l)} (${reports})`;
}

/** "In the file now: Unknown". */
export function inFileLine(r: Resolution, l: Locale): string {
  return `${t(FILE_ROUND_COPY.inFile, l)}${l === "fr" ? NB : ""}: ${inFileText(r, l)}`;
}

const placesCount = (n: number, l: Locale): string => (l === "fr" ? `${n} ${n > 1 ? "lieux" : "lieu"}` : `${n} ${n === 1 ? "place" : "places"}`);
const detailsCount = (n: number, l: Locale): string => (l === "fr" ? `${n} ${n > 1 ? "détails" : "détail"}` : `${n} ${n === 1 ? "detail" : "details"}`);

/** "12 places on the round, 30 details to ask about." plus what was left off. */
export function roundSummary(round: Round, l: Locale): string {
  const asked = round.places.reduce((n, rp) => n + rp.ask.length, 0);
  const parts = [
    l === "fr" ? `${placesCount(round.places.length, l)} dans la tournée, ${detailsCount(asked, l)} à demander.` : `${placesCount(round.places.length, l)} on the round, ${detailsCount(asked, l)} to ask about.`,
  ];
  if (round.leftOutDone > 0)
    parts.push(
      l === "fr"
        ? `${placesCount(round.leftOutDone, l)} où chaque détail a une donnée ${round.leftOutDone > 1 ? "sont laissés" : "est laissé"} de côté.`
        : `${placesCount(round.leftOutDone, l)} where every detail has a record ${round.leftOutDone === 1 ? "is" : "are"} left off.`,
    );
  if (round.over > 0)
    parts.push(
      l === "fr"
        ? `Le fichier compte ${placesCount(round.over, l)} de plus que ce qu’une tournée peut contenir${NN}; divisez-le avec «${NN}Diviser un fichier de notes${NN}» pour les noter.`
        : `The file has ${placesCount(round.over, l)} more than fit on one round; split it with “Split a notes file” to record them.`,
    );
  return parts.join(" ");
}

/** "3 new notes: 5 Yes, 2 No. 4 details stay Unknown." */
export function resultSummary(result: RoundResult, l: Locale): string {
  const c = roundCounts(result);
  const notes = l === "fr" ? `${c.notes} ${c.notes > 1 ? "nouvelles notes" : "nouvelle note"}` : `${c.notes} new ${c.notes === 1 ? "note" : "notes"}`;
  const k = l === "fr" ? `${NB}:` : ":";
  const main = `${notes}${k} ${c.yes} ${t(COPY.values.yes, l)}, ${c.no} ${t(COPY.values.no, l)}.`;
  if (c.notChecked === 0) return main;
  const stay =
    l === "fr"
      ? `${detailsCount(c.notChecked, l)} ${c.notChecked > 1 ? "restent" : "reste"} UNKNOWN.`
      : `${detailsCount(c.notChecked, l)} ${c.notChecked === 1 ? "stays" : "stay"} Unknown.`;
  return `${main} ${stay}`;
}

export function kindText(k: ChangeKind, l: Locale): string {
  return t(FILE_ROUND_COPY.kinds[k], l);
}

/** "Elevator: Yes (no record before)". The place's name is shown beside it as the person's own text. */
export function changeText(c: Change, l: Locale): string {
  return `${factName(c.key, l)}${l === "fr" ? NB : ""}: ${t(COPY.values[c.value], l)} (${kindText(c.kind, l)})`;
}

/** The changes, place by place, in the round's order. */
export function changesByPlace(result: RoundResult): Array<{ placeId: string; name: string; address: string | undefined; changes: Change[] }> {
  const out: Array<{ placeId: string; name: string; address: string | undefined; changes: Change[] }> = [];
  for (const c of result.changes) {
    const last = out[out.length - 1];
    if (last && last.placeId === c.place.id) last.changes.push(c);
    else out.push({ placeId: c.place.id, name: c.place.name, address: c.place.address, changes: [c] });
  }
  return out;
}

/**
 * The round as text to print or share: the day, source and licence, then each
 * place with a new note, its answers and how they sit beside the file, and
 * its note.
 */
export function roundReport(result: RoundResult, s: RoundSettings, l: Locale, today: Date): string {
  const k = l === "fr" ? `${NB}:` : ":";
  const C = FILE_ROUND_COPY;
  const lines: string[] = [
    t(C.reportHeading, l),
    `${t(C.reportDay, l)}${k} ${s.visitedOn.trim()}`,
    `${t(C.reportSource, l)}${k} ${s.source.trim()}`,
    `${t(C.reportLicence, l)}${k} ${s.licence}`,
    `${t(C.reportMade, l)} ${today.toISOString().slice(0, 10)}`,
    resultSummary(result, l),
    t(C.keptHint, l),
    "",
  ];
  for (const n of result.notes) {
    lines.push(n.placeName, `    ${addressText(n.address, l)}`);
    const answers = result.changes.filter((c) => c.noteId === n.id);
    for (const c of answers) lines.push(`    ${changeText(c, l)}`);
    if (answers.length === 0) lines.push(`    ${t(C.reportNothing, l)}`);
    if (n.note !== undefined) lines.push(`    ${t(C.reportNoteLabel, l)}${k} ${n.note.replace(/\s*\n\s*/g, " ")}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

export function roundFilename(kind: "only" | "with" | "csv" | "report", today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  if (kind === "csv") return l === "fr" ? `reponses-de-tournee-${day}.csv` : `round-answers-${day}.csv`;
  if (kind === "report") return l === "fr" ? `compte-rendu-de-tournee-${day}.txt` : `round-report-${day}.txt`;
  if (kind === "only") return l === "fr" ? `notes-de-tournee-${day}.json` : `round-notes-${day}.json`;
  return l === "fr" ? `notes-avec-tournee-${day}.json` : `notes-with-round-${day}.json`;
}

/** The address of a place, or "No address". */
export function addressText(address: string | undefined, l: Locale): string {
  return address ?? t(FILE_STREETS_COPY.noAddress, l);
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileRoundStrings(): Array<[string, Pair]> {
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
  walk("fileRound", FILE_ROUND_COPY);
  return out;
}
