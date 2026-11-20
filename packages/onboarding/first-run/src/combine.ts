import type { Locale } from "../../switch-first/src/index";
import type { AskRecord } from "./asked";
import { BIN_COPY, type BinEntry } from "./bin";
import type { Checklist, ChecklistEntry, PlaceChecklist } from "./checklist";
import { COPY, NB, NN, t, type Pair } from "./copy";
import { FACT_KEYS, type FactKey } from "./facts";
import { LIMITS, hasControlChars, type Note } from "./model";
import { looksLikeEmail, looksLikePhone } from "./form";
import type { NoteChange } from "./noteedit";
import { placeId, type Place } from "./places";
import { pairKey, similarReason, type SimilarReason } from "./similar";
import { placeLabel } from "./survey-copy";
import type { Visit } from "./visits";

/**
 * Combining two places that are really one: "Library, 1 Main St" and
 * "Library, 1 Main Street", say. Every note about either place is given the
 * one name and address the person chooses, and everything the App keeps by
 * place follows: the shortlist, the visit plan's answers, "Questions you
 * sent", "My visits" and the pairs marked "not the same".
 *
 * Nothing about the places' details changes: every record keeps its value,
 * source, licence and day, so where the two places' notes disagree they still
 * show as differing. Each renamed note gets a line in its corrections log.
 * Where both places have something only one can keep (two answers to the
 * same visit-plan question, or two "Questions you sent" records), the one
 * from the place whose name is kept stays, and the preview says so first.
 */
export interface CombineData {
  readonly notes: readonly Note[];
  readonly shortlist: readonly string[];
  readonly checklist: Checklist;
  readonly asked: readonly AskRecord[];
  readonly visits: readonly Visit[];
  readonly dismissed: readonly string[];
  /** Notes in "Recently removed", so one put back later lands on the combined place. Left out, nothing there changes. */
  readonly bin?: readonly BinEntry[];
}

export interface CombineChoice {
  readonly name: string;
  /** "" for no address. */
  readonly address: string;
}

export interface CombineSummary {
  readonly targetId: string;
  readonly target: { readonly placeName: string; readonly address: string | undefined };
  /** Notes whose name or address changes, and what changes. */
  readonly renamed: ReadonlyArray<{ readonly noteId: string; readonly changes: readonly NoteChange[] }>;
  readonly notesTotal: number;
  readonly shortlisted: boolean;
  readonly answersMoved: number;
  /** Visit-plan questions both places had answered differently: the kept place's answer stays. */
  readonly answerConflicts: readonly FactKey[];
  readonly askedMoved: boolean;
  /** Both places had a "Questions you sent" record: the kept place's stays. */
  readonly askedDropped: boolean;
  readonly visitsMoved: number;
  /** Notes in "Recently removed" given the new name and address too. */
  readonly binRenamed?: number;
}

export interface CombineResult {
  readonly data: CombineData;
  readonly summary: CombineSummary;
}

/** The names to choose from: each different spelling once, the first place's first. */
export function nameOptions(a: Place, b: Place): string[] {
  return a.name === b.name ? [a.name] : [a.name, b.name];
}

/** The addresses to choose from: each different one once, and "" (no address) when either place has none. */
export function addressOptions(a: Place, b: Place): string[] {
  const out: string[] = [];
  for (const v of [a.address ?? "", b.address ?? ""]) if (!out.includes(v)) out.push(v);
  return out;
}

export function defaultChoice(a: Place, b: Place): CombineChoice {
  // The address kept by default is a real one, when either place has one.
  const addresses = addressOptions(a, b);
  return { name: a.name, address: addresses.find((x) => x !== "") ?? "" };
}

/** True when the choice is one of the offered names and addresses. */
export function isValidChoice(a: Place, b: Place, c: CombineChoice): boolean {
  return nameOptions(a, b).includes(c.name) && addressOptions(a, b).includes(c.address);
}

const hasContent = (e: ChecklistEntry | undefined): e is ChecklistEntry => e !== undefined && (e.asked || e.answer.trim() !== "");

