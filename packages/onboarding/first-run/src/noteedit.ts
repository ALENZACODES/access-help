import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, NN, t, type Pair } from "./copy";
import { CONTRIBUTOR_SOURCE, FACT_KEYS, isIsoDate, type FactKey, type Tri } from "./facts";
import { emptyUnknownDetails, isoDate, toNote, type FormValues } from "./form";
import type { Note } from "./model";
import type { KeyValueStore } from "./store";

/**
 * Correcting a note. Only the person's own notes can be corrected: every Yes
 * or No in them says "Contributor report", with one licence and one date, as
 * the add-a-note form makes them. A note from another source keeps that
 * source's words; it can be removed but not rewritten, because its provenance
 * is not the person's to change.
 *
 * A correction goes through the same form and the same rules. The note keeps
 * its id and the day it was first added; each correction is logged on this
 * device (what changed and when) and shown on the note, so a changed answer is
 * never silent.
 */
export const CORRECTIONS_KEY = "app.onboarding.corrections.v1";
export const MAX_CORRECTIONS = 500;

export type Editable = "editable" | "not-own" | "mixed";

export const EDIT_COPY = {
  correct: { en: "Correct this note", fr: "Corriger cette note" },
  title: { en: "Correct a note", fr: "Corriger une note" },
  intro: {
    en: "NoteChange what was wrong and save. The note keeps the day it was first added, and the correction is shown on it.",
    fr: "Modifiez ce qui était faux et enregistrez. La note garde la date où elle a été ajoutée, et la correction y est indiquée.",
  },
  submit: { en: "Save the correction", fr: "Enregistrer la correction" },
  corrected: { en: "The note was corrected.", fr: "La note a été corrigée." },
  unchanged: { en: "Nothing was changed.", fr: "Rien n’a été modifié." },
  notOwn: {
    en: "This note comes from another source. It can be removed, but not corrected here.",
    fr: "Cette note vient d’une autre source. Elle peut être retirée, mais pas corrigée ici.",
  },
  mixed: {
    en: "The details in this note have different dates or licences, so it cannot be corrected in one form. Add a new note instead.",
    fr: `Les détails de cette note ont des dates ou des licences différentes${NB}: elle ne peut donc pas être corrigée dans un seul formulaire. Ajoutez plutôt une note.`,
  },
  correctedOn: { en: "Corrected on", fr: "Corrigée le" },
  history: { en: "Changes to this note", fr: "Modifications de cette note" },
  empty: { en: "(none)", fr: "(aucune)" },
  deviceTitle: { en: "Corrections to notes", fr: "Corrections des notes" },
  deviceWhat: {
    en: "When you corrected a note, and which parts changed.",
    fr: "Quand vous avez corrigé une note, et quelles parties ont changé.",
  },
} as const satisfies Record<string, Pair>;

/** The parts of a note a correction can change. */
export type NotePart = "placeName" | "address" | "note" | "licence" | "observedOn" | FactKey;

export const PART_COPY: Record<"placeName" | "address" | "note" | "licence" | "observedOn", Pair> = {
  placeName: { en: "place name", fr: "nom du lieu" },
  address: { en: "address", fr: "adresse" },
  note: { en: "extra note", fr: "note supplémentaire" },
  licence: { en: "licence", fr: "licence d’utilisation" },
  observedOn: { en: "date", fr: "date d’observation" },
};

/** Whether a note can be corrected in the form, and why not. */
export function editable(n: Note): Editable {
  const known = n.facts.filter((f) => f.value !== "unknown" && f.provenance);
  if (known.some((f) => f.provenance?.source !== CONTRIBUTOR_SOURCE)) return "not-own";
  if (known.length === 0) return "not-own";
  const dates = new Set(known.map((f) => f.provenance?.recordedOn));
  const licences = new Set(known.map((f) => f.provenance?.licence));
  return dates.size === 1 && licences.size === 1 ? "editable" : "mixed";
}

