import { describe, expect, it } from 'vitest';
import { changeCounts, finishWalk, walkChanges, walkForm } from './finish.js';
import { SEEN, TODAY, answered, complete, fresh, saved, short } from './fixtures.js';
import { beginWalk, goToStep, skipStep } from './walk.js';

describe('walkForm', () => {
  it('uses the day the walk began as the day measured', () => {
    expect(walkForm(complete()).measuredOn).toBe(TODAY);
  });
  it('carries each answer to its form field', () => {
    expect(walkForm(complete())).toEqual({ measuredOn: TODAY, method: 'tape', steps: '2', stepHeight: '14', doorWidth: '82.5', doorOpening: 'button', ramp: 'no', toilet: 'yes', toiletDoor: '86' });
  });
  it('leaves out answers to questions that do not apply', () => {
    const walk = { ...short(), answers: { ...short().answers, stepHeight: '14', toiletDoor: '86' } };
    expect(walkForm(walk)).toMatchObject({ stepHeight: '', toiletDoor: '' });
  });
});

describe('finishWalk', () => {
  it('turns a full walk into measures', () => {
    expect(finishWalk(complete(), SEEN, TODAY)).toEqual({
      ok: true,
      measures: { recordId: 'a1', measuredOn: TODAY, method: 'tape', steps: 2, stepHeightCm: 14, doorWidthCm: 82.5, doorOpening: 'button', ramp: 'no', toilet: 'yes', toiletDoorCm: 86 },
    });
  });
  it('keeps skipped and inapplicable questions as null, which reads UNKNOWN', () => {
    const result = finishWalk(short(), SEEN, TODAY);
    expect(result).toMatchObject({ ok: true, measures: { steps: 0, stepHeightCm: null, ramp: null, doorWidthCm: 81.3, doorOpening: 'manual', toilet: 'no', toiletDoorCm: null, method: 'estimate' } });
  });
  it('saves nothing when nothing was answered', () => {
    expect(finishWalk(fresh(), SEEN, TODAY)).toEqual({ ok: false, issues: [{ field: 'steps', code: 'nothing-measured' }] });
  });
  it('accepts a single answer', () => {
    expect(finishWalk(answered([['steps', '0']]), SEEN, TODAY)).toMatchObject({ ok: true, measures: { steps: 0, method: null } });
  });
  it('refuses a walk dated before the place was seen', () => {
    expect(finishWalk(complete(), { id: 'a1', observedOn: '2026-11-25' }, '2026-11-30')).toMatchObject({ ok: false, issues: [{ field: 'measuredOn', code: 'date-before-seen' }] });
  });
  it('refuses a walk dated after today', () => {
    expect(finishWalk(complete(), SEEN, '2026-11-18')).toMatchObject({ ok: false, issues: [{ field: 'measuredOn', code: 'date-future' }] });
  });
  it('accepts a walk begun on an earlier day and finished later', () => {
    expect(finishWalk(complete(), SEEN, '2026-11-21')).toMatchObject({ ok: true, measures: { measuredOn: TODAY } });
  });
  it('uses the record it is given for the id', () => {
    expect(finishWalk(complete(), { id: 'b2', observedOn: '2026-11-10' }, TODAY)).toMatchObject({ ok: true, measures: { recordId: 'b2' } });
  });
});

describe('walkChanges', () => {
  const done = (walk = complete()) => {
    const result = finishWalk(walk, SEEN, TODAY);
    if (!result.ok) throw new Error('fixture');
    return result.measures;
  };
  it('calls everything new when nothing is saved', () => {
    const changes = walkChanges(null, done());
    expect(changes.map((c) => c.kind)).toEqual(['new', 'new', 'new', 'new', 'new', 'new', 'new']);
  });
  it('leaves out facts that are UNKNOWN before and after', () => {
    expect(walkChanges(null, done(answered([['steps', '0']])))).toEqual([{ key: 'steps', kind: 'new' }]);
  });
  it('tells same from changed', () => {
    const changes = walkChanges(saved({ doorWidthCm: 80 }), done());
    expect(changes).toContainEqual({ key: 'steps', kind: 'same' });
    expect(changes).toContainEqual({ key: 'stepHeightCm', kind: 'same' });
    expect(changes).toContainEqual({ key: 'doorWidthCm', kind: 'changed' });
    expect(changes).toContainEqual({ key: 'ramp', kind: 'new' });
  });
  it('says when a saved fact would go back to UNKNOWN', () => {
    const walk = skipStep(goToStep(beginWalk('a1', TODAY, saved()), 'doorWidth'), 'doorWidth');
    const changes = walkChanges(saved(), done(walk));
    expect(changes).toContainEqual({ key: 'doorWidthCm', kind: 'cleared' });
  });
  it('reports no change for a walk begun from what is saved and left as it is', () => {
    const changes = walkChanges(saved(), done(beginWalk('a1', TODAY, saved())));
    expect(changes.every((c) => c.kind === 'same')).toBe(true);
    expect(changes).toHaveLength(3);
  });
  it('keeps the order of the facts', () => {
    expect(walkChanges(null, done()).map((c) => c.key)).toEqual(['steps', 'stepHeightCm', 'doorWidthCm', 'doorOpening', 'ramp', 'toilet', 'toiletDoorCm']);
  });
  it('counts each kind', () => {
    expect(changeCounts(walkChanges(saved({ doorWidthCm: 80 }), done()))).toEqual({ new: 4, changed: 1, same: 2, cleared: 0 });
    expect(changeCounts([])).toEqual({ new: 0, changed: 0, same: 0, cleared: 0 });
  });
});
