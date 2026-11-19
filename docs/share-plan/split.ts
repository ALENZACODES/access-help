/**
 * Works out how a set of records could go out as separate files, one per licence, so the
 * records that ask for nothing can travel without the duties of the others. It reads the licence
 * and source written on each record and nothing else.
 */
import { GUIDE_LICENCES, isGuideLicence, type Duty, type GuideLicence } from '../licence-guide/index.js';
import { tidySource, type PlanRecord } from './sources.js';

export type SplitKind = 'nothing' | 'one-file' | 'two-files';

export interface SplitPart {
  licence: GuideLicence;
  ids: string[];
  count: number;
  /** What sharing this part on its own asks for. Empty when nothing is asked. */
  duties: Duty[];
  /** Distinct sources in this part, in the order first seen. */
  sources: string[];
}

export interface SplitPlan {
  kind: SplitKind;
  parts: SplitPart[];
  /** Records under a licence the App does not take. They are in no part. */
  leftOutOther: string[];
  /** Records with an empty source. They are in no part, because nobody could credit them. */
  leftOutNoSource: string[];
  total: number;
}

function dutiesFor(licence: GuideLicence): Duty[] {
  return licence === 'ODbL-1.0' ? ['credit-sources', 'same-licence', 'keep-open'] : [];
}

export function splitPlan(records: readonly PlanRecord[]): SplitPlan {
  const leftOutOther: string[] = [];
  const leftOutNoSource: string[] = [];
  const byLicence = new Map<GuideLicence, { ids: string[]; sources: Map<string, string> }>();
  for (const record of records) {
    if (!isGuideLicence(record.licence)) {
      leftOutOther.push(record.id);
      continue;
    }
    const source = tidySource(record.source);
    if (source === '') {
      leftOutNoSource.push(record.id);
      continue;
    }
    let part = byLicence.get(record.licence);
    if (part === undefined) {
      part = { ids: [], sources: new Map() };
      byLicence.set(record.licence, part);
    }
    part.ids.push(record.id);
    if (!part.sources.has(source.toLowerCase())) part.sources.set(source.toLowerCase(), source);
  }
  const parts: SplitPart[] = [];
  for (const licence of GUIDE_LICENCES) {
    const part = byLicence.get(licence);
    if (part === undefined) continue;
    parts.push({ licence, ids: part.ids, count: part.ids.length, duties: dutiesFor(licence), sources: [...part.sources.values()] });
  }
  const kind: SplitKind = parts.length === 0 ? 'nothing' : parts.length === 1 ? 'one-file' : 'two-files';
  return { kind, parts, leftOutOther, leftOutNoSource, total: records.length };
}

/** The records of one part, in their original order. */
export function partRecords<T extends PlanRecord>(records: readonly T[], part: SplitPart): T[] {
  const ids = new Set(part.ids);
  return records.filter((record) => ids.has(record.id) && record.licence === part.licence);
}

export function partFor(plan: SplitPlan, licence: string): SplitPart | null {
  return plan.parts.find((part) => part.licence === licence) ?? null;
}

/** A file name stem for one part, such as "records-cc0-1.0-2026-11-19". */
export function partFileStem(part: SplitPart, today: string): string {
  return `records-${part.licence.toLowerCase()}-${today}`;
}

/** How many records are in some part. */
export function placedCount(plan: SplitPlan): number {
  return plan.parts.reduce((sum, part) => sum + part.count, 0);
}
