import type { NoteRecord } from './match.js';

export const TODAY = '2026-11-18';

/** One of my own observations. */
export function mine(over: Partial<NoteRecord> = {}): NoteRecord {
  return { id: 'm1', lat: 43.85, lon: -79.43, name: 'Sample Library', wheelchair: 'yes', source: 'own visit', licence: 'CC0-1.0', observedOn: '2026-11-10', ...over };
}

/** A pack place. By default it sits about 11 m north of mine(). */
export function pack(over: Partial<NoteRecord> = {}): NoteRecord {
  return { id: 'p1', lat: 43.8501, lon: -79.43, name: 'Sample Library', wheelchair: 'yes', source: 'sample pack', licence: 'ODbL-1.0', observedOn: '2026-10-01', ...over };
}
