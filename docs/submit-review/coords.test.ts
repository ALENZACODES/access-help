import { describe, expect, it } from 'vitest';
import {
  decimalPlaces,
  formatCoordinate,
  isValidPoint,
  metresBetween,
  nearPairs,
  parseCoordinatePair,
  parseDecimal,
  pointPlaces,
  precisionMetres,
  roundCoordinate,
} from './coords.js';

describe('parseDecimal', () => {
  it('reads a dot or a comma and a leading minus sign', () => {
    expect(parseDecimal('43.85')).toBe(43.85);
    expect(parseDecimal('43,85')).toBe(43.85);
    expect(parseDecimal(' −79.4 ')).toBe(-79.4);
    expect(parseDecimal('7')).toBe(7);
  });
  it('rejects thousands separators, exponents and text', () => {
    expect(parseDecimal('1,234.5')).toBeNull();
    expect(parseDecimal('1e3')).toBeNull();
    expect(parseDecimal('12 m')).toBeNull();
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('.5')).toBeNull();
  });
});

describe('parseCoordinatePair', () => {
  it('reads a pair separated by comma-space, space or semicolon', () => {
    expect(parseCoordinatePair('43.85, -79.4')).toEqual({ lat: 43.85, lon: -79.4 });
    expect(parseCoordinatePair('43.85 -79.4')).toEqual({ lat: 43.85, lon: -79.4 });
    expect(parseCoordinatePair('43,85 ; -79,4')).toEqual({ lat: 43.85, lon: -79.4 });
  });
  it('rejects the wrong count, bad numbers and out-of-range values', () => {
    expect(parseCoordinatePair('43.85')).toBeNull();
    expect(parseCoordinatePair('1 2 3')).toBeNull();
    expect(parseCoordinatePair('a, b')).toBeNull();
    expect(parseCoordinatePair('91, 10')).toBeNull();
    expect(parseCoordinatePair('10, 181')).toBeNull();
  });
  it('validates points', () => {
    expect(isValidPoint({ lat: 0, lon: 0 })).toBe(true);
    expect(isValidPoint({ lat: 90.1, lon: 0 })).toBe(false);
    expect(isValidPoint({ lat: Number.NaN, lon: 0 })).toBe(false);
  });
});

describe('distance', () => {
  it('is zero for the same point and symmetric', () => {
    const a = { lat: 43.8, lon: -79.4 };
    const b = { lat: 43.81, lon: -79.41 };
    expect(metresBetween(a, a)).toBe(0);
    expect(metresBetween(a, b)).toBeCloseTo(metresBetween(b, a), 6);
  });
  it('is about 111 km per degree of latitude', () => {
    const d = metresBetween({ lat: 43, lon: -79 }, { lat: 44, lon: -79 });
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_400);
  });
  it('shrinks east-west distance with latitude', () => {
    const equator = metresBetween({ lat: 0, lon: 0 }, { lat: 0, lon: 1 });
    const north = metresBetween({ lat: 60, lon: 0 }, { lat: 60, lon: 1 });
    expect(north / equator).toBeCloseTo(0.5, 1);
  });
});

describe('precision', () => {
  it('counts decimal places, including exponent forms', () => {
    expect(decimalPlaces(43)).toBe(0);
    expect(decimalPlaces(43.85)).toBe(2);
    expect(decimalPlaces(1e-7)).toBe(7);
    expect(decimalPlaces(Number.NaN)).toBe(0);
  });
  it('uses the coarser of the two coordinates', () => {
    expect(pointPlaces({ lat: 43.123456, lon: -79.1 })).toBe(1);
  });
  it('estimates the error from the places kept', () => {
    expect(precisionMetres(0)).toBeCloseTo(111_320);
    expect(precisionMetres(5)).toBeCloseTo(1.1132);
  });
  it('rounds and formats', () => {
    expect(roundCoordinate(43.123456, 3)).toBe(43.123);
    expect(formatCoordinate(43.5, 3, 'en')).toBe('43.500');
    expect(formatCoordinate(43.5, 3, 'fr')).toBe('43,500');
  });
});

describe('nearPairs', () => {
  const at = (lat: number, lon: number) => ({ lat, lon });
  it('finds pairs under the radius, nearest first', () => {
    const items = [
      { id: 'a', ...at(43.8, -79.4) },
      { id: 'b', ...at(43.80005, -79.4) },
      { id: 'c', ...at(43.80001, -79.4) },
      { id: 'far', ...at(44.8, -79.4) },
    ];
    const pairs = nearPairs(items, (i) => i, 20);
    expect(pairs.map((p) => `${p.a.id}-${p.b.id}`)).toEqual(['a-c', 'b-c', 'a-b']);
    expect(pairs[0]?.metres).toBeLessThan(pairs[2]?.metres ?? 0);
  });
  it('does not pair a point with itself or count a pair twice', () => {
    const items = [{ id: 'a', ...at(1, 1) }, { id: 'b', ...at(1, 1) }];
    expect(nearPairs(items, (i) => i, 5)).toHaveLength(1);
  });
  it('finds a pair that straddles a grid cell edge', () => {
    const items = [{ id: 'a', ...at(10, 0.00008) }, { id: 'b', ...at(10, 0.00012) }];
    expect(nearPairs(items, (i) => i, 20)).toHaveLength(1);
  });
  it('finds pairs at high latitude where longitude cells are narrow', () => {
    const items = [{ id: 'a', ...at(75, 10) }, { id: 'b', ...at(75, 10.0005) }];
    const d = metresBetween(items[0] as { lat: number; lon: number }, items[1] as { lat: number; lon: number });
    expect(d).toBeLessThan(20);
    expect(nearPairs(items, (i) => i, 20)).toHaveLength(1);
  });
  it('ignores unusable positions and a non-positive radius', () => {
    const items = [{ id: 'a', ...at(Number.NaN, 0) }, { id: 'b', ...at(0, 0) }];
    expect(nearPairs(items, (i) => i, 10)).toEqual([]);
    expect(nearPairs([{ id: 'a', ...at(0, 0) }, { id: 'b', ...at(0, 0) }], (i) => i, 0)).toEqual([]);
  });
  it('agrees with a plain pairwise search on a larger set', () => {
    const items = Array.from({ length: 60 }, (_, i) => ({ id: `p${i}`, lat: 43 + ((i * 37) % 100) * 0.00004, lon: -79 + ((i * 53) % 100) * 0.00004 }));
    const quick = nearPairs(items, (i) => i, 30).length;
    let slow = 0;
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        if (metresBetween(items[i] as { lat: number; lon: number }, items[j] as { lat: number; lon: number }) < 30) slow += 1;
      }
    }
    expect(quick).toBe(slow);
  });
});
