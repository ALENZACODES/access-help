import { describe, expect, it } from 'vitest';
import { creditBlock, creditLines, creditLineText, withoutSource } from './credit.js';
import { lic, mixed } from './fixtures.js';

describe('creditLines', () => {
  const lines = creditLines(mixed());
  it('has one line per source and licence, ignoring case and extra spaces in the source', () => {
    expect(lines).toHaveLength(2);
    expect(lines.map((l) => l.count)).toEqual([2, 2]);
  });
  it('puts sources that ask for credit first', () => {
    expect(lines.map((l) => [l.licence, l.required])).toEqual([['ODbL-1.0', true], ['CC0-1.0', false]]);
  });
  it('keeps the source as first written, tidied', () => expect(lines[0]?.source).toBe('Sample open pack'));
  it('gives the span of dates', () => {
    expect(lines[0]).toMatchObject({ from: '2026-09-15', to: '2026-09-20' });
    expect(lines[1]).toMatchObject({ from: '2026-10-01', to: '2026-11-10' });
  });
  it('keeps the same source apart under two licences', () => {
    expect(creditLines([lic(), lic({ id: 'r2', licence: 'ODbL-1.0' })])).toHaveLength(2);
  });
  it('leaves out records with no source or with a licence the App does not accept', () => {
    expect(creditLines([lic({ source: '  ' }), lic({ id: 'x', licence: 'CC-BY-4.0' })])).toEqual([]);
  });
  it('orders by count, then by name', () => {
    const out = creditLines([lic({ source: 'b' }), lic({ id: '2', source: 'a' }), lic({ id: '3', source: 'c' }), lic({ id: '4', source: 'c' })]);
    expect(out.map((l) => l.source)).toEqual(['c', 'a', 'b']);
  });
  it('does not change its input', () => {
    const records = mixed();
    const copy = JSON.parse(JSON.stringify(records));
    creditLines(records);
    expect(records).toEqual(copy);
  });
});

describe('creditLineText', () => {
  it('writes source, licence, count and span', () => {
    expect(creditLineText(creditLines(mixed())[0]!, 'en')).toBe('Sample open pack, ODbL-1.0, 2 records, seen from 2026-09-15 to 2026-09-20.');
  });
  it('writes one day and the singular', () => {
    expect(creditLineText(creditLines([lic()])[0]!, 'en')).toBe('own visit, CC0-1.0, 1 record, seen on 2026-11-10.');
    expect(creditLineText(creditLines([lic()])[0]!, 'fr')).toBe('own visit, CC0-1.0, 1 fiche, vu le 2026-11-10.');
  });
});

describe('creditBlock', () => {
  it('is empty with nothing to credit', () => {
    expect(creditBlock([], 'en')).toBe('');
    expect(creditBlock([lic({ source: '' })], 'en')).toBe('');
  });
  it('separates sources that ask for credit from those listed for clarity', () => {
    expect(creditBlock(mixed(), 'en').split('\n')).toEqual([
      'Sources that ask for credit',
      '- Sample open pack, ODbL-1.0, 2 records, seen from 2026-09-15 to 2026-09-20.',
      '',
      'Sources listed for clarity (credit not required)',
      '- own visit, CC0-1.0, 2 records, seen from 2026-10-01 to 2026-11-10.',
    ]);
  });
  it('has only the clarity list for CC0-1.0 records', () => {
    expect(creditBlock([lic()], 'en').split('\n')[0]).toBe('Sources listed for clarity (credit not required)');
  });
  it('is in French when asked', () => expect(creditBlock(mixed(), 'fr')).toContain('Sources qui demandent une mention'));
});

describe('withoutSource', () => {
  it('finds records that cannot be credited', () => {
    expect(withoutSource([lic(), lic({ id: 'x', source: ' ' })]).map((r) => r.id)).toEqual(['x']);
  });
});
