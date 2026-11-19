import type { RevisitPlace, RevisitRecord } from './reasons.js';

export const TODAY = '2026-11-18';

export function rec(over: Partial<RevisitRecord> = {}): RevisitRecord {
  return { id: 'p1', lat: 43.85, lon: -79.43, name: 'Sample Library', wheelchair: 'yes', source: 'sample pack', licence: 'CC0-1.0', observedOn: '2026-10-01', ...over };
}

export function place(over: Partial<RevisitRecord> = {}, conflict: RevisitPlace['conflict'] = null): RevisitPlace {
  return { record: rec(over), conflict };
}
