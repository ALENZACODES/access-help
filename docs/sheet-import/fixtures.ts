import { mapHeaders, type HeaderMap } from './headers.js';
import type { SheetRecord } from './row.js';

export const TODAY = '2026-11-18';

export const HEADER = ['id', 'name', 'status', 'latitude', 'longitude', 'source', 'licence', 'observed_on'];

export function headerMap(header: readonly string[] = HEADER): HeaderMap {
  return mapHeaders(header);
}

/** A good line of cells in HEADER order, with any cells replaced. */
export function cells(over: Partial<Record<(typeof HEADER)[number], string>> = {}): string[] {
  const base: Record<string, string> = {
    id: 'a1',
    name: 'Sample Library',
    status: 'yes',
    latitude: '43.85123',
    longitude: '-79.43456',
    source: 'own visit',
    licence: 'CC0-1.0',
    observed_on: '2026-11-01',
  };
  return HEADER.map((key) => over[key] ?? base[key] ?? '');
}

export function rec(over: Partial<SheetRecord> = {}): SheetRecord {
  return { id: 'a1', lat: 43.85123, lon: -79.43456, name: 'Sample Library', wheelchair: 'yes', source: 'own visit', licence: 'CC0-1.0', observedOn: '2026-11-01', ...over };
}

export function sheetText(lines: readonly (readonly string[])[], delimiter = ','): string {
  return [HEADER, ...lines].map((line) => line.join(delimiter)).join('\r\n');
}