/** One place's visit-plan entries from two: the kept place's where it has one, the other's to fill gaps. */
export function mergeChecklist(kept: PlaceChecklist | undefined, other: PlaceChecklist | undefined): { merged: PlaceChecklist; moved: number; conflicts: FactKey[] } {
  const merged: Partial<Record<FactKey, ChecklistEntry>> = {};
  let moved = 0;
  const conflicts: FactKey[] = [];
  for (const k of FACT_KEYS) {
    const mine = kept?.[k];
    const theirs = other?.[k];
    if (hasContent(mine)) {
      merged[k] = mine;
      if (hasContent(theirs) && theirs.answer.trim() !== "" && mine.answer.trim() !== "" && theirs.answer.trim() !== mine.answer.trim()) conflicts.push(k);
      else if (hasContent(theirs) && mine.answer.trim() === "" && theirs.answer.trim() !== "") {
        // Kept place only ticked "asked"; the other place has the answer.
        merged[k] = { asked: mine.asked || theirs.asked, answer: theirs.answer };
        moved += 1;
      }
    } else if (hasContent(theirs)) {
      merged[k] = theirs;
      moved += 1;
    }
  }
  return { merged, moved, conflicts };
}

/** Other places that may be this one, as on "Possible matches", leaving out pairs marked not the same. */
export function maybeSame(place: Place, places: readonly Place[], dismissed: readonly string[]): Array<{ readonly other: Place; readonly reason: SimilarReason; readonly key: string }> {
  const out: Array<{ other: Place; reason: SimilarReason; key: string }> = [];
  for (const other of places) {
    if (other.id === place.id) continue;
    const reason = similarReason(place, other);
    const key = pairKey(place.id, other.id);
    if (reason && !dismissed.includes(key)) out.push({ other, reason, key });
  }
  return out.sort((x, y) => x.other.name.localeCompare(y.other.name) || x.key.localeCompare(y.key));
}

/** "Combine with Library, 1 Main St": names the other place, so each button says what it combines. */
export function combineWithLabel(other: Place, l: Locale): string {
  const label = placeLabel(other.name, other.address ?? "");
  return l === "fr" ? `Réunir avec ${label}` : `Combine with ${label}`;
}

export interface Target {
  readonly placeName: string;
  readonly address: string | undefined;
}

/**
 * The one engine behind combining, renaming and splitting: notes of the
 * `from` places (all of them, or only `onlyNotes` when splitting) take the
 * target's name and address. When whole places move, everything kept by
 * place follows them; `keptId` is the place whose things stay where only one
 * can. Nothing is saved; the same result is shown first and then saved.
 */
