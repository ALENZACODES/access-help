/**
 * Plain checks on one saved observation before a person submits it themselves.
 * The checks look for slips and things worth a second look. They never decide
 * whether OpenStreetMap will take an edit, and they never say a record is correct.
 */
import { decimalPlaces, haversineMetres, inOntarioBox, nearPairs, type NearPair } from './geo.js';
import { daysBetween, isIsoDay } from './text.js';

export type Severity = 'fix' | 'look' | 'note';

export type FindingCode =
  | 'date-invalid'
  | 'date-future'
  | 'source-empty'
  | 'licence-not-open'
  | 'name-too-long'
  | 'outside-ontario'
  | 'low-precision'
  | 'old-observation'
  | 'name-shouting'
  | 'name-spacing'
  | 'name-contact'
  | 'near-other'
  | 'name-missing'
  | 'status-unknown';

export interface Finding {
  recordId: string;
  code: FindingCode;
  severity: Severity;
  /** Numbers and ids a message may need. */
  days?: number;
  digits?: number;
  other?: string;
  metres?: number;
}

export interface CheckRecord {
  id: string;
  lat: number;
  lon: number;
  name: string | null;
  wheelchair: string;
  source: string;
  licence: string;
  observedOn: string;
}

export const OPEN_LICENCE_IDS: readonly string[] = ['CC0-1.0', 'ODbL-1.0'];
export const OLD_AFTER_DAYS = 365;
export const MIN_DECIMALS = 5;
export const NEAR_METRES = 15;
export const MAX_TAG_VALUE = 255;

const SEVERITY_ORDER: Record<Severity, number> = { fix: 0, look: 1, note: 2 };

export function severityRank(severity: Severity): number {
  return SEVERITY_ORDER[severity];
}

const CONTACT = /(?:https?:\/\/|www\.|\S+@\S+\.\S+|\+?\d[\d\s().-]{8,}\d)/i;

/** True for a name with four or more letters, all of them capitals. */
export function isShouting(name: string): boolean {
  const letters = name.replace(/[^\p{L}]/gu, '');
  return letters.length >= 4 && letters === letters.toUpperCase() && letters !== letters.toLowerCase();
}

export function hasOddSpacing(name: string): boolean {
  return name !== name.trim() || /\s{2,}/.test(name);
}

function add(out: Finding[], recordId: string, code: FindingCode, severity: Severity, extra: Partial<Finding> = {}): void {
  out.push({ recordId, code, severity, ...extra });
}

/** Findings for one record. `nearby` are the pairs that include this record. */
export function checkRecord(record: CheckRecord, today: string, nearby: readonly NearPair[] = []): Finding[] {
  const out: Finding[] = [];
  const id = record.id;

  if (!isIsoDay(record.observedOn)) {
    add(out, id, 'date-invalid', 'fix');
  } else {
    const age = daysBetween(record.observedOn, today);
    if (age !== null && age < 0) add(out, id, 'date-future', 'fix', { days: -age });
    else if (age !== null && age >= OLD_AFTER_DAYS) add(out, id, 'old-observation', 'look', { days: age });
  }

  if (record.source.trim() === '') add(out, id, 'source-empty', 'fix');
  if (!OPEN_LICENCE_IDS.includes(record.licence)) add(out, id, 'licence-not-open', 'fix');

  if (!inOntarioBox(record)) add(out, id, 'outside-ontario', 'look');
  const digits = Math.min(decimalPlaces(record.lat), decimalPlaces(record.lon));
  if (digits < MIN_DECIMALS) add(out, id, 'low-precision', 'look', { digits });

  if (record.name === null || record.name.trim() === '') {
    add(out, id, 'name-missing', 'note');
  } else {
    if (Array.from(record.name).length > MAX_TAG_VALUE) add(out, id, 'name-too-long', 'fix');
    if (isShouting(record.name)) add(out, id, 'name-shouting', 'look');
    if (hasOddSpacing(record.name)) add(out, id, 'name-spacing', 'look');
    if (CONTACT.test(record.name)) add(out, id, 'name-contact', 'look');
  }

  if (record.wheelchair === 'UNKNOWN') add(out, id, 'status-unknown', 'note');

  for (const pair of nearby) {
    const other = pair.a === id ? pair.b : pair.b === id ? pair.a : null;
    if (other !== null) add(out, id, 'near-other', 'look', { other, metres: Math.round(pair.metres) });
  }

  return out.sort((x, y) => severityRank(x.severity) - severityRank(y.severity));
}

/** Convenience: distance between two records in whole metres, or null when it cannot be worked out. */
export function metresBetween(a: CheckRecord, b: CheckRecord): number | null {
  const d = haversineMetres(a, b);
  return Number.isFinite(d) ? Math.round(d) : null;
}

export { nearPairs };
