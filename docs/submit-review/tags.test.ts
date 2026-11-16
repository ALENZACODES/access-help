import { describe, expect, it } from 'vitest';
import { MAX_TAG_VALUE, diffTags, diffText, isValidKey, isValidValue, parseTagLines, tagIssueText, tagIssues, tagLines, tagsFor } from './tags.js';

const base = { name: 'Corner café', wheelchair: 'yes' as const, source: 'own site visit', observedOn: '2026-11-01' };

describe('keys and values', () => {
  it('accepts plain and namespaced keys', () => {
    for (const key of ['name', 'wheelchair', 'check_date:wheelchair', 'addr:housenumber', 'a-b']) expect(isValidKey(key)).toBe(true);
  });
  it('rejects empty, upper-case, spaced and colon-edged keys', () => {
    for (const key of ['', 'Name', 'a b', ':a', 'a:', 'a::b', 'é']) expect(isValidKey(key)).toBe(false);
  });
  it('limits values to 255 characters and no control characters', () => {
    expect(isValidValue('x'.repeat(MAX_TAG_VALUE))).toBe(true);
    expect(isValidValue('x'.repeat(MAX_TAG_VALUE + 1))).toBe(false);
    expect(isValidValue('line\nbreak')).toBe(false);
    expect(isValidValue('tab\there')).toBe(false);
    expect(isValidValue('café ☕')).toBe(true);
  });
  it('counts code points, not UTF-16 units', () => {
    expect(isValidValue('😀'.repeat(MAX_TAG_VALUE))).toBe(true);
  });
});

describe('tagsFor', () => {
  it('writes name, access, check date and source in that order', () => {
    expect(Object.keys(tagsFor(base))).toEqual(['name', 'wheelchair', 'check_date:wheelchair', 'source']);
    expect(tagsFor(base).wheelchair).toBe('yes');
  });
  it('leaves UNKNOWN out entirely, with no check date', () => {
    const tags = tagsFor({ ...base, wheelchair: 'UNKNOWN' });
    expect('wheelchair' in tags).toBe(false);
    expect('check_date:wheelchair' in tags).toBe(false);
    expect(Object.values(tags)).not.toContain('UNKNOWN');
  });
  it('omits a blank name and a blank source', () => {
    expect(tagsFor({ ...base, name: '  ', source: ' ' })).toEqual({ wheelchair: 'yes', 'check_date:wheelchair': '2026-11-01' });
    expect(tagsFor({ ...base, name: null }).name).toBeUndefined();
  });
  it('trims the name', () => {
    expect(tagsFor({ ...base, name: '  Library ' }).name).toBe('Library');
  });
});

describe('lines', () => {
  it('writes key=value lines and folds line breaks in a value', () => {
    expect(tagLines({ name: 'a\nb', source: 'x' })).toEqual(['name=a b', 'source=x']);
  });
  it('round-trips through parseTagLines', () => {
    const tags = tagsFor(base);
    const parsed = parseTagLines(tagLines(tags).join('\n'));
    expect(parsed.errors).toEqual([]);
    expect(Object.fromEntries(parsed.tags)).toEqual(tags);
  });
  it('keeps an equals sign inside a value', () => {
    expect(parseTagLines('source=a=b').tags).toEqual([['source', 'a=b']]);
  });
  it('reports a line without a key and skips blank lines', () => {
    const parsed = parseTagLines('name=x\n\n=y\nplain\r\nok=1');
    expect(parsed.tags).toEqual([['name', 'x'], ['ok', '1']]);
    expect(parsed.errors).toEqual([{ line: 3, text: '=y' }, { line: 4, text: 'plain' }]);
  });
});

describe('tagIssues', () => {
  it('finds each kind of problem', () => {
    const codes = (tags: [string, string][]) => tagIssues(tags).map((i) => i.code);
    expect(codes([['Bad Key', 'x']])).toEqual(['bad-key']);
    expect(codes([['a', ' ']])).toEqual(['empty-value']);
    expect(codes([['a', 'x\ny']])).toEqual(['bad-value']);
    expect(codes([['a', 'unknown']])).toEqual(['unknown-written']);
    expect(codes([['a', '1'], ['a', '2']])).toEqual(['duplicate-key']);
    expect(codes([['name', 'x']])).toEqual([]);
  });
  it('has English and French text for every code', () => {
    for (const code of ['bad-key', 'bad-value', 'empty-value', 'unknown-written', 'duplicate-key'] as const) {
      expect(tagIssueText({ code, key: 'k' }, 'en')).toContain('k');
      expect(tagIssueText({ code, key: 'k' }, 'fr')).toContain('k');
    }
  });
  it('never finds a problem in tags built from a record', () => {
    for (const wheelchair of ['yes', 'limited', 'no', 'UNKNOWN'] as const) {
      expect(tagIssues(Object.entries(tagsFor({ ...base, wheelchair })))).toEqual([]);
    }
  });
});

describe('diffTags', () => {
  it('lists added, changed and removed keys in order', () => {
    const diff = diffTags({ name: 'a', wheelchair: 'yes', source: 's' }, { name: 'b', phone: '1', source: 's' });
    expect(diff).toEqual({ added: ['wheelchair'], changed: ['name'], removed: ['phone'] });
  });
  it('says there are no differences', () => {
    const none = diffTags({ a: '1' }, { a: '1' });
    expect(diffText(none, 'en')).toBe('no differences');
    expect(diffText(none, 'fr')).toBe('aucune différence');
  });
  it('words each part and uses a narrow no-break space before the French semicolon', () => {
    const text = diffText({ added: ['x'], changed: ['y'], removed: ['z'] }, 'fr');
    expect(text).toContain(' ;');
    expect(diffText({ added: ['x'], changed: [], removed: ['z'] }, 'en')).toBe('adds: x; would drop: z');
  });
});
