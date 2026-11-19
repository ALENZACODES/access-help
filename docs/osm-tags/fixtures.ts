import type { TagRecord } from './tags.js';

export function obs(over: Partial<TagRecord> = {}): TagRecord {
  return { id: 'obs-1', lat: 43.85, lon: -79.43, name: 'Sample Library', wheelchair: 'yes', source: 'own visit', licence: 'CC0-1.0', observedOn: '2026-11-10', ...over };
}

export function unknownObs(): TagRecord {
  return obs({ id: 'obs-2', name: null, wheelchair: 'UNKNOWN', observedOn: '2026-10-01' });
}

/** Tags as an editor's text view shows them, with a differing status and a newer check date. */
export const MAP_TEXT = ['name=Sample Public Library', 'amenity=library', 'wheelchair=limited', 'check_date:wheelchair=2026-11-15', 'toilets:wheelchair=yes'].join('\n');
