import { fixFrench } from './frTypography';
import type { Lang } from './plainTerms';

/** SPDX ids of licences we accept for data. Anything else is flagged. */
export const OPEN_LICENCES = [
  'CC0-1.0',
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
  'ODbL-1.0',
  'ODC-By-1.0',
  'PDDL-1.0',
  'OGL-Canada-2.0',
  'OGL-UK-3.0',
  'MIT',
  'Apache-2.0',
  'BSD-3-Clause',
] as const;

export type OpenLicence = (typeof OPEN_LICENCES)[number];

export interface Provenance {
  readonly source: string;
  readonly licence: string;
  /** YYYY-MM-DD: when the source was read or published. */
  readonly date: string;
  readonly url?: string;
  /** The tier label the record came with, such as "tier-1". See sourceTier.ts. A label, never a promise. */
  readonly tier?: string;
}

export type ProvenanceIssue =
  | 'source-missing'
  | 'licence-not-open'
  | 'date-invalid'
  | 'date-in-future'
  | 'url-invalid';

export function isOpenLicence(value: string): value is OpenLicence {
  return (OPEN_LICENCES as readonly string[]).includes(value);
}

/** Real calendar dates only: 2026-02-30 is rejected. */
export function isIsoDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m === null) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** `today` (YYYY-MM-DD) is optional; when given, future dates are flagged. */
export function validateProvenance(
  p: Partial<Provenance> | null | undefined,
  today?: string,
): readonly ProvenanceIssue[] {
  const issues: ProvenanceIssue[] = [];
  if (p === null || p === undefined || typeof p.source !== 'string' || p.source.trim() === '') {
    issues.push('source-missing');
  }
  if (p === null || p === undefined || typeof p.licence !== 'string' || !isOpenLicence(p.licence)) {
    issues.push('licence-not-open');
  }
  const date = p?.date;
  if (typeof date !== 'string' || !isIsoDate(date)) {
    issues.push('date-invalid');
  } else if (today !== undefined && date > today) {
    issues.push('date-in-future');
  }
  if (p?.url !== undefined && !/^https:\/\/\S+$/.test(p.url)) {
    issues.push('url-invalid');
  }
  return issues;
}

export function formatProvenance(p: Provenance, lang: Lang): string {
  if (lang === 'fr') {
    return fixFrench(`Source : ${p.source}. Licence : ${p.licence}. Date : ${p.date}.`);
  }
  return `Source: ${p.source}. Licence: ${p.licence}. Date: ${p.date}.`;
}
