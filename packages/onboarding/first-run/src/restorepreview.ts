import type { Locale } from "../../switch-first/src/index";
import { pruneChecklist, type Checklist } from "./checklist";
import { importLists, mergeLists, type BackupError, type Lists, type Merged } from "./backup";
import { groupPlaces } from "./places";
import { pruneShortlist } from "./shortlist";
import type { Note } from "./model";

/**
 * Reads backup text and works out what restoring it would do, using the same
 * steps as the restore itself, so the preview and the result cannot disagree.
 * Nothing is saved here. Only places that exist on this device can take part;
 * the rest of the backup is counted as left out, not guessed at.
 */
export interface RestorePreview {
  readonly error: undefined;
  /** Must-haves in the backup. */
  readonly needsInFile: number;
  /** Must-haves that would be taken: all of them when none are saved here, otherwise none. */
  readonly needsTaken: number;
  readonly deviceHasNeeds: boolean;
  readonly shortlistInFile: number;
  /** In the backup, but the place is not on this device. */
  readonly shortlistNoPlace: number;
  readonly shortlistAdded: number;
  readonly notesInFile: number;
  readonly notesNoPlace: number;
  readonly notesAdded: number;
}

export type PrepareResult =
  | { readonly error: BackupError }
  | { readonly error: undefined; readonly merged: Merged; readonly preview: RestorePreview };

const countEntries = (c: Checklist): number => Object.values(c).reduce((n, p) => n + Object.keys(p).length, 0);

export function prepareRestore(current: Lists, notes: readonly Note[], text: string, locale: Locale): PrepareResult {
  const r = importLists(text);
  if (r.error) return { error: r.error };
  const places = groupPlaces(notes, locale);
  const incoming: Lists = { ...r.lists, shortlist: pruneShortlist(r.lists.shortlist, places), checklist: pruneChecklist(r.lists.checklist, places) };
  const merged = mergeLists(current, incoming);
  const inFile = countEntries(r.lists.checklist);
  const onDevice = countEntries(incoming.checklist);
  const needsInFile = Object.keys(r.lists.needs).length;
  const preview: RestorePreview = {
    error: undefined,
    needsInFile,
    needsTaken: merged.added.needs,
    deviceHasNeeds: Object.keys(current.needs).length > 0,
    shortlistInFile: r.lists.shortlist.length,
    shortlistNoPlace: r.lists.shortlist.length - incoming.shortlist.length,
    shortlistAdded: merged.added.shortlist,
    notesInFile: inFile,
    notesNoPlace: inFile - onDevice,
    notesAdded: merged.added.notes,
  };
  return { error: undefined, merged, preview };
}

/** True when restoring would change nothing. */
export function changesNothing(p: RestorePreview): boolean {
  return p.needsTaken === 0 && p.shortlistAdded === 0 && p.notesAdded === 0;
}
