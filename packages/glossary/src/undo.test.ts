import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VIEW,
  EMPTY_STATE,
  UNDO_ID,
  UNDO_UI,
  auditHtml,
  frenchIssues,
  renderUndo,
  restoreSaved,
  savedPosition,
  undoLabel,
  type Lang,
  type UndoAction,
  type UndoKind,
} from './index';

const actions: Record<UndoKind, UndoAction> = {
  clear: { kind: 'clear', state: EMPTY_STATE, view: DEFAULT_VIEW, selected: [] },
  recent: { kind: 'recent', recent: ['café'] },
  unsave: { kind: 'unsave', placeId: 'a', position: 0 },
  list: { kind: 'list', index: 0, list: { name: 'Saturday', ids: ['a'] } },
  search: { kind: 'search', index: 0, search: { name: 'Ramp', state: { features: ['ramp'], query: '', hideNotAvailable: false } } },
  tag: { kind: 'tag', placeId: 'a', tag: 'spring', position: 0 },
  reminder: { kind: 'reminder', placeId: 'a', date: '2026-12-01' },
  day: { kind: 'day', placeId: 'a', day: 'mon' },
  record: { kind: 'record', places: [], saved: [] },
  place: { kind: 'place', places: [], saved: [] },
  load: { kind: 'load', places: [], saved: [] },
  rename: { kind: 'rename', places: [], saved: [] },
  join: { kind: 'join', places: [], saved: [] },
  source: { kind: 'source', places: [], saved: [] },
  change: { kind: 'change', places: [], saved: [] },
  restore: { kind: 'restore', places: [], saved: [] },
};

describe('restoreSaved', () => {
  it('puts a place back at its old position', () => {
    expect(restoreSaved(['a', 'c'], 'b', 1)).toEqual(['a', 'b', 'c']);
    expect(restoreSaved(['b', 'c'], 'a', 0)).toEqual(['a', 'b', 'c']);
  });
  it('puts it at the end when the list is shorter now', () => {
    expect(restoreSaved(['a'], 'z', 9)).toEqual(['a', 'z']);
  });
  it('puts it first for a negative position', () => {
    expect(restoreSaved(['a'], 'z', -3)).toEqual(['z', 'a']);
  });
  it('keeps one copy when the place is already saved', () => {
    const saved = ['a', 'b'];
    expect(restoreSaved(saved, 'a', 1)).toBe(saved);
  });
  it('does not change the list it was given', () => {
    const saved = Object.freeze(['a', 'c']);
    restoreSaved(saved, 'b', 1);
    expect(saved).toEqual(['a', 'c']);
  });
});

describe('savedPosition', () => {
  it('finds a place, or -1', () => {
    expect(savedPosition(['a', 'b'], 'b')).toBe(1);
    expect(savedPosition(['a', 'b'], 'z')).toBe(-1);
  });
  it('round-trips with restoreSaved', () => {
    const saved = ['a', 'b', 'c', 'd'];
    const pos = savedPosition(saved, 'c');
    expect(restoreSaved(saved.filter((x) => x !== 'c'), 'c', pos)).toEqual(saved);
  });
});

describe('undo labels and button', () => {
  it('has a label for every kind in both languages', () => {
    for (const lang of ['en', 'fr'] as Lang[]) for (const kind of Object.keys(actions) as UndoKind[]) expect(UNDO_UI[lang][kind]).toBeTruthy();
  });
  it('says what will be undone', () => {
    expect(undoLabel('clear', 'en')).toBe('Undo: clear choices');
    expect(undoLabel('unsave', 'en')).toBe('Undo: remove saved place');
  });
  it('is clean French', () => {
    for (const kind of Object.keys(actions) as UndoKind[]) expect(frenchIssues(undoLabel(kind, 'fr')), kind).toEqual([]);
  });
  it('shows nothing without a pending action', () => {
    expect(renderUndo(null, 'en')).toBe('');
  });
  it.each(['en', 'fr'] as Lang[])('shows one button with the right label in %s', (lang) => {
    for (const kind of Object.keys(actions) as UndoKind[]) {
      const html = renderUndo(actions[kind], lang);
      expect(html).toContain(`id="${UNDO_ID}"`);
      expect(html).toContain(undoLabel(kind, lang));
      expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'undo')).toEqual([]);
    }
  });
});
