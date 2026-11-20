/**
 * One sitting of adding observations to OpenStreetMap by hand. The session only records what
 * the person says happened to each observation. "Added" means "I say I added this": the App
 * cannot see OpenStreetMap and never treats the word as proof.
 */
import { isQueueOrder, type Queue, type QueueOrder } from './queue.js';

export const SKIP_REASONS = ['already-on-map', 'could-not-find', 'not-sure', 'map-is-newer', 'other'] as const;
export type SkipReason = (typeof SKIP_REASONS)[number];

export type Outcome =
  | { kind: 'added'; changeset: string | null }
  | { kind: 'skipped'; reason: SkipReason }
  | { kind: 'later' };

export type OutcomeKind = Outcome['kind'];

export interface Session {
  version: 1;
  /** The day the sitting began, YYYY-MM-DD. */
  startedOn: string;
  order: QueueOrder;
  ids: string[];
  outcomes: Record<string, Outcome>;
  /** Index of the observation on screen. Equal to ids.length when the person is at the summary. */
  at: number;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const CHANGESET = /^[1-9]\d{0,11}$/;

export function isSkipReason(value: unknown): value is SkipReason {
  return typeof value === 'string' && (SKIP_REASONS as readonly string[]).includes(value);
}

export function beginSession(queue: Queue, today: string): Session | null {
  if (queue.ids.length === 0) return null;
  return { version: 1, startedOn: today, order: queue.order, ids: [...queue.ids], outcomes: {}, at: 0 };
}

export function currentId(session: Session): string | null {
  return session.ids[session.at] ?? null;
}

export function atSummary(session: Session): boolean {
  return session.at >= session.ids.length;
}

function clampAt(session: Session, at: number): number {
  return Math.min(Math.max(0, Math.trunc(at)), session.ids.length);
}

export function goTo(session: Session, at: number): Session {
  return { ...session, at: clampAt(session, at) };
}

export function goNext(session: Session): Session {
  return goTo(session, session.at + 1);
}

export function goBack(session: Session): Session {
  return goTo(session, session.at - 1);
}

/** The first observation with no outcome yet, at or after the start. Null when every one has an outcome. */
export function firstOpen(session: Session): number | null {
  const index = session.ids.findIndex((id) => session.outcomes[id] === undefined);
  return index < 0 ? null : index;
}

/**
 * Records what the person says happened and moves to the next observation. An id that is not
 * in the sitting is ignored. A changeset number is kept only when it is a plain number.
 */
export function setOutcome(session: Session, id: string, outcome: Outcome): Session {
  if (!session.ids.includes(id)) return session;
  const clean: Outcome =
    outcome.kind === 'added' ? { kind: 'added', changeset: outcome.changeset !== null && CHANGESET.test(outcome.changeset) ? outcome.changeset : null } : outcome;
  const next = { ...session, outcomes: { ...session.outcomes, [id]: clean } };
  return id === currentId(session) ? goNext(next) : next;
}

/** Takes an outcome back and returns to that observation. */
export function clearOutcome(session: Session, id: string): Session {
  const index = session.ids.indexOf(id);
  if (index < 0 || session.outcomes[id] === undefined) return session;
  const outcomes = { ...session.outcomes };
  delete outcomes[id];
  return { ...session, outcomes, at: index };
}

export interface SessionCounts {
  total: number;
  added: number;
  skipped: number;
  later: number;
  open: number;
}

export function sessionCounts(session: Session): SessionCounts {
  const counts: SessionCounts = { total: session.ids.length, added: 0, skipped: 0, later: 0, open: 0 };
  for (const id of session.ids) {
    const outcome = session.outcomes[id];
    if (outcome === undefined) counts.open += 1;
    else counts[outcome.kind] += 1;
  }
  return counts;
}

export function idsWith(session: Session, kind: OutcomeKind): string[] {
  return session.ids.filter((id) => session.outcomes[id]?.kind === kind);
}

/** Drops observations that are no longer saved, keeps the place in the list as near as it can. */
export function keepSaved(session: Session, savedIds: ReadonlySet<string>): Session {
  const current = currentId(session);
  const ids = session.ids.filter((id) => savedIds.has(id));
  if (ids.length === session.ids.length) return session;
  const outcomes: Record<string, Outcome> = {};
  for (const id of ids) {
    const outcome = session.outcomes[id];
    if (outcome !== undefined) outcomes[id] = outcome;
  }
  const kept = current === null ? -1 : ids.indexOf(current);
  const before = session.ids.slice(0, session.at).filter((id) => savedIds.has(id)).length;
  return { ...session, ids, outcomes, at: kept >= 0 ? kept : Math.min(before, ids.length) };
}

function cleanOutcome(value: unknown): Outcome | null {
  if (typeof value !== 'object' || value === null) return null;
  const item = value as Record<string, unknown>;
  if (item.kind === 'later') return { kind: 'later' };
  if (item.kind === 'skipped') return isSkipReason(item.reason) ? { kind: 'skipped', reason: item.reason } : null;
  if (item.kind === 'added') return { kind: 'added', changeset: typeof item.changeset === 'string' && CHANGESET.test(item.changeset) ? item.changeset : null };
  return null;
}

/** Reads a stored session. Anything that is not a well-formed session gives null. */
export function cleanSession(value: unknown, maxIds: number): Session | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (item.version !== 1 || typeof item.startedOn !== 'string' || !DAY.test(item.startedOn) || !isQueueOrder(item.order) || !Array.isArray(item.ids)) return null;
  const ids: string[] = [];
  for (const id of item.ids) {
    if (typeof id === 'string' && id !== '' && id.length <= 200 && !ids.includes(id)) ids.push(id);
  }
  if (ids.length === 0 || ids.length > maxIds) return null;
  const outcomes: Record<string, Outcome> = {};
  const stored = typeof item.outcomes === 'object' && item.outcomes !== null && !Array.isArray(item.outcomes) ? (item.outcomes as Record<string, unknown>) : {};
  for (const id of ids) {
    const outcome = Object.prototype.hasOwnProperty.call(stored, id) ? cleanOutcome(stored[id]) : null;
    if (outcome !== null) outcomes[id] = outcome;
  }
  const at = typeof item.at === 'number' && Number.isFinite(item.at) ? Math.min(Math.max(0, Math.trunc(item.at)), ids.length) : 0;
  return { version: 1, startedOn: item.startedOn, order: item.order, ids, outcomes, at };
}
