import { describe, expect, it } from 'vitest';
import {
  MAX_VISITS,
  VISIT_UI,
  auditHtml,
  frenchIssues,
  isVisited,
  lintClaims,
  lintCopy,
  markVisited,
  parseVisitId,
  parseVisits,
  pruneVisits,
  serialiseVisits,
  toggleVisited,
  unmarkVisited,
  visitButton,
  visitDate,
  visitNote,
  type Lang,
  type Visits,
} from './index';

describe('markVisited', () => {
  it('records the date', () => {
    const v = markVisited({}, 'a', '2026-11-10');
    expect(isVisited(v, 'a')).toBe(true);
    expect(visitDate(v, 'a')).toBe('2026-11-10');
  });
  it('keeps the first date when marked again', () => {
    const v = markVisited({ a: '2026-11-10' }, 'a', '2026-11-15');
    expect(visitDate(v, 'a')).toBe('2026-11-10');
  });
  it('ignores an empty id or a date that is not real', () => {
    const none: Visits = {};
    for (const [id, date] of [['', '2026-11-10'], ['a', 'yesterday'], ['a', '2026-13-40'], ['a', '2026-02-30'], ['a', '']] as const) {
      expect(markVisited(none, id, date), `${id} ${date}`).toBe(none);
    }
  });
  it('does not change the object it was given', () => {
    const v = Object.freeze({ a: '2026-01-01' });
    markVisited(v, 'b', '2026-01-02');
    expect(v).toEqual({ a: '2026-01-01' });
  });
  it('keeps at most MAX_VISITS, dropping the oldest', () => {
    let v: Visits = {};
    for (let i = 0; i < MAX_VISITS + 5; i += 1) v = markVisited(v, `p${i}`, `2026-01-${String((i % 28) + 1).padStart(2, '0')}`);
    expect(Object.keys(v).length).toBe(MAX_VISITS);
  });
  it('is safe with ids like "constructor"', () => {
    const v = markVisited({}, 'constructor', '2026-11-10');
    expect(isVisited(v, 'constructor')).toBe(true);
    expect(isVisited({}, 'constructor')).toBe(false);
    expect(isVisited({}, '__proto__')).toBe(false);
  });
});

describe('unmarkVisited and toggleVisited', () => {
  it('removes only that place', () => {
    expect(unmarkVisited({ a: '2026-11-10', b: '2026-11-11' }, 'a')).toEqual({ b: '2026-11-11' });
  });
  it('returns the same object for a place that was not marked', () => {
    const v = { a: '2026-11-10' };
    expect(unmarkVisited(v, 'z')).toBe(v);
  });
  it('toggles on and off', () => {
    const on = toggleVisited({}, 'a', '2026-11-10');
    expect(isVisited(on, 'a')).toBe(true);
    expect(isVisited(toggleVisited(on, 'a', '2026-11-11'), 'a')).toBe(false);
  });
});

describe('serialiseVisits / parseVisits', () => {
  it('round-trips', () => {
    const v = { a: '2026-11-10', b: '2026-10-01' };
    expect(parseVisits(serialiseVisits(v))).toEqual(v);
  });
  it('is null for anything that is not an object', () => {
    for (const bad of ['', 'x', '[]', '5', 'null', '"a"']) expect(parseVisits(bad), bad).toBeNull();
  });
  it('drops entries with a bad date or a non-string value', () => {
    expect(parseVisits('{"a":"2026-11-10","b":"nope","c":5,"":"2026-11-10"}')).toEqual({ a: '2026-11-10' });
  });
});

describe('pruneVisits', () => {
  it('drops places that are not in the list', () => {
    expect(pruneVisits({ a: '2026-11-10', b: '2026-11-11' }, ['a'])).toEqual({ a: '2026-11-10' });
  });
  it('returns the same object when nothing is dropped', () => {
    const v = { a: '2026-11-10' };
    expect(pruneVisits(v, ['a', 'b'])).toBe(v);
  });
});

describe('visit ids and buttons', () => {
  it('parses a button id', () => {
    expect(parseVisitId('gl-visit-3')).toBe(3);
    for (const bad of ['gl-visit-', 'gl-visit-x', 'gl-save-1', 'gl-visit-1a']) expect(parseVisitId(bad), bad).toBeNull();
  });
  it.each(['en', 'fr'] as Lang[])('is a toggle button with a label that names the place in %s', (lang) => {
    const off = visitButton(2, 'Café <Nord>', false, lang);
    expect(off).toContain('id="gl-visit-2"');
    expect(off).toContain('aria-pressed="false"');
    expect(off).not.toContain('<Nord>');
    const on = visitButton(3, 'Library', true, lang);
    expect(on).toContain('aria-pressed="true"');
    expect(on).toContain(VISIT_UI[lang].marked);
    expect(auditHtml(`<div lang="${lang}">${on}${off}</div>`, 'visit')).toEqual([]);
  });
  it('changes the label when the place is marked', () => {
    expect(visitButton(0, 'Gym', false, 'en')).toContain('aria-label="Mark as visited: Gym"');
    expect(visitButton(0, 'Gym', true, 'en')).toContain('aria-label="Visited: Gym"');
  });
});

describe('visitNote', () => {
  it('is empty without a date', () => {
    expect(visitNote(null, 'en')).toBe('');
  });
  it('states the date as a record of what the person did', () => {
    expect(visitNote('2026-11-10', 'en')).toContain('You marked this place as visited on 2026-11-10.');
    expect(visitNote('2026-11-10', 'fr')).toContain('Vous avez marqué ce lieu comme visité le 2026-11-10.');
  });
  it('passes the wording rules', () => {
    for (const lang of ['en', 'fr'] as Lang[]) {
      const text = VISIT_UI[lang].on('2026-11-10');
      expect(lintCopy(text)).toEqual([]);
      expect(lintClaims(text)).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(text)).toEqual([]);
    }
  });
});