export function movePlaces(from: readonly string[], keptId: string, target: Target, data: CombineData, onlyNotes?: ReadonlySet<string>): CombineResult {
  const targetId = placeId(target);
  const ids = new Set(from);
  const otherIds = from.filter((id) => id !== keptId);

  const renamed: Array<{ noteId: string; changes: NoteChange[] }> = [];
  let notesTotal = 0;
  const notes = data.notes.map((n) => {
    if (!ids.has(placeId(n)) || (onlyNotes && !onlyNotes.has(n.id))) return n;
    notesTotal += 1;
    const changes: NoteChange[] = [];
    if (n.placeName !== target.placeName) changes.push({ part: "placeName", from: n.placeName, to: target.placeName });
    if ((n.address ?? "") !== (target.address ?? "")) changes.push({ part: "address", from: n.address ?? "", to: target.address ?? "" });
    if (changes.length === 0) return n;
    renamed.push({ noteId: n.id, changes });
    return { ...n, placeName: target.placeName, address: target.address };
  });
  // Removed notes of these places take the same name, so putting one back does not bring the old place back.
  let binRenamed = 0;
  const bin = data.bin?.map((e) => {
    if (!ids.has(placeId(e.note)) || (onlyNotes && !onlyNotes.has(e.note.id))) return e;
    if (e.note.placeName === target.placeName && (e.note.address ?? "") === (target.address ?? "")) return e;
    binRenamed += 1;
    return { ...e, note: { ...e.note, placeName: target.placeName, address: target.address } };
  });
  const summaryBase = { targetId, target, renamed, notesTotal, binRenamed };

  // Splitting moves notes only: lists, answers, questions and visits stay with the place they were about.
  if (onlyNotes) {
    return {
      data: { ...data, notes, ...(bin ? { bin } : {}) },
      summary: { ...summaryBase, shortlisted: false, answersMoved: 0, answerConflicts: [], askedMoved: false, askedDropped: false, visitsMoved: 0 },
    };
  }

  const shortlist: string[] = [];
  for (const id of data.shortlist) {
    const next = ids.has(id) ? targetId : id;
    if (!shortlist.includes(next)) shortlist.push(next);
  }

  let { merged, moved, conflicts } = mergeChecklist(data.checklist[keptId], undefined);
  for (const other of otherIds) {
    const r = mergeChecklist(merged, data.checklist[other]);
    merged = r.merged;
    moved += r.moved;
    conflicts = [...conflicts, ...r.conflicts.filter((k) => !conflicts.includes(k))];
  }
  const checklist: Record<string, PlaceChecklist> = {};
  for (const [id, entries] of Object.entries(data.checklist)) if (!ids.has(id)) checklist[id] = entries;
  if (Object.keys(merged).length > 0) checklist[targetId] = merged;

  const keptAsk = data.asked.find((r) => r.id === keptId);
  const otherAsks = data.asked.filter((r) => otherIds.includes(r.id));
  const ask = keptAsk ?? otherAsks[0];
  const asked = data.asked.filter((r) => !ids.has(r.id));
  if (ask) asked.push({ ...ask, id: targetId, placeName: target.placeName, address: target.address ?? "" });

  let visitsMoved = 0;
  const visits = data.visits.map((v) => {
    if (!ids.has(v.placeId)) return v;
    if (v.placeId !== targetId || v.placeName !== target.placeName || v.address !== target.address) visitsMoved += 1;
    return { ...v, placeId: targetId, placeName: target.placeName, address: target.address };
  });

  const dismissed: string[] = [];
  for (const key of data.dismissed) {
    const [x, y] = key.split("|");
    if (!x || !y) continue;
    const nx = ids.has(x) ? targetId : x;
    const ny = ids.has(y) ? targetId : y;
    if (nx === ny) continue;
    const k = pairKey(nx, ny);
    if (!dismissed.includes(k)) dismissed.push(k);
  }

  return {
    data: { notes, shortlist, checklist, asked, visits, dismissed, ...(bin ? { bin } : {}) },
    summary: {
      ...summaryBase,
      shortlisted: data.shortlist.some((id) => ids.has(id)),
      answersMoved: moved,
      answerConflicts: conflicts,
      askedMoved: ask !== undefined && ask.id !== targetId,
      askedDropped: (keptAsk ? 1 : 0) + otherAsks.length > 1,
      visitsMoved,
    },
  };
}

/** Two places made one, with the name and address chosen. `a` and `b` must be different places. */
export function combinePlaces(a: Place, b: Place, choice: CombineChoice, data: CombineData): CombineResult {
  const target = { placeName: choice.name, address: choice.address === "" ? undefined : choice.address };
  const keptId = choice.name === a.name ? a.id : b.id;
  return movePlaces([a.id, b.id], keptId, target, data);
}

/** The place already in the notes under the target's name and address, other than `except`. */
export function placeAt(target: Target, places: readonly Place[], except: readonly string[]): Place | undefined {
  const id = placeId(target);
  return except.includes(id) ? undefined : places.find((p) => p.id === id);
}

/**
 * A place given a new name or address. When another place in the notes
 * already has that name and address, the two become one, as when combining.
 */
export function renamePlace(a: Place, target: Target, data: CombineData, places: readonly Place[]): CombineResult & { readonly joins: Place | undefined } {
  const joins = placeAt(target, places, [a.id]);
  return { ...movePlaces(joins ? [a.id, joins.id] : [a.id], a.id, target, data), joins };
}

/** Some of a place's notes moved to another name or address; the place keeps its other notes and everything kept by place. */
export function splitPlace(a: Place, noteIds: ReadonlySet<string>, target: Target, data: CombineData, places: readonly Place[]): CombineResult & { readonly joins: Place | undefined } {
  return { ...movePlaces([a.id], a.id, target, data, noteIds), joins: placeAt(target, places, [a.id]) };
}

