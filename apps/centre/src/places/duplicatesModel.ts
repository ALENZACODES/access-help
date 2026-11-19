/**
 * Builds what the saved-twice screen shows and carries out its two actions: keep one note of a
 * group (removing the others), and put the removed notes back. The grouping is pure. Removing
 * happens only when the screen calls keepOne after the person has chosen and confirmed.
 */
import {
  DUPLICATE_DEFAULT_DISTANCE,
  DUPLICATE_DISTANCE_CHOICES,
  duplicateCautionTexts,
  duplicateKindAdvice,
  duplicateKindLabel,
  duplicateLinkText,
  duplicateNoteLine,
  duplicateSummaryText,
  groupOwnNotes,
  planKeepOwnNote,
  reportOwnGroups,
  type OwnGroupKind,
  type OwnNoteGroup,
} from "./docs-bridge.js";
import type { DraftStore } from "./store.js";
import type { Language, PlaceRecord } from "./types.js";

export interface DuplicateMember {
  record: PlaceRecord;
  line: string;
  suggested: boolean;
}

export interface DuplicateGroupView {
  key: string;
  group: OwnNoteGroup;
  kind: OwnGroupKind;
  kindLabel: string;
  advice: string;
  cautions: string[];
  links: string[];
  members: DuplicateMember[];
  /** Null when the notes disagree and the App suggests nothing. */
  suggestedKeep: string | null;
}

export interface DuplicatesView {
  summary: string;
  groups: DuplicateGroupView[];
}

export function cleanDistance(value: number): number {
  return (DUPLICATE_DISTANCE_CHOICES as readonly number[]).includes(value) ? value : DUPLICATE_DEFAULT_DISTANCE;
}

export function buildDuplicatesView(records: readonly PlaceRecord[], distance: number, hidden: ReadonlySet<string>, language: Language): DuplicatesView {
  const metres = cleanDistance(distance);
  const report = reportOwnGroups(groupOwnNotes(records, metres), records.length, metres);
  const groups: DuplicateGroupView[] = report.groups
    .filter(({ group }) => !hidden.has(group.key))
    .map(({ group, advice }) => ({
      key: group.key,
      group,
      kind: advice.kind,
      kindLabel: duplicateKindLabel(advice.kind, language),
      advice: duplicateKindAdvice(advice.kind, language),
      cautions: duplicateCautionTexts(advice, language),
      links: group.links.map((link) => duplicateLinkText(link, language)),
      members: group.notes.map((note) => ({ record: note as PlaceRecord, line: duplicateNoteLine(note, language), suggested: note.id === advice.suggestedKeep })),
      suggestedKeep: advice.suggestedKeep,
    }));
  return { summary: duplicateSummaryText(report, language), groups };
}

export type KeepOutcome = { ok: true; removed: PlaceRecord[] } | { ok: false };

/** Keeps one note of the group and removes the others from the device. Does nothing for an id that is not in the group. */
export function keepOne(store: Pick<DraftStore, "remove">, group: OwnNoteGroup, keepId: string): KeepOutcome {
  const plan = planKeepOwnNote(group, keepId);
  if (plan === null) return { ok: false };
  for (const note of plan.remove) store.remove(note.id);
  return { ok: true, removed: plan.remove as PlaceRecord[] };
}

/** Saves the removed notes again. Returns how many came back, or null when the device refused. */
export function putBack(store: Pick<DraftStore, "add">, removed: readonly PlaceRecord[]): number | null {
  let count = 0;
  for (const record of removed) {
    if (!store.add(record).ok) return count === 0 ? null : count;
    count += 1;
  }
  return count;
}

export { DUPLICATE_DEFAULT_DISTANCE, DUPLICATE_DISTANCE_CHOICES };
