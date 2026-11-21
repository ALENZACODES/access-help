import { exportNotes } from "./exchange";
import { FACT_KEYS, OPEN_LICENCES, type Fact } from "./facts";
import { foldText } from "./filter";
import { csvField, guardCell } from "./notes-csv";
import type { Note } from "./model";

/**
 * "Credits for sharing a notes file": every source in a notes export with its
 * licence, how many records it gave and from when to when, grouped by
 * licence, so a person who shares the file (or something made from it) can
 * credit the sources. A person can also choose licences to leave out of a
 * copy: a record under such a licence is not in the copy, so in the copy that
 * detail has no record; a note whose own licence is left out is not in the
 * copy at all. The App does not say which licences may be combined; it only
 * does what the person chooses. Nothing is looked up or saved.
 */

export interface CreditSource {
  readonly source: string;
  readonly licence: string;
  /** Yes and No records with this source and licence. */
  readonly records: number;
  readonly oldest: string;
  readonly newest: string;
}

export interface CreditLicence {
  readonly licence: string;
  /** Sources whose records carry this licence, most records first, then by name. */
  readonly sources: readonly CreditSource[];
  readonly records: number;
  /** Notes whose own licence (the note's, not a record's) is this one. */
  readonly notes: number;
}

export interface Credits {
  /** Licences with records or notes, most records first, then in the App's licence order. */
  readonly licences: readonly CreditLicence[];
  readonly records: number;
  readonly notes: number;
  readonly sources: number;
}

/** A Yes or No with its source, licence and date. Unknown details have no record. */
function recorded(f: Fact): f is Fact & { readonly value: "yes" | "no"; readonly provenance: NonNullable<Fact["provenance"]> } {
  return (f.value === "yes" || f.value === "no") && f.provenance !== undefined;
}

function licenceOrder(l: string): number {
  const i = OPEN_LICENCES.indexOf(l);
  return i < 0 ? OPEN_LICENCES.length : i;
}

/** Collects the credits of a set of notes. */
export function collectCredits(notes: readonly Note[]): Credits {
  const by = new Map<string, Map<string, { records: number; oldest: string; newest: string }>>();
  const noteLicences = new Map<string, number>();
  let records = 0;
  for (const n of notes) {
    noteLicences.set(n.licence, (noteLicences.get(n.licence) ?? 0) + 1);
    for (const f of n.facts) {
      if (!recorded(f)) continue;
      records++;
      const p = f.provenance;
      const sources = by.get(p.licence) ?? new Map<string, { records: number; oldest: string; newest: string }>();
      const s = sources.get(p.source) ?? { records: 0, oldest: p.recordedOn, newest: p.recordedOn };
      s.records++;
      if (p.recordedOn < s.oldest) s.oldest = p.recordedOn;
      if (p.recordedOn > s.newest) s.newest = p.recordedOn;
      sources.set(p.source, s);
      by.set(p.licence, sources);
    }
  }
  const all = new Set([...by.keys(), ...noteLicences.keys()]);
  const licences: CreditLicence[] = [...all].map((licence) => {
    const sources = [...(by.get(licence) ?? new Map<string, { records: number; oldest: string; newest: string }>())]
      .map(([source, s]) => ({ source, licence, ...s }))
      .sort((a, b) => b.records - a.records || a.source.localeCompare(b.source));
    return { licence, sources, records: sources.reduce((a, s) => a + s.records, 0), notes: noteLicences.get(licence) ?? 0 };
  });
  licences.sort((a, b) => b.records - a.records || licenceOrder(a.licence) - licenceOrder(b.licence) || a.licence.localeCompare(b.licence));
  const sourceNames = new Set(licences.flatMap((l) => l.sources.map((s) => s.source)));
  return { licences, records, notes: notes.length, sources: sourceNames.size };
}

export interface Excluded {
  readonly notes: readonly Note[];
  /** Notes left out because their own licence is left out. */
  readonly droppedNotes: number;
  /** Records left out because their licence is left out, in the notes that stay. */
  readonly droppedRecords: number;
  /** Records in the copy. */
  readonly keptRecords: number;
}

/**
 * A copy without the chosen licences. A note whose own licence is chosen is
 * left out whole. In the other notes, a record whose licence is chosen is
 * left out: that detail then has no record in the copy (Unknown). Nothing
 * else changes; no record is moved, merged or given another licence.
 */
export function excludeLicences(notes: readonly Note[], leaveOut: readonly string[]): Excluded {
  const out: Note[] = [];
  let droppedNotes = 0;
  let droppedRecords = 0;
  let keptRecords = 0;
  for (const n of notes) {
    if (leaveOut.includes(n.licence)) {
      droppedNotes++;
      continue;
    }
    const facts = FACT_KEYS.map((key): Fact => {
      const f = n.facts.find((x) => x.key === key) ?? { key, value: "unknown", provenance: undefined };
      if (!recorded(f)) return f;
      if (leaveOut.includes(f.provenance.licence)) {
        droppedRecords++;
        return { key, value: "unknown", provenance: undefined };
      }
      keptRecords++;
      return f;
    });
    out.push({ ...n, facts });
  }
  return { notes: out, droppedNotes, droppedRecords, keptRecords };
}

