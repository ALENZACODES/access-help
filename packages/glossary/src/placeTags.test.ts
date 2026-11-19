import { describe, expect, it } from 'vitest';
import {
  MAX_TAGGED_PLACES,
  MAX_TAGS_PER_PLACE,
  MAX_TAG_LENGTH,
  TAG_FILTER_ID,
  TAG_UI,
  addTag,
  insertTag,
  allTags,
  auditHtml,
  cleanTag,
  frenchIssues,
  lintClaims,
  lintCopy,
  parseTagAddId,
  parseTagShowId,
  parseTags,
  parseUntagId,
  placesWithTag,
  plainLanguageIssues,
  pruneTags,
  readabilityIssues,
  removeTag,
  renderTagEditor,
  renderTaggedPlaces,
  renderTagsPanel,
  serialiseTags,
  tagAddId,
  tagKey,
  tagResultText,
  tagsOf,
  untagId,
  type Lang,
  type Place,
  type Tags,
} from './index';

const places: Place[] = [
  { id: 'a', name: 'Library', claims: [] },
  { id: 'b', name: 'Café Nord', claims: [] },
  { id: 'c', name: 'Pool', claims: [] },
];

describe('cleanTag and tagKey', () => {
  it('trims, joins spaces and removes control characters', () => {
    expect(cleanTag('  with   Sam \n')).toBe('with Sam');
    expect(cleanTag('a\u0000b')).toBe('a b');
  });
  it('cuts to the limit by characters, not code units', () => {
    expect(Array.from(cleanTag('x'.repeat(50)))).toHaveLength(MAX_TAG_LENGTH);
    expect(Array.from(cleanTag('😀'.repeat(50)))).toHaveLength(MAX_TAG_LENGTH);
  });
  it('compares without case or accents', () => {
    expect(tagKey('Café')).toBe('cafe');
    expect(tagKey(' CAFE ')).toBe('cafe');
    expect(tagKey('')).toBe('');
  });
});

describe('addTag', () => {
  it('adds a tag and keeps the order', () => {
    const one = addTag({}, 'a', 'spring');
    expect(one.result).toBe('added');
    const two = addTag(one.tags, 'a', 'with Sam');
    expect(tagsOf(two.tags, 'a')).toEqual(['spring', 'with Sam']);
  });
  it('ignores an empty tag', () => {
    const t: Tags = {};
    expect(addTag(t, 'a', '   ')).toEqual({ tags: t, result: 'empty' });
  });
  it('ignores the same tag in another case or with accents', () => {
    const one = addTag({}, 'a', 'Café');
    const two = addTag(one.tags, 'a', 'cafe');
    expect(two.result).toBe('duplicate');
    expect(two.tags).toBe(one.tags);
  });
  it('allows the same tag on different places', () => {
    const one = addTag({}, 'a', 'spring');
    expect(addTag(one.tags, 'b', 'spring').result).toBe('added');
  });
  it('stops at the most tags a place can have', () => {
    let t: Tags = {};
    for (let i = 0; i < MAX_TAGS_PER_PLACE; i += 1) t = addTag(t, 'a', `t${i}`).tags;
    const full = addTag(t, 'a', 'one more');
    expect(full.result).toBe('full');
    expect(tagsOf(full.tags, 'a')).toHaveLength(MAX_TAGS_PER_PLACE);
  });
  it('drops the oldest tagged places past the limit', () => {
    let t: Tags = {};
    for (let i = 0; i < MAX_TAGGED_PLACES + 3; i += 1) t = addTag(t, `p${i}`, 'x').tags;
    expect(Object.keys(t)).toHaveLength(MAX_TAGGED_PLACES);
    expect(tagsOf(t, 'p0')).toEqual([]);
    expect(tagsOf(t, `p${MAX_TAGGED_PLACES + 2}`)).toEqual(['x']);
  });
  it('is safe with prototype keys and does not change its input', () => {
    const t: Tags = { a: ['x'] };
    const copy = JSON.stringify(t);
    addTag(t, 'a', 'y');
    expect(JSON.stringify(t)).toBe(copy);
    expect(tagsOf({}, 'constructor')).toEqual([]);
    expect(tagsOf({}, '__proto__')).toEqual([]);
    expect(Object.keys(addTag({}, '__proto__', 'x').tags)).toEqual(['__proto__']);
  });
});

describe('removeTag', () => {
  it('removes a tag, in any case', () => {
    const t = addTag(addTag({}, 'a', 'Spring').tags, 'a', 'Sam').tags;
    expect(tagsOf(removeTag(t, 'a', 'spring'), 'a')).toEqual(['Sam']);
  });
  it('removes the place entry with its last tag', () => {
    const t = addTag({}, 'a', 'x').tags;
    expect(removeTag(t, 'a', 'x')).toEqual({});
  });
  it('returns the same object when there is nothing to remove', () => {
    const t = addTag({}, 'a', 'x').tags;
    expect(removeTag(t, 'a', 'y')).toBe(t);
    expect(removeTag(t, 'zz', 'x')).toBe(t);
  });
});

