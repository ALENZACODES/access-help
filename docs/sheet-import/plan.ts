/**
 * Decides what bringing a sheet in would do to the observations already saved on the device,
 * before anything is written. Nothing here writes; the screen applies the plan only after the
 * person confirms.
 */
import type { ParsedRow, SheetRecord } from './row.js';

export type PlanAction = 'add' | 'replace' | 'same' | 'over-limit';

export interface PlanItem {
  line: number;
  record: SheetRecord;
  action: PlanAction;
  /** Fields that differ from the saved observation, for a replace. */
  changed: (keyof SheetRecord)[];
}

export interface PlanCounts {
  rows: number;
  add: number;
  replace: number;
  same: number;
  overLimit: number;
  rejected: number;
}

export interface ImportPlan {
  items: PlanItem[];
  counts: PlanCounts;
  /** The observations to save, in sheet order: adds and replaces only. */
  toSave: SheetRecord[];
  /** How many observations the device would hold afterwards. */
  totalAfter: number;
}

const COMPARED: readonly (keyof SheetRecord)[] = ['lat', 'lon', 'name', 'wheelchair', 'source', 'licence', 'observedOn'];

export function changedFields(before: SheetRecord, after: SheetRecord): (keyof SheetRecord)[] {
  return COMPARED.filter((key) => before[key] !== after[key]);
}

export function planImport(parsed: readonly ParsedRow[], existing: readonly SheetRecord[], maxSaved: number): ImportPlan {
  const byId = new Map(existing.map((record) => [record.id, record] as const));
  const items: PlanItem[] = [];
  const toSave: SheetRecord[] = [];
  const counts: PlanCounts = { rows: parsed.length, add: 0, replace: 0, same: 0, overLimit: 0, rejected: 0 };
  let total = existing.length;
  for (const row of parsed) {
    if (!row.ok) {
      counts.rejected += 1;
      continue;
    }
    const before = byId.get(row.record.id);
    if (before !== undefined) {
      const changed = changedFields(before, row.record);
      if (changed.length === 0) {
        counts.same += 1;
        items.push({ line: row.line, record: row.record, action: 'same', changed });
      } else {
        counts.replace += 1;
        toSave.push(row.record);
        items.push({ line: row.line, record: row.record, action: 'replace', changed });
      }
      continue;
    }
    if (total >= maxSaved) {
      counts.overLimit += 1;
      items.push({ line: row.line, record: row.record, action: 'over-limit', changed: [] });
      continue;
    }
    total += 1;
    counts.add += 1;
    toSave.push(row.record);
    items.push({ line: row.line, record: row.record, action: 'add', changed: [] });
  }
  return { items, counts, toSave, totalAfter: total };
}

/** The saved list after the plan is applied: replaced in place, adds at the end. */
export function applyPlan(existing: readonly SheetRecord[], plan: ImportPlan): SheetRecord[] {
  const replacements = new Map(plan.items.filter((i) => i.action === 'replace').map((i) => [i.record.id, i.record] as const));
  const out = existing.map((record) => replacements.get(record.id) ?? record);
  for (const item of plan.items) if (item.action === 'add') out.push(item.record);
  return out;
}
