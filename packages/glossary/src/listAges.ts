import { fixFrench } from './frTypography';
import type { Lang } from './plainTerms';
import { claimFreshness, type Freshness, type Place } from './places';

/**
 * How old the information behind a list of places is, in counts. It says how recent the sources are.
 * It never says that a place is accessible or that the information is right.
 */
export interface AgeCounts {
  readonly total: number;
  /** Best source for the place is under a year old. */
  readonly recent: number;
  /** Best source is older than that. */
  readonly older: number;
  /** No dated information at all. */
  readonly none: number;
}

const RANK: Readonly<Record<Freshness, number>> = { current: 3, aging: 2, old: 1, undated: 0 };

/** The freshest source behind any claim of a place. */
export function bestFreshness(place: Place, today: string): Freshness {
  let best: Freshness = 'undated';
  for (const claim of place.claims) {
    const f = claimFreshness(claim, today);
    if (RANK[f] > RANK[best]) best = f;
  }
  return best;
}

export function countAges(places: readonly Place[], today: string): AgeCounts {
  let recent = 0;
  let older = 0;
  let none = 0;
  for (const place of places) {
    const f = bestFreshness(place, today);
    if (f === 'current') recent += 1;
    else if (f === 'undated') none += 1;
    else older += 1;
  }
  return { total: places.length, recent, older, none };
}

export const AGES_UI = {
  en: {
    lead: (total: number): string => (total === 1 ? 'Of 1 place:' : `Of ${total} places:`),
    recent: (n: number): string => `${n} with information from the last year`,
    older: (n: number): string => `${n} with older information`,
    none: (n: number): string => `${n} with no dated information`,
    and: 'and',
  },
  fr: {
    lead: (total: number): string => fixFrench(total === 1 ? 'Sur 1 lieu :' : `Sur ${total} lieux :`),
    recent: (n: number): string => `${n} avec une information de la dernière année`,
    older: (n: number): string => `${n} avec une information plus ancienne`,
    none: (n: number): string => `${n} sans information datée`,
    and: 'et',
  },
} as const;

/** One sentence, or an empty string for no places. Kinds with a count of zero are left out. */
export function agesText(counts: AgeCounts, lang: Lang): string {
  if (counts.total === 0) return '';
  const ui = AGES_UI[lang];
  const parts = [
    counts.recent > 0 ? ui.recent(counts.recent) : '',
    counts.older > 0 ? ui.older(counts.older) : '',
    counts.none > 0 ? ui.none(counts.none) : '',
  ].filter((p) => p !== '');
  const body = parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} ${ui.and} ${parts[parts.length - 1]}`;
  const text = `${ui.lead(counts.total)} ${body}.`;
  return lang === 'fr' ? fixFrench(text) : text;
}

export function summariseAges(places: readonly Place[], today: string, lang: Lang): string {
  return agesText(countAges(places, today), lang);
}