describe('insertTag', () => {
  const base = ['a', 'b', 'c'].reduce<Tags>((acc, tag) => addTag(acc, 'p', tag).tags, {});
  it('puts a tag back where it was', () => {
    const without = removeTag(base, 'p', 'b');
    expect(tagsOf(insertTag(without, 'p', 'b', 1), 'p')).toEqual(['a', 'b', 'c']);
    expect(tagsOf(insertTag(without, 'p', 'a', 0), 'p')).toEqual(['a', 'c']);
  });
  it('puts it at the end when the list is shorter now, and first for a negative position', () => {
    expect(tagsOf(insertTag({}, 'p', 'x', 9), 'p')).toEqual(['x']);
    expect(tagsOf(insertTag(base, 'p', 'x', -4), 'p')).toEqual(['x', 'a', 'b', 'c']);
  });
  it('keeps one copy, and ignores an empty tag', () => {
    expect(insertTag(base, 'p', 'B', 0)).toBe(base);
    expect(insertTag(base, 'p', '  ', 0)).toBe(base);
  });
  it('respects the most tags a place can have', () => {
    let t: Tags = {};
    for (let i = 0; i < MAX_TAGS_PER_PLACE; i += 1) t = addTag(t, 'p', `t${i}`).tags;
    expect(insertTag(t, 'p', 'extra', 0)).toBe(t);
  });
});

describe('allTags and placesWithTag', () => {
  const t = [
    ['a', 'spring'],
    ['a', 'Sam'],
    ['b', 'Spring'],
    ['c', 'Sam'],
    ['c', 'spring'],
    ['gone', 'spring'],
  ].reduce<Tags>((acc, [id, tag]) => addTag(acc, id ?? '', tag ?? '').tags, {});
  it('counts tags on loaded places, most used first', () => {
    expect(allTags(t, places)).toEqual([
      { key: 'spring', tag: 'spring', count: 3 },
      { key: 'sam', tag: 'Sam', count: 2 },
    ]);
  });
  it('finds the places with a tag, with their indexes', () => {
    expect(placesWithTag(t, places, 'sam')).toEqual([
      { placeId: 'a', name: 'Library', index: 0 },
      { placeId: 'c', name: 'Pool', index: 2 },
    ]);
  });
  it('finds nothing for no tag or an unknown tag', () => {
    expect(placesWithTag(t, places, '')).toEqual([]);
    expect(placesWithTag(t, places, 'zzz')).toEqual([]);
  });
  it('is empty with no tags', () => {
    expect(allTags({}, places)).toEqual([]);
  });
});

describe('pruneTags', () => {
  it('keeps tags for known places only', () => {
    const t = addTag(addTag({}, 'a', 'x').tags, 'gone', 'y').tags;
    expect(pruneTags(t, ['a'])).toEqual({ a: ['x'] });
  });
  it('returns the same object when nothing is dropped', () => {
    const t = addTag({}, 'a', 'x').tags;
    expect(pruneTags(t, ['a', 'b'])).toBe(t);
  });
});

describe('storage', () => {
  it('round-trips', () => {
    const t = addTag(addTag({}, 'a', 'x').tags, 'b', 'Café').tags;
    expect(parseTags(serialiseTags(t))).toEqual(t);
  });
  it('is null for text that is not an object', () => {
    for (const bad of ['', 'nope', '[]', 'null', '3', '"x"']) expect(parseTags(bad), bad).toBeNull();
  });
  it('drops bad entries and applies the limits', () => {
    const json = JSON.stringify({ a: ['ok', 3, '', 'OK', 'x'.repeat(60)], b: 'nope', c: [null] });
    const t = parseTags(json);
    expect(t).toEqual({ a: ['ok', 'x'.repeat(MAX_TAG_LENGTH)] });
  });
  it('keeps at most the tags a place can have', () => {
    const t = parseTags(JSON.stringify({ a: ['1', '2', '3', '4', '5', '6', '7'] }));
    expect(tagsOf(t ?? {}, 'a')).toHaveLength(MAX_TAGS_PER_PLACE);
  });
});

