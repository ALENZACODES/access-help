import type { Locale } from "../../switch-first/src/index";
import { NB, NN, type Pair } from "./copy";
import { exportNotes } from "./exchange";
import { CONTRIBUTOR_SOURCE } from "./facts";
import type { Note } from "./model";
import { placeId } from "./places";

/**
 * "Share some notes": a file with only the notes the person picks, for a friend,
 * a family member or a support worker, who brings it in with the App's usual
 * notes import. The file is the App's own notes format, so every note keeps
 * its source, licence and date.
 *
 * The person's own extra text on a note can be personal, so it is left out
 * unless the person asks for it. Nothing is sent: the person carries the file.
 */
export const SHARE_COPY = {
  open: { en: "Share some notes", fr: "Partager certaines notes" },
  title: { en: "Share some notes", fr: "Partager certaines notes" },
  intro: {
    en: "Pick the notes to share, for example the places for one trip. The App makes a file with only those notes; the other person brings it in with “Import notes”.",
    fr: `Choisissez les notes à partager, par exemple les lieux d’un voyage. L’App crée un fichier avec ces notes seulement${NN}; l’autre personne l’importe avec «${NN}Importer des notes${NN}».`,
  },
  sendsNothing: {
    en: "Nothing is sent: you give the file to the person yourself. Each note keeps its source, licence and date.",
    fr: `Rien n’est envoyé${NB}: vous remettez vous-même le fichier à la personne. Chaque note garde sa source, sa licence et sa date.`,
  },
  filterLabel: { en: "Show notes whose place contains", fr: "Afficher les notes dont le lieu contient" },
  pickLegend: { en: "Notes to share", fr: "Notes à partager" },
  all: { en: "Pick all notes shown", fr: "Choisir toutes les notes affichées" },
  none: { en: "Unpick all notes", fr: "Ne choisir aucune note" },
  noneShown: { en: "No note matches.", fr: "Aucune note ne correspond." },
  textChoice: { en: "Include my extra text on each note", fr: "Inclure mon texte supplémentaire sur chaque note" },
  textHint: {
    en: "Your extra text can be personal, so it is left out unless you choose it.",
    fr: `Votre texte supplémentaire peut être personnel${NB}: il est donc laissé de côté sauf si vous le choisissez.`,
  },
  download: { en: "Download the picked notes", fr: "Télécharger les notes choisies" },
  pickFirst: { en: "Pick at least one note to share.", fr: "Choisissez au moins une note à partager." },
  fromOthers: {
    en: "Some picked notes come from other sources. Their source and licence go with them.",
    fr: "Certaines notes choisies viennent d’autres sources. Leur source et leur licence les accompagnent.",
  },
  back: { en: "Back to my notes", fr: "Retour à mes notes" },
  show: { en: "Show", fr: "Afficher" },
  shortlist: { en: "Pick the notes for my shortlist", fr: "Choisir les notes de ma présélection" },
} as const satisfies Record<string, Pair>;

/** The notes whose place name or address contains the words typed, case and accents ignored. */
export function filterNotes(notes: readonly Note[], query: string): Note[] {
  const fold = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const q = fold(query.trim());
  if (q === "") return [...notes];
  return notes.filter((n) => fold(`${n.placeName} ${n.address ?? ""}`).includes(q));
}

/** Adds or removes ids, keeping the notes' order. */
export function pick(selected: readonly string[], ids: readonly string[], on: boolean, notes: readonly Note[]): string[] {
  const set = new Set(selected);
  for (const id of ids) {
    if (on) set.add(id);
    else set.delete(id);
  }
  return notes.filter((n) => set.has(n.id)).map((n) => n.id);
}

/** The notes as shared: picked ones only, in the notes' order, with the extra text left out unless asked. */
export function sharedNotes(notes: readonly Note[], picked: readonly string[], withText: boolean): Note[] {
  const set = new Set(picked);
  return notes
    .filter((n) => set.has(n.id))
    .map((n) => {
      if (withText || n.note === undefined) return n;
      const { note: _text, ...rest } = n;
      return rest as Note;
    });
}

/** The ids of notes about places on the shortlist, in the notes' order. */
export function shortlistNoteIds(notes: readonly Note[], shortlist: readonly string[]): string[] {
  const set = new Set(shortlist);
  return notes.filter((n) => set.has(placeId(n))).map((n) => n.id);
}

/** True when a shared note has any Yes or No from a source other than the person's own reports. */
export function hasOtherSources(notes: readonly Note[]): boolean {
  return notes.some((n) => n.facts.some((f) => f.provenance !== undefined && f.provenance.source !== CONTRIBUTOR_SOURCE));
}

/** The file's text, in the App's own notes format. */
export function shareText(notes: readonly Note[], picked: readonly string[], withText: boolean, today: Date): string {
  return exportNotes(sharedNotes(notes, picked, withText), today.toISOString().slice(0, 10));
}

/** "shared-notes-2026-11-20-3.json": the date and how many notes, so two shares are told apart. */
export function shareFilename(today: Date, count: number): string {
  return `shared-notes-${today.toISOString().slice(0, 10)}-${count}.json`;
}

/** How many places the picked notes are about. */
export function placesCount(notes: readonly Note[], picked: readonly string[]): number {
  const set = new Set(picked);
  return new Set(notes.filter((n) => set.has(n.id)).map((n) => placeId(n))).size;
}

/** "3 notes picked, about 2 places". */
export function pickedText(notes: number, places: number, l: Locale): string {
  if (l === "fr") return `${notes} ${notes > 1 ? "notes choisies" : "note choisie"}, sur ${places} ${places > 1 ? "lieux" : "lieu"}`;
  return `${notes} ${notes === 1 ? "note" : "notes"} picked, about ${places} ${places === 1 ? "place" : "places"}`;
}

/** The checkbox name for one note: its place and the day it was added, so two notes on one place are told apart. */
export function pickLabel(n: Note, l: Locale): string {
  const where = n.address ? `${n.placeName}, ${n.address}` : n.placeName;
  return l === "fr" ? `${where} (ajoutée le ${n.createdOn})` : `${where} (added ${n.createdOn})`;
}

export function shareStrings(): Array<[string, Pair]> {
  return Object.entries(SHARE_COPY).map(([k, p]): [string, Pair] => [`share.${k}`, p]);
}
