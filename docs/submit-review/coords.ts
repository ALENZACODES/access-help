/**
 * Coordinate helpers. Pure: no network, no clock.
 * Used to flag coarse positions and to find places that may be the same place
 * recorded twice. A near pair is a prompt to look, never a decision.
 */
export interface LatLon {
  lat: number;
  lon: number;
}

const EARTH_RADIUS_M = 6_371_008.8;

/** Accepts "43.85" and, for French keyboards, "43,85". Rejects "1,234.5", exponents and stray text. */
export function parseDecimal(value: string): number | null {
  const trimmed = value.trim().replace(/^−/, '-');
  const normalised = /^-?\d+,\d+$/.test(trimmed) ? trimmed.replace(',', '.') : trimmed;
  if (!/^-?\d+(\.\d+)?$/.test(normalised)) return null;
  const number = Number(normalised);
  return Number.isFinite(number) ? number : null;
}

/** "43.85, -79.4" or "43,85 ; -79,4" as a pair. Null when it is not exactly two valid numbers in range. */
export function parseCoordinatePair(value: string): LatLon | null {
  const parts = value.includes(';') ? value.split(';') : value.split(/,\s+|\s+/);
  const cleaned = parts.map((part) => part.trim()).filter((part) => part !== '');
  if (cleaned.length !== 2) return null;
  const lat = parseDecimal(cleaned[0] ?? '');
  const lon = parseDecimal(cleaned[1] ?? '');
  if (lat === null || lon === null) return null;
  return isValidPoint({ lat, lon }) ? { lat, lon } : null;
}

export function isValidPoint(point: LatLon): boolean {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lon) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lon) <= 180
  );
}

/** Great-circle distance in metres. */
export function metresBetween(a: LatLon, b: LatLon): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Number of digits after the decimal point in the shortest form of the number. */
export function decimalPlaces(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const text = String(value);
  if (text.includes('e') || text.includes('E')) {
    const [mantissa = '', exponent = '0'] = text.toLowerCase().split('e');
    const digits = (mantissa.split('.')[1] ?? '').length;
    return Math.max(0, digits - Number(exponent));
  }
  return (text.split('.')[1] ?? '').length;
}

/** Roughly how far one unit in the last kept decimal place of latitude moves a point, in metres. */
export function precisionMetres(places: number): number {
  return 111_320 / 10 ** Math.max(0, places);
}

/** The smaller of the two coordinates' precision, as a count of decimal places. */
export function pointPlaces(point: LatLon): number {
  return Math.min(decimalPlaces(point.lat), decimalPlaces(point.lon));
}

export function roundCoordinate(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/** Fixed decimals, with a comma in French. */
export function formatCoordinate(value: number, places: number, lang: 'en' | 'fr'): string {
  const text = value.toFixed(places);
  return lang === 'fr' ? text.replace('.', ',') : text;
}

export interface NearPair<T> {
  a: T;
  b: T;
  metres: number;
}

/**
 * Pairs of items closer than radiusM, nearest first. Items are bucketed on a grid
 * of radiusM-sized cells so a long list is not compared pair by pair.
 * An item with an unusable position is ignored.
 */
export function nearPairs<T>(
  items: readonly T[],
  position: (item: T) => LatLon,
  radiusM: number,
): NearPair<T>[] {
  if (!(radiusM > 0)) return [];
  const cellDeg = radiusM / 111_320;
  const buckets = new Map<string, number[]>();
  const points: (LatLon | null)[] = items.map((item) => {
    const p = position(item);
    return isValidPoint(p) ? p : null;
  });
  const key = (row: number, col: number) => `${row}:${col}`;
  points.forEach((p, i) => {
    if (p === null) return;
    const k = key(Math.floor(p.lat / cellDeg), Math.floor(p.lon / cellDeg));
    const list = buckets.get(k);
    if (list) list.push(i);
    else buckets.set(k, [i]);
  });
  const pairs: NearPair<T>[] = [];
  points.forEach((p, i) => {
    if (p === null) return;
    const row = Math.floor(p.lat / cellDeg);
    // Longitude cells narrow toward the poles, so look a little further sideways.
    const spread = Math.max(1, Math.ceil(1 / Math.max(0.05, Math.cos((p.lat * Math.PI) / 180))));
    const col = Math.floor(p.lon / cellDeg);
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -spread; dc <= spread; dc += 1) {
        for (const j of buckets.get(key(row + dr, col + dc)) ?? []) {
          if (j <= i) continue;
          const q = points[j];
          const itemA = items[i];
          const itemB = items[j];
          if (!q || itemA === undefined || itemB === undefined) continue;
          const metres = metresBetween(p, q);
          if (metres < radiusM) pairs.push({ a: itemA, b: itemB, metres });
        }
      }
    }
  });
  return pairs.sort((x, y) => x.metres - y.metres);
}
