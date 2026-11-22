import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import type { Note } from "./model";
import { sourceName } from "./sources";
import type { RepeatCheck, RepeatGroup, RepeatRemoval } from "./repeatnotes";

/**
 * Words for "Remove repeated notes", in English and French. French copy uses
 * ’, U+00A0 before ":" and U+202F before ; ! ? and inside « ».
 */
export const FILE_REPEAT_COPY = {
  title: { en: "Remove repeated notes", fr: "Retirer les notes répétées" },
  intro: {
    en: "Find notes that say exactly the same thing as another note about the same place, as happens when a file is combined with itself, and take the repeats out of a copy.",
    fr: "Trouvez les notes qui disent exactement la même chose qu’une autre note sur le même lieu, comme quand un fichier est réuni avec lui-même, et retirez les répétitions d’une copie.",
  },
  rule: {
    en: "Notes are repeats only when the place, the note text and every record (answer, source, licence and date) are the same. The oldest note of each group is kept, and every place gives the same answers as before. The copy is read back before you can download it.",
    fr: "Des notes sont des répétitions seulement si le lieu, le texte de la note et chaque donnée (réponse, source, licence et date) sont les mêmes. La note la plus ancienne de chaque groupe est gardée, et chaque lieu donne les mêmes réponses qu’avant. La copie est relue avant que vous puissiez la télécharger.",
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
  optionsTitle: { en: "Which notes count as repeats", fr: "Quelles notes comptent comme répétitions" },
  anyDayLabel: { en: "Also count notes made on different days as repeats", fr: "Compter aussi comme répétitions des notes créées à des jours différents" },
  anyDayHint: {
    en: "Leave this off if the same thing may have been found on two visits: two reports that agree say more than one.",
    fr: `Laissez cette case décochée si la même chose a pu être constatée lors de deux visites${NB}: deux rapports concordants en disent plus qu’un seul.`,
  },
  withinLabel: {
    en: "Also take out notes with no text whose records are all in a fuller note about the same place",
    fr: "Retirer aussi les notes sans texte dont toutes les données figurent dans une note plus complète sur le même lieu",
  },
  withinHint: {
    en: "Such a note adds nothing the fuller note does not hold. The fuller note is kept.",
    fr: "Une telle note n’ajoute rien que la note plus complète ne contienne déjà. La note plus complète est gardée.",
  },
  find: { en: "Find repeated notes", fr: "Trouver les notes répétées" },
  resultsTitle: { en: "Repeated notes", fr: "Notes répétées" },
  none: { en: "No note repeats another one.", fr: "Aucune note n’en répète une autre." },
  groupsLegend: { en: "Groups to take the repeats out of", fr: "Groupes dont retirer les répétitions" },
  noAddress: { en: "No address", fr: "Aucune adresse" },
  kept: { en: "Kept", fr: "Gardée" },
  takenOut: { en: "Taken out", fr: "Retirée" },
  noRecords: { en: "No record: every detail is Unknown.", fr: "Aucune donnée, chaque détail est UNKNOWN." },
  removeNone: { en: "Remove the ticked repeats from the copy", fr: "Retirer les répétitions cochées de la copie" },
  problems: {
    none: { en: "Tick at least one group to remove its repeats.", fr: "Cochez au moins un groupe pour en retirer les répétitions." },
  },
  copyTitle: { en: "The copy", fr: "La copie" },
  checkOk: {
    en: "The copy was read back as the App would read it: every note kept is there and unchanged, and every place gives the same answers as before.",
    fr: `La copie a été relue comme l’App la lirait${NB}: chaque note gardée y figure sans changement, et chaque lieu donne les mêmes réponses qu’avant.`,
  },
  checkFailed: {
    en: "The copy could not be read back as expected, so it is not offered. Your file has not changed.",
    fr: "La copie n’a pas pu être relue comme prévu, elle n’est donc pas proposée. Votre fichier n’a pas changé.",
  },
  downloadCopy: { en: "Download the copy", fr: "Télécharger la copie" },
  downloadRemoved: { en: "Download the repeats taken out", fr: "Télécharger les répétitions retirées" },
  downloadCsv: { en: "Download the repeats as a table (CSV)", fr: "Télécharger les répétitions en tableau (CSV)" },
  tickAll: { en: "Tick every group", fr: "Cocher tous les groupes" },
  untickAll: { en: "Untick every group", fr: "Décocher tous les groupes" },
  downloadList: { en: "Download the list of repeats (text)", fr: "Télécharger la liste des répétitions (texte)" },
  changed: {
    en: "The choice changed, so the copy was put away. Remove the repeats again to make a new one.",
    fr: "Le choix a changé, la copie a donc été rangée. Retirez de nouveau les répétitions pour en créer une nouvelle.",
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

export function repeatErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_REPEAT_COPY.errors[e], l);
}

const count = (n: number, one: string, many: string, l: Locale): string => `${n} ${(l === "fr" ? n > 1 : n !== 1) ? many : one}`;
const quote = (s: string, l: Locale): string => (l === "fr" ? `«${NN}${s}${NN}»` : `“${s}”`);
const records = (n: number, l: Locale): string => count(n, l === "fr" ? "donnée" : "record", l === "fr" ? "données" : "records", l);

/** "Café A, 10 King St W" or "Kiosk, No address". */
export function groupPlace(g: RepeatGroup, l: Locale): string {
  return `${g.kept.placeName}, ${g.kept.address ?? t(FILE_REPEAT_COPY.noAddress, l)}`;
}

/** "Remove the 2 repeats of “Café A, 10 King St W”": the tick box's label. */
export function groupLabel(g: RepeatGroup, l: Locale): string {
  const n = g.repeats.length;
  const place = quote(groupPlace(g, l), l);
  if (g.kind === "within") {
    if (l === "fr") return n === 1 ? `Retirer la note contenue dans une note plus complète sur ${place}` : `Retirer les ${n} notes contenues dans une note plus complète sur ${place}`;
    return n === 1 ? `Remove the note held in a fuller note about ${place}` : `Remove the ${n} notes held in a fuller note about ${place}`;
  }
  if (l === "fr") return n === 1 ? `Retirer la répétition de ${place}` : `Retirer les ${n} répétitions de ${place}`;
  return n === 1 ? `Remove the repeat of ${place}` : `Remove the ${n} repeats of ${place}`;
}

/** "Made on 2026-10-01. Each holds 2 records." or, across days, "Made on 2026-10-01 and 2026-11-02 …". */
export function groupDetail(g: RepeatGroup, l: Locale): string {
  const days = [...new Set([g.kept, ...g.repeats].map((n) => n.createdOn))].sort();
  const held = g.kept.facts.filter((f) => f.value !== "unknown").length;
  const join = (xs: string[]): string => (xs.length < 2 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} ${l === "fr" ? "et" : "and"} ${xs.at(-1) ?? ""}`);
  const text = g.kept.note ? (l === "fr" ? ` Texte${NB}: ${quote(g.kept.note, l)}.` : ` Text: ${quote(g.kept.note, l)}.`) : "";
  if (g.kind === "within") {
    const most = Math.max(...g.repeats.map((n) => n.facts.filter((f) => f.value !== "unknown").length));
    if (l === "fr")
      return `Chaque donnée des notes retirées (${records(most, l)} au plus) figure dans la note gardée, créée le ${g.kept.createdOn}, qui en contient ${held}.${text}`;
    return `Every record in the notes taken out (${records(most, l)} at most) is in the note kept, made on ${g.kept.createdOn}, which holds ${records(held, l)}.${text}`;
  }
  if (l === "fr") return `Créées le ${join(days)}. Chacune contient ${records(held, l)}.${text} La plus ancienne est gardée.`;
  return `Made on ${join(days)}. Each holds ${records(held, l)}.${text} The oldest is kept.`;
}

/** "Show the notes about “Café A, 10 King St W” (3)": the name of a group's disclosure. */
export function showNotesLabel(g: RepeatGroup, l: Locale): string {
  const n = g.repeats.length + 1;
  return l === "fr" ? `Afficher les notes sur ${quote(groupPlace(g, l), l)} (${n})` : `Show the notes about ${quote(groupPlace(g, l), l)} (${n})`;
}

/** "Kept: made on 2026-10-01" or "Taken out: made on 2026-11-02". */
export function noteHeading(n: Note, kept: boolean, l: Locale): string {
  const what = t(kept ? FILE_REPEAT_COPY.kept : FILE_REPEAT_COPY.takenOut, l);
  return l === "fr" ? `${what}${NB}: créée le ${n.createdOn}` : `${what}: made on ${n.createdOn}`;
}

/** Each record of a note in the App's detail order: "Elevator: Yes (City survey, 2026-10-01)". */
export function recordLines(n: Note, l: Locale): string[] {
  const k = l === "fr" ? `${NB}:` : ":";
  const lines = n.facts.flatMap((f) =>
    f.value === "unknown" || !f.provenance
      ? []
      : [`${t(COPY.facts[f.key], l)}${k} ${t(COPY.values[f.value], l)} (${sourceName(f.provenance.source, l)}, ${f.provenance.recordedOn})`],
  );
  return lines.length > 0 ? lines : [t(FILE_REPEAT_COPY.noRecords, l)];
}

/** "3 groups of repeated notes: 5 notes repeat another one." */
export function foundSummary(groups: readonly RepeatGroup[], l: Locale): string {
  if (groups.length === 0) return t(FILE_REPEAT_COPY.none, l);
  const n = groups.reduce((s, g) => s + g.repeats.length, 0);
  if (l === "fr")
    return `${count(groups.length, "groupe", "groupes", l)} de notes répétées${NB}: ${count(n, "note en répète", "notes en répètent", l)} une autre.`;
  return `${count(groups.length, "group", "groups", l)} of repeated notes: ${count(n, "note repeats", "notes repeat", l)} another one.`;
}

/** "2 groups ticked: 3 notes to take out." or "No group is ticked." */
export function tickedText(groups: readonly RepeatGroup[], l: Locale): string {
  if (groups.length === 0) return l === "fr" ? "Aucun groupe n’est coché." : "No group is ticked.";
  const n = groups.reduce((s, g) => s + g.repeats.length, 0);
  if (l === "fr") return `${count(groups.length, "groupe coché", "groupes cochés", l)}${NB}: ${count(n, "note à retirer", "notes à retirer", l)}.`;
  return `${count(groups.length, "group", "groups", l)} ticked: ${count(n, "note", "notes", l)} to take out.`;
}

/** "Remove 3 repeated notes from the copy". */
export function removeLabel(n: number, l: Locale): string {
  if (n === 0) return t(FILE_REPEAT_COPY.removeNone, l);
  return l === "fr" ? `Retirer ${count(n, "note répétée", "notes répétées", l)} de la copie` : `Remove ${count(n, "repeated note", "repeated notes", l)} from the copy`;
}

/** "3 repeated notes taken out; 40 notes kept." */
export function removalSummary(r: RepeatRemoval, l: Locale): string {
  if (l === "fr")
    return `${count(r.removed.length, "note répétée retirée", "notes répétées retirées", l)}${NN}; ${count(r.kept.length, "note gardée", "notes gardées", l)}.`;
  return `${count(r.removed.length, "repeated note", "repeated notes", l)} taken out; ${count(r.kept.length, "note", "notes", l)} kept.`;
}

export function checkText(c: RepeatCheck, l: Locale): string {
  return t(c.ok ? FILE_REPEAT_COPY.checkOk : FILE_REPEAT_COPY.checkFailed, l);
}

/** The repeats taken out, as plain text to keep with the copy. */
export function repeatsText(r: RepeatRemoval, today: Date, l: Locale): string {
  const lines = [t(FILE_REPEAT_COPY.resultsTitle, l), today.toISOString().slice(0, 10), "", t(FILE_REPEAT_COPY.rule, l), "", removalSummary(r, l), ""];
  for (const g of r.groups) {
    lines.push(`- ${groupPlace(g, l)}`);
    lines.push(`    ${groupDetail(g, l)}`);
    const n = g.repeats.length;
    lines.push(`    ${l === "fr" ? `${count(n, "répétition retirée", "répétitions retirées", l)}` : `${count(n, "repeat", "repeats", l)} taken out`}`);
  }
  return `${lines.join("\n")}\n`;
}

/** File names for the copy, the repeats taken out and the list. */
export function repeatFilename(kind: "copy" | "removed" | "list" | "csv", n: number, today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  const what = l === "fr" ? `${n}-${n > 1 ? "repetitions" : "repetition"}` : `${n}-${n === 1 ? "repeat" : "repeats"}`;
  if (kind === "copy") return l === "fr" ? `notes-sans-${what}-${day}.json` : `notes-without-${what}-${day}.json`;
  if (kind === "removed") return l === "fr" ? `notes-retirees-${what}-${day}.json` : `notes-taken-out-${what}-${day}.json`;
  if (kind === "csv") return l === "fr" ? `tableau-${what}-${day}.csv` : `table-${what}-${day}.csv`;
  return l === "fr" ? `liste-${what}-${day}.txt` : `list-${what}-${day}.txt`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileRepeatStrings(): Array<[string, Pair]> {
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
  walk("fileRepeat", FILE_REPEAT_COPY);
  return out;
}