/** One source written more than one way: spellings that differ only by case, accents, spaces or punctuation. */
export interface SourceVariants {
  readonly key: string;
  /** Most records first, then by spelling. */
  readonly spellings: ReadonlyArray<{ readonly source: string; readonly records: number }>;
}

export function sourceKey(source: string): string {
  return foldText(source).replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Sources that may be one source spelled differently. They are only shown
 * together: the App does not decide they are one, and does not change them
 * unless the person picks a spelling for a copy.
 */
export function sourceVariants(notes: readonly Note[]): SourceVariants[] {
  const by = new Map<string, Map<string, number>>();
  for (const n of notes)
    for (const f of n.facts) {
      if (!recorded(f)) continue;
      const key = sourceKey(f.provenance.source);
      const m = by.get(key) ?? new Map<string, number>();
      m.set(f.provenance.source, (m.get(f.provenance.source) ?? 0) + 1);
      by.set(key, m);
    }
  return [...by]
    .filter(([, m]) => m.size > 1)
    .map(([key, m]) => ({ key, spellings: [...m].map(([source, records]) => ({ source, records })).sort((a, b) => b.records - a.records || a.source.localeCompare(b.source)) }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Writes sources the way the person chose: each record whose source is a key
 * of `renames` gets the chosen spelling. Only the source's text changes; its
 * value, licence and date stay. A rename to a spelling that is not one of the
 * same source's spellings is ignored, so a source is never given another
 * source's name.
 */
export function renameSources(notes: readonly Note[], renames: Readonly<Record<string, string>>): { readonly notes: Note[]; readonly renamed: number } {
  let renamed = 0;
  const out = notes.map((n) => ({
    ...n,
    facts: n.facts.map((f): Fact => {
      if (!recorded(f)) return f;
      const to = renames[f.provenance.source];
      if (to === undefined || to === f.provenance.source || sourceKey(to) !== sourceKey(f.provenance.source)) return f;
      renamed++;
      return { ...f, provenance: { ...f.provenance, source: to } };
    }),
  }));
  return { notes: out, renamed };
}

/**
 * The renames for a set of choices: for each group the person picked a
 * spelling for, every other spelling of it becomes that one.
 */
export function renamesFor(variants: readonly SourceVariants[], picked: Readonly<Record<string, string>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const v of variants) {
    const to = picked[v.key];
    if (to === undefined || !v.spellings.some((s) => s.source === to)) continue;
    for (const s of v.spellings) if (s.source !== to) out[s.source] = to;
  }
  return out;
}

export interface Copy extends Excluded {
  /** Records whose source was written the chosen way. */
  readonly renamed: number;
}

/** The copy to share: without the chosen licences, with sources written the chosen way. */
export function makeCopy(notes: readonly Note[], leaveOut: readonly string[], renames: Readonly<Record<string, string>>): Copy {
  const e = excludeLicences(notes, leaveOut);
  const r = renameSources(e.notes, renames);
  return { ...e, notes: r.notes, renamed: r.renamed };
}

/** A notes export of the copy. */
export function excludedFile(e: Excluded, today: Date): string {
  return exportNotes(e.notes, today.toISOString().slice(0, 10));
}

/** The licences a person may choose from: those in the file, in the credits' order. */
export function licencesInFile(c: Credits): string[] {
  return c.licences.map((l) => l.licence);
}

/** The columns of the credits' CSV. */
export const CREDITS_CSV_COLUMNS = ["licence", "source", "records", "oldest", "newest"] as const;

/** One row per source and licence, guarded like the App's own CSV. */
export function creditsCsv(c: Credits): string {
  const rows: string[][] = [[...CREDITS_CSV_COLUMNS]];
  for (const l of c.licences) for (const s of l.sources) rows.push([l.licence, s.source, String(s.records), s.oldest, s.newest]);
  return `\uFEFF${rows.map((r) => r.map((x) => csvField(guardCell(x))).join(",")).join("\r\n")}\r\n`;
}

/** The columns of the record-by-record CSV. */
export const RECORDS_CSV_COLUMNS = ["place_name", "address", "detail", "value", "source", "licence", "recorded_on", "note_id"] as const;

/**
 * Every Yes and No as its own row, with the place, the source, the licence and
 * the date, for credits that must name what came from where. Rows follow the
 * notes' order and the App's detail order; cells are guarded like the App's
 * own CSV.
 */
export function recordsCsv(notes: readonly Note[]): string {
  const rows: string[][] = [[...RECORDS_CSV_COLUMNS]];
  for (const n of notes)
    for (const key of FACT_KEYS) {
      const f = n.facts.find((x) => x.key === key);
      if (!f || !recorded(f)) continue;
      rows.push([n.placeName, n.address ?? "", key, f.value, f.provenance.source, f.provenance.licence, f.provenance.recordedOn, n.id]);
    }
  return `\uFEFF${rows.map((r) => r.map((x) => csvField(guardCell(x))).join(",")).join("\r\n")}\r\n`;
}
