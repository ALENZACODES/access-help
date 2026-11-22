import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import type { FactKey } from "./facts";
import type { FillCheck, FillPlace, FillPlan, Filled } from "./fillgaps";
import type { Note } from "./model";
import { sourceName } from "./sources";

/**
 * Words for "Fill gaps from another file", in English and French. French copy
 * uses ’, U+00A0 before ":" and U+202F before ; ! ? and inside « ».
 */
export const FILE_GAPS_COPY = {
  title: { en: "Fill gaps from another file", fr: "Combler les manques avec un autre fichier" },
  intro: {
    en: "From a second notes file, bring into a copy of yours only the notes about places already in your file that answer a detail it has no record for.",
    fr: "À partir d’un second fichier de notes, ajoutez à une copie du vôtre seulement les notes sur des lieux déjà dans votre fichier qui répondent à un détail sans donnée.",
  },
  rule: {
    en: "Notes come in whole and as they were, with their own source, licence and dates. Your notes stay as they were, and no new place is added. The copy is read back before you can download it.",
    fr: "Les notes arrivent entières et telles quelles, avec leur propre source, licence et dates. Vos notes restent telles quelles, et aucun nouveau lieu n’est ajouté. La copie est relue avant que vous puissiez la télécharger.",
  },
  privacy: {
    en: "Nothing is looked up or saved, and neither file changes.",
    fr: "Rien n’est recherché ni enregistré, et aucun des deux fichiers ne change.",
  },
  mineLabel: { en: "Text of your notes file", fr: "Texte de votre fichier de notes" },
  otherLabel: { en: "Text of the file to fill gaps from", fr: "Texte du fichier qui sert à combler les manques" },
  pasteHint: {
    en: "A notes export is made with “Export notes” on the Notes page.",
    fr: `Une exportation de notes se crée avec «${NN}Exporter les notes${NN}» sur la page Notes.`,
  },
  mineOpen: { en: "Or open your file from this device", fr: "Ou ouvrez votre fichier depuis cet appareil" },
  otherOpen: { en: "Or open that file from this device", fr: "Ou ouvrez ce fichier depuis cet appareil" },
  read: { en: "Read both files", fr: "Lire les deux fichiers" },
  clear: { en: "Remove both files from the page", fr: "Retirer les deux fichiers de la page" },
  cleared: { en: "The page is empty. Nothing was saved.", fr: "La page est vide. Rien n’a été enregistré." },
  opened: { en: "The file is in the box. Choose Read both files when ready.", fr: "Le fichier est dans la zone. Choisissez Lire les deux fichiers quand vous êtes prêt." },
  readFailed: { en: "That file could not be opened. Try pasting its text instead.", fr: "Ce fichier n’a pas pu être ouvert. Essayez plutôt de coller son texte." },
  errorsTitle: { en: "Fix this first", fr: "À corriger d’abord" },
  mine: { en: "Your file", fr: "Votre fichier" },
  other: { en: "The other file", fr: "L’autre fichier" },
  optionsTitle: { en: "Gaps to fill", fr: "Manques à combler" },
  keysLegend: { en: "Details", fr: "Détails" },
  onlyGapsLabel: { en: "Bring in only notes whose every record answers a gap", fr: "N’ajouter que les notes dont chaque donnée répond à un manque" },
  onlyGapsHint: {
    en: "A note comes in whole. Leave this ticked so that no detail that already has an answer gains a record.",
    fr: "Une note arrive entière. Laissez cette case cochée pour qu’aucun détail ayant déjà une réponse ne reçoive de donnée.",
  },
  sinceLabel: { en: "Only records made on or after (optional)", fr: "Seulement les données de ce jour ou après (facultatif)" },
  sinceHint: {
    en: "A day written as year-month-day, such as 2026-01-31. Leave it empty to bring in records of any day.",
    fr: "Un jour écrit année-mois-jour, par exemple 2026-01-31. Laissez vide pour ajouter des données de tous les jours.",
  },
  badSince: { en: "Write the day as year-month-day, such as 2026-01-31.", fr: "Écrivez le jour sous la forme année-mois-jour, par exemple 2026-01-31." },
  find: { en: "Find answers for the gaps", fr: "Trouver des réponses aux manques" },
  noKeys: { en: "Tick at least one detail.", fr: "Cochez au moins un détail." },
  resultsTitle: { en: "Answers for the gaps", fr: "Réponses aux manques" },
  none: { en: "No note in the other file answers a gap in your file.", fr: "Aucune note de l’autre fichier ne répond à un manque de votre fichier." },
  placesLegend: { en: "Places to fill", fr: "Lieux à compléter" },
  noAddress: { en: "No address", fr: "Aucune adresse" },
  noneTicked: { en: "Tick at least one place.", fr: "Cochez au moins un lieu." },
  addNone: { en: "Add the notes of the ticked places to a copy of your file", fr: "Ajouter les notes des lieux cochés à une copie de votre fichier" },
  copyTitle: { en: "The copy", fr: "La copie" },
  checkOk: {
    en: "The copy was read back as the App would read it: every note is there and unchanged, no place is new, and every gap filled now has an answer.",
    fr: `La copie a été relue comme l’App la lirait${NB}: chaque note y figure sans changement, aucun lieu n’est nouveau, et chaque manque comblé a maintenant une réponse.`,
  },
  checkFailed: {
    en: "The copy could not be read back as expected, so it is not offered. Your file has not changed.",
    fr: "La copie n’a pas pu être relue comme prévu, elle n’est donc pas proposée. Votre fichier n’a pas changé.",
  },
  downloadCopy: { en: "Download the copy", fr: "Télécharger la copie" },
  downloadCsv: { en: "Download the notes added as a table (CSV)", fr: "Télécharger les notes ajoutées en tableau (CSV)" },
  tickAll: { en: "Tick every place", fr: "Cocher tous les lieux" },
  untickAll: { en: "Untick every place", fr: "Décocher tous les lieux" },
  noRecords: { en: "No record: every detail is Unknown.", fr: "Aucune donnée, chaque détail est UNKNOWN." },
  downloadList: { en: "Download the list of notes added (text)", fr: "Télécharger la liste des notes ajoutées (texte)" },
  changed: {
    en: "The choice changed, so the copy was put away. Add the notes again to make a new one.",
    fr: "Le choix a changé, la copie a donc été rangée. Ajoutez de nouveau les notes pour en créer une nouvelle.",
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

export type Box = "mine" | "other";

export function gapsErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_GAPS_COPY.errors[e], l);
}

