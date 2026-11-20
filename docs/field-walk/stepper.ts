/**
 * Small helpers for the on-site controls: a plus and a minus beside a number, and a switch
 * between centimetres and inches. They only change what is typed. Nothing here invents a value:
 * pressing plus on an empty count gives one, and on an empty length gives nothing.
 */
import { LIMITS, parseLength } from '../place-measures/index.js';

export type Unit = 'cm' | 'in';
export const UNITS: readonly Unit[] = ['cm', 'in'];

export function isUnit(value: unknown): value is Unit {
  return value === 'cm' || value === 'in';
}

/** One more or one fewer step, kept between zero and the most the App keeps. */
export function nudgeCount(value: string, delta: 1 | -1): string {
  const text = value.trim();
  if (text === '') return delta === 1 ? '1' : '0';
  if (!/^\d{1,3}$/.test(text)) return value;
  return String(Math.min(LIMITS.steps.max, Math.max(0, Number(text) + delta)));
}

function trim(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Half a unit more or less on a typed length. An empty or unreadable field is left as it is. */
export function nudgeLength(value: string, delta: 1 | -1): string {
  const text = value.trim().replace(',', '.');
  if (!/^\d{1,4}(?:\.\d{1,2})?$/.test(text)) return value;
  return trim(Math.max(0, Number(text) + delta * 0.5));
}

/** What is typed, with its unit, as the walk reads it: a bare number in the chosen unit. */
export function withUnit(value: string, unit: Unit): string {
  const text = value.trim();
  if (text === '' || unit === 'cm' || !/^\d+(?:[.,]\d+)?$/.test(text)) return text;
  return `${text} in`;
}

/** A kept length, in centimetres, as a field value in the chosen unit. */
export function inUnit(cm: string, unit: Unit): string {
  const parsed = parseLength(cm);
  if (!parsed.ok) return '';
  return unit === 'cm' ? trim(parsed.cm) : trim(parsed.cm / 2.54);
}
