import { fixFrench } from './frTypography';
import type { Place } from './places';
import type { Lang } from './plainTerms';
import { formatProvenance, type Provenance } from './provenance';
import { effectiveStatus } from './status';
import { escapeHtml } from './text';

/**
 * The tier label on a record. A tier says how the information was collected. It is a label,
 * never a promise about the place. A record with no tier, or with a tier this prototype does
 * not produce, is shown as "Tier: unknown". Nothing is ever moved up a tier.
 */
export const TIER_IDS = ['tier-0', 'tier-1', 'tier-2', 'tier-3', 'tier-4', 'tier-e'] as const;
export type SourceTier = (typeof TIER_IDS)[number];

/** The tiers this prototype may put on a record. Higher tiers need an evidence block that it does not produce. */
export const EMITTED_TIERS: readonly SourceTier[] = ['tier-0', 'tier-1'];

export function isTier(value: unknown): value is SourceTier {
  return typeof value === 'string' && (TIER_IDS as readonly string[]).includes(value);
}

/**
 * Reads a tier from a data file: "tier-1", "Tier 1", "niveau 1", "1", 1 or "E". Null for anything else.
 * Only whole labels count; "11" or "tier 1b" is not a tier.
 */
export function parseTier(input: unknown): SourceTier | null {
  if (typeof input === 'number') return Number.isInteger(input) ? parseTier(String(input)) : null;
  if (typeof input !== 'string') return null;
  const m = /^(?:(?:tier|niveau)[\s-]*)?([0-4e])$/i.exec(input.trim());
  if (m === null) return null;
  const id = `tier-${(m[1] ?? '').toLowerCase()}`;
  return isTier(id) ? id : null;
}

export type TierProblem = 'tier-missing' | 'tier-not-known' | 'tier-needs-evidence';

/** What is wrong with the tier on a record, or null when it can be shown. */
export function tierProblem(p: Pick<Provenance, 'tier'> | null | undefined): TierProblem | null {
  const raw = p?.tier;
  if (raw === undefined || raw.trim() === '') return 'tier-missing';
  const tier = parseTier(raw);
  if (tier === null) return 'tier-not-known';
  return EMITTED_TIERS.includes(tier) ? null : 'tier-needs-evidence';
}

/** The tier that may be shown for a record, or null (shown as unknown). */
export function effectiveTier(p: Pick<Provenance, 'tier'> | null | undefined): SourceTier | null {
  return tierProblem(p) === null ? parseTier(p?.tier) : null;
}

/** The same source with a tier label. A value that is not a tier leaves the source as it is. */
export function withTier(p: Provenance, tier: unknown): Provenance {
  const parsed = parseTier(tier);
  return parsed === null ? p : { ...p, tier: parsed };
}

