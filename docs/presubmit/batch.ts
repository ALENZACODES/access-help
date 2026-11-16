/** Runs the checks over every saved observation and orders them for a person to work through. */
import { nearPairs } from './geo.js';
import { checkRecord, NEAR_METRES, severityRank, type CheckRecord, type Finding, type Severity } from './rules.js';
import { osmTagsFor, type Tag } from './tags.js';

export type Worst = Severity | 'clear';

export interface CheckedItem {
  record: CheckRecord;
  findings: Finding[];
  tags: Tag[];
  worst: Worst;
}

export interface Counts {
  total: number;
  fix: number;
  look: number;
  note: number;
  clear: number;
}

export interface CheckReport {
  items: CheckedItem[];
  counts: Counts;
  byLicence: { licence: string; count: number }[];
}

function worstOf(findings: readonly Finding[]): Worst {
  let best: Worst = 'clear';
  for (const f of findings) {
    if (best === 'clear' || severityRank(f.severity) < severityRank(best)) best = f.severity;
  }
  return best;
}

function worstRank(worst: Worst): number {
  return worst === 'clear' ? 3 : severityRank(worst);
}

export function checkAll(records: readonly CheckRecord[], today: string): CheckReport {
  const pairs = nearPairs(records, NEAR_METRES);
  const items: CheckedItem[] = records.map((record) => {
    const findings = checkRecord(record, today, pairs.filter((p) => p.a === record.id || p.b === record.id));
    return { record, findings, tags: osmTagsFor(record), worst: worstOf(findings) };
  });
  items.sort(
    (x, y) =>
      worstRank(x.worst) - worstRank(y.worst) ||
      x.record.observedOn.localeCompare(y.record.observedOn) ||
      x.record.id.localeCompare(y.record.id),
  );
  const counts: Counts = { total: items.length, fix: 0, look: 0, note: 0, clear: 0 };
  for (const item of items) counts[item.worst] += 1;
  const licences = new Map<string, number>();
  for (const { record } of items) licences.set(record.licence, (licences.get(record.licence) ?? 0) + 1);
  const byLicence = [...licences.entries()]
    .map(([licence, count]) => ({ licence, count }))
    .sort((a, b) => a.licence.localeCompare(b.licence));
  return { items, counts, byLicence };
}

/** Records with no finding that needs fixing, in the order the report lists them. */
export function fixedFree(report: CheckReport): CheckRecord[] {
  return report.items.filter((item) => item.worst !== 'fix').map((item) => item.record);
}
