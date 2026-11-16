import { describe, expect, it } from 'vitest';
import { FOCUS_IDS, FOCUS_LABEL, NAME_MAX, NOTES_MAX, SESSION_ISSUE_TEXT, areaIssues, createSession, focusLabels, parseSession, parseSessionText, serialiseSession, sessionIdFor, sessionIssueText, type SessionDraft } from './day-session';
import { allStrings, bannedIn, lintFrench } from './day-lint.test';

const draft = (over: Partial<SessionDraft> = {}): SessionDraft => ({
  name: 'Main Street',
  date: '2026-11-21',
  bounds: { south: 43.85, west: -79.44, north: 43.86, east: -79.42 },
  cellMetres: 200,
  focus: ['parking', 'entrances'],
  notes: ' Bring the offline pack. ',
  ...over,
});
const made = (over: Partial<SessionDraft> = {}) => {
  const r = createSession(draft(over));
  if (!r.ok) throw new Error(JSON.stringify(r.issues));
  return r.session;
};
const codes = (over: Partial<SessionDraft>) => {
  const r = createSession(draft(over));
  return r.ok ? [] : r.issues.map((i) => `${i.field}:${i.code}`);
};

describe('sessionIdFor', () => {
  it('joins the date and a plain name', () => {
    expect(sessionIdFor('2026-11-21', 'Main Street')).toBe('2026-11-21-main-street');
    expect(sessionIdFor('2026-11-21', 'Rue Saint-Émile')).toBe('2026-11-21-rue-saint-emile');
  });
  it('falls back to "session" for a name with no letters', () => {
    expect(sessionIdFor('2026-11-21', '***')).toBe('2026-11-21-session');
  });
});

describe('createSession', () => {
  it('builds a session, trims the name and notes and orders the focus list', () => {
    const s = made({ name: '  Main Street  ' });
    expect(s).toMatchObject({ version: 1, id: '2026-11-21-main-street', name: 'Main Street', notes: 'Bring the offline pack.', focus: ['entrances', 'parking'], cellMetres: 200 });
  });
  it('accepts no focus and no notes', () => {
    const s = made({ focus: undefined, notes: undefined });
    expect(s.focus).toEqual([]);
    expect(s.notes).toBe('');
  });
  it('requires a name of sensible length', () => {
    expect(codes({ name: '   ' })).toEqual(['name:name-missing']);
    expect(codes({ name: 'x'.repeat(NAME_MAX + 1) })).toContain('name:name-too-long');
    expect(codes({ name: 'x'.repeat(NAME_MAX) })).toEqual([]);
  });
  it('requires a real date', () => {
    expect(codes({ date: '2026-02-30' })).toEqual(['date:date-bad']);
    expect(codes({ date: '' })).toEqual(['date:date-bad']);
  });
  it('limits the notes', () => {
    expect(codes({ notes: 'n'.repeat(NOTES_MAX + 1) })).toEqual(['notes:notes-too-long']);
  });
  it('refuses an unknown or repeated focus', () => {
    expect(codes({ focus: ['parking', 'moon'] })).toEqual(['focus:focus-bad']);
    expect(codes({ focus: ['parking', 'parking'] })).toEqual(['focus:focus-bad']);
  });
  it('passes grid problems through with their fields', () => {
    expect(codes({ cellMetres: 77 })).toEqual(['cellMetres:bad-cell-size']);
    expect(codes({ bounds: { south: 44, west: -79.44, north: 43, east: -79.42 } })).toEqual(['south:south-not-below-north']);
  });
  it('reports every problem at once, each only once', () => {
    const r = codes({ name: '', date: 'x', cellMetres: 1, focus: ['x', 'y'] });
    expect(r).toEqual(expect.arrayContaining(['name:name-missing', 'date:date-bad', 'cellMetres:bad-cell-size', 'focus:focus-bad']));
    expect(new Set(r).size).toBe(r.length);
  });
  it('refuses an id with capitals or spaces', () => {
    expect(codes({ id: 'Bad Id' })).toEqual(['id:id-bad']);
    expect(made({ id: 'my-day-1' }).id).toBe('my-day-1');
  });
  it('copies the bounds so later edits do not reach the session', () => {
    const d = draft();
    const r = createSession(d);
    d.bounds.south = 0;
    expect(r.ok && r.session.bounds.south).toBe(43.85);
  });
});

describe('parseSession', () => {
  it('reads back what serialiseSession wrote', () => {
    const s = made();
    expect(parseSessionText(serialiseSession(s))).toEqual({ ok: true, session: s });
  });
  it('refuses things that are not a session', () => {
    for (const value of [null, 3, 'x', [], undefined]) {
      const r = parseSession(value);
      expect(r.ok, String(value)).toBe(false);
      if (!r.ok) expect(r.issues[0]?.code).toBe('not-an-object');
    }
    expect(parseSessionText('{nope').ok).toBe(false);
  });
  it('refuses a different version rather than guessing', () => {
    const r = parseSession({ ...made(), version: 2 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0]?.code).toBe('wrong-version');
  });
  it('refuses a missing id and does not make one up', () => {
    const { id: _id, ...rest } = made();
    const r = parseSession(rest);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.map((i) => i.code)).toContain('id-missing');
  });
  it('treats a bounds value that is a string as not a number, without converting it', () => {
    const r = parseSession({ ...made(), bounds: { south: '43.85', west: -79.44, north: 43.86, east: -79.42 } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.map((i) => i.code)).toContain('not-a-number');
  });
  it('drops fields it does not know', () => {
    const r = parseSession({ ...made(), extra: 'x', bounds: { ...made().bounds, z: 1 } });
    expect(r.ok && Object.keys(r.session).sort()).toEqual(['bounds', 'cellMetres', 'date', 'focus', 'id', 'name', 'notes', 'version']);
  });
  it('refuses a focus entry that is not text', () => {
    const r = parseSession({ ...made(), focus: [3] });
    expect(r.ok).toBe(false);
  });
});

describe('labels and text', () => {
  it('lists focus labels in the chosen language', () => {
    expect(focusLabels(made(), 'en')).toEqual(['Entrances', 'Parking']);
    expect(focusLabels(made(), 'fr')).toEqual(['Entrées', 'Stationnement']);
  });
  it('has both languages for every focus and issue, free of banned words and French spacing mistakes', () => {
    expect(Object.keys(FOCUS_LABEL).sort()).toEqual([...FOCUS_IDS].sort());
    for (const text of [...Object.values(FOCUS_LABEL), ...Object.values(SESSION_ISSUE_TEXT)]) {
      expect(text.en.length).toBeGreaterThan(3);
      expect(bannedIn(text.en + text.fr)).toEqual([]);
      expect(lintFrench(text.fr)).toEqual([]);
    }
    expect(allStrings(SESSION_ISSUE_TEXT)).toHaveLength(Object.keys(SESSION_ISSUE_TEXT).length * 2);
  });
  it('explains a session issue and a grid issue', () => {
    expect(sessionIssueText({ code: 'name-missing', field: 'name' }, 'en')).toBe('Give the mapping day a name.');
    expect(sessionIssueText({ code: 'bad-cell-size', field: 'cellMetres' }, 'en')).toMatch(/50, 100, 200 or 400/);
  });
  it('checks the area alone', () => {
    expect(areaIssues({ south: 1, north: 0, west: 0, east: 1 }).map((i) => i.code)).toEqual(['south-not-below-north']);
  });
});
