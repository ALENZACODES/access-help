import type { Locale } from "../../switch-first/src/index";
import { ASKED_COPY, WAY_COPY, aboutLine, type AskRecord } from "./asked";
import { BIN_COPY, type BinEntry } from "./bin";
import { t, type Pair } from "./copy";
import { noteDetailsText } from "./csvimport";
import type { Note } from "./model";
import { correctionDetails, type Correction } from "./noteedit";
import { isIsoDate } from "./facts";
import { monthLabel } from "./latest";
import { placeId } from "./places";
import { placeLabel } from "./survey-copy";
import { setSummary, type NeedSet } from "./needsets";
import { passportLines, type Passport } from "./passport";
import { foundLines, type Visit } from "./visits";

/**
 * "What I did": one list of everything the person did in the App, newest
 * first, for every place or for one: notes added, notes corrected (with what
 * changed), notes removed, visits written down and questions sent, with the
 * answers they noted. It is read from what the App already keeps on this
 * device and keeps nothing of its own.
 *
 * It repeats the person's own records; it does not judge a place or say
 * which record is right.
 */
export type JournalKind = "note" | "correction" | "removed" | "visit" | "asked" | "closed" | "card" | "set";

export const JOURNAL_KINDS: readonly JournalKind[] = ["note", "correction", "removed", "visit", "asked", "closed", "card", "set"];

export interface JournalEntry {
  readonly on: string;
  readonly kind: JournalKind;
  readonly placeId: string;
  readonly placeName: string;
  readonly address: string | undefined;
  /** What happened, in the App's words. */
  readonly lines: readonly string[];
  /** The person's own words, kept apart so they are shown as theirs. */
  readonly own: string | undefined;
  /** A stable key for the entry, unique in the list. */
  readonly key: string;
}

export interface JournalSources {
  readonly notes: readonly Note[];
  readonly corrections: readonly Correction[];
  readonly bin: readonly BinEntry[];
  readonly visits: readonly Visit[];
  readonly asked: readonly AskRecord[];
  /** The access card and the saved sets of must-haves: not about one place, so they show with every place only. */
  readonly passport?: Passport | undefined;
  readonly sets?: readonly NeedSet[];
}

export const JOURNAL_COPY = {
  open: { en: "What I did", fr: "Ce que j’ai fait" },
  openPlace: { en: "What I did about this place", fr: "Ce que j’ai fait pour ce lieu" },
  title: { en: "What I did", fr: "Ce que j’ai fait" },
  intro: {
    en: "Everything you did in the App, newest first: notes added, corrected or removed, visits and questions. It is read from what is kept on this device.",
    fr: "Tout ce que vous avez fait dans l’App, du plus récent au plus ancien\u00A0: notes ajoutées, corrigées ou retirées, visites et questions. C’est lu à partir de ce qui est gardé sur cet appareil.",
  },
  none: { en: "Nothing to show yet.", fr: "Rien à montrer pour l’instant." },
  noneShown: { en: "Nothing matches these choices.", fr: "Rien ne correspond à ces choix." },
  kindsLegend: { en: "Show", fr: "Afficher" },
  placeLabel: { en: "Place", fr: "Lieu" },
  everyPlace: { en: "Every place", fr: "Tous les lieux" },
  ownWords: { en: "In my own words", fr: "Dans mes mots" },
  download: { en: "Download this list as text", fr: "Télécharger cette liste en texte" },
  back: { en: "Back to my notes", fr: "Retour à mes notes" },
  sinceLabel: { en: "Only since (optional)", fr: "Seulement depuis (facultatif)" },
  sinceHint: { en: "A day as year-month-day, for example 2026-11-01.", fr: "Un jour sous la forme année-mois-jour, par exemple 2026-11-01." },
  sinceError: { en: "Write the day as year-month-day, for example 2026-11-01.", fr: "Écrivez le jour sous la forme année-mois-jour, par exemple 2026-11-01." },
} as const satisfies Record<string, Pair>;

export const KIND_COPY: Readonly<Record<JournalKind, Pair>> = {
  note: { en: "Note added", fr: "Note ajoutée" },
  correction: { en: "Note corrected", fr: "Note corrigée" },
  removed: { en: "Note removed", fr: "Note retirée" },
  visit: { en: "Visit", fr: "Visite" },
  asked: { en: "Question sent", fr: "Question envoyée" },
  closed: { en: "Answer noted", fr: "Réponse notée" },
  card: { en: "Access card saved", fr: "Fiche d’accès enregistrée" },
  set: { en: "Set of must-haves saved", fr: "Ensemble d’indispensables enregistré" },
};

