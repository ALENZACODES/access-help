import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";
import { monthsSince } from "./facts";
import type { Note } from "./model";

/**
 * Notes a person may want to look at again. Three plain checks, each stated
 * as a fact about the note: no Yes or No in it, every record in it two years
 * old or more, no address. A flag is not a fault and never changes a note;
 * removing a note is always the person's choice, asked twice.
 */
export type NoteFlag = "empty" | "old" | "noAddress";

export const NOTE_FLAGS: readonly NoteFlag[] = ["empty", "old", "noAddress"];

/** Records this many months old or more count as old for this page. */
export const OLD_RECORD_MONTHS = 24;

export function noteFlags(note: Note, today: Date): NoteFlag[] {
  const recorded = note.facts.filter((f) => f.value !== "unknown" && f.provenance);
  const flags: NoteFlag[] = [];
  if (recorded.length === 0) flags.push("empty");
  else if (recorded.every((f) => f.provenance !== undefined && monthsSince(f.provenance.recordedOn, today) >= OLD_RECORD_MONTHS)) flags.push("old");
  if (!note.address) flags.push("noAddress");
  return flags;
}

export interface FlaggedNote {
  readonly note: Note;
  readonly flags: readonly NoteFlag[];
}

export interface NoteCheck {
  readonly notes: number;
  readonly flagged: readonly FlaggedNote[];
  readonly counts: Readonly<Record<NoteFlag, number>>;
}

/** Flagged notes by place name, then newest note first, then id. Notes with no flag are left out. */
export function checkNotes(notes: readonly Note[], today: Date): NoteCheck {
  const flagged = notes
    .map((note) => ({ note, flags: noteFlags(note, today) }))
    .filter((x) => x.flags.length > 0)
    .sort((a, b) => a.note.placeName.localeCompare(b.note.placeName) || b.note.createdOn.localeCompare(a.note.createdOn) || a.note.id.localeCompare(b.note.id));
  const counts: Record<NoteFlag, number> = { empty: 0, old: 0, noAddress: 0 };
  for (const f of flagged) for (const g of f.flags) counts[g] += 1;
  return { notes: notes.length, flagged, counts };
}

export function flagLabel(flag: NoteFlag, locale: Locale): string {
  return t(COPY.noteCheck.flags[flag], locale);
}

const rule = (title: string, ch = "="): string => ch.repeat(Math.min(Math.max(title.length, 3), 72));

export function noteCheckToText(check: NoteCheck, locale: Locale, today: Date): string {
  const l = locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const title = t(COPY.noteCheck.title, l);
  const lines = [title, rule(title), "", t(COPY.noteCheck.intro, l), t(COPY.noteCheck.notFault, l), ""];
  if (check.notes === 0) lines.push(t(COPY.noteCheck.noNotes, l), "");
  else if (check.flagged.length === 0) lines.push(t(COPY.noteCheck.none, l), "");
  else {
    for (const f of NOTE_FLAGS) lines.push(`${flagLabel(f, l)}${colon} ${check.counts[f]}`);
    lines.push("");
    for (const x of check.flagged) {
      const where = x.note.address ? `${x.note.placeName}, ${x.note.address}` : x.note.placeName;
      lines.push(`- ${where} (${t(COPY.noteCheck.created, l)} ${x.note.createdOn})`);
      for (const f of x.flags) lines.push(`  * ${flagLabel(f, l)}`);
    }
    lines.push("");
  }
  lines.push(`${t(COPY.textExport.madeOn, l)} ${today.toISOString().slice(0, 10)}.`);
  return lines.join("\n") + "\n";
}

export function noteCheckFilename(today: Date, locale: Locale): string {
  return `${locale === "fr" ? "notes-a-revoir" : "notes-to-check"}-${today.toISOString().slice(0, 10)}-${locale}.txt`;
}
