import { fixFrench } from './frTypography';
import { lookupTerm } from './glossary';
import { formatProvenance, validateProvenance, type Provenance } from './provenance';
import type { Lang } from './plainTerms';

export type FeatureStatus = 'present' | 'absent' | 'unknown';

export interface FeatureClaim {
  readonly termId: string;
  readonly status: FeatureStatus;
  readonly provenance?: Provenance;
}

export interface ResolvedClaim extends FeatureClaim {
  /** true when sources disagreed; the status is then unknown. */
  readonly conflict: boolean;
}

/** Only exact present/absent (or true/false) count. Everything else is unknown. */
export function normaliseStatus(input: unknown): FeatureStatus {
  if (input === 'present' || input === true) return 'present';
  if (input === 'absent' || input === false) return 'absent';
  return 'unknown';
}

/** A present/absent claim without a valid source, open licence and date is unknown. */
export function effectiveStatus(claim: FeatureClaim): FeatureStatus {
  if (claim.status === 'unknown') return 'unknown';
  if (claim.provenance === undefined || validateProvenance(claim.provenance).length > 0) {
    return 'unknown';
  }
  return claim.status;
}

/**
 * One resolved claim per term id. Missing terms are unknown (never inferred).
 * Two valid sources that disagree make the term unknown with conflict = true.
 */
export function mergeClaims(
  termIds: readonly string[],
  claims: readonly FeatureClaim[],
): readonly ResolvedClaim[] {
  return termIds.map((termId): ResolvedClaim => {
    const firm = claims.filter((c) => c.termId === termId && effectiveStatus(c) !== 'unknown');
    const first = firm[0];
    if (first === undefined) return { termId, status: 'unknown', conflict: false };
    const status = effectiveStatus(first);
    if (firm.some((c) => effectiveStatus(c) !== status)) {
      return { termId, status: 'unknown', conflict: true };
    }
    return {
      termId,
      status,
      conflict: false,
      ...(first.provenance !== undefined ? { provenance: first.provenance } : {}),
    };
  });
}

export function statusSummary(claims: readonly FeatureClaim[]): Readonly<Record<FeatureStatus, number>> {
  const out: Record<FeatureStatus, number> = { present: 0, absent: 0, unknown: 0 };
  for (const c of claims) out[effectiveStatus(c)] += 1;
  return out;
}

const LABELS: Readonly<Record<Lang, Readonly<Record<FeatureStatus | 'conflict', string>>>> = {
  en: {
    present: 'reported as available',
    absent: 'reported as not available',
    unknown: 'unknown',
    conflict: 'sources disagree',
  },
  fr: {
    present: 'signalé comme disponible',
    absent: 'signalé comme non disponible',
    unknown: 'inconnu',
    conflict: 'les sources ne concordent pas',
  },
};

/** Short label such as "reported as available" / "signalé comme disponible". */
export function statusLabel(status: FeatureStatus, lang: Lang, conflict = false): string {
  return LABELS[lang][conflict ? 'conflict' : status];
}

export interface FeatureDescription {
  readonly text: string;
  readonly status: FeatureStatus;
  /** Source line, only when the status is present or absent. */
  readonly source?: string;
}

export function describeFeature(
  claim: FeatureClaim & { readonly conflict?: boolean },
  lang: Lang,
): FeatureDescription {
  const status = effectiveStatus(claim);
  const term = lookupTerm(claim.termId, lang);
  if (!term.known) return { text: term.plain, status: 'unknown' };
  const labels = LABELS[lang];
  const label = claim.conflict === true ? labels.conflict : labels[status];
  const raw = lang === 'fr' ? `${term.term} : ${label}.` : `${term.term}: ${label}.`;
  const text = lang === 'fr' ? fixFrench(raw) : raw;
  if (status !== 'unknown' && claim.provenance !== undefined) {
    return { text, status, source: formatProvenance(claim.provenance, lang) };
  }
  return { text, status };
}