/** Plural names for the kinds, for the boxes that show or hide them. */
export const KIND_FILTER_COPY: Readonly<Record<JournalKind, Pair>> = {
  note: { en: "Notes added", fr: "Notes ajoutées" },
  correction: { en: "Notes corrected", fr: "Notes corrigées" },
  removed: { en: "Notes removed", fr: "Notes retirées" },
  visit: { en: "Visits", fr: "Visites" },
  asked: { en: "Questions sent", fr: "Questions envoyées" },
  closed: { en: "Answers noted", fr: "Réponses notées" },
  card: { en: "Access card", fr: "Fiche d’accès" },
  set: { en: "Sets of must-haves", fr: "Ensembles d’indispensables" },
};

const ORDER: Readonly<Record<JournalKind, number>> = { closed: 0, asked: 1, visit: 2, correction: 3, removed: 4, note: 5, card: 6, set: 7 };

const colon = (l: Locale): string => (l === "fr" ? "\u00A0:" : ":");

/** Every entry, newest first; on one day, the later kind of step first. */
export function buildJournal(s: JournalSources, l: Locale): JournalEntry[] {
  const out: JournalEntry[] = [];
  const place = (n: Note): Pick<JournalEntry, "placeId" | "placeName" | "address"> => ({ placeId: placeId(n), placeName: n.placeName, address: n.address });
  const noteById = new Map<string, Note>();
  for (const n of s.notes) noteById.set(n.id, n);
  for (const e of s.bin) if (!noteById.has(e.note.id)) noteById.set(e.note.id, e.note);

  for (const n of [...s.notes, ...s.bin.map((e) => e.note)]) {
    const details = noteDetailsText(n, l);
    out.push({ on: n.createdOn, kind: "note", ...place(n), lines: details ? [details] : [], own: n.note, key: `note:${n.id}` });
  }
  s.corrections.forEach((c, i) => {
    const n = noteById.get(c.noteId);
    if (!n) return;
    out.push({ on: c.on, kind: "correction", ...place(n), lines: correctionDetails(c, l), own: undefined, key: `correction:${c.noteId}:${i}` });
  });
  for (const e of s.bin) out.push({ on: e.removedOn, kind: "removed", ...place(e.note), lines: [l === "fr" ? `Mise dans «\u202F${t(BIN_COPY.title, l)}\u202F».` : `Moved to “${t(BIN_COPY.title, l)}”.`], own: undefined, key: `removed:${e.note.id}` });
  for (const v of s.visits) {
    out.push({ on: v.visitedOn, kind: "visit", placeId: v.placeId, placeName: v.placeName, address: v.address, lines: foundLines(v, l), own: v.words || undefined, key: `visit:${v.id}` });
  }
  for (const r of s.asked) {
    const where = { placeId: r.id, placeName: r.placeName, address: r.address === "" ? undefined : r.address };
    out.push({ on: r.askedOn, kind: "asked", ...where, lines: [t(WAY_COPY[r.way], l), aboutLine(r, l)], own: undefined, key: `asked:${r.id}` });
    if (r.state !== "waiting" && r.closedOn) {
      const said = r.state === "replied" ? (l === "fr" ? "Le lieu a répondu." : "They replied.") : l === "fr" ? "Pas de réponse." : "No reply.";
      out.push({ on: r.closedOn, kind: "closed", ...where, lines: [said], own: undefined, key: `closed:${r.id}` });
    }
  }
  // Not about a place: kept with an empty place id, so a place's own list leaves them out.
  if (s.passport) out.push({ on: s.passport.updatedOn, kind: "card", placeId: "", placeName: "", address: undefined, lines: passportLines({ ...s.passport, helps: "" }, l), own: s.passport.helps || undefined, key: "card" });
  for (const set of s.sets ?? []) out.push({ on: set.savedOn, kind: "set", placeId: "", placeName: "", address: undefined, lines: [setSummary(set, l)], own: set.name, key: `set:${set.id}` });
  return out.sort((a, b) => (a.on < b.on ? 1 : a.on > b.on ? -1 : 0) || ORDER[a.kind] - ORDER[b.kind] || a.key.localeCompare(b.key));
}

export function isJournalKind(v: unknown): v is JournalKind {
  return typeof v === "string" && (JOURNAL_KINDS as readonly string[]).includes(v);
}

