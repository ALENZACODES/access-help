import { fixFrench } from './frTypography';
import { isIsoDate } from './provenance';
import { describeFeature, effectiveStatus, mergeClaims, type FeatureClaim, type ResolvedClaim } from './status';
import { TERMS, type Lang } from './plainTerms';

/** A place and what sources say about its features. Nothing here is inferred. */
export interface Place {
  readonly id: string;
  readonly name: string;
  readonly claims: readonly FeatureClaim[];
}

/* ---------- freshness ---------- */

export type Freshness = 'current' | 'aging' | 'old' | 'undated';

export interface FreshnessLimits {
  readonly currentDays: number;
  readonly agingDays: number;
}

export const DEFAULT_LIMITS: FreshnessLimits = { currentDays: 365, agingDays: 730 };

function toUtc(date: string): number | null {
  return isIsoDate(date) ? Date.parse(`${date}T00:00:00Z`) : null;
}

/** Whole days from `from` to `to` (both YYYY-MM-DD). Null if either is not a real date. */
export function daysBetween(from: string, to: string): number | null {
  const a = toUtc(from);
  const b = toUtc(to);
  if (a === null || b === null) return null;
  return Math.round((b - a) / 86_400_000);
}

/** How old the source behind a claim is. Unknown, unsourced or future-dated claims are undated. */
export function claimFreshness(
  claim: FeatureClaim,
  today: string,
  limits: FreshnessLimits = DEFAULT_LIMITS,
): Freshness {
  if (effectiveStatus(claim) === 'unknown' || claim.provenance === undefined) return 'undated';
  const age = daysBetween(claim.provenance.date, today);
  if (age === null || age < 0) return 'undated';
  if (age <= limits.currentDays) return 'current';
  return age <= limits.agingDays ? 'aging' : 'old';
}

const FRESHNESS_TEXT: Readonly<Record<Lang, Readonly<Record<'aging' | 'old', string>>>> = {
  en: { aging: 'Information is getting old.', old: 'Information is old.' },
  fr: { aging: 'L’information commence à dater.', old: 'L’information est ancienne.' },
};

/** Null when there is nothing to add (current or undated). */
export function freshnessText(freshness: Freshness, lang: Lang): string | null {
  if (freshness === 'aging' || freshness === 'old') return FRESHNESS_TEXT[lang][freshness];
  return null;
}

/* ---------- summaries ---------- */

function plural(lang: Lang, n: number): boolean {
  // French uses the singular for 0 and 1.
  return lang === 'fr' ? n > 1 : n !== 1;
}

/** "3 reported as available, 1 reported as not available, 4 unknown". Counts every glossary term. */
export function summarisePlace(place: Place, lang: Lang): string {
  const merged = mergeClaims(
    TERMS.map((t) => t.id),
    place.claims,
  );
  const n = { present: 0, absent: 0, unknown: 0 };
  for (const c of merged) n[c.status] += 1;
  if (lang === 'fr') {
    const p = plural(lang, n.present);
    const a = plural(lang, n.absent);
    const u = plural(lang, n.unknown);
    return fixFrench(
      [
        `${n.present} ${p ? 'signalés comme disponibles' : 'signalé comme disponible'}`,
        `${n.absent} ${a ? 'signalés comme non disponibles' : 'signalé comme non disponible'}`,
        `${n.unknown} ${u ? 'inconnus' : 'inconnu'}`,
      ].join(', '),
    );
  }
  return `${n.present} reported as available, ${n.absent} reported as not available, ${n.unknown} unknown`;
}

/* ---------- matching ---------- */

export type Outcome = 'met' | 'not-met' | 'unknown';
export type Verdict = 'all-reported' | 'some-not-available' | 'incomplete' | 'no-requirements';

export interface RequirementResult {
  readonly termId: string;
  readonly outcome: Outcome;
  readonly claim: ResolvedClaim;
}

