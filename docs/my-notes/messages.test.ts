import { describe, expect, it } from 'vitest';
import { NOTE_FIELDS } from './change.js';
import { note, notes } from './fixtures.js';
import { undoLast } from './history.js';
import { changeText, noteFieldLabel, noteLine, notesSummaryLines, observationWarning, shownText, sortLabel, stepText, undoResultText } from './messages.js';
import { SORTS, summariseNotes } from './organise.js';

describe('field and change words', () => {
  for (const lang of ['en', 'fr'] as const) {
    it(`labels every field differently (${lang})`, () => expect(new Set(NOTE_FIELDS.map((f) => noteFieldLabel(f, lang))).size).toBe(NOTE_FIELDS.length));
    it(`labels every sort differently (${lang})`, () => expect(new Set(SORTS.map((s) => sortLabel(s, lang))).size).toBe(SORTS.length));
  }
  it('writes a change with before and after', () => {
    expect(changeText({ field: 'wheelchair', before: 'yes', after: 'no' }, 'en')).toBe('Status: yes becomes no');
    expect(changeText({ field: 'wheelchair', before: 'yes', after: 'UNKNOWN' }, 'fr')).toBe('État : yes devient UNKNOWN');
  });
  it('writes a missing name as none', () => {
    expect(changeText({ field: 'name', before: '', after: 'Hall' }, 'en')).toBe('Name: none becomes Hall');
    expect(changeText({ field: 'name', before: 'Hall', after: '' }, 'fr')).toBe('Nom : Hall devient aucun');
  });
  it('warns when an edit changes what was seen', () => {
    expect(observationWarning('en')).toMatch(/only if it is what you saw yourself/);
    expect(observationWarning('fr')).toMatch(/vu vous-même/);
  });
});

describe('noteLine', () => {
  it('gives status, source, licence, date and tier', () => {
    expect(noteLine(note(), 'en')).toBe('Status: yes. Source: own visit. Licence: CC0-1.0. Seen on 2026-11-10. Tier: UNKNOWN.');
    expect(noteLine(note({ wheelchair: 'UNKNOWN' }), 'fr')).toBe('État : UNKNOWN. Source : own visit. Licence : CC0-1.0. Vu le 2026-11-10. Niveau : UNKNOWN.');
  });
});

describe('notesSummaryLines', () => {
  it('says there is nothing with no notes', () => expect(notesSummaryLines(summariseNotes([]), 'en')).toEqual(['You have no saved observations.']));
  it('gives the total, the groups, the span and the unnamed count', () => {
    expect(notesSummaryLines(summariseNotes(notes()), 'en')).toEqual([
      'Saved observations: 4.',
      'By status - yes: 1; limited: 1; no: 1; UNKNOWN: 1.',
      'By licence - CC0-1.0: 3; ODbL-1.0: 1.',
      'By month seen - 2026-11: 2; 2026-10: 1; 2025-12: 1.',
      'Seen from 2025-12-30 to 2026-11-12.',
      'Without a name: 1.',
    ]);
  });
  it('leaves the unnamed line out when every note has a name', () => {
    expect(notesSummaryLines(summariseNotes([note()]), 'en')).toHaveLength(5);
  });
  it('writes French spacing', () => {
    const lines = notesSummaryLines(summariseNotes(notes()), 'fr');
    expect(lines[0]).toBe('Observations enregistrées : 4.');
    expect(lines[2]).toBe('Par licence - CC0-1.0 : 3 ; ODbL-1.0 : 1.');
  });
  it('shows at most six months', () => {
    const many = Array.from({ length: 9 }, (_, i) => note({ id: `m${i}`, observedOn: `2026-0${i + 1}-05` }));
    expect(notesSummaryLines(summariseNotes(many), 'en')[3]?.split(';')).toHaveLength(6);
  });
});

describe('undo words', () => {
  it('says how many are shown', () => {
    expect(shownText(2, 4, 'en')).toBe('Showing 2 of 4.');
    expect(shownText(2, 4, 'fr')).toBe('Affichées : 2 sur 4.');
  });
  it('names the step', () => {
    expect(stepText({ kind: 'edit', before: note(), after: note() }, 'en')).toBe('your edit of Sample Library');
    expect(stepText({ kind: 'edit', before: note({ name: null }), after: note() }, 'fr')).toBe('votre modification (lieu sans nom)');
    expect(stepText({ kind: 'remove', removed: [note(), note({ id: 'n2' })] }, 'en')).toBe('your removal of 2');
  });
  it('says what was taken back, or that there was nothing', () => {
    expect(undoResultText(undoLast([], [], 200), 'en')).toBe('There is nothing to take back.');
    expect(undoResultText(undoLast([{ kind: 'remove', removed: [note()] }], [], 200), 'en')).toBe('Took back your removal of 1.');
  });
  it('says how many could not come back', () => {
    const out = undoLast([{ kind: 'remove', removed: [note(), note({ id: 'n2' })] }], [note({ id: 'k' })], 1);
    expect(undoResultText(out, 'en')).toBe('Took back your removal of 2. Could not come back because the device list is full: 2.');
  });
});