export type PlaceTextError = "name-required" | "name-too-long" | "address-too-long" | "control-chars" | "personal-email" | "personal-phone" | "unchanged";

/** Problems with a typed name and address, the same rules as the note form's. */
export function checkTarget(name: string, address: string, current?: Target): PlaceTextError[] {
  const errors: PlaceTextError[] = [];
  const n = name.trim();
  const a = address.trim();
  if (n === "") errors.push("name-required");
  else if (n.length > LIMITS.placeName) errors.push("name-too-long");
  if (a.length > LIMITS.address) errors.push("address-too-long");
  if (hasControlChars(n) || hasControlChars(a)) errors.push("control-chars");
  if (looksLikeEmail(n) || looksLikeEmail(a)) errors.push("personal-email");
  if (looksLikePhone(n)) errors.push("personal-phone");
  if (errors.length === 0 && current && current.placeName === n && (current.address ?? "") === a) errors.push("unchanged");
  return errors;
}

/** The target from typed text: trimmed, with no address when the box is empty. */
export function targetOf(name: string, address: string): Target {
  return { placeName: name.trim(), address: address.trim() === "" ? undefined : address.trim() };
}

// ---- Words ----

export const COMBINE_COPY = {
  open: { en: "Combine these two places", fr: "Réunir ces deux lieux" },
  title: { en: "Combine two places", fr: "Réunir deux lieux" },
  intro: {
    en: "Use this when two places in your notes are really one. Every note about either gets the name and address you choose. No detail changes: every record keeps its value, source, licence and day.",
    fr: "Utilisez ceci quand deux lieux de vos notes n’en font qu’un. Chaque note sur l’un ou l’autre prend le nom et l’adresse que vous choisissez. Aucun détail ne change\u00A0: chaque donnée garde sa valeur, sa source, sa licence et son jour.",
  },
  first: { en: "First place", fr: "Premier lieu" },
  second: { en: "Second place", fr: "Deuxième lieu" },
  nameLegend: { en: "Name to keep", fr: "Nom à garder" },
  addressLegend: { en: "Address to keep", fr: "Adresse à garder" },
  noAddress: { en: "No address", fr: "Aucune adresse" },
  previewTitle: { en: "What will change", fr: "Ce qui va changer" },
  nothingRenamed: { en: "Every note already has this name and address.", fr: "Chaque note a déjà ce nom et cette adresse." },
  shortlisted: { en: "The shortlist will hold the combined place once.", fr: "La liste restreinte contiendra le lieu réuni une seule fois." },
  askedDropped: {
    en: "Both places are in “Questions you sent”. The record of the place whose name you keep stays; the other one is removed.",
    fr: "Les deux lieux sont dans «\u202FQuestions envoyées\u202F». La fiche du lieu dont vous gardez le nom reste\u202F; l’autre est retirée.",
  },
  askedMoved: { en: "Its record in “Questions you sent” will follow.", fr: "Sa fiche dans «\u202FQuestions envoyées\u202F» suivra." },
  combine: { en: "Combine the two places", fr: "Réunir les deux lieux" },
  done: { en: "The two places were combined.", fr: "Les deux lieux ont été réunis." },
  undone: { en: "The two places are separate again.", fr: "Les deux lieux sont de nouveau séparés." },
  undo: { en: "Undo combining the two places", fr: "Annuler la réunion des deux lieux" },
  unavailable: { en: "This browser did not keep the change. Nothing was combined.", fr: "Ce navigateur n’a pas gardé le changement. Rien n’a été réuni." },
  gone: { en: "One of these places is no longer in your notes.", fr: "L’un de ces lieux n’est plus dans vos notes." },
  back: { en: "Back to possible matches", fr: "Retour aux lieux peut-être identiques" },
  maybeTitle: { en: "This may be the same place as", fr: "Ce lieu est peut-être le même que" },
} as const satisfies Record<string, Pair>;

const quote = (s: string, l: Locale): string => (l === "fr" ? `«${NN}${s}${NN}»` : `“${s}”`);

