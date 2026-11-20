import { describe, expect, it } from 'vitest';
import { mixedSession, notes, started } from './fixtures.js';
import { WIDE_GROUP_METRES, addedGroups, isWide, spanMetres } from './groups.js';
import { setOutcome, type Session } from './session.js';

function allAdded(numbers: Record<string, string | null>): Session {
  let session = started();
  for (const id of [...session.ids]) session = setOutcome(session, id, { kind: 'added', changeset: numbers[id] ?? null });
  return session;
}

describe('what the person said they added, by changeset', () => {
  it('has no groups when nothing was added', () => {
    expect(addedGroups(started(), notes(), 'en')).toEqual([]);
  });
  it('puts one added observation in one group with a draft', () => {
    const [group] = addedGroups(mixedSession(), notes(), 'en');
    expect(group).toMatchObject({ changeset: '123456', ids: ['a3'], spanMetres: 0 });
    expect(group?.draft.comment).toBe('Wheelchair access for 1 place, seen in person on 2026-11-12.');
  });
  it('groups by the number given, smallest number first, no number last', () => {
    const groups = addedGroups(allAdded({ a3: '900', a1: '25', a4: '900', a2: null }), notes(), 'en');
    expect(groups.map((g) => [g.changeset, g.ids])).toEqual([
      ['25', ['a1']],
      ['900', ['a3', 'a4']],
      [null, ['a2']],
    ]);
  });
  it('measures the widest gap in a group', () => {
    const groups = addedGroups(allAdded({ a3: '900', a4: '900', a1: '25', a2: '25' }), notes(), 'en');
    expect(groups.map((g) => g.spanMetres)).toEqual([137, 137]);
    expect(groups.some(isWide)).toBe(false);
  });
  it('flags a group whose places are far apart', () => {
    const [group] = addedGroups(allAdded({ a3: '7', a1: '7', a4: '7', a2: '7' }), notes(), 'en');
    expect(group?.spanMetres).toBeGreaterThan(WIDE_GROUP_METRES);
    expect(group && isWide(group)).toBe(true);
  });
  it('leaves out an added observation that is no longer saved', () => {
    const groups = addedGroups(mixedSession(), notes().filter((r) => r.id !== 'a3'), 'en');
    expect(groups).toEqual([]);
  });
  it('drafts the comment in the language asked for', () => {
    expect(addedGroups(mixedSession(), notes(), 'fr')[0]?.draft.comment).toBe('Accès en fauteuil roulant pour 1 lieu, vu sur place le 2026-11-12.');
  });
  it('measures a span of zero for one place or none', () => {
    expect(spanMetres([])).toBe(0);
    expect(spanMetres(notes().slice(0, 1))).toBe(0);
    expect(spanMetres(notes().slice(0, 2))).toBe(137);
  });
});
