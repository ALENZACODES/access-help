import { describe, expect, it } from 'vitest';
import { adviseGroup, planKeep, reportGroups } from './advise.js';
import { near, own } from './fixtures.js';
import { groupNotes, type OwnNote } from './groups.js';

const group = (...notes: OwnNote[]) => {
  const [g] = groupNotes(notes);
  if (g === undefined) throw new Error('expected one group');
  return g;
};

describe('adviseGroup', () => {
  it('calls identical notes the same and suggests one', () => {
    const advice = adviseGroup(group(own(), own({ id: 'b' })));
    expect(advice.kind).toBe('same');
    expect(advice.suggestedKeep).not.toBeNull();
  });
  it('suggests the newest when the status agrees and details differ', () => {
    const advice = adviseGroup(group(own(), near()));
    expect(advice).toMatchObject({ kind: 'details-differ', suggestedKeep: 'b', statuses: ['yes'] });
  });
  it('suggests nothing when the statuses differ', () => {
    const advice = adviseGroup(group(own(), near({ wheelchair: 'no' })));
    expect(advice).toMatchObject({ kind: 'status-differs', suggestedKeep: null, statuses: ['yes', 'no'] });
  });
  it('suggests the note with a status over a newer UNKNOWN', () => {
    const advice = adviseGroup(group(own(), near({ wheelchair: 'UNKNOWN' })));
    expect(advice).toMatchObject({ kind: 'only-unknown-differs', suggestedKeep: 'a', statuses: ['yes', 'UNKNOWN'] });
  });
  it('treats an unrecognised status as UNKNOWN', () => {
    expect(adviseGroup(group(own(), near({ wheelchair: 'maybe' }))).statuses).toEqual(['yes', 'UNKNOWN']);
  });
  it('suggests the newest when every note is UNKNOWN', () => {
    const advice = adviseGroup(group(own({ wheelchair: 'UNKNOWN' }), near({ wheelchair: 'UNKNOWN' })));
    expect(advice).toMatchObject({ kind: 'details-differ', suggestedKeep: 'b', statuses: ['UNKNOWN'] });
  });
  it('lists the licences in the group', () => {
    expect(adviseGroup(group(own(), near({ licence: 'ODbL-1.0' }))).licences).toEqual(['CC0-1.0', 'ODbL-1.0']);
    expect(adviseGroup(group(own(), near())).licences).toEqual(['CC0-1.0']);
  });
  it('flags a suggested note that has no name when another has one', () => {
    expect(adviseGroup(group(own(), near({ name: null }))).nameOnlyOnAnother).toBe(true);
    expect(adviseGroup(group(own(), near())).nameOnlyOnAnother).toBe(false);
    expect(adviseGroup(group(own({ name: null }), near({ name: null }))).nameOnlyOnAnother).toBe(false);
  });
});

describe('planKeep', () => {
  const g = group(own(), near(), near({ id: 'c', lat: 43.85005 }));
  it('keeps the chosen note and lists the others to remove', () => {
    const plan = planKeep(g, 'a');
    expect(plan?.keep.id).toBe('a');
    expect(plan?.remove.map((n) => n.id).sort()).toEqual(['b', 'c']);
  });
  it('is null for an id that is not in the group', () => expect(planKeep(g, 'zz')).toBeNull());
  it('never removes the kept note', () => {
    for (const note of g.notes) expect(planKeep(g, note.id)?.remove.map((n) => n.id)).not.toContain(note.id);
  });
});

describe('reportGroups', () => {
  it('counts the notes in groups and keeps the total and distance', () => {
    const notes = [own(), near(), own({ id: 'far', lat: 44 })];
    const report = reportGroups(groupNotes(notes), notes.length, 25);
    expect(report).toMatchObject({ distance: 25, notesInGroups: 2, total: 3 });
    expect(report.groups[0]?.advice.kind).toBe('details-differ');
  });
  it('is empty with no groups', () => {
    expect(reportGroups([], 0, 25)).toEqual({ distance: 25, groups: [], notesInGroups: 0, total: 0 });
  });
});