export interface PlaceMatch {
  readonly place: Place;
  readonly results: readonly RequirementResult[];
  readonly verdict: Verdict;
  readonly counts: Readonly<{ met: number; notMet: number; unknown: number }>;
}

const OUTCOME: Readonly<Record<'present' | 'absent' | 'unknown', Outcome>> = {
  present: 'met',
  absent: 'not-met',
  unknown: 'unknown',
};

/**
 * Compares a place with the features a person chose. Unknown never counts as met:
 * a place is only "all-reported" when every chosen feature has a sourced claim.
 */
export function matchPlace(place: Place, requirements: readonly string[]): PlaceMatch {
  const wanted = [...new Set(requirements)];
  const results = mergeClaims(wanted, place.claims).map(
    (claim): RequirementResult => ({ termId: claim.termId, outcome: OUTCOME[claim.status], claim }),
  );
  const counts = {
    met: results.filter((r) => r.outcome === 'met').length,
    notMet: results.filter((r) => r.outcome === 'not-met').length,
    unknown: results.filter((r) => r.outcome === 'unknown').length,
  };
  let verdict: Verdict = 'all-reported';
  if (results.length === 0) verdict = 'no-requirements';
  else if (counts.notMet > 0) verdict = 'some-not-available';
  else if (counts.unknown > 0) verdict = 'incomplete';
  return { place, results, verdict, counts };
}

/** One plain sentence. It never says a place is "accessible" overall. */
export function verdictText(match: PlaceMatch, lang: Lang): string {
  const n = match.results.length;
  const { notMet, unknown } = match.counts;
  if (lang === 'fr') {
    switch (match.verdict) {
      case 'no-requirements':
        return 'Aucune caractéristique choisie.';
      case 'all-reported':
        return n === 1
          ? 'La caractéristique choisie est signalée comme disponible.'
          : `Les ${n} caractéristiques choisies sont signalées comme disponibles.`;
      case 'some-not-available':
        return `${notMet} caractéristique${notMet > 1 ? 's' : ''} sur ${n} ${
          notMet === 1 ? 'est signalée' : 'sont signalées'
        } comme non disponible${notMet > 1 ? 's' : ''}.`;
      case 'incomplete':
        return fixFrench(
          `Information insuffisante : ${unknown} caractéristique${unknown > 1 ? 's' : ''} sur ${n} ${
            unknown === 1 ? 'est UNKNOWN' : 'sont UNKNOWN'
          }.`,
        );
    }
  }
  switch (match.verdict) {
    case 'no-requirements':
      return 'No features chosen.';
    case 'all-reported':
      return n === 1
        ? 'The feature you chose is reported as available.'
        : `All ${n} features you chose are reported as available.`;
    case 'some-not-available':
      return `${notMet} of ${n} features you chose ${notMet === 1 ? 'is' : 'are'} reported as not available.`;
    case 'incomplete':
      return `Not enough information: ${unknown} of ${n} features you chose ${unknown === 1 ? 'is' : 'are'} unknown.`;
  }
}

const VERDICT_ORDER: Readonly<Record<Verdict, number>> = {
  'no-requirements': 0,
  'all-reported': 0,
  incomplete: 1,
  'some-not-available': 2,
};

/**
 * Best match first: all reported, then incomplete (fewest unknown first), then places
 * with something reported as not available (fewest first). Ties sort by name.
 */
export function rankPlaces(
  places: readonly Place[],
  requirements: readonly string[],
  lang: Lang = 'en',
): readonly PlaceMatch[] {
  return places
    .map((p) => matchPlace(p, requirements))
    .sort(
      (a, b) =>
        VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] ||
        a.counts.notMet - b.counts.notMet ||
        a.counts.unknown - b.counts.unknown ||
        a.place.name.localeCompare(b.place.name, lang) ||
        a.place.id.localeCompare(b.place.id),
    );
}

/** One line for a single requirement result, EN or FR. */
export function describeResult(result: RequirementResult, lang: Lang): string {
  return describeFeature(result.claim, lang).text;
}
