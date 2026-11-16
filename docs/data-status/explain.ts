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

export function freshness(observedOn: string | null, today: string, recentDays = 365): Freshness {
  if (observedOn === null) return 'unknown';
  const a = toDay(observedOn);
  const b = toDay(today);
  if (a === null || b === null || a > b) return 'unknown';
  return b - a <= recentDays ? 'recent' : 'older';
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

export function explainRecord(r: ExportRecord, today: string, lang: Lang): string {
  const f = freshness(r.observedOn, today);
  if (lang === 'fr') {
    const name = r.name ?? 'Lieu sans nom';
    return (
      `${name}${NBSP}: ${WHEELCHAIR_FR[r.wheelchair]}. ` +
      `Observé le ${r.observedOn} (${FRESH_FR[f]}). ` +
      `Source${NBSP}: ${r.source}. Licence${NBSP}: ${r.licence}.`
    );
  }
  const name = r.name ?? 'Unnamed place';
  return (
    `${name}: ${WHEELCHAIR_EN[r.wheelchair]}. ` +
    `Observed ${r.observedOn} (${FRESH_EN[f]}). ` +
    `Source: ${r.source}. Licence: ${r.licence}.`
  );
}
