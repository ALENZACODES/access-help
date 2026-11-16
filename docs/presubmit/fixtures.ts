import type { CheckRecord } from './rules.js';

export const TODAY = '2026-11-16';

export function rec(over: Partial<CheckRecord> = {}): CheckRecord {
  return {
    id: 'r1',
    lat: 43.85123,
    lon: -79.43456,
    name: 'Sample Library',
    wheelchair: 'yes',
    source: 'own visit',
    licence: 'CC0-1.0',
    observedOn: '2026-11-01',
    ...over,
  };
}
