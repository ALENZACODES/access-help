import type { PlanRecord } from './sources.js';

export const TODAY = '2026-11-19';

export function rec(over: Partial<PlanRecord> = {}): PlanRecord {
  return { id: 'r1', name: 'Sample Library', wheelchair: 'yes', source: 'own visit', licence: 'CC0-1.0', observedOn: '2026-11-10', ...over };
}

/** Two CC0 records from one source and two ODbL records from one pack, written two ways. */
export function mixed(): PlanRecord[] {
  return [
    rec(),
    rec({ id: 'r2', name: null, wheelchair: 'UNKNOWN', observedOn: '2026-10-01' }),
    rec({ id: 'r3', name: 'Sample Arena', wheelchair: 'no', source: 'Sample open pack', licence: 'ODbL-1.0', observedOn: '2026-09-15' }),
    rec({ id: 'r4', name: 'Sample Café', wheelchair: 'limited', source: 'sample open  pack', licence: 'ODbL-1.0', observedOn: '2026-09-20' }),
  ];
}

/** The mixed set plus one record under a licence the App does not take and one with no source. */
export function awkward(): PlanRecord[] {
  return [...mixed(), rec({ id: 'r5', source: 'Other list', licence: 'CC-BY-4.0' }), rec({ id: 'r6', source: '   ', wheelchair: 'maybe' })];
}

export function manySources(n: number, licence = 'ODbL-1.0'): PlanRecord[] {
  return Array.from({ length: n }, (_, i) => rec({ id: `m${i}`, source: `Pack ${String.fromCharCode(65 + i)}`, licence }));
}
