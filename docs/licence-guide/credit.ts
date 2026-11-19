/**
 * Builds the credit lines for a set of records: one line per source and licence, with how many
 * records and the span of dates. CC0 does not ask for credit; its sources are listed anyway so
 * nobody has to guess where a record came from.
 */
import { isGuideLicence } from './facts.js';
import type { LicensedRecord } from './mix.js';
import { fill, pick, plural, type PreLang } from '../presubmit/text.js';

export interface CreditLine {
  source: string;
  licence: string;
  count: number;
  /** Earliest and latest observation dates as written on the records. */
  from: string;
  to: string;
  /** True when the licence asks for this credit. */
  required: boolean;
}

export const MAX_CREDIT_LINES = 200;

function tidy(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function creditLines(records: readonly LicensedRecord[]): CreditLine[] {
  const map = new Map<string, CreditLine>();
  for (const record of records) {
    if (!isGuideLicence(record.licence)) continue;
    const source = tidy(record.source);
    if (source === '') continue;
    const key = `${record.licence}\n${source.toLowerCase()}`;
    const line = map.get(key);
    if (line === undefined) {
      map.set(key, { source, licence: record.licence, count: 1, from: record.observedOn, to: record.observedOn, required: record.licence === 'ODbL-1.0' });
    } else {
      line.count += 1;
      if (record.observedOn < line.from) line.from = record.observedOn;
      if (record.observedOn > line.to) line.to = record.observedOn;
    }
  }
  return [...map.values()]
    .sort((a, b) => Number(b.required) - Number(a.required) || b.count - a.count || a.source.localeCompare(b.source, 'en'))
    .slice(0, MAX_CREDIT_LINES);
}

export function creditLineText(line: CreditLine, lang: PreLang): string {
  const records = plural(lang, line.count, pick(lang, 'record', 'fiche'), pick(lang, 'records', 'fiches'));
  const span = line.from === line.to ? fill(pick(lang, 'seen on {from}', 'vu le {from}'), { from: line.from }) : fill(pick(lang, 'seen from {from} to {to}', 'vu du {from} au {to}'), { from: line.from, to: line.to });
  return fill(pick(lang, '{source}, {licence}, {count} {records}, {span}.', '{source}, {licence}, {count} {records}, {span}.'), {
    source: line.source,
    licence: line.licence,
    count: line.count,
    records,
    span,
  });
}

/** A block of text a person can paste beside data they share. Empty when there is nothing to credit. */
export function creditBlock(records: readonly LicensedRecord[], lang: PreLang): string {
  const lines = creditLines(records);
  if (lines.length === 0) return '';
  const required = lines.filter((line) => line.required);
  const listed = lines.filter((line) => !line.required);
  const out: string[] = [];
  if (required.length > 0) {
    out.push(pick(lang, 'Sources that ask for credit', 'Sources qui demandent une mention'));
    for (const line of required) out.push(`- ${creditLineText(line, lang)}`);
  }
  if (listed.length > 0) {
    if (out.length > 0) out.push('');
    out.push(pick(lang, 'Sources listed for clarity (credit not required)', 'Sources indiquées par souci de clarté (mention non exigée)'));
    for (const line of listed) out.push(`- ${creditLineText(line, lang)}`);
  }
  return out.join('\n');
}

/** Records whose source is empty, which cannot be credited. */
export function withoutSource<T extends LicensedRecord>(records: readonly T[]): T[] {
  return records.filter((record) => tidy(record.source) === '');
}
