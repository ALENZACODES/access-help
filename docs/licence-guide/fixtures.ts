import type { LicensedRecord } from './mix.js';

export const TODAY = '2026-11-19';

export function lic(over: Partial<LicensedRecord> = {}): LicensedRecord {
  return { id: 'r1', source: 'own visit', licence: 'CC0-1.0', observedOn: '2026-11-10', ...over };
}

export function mixed(): LicensedRecord[] {
  return [
    lic(),
    lic({ id: 'r2', observedOn: '2026-10-01' }),
    lic({ id: 'r3', source: 'Sample open pack', licence: 'ODbL-1.0', observedOn: '2026-09-15' }),
    lic({ id: 'r4', source: 'sample open  pack', licence: 'ODbL-1.0', observedOn: '2026-09-20' }),
  ];
}
