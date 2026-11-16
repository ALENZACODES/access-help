import { parseChecklist, MAX_CHECKLIST_PLACES, type Checklist } from "./checklist";
import { LIMITS } from "./model";
import { parseNeeds } from "./needs";
import { MAX_SHORTLIST, parseShortlist } from "./shortlist";
import { hasRequirement, type Requirement } from "./filter";

/**
 * Backup of a person's own lists: must-haves, shortlist and the notes from
 * "what I asked". It is plain JSON text, kept apart from the notes export so a
 * person can move either one on its own. Nothing is sent anywhere.
 */
export const BACKUP_FORMAT = "app-lists";
export const BACKUP_VERSION = 1;

export interface Lists {
  readonly needs: Requirement;
  readonly shortlist: readonly string[];
  readonly checklist: Checklist;
}

export function exportLists(lists: Lists, exportedOn: string): string {
  return JSON.stringify(
    { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedOn, needs: lists.needs, shortlist: lists.shortlist, checklist: lists.checklist },
    null,
    2,
  );
}

export type BackupError = "empty" | "too-large" | "not-json" | "wrong-format" | "wrong-version";

export type BackupResult =
  | { readonly error: BackupError }
  | { readonly error: undefined; readonly lists: Lists };

/** Reads backup text. Every part goes through the same checks as stored data, so bad parts are dropped. */
export function importLists(text: string): BackupResult {
  if (text.trim() === "") return { error: "empty" };
  if (text.length > LIMITS.importChars) return { error: "too-large" };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: "not-json" };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return { error: "wrong-format" };
  const o = data as Record<string, unknown>;
  if (o["format"] !== BACKUP_FORMAT) return { error: "wrong-format" };
  if (o["version"] !== BACKUP_VERSION) return { error: "wrong-version" };
  return {
    error: undefined,
    lists: {
      needs: parseNeeds(JSON.stringify(o["needs"] ?? null)),
      shortlist: parseShortlist(JSON.stringify(o["shortlist"] ?? null)),
      checklist: parseChecklist(JSON.stringify(o["checklist"] ?? null)),
    },
  };
}

export interface Merged {
  readonly lists: Lists;
  /** How many places, must-haves and notes came from the backup. */
  readonly added: { readonly needs: number; readonly shortlist: number; readonly notes: number };
}

/**
 * What is already on this device wins. Must-haves are only taken when none are
 * saved, shortlist places are added up to the limit, and notes for a place or
 * detail that already has one are kept as they are.
 */
export function mergeLists(current: Lists, incoming: Lists): Merged {
  const takeNeeds = !hasRequirement(current.needs);
  const needs = takeNeeds ? incoming.needs : current.needs;
  const shortlist = [...current.shortlist];
  for (const id of incoming.shortlist) {
    if (shortlist.length >= MAX_SHORTLIST) break;
    if (!shortlist.includes(id)) shortlist.push(id);
  }
  const checklist: Record<string, Record<string, unknown>> = {};
  for (const [id, entries] of Object.entries(current.checklist)) checklist[id] = { ...entries };
  let notes = 0;
  for (const [id, entries] of Object.entries(incoming.checklist)) {
    if (!(id in checklist) && Object.keys(checklist).length >= MAX_CHECKLIST_PLACES) continue;
    const mine = checklist[id] ?? {};
    for (const [key, entry] of Object.entries(entries)) {
      if (!(key in mine)) {
        mine[key] = entry;
        notes++;
      }
    }
    checklist[id] = mine;
  }
  return {
    lists: { needs, shortlist, checklist: checklist as Checklist },
    added: {
      needs: takeNeeds ? Object.keys(incoming.needs).length : 0,
      shortlist: shortlist.length - current.shortlist.length,
      notes,
    },
  };
}
