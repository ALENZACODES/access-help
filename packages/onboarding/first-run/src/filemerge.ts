import { exportNotes, type ImportError } from "./exchange";
import { checkFile } from "./filecheck";
import { LIMITS, type Note } from "./model";

/**
 * "Combine note files": several notes exports (for example, one from each
 * person after a mapping day) are joined into one new notes export. Nothing on
 * this device changes; the result is a file to download.
 *
 * Each file is read with the App's own rules (checkFile, so parseNote), and a
 * Yes or No without a source, an open licence and a date is read as UNKNOWN.
 * Notes are joined in file order, and nothing is silently thrown away:
 * - a note whose id is already in the result with exactly the same content is
 *   the same note again, and is kept once;
 * - a note whose id is already in the result with different content is a
 *   clash: the person picks the earlier version, the later one, or both (the
 *   later one then gets a new id);
 * - a note with another id but the same content as a note in the result is a
 *   copy; it is kept unless the person leaves it out.
 * Nothing picks a version for the person except the first-file default, which
 * the page shows, and no record is changed.
 */

export const MAX_FILES = 10;
export const MAX_LABEL = 80;

export interface MergeInput {
  /** What the person calls the file, such as its file name. */
  readonly label: string;
  readonly text: string;
}

export interface ReadFile {
  readonly index: number;
  readonly label: string;
  readonly notes: readonly Note[];
  readonly leftOut: number;
}

export interface FileProblem {
  readonly index: number;
  readonly label: string;
  readonly error: ImportError | "no-notes";
}

/** Where a note came from: the file (index from 0) and its position in that file's readable notes. */
export interface NoteRef {
  readonly file: number;
  readonly note: Note;
}

export type ClashChoice = "first" | "later" | "both";
export const CLASH_CHOICES: readonly ClashChoice[] = ["first", "later", "both"];

export interface Clash {
  /** Stable key: the id and the later file's index. */
  readonly key: string;
  readonly id: string;
  readonly first: NoteRef;
  readonly later: NoteRef;
}

export interface Copy {
  readonly key: string;
  /** The note already in the result. */
  readonly kept: NoteRef;
  /** The note with another id and the same content. */
  readonly copy: NoteRef;
}

export interface MergePlan {
  readonly files: readonly ReadFile[];
  readonly problems: readonly FileProblem[];
  /** Notes found again with the same id and content, kept once. */
  readonly sameAgain: number;
  readonly clashes: readonly Clash[];
  readonly copies: readonly Copy[];
  /** Notes taken without question, in order. Clash and copy notes are decided by choices. */
  readonly base: readonly NoteRef[];
}

export interface Choices {
  readonly clashes: Readonly<Record<string, ClashChoice>>;
  /** Keys of copies the person leaves out. */
  readonly dropCopies: readonly string[];
}

export const NO_CHOICES: Choices = { clashes: {}, dropCopies: [] };

export interface MergeResult {
  readonly notes: readonly Note[];
  /** Ids given to later versions kept with "both", old id to new id, in order. */
  readonly renamed: ReadonlyArray<readonly [string, string]>;
  readonly droppedCopies: number;
  /** True when the result holds more notes than one device keeps. */
  readonly overDeviceLimit: boolean;
}

/** A note's content in one string. Notes read by parseNote always have the same key order. */
export function noteContent(n: Note): string {
  return JSON.stringify(n);
}

/** The content without the id, for finding copies. */
export function contentWithoutId(n: Note): string {
  return JSON.stringify({ ...n, id: "" });
}

/** A file label as one plain line, possibly empty. */
export function trimLabel(label: string): string {
  // eslint-disable-next-line no-control-regex
  return label.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_LABEL);
}

/** The label shown for a file: its own, or "#2" for the second file when it has none. */
export function cleanLabel(label: string, index: number): string {
  const t = trimLabel(label);
  return t === "" ? `#${index + 1}` : t;
}