/** "Your file: This text is not a notes export." — the error summary names the box. */
export function boxErrorText(box: Box, e: ImportError | "no-notes", l: Locale): string {
  return `${t(FILE_GAPS_COPY[box], l)}${l === "fr" ? `${NB}:` : ":"} ${gapsErrorText(e, l)}`;
}

const count = (n: number, one: string, many: string, l: Locale): string => `${n} ${(l === "fr" ? n > 1 : n !== 1) ? many : one}`;
const quote = (s: string, l: Locale): string => (l === "fr" ? `«${NN}${s}${NN}»` : `“${s}”`);
const notes = (n: number, l: Locale): string => count(n, "note", "notes", l);
const facts = (keys: readonly FactKey[], l: Locale): string => keys.map((k) => t(COPY.facts[k], l)).join(", ");

/** "Café A, 1 A St" or "Kiosk, No address". */
export function placeLine(p: FillPlace, l: Locale): string {
  return `${p.place.name}, ${p.place.address ?? t(FILE_GAPS_COPY.noAddress, l)}`;
}

/** "9 places can gain 15 answers from 12 notes." */
export function planSummary(plan: FillPlan, l: Locale): string {
  if (plan.places.length === 0) return t(FILE_GAPS_COPY.none, l);
  const n = plan.places.reduce((s, p) => s + p.notes.length, 0);
  const gaps = plan.places.reduce((s, p) => s + p.fills.length, 0);
  if (l === "fr") return `${count(plan.places.length, "lieu peut", "lieux peuvent", l)} recevoir ${count(gaps, "réponse", "réponses", l)} grâce à ${notes(n, l)}.`;
  return `${count(plan.places.length, "place", "places", l)} can gain ${count(gaps, "answer", "answers", l)} from ${notes(n, l)}.`;
}

