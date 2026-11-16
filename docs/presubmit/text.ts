/**
 * Text helpers for the presubmit modules.
 * French spacing: U+2019 for the apostrophe, U+00A0 before ":" and "%",
 * U+202F before ";", "!" and "?". The spacing characters are written as
 * escapes so they survive editors that turn them into plain spaces.
 */
export type PreLang = 'en' | 'fr';

export const NBSP = '\u00a0';
export const NNBSP = '\u202f';

export function pick<T>(lang: PreLang, en: T, fr: T): T {
  return lang === 'fr' ? fr : en;
}

/** Replaces {name} placeholders. A placeholder with no value stays visible so tests catch the gap. */
export function fill(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));
}

/** French treats 0 and 1 as singular; English only 1. */
export function plural(lang: PreLang, count: number, one: string, many: string): string {
  const singular = lang === 'fr' ? count >= 0 && count < 2 : count === 1;
  return singular ? one : many;
}

/** ": " in English, NBSP then ": " in French. */
export function colon(lang: PreLang): string {
  return lang === 'fr' ? `${NBSP}: ` : ': ';
}

/** A decimal with a comma in French and a dot in English. */
export function formatDecimal(value: number, digits: number, lang: PreLang): string {
  if (!Number.isFinite(value)) return '—';
  const text = value.toFixed(digits);
  return lang === 'fr' ? text.replace('.', ',') : text;
}

/** Metres as "85 m" or "1.2 km" (French "1,2 km"), with a no-break space before the unit in French. */
export function formatMetres(metres: number, lang: PreLang): string {
  if (!Number.isFinite(metres) || metres < 0) return '—';
  const gap = lang === 'fr' ? NBSP : ' ';
  if (metres < 1000) return `${Math.round(metres)}${gap}m`;
  return `${formatDecimal(metres / 1000, 1, lang)}${gap}km`;
}

export function isIsoDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Whole days from a to b (b minus a). Null when either is not a real YYYY-MM-DD date. */
export function daysBetween(a: string, b: string): number | null {
  if (!isIsoDay(a) || !isIsoDay(b)) return null;
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Joins items as "a, b and c" (French "a, b et c"). */
export function joinList(items: readonly string[], lang: PreLang): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0] ?? '';
  const word = pick(lang, 'and', 'et');
  const head = items.slice(0, -1).join(', ');
  return `${head} ${word} ${items[items.length - 1] ?? ''}`;
}

/** Cuts text to at most max characters (code points), ending with an ellipsis when cut. */
export function clip(text: string, max: number): string {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  return `${chars.slice(0, Math.max(0, max - 1)).join('').trimEnd()}…`;
}
