/**
 * Small text helpers shared by the mapping-day planning modules.
 * French spacing used throughout: U+2019 for the apostrophe, U+00A0 before ":" and "%",
 * U+202F before ";", "!" and "?".
 */
export type DayLang = 'en' | 'fr';

export const NBSP = ' ';
export const NNBSP = ' ';

export function pick<T>(lang: DayLang, en: T, fr: T): T {
  return lang === 'fr' ? fr : en;
}

/** Replaces {name} placeholders. A placeholder with no value is left visible so a gap shows up in tests. */
export function fill(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));
}

/** French treats 0 and 1 as singular; English only 1. */
export function plural(lang: DayLang, count: number, one: string, many: string): string {
  const singular = lang === 'fr' ? count >= 0 && count < 2 : count === 1;
  return singular ? one : many;
}

/** ": " in English, NBSP + ": " in French. */
export function colon(lang: DayLang): string {
  return lang === 'fr' ? `${NBSP}: ` : ': ';
}

/** A share between 0 and 1 as a whole-number percentage. Null when there is nothing to divide. */
export function formatShare(ratio: number | null, lang: DayLang): string {
  if (ratio === null || !Number.isFinite(ratio)) return '—';
  const whole = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  return lang === 'fr' ? `${whole}${NBSP}%` : `${whole}%`;
}

/** Metres as "850 m" or "1.2 km" (French: "1,2 km"). */
export function formatDistance(metres: number, lang: DayLang): string {
  if (!Number.isFinite(metres) || metres < 0) return '—';
  if (metres < 1000) return `${Math.round(metres)} m`;
  const km = (Math.round(metres / 100) / 10).toFixed(1);
  return `${lang === 'fr' ? km.replace('.', ',') : km} km`;
}

/** Minutes as "45 min" or "1 h 05". */
export function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return '—';
  const whole = Math.round(minutes);
  if (whole < 60) return `${whole} min`;
  return `${Math.floor(whole / 60)} h ${String(whole % 60).padStart(2, '0')}`;
}

export function isIsoDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Whole days from a to b (b minus a), both YYYY-MM-DD. Null if either is not a real date. */
export function daysBetween(a: string, b: string): number | null {
  if (!isIsoDay(a) || !isIsoDay(b)) return null;
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Lower-case ASCII slug for file names. Never empty. */
export function slug(text: string): string {
  const base = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return base === '' ? 'untitled' : base;
}
