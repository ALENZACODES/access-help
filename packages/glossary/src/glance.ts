import type { Place } from './places';
import { TERMS, type Lang } from './plainTerms';
import { effectiveStatus, mergeClaims } from './status';
import { escapeHtml } from './text';

/**
 * The loaded records at a glance: how many places, how many records can be reported, how much
 * is still unknown, and how recent the newest source is. It counts what sources report. It does
 * not rate any place, and a high count is not a statement about a place.
 */
export interface Glance {
  readonly places: number;
  /** Places with no record that can be reported: every feature is unknown there. */
  readonly placesAllUnknown: number;
  /** Records that say available or not available and have a usable source. */
  readonly records: number;
  /** Place and feature pairs, out of `pairs`, where nothing can be reported (including where sources disagree). */
  readonly unknownPairs: number;
  readonly pairs: number;
  readonly sources: number;
  /** Newest and oldest source dates among reportable records. '' when there are none. */
  readonly newest: string;
  readonly oldest: string;
}

const IDS = TERMS.map((t) => t.id);
const KNOWN: ReadonlySet<string> = new Set(IDS);

export function glance(places: readonly Place[]): Glance {
  let records = 0;
  let unknownPairs = 0;
  let placesAllUnknown = 0;
  let newest = '';
  let oldest = '';
  const sources = new Set<string>();
  for (const place of places) {
    let reportable = 0;
    for (const claim of place.claims) {
      // A record about a feature the glossary does not know is never shown, so it is not counted.
      if (effectiveStatus(claim) === 'unknown' || claim.provenance === undefined || !KNOWN.has(claim.termId)) continue;
      reportable += 1;
      sources.add(JSON.stringify([claim.provenance.source.trim(), claim.provenance.licence.trim()]));
      const date = claim.provenance.date;
      if (newest === '' || date > newest) newest = date;
      if (oldest === '' || date < oldest) oldest = date;
    }
    records += reportable;
    if (reportable === 0) placesAllUnknown += 1;
    unknownPairs += mergeClaims(IDS, place.claims).filter((c) => c.status === 'unknown').length;
  }
  return { places: places.length, placesAllUnknown, records, unknownPairs, pairs: places.length * IDS.length, sources: sources.size, newest, oldest };
}

/** The share of place and feature pairs that are unknown, as a whole percent. 0 with no places. */
export function unknownPercent(g: Pick<Glance, 'unknownPairs' | 'pairs'>): number {
  return g.pairs === 0 ? 0 : Math.round((g.unknownPairs / g.pairs) * 100);
}

export const GLANCE_UI = {
  en: {
    heading: 'At a glance',
    none: 'No places are loaded yet.',
    places: (n: number): string => (n === 1 ? '1 place' : `${n} places`),
    records: (n: number): string => (n === 1 ? '1 record that can be reported' : `${n} records that can be reported`),
    sources: (n: number): string => (n === 1 ? 'from 1 source' : `from ${n} sources`),
    unknown: (percent: number): string => `${percent} percent of the features are unknown.`,
    allUnknown: (n: number): string => (n === 1 ? 'For 1 place, every feature is unknown.' : `For ${n} places, every feature is unknown.`),
    newest: (date: string): string => `The newest source is dated ${date}.`,
    oldest: (date: string): string => `The oldest source is dated ${date}.`,
    note: 'These are counts of what sources report. They do not rate any place.',
  },
  fr: {
    heading: 'En un coup d’œil',
    none: 'Aucun lieu n’est encore chargé.',
    places: (n: number): string => (n === 1 ? '1 lieu' : `${n} lieux`),
    records: (n: number): string => (n === 1 ? '1 fiche qui peut être signalée' : `${n} fiches qui peuvent être signalées`),
    sources: (n: number): string => (n === 1 ? 'de 1 provenance' : `de ${n} provenances`),
    unknown: (percent: number): string => `${percent} pour cent des caractéristiques sont UNKNOWN.`,
    allUnknown: (n: number): string => (n === 1 ? 'Pour 1 lieu, chaque caractéristique est UNKNOWN.' : `Pour ${n} lieux, chaque caractéristique est UNKNOWN.`),
    newest: (date: string): string => `La source la plus récente date du ${date}.`,
    oldest: (date: string): string => `La source la plus ancienne date du ${date}.`,
    note: 'Ce sont des décomptes de ce que les sources signalent. Ils ne notent aucun lieu.',
  },
} as const;

/** The sentences, in order. With no places there is one sentence. */
export function glanceLines(g: Glance, lang: Lang): readonly string[] {
  const ui = GLANCE_UI[lang];
  if (g.places === 0) return [ui.none];
  const first = `${ui.places(g.places)}, ${ui.records(g.records)}${g.records > 0 ? `, ${ui.sources(g.sources)}` : ''}.`;
  const lines = [first, ui.unknown(unknownPercent(g))];
  if (g.placesAllUnknown > 0) lines.push(ui.allUnknown(g.placesAllUnknown));
  if (g.newest !== '') lines.push(ui.newest(g.newest));
  if (g.oldest !== '' && g.oldest !== g.newest) lines.push(ui.oldest(g.oldest));
  return lines;
}

/** A short list of the sentences, with the note that these are counts and not ratings. */
export function renderGlance(places: readonly Place[], lang: Lang): string {
  const ui = GLANCE_UI[lang];
  const g = glance(places);
  const lines = glanceLines(g, lang);
  const note = g.places === 0 ? '' : `<p class="gl-note">${escapeHtml(ui.note)}</p>`;
  return `<h3 class="gl-note">${escapeHtml(ui.heading)}</h3><ul class="gl-glance">${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>${note}`;
}
