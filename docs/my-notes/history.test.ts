import { describe, expect, it } from 'vitest';
import { note, notes } from './fixtures.js';
import { canUndo, MAX_STEPS, addStep, undoLast, type Step } from './history.js';

const edit: Step = { kind: 'edit', before: note(), after: note({ wheelchair: 'no' }) };

describe('addStep', () => {
  it('adds a step to a new list', () => {
    const steps: Step[] = [];
    const out = addStep(steps, edit);
    expect(out).toEqual([edit]);
    expect(steps).toEqual([]);
  });
  it('ignores a removal of nothing', () => expect(addStep([], { kind: 'remove', removed: [] })).toEqual([]));
  it('keeps only the most recent steps', () => {
    let steps: Step[] = [];
    for (let i = 0; i < MAX_STEPS + 5; i += 1) steps = addStep(steps, { kind: 'edit', before: note({ id: `n${i}` }), after: note({ id: `n${i}`, wheelchair: 'no' }) });
    expect(steps).toHaveLength(MAX_STEPS);
    expect(steps[0]).toMatchObject({ before: { id: 'n5' } });
  });
});

describe('canUndo', () => {
  it('is true only with a step', () => {
    expect(canUndo([])).toBe(false);
    expect(canUndo([edit])).toBe(true);
  });
});

describe('undoLast', () => {
  it('does nothing with no steps', () => expect(undoLast([], notes(), 200)).toEqual({ steps: [], undone: null, restore: [], notRestored: 0 }));
  it('returns an edited note to how it was', () => {
    const out = undoLast([edit], [note({ wheelchair: 'no' })], 200);
    expect(out.restore).toEqual([note()]);
    expect(out.steps).toEqual([]);
    expect(out.undone).toBe(edit);
  });
  it('brings back an edited note that was removed since, when there is room', () => {
    expect(undoLast([edit], [], 200).restore).toEqual([note()]);
    expect(undoLast([edit], [note({ id: 'other' })], 1)).toMatchObject({ restore: [], notRestored: 1 });
  });
  it('brings removed notes back', () => {
    const removed = [note(), note({ id: 'n2' })];
    const out = undoLast([{ kind: 'remove', removed }], [], 200);
    expect(out.restore).toEqual(removed);
    expect(out.notRestored).toBe(0);
  });
  it('does not bring back a note whose id has been saved again since', () => {
    const out = undoLast([{ kind: 'remove', removed: [note(), note({ id: 'n2' })] }], [note({ wheelchair: 'no' })], 200);
    expect(out.restore.map((n) => n.id)).toEqual(['n2']);
    expect(out.notRestored).toBe(0);
  });
  it('stops at the device limit and says how many stayed out', () => {
    const removed = [note(), note({ id: 'n2' }), note({ id: 'n3' })];
    const out = undoLast([{ kind: 'remove', removed }], [note({ id: 'keep' })], 2);
    expect(out.restore.map((n) => n.id)).toEqual(['n1']);
    expect(out.notRestored).toBe(2);
  });
  it('takes back only the last step', () => {
    const first: Step = { kind: 'remove', removed: [note({ id: 'gone' })] };
    const out = undoLast([first, edit], [note({ wheelchair: 'no' })], 200);
    expect(out.steps).toEqual([first]);
    expect(out.undone).toBe(edit);
  });
  it('does not change its inputs', () => {
    const steps = [edit];
    const current = [note({ wheelchair: 'no' })];
    undoLast(steps, current, 200);
    expect(steps).toEqual([edit]);
    expect(current).toEqual([note({ wheelchair: 'no' })]);
  });
});
