import { describe, expect, it } from 'vitest';
import { decimalPlaces, haversineMetres, inOntarioBox, nearPairs } from './geo.js';

describe('inOntarioBox', () => {
  it('accepts places in Toronto, Ottawa and Thunder Bay', () => {
    for (const p of [{ lat: 43.65, lon: -79.38 }, { lat: 45.42, lon: -75.69 }, { lat: 48.38, lon: -89.25 }]) expect(inOntarioBox(p)).toBe(true);
  });
  it('rejects Vancouver, Montreal and a swapped pair', () => {
    for (const p of [{ lat: 49.28, lon: -123.12 }, { lat: 45.5, lon: -73.57 }, { lat: -79.38, lon: 43.65 }]) expect(inOntarioBox(p)).toBe(false);
  });
  it('rejects non-finite numbers', () => {
    expect(inOntarioBox({ lat: Number.NaN, lon: -79 })).toBe(false);
    expect(inOntarioBox({ lat: 43, lon: Infinity })).toBe(false);
  });
  it('includes its edges', () => {
    expect(inOntarioBox({ lat: 41.6, lon: -95.2 })).toBe(true);
    expect(inOntarioBox({ lat: 56.9, lon: -74.3 })).toBe(true);
  });
});

describe('haversineMetres', () => {
  it('is zero for the same point', () => expect(haversineMetres({ lat: 43, lon: -79 }, { lat: 43, lon: -79 })).toBe(0));
  it('is about 111 km per degree of latitude', () => {
    expect(haversineMetres({ lat: 43, lon: -79 }, { lat: 44, lon: -79 })).toBeGreaterThan(111_000);
    expect(haversineMetres({ lat: 43, lon: -79 }, { lat: 44, lon: -79 })).toBeLessThan(111_400);
  });
  it('is symmetric', () => {
    const a = { lat: 43.1, lon: -79.2 };
    const b = { lat: 43.2, lon: -79.1 };
    expect(haversineMetres(a, b)).toBeCloseTo(haversineMetres(b, a), 6);
  });
  it('is NaN for a bad coordinate', () => expect(haversineMetres({ lat: Number.NaN, lon: 0 }, { lat: 0, lon: 0 })).toBeNaN());
});

describe('decimalPlaces', () => {
  it('counts what is written', () => {
    expect(decimalPlaces(43)).toBe(0);
    expect(decimalPlaces(43.5)).toBe(1);
    expect(decimalPlaces(43.85123)).toBe(5);
  });
  it('treats exponent forms and non-finite numbers safely', () => {
    expect(decimalPlaces(1e-7)).toBe(15);
    expect(decimalPlaces(Number.NaN)).toBe(0);
  });
});

describe('nearPairs', () => {
  const pts = [
    { id: 'a', lat: 43.85, lon: -79.43 },
    { id: 'b', lat: 43.85005, lon: -79.43 },
    { id: 'c', lat: 43.86, lon: -79.43 },
    { id: 'd', lat: 43.85, lon: -79.43002 },
  ];
  it('finds pairs under the limit, closest first', () => {
    const out = nearPairs(pts, 15);
    expect(out.map((p) => `${p.a}${p.b}`)).toEqual(['ad', 'ab', 'bd'].sort((x, y) => out.findIndex((o) => `${o.a}${o.b}` === x) - out.findIndex((o) => `${o.a}${o.b}` === y)));
    expect(out.every((p) => p.metres <= 15)).toBe(true);
    expect(out.some((p) => p.a === 'c' || p.b === 'c')).toBe(false);
  });
  it('orders by distance', () => {
    const out = nearPairs(pts, 15);
    for (let i = 1; i < out.length; i += 1) expect(out[i]!.metres).toBeGreaterThanOrEqual(out[i - 1]!.metres);
  });
  it('is empty for none or one', () => {
    expect(nearPairs([], 15)).toEqual([]);
    expect(nearPairs([pts[0]!], 15)).toEqual([]);
  });
  it('does not change its input', () => {
    const copy = JSON.parse(JSON.stringify(pts));
    nearPairs(pts, 15);
    expect(pts).toEqual(copy);
  });
});