describe('ids', () => {
  it('round-trips', () => {
    expect(parseTagAddId(tagAddId(4))).toBe(4);
    expect(parseUntagId(untagId(2, 3))).toEqual({ index: 2, tagIndex: 3 });
    expect(parseTagShowId('gl-tshow-9')).toBe(9);
  });
  it('rejects other ids', () => {
    for (const id of ['', 'gl-tagadd-', 'gl-tagadd-x', 'gl-tag-1']) expect(parseTagAddId(id), id).toBeNull();
    for (const id of ['', 'gl-untag-1', 'gl-untag-1-', 'gl-untag-a-b']) expect(parseUntagId(id), id).toBeNull();
    for (const id of ['', 'gl-tshow-', 'gl-nshow-1']) expect(parseTagShowId(id), id).toBeNull();
  });
});

describe('markup', () => {
  it.each(['en', 'fr'] as Lang[])('is valid in %s', (lang) => {
    const found = placesWithTag({ a: ['x'] }, places, 'x');
    for (const html of [
      renderTagEditor(0, 'Library', [], lang),
      renderTagEditor(0, 'Library', ['spring', 'Café'], lang),
      renderTaggedPlaces(found, 'x', lang),
      renderTagsPanel([], '', [], lang),
      renderTagsPanel([{ key: 'x', tag: 'x', count: 1 }], 'x', found, lang),
    ]) {
      expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'tags')).toEqual([]);
    }
  });
  it('has a labelled box with a length limit, and a named add button', () => {
    const html = renderTagEditor(2, 'Library', [], 'en');
    expect(html).toContain('<label for="gl-tag-2">Add a tag for Library</label>');
    expect(html).toContain(`maxlength="${MAX_TAG_LENGTH}"`);
    expect(html).toContain('id="gl-tagadd-2" aria-label="Add tag to Library"');
  });
  it('has a remove button for each tag that names the tag and the place', () => {
    const html = renderTagEditor(1, 'Pool', ['spring', 'Sam'], 'en');
    expect(html).toContain('id="gl-untag-1-0" aria-label="Remove spring from Pool"');
    expect(html).toContain('id="gl-untag-1-1"');
    expect(html).toContain('aria-label="Tags for Pool"');
  });
  it('escapes tags and names', () => {
    const html = renderTagEditor(0, '<b>x</b>', ['<i>y</i>'], 'en');
    expect(html).not.toContain('<b>x');
    expect(html).not.toContain('<i>y');
    expect(renderTagsPanel([{ key: '"><script>', tag: '<s>', count: 1 }], '', [], 'en')).not.toContain('<script>');
  });
  it('says so with no tags in use, and has no filter then', () => {
    const html = renderTagsPanel([], '', [], 'en');
    expect(html).toContain(TAG_UI.en.none);
    expect(html).not.toContain(TAG_FILTER_ID);
  });
  it('marks the chosen tag and shows its places', () => {
    const found = placesWithTag({ a: ['x'], c: ['x'] }, places, 'x');
    const html = renderTagsPanel([{ key: 'x', tag: 'x', count: 2 }], 'x', found, 'en');
    expect(html).toContain('<option value="x" selected>x (2)</option>');
    expect(html).toContain('2 places have the tag x.');
    expect(html).toContain('id="gl-tshow-2"');
  });
  it('shows no places for a tag that is no longer used', () => {
    const html = renderTagsPanel([{ key: 'x', tag: 'x', count: 1 }], 'gone', [], 'en');
    expect(html).toContain('<div data-gl-tagplaces></div>');
  });
  it('counts one place in the singular', () => {
    expect(renderTaggedPlaces(placesWithTag({ a: ['x'] }, places, 'x'), 'x', 'en')).toContain('1 place has the tag x.');
  });
});

describe('wording', () => {
  it('has a message for each result in both languages', () => {
    for (const lang of ['en', 'fr'] as Lang[]) {
      const texts = (['added', 'duplicate', 'full', 'empty'] as const).map((r) => tagResultText(r, 'spring', 'Library', lang));
      expect(new Set(texts).size).toBe(4);
      expect(texts[0]).toContain('spring');
    }
  });
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = TAG_UI[lang];
    const texts = [
      ui.heading, ui.intro, ui.none, ui.label('Library'), ui.short, ui.add, ui.addLabel('Library'), ui.remove('spring'),
      ui.removeLabel('spring', 'Library'), ui.tagsOf('Library'), ui.filter, ui.all, ui.option('spring', 2), ui.found(1, 'spring'),
      ui.found(3, 'spring'), ui.show, ui.showLabel('Library'), ui.added('spring', 'Library'), ui.removed('spring', 'Library'),
      ui.duplicate('Library'), ui.full('Library'), ui.empty,
    ];
    for (const t of texts) {
      expect(lintCopy(t), t).toEqual([]);
      expect(lintClaims(t), t).toEqual([]);
      expect(plainLanguageIssues(t), t).toEqual([]);
      expect(readabilityIssues(t, lang), t).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(t), t).toEqual([]);
    }
  });
});
