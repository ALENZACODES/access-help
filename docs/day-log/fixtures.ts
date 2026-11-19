import type { LogNote } from './days.js';

export const TODAY = '2026-11-19';

export function log(over: Partial<LogNote> = {}): LogNote {
  return { id: 'n1', lat: 43.85, lon: -79.43, name: 'Sample Library', wheelchair: 'yes', source: 'own visit', licence: 'CC0-1.0', observedOn: '2026-11-10', ...over };
}

/** Three days: two notes on the 10th, one on the 12th, one on 30 October, and one with a bad date. */
export function sample(): LogNote[] {
  return [
    log(),
    log({ id: 'n2', name: null, wheelchair: 'UNKNOWN', lat: 43.86, licence: 'ODbL-1.0', source: 'field notes' }),
    log({ id: 'n3', name: 'Arena', wheelchair: 'no', observedOn: '2026-11-12' }),
    log({ id: 'n4', name: 'Café Exemple', wheelchair: 'limited', observedOn: '2026-10-30' }),
    log({ id: 'n5', name: 'Odd Date', observedOn: 'last week' }),
  ];
}
