import type { Locale } from "../../switch-first/src/index";
import { NB, NN, type Pair } from "./copy";
import { isIsoDate } from "./facts";
import { isoDate } from "./form";
import { LIMITS, parseNote, type Note } from "./model";
import type { KeyValueStore } from "./store";

/**
 * "Recently removed". Removing a note moves it here, on this device only, for
 * 30 days; it can be put back unchanged or removed for good. Nothing in it is
 * counted in the places list, the filters or any page: a removed note says
 * nothing about a place until it is put back.
 */
export const BIN_KEY = "app.onboarding.bin.v1";
export const BIN_DAYS = 30;
export const MAX_BIN = 50;

export interface BinEntry {
  readonly note: Note;
  readonly removedOn: string;
}

export const BIN_COPY = {
  title: { en: "Recently removed", fr: "Retirées récemment" },
  intro: {
    en: "Notes you removed stay here for 30 days, on this device only. They are not counted anywhere until you put them back.",
    fr: "Les notes retirées restent ici 30 jours, sur cet appareil seulement. Elles ne comptent nulle part tant que vous ne les remettez pas.",
  },
  none: { en: "Nothing was removed in the last 30 days.", fr: "Rien n’a été retiré dans les 30 derniers jours." },
  moved: {
    en: "The note was moved to Recently removed. You can put it back for 30 days.",
    fr: "La note a été déplacée dans Retirées récemment. Vous pouvez la remettre pendant 30 jours.",
  },
  restored: { en: "The note was put back", fr: "La note a été remise" },
  deleted: { en: "The note was removed for good", fr: "La note a été retirée définitivement" },
  emptied: { en: "Recently removed is now empty.", fr: "Retirées récemment est maintenant vide." },
  kept: { en: "Nothing was removed for good.", fr: "Rien n’a été retiré définitivement." },
  full: { en: "Your notes are full. Remove a note before putting this one back.", fr: "Vos notes sont pleines. Retirez une note avant de remettre celle-ci." },
  exists: { en: "A note with the same id is already in your notes.", fr: "Une note avec le même identifiant est déjà dans vos notes." },
  confirmDelete: {
    en: "Remove this note for good? It cannot be put back afterwards.",
    fr: `Retirer cette note définitivement${NN}? Elle ne pourra plus être remise ensuite.`,
  },
  empty: { en: "Remove everything here for good", fr: "Tout retirer définitivement" },
  confirmEmpty: {
    en: "Remove every note here for good? They cannot be put back afterwards.",
    fr: `Retirer définitivement toutes les notes d’ici${NN}? Elles ne pourront plus être remises ensuite.`,
  },
  yesEmpty: { en: "Yes, remove them all for good", fr: "Oui, tout retirer définitivement" },
  no: { en: "No, keep them", fr: "Non, les garder" },
  open: { en: "Recently removed", fr: "Retirées récemment" },
  back: { en: "Back to my notes", fr: "Retour à mes notes" },
  undo: { en: "Undo: put the note back", fr: `Annuler${NB}: remettre la note` },
  deviceTitle: { en: "Recently removed notes", fr: "Notes retirées récemment" },
  deviceWhat: {
    en: "Notes you removed in the last 30 days, kept so you can put them back.",
    fr: "Les notes retirées dans les 30 derniers jours, gardées pour pouvoir les remettre.",
  },
} as const satisfies Record<string, Pair>;

function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

function todayNumber(today: Date): number {
  return Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) / 86_400_000;
}

/** Days left before an entry goes for good: 30 on the day it was removed, 1 on its last day, never below 0. */
export function daysLeft(e: BinEntry, today: Date): number {
  return Math.max(0, BIN_DAYS - (todayNumber(today) - dayNumber(e.removedOn)));
}

/** Drops entries older than 30 days. */
export function expireBin(bin: readonly BinEntry[], today: Date): BinEntry[] {
  return bin.filter((e) => daysLeft(e, today) > 0);
}

/** Moves a note into the bin, newest first. The same note removed again replaces its older entry; the oldest go past 50. */
export function addToBin(bin: readonly BinEntry[], note: Note, today: Date): BinEntry[] {
  return [{ note, removedOn: isoDate(today) }, ...bin.filter((e) => e.note.id !== note.id)].slice(0, MAX_BIN);
}

export type RestoreResult =
  | { readonly ok: true; readonly bin: BinEntry[]; readonly notes: Note[] }
  | { readonly ok: false; readonly reason: "missing" | "full" | "exists" };

/** Puts a note back at the top of the notes, unchanged, if there is room and no note has its id. */
export function restoreFromBin(bin: readonly BinEntry[], notes: readonly Note[], id: string): RestoreResult {
  const e = bin.find((x) => x.note.id === id);
  if (!e) return { ok: false, reason: "missing" };
  if (notes.some((n) => n.id === id)) return { ok: false, reason: "exists" };
  if (notes.length >= LIMITS.notes) return { ok: false, reason: "full" };
  return { ok: true, bin: bin.filter((x) => x.note.id !== id), notes: [e.note, ...notes] };
}

export function deleteFromBin(bin: readonly BinEntry[], id: string): BinEntry[] {
  return bin.filter((e) => e.note.id !== id);
}

/** "Removed on 2026-11-19 · 30 days left". */
export function binLine(e: BinEntry, l: Locale, today: Date): string {
  const left = daysLeft(e, today);
  if (l === "fr") return `Retirée le ${e.removedOn} · ${left > 1 ? `${left} jours restants` : `${left} jour restant`}`;
  return `Removed on ${e.removedOn} · ${left === 1 ? "1 day left" : `${left} days left`}`;
}

export function putBackLabel(place: string, l: Locale): string {
  return l === "fr" ? `Remettre la note sur ${place}` : `Put back the note about ${place}`;
}

export function deleteLabel(place: string, l: Locale): string {
  return l === "fr" ? `Retirer définitivement la note sur ${place}` : `Remove the note about ${place} for good`;
}

/** Every readable entry, as written: a valid note, a valid date, each note once, at most 50. */
function readEntries(raw: string | null): BinEntry[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: BinEntry[] = [];
  for (const r of data) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const note = parseNote(o["note"]);
    const removedOn = o["removedOn"];
    if (!note || typeof removedOn !== "string" || !isIsoDate(removedOn)) continue;
    if (out.some((e) => e.note.id === note.id)) continue;
    out.push({ note, removedOn });
    if (out.length >= MAX_BIN) break;
  }
  return out;
}

/** The entries still within their 30 days. An entry dated after today cannot be right and is dropped. */
export function parseBin(raw: string | null, today: Date): BinEntry[] {
  return expireBin(readEntries(raw).filter((e) => e.removedOn <= isoDate(today)), today);
}

/** How many entries can be read, whatever today's date: for the "kept on this device" page. */
export function countBinEntries(raw: string | null): number {
  return readEntries(raw).length;
}

export function loadBin(store: KeyValueStore | undefined, today: Date): BinEntry[] {
  try {
    return parseBin(store?.getItem(BIN_KEY) ?? null, today);
  } catch {
    return [];
  }
}

export function saveBin(store: KeyValueStore | undefined, bin: readonly BinEntry[]): "saved" | "unavailable" {
  if (!store) return "unavailable";
  try {
    if (bin.length === 0) store.removeItem(BIN_KEY);
    else store.setItem(BIN_KEY, JSON.stringify(bin));
    return "saved";
  } catch {
    return "unavailable";
  }
}

export function binStrings(): Array<[string, Pair]> {
  return Object.entries(BIN_COPY).map(([k, p]): [string, Pair] => [`bin.${k}`, p]);
}
