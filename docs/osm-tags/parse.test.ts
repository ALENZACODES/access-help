import { describe, expect, it } from 'vitest';
import { MAP_TEXT } from './fixtures.js';
import { MAX_PASTED_LINES, parseTagLine, parseTagText } from './parse.js';

describe('reading pasted tags', () => {
  it('reads key=value, with or without spaces around the sign', () => {
    expect(parseTagLine('wheelchair=yes')).toEqual({ key: 'wheelchair', value: 'yes' });
    expect(parseTagLine('  name = Sample Library  ')).toEqual({ key: 'name', value: 'Sample Library' });
  });
  it('reads the tab-separated form', () => {
    expect(parseTagLine('wheelchair\tlimited')).toEqual({ key: 'wheelchair', value: 'limited' });
  });
  it('keeps an equals sign inside a value', () => {
    expect(parseTagLine('note=a=b')).toEqual({ key: 'note', value: 'a=b' });
  });
  it('refuses a line with no key, no value or a space in the key', () => {
    expect(parseTagLine('=yes')).toBeNull();
    expect(parseTagLine('wheelchair=')).toBeNull();
    expect(parseTagLine('just some words')).toBeNull();
    expect(parseTagLine('two words=yes')).toBeNull();
  });
  it('skips blank lines and comment lines', () => {
    expect(parseTagLine('')).toBeNull();
    expect(parseTagLine('# copied on Tuesday')).toBeNull();
    expect(parseTagText('\n# note\n\nwheelchair=no\n').unread).toEqual([]);
  });
  it('refuses a value longer than OpenStreetMap keeps', () => {
    expect(parseTagLine(`name=${'x'.repeat(256)}`)).toBeNull();
  });
  it('reads a whole pasted block', () => {
    const parsed = parseTagText(MAP_TEXT);
    expect(parsed.tags.map((t) => t.key)).toEqual(['name', 'amenity', 'wheelchair', 'check_date:wheelchair', 'toilets:wheelchair']);
    expect(parsed).toMatchObject({ unread: [], repeated: [], cutOff: false });
  });
  it('reads Windows line endings', () => {
    expect(parseTagText('a=1\r\nb=2').tags).toEqual([{ key: 'a', value: '1' }, { key: 'b', value: '2' }]);
  });
  it('reports lines it could not read, clipped', () => {
    const parsed = parseTagText(`hello there\n${'word '.repeat(30)}\nwheelchair=yes`);
    expect(parsed.unread[0]).toBe('hello there');
    expect(parsed.unread[1]?.length).toBe(80);
    expect(parsed.unread[1]?.endsWith('…')).toBe(true);
    expect(parsed.tags).toHaveLength(1);
  });
  it('keeps the last value of a repeated key and names the key once', () => {
    const parsed = parseTagText('name=A\nname=B\nname=C');
    expect(parsed.tags).toEqual([{ key: 'name', value: 'C' }]);
    expect(parsed.repeated).toEqual(['name']);
  });
  it('reads only so many lines and says so', () => {
    const text = Array.from({ length: MAX_PASTED_LINES + 5 }, (_, i) => `k${i}=v`).join('\n');
    const parsed = parseTagText(text);
    expect(parsed.tags).toHaveLength(MAX_PASTED_LINES);
    expect(parsed.cutOff).toBe(true);
  });
  it('returns nothing for empty text', () => {
    expect(parseTagText('')).toEqual({ tags: [], unread: [], repeated: [], cutOff: false });
  });
});
