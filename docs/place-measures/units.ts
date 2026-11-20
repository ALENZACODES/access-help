/**
 * Reads a length a person typed and writes lengths back out. Pure: no network, no storage, no
 * clock. Lengths are kept in centimetres, to one decimal. Nothing here guesses a unit that was
 * not typed: a bare number is centimetres.
 */
import { pick, type PreLang } from '../presubmit/text.js';

export const CM_PER_INCH = 2.54;

export type LengthFailure = 'empty' | 'not-a-number' | 'negative';

export type LengthResult = { ok: true; cm: number; unit: 'cm' | 'in' | 'm' } | { ok: false; code: LengthFailure };

function roundCm(cm: number): number {
  return Math.round(cm * 10) / 10;
}

/**
 * Accepts "82", "82.5", "82,5", "82 cm", "0.82 m", "32 in", "32 po" and 32". A comma is read as
 * a decimal mark, the way it is typed in French.
 */
export function parseLength(input: string): LengthResult {
  const text = input.trim().toLowerCase().replace(/\u00a0|\u202f/g, ' ');
  if (text === '') return { ok: false, code: 'empty' };
  const match = /^(-?)(\d{1,4}(?:[.,]\d{1,2})?)\s*(cm|m|in|inch|inches|po|pouce|pouces|")?$/.exec(text);
  if (match === null) return { ok: false, code: 'not-a-number' };
  if (match[1] === '-') return { ok: false, code: 'negative' };
  const value = Number((match[2] ?? '').replace(',', '.'));
  if (!Number.isFinite(value)) return { ok: false, code: 'not-a-number' };
  const suffix = match[3];
  if (suffix === undefined || suffix === 'cm') return { ok: true, cm: roundCm(value), unit: 'cm' };
  if (suffix === 'm') return { ok: true, cm: roundCm(value * 100), unit: 'm' };
  return { ok: true, cm: roundCm(value * CM_PER_INCH), unit: 'in' };
}

/** "82 cm" or "82.5 cm"; French uses a decimal comma and a no-break space before the unit. */
export function formatCm(cm: number, lang: PreLang): string {
  const rounded = roundCm(cm);
  const digits = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return pick(lang, `${digits} cm`, `${digits.replace('.', ',')}\u00a0cm`);
}

/** The same length in inches, to one decimal, for a person who thinks in inches. */
export function formatInches(cm: number, lang: PreLang): string {
  const inches = (Math.round((cm / CM_PER_INCH) * 10) / 10).toFixed(1);
  return pick(lang, `${inches} in`, `${inches.replace('.', ',')}\u00a0po`);
}

/** The value to put back in a form field: a plain number in centimetres, in the person's decimal style. */
export function fieldCm(cm: number | null, lang: PreLang): string {
  if (cm === null) return '';
  const rounded = roundCm(cm);
  const digits = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return lang === 'fr' ? digits.replace('.', ',') : digits;
}