/** The form values for an editable note: its own place, details, date, licence and text. */
export function formFromNote(n: Note): FormValues | undefined {
  if (editable(n) !== "editable") return undefined;
  const details = emptyUnknownDetails();
  for (const f of n.facts) if (f.value !== "unknown") details[f.key] = f.value;
  const first = n.facts.find((f) => f.value !== "unknown" && f.provenance)?.provenance;
  if (!first) return undefined;
  return {
    placeName: n.placeName,
    address: n.address ?? "",
    details,
    observedOn: first.recordedOn,
    licence: first.licence,
    note: n.note ?? "",
  };
}

/** The corrected note: built by the form's own rules, keeping the note's id and the day it was first added. Throws on invalid values, like `toNote`. */
export function correctNote(before: Note, values: FormValues, today: Date): Note {
  const built = toNote(values, today, () => before.id);
  return { ...built, createdOn: before.createdOn };
}

export interface NoteChange {
  readonly part: NotePart;
  readonly from: string;
  readonly to: string;
}

const valueOf = (n: Note, key: FactKey): Tri => n.facts.find((f) => f.key === key)?.value ?? "unknown";

/** What a correction changed, in a fixed order: place, address, details, date, licence, text. */
export function diffNotes(before: Note, after: Note): NoteChange[] {
  const out: NoteChange[] = [];
  const add = (part: NotePart, from: string, to: string): void => {
    if (from !== to) out.push({ part, from, to });
  };
  add("placeName", before.placeName, after.placeName);
  add("address", before.address ?? "", after.address ?? "");
  for (const k of FACT_KEYS) add(k, valueOf(before, k), valueOf(after, k));
  // Date and licence are the ones on the details, which is what the form shows and what people see.
  const date = (n: Note): string => n.facts.find((f) => f.provenance)?.provenance?.recordedOn ?? "";
  const licence = (n: Note): string => n.facts.find((f) => f.provenance)?.provenance?.licence ?? n.licence;
  add("observedOn", date(before), date(after));
  add("licence", licence(before), licence(after));
  add("note", before.note ?? "", after.note ?? "");
  return out;
}

/** The name of a part, in a sentence: "Elevator", "address". */
export function partLabel(part: NotePart, l: Locale): string {
  return (FACT_KEYS as readonly string[]).includes(part) ? t(COPY.facts[part as FactKey], l) : t(PART_COPY[part as keyof typeof PART_COPY], l);
}

// ---- The corrections log ----

export interface Correction {
  readonly noteId: string;
  readonly on: string;
  readonly parts: readonly NotePart[];
  /** What each part was and became. Older logs kept only the parts; those show the parts alone. */
  readonly changes?: readonly NoteChange[];
}

/** Longest text kept for one side of a change, so the log stays small. */
export const MAX_CHANGE_TEXT = 200;

const PARTS: readonly string[] = ["placeName", "address", "note", "licence", "observedOn", ...FACT_KEYS];

/** Adds one correction, newest first, keeping at most 500. */
export function logCorrection(log: readonly Correction[], noteId: string, changes: readonly NoteChange[], today: Date): Correction[] {
  if (changes.length === 0) return [...log];
  const kept = changes.map((c) => ({ part: c.part, from: c.from.slice(0, MAX_CHANGE_TEXT), to: c.to.slice(0, MAX_CHANGE_TEXT) }));
  return [{ noteId, on: isoDate(today), parts: changes.map((c) => c.part), changes: kept }, ...log].slice(0, MAX_CORRECTIONS);
}

/** The newest correction of a note, if any. */
export function lastCorrection(log: readonly Correction[], noteId: string): Correction | undefined {
  return log.find((c) => c.noteId === noteId);
}

/** Keeps only corrections of notes that still exist somewhere (the notes, or recently removed). */
export function pruneCorrections(log: readonly Correction[], ids: ReadonlySet<string>): Correction[] {
  return log.filter((c) => ids.has(c.noteId));
}

