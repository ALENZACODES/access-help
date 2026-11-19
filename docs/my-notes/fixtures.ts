import type { MyNote } from './organise.js';

export function note(over: Partial<MyNote> = {}): MyNote {
  return { id: 'n1', lat: 43.85, lon: -79.43, name: 'Sample Library', wheelchair: 'yes', source: 'own visit', licence: 'CC0-1.0', observedOn: '2026-11-10', ...over };
}

export function notes(): MyNote[] {
  return [
    note(),
    note({ id: 'n2', name: 'Café Exemple', wheelchair: 'limited', observedOn: '2026-10-02', source: 'field notes' }),
    note({ id: 'n3', name: null, wheelchair: 'UNKNOWN', observedOn: '2026-11-12', licence: 'ODbL-1.0' }),
    note({ id: 'n4', name: 'Arena', wheelchair: 'no', observedOn: '2025-12-30' }),
  ];
}
