import { describe, expect, it } from 'vitest';
import { mixedSession, notes, started, TODAY } from './fixtures.js';
import { buildQueue } from './queue.js';
import { atSummary, beginSession, cleanSession, clearOutcome, currentId, firstOpen, goBack, goNext, goTo, idsWith, isSkipReason, keepSaved, sessionCounts, setOutcome } from './session.js';

describe('a sitting', () => {
  it('begins at the first observation with no outcomes', () => {
    const session = started();
    expect(session).toEqual({ version: 1, startedOn: TODAY, order: 'newest', ids: ['a3', 'a1', 'a4', 'a2'], outcomes: {}, at: 0 });
    expect(currentId(session)).toBe('a3');
  });
  it('does not begin when nothing is ready', () => {
    expect(beginSession(buildQueue([], new Set(), 'newest'), TODAY)).toBeNull();
  });
  it('records an outcome and moves on', () => {
    const next = setOutcome(started(), 'a3', { kind: 'later' });
    expect(next.outcomes).toEqual({ a3: { kind: 'later' } });
    expect(currentId(next)).toBe('a1');
  });
  it('does not move when the outcome is for another observation', () => {
    const next = setOutcome(started(), 'a2', { kind: 'skipped', reason: 'not-sure' });
    expect(next.at).toBe(0);
    expect(next.outcomes.a2).toEqual({ kind: 'skipped', reason: 'not-sure' });
  });
  it('ignores an id that is not in the sitting', () => {
    const session = started();
    expect(setOutcome(session, 'u1', { kind: 'later' })).toBe(session);
  });
  it('keeps a changeset number only when it is a plain number', () => {
    expect(setOutcome(started(), 'a3', { kind: 'added', changeset: '123456' }).outcomes.a3).toEqual({ kind: 'added', changeset: '123456' });
    for (const bad of ['', '0', '12a', '-4', ' 12', '1234567890123']) {
      expect(setOutcome(started(), 'a3', { kind: 'added', changeset: bad }).outcomes.a3).toEqual({ kind: 'added', changeset: null });
    }
  });
  it('reaches the summary after the last observation', () => {
    let session = started();
    for (const id of [...session.ids]) session = setOutcome(session, id, { kind: 'later' });
    expect(atSummary(session)).toBe(true);
    expect(currentId(session)).toBeNull();
  });
  it('steps forward and back without leaving the list', () => {
    const session = started();
    expect(goBack(session).at).toBe(0);
    expect(goNext(goNext(session)).at).toBe(2);
    expect(goTo(session, 99).at).toBe(4);
    expect(goTo(session, -3).at).toBe(0);
    expect(goTo(session, 1.9).at).toBe(1);
  });
  it('takes an outcome back and returns to that observation', () => {
    const session = clearOutcome(mixedSession(), 'a1');
    expect(session.outcomes.a1).toBeUndefined();
    expect(currentId(session)).toBe('a1');
    expect(session.outcomes.a3).toEqual({ kind: 'added', changeset: '123456' });
  });
  it('changes nothing when there is no outcome to take back', () => {
    const session = mixedSession();
    expect(clearOutcome(session, 'a2')).toBe(session);
    expect(clearOutcome(session, 'nope')).toBe(session);
  });
  it('counts each outcome and what is still open', () => {
    expect(sessionCounts(mixedSession())).toEqual({ total: 4, added: 1, skipped: 1, later: 1, open: 1 });
    expect(sessionCounts(started())).toEqual({ total: 4, added: 0, skipped: 0, later: 0, open: 4 });
  });
  it('finds the first observation with no outcome', () => {
    expect(firstOpen(mixedSession())).toBe(3);
    expect(firstOpen(started())).toBe(0);
    expect(firstOpen(setOutcome(mixedSession(), 'a2', { kind: 'later' }))).toBeNull();
  });
  it('lists ids by outcome, in sitting order', () => {
    expect(idsWith(mixedSession(), 'added')).toEqual(['a3']);
    expect(idsWith(mixedSession(), 'later')).toEqual(['a4']);
    expect(idsWith(started(), 'skipped')).toEqual([]);
  });
  it('does not change the session it was given', () => {
    const session = started();
    const copy = JSON.stringify(session);
    setOutcome(session, 'a3', { kind: 'later' });
    goNext(session);
    expect(JSON.stringify(session)).toBe(copy);
  });
});