/** "Left out: 40 notes about places not in your file, 3 that answer no gap …", or "" when nothing was left out. */
export function leftOutText(plan: FillPlan, l: Locale): string {
  const fr = l === "fr";
  const parts = [
    plan.otherPlaces > 0 ? (fr ? `${notes(plan.otherPlaces, l)} sur des lieux absents de votre fichier` : `${notes(plan.otherPlaces, l)} about places not in your file`) : "",
    plan.nothingMissing > 0 ? (fr ? `${plan.nothingMissing} qui ne ${plan.nothingMissing > 1 ? "répondent" : "répond"} à aucun manque` : `${plan.nothingMissing} that answer no gap`) : "",
    plan.alreadyIn > 0 ? (fr ? `${plan.alreadyIn} déjà dans votre fichier` : `${plan.alreadyIn} already in your file`) : "",
    plan.sameId > 0 ? (fr ? `${plan.sameId} avec l’identifiant d’une de vos notes` : `${plan.sameId} with the id of one of your notes`) : "",
    plan.alsoOther > 0 ? (fr ? `${plan.alsoOther} qui ${plan.alsoOther > 1 ? "répondent" : "répond"} aussi à un autre détail` : `${plan.alsoOther} that also answer another detail`) : "",
    plan.older > 0 ? (fr ? `${plan.older} avec une donnée plus ancienne que le jour choisi` : `${plan.older} with a record older than the day chosen`) : "",
  ].filter((x) => x !== "");
  if (parts.length === 0) return "";
  return fr ? `Laissées de côté${NB}: ${parts.join(", ")}.` : `Left out: ${parts.join(", ")}.`;
}

/** "Add 2 notes to “Café A, 1 A St”": the tick box's label. */
export function placeLabel(p: FillPlace, l: Locale): string {
  return l === "fr" ? `Ajouter ${notes(p.notes.length, l)} à ${quote(placeLine(p, l), l)}` : `Add ${notes(p.notes.length, l)} to ${quote(placeLine(p, l), l)}`;
}

/** "Fills: Elevator, Automatic door." and the other details the notes add a record to, if any. */
export function placeDetail(p: FillPlace, l: Locale): string {
  const k = l === "fr" ? `${NB}:` : ":";
  const fills = `${l === "fr" ? "Comble" : "Fills"}${k} ${facts(p.fills, l)}.`;
  if (p.also.length === 0) return fills;
  return `${fills} ${l === "fr" ? "Ajoute aussi une donnée à" : "Also adds a record to"}${k} ${facts(p.also, l)}.`;
}

/** "Show the notes for “Café, 1 A St” (2)": the name of a place's disclosure. */
export function showNotesLabel(p: FillPlace, l: Locale): string {
  return l === "fr" ? `Afficher les notes pour ${quote(placeLine(p, l), l)} (${p.notes.length})` : `Show the notes for ${quote(placeLine(p, l), l)} (${p.notes.length})`;
}

/** "Note made on 2026-10-01", with its text when it has some: the text comes in with the note. */
export function noteHeading(n: Note, l: Locale): string {
  const head = l === "fr" ? `Note créée le ${n.createdOn}` : `Note made on ${n.createdOn}`;
  if (!n.note) return head;
  return l === "fr" ? `${head}. Texte${NB}: ${quote(n.note, l)}` : `${head}. Text: ${quote(n.note, l)}`;
}

