/** Small geometry helpers for the pre-submission check. Pure; no network, no clock. */
export interface Point {
  lat: number;
  lon: number;
}

/** A rough box around Ontario. It is a plausibility check, not a border. */
export const ONTARIO_BOX = { south: 41.6, north: 56.9, west: -95.2, east: -74.3 } as const;

export function inOntarioBox(point: Point): boolean {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lon) &&
    point.lat >= ONTARIO_BOX.south &&
    point.lat <= ONTARIO_BOX.north &&
    point.lon >= ONTARIO_BOX.west &&
    point.lon <= ONTARIO_BOX.east
  );
}

const EARTH_RADIUS_M = 6_371_008.8;

/** Great-circle distance in metres. NaN when a coordinate is not a finite number. */
export function haversineMetres(a: Point, b: Point): number {
  if (![a.lat, a.lon, b.lat, b.lon].every(Number.isFinite)) return Number.NaN;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Digits after the decimal point as written by String(). Exponent forms count as 15. */
export function decimalPlaces(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const text = String(value);
  if (/e/i.test(text)) return 15;
  const dot = text.indexOf('.');
  return dot < 0 ? 0 : text.length - dot - 1;
}

export interface NearPair {
  a: string;
  b: string;
  metres: number;
}

export const MAX_NEAR_RECORDS = 2000;

/** Pairs of records closer than maxMetres, closest first. Looks at no more than MAX_NEAR_RECORDS records. */
export function nearPairs(records: readonly (Point & { id: string })[], maxMetres: number): NearPair[] {
  const limit = Math.min(records.length, MAX_NEAR_RECORDS);
  const out: NearPair[] = [];
  for (let i = 0; i < limit; i += 1) {
    const a = records[i];
    if (a === undefined) continue;
    for (let j = i + 1; j < limit; j += 1) {
      const b = records[j];
      if (b === undefined) continue;
      if (Math.abs(a.lat - b.lat) > 0.001) continue;
      const metres = haversineMetres(a, b);
      if (metres <= maxMetres) out.push({ a: a.id, b: b.id, metres });
    }
  }
  return out.sort((x, y) => x.metres - y.metres || x.a.localeCompare(y.a) || x.b.localeCompare(y.b));
}