describe('a sitting when observations are removed', () => {
  const saved = (ids: string[]) => new Set(ids);
  it('is unchanged when everything is still saved', () => {
    const session = mixedSession();
    expect(keepSaved(session, saved(notes().map((r) => r.id)))).toBe(session);
  });
  it('drops a removed observation and its outcome, and stays on the same one', () => {
    const session = keepSaved(goTo(mixedSession(), 2), saved(['a3', 'a4', 'a2']));
    expect(session.ids).toEqual(['a3', 'a4', 'a2']);
    expect(session.outcomes.a1).toBeUndefined();
    expect(currentId(session)).toBe('a4');
  });
  it('moves to the one that took its place when the current one is removed', () => {
    const session = keepSaved(goTo(mixedSession(), 1), saved(['a3', 'a4', 'a2']));
    expect(currentId(session)).toBe('a4');
  });
  it('stays at the summary when it was there', () => {
    const session = keepSaved(goTo(mixedSession(), 4), saved(['a3', 'a2']));
    expect(atSummary(session)).toBe(true);
  });
  it('can end up with nothing', () => {
    expect(keepSaved(mixedSession(), saved([])).ids).toEqual([]);
  });
});

describe('reading a stored sitting', () => {
  it('reads back what was stored', () => {
    const session = mixedSession();
    expect(cleanSession(JSON.parse(JSON.stringify(session)), 200)).toEqual(session);
  });
  it('refuses anything that is not a sitting', () => {
    for (const bad of [null, 'x', 4, [], {}, { version: 2 }, { version: 1, startedOn: 'today', order: 'newest', ids: ['a'] }, { version: 1, startedOn: TODAY, order: 'random', ids: ['a'] }, { version: 1, startedOn: TODAY, order: 'newest', ids: [] }]) {
      expect(cleanSession(bad, 200)).toBeNull();
    }
  });
  it('refuses a list longer than one sitting holds', () => {
    expect(cleanSession({ version: 1, startedOn: TODAY, order: 'newest', ids: ['a', 'b', 'c'], outcomes: {}, at: 0 }, 2)).toBeNull();
  });
  it('drops ids that are not text, are empty or repeat', () => {
    const session = cleanSession({ version: 1, startedOn: TODAY, order: 'oldest', ids: ['a', 7, '', 'a', 'b'], outcomes: {}, at: 0 }, 200);
    expect(session?.ids).toEqual(['a', 'b']);
  });
  it('drops outcomes it does not know, and outcomes for ids not in the list', () => {
    const session = cleanSession(
      { version: 1, startedOn: TODAY, order: 'newest', ids: ['a', 'b', 'c'], outcomes: { a: { kind: 'accepted' }, b: { kind: 'skipped', reason: 'bored' }, c: { kind: 'added', changeset: 'x<y' }, z: { kind: 'later' } }, at: 1 },
      200,
    );
    expect(session?.outcomes).toEqual({ c: { kind: 'added', changeset: null } });
  });
  it('does not read outcomes off the object prototype', () => {
    const session = cleanSession({ version: 1, startedOn: TODAY, order: 'newest', ids: ['constructor', 'toString'], outcomes: {}, at: 0 }, 200);
    expect(session?.outcomes).toEqual({});
  });
  it('keeps the position inside the list', () => {
    const base = { version: 1, startedOn: TODAY, order: 'newest', ids: ['a', 'b'], outcomes: {} };
    expect(cleanSession({ ...base, at: 99 }, 200)?.at).toBe(2);
    expect(cleanSession({ ...base, at: -1 }, 200)?.at).toBe(0);
    expect(cleanSession({ ...base, at: 'x' }, 200)?.at).toBe(0);
    expect(cleanSession({ ...base, at: Number.NaN }, 200)?.at).toBe(0);
  });
  it('knows the skip reasons', () => {
    expect(isSkipReason('could-not-find')).toBe(true);
    expect(isSkipReason('tired')).toBe(false);
  });
});
