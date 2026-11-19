/**
 * Looks at the licences on a set of records and says what sharing them together asks of a
 * person. It reads the licence written on each record and nothing else. A licence the App does
 * not accept is reported, never guessed at.
 */
import { GUIDE_LICENCES, isGuideLicence, type GuideLicence } from './facts.js';

export interface LicensedRecord {
  id: string;
  source: string;
  licence: string;
  observedOn: string;
}

export type MixKind = 'empty' | 'cc0-only' | 'odbl-only' | 'cc0-and-odbl' | 'has-other';

export type Duty = 'credit-sources' | 'same-licence' | 'keep-open' | 'do-not-share-yet';

export interface LicenceCount {
  licence: string;
  count: number;
  accepted: boolean;
}

export interface Mix {
  kind: MixKind;
  total: number;
  counts: LicenceCount[];
  /** What sharing the whole set together asks for. Empty when nothing is asked. */
  duties: Duty[];
  /** The licence a combined file would carry. Null when it cannot be said. */
  combinedLicence: GuideLicence | null;
  /** Records with a licence the App does not accept. */
  otherIds: string[];
}

export function countLicences(records: readonly LicensedRecord[]): LicenceCount[] {
  const map = new Map<string, number>();
  for (const record of records) map.set(record.licence, (map.get(record.licence) ?? 0) + 1);
  const rank = (licence: string) => {
    const index = (GUIDE_LICENCES as readonly string[]).indexOf(licence);
    return index < 0 ? GUIDE_LICENCES.length : index;
  };
  return [...map.entries()]
    .map(([licence, count]) => ({ licence, count, accepted: isGuideLicence(licence) }))
    .sort((a, b) => rank(a.licence) - rank(b.licence) || a.licence.localeCompare(b.licence));
}

export function mixOf(records: readonly LicensedRecord[]): Mix {
  const counts = countLicences(records);
  const otherIds = records.filter((record) => !isGuideLicence(record.licence)).map((record) => record.id);
  const has = (licence: GuideLicence) => counts.some((c) => c.licence === licence);
  const base = { total: records.length, counts, otherIds };
  if (records.length === 0) return { ...base, kind: 'empty', duties: [], combinedLicence: null };
  if (otherIds.length > 0) return { ...base, kind: 'has-other', duties: ['do-not-share-yet'], combinedLicence: null };
  if (has('ODbL-1.0')) {
    return {
      ...base,
      kind: has('CC0-1.0') ? 'cc0-and-odbl' : 'odbl-only',
      duties: ['credit-sources', 'same-licence', 'keep-open'],
      combinedLicence: 'ODbL-1.0',
    };
  }
  return { ...base, kind: 'cc0-only', duties: [], combinedLicence: 'CC0-1.0' };
}

/** The same records with the ones under a licence the App does not accept left out. */
export function acceptedOnly<T extends LicensedRecord>(records: readonly T[]): T[] {
  return records.filter((record) => isGuideLicence(record.licence));
}
