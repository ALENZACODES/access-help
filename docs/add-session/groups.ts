/**
 * Groups the observations a person says they added by the changeset number they gave, so each
 * group can be read back against the map later. A group with no number holds the ones added
 * without one.
 */
import { idsWith, type Session } from './session.js';
import { haversineMetres } from '../presubmit/geo.js';
import { changesetDraft, type ChangesetDraft, type TagRecord } from '../osm-tags/index.js';
import type { PreLang } from '../presubmit/text.js';

export interface AddedGroup {
  /** The changeset number the person gave, or null. */
  changeset: string | null;
  ids: string[];
  /** The largest straight-line distance between two places in the group, in metres. */
  spanMetres: number;
  draft: ChangesetDraft;
}

/** A group wider than this is worth a second look: one changeset usually covers one area. */
export const WIDE_GROUP_METRES = 25_000;

export function spanMetres(records: readonly TagRecord[]): number {
  let max = 0;
  for (let i = 0; i < records.length; i += 1) {
    for (let j = i + 1; j < records.length; j += 1) {
      const a = records[i];
      const b = records[j];
      if (a !== undefined && b !== undefined) max = Math.max(max, haversineMetres(a, b));
    }
  }
  return Math.round(max);
}

export function addedGroups(session: Session, records: readonly TagRecord[], lang: PreLang): AddedGroup[] {
  const byId = new Map(records.map((record) => [record.id, record]));
  const groups = new Map<string, string[]>();
  for (const id of idsWith(session, 'added')) {
    if (!byId.has(id)) continue;
    const outcome = session.outcomes[id];
    const key = outcome?.kind === 'added' && outcome.changeset !== null ? outcome.changeset : '';
    groups.set(key, [...(groups.get(key) ?? []), id]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : Number(a) - Number(b)))
    .map(([key, ids]) => {
      const members = ids.map((id) => byId.get(id)).filter((record): record is TagRecord => record !== undefined);
      return { changeset: key === '' ? null : key, ids, spanMetres: spanMetres(members), draft: changesetDraft(members, lang) };
    });
}

export function isWide(group: AddedGroup): boolean {
  return group.spanMetres > WIDE_GROUP_METRES;
}
