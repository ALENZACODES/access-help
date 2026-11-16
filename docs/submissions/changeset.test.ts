import { describe, expect, it } from 'vitest';
import { MAX_CHANGESET_DIGITS, changesetPath, isChangesetId, parseChangesetId } from './changeset.js';

describe('parseChangesetId', () => {
  const ok: [string, string][] = [
    ['123456', '123456'],
    ['  123456  ', '123456'],
    ['#123456', '123456'],
    ['# 123456', '123456'],
    ['changeset 123456', '123456'],
    ['Changeset: 123456', '123456'],
    ['changeset #123456', '123456'],
    ['lot 123456', '123456'],
    ['www.example.org/changeset/123456', '123456'],
    ['example.org/changeset/123456/', '123456'],
    ['example.org/changeset/123456?x=1', '123456'],
    ['000123', '123'],
    ['1', '1'],
  ];
  for (const [input, id] of ok) it(`reads "${input}" as ${id}`, () => expect(parseChangesetId(input)).toEqual({ ok: true, id }));

  const bad: [string, string][] = [
    ['', 'empty'],
    ['   ', 'empty'],
    ['abc', 'not-a-number'],
    ['12.5', 'not-a-number'],
    ['-5', 'not-a-number'],
    ['12 34', 'not-a-number'],
    ['1e5', 'not-a-number'],
    ['changeset', 'not-a-number'],
    ['0', 'zero'],
    ['0000', 'zero'],
    ['1'.repeat(MAX_CHANGESET_DIGITS + 1), 'too-long'],
  ];
  for (const [input, code] of bad) it(`rejects "${input}" as ${code}`, () => expect(parseChangesetId(input)).toEqual({ ok: false, code }));

  it('accepts the longest allowed number', () => {
    expect(parseChangesetId('9'.repeat(MAX_CHANGESET_DIGITS))).toEqual({ ok: true, id: '9'.repeat(MAX_CHANGESET_DIGITS) });
  });
  it('does not take the digits out of a longer sentence', () => {
    expect(parseChangesetId('I think it was 123456').ok).toBe(false);
  });
});

describe('helpers', () => {
  it('writes the path part only, never an address', () => {
    expect(changesetPath('42')).toBe('/changeset/42');
    expect(changesetPath('42')).not.toMatch(/https?:/);
  });
  it('recognises a stored changeset id', () => {
    expect(isChangesetId('123')).toBe(true);
    for (const value of ['0', '012', '', 'x', 12, null, '1'.repeat(13)]) expect(isChangesetId(value)).toBe(false);
  });
});
