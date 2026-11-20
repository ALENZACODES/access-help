import { describe, expect, it } from 'vitest';
import { fieldCm, formatCm, formatInches, parseLength } from './units.js';

describe('reading a length', () => {
  it('reads a bare number as centimetres', () => {
    expect(parseLength('82')).toEqual({ ok: true, cm: 82, unit: 'cm' });
    expect(parseLength(' 82.5 ')).toEqual({ ok: true, cm: 82.5, unit: 'cm' });
  });
  it('reads a comma as a decimal mark', () => {
    expect(parseLength('82,5')).toEqual({ ok: true, cm: 82.5, unit: 'cm' });
    expect(parseLength('82,5 cm')).toEqual({ ok: true, cm: 82.5, unit: 'cm' });
  });
  it('reads centimetres with or without a space, in any case', () => {
    expect(parseLength('82cm')).toMatchObject({ cm: 82 });
    expect(parseLength('82 CM')).toMatchObject({ cm: 82 });
    expect(parseLength('82 cm')).toMatchObject({ cm: 82 });
  });
  it('reads metres', () => {
    expect(parseLength('0.82 m')).toEqual({ ok: true, cm: 82, unit: 'm' });
    expect(parseLength('1,2m')).toEqual({ ok: true, cm: 120, unit: 'm' });
  });
  it('reads inches in English and French and with the double-prime mark', () => {
    for (const text of ['32 in', '32in', '32 inches', '32 po', '32 pouces', '32"']) expect(parseLength(text)).toEqual({ ok: true, cm: 81.3, unit: 'in' });
    expect(parseLength('1 inch')).toEqual({ ok: true, cm: 2.5, unit: 'in' });
  });
  it('rounds to one decimal of a centimetre', () => {
    expect(parseLength('82.56')).toMatchObject({ cm: 82.6 });
    expect(parseLength('33.5 in')).toMatchObject({ cm: 85.1 });
  });
  it('says an empty field is empty', () => {
    expect(parseLength('')).toEqual({ ok: false, code: 'empty' });
    expect(parseLength('   ')).toEqual({ ok: false, code: 'empty' });
  });
  it('refuses words, two numbers, feet and odd units', () => {
    for (const text of ['wide', '82 83', "2' 8\"", '82 mm', '82cm wide', '1e3', '8.2.5', '.5', '82.555']) expect(parseLength(text)).toEqual({ ok: false, code: 'not-a-number' });
  });
  it('refuses a negative length', () => {
    expect(parseLength('-5')).toEqual({ ok: false, code: 'negative' });
  });
  it('refuses a number with too many digits', () => {
    expect(parseLength('123456')).toEqual({ ok: false, code: 'not-a-number' });
  });
});

describe('writing a length', () => {
  it('writes centimetres without a needless decimal', () => {
    expect(formatCm(82, 'en')).toBe('82 cm');
    expect(formatCm(82.5, 'en')).toBe('82.5 cm');
    expect(formatCm(82.04, 'en')).toBe('82 cm');
  });
  it('writes French with a decimal comma and a no-break space', () => {
    expect(formatCm(82.5, 'fr')).toBe('82,5 cm');
    expect(formatCm(82, 'fr')).toBe('82 cm');
  });
  it('writes the same length in inches to one decimal', () => {
    expect(formatInches(81.3, 'en')).toBe('32.0 in');
    expect(formatInches(82.5, 'fr')).toBe('32,5 po');
  });
  it('writes a form field value in the person’s decimal style', () => {
    expect(fieldCm(82.5, 'en')).toBe('82.5');
    expect(fieldCm(82.5, 'fr')).toBe('82,5');
    expect(fieldCm(82, 'fr')).toBe('82');
    expect(fieldCm(null, 'en')).toBe('');
  });
  it('reads back what it wrote', () => {
    for (const cm of [30, 82.5, 14, 399.9]) {
      expect(parseLength(formatCm(cm, 'en'))).toMatchObject({ cm });
      expect(parseLength(formatCm(cm, 'fr'))).toMatchObject({ cm });
    }
  });
});
