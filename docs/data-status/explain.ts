/**
 * Data-status explainer: turns one record into a plain sentence in EN or FR.
 * It reports what was recorded and when. It never infers, and UNKNOWN is
 * always said out loud rather than hidden.
 */
import type { ExportRecord } from '../mapping-day/export';

export type Lang = 'en' | 'fr';
export type Freshness = 'recent' | 'older' | 'unknown';

const NBSP = ' ';
const DAY_MS = 86_400_000;

function toDay(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const t = Date.parse(`${iso}T00:00:00Z`);
  return Number.isNaN(t) ? null : Math.floor(t / DAY_MS);
}

/**
 * Recent windows from the plan (Part 1 section 5.5, T3-12/T3-13 for status
 * snapshots, and T3-15 for the annual parking cycle). Washrooms, charging,
 * benefits and policy (fares and booking rules) use 90 days, not a flat 365.
 * Parking and repair use the 365-day default. A missing category also uses
 * the default 365-day window.
 */
export const RECENT_WINDOWS_DAYS = {
  washroom: 90,
  charging: 90,
  benefits: 90,
  policy: 90,
  venue: 180,
  parking: 365,
  repair: 365,
  status: 30,
  default: 365,
} as const;

export type ExplainCategory = keyof typeof RECENT_WINDOWS_DAYS;

export function recentWindowDays(category?: string | null): number {
  if (category && category in RECENT_WINDOWS_DAYS) {
    return RECENT_WINDOWS_DAYS[category as ExplainCategory];
  }
  return RECENT_WINDOWS_DAYS.default;
}

export type ExplainableRecord = Omit<ExportRecord, 'observedOn'> & {
  observedOn: string | null;
  category?: ExplainCategory;
};

export function freshness(
  observedOn: string | null,
  today: string,
  category?: string | null,
): Freshness {
  if (observedOn === null) return 'unknown';
  const a = toDay(observedOn);
  const b = toDay(today);
  if (a === null || b === null || a > b) return 'unknown';
  return b - a <= recentWindowDays(category) ? 'recent' : 'older';
}

const WHEELCHAIR_EN: Record<ExportRecord['wheelchair'], string> = {
  yes: 'step-free access reported',
  limited: 'partial access reported',
  no: 'no step-free access reported',
  UNKNOWN: 'UNKNOWN (not observed yet)',
};

const WHEELCHAIR_FR: Record<ExportRecord['wheelchair'], string> = {
  yes: 'accès de plain-pied signalé',
  limited: 'accès partiel signalé',
  no: 'aucun accès de plain-pied signalé',
  UNKNOWN: 'UNKNOWN (pas encore observé)',
};

const FRESH_EN: Record<Freshness, string> = {
  recent: 'recent',
  older: 'older, may be out of date',
  unknown: 'date unknown',
};

const FRESH_FR: Record<Freshness, string> = {
  recent: 'récente',
  older: 'ancienne, peut être périmée',
  unknown: 'date inconnue',
};

function hasCalendarDate(value: string | null): value is string {
  return value !== null && toDay(value) !== null;
}

function observedClause(observedOn: string | null, f: Freshness, lang: Lang): string {
  if (!hasCalendarDate(observedOn)) {
    return lang === 'fr'
      ? `Date d’observation inconnue (${FRESH_FR.unknown})`
      : `Observed date unknown (${FRESH_EN.unknown})`;
  }
  return lang === 'fr'
    ? `Observé le ${observedOn} (${FRESH_FR[f]})`
    : `Observed ${observedOn} (${FRESH_EN[f]})`;
}

export function explainRecord(r: ExplainableRecord, today: string, lang: Lang): string {
  const f = freshness(r.observedOn, today, r.category);
  const when = observedClause(r.observedOn, f, lang);
  if (lang === 'fr') {
    const name = r.name ?? 'Lieu sans nom';
    return (
      `${name}${NBSP}: ${WHEELCHAIR_FR[r.wheelchair]}. ` +
      `${when}. ` +
      `Source${NBSP}: ${r.source}. Licence${NBSP}: ${r.licence}.`
    );
  }
  const name = r.name ?? 'Unnamed place';
  return (
    `${name}: ${WHEELCHAIR_EN[r.wheelchair]}. ` +
    `${when}. ` +
    `Source: ${r.source}. Licence: ${r.licence}.`
  );
}