export const TIER_UI = {
  en: {
    heading: 'About tiers',
    intro: 'A tier is a label for how the information was collected. It is not a promise about the place.',
    names: { 'tier-0': 'Tier 0', 'tier-1': 'Tier 1', 'tier-2': 'Tier 2', 'tier-3': 'Tier 3', 'tier-4': 'Tier 4', 'tier-e': 'Tier E' },
    unknown: 'Tier unknown',
    line: (tier: string): string => `Tier: ${tier}.`,
    value: { 'tier-0': '0', 'tier-1': '1', 'tier-2': '2', 'tier-3': '3', 'tier-4': '4', 'tier-e': 'E' },
    valueUnknown: 'unknown',
    about: {
      'tier-0': 'Tier 0: evidence may be missing.',
      'tier-1': 'Tier 1: a label only. It does not mean anyone went to the place.',
    },
    aboutUnknown: 'Tier unknown: the record has no tier, or a tier this version cannot show.',
    count: (n: number): string => (n === 1 ? '1 record' : `${n} records`),
    none: 'No records are loaded.',
    problems: {
      'tier-missing': 'The record has no tier.',
      'tier-not-known': 'The tier on the record is not one we know.',
      'tier-needs-evidence': 'This tier needs evidence that this version does not hold.',
    },
  },
  fr: {
    heading: 'À propos des niveaux',
    intro: 'Un niveau est une étiquette sur la façon dont l’information a été recueillie. Ce n’est pas une promesse sur le lieu.',
    names: { 'tier-0': 'Niveau 0', 'tier-1': 'Niveau 1', 'tier-2': 'Niveau 2', 'tier-3': 'Niveau 3', 'tier-4': 'Niveau 4', 'tier-e': 'Niveau E' },
    unknown: 'Niveau inconnu',
    line: (tier: string): string => `Niveau\u00a0: ${tier}.`,
    value: { 'tier-0': '0', 'tier-1': '1', 'tier-2': '2', 'tier-3': '3', 'tier-4': '4', 'tier-e': 'E' },
    valueUnknown: 'inconnu',
    about: {
      'tier-0': 'Niveau 0\u00a0: des preuves peuvent manquer.',
      'tier-1': 'Niveau 1\u00a0: une étiquette seulement. Cela ne veut pas dire que quelqu’un est allé sur place.',
    },
    aboutUnknown: 'Niveau inconnu\u00a0: la fiche n’a pas de niveau, ou a un niveau que cette version ne peut pas afficher.',
    count: (n: number): string => (n === 1 ? '1 fiche' : `${n} fiches`),
    none: 'Aucune fiche n’est chargée.',
    problems: {
      'tier-missing': 'La fiche n’a pas de niveau.',
      'tier-not-known': 'Le niveau de la fiche n’est pas un niveau que nous connaissons.',
      'tier-needs-evidence': 'Ce niveau demande des preuves que cette version ne possède pas.',
    },
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

/** "Tier 1", or "Tier unknown" when there is no tier that may be shown. */
export function tierName(tier: SourceTier | null, lang: Lang): string {
  return tier === null ? TIER_UI[lang].unknown : TIER_UI[lang].names[tier];
}

/** "Tier: 1." or "Tier: unknown." for the end of a source line. */
export function tierLine(p: Pick<Provenance, 'tier'> | null | undefined, lang: Lang): string {
  const tier = effectiveTier(p);
  const ui = TIER_UI[lang];
  return fr(lang, ui.line(tier === null ? ui.valueUnknown : ui.value[tier]));
}

/** Source, licence, date and tier for one record, in one line. */
export function recordLine(p: Provenance, lang: Lang): string {
  return `${formatProvenance(p, lang)} ${tierLine(p, lang)}`;
}

export interface TierCounts {
  /** Records (reported as available or not available, with a usable source) by the tier that may be shown. */
  readonly byTier: Readonly<Record<SourceTier, number>>;
  /** Records whose tier is missing or cannot be shown. */
  readonly unknown: number;
  readonly total: number;
}

/** Counts the records that say something. Unknown and unsourced records are not counted at all. */
export function tierCounts(places: readonly Place[]): TierCounts {
  const byTier: Record<SourceTier, number> = { 'tier-0': 0, 'tier-1': 0, 'tier-2': 0, 'tier-3': 0, 'tier-4': 0, 'tier-e': 0 };
  let unknown = 0;
  let total = 0;
  for (const place of places) {
    for (const claim of place.claims) {
      if (effectiveStatus(claim) === 'unknown') continue;
      total += 1;
      const tier = effectiveTier(claim.provenance);
      if (tier === null) unknown += 1;
      else byTier[tier] += 1;
    }
  }
  return { byTier, unknown, total };
}

export type RecordTierProblem = `${TierProblem}:${string}:${string}`;

/** Every record that says something but whose tier cannot be shown, as "problem:place:feature". */
export function recordTierProblems(places: readonly Place[]): readonly RecordTierProblem[] {
  const out: RecordTierProblem[] = [];
  for (const place of places) {
    for (const claim of place.claims) {
      if (effectiveStatus(claim) === 'unknown') continue;
      const problem = tierProblem(claim.provenance);
      if (problem !== null) out.push(`${problem}:${place.id}:${claim.termId}`);
    }
  }
  return out;
}

/** The legend: what a tier is, and how many loaded records have each one. */
export function renderTierLegend(counts: TierCounts, lang: Lang): string {
  const ui = TIER_UI[lang];
  const intro = `<p>${escapeHtml(ui.intro)}</p>`;
  if (counts.total === 0) return `${intro}<p class="gl-note">${escapeHtml(ui.none)}</p>`;
  const rows = EMITTED_TIERS.map((tier) => {
    const about = ui.about[tier as 'tier-0' | 'tier-1'];
    return `<li>${escapeHtml(fr(lang, about))} <span class="gl-note">(${escapeHtml(ui.count(counts.byTier[tier]))})</span></li>`;
  }).join('');
  const unknown = `<li>${escapeHtml(fr(lang, ui.aboutUnknown))} <span class="gl-note">(${escapeHtml(ui.count(counts.unknown))})</span></li>`;
  return `${intro}<ul class="gl-tiers">${rows}${unknown}</ul>`;
}