/** Each record of a note in the App's detail order: "Elevator: Yes (Visit, 2026-10-01)". */
export function recordLines(n: Note, l: Locale): string[] {
  const k = l === "fr" ? `${NB}:` : ":";
  const lines = n.facts.flatMap((f) =>
    f.value === "unknown" || !f.provenance ? [] : [`${t(COPY.facts[f.key], l)}${k} ${t(COPY.values[f.value], l)} (${sourceName(f.provenance.source, l)}, ${f.provenance.recordedOn})`],
  );
  return lines.length > 0 ? lines : [t(FILE_GAPS_COPY.noRecords, l)];
}

/** "2 places ticked: 3 notes to add." or "No place is ticked." */
export function tickedText(places: readonly FillPlace[], l: Locale): string {
  if (places.length === 0) return l === "fr" ? "Aucun lieu n’est coché." : "No place is ticked.";
  const n = places.reduce((s, p) => s + p.notes.length, 0);
  if (l === "fr") return `${count(places.length, "lieu coché", "lieux cochés", l)}${NB}: ${count(n, "note à ajouter", "notes à ajouter", l)}.`;
  return `${count(places.length, "place", "places", l)} ticked: ${notes(n, l)} to add.`;
}

/** "Add 3 notes to a copy of your file". */
export function addLabel(n: number, l: Locale): string {
  if (n === 0) return t(FILE_GAPS_COPY.addNone, l);
  return l === "fr" ? `Ajouter ${notes(n, l)} à une copie de votre fichier` : `Add ${notes(n, l)} to a copy of your file`;
}

/** "3 notes added; 4 gaps now have an answer; 43 notes in all." */
export function filledSummary(f: Filled, c: FillCheck & { ok: true }, l: Locale): string {
  if (l === "fr")
    return `${count(f.added.length, "note ajoutée", "notes ajoutées", l)}${NN}; ${count(c.filled, "manque a", "manques ont", l)} maintenant une réponse${NN}; ${notes(c.notes, l)} en tout.`;
  return `${count(f.added.length, "note", "notes", l)} added; ${count(c.filled, "gap now has", "gaps now have", l)} an answer; ${notes(c.notes, l)} in all.`;
}

export function checkText(c: FillCheck, l: Locale): string {
  return t(c.ok ? FILE_GAPS_COPY.checkOk : FILE_GAPS_COPY.checkFailed, l);
}

/** The notes added, place by place, as plain text to keep with the copy. */
export function filledText(f: Filled, today: Date, l: Locale): string {
  const lines = [t(FILE_GAPS_COPY.resultsTitle, l), today.toISOString().slice(0, 10), "", t(FILE_GAPS_COPY.rule, l), ""];
  for (const p of f.places) {
    lines.push(`- ${placeLine(p, l)}`);
    lines.push(`    ${placeDetail(p, l)}`);
    for (const x of p.notes) {
      const src = [...new Set(x.note.facts.flatMap((fa) => (fa.provenance && fa.value !== "unknown" ? [sourceName(fa.provenance.source, l)] : [])))].join(", ");
      lines.push(`    ${l === "fr" ? `Note créée le ${x.note.createdOn} (${src})` : `Note made on ${x.note.createdOn} (${src})`}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

/** File names for the copy and the list, with the number of notes added. */
export function gapsFilename(kind: "copy" | "list" | "csv", n: number, today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  const what = l === "fr" ? `${n}-${n > 1 ? "notes-ajoutees" : "note-ajoutee"}` : `${n}-${n === 1 ? "note" : "notes"}-added`;
  if (kind === "copy") return `notes-${what}-${day}.json`;
  if (kind === "csv") return l === "fr" ? `tableau-${what}-${day}.csv` : `table-${what}-${day}.csv`;
  return l === "fr" ? `liste-${what}-${day}.txt` : `list-${what}-${day}.txt`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileGapsStrings(): Array<[string, Pair]> {
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
  walk("fileGaps", FILE_GAPS_COPY);
  return out;
}