/** The preview, one sentence each, the things only one place can keep first. */
export function summaryLines(s: CombineSummary, l: Locale): string[] {
  const fr = l === "fr";
  const lines: string[] = [];
  for (const k of s.answerConflicts) {
    lines.push(
      fr
        ? `Les deux lieux ont une réponse différente à une question du plan de visite (${t(COPY.facts[k], l)})${NB}: la réponse du lieu dont vous gardez le nom reste.`
        : `Both places have a different answer to a visit-plan question (${t(COPY.facts[k], l)}): the answer of the place whose name you keep stays.`,
    );
  }
  if (s.askedDropped) lines.push(t(COMBINE_COPY.askedDropped, l));
  const label = quote(placeLabel(s.target.placeName, s.target.address ?? ""), l);
  const n = s.renamed.length;
  lines.push(
    n === 0
      ? t(COMBINE_COPY.nothingRenamed, l)
      : fr
        ? `${n} note${n > 1 ? "s" : ""} sur ${s.notesTotal} ${n > 1 ? "prendront" : "prendra"} le nom ${label}.`
        : `${n} of ${s.notesTotal} note${s.notesTotal === 1 ? "" : "s"} will be named ${label}.`,
  );
  if (s.shortlisted) lines.push(t(COMBINE_COPY.shortlisted, l));
  if (s.answersMoved > 0) lines.push(fr ? `${s.answersMoved} réponse${s.answersMoved > 1 ? "s" : ""} du plan de visite suivr${s.answersMoved > 1 ? "ont" : "a"}.` : `${s.answersMoved} visit-plan answer${s.answersMoved === 1 ? "" : "s"} will follow.`);
  if (s.askedMoved && !s.askedDropped) lines.push(t(COMBINE_COPY.askedMoved, l));
  const binN = s.binRenamed ?? 0;
  if (binN > 0) lines.push(fr ? `${binN} note${binN > 1 ? "s" : ""} de ${quote(t(BIN_COPY.title, l), l)} ${binN > 1 ? "prendront" : "prendra"} aussi ce nom.` : `${binN} note${binN === 1 ? "" : "s"} in ${quote(t(BIN_COPY.title, l), l)} will take this name too.`);
  if (s.visitsMoved > 0) lines.push(fr ? `${s.visitsMoved} visite${s.visitsMoved > 1 ? "s" : ""} suivr${s.visitsMoved > 1 ? "ont" : "a"}.` : `${s.visitsMoved} visit${s.visitsMoved === 1 ? "" : "s"} will follow.`);
  return lines;
}

export const RENAME_COPY = {
  open: { en: "Change this place’s name or address", fr: "Modifier le nom ou l’adresse de ce lieu" },
  title: { en: "Change a place’s name or address", fr: "Modifier le nom ou l’adresse d’un lieu" },
  intro: {
    en: "Every note about this place takes the new name and address. No detail changes: every record keeps its value, source, licence and day.",
    fr: "Chaque note sur ce lieu prend le nouveau nom et la nouvelle adresse. Aucun détail ne change\u00A0: chaque donnée garde sa valeur, sa source, sa licence et son jour.",
  },
  nameLabel: { en: "Name", fr: "Nom" },
  addressLabel: { en: "Address (optional)", fr: "Adresse (facultative)" },
  preview: { en: "Look at what would change", fr: "Voir ce qui changerait" },
  save: { en: "Save the new name and address", fr: "Enregistrer le nouveau nom et la nouvelle adresse" },
  joins: {
    en: "Your notes already have a place with this name and address: the two will become one.",
    fr: "Vos notes ont déjà un lieu avec ce nom et cette adresse\u00A0: les deux n’en feront plus qu’un.",
  },
  changed: { en: "What you typed changed since you looked. Here is what it would do now.", fr: "Ce que vous avez tapé a changé depuis votre aperçu. Voici ce que cela ferait maintenant." },
  done: { en: "The place’s name and address were changed.", fr: "Le nom et l’adresse du lieu ont été modifiés." },
  undo: { en: "Undo the change of name and address", fr: "Annuler la modification du nom et de l’adresse" },
  undone: { en: "The place has its old name and address again.", fr: "Le lieu a de nouveau son ancien nom et son ancienne adresse." },
  errorsTitle: { en: "Fix this first", fr: "Corrigez d’abord ceci" },
  back: { en: "Back to the place", fr: "Retour au lieu" },
} as const satisfies Record<string, Pair>;