export interface JournalFilter {
  /** "" for every place. */
  readonly placeId: string;
  /** The kinds shown; every kind when all are in. */
  readonly kinds: readonly JournalKind[];
  /** Only steps on or after this day, year-month-day; "" for every day. */
  readonly since?: string;
}

export const ALL_KINDS: JournalFilter = { placeId: "", kinds: JOURNAL_KINDS, since: "" };

/** True when the text can be used as the "since" day: empty, or a real day. */
export function isSinceDay(s: string): boolean {
  return s.trim() === "" || isIsoDate(s.trim());
}

export function filterJournal(list: readonly JournalEntry[], f: JournalFilter): JournalEntry[] {
  const since = f.since ?? "";
  return list.filter((e) => (f.placeId === "" || e.placeId === f.placeId) && f.kinds.includes(e.kind) && (since === "" || e.on >= since));
}

/** The places in the list, each once, by name, with the name of its newest entry. */
export function journalPlaces(list: readonly JournalEntry[]): Array<{ readonly id: string; readonly name: string }> {
  const out: Array<{ id: string; name: string }> = [];
  for (const e of list) if (e.placeId !== "" && !out.some((p) => p.id === e.placeId)) out.push({ id: e.placeId, name: placeLabel(e.placeName, e.address ?? "") });
  return out.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

/** The list in months, newest month first, keeping the list's order inside each. */
export function byMonth(list: readonly JournalEntry[]): Array<{ readonly month: string; readonly entries: readonly JournalEntry[] }> {
  const out: Array<{ month: string; entries: JournalEntry[] }> = [];
  for (const e of list) {
    const month = e.on.slice(0, 7);
    const last = out[out.length - 1];
    if (last && last.month === month) last.entries.push(e);
    else out.push({ month, entries: [e] });
  }
  return out;
}

/** "Note corrected, 2026-11-19: Library, 1 Main St". */
export function entryHeading(e: JournalEntry, l: Locale): string {
  if (e.placeId === "") return `${t(KIND_COPY[e.kind], l)}, ${e.on}`;
  return `${t(KIND_COPY[e.kind], l)}, ${e.on}${colon(l)} ${placeLabel(e.placeName, e.address ?? "")}`;
}

/** "Notes added: 2", one line for each kind in the list, in the order of the boxes. */
export function journalKindCounts(list: readonly JournalEntry[], l: Locale): string[] {
  return JOURNAL_KINDS.flatMap((k) => {
    const n = list.filter((e) => e.kind === k).length;
    return n === 0 ? [] : [`${t(KIND_FILTER_COPY[k], l)}${colon(l)} ${n}`];
  });
}

/** "3 entries" / "3 entrées". */
export function entryCountText(shown: number, total: number, l: Locale): string {
  if (l === "fr") return `${shown} entrée${shown > 1 ? "s" : ""} sur ${total}.`;
  return `${shown} of ${total} entr${total === 1 ? "y" : "ies"}.`;
}

export function journalText(list: readonly JournalEntry[], l: Locale): string {
  const title = t(JOURNAL_COPY.title, l);
  const lines = [title, "=".repeat(title.length), ""];
  if (list.length === 0) lines.push(t(JOURNAL_COPY.none, l));
  for (const { month, entries } of byMonth(list)) {
    const name = monthLabel(month, l);
    lines.push(name, "-".repeat(name.length), "");
    for (const e of entries) {
      lines.push(entryHeading(e, l), ...e.lines.map((x) => `  ${x}`));
      if (e.own) lines.push(`  ${t(JOURNAL_COPY.ownWords, l)}${colon(l)} ${e.own}`);
      lines.push("");
    }
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

export function journalFilename(today: Date, l: Locale): string {
  return `${l === "fr" ? "ce-que-j-ai-fait" : "what-i-did"}-${today.toISOString().slice(0, 10)}.txt`;
}

export function journalStrings(): Array<[string, Pair]> {
  return [
    ...Object.entries(JOURNAL_COPY).map(([k, p]): [string, Pair] => [`journal.${k}`, p]),
    ...Object.entries(KIND_COPY).map(([k, p]): [string, Pair] => [`journal.kind.${k}`, p]),
    ...Object.entries(KIND_FILTER_COPY).map(([k, p]): [string, Pair] => [`journal.filter.${k}`, p]),
    [`journal.asked`, ASKED_COPY.title],
  ];
}
