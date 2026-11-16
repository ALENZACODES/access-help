import { describe, expect, it } from 'vitest';
import {
  MAX_QUERY_LENGTH,
  MAX_RECENT,
  MIN_RECENT_LENGTH,
  RECENT_CLEAR_ID,
  RECENT_UI,
  addRecent,
  auditHtml,
  frenchIssues,
  normaliseRecent,
  parseRecent,
  parseRecentId,
  recentId,
  removeRecent,
  renderRecent,
  serialiseRecent,
  type Lang,
} from './index';

describe('normaliseRecent', () => {
  it('trims, collapses spaces and caps the length', () => {
    expect(normaliseRecent('  café   nord  ')).toBe('café nord');
    expect(normaliseRecent('x'.repeat(MAX_QUERY_LENGTH + 20)).length).toBe(MAX_QUERY_LENGTH);
  });
  it('is empty for spaces', () => {
    expect(normaliseRecent('   ')).toBe('');
  });
});

describe('addRecent', () => {
  it('puts the newest first', () => {
    expect(addRecent(addRecent([], 'library'), 'café')).toEqual(['café', 'library']);
  });
  it('ignores a search that is too short', () => {
    expect(MIN_RECENT_LENGTH).toBe(2);
    const list = ['library'];
    expect(addRecent(list, 'a')).toBe(list);
    expect(addRecent(list, '   ')).toBe(list);
  });
  it('moves a repeat to the front, ignoring case and accents', () => {
    expect(addRecent(['café', 'library'], 'LIBRARY')).toEqual(['LIBRARY', 'café']);
    expect(addRecent(['Café', 'library'], 'cafe')).toEqual(['cafe', 'library']);
  });
  it('keeps at most MAX_RECENT', () => {
    let list: readonly string[] = [];
    for (let i = 0; i < MAX_RECENT + 3; i += 1) list = addRecent(list, `place ${i}`);
    expect(list.length).toBe(MAX_RECENT);
    expect(list[0]).toBe(`place ${MAX_RECENT + 2}`);
  });
  it('does not change the list it was given', () => {
    const list = Object.freeze(['a1', 'b1']);
    addRecent(list, 'c1');
    expect(list).toEqual(['a1', 'b1']);
  });
});

describe('removeRecent', () => {
  it('removes one by position', () => {
    expect(removeRecent(['a1', 'b1', 'c1'], 1)).toEqual(['a1', 'c1']);
  });
  it('ignores a position that is not there', () => {
    expect(removeRecent(['a1'], 5)).toEqual(['a1']);
    expect(removeRecent(['a1'], -1)).toEqual(['a1']);
  });
});

describe('serialiseRecent / parseRecent', () => {
  it('round-trips and keeps the order', () => {
    const list = ['café', 'library', 'gym'];
    expect(parseRecent(serialiseRecent(list))).toEqual(list);
  });
  it('is null for anything that is not a list', () => {
    for (const bad of ['', 'not json', '{}', '"x"', '5', 'null']) expect(parseRecent(bad), bad).toBeNull();
  });
  it('drops bad entries and repeats, and caps the list', () => {
    expect(parseRecent('["café", 3, null, "CAFE", "x", "library"]')).toEqual(['café', 'library']);
    const many = JSON.stringify(Array.from({ length: 12 }, (_, i) => `place ${i}`));
    expect(parseRecent(many)?.length).toBe(MAX_RECENT);
    expect(parseRecent(many)?.[0]).toBe('place 0');
  });
  it('never writes more than the cap', () => {
    const json = serialiseRecent(Array.from({ length: 9 }, (_, i) => `place ${i}`));
    expect((JSON.parse(json) as string[]).length).toBe(MAX_RECENT);
  });
});

describe('recent ids', () => {
  it('round-trips', () => {
    expect(recentId(3)).toBe('gl-rs-3');
    expect(parseRecentId(recentId(12))).toBe(12);
  });
  it('rejects anything else, including the clear button', () => {
    for (const bad of ['gl-rs-', 'gl-rs-x', RECENT_CLEAR_ID, 'gl-recent', 'gl-rs-1 ']) expect(parseRecentId(bad), bad).toBeNull();
  });
});

describe('renderRecent', () => {
  it('is empty for an empty list', () => {
    expect(renderRecent([], 'en')).toBe('');
  });
  it.each(['en', 'fr'] as Lang[])('has a button for each search and a clear button in %s', (lang) => {
    const html = renderRecent(['café', 'library'], lang);
    expect(html).toContain('id="gl-rs-0"');
    expect(html).toContain('id="gl-rs-1"');
    expect(html).toContain(`id="${RECENT_CLEAR_ID}"`);
    expect(html).toContain(RECENT_UI[lang].heading);
    expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'recent')).toEqual([]);
  });
  it('escapes what was typed', () => {
    const html = renderRecent(['<img src=x>'], 'en');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });
  it('labels each button with what it does', () => {
    expect(renderRecent(['café'], 'en')).toContain('aria-label="Search again: café"');
  });
  it('is clean French', () => {
    expect(frenchIssues(RECENT_UI.fr.again('x'))).toEqual([]);
    expect(RECENT_UI.fr.again('x')).toMatch(/nouveau[  ]:/);
  });
});