/** Reads every file. A file that cannot be read, or has no readable note, is listed as a problem and left out. */
export function planMerge(inputs: readonly MergeInput[], today: Date): MergePlan {
  const files: ReadFile[] = [];
  const problems: FileProblem[] = [];
  inputs.slice(0, MAX_FILES).forEach((input, index) => {
    const label = cleanLabel(input.label, index);
    const r = checkFile(input.text, today);
    if (!r.ok) problems.push({ index, label, error: r.error });
    else if (r.check.readable.length === 0) problems.push({ index, label, error: "no-notes" });
    else files.push({ index, label, notes: r.check.readable, leftOut: r.check.totals.leftOut });
  });
  const byId = new Map<string, NoteRef>();
  const byContent = new Map<string, NoteRef>();
  const base: NoteRef[] = [];
  const clashes: Clash[] = [];
  const copies: Copy[] = [];
  let sameAgain = 0;
  for (const f of files) {
    for (const note of f.notes) {
      const ref: NoteRef = { file: f.index, note };
      const earlier = byId.get(note.id);
      if (earlier) {
        if (noteContent(earlier.note) === noteContent(note)) sameAgain++;
        else clashes.push({ key: `${note.id}@${f.index}`, id: note.id, first: earlier, later: ref });
        continue;
      }
      byId.set(note.id, ref);
      const content = contentWithoutId(note);
      const twin = byContent.get(content);
      if (twin) {
        copies.push({ key: `${note.id}@${f.index}`, kept: twin, copy: ref });
        continue;
      }
      byContent.set(content, ref);
      base.push(ref);
    }
  }
  return { files, problems, sameAgain, clashes, copies, base };
}

export function clashChoice(choices: Choices, key: string): ClashChoice {
  return choices.clashes[key] ?? "first";
}

/** A new id for a later version kept next to the first: the id plus "-2", "-3"…, within the id rules. */
export function freshId(id: string, taken: ReadonlySet<string>): string {
  for (let n = 2; ; n++) {
    const suffix = `-${n}`;
    const candidate = `${id.slice(0, 64 - suffix.length)}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** Builds the combined notes from the plan and the person's choices. Notes stay in file order. */
export function applyChoices(plan: MergePlan, choices: Choices): MergeResult {
  const drop = new Set(choices.dropCopies);
  // Decide each note's place: the order is the order notes were met in the files.
  type Slot = { readonly order: number; readonly note: Note };
  const slots: Slot[] = [];
  const order = (r: NoteRef): number => {
    const file = plan.files.find((f) => f.index === r.file);
    return r.file * 100_000 + (file ? file.notes.indexOf(r.note) : 0);
  };
  const clashById = new Map<string, Clash[]>();
  for (const c of plan.clashes) clashById.set(c.id, [...(clashById.get(c.id) ?? []), c]);
  const taken = new Set<string>();
  for (const r of plan.base) taken.add(r.note.id);
  for (const c of plan.copies) taken.add(c.copy.note.id);
  for (const r of plan.base) {
    const list = clashById.get(r.note.id);
    // A later version chosen instead of the first takes the first one's place in the order.
    const replaced = list?.find((c) => clashChoice(choices, c.key) === "later");
    slots.push({ order: order(r), note: replaced ? replaced.later.note : r.note });
  }
  let droppedCopies = 0;
  for (const c of plan.copies) {
    if (drop.has(c.key)) {
      droppedCopies++;
      continue;
    }
    const list = clashById.get(c.copy.note.id);
    const replaced = list?.find((x) => clashChoice(choices, x.key) === "later");
    slots.push({ order: order(c.copy), note: replaced ? replaced.later.note : c.copy.note });
  }
  const renamed: Array<readonly [string, string]> = [];
  for (const c of plan.clashes) {
    if (clashChoice(choices, c.key) !== "both") continue;
    const id = freshId(c.id, taken);
    taken.add(id);
    renamed.push([c.id, id]);
    slots.push({ order: order(c.later), note: { ...c.later.note, id } });
  }
  slots.sort((a, b) => a.order - b.order);
  const notes = slots.map((s) => s.note);
  return { notes, renamed, droppedCopies, overDeviceLimit: notes.length > LIMITS.notes };
}

/** The combined notes as a notes export. */
export function mergedExport(result: MergeResult, today: Date): string {
  return exportNotes(result.notes, today.toISOString().slice(0, 10));
}

/** Keeps only choices that still match the plan, so a stale choice never applies to another clash. */
export function pruneChoices(plan: MergePlan, choices: Choices): Choices {
  const clashKeys = new Set(plan.clashes.map((c) => c.key));
  const copyKeys = new Set(plan.copies.map((c) => c.key));
  const clashes: Record<string, ClashChoice> = {};
  for (const [k, v] of Object.entries(choices.clashes)) if (clashKeys.has(k) && CLASH_CHOICES.includes(v)) clashes[k] = v;
  return { clashes, dropCopies: choices.dropCopies.filter((k) => copyKeys.has(k)) };
}
