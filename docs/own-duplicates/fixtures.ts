import type { OwnNote } from './groups.js';

export function own(over: Partial<OwnNote> = {}): OwnNote {
  return { id: 'a', lat: 43.85, lon: -79.43, name: 'Sample Library', wheelchair: 'yes', source: 'own visit', licence: 'CC0-1.0', observedOn: '2026-11-10', ...over };
}

/** A second note about 11 m north of own(). */
export function near(over: Partial<OwnNote> = {}): OwnNote {
  return own({ id: 'b', lat: 43.8501, observedOn: '2026-11-12', ...over });
}
