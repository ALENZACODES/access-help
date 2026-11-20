import { buildQueue, type QueueOrder } from './queue.js';
import { beginSession, setOutcome, type Session } from './session.js';
import type { TagRecord } from '../osm-tags/index.js';

export const TODAY = '2026-11-19';

export function obs(over: Partial<TagRecord> = {}): TagRecord {
  return { id: 'a1', lat: 43.85, lon: -79.43, name: 'Sample Library', wheelchair: 'yes', source: 'own visit', licence: 'CC0-1.0', observedOn: '2026-11-10', ...over };
}

/** Four ready observations in two clusters, one UNKNOWN and one with no source. */
export function notes(): TagRecord[] {
  return [
    obs(),
    obs({ id: 'a2', name: 'Sample Arena', wheelchair: 'no', lat: 43.851, lon: -79.431, observedOn: '2026-11-08' }),
    obs({ id: 'a3', name: 'Sample Café', wheelchair: 'limited', lat: 44.3, lon: -78.32, observedOn: '2026-11-12' }),
    obs({ id: 'a4', name: null, wheelchair: 'yes', lat: 44.301, lon: -78.321, observedOn: '2026-11-09' }),
    obs({ id: 'u1', name: 'Sample Pool', wheelchair: 'UNKNOWN', observedOn: '2026-11-11' }),
    obs({ id: 'n1', name: 'Sample Rink', source: '  ', observedOn: '2026-11-07' }),
  ];
}

export function started(order: QueueOrder = 'newest', marked: readonly string[] = []): Session {
  const session = beginSession(buildQueue(notes(), new Set(marked), order), TODAY);
  if (session === null) throw new Error('fixture has nothing ready');
  return session;
}

/** A sitting with one of each outcome and one left open. Newest first: a3, a1, a4, a2. */
export function mixedSession(): Session {
  let session = started();
  session = setOutcome(session, 'a3', { kind: 'added', changeset: '123456' });
  session = setOutcome(session, 'a1', { kind: 'skipped', reason: 'map-is-newer' });
  session = setOutcome(session, 'a4', { kind: 'later' });
  return session;
}