export const SPLIT_COPY = {
  open: { en: "Move some notes to another place", fr: "Déplacer des notes vers un autre lieu" },
  title: { en: "Move notes to another place", fr: "Déplacer des notes vers un autre lieu" },
  intro: {
    en: "Use this when some notes about this place are really about another one. Choose the notes, then the name and address they should have. Your shortlist, visit plan, questions and visits stay with this place.",
    fr: "Utilisez ceci quand certaines notes sur ce lieu portent en fait sur un autre. Choisissez les notes, puis le nom et l’adresse qu’elles doivent avoir. Votre liste restreinte, votre plan de visite, vos questions et vos visites restent avec ce lieu.",
  },
  notesLegend: { en: "Notes to move", fr: "Notes à déplacer" },
  noDetails: { en: "No Yes or No in this note.", fr: "Aucun Oui ni Non dans cette note." },
  save: { en: "Move the chosen notes", fr: "Déplacer les notes choisies" },
  joins: {
    en: "Your notes already have a place with this name and address: the notes will join it.",
    fr: "Vos notes ont déjà un lieu avec ce nom et cette adresse\u00A0: les notes le rejoindront.",
  },
  done: { en: "The notes were moved.", fr: "Les notes ont été déplacées." },
  undo: { en: "Undo moving the notes", fr: "Annuler le déplacement des notes" },
  undone: { en: "The notes are back with their place.", fr: "Les notes sont de nouveau avec leur lieu." },
} as const satisfies Record<string, Pair>;

export type SplitError = "none-chosen" | "all-chosen";

export const SPLIT_ERRORS: Readonly<Record<SplitError, Pair>> = {
  "none-chosen": { en: "Choose at least one note to move.", fr: "Choisissez au moins une note à déplacer." },
  "all-chosen": {
    en: "Leave at least one note here. To move them all, change the place’s name or address instead.",
    fr: "Laissez au moins une note ici. Pour toutes les déplacer, modifiez plutôt le nom ou l’adresse du lieu.",
  },
};

export const PLACE_TEXT_ERRORS: Readonly<Record<PlaceTextError, Pair>> = {
  "name-required": { en: "Write the place’s name.", fr: "Écrivez le nom du lieu." },
  "name-too-long": { en: "The name can be up to 120 characters.", fr: "Le nom peut compter jusqu’à 120 caractères." },
  "address-too-long": { en: "The address can be up to 200 characters.", fr: "L’adresse peut compter jusqu’à 200 caractères." },
  "control-chars": { en: "It contains a character that cannot be kept.", fr: "Elle contient un caractère qui ne peut pas être gardé." },
  "personal-email": { en: "Leave out email addresses: notes are about places.", fr: "N’indiquez pas d’adresse courriel\u00A0: les notes portent sur des lieux." },
  "personal-phone": { en: "Leave out phone numbers from the name.", fr: "N’indiquez pas de numéro de téléphone dans le nom." },
  unchanged: { en: "This is already the place’s name and address.", fr: "C’est déjà le nom et l’adresse du lieu." },
};

/** Which choices a split can go ahead with: some notes, not all of them. */
export function checkSplit(chosen: number, total: number): SplitError | undefined {
  if (chosen === 0) return "none-chosen";
  if (chosen >= total) return "all-chosen";
  return undefined;
}

export function combineStrings(): Array<[string, Pair]> {
  return [
    ...Object.entries(COMBINE_COPY).map(([k, p]): [string, Pair] => [`combine.${k}`, p]),
    ...Object.entries(RENAME_COPY).map(([k, p]): [string, Pair] => [`rename.${k}`, p]),
    ...Object.entries(SPLIT_COPY).map(([k, p]): [string, Pair] => [`split.${k}`, p]),
    ...Object.entries(SPLIT_ERRORS).map(([k, p]): [string, Pair] => [`split.error.${k}`, p]),
    ...Object.entries(PLACE_TEXT_ERRORS).map(([k, p]): [string, Pair] => [`rename.error.${k}`, p]),
  ];
}