/** "Corrected on 2026-11-19: Elevator, address". */
export function correctionLine(c: Correction, l: Locale): string {
  return `${t(EDIT_COPY.correctedOn, l)} ${c.on}${l === "fr" ? NB : ""}: ${c.parts.map((p) => partLabel(p, l)).join(", ")}`;
}

/** Every correction of one note, newest first. */
export function correctionsOf(log: readonly Correction[], noteId: string): Correction[] {
  return log.filter((c) => c.noteId === noteId);
}

/** One side of a change, in words: a detail's Yes/No/Unknown, "(none)" for empty text, quoted text otherwise. */
export function changeValue(part: NotePart, value: string, l: Locale): string {
  if ((FACT_KEYS as readonly string[]).includes(part)) {
    return value === "yes" || value === "no" || value === "unknown" ? t(COPY.values[value], l) : value;
  }
  if (value === "") return t(EDIT_COPY.empty, l);
  return l === "fr" ? `«${NN}${value}${NN}»` : `“${value}”`;
}

/** "Elevator: Yes → No", or the part alone for an older log with no values. */
export function changeText(c: NoteChange, l: Locale): string {
  return `${partLabel(c.part, l)}${l === "fr" ? NB : ""}: ${changeValue(c.part, c.from, l)} → ${changeValue(c.part, c.to, l)}`;
}

/** The lines of one correction: its changes with values when known, else the parts. */
export function correctionDetails(c: Correction, l: Locale): string[] {
  return c.changes && c.changes.length > 0 ? c.changes.map((x) => changeText(x, l)) : c.parts.map((p) => partLabel(p, l));
}

export function parseCorrections(raw: string | null): Correction[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: Correction[] = [];
  for (const r of data) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const id = o["noteId"];
    const on = o["on"];
    if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(id) || typeof on !== "string" || !isIsoDate(on)) continue;
    const parts = Array.isArray(o["parts"]) ? (o["parts"] as unknown[]).filter((p): p is NotePart => typeof p === "string" && PARTS.includes(p)) : [];
    if (parts.length === 0) continue;
    const changes = Array.isArray(o["changes"])
      ? (o["changes"] as unknown[]).filter(
          (c): c is NoteChange =>
            !!c &&
            typeof c === "object" &&
            PARTS.includes((c as Record<string, unknown>)["part"] as string) &&
            typeof (c as Record<string, unknown>)["from"] === "string" &&
            typeof (c as Record<string, unknown>)["to"] === "string" &&
            ((c as Record<string, unknown>)["from"] as string).length <= MAX_CHANGE_TEXT &&
            ((c as Record<string, unknown>)["to"] as string).length <= MAX_CHANGE_TEXT,
        ).map((c) => ({ part: c.part, from: c.from, to: c.to }))
      : undefined;
    out.push({ noteId: id, on, parts: [...new Set(parts)], ...(changes && changes.length > 0 ? { changes } : {}) });
    if (out.length >= MAX_CORRECTIONS) break;
  }
  return out;
}

export function loadCorrections(store: KeyValueStore | undefined): Correction[] {
  try {
    return parseCorrections(store?.getItem(CORRECTIONS_KEY) ?? null);
  } catch {
    return [];
  }
}

export function saveCorrections(store: KeyValueStore | undefined, log: readonly Correction[]): "saved" | "unavailable" {
  if (!store) return "unavailable";
  try {
    if (log.length === 0) store.removeItem(CORRECTIONS_KEY);
    else store.setItem(CORRECTIONS_KEY, JSON.stringify(log));
    return "saved";
  } catch {
    return "unavailable";
  }
}

export function editStrings(): Array<[string, Pair]> {
  return [
    ...Object.entries(EDIT_COPY).map(([k, p]): [string, Pair] => [`edit.${k}`, p]),
    ...Object.entries(PART_COPY).map(([k, p]): [string, Pair] => [`edit.part.${k}`, p]),
  ];
}
