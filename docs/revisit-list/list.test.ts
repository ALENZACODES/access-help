import { describe, expect, it } from 'vitest';
import { place, TODAY } from './fixtures.js';
import { buildRevisitList, DEFAULT_OPTIONS, validOrigin } from './list.js';

const places = [
  place({ id: 'fine' }),
  place({ id: 'unknown', wheelchair: 'UNKNOWN', lat: 43.86 }),
  place({ id: 'old', observedOn: '2025-06-01', lat: 43.9 }),
  place({ id: 'clash', lat: 44.5 }, 'status'),
  place({ id: 'nameless', name: null, lat: 43.851 }),
];
const origin = { lat: 43.85, lon: -79.43 };

describe('validOrigin', () => {
  it('accepts a real point and rejects the rest', () => {
    expect(validOrigin(origin)).toBe(true);
    expect(validOrigin(null)).toBe(false);
    expect(validOrigin({ lat: Number.NaN, lon: 0 })).toBe(false);
    expect(validOrigin({ lat: 91, lon: 0 })).toBe(false);
    expect(validOrigin({ lat: 0, lon: 181 })).toBe(false);
  });
});

describe('buildRevisitList', () => {
  const list = buildRevisitList(places, TODAY);
  it('leaves out places with no reason', () => expect(list.items.map((i) => i.place.record.id)).not.toContain('fine'));
  it('orders by weight, heaviest first', () => expect(list.items.map((i) => i.place.record.id)).toEqual(['clash', 'unknown', 'old', 'nameless']));
  it('counts what it looked at, what matched and each reason', () => {
    expect(list.considered).toBe(5);
    expect(list.matched).toBe(4);
    expect(list.byReason).toEqual({ 'packs-disagree': 1, 'status-unknown': 1, 'very-old': 0, old: 1, 'date-unclear': 0, 'no-name': 1 });
  });
  it('has no distance without a start', () => expect(list.items.every((i) => i.km === null)).toBe(true));
  it('gives each item its age', () => expect(list.items.find((i) => i.place.record.id === 'old')?.ageDays).toBe(535));
  it('keeps only the reasons the person asked for', () => {
    const only = buildRevisitList(places, TODAY, { ...DEFAULT_OPTIONS, reasons: ['status-unknown', 'no-name'] });
    expect(only.items.map((i) => i.place.record.id)).toEqual(['unknown', 'nameless']);
    expect(only.byReason.old).toBe(1);
  });
  it('shows only the asked reasons on an item that has more', () => {
    const both = [place({ wheelchair: 'UNKNOWN', name: null })];
    expect(buildRevisitList(both, TODAY, { ...DEFAULT_OPTIONS, reasons: ['no-name'] }).items[0]?.reasons).toEqual(['no-name']);
  });
  it('measures from a start and breaks ties by distance', () => {
    const two = [place({ id: 'far', wheelchair: 'UNKNOWN', lat: 43.9 }), place({ id: 'near', wheelchair: 'UNKNOWN', lat: 43.851 })];
    const out = buildRevisitList(two, TODAY, { ...DEFAULT_OPTIONS, origin });
    expect(out.items.map((i) => i.place.record.id)).toEqual(['near', 'far']);
    expect(out.items[0]?.km).toBeGreaterThan(0.1);
    expect(out.items[0]?.km).toBeLessThan(0.12);
  });
  it('keeps only places within the chosen distance of the start', () => {
    const out = buildRevisitList(places, TODAY, { ...DEFAULT_OPTIONS, origin, withinKm: 5 });
    expect(out.items.map((i) => i.place.record.id)).toEqual(['unknown', 'nameless']);
    expect(out.matched).toBe(2);
  });
  it('ignores the distance limit without a start, and a start that is not a point', () => {
    expect(buildRevisitList(places, TODAY, { ...DEFAULT_OPTIONS, withinKm: 1 }).matched).toBe(4);
    expect(buildRevisitList(places, TODAY, { ...DEFAULT_OPTIONS, origin: { lat: 999, lon: 0 }, withinKm: 1 }).matched).toBe(4);
  });
  it('applies the limit after sorting and still reports how many matched', () => {
    const out = buildRevisitList(places, TODAY, { ...DEFAULT_OPTIONS, limit: 2 });
    expect(out.items.map((i) => i.place.record.id)).toEqual(['clash', 'unknown']);
    expect(out.matched).toBe(4);
  });
  it('shows at least one for a limit that makes no sense', () => {
    expect(buildRevisitList(places, TODAY, { ...DEFAULT_OPTIONS, limit: 0 }).items).toHaveLength(1);
  });
  it('is empty and calm with no places', () => {
    const out = buildRevisitList([], TODAY);
    expect(out).toMatchObject({ items: [], matched: 0, considered: 0 });
  });
  it('does not change its input', () => {
    const copy = JSON.parse(JSON.stringify(places));
    buildRevisitList(places, TODAY, { ...DEFAULT_OPTIONS, origin, withinKm: 25 });
    expect(places).toEqual(copy);
  });
});
