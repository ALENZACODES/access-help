import { describe, expect, it } from 'vitest';
import { place, TODAY } from './fixtures.js';
import { buildRevisitList } from './list.js';
import { visitOrder } from './order.js';

const items = buildRevisitList(
  [
    place({ id: 'c', wheelchair: 'UNKNOWN', lat: 43.87 }),
    place({ id: 'a', wheelchair: 'UNKNOWN', lat: 43.851 }),
    place({ id: 'b', wheelchair: 'UNKNOWN', lat: 43.86 }),
  ],
  TODAY,
).items;
const start = { lat: 43.85, lon: -79.43 };

describe('visitOrder', () => {
  it('goes to the nearest place each time from the start', () => {
    const order = visitOrder(items, start);
    expect(order.stops.map((s) => s.item.place.record.id)).toEqual(['a', 'b', 'c']);
    expect(order.stops.map((s) => s.order)).toEqual([1, 2, 3]);
    expect(order.hasStart).toBe(true);
  });
  it('measures each leg and sums them', () => {
    const order = visitOrder(items, start);
    const legs = order.stops.map((s) => s.metresFromPrevious ?? 0);
    expect(legs[0]).toBeGreaterThan(100);
    expect(legs[0]).toBeLessThan(120);
    expect(order.totalMetres).toBeCloseTo(legs.reduce((a, b) => a + b, 0), 6);
  });
  it('starts at the first item when there is no start, with no first leg', () => {
    const order = visitOrder(items, null);
    expect(order.stops[0]?.item).toBe(items[0]);
    expect(order.stops[0]?.metresFromPrevious).toBeNull();
    expect(order.stops[1]?.metresFromPrevious).not.toBeNull();
    expect(order.hasStart).toBe(false);
  });
  it('visits every place exactly once', () => {
    const ids = visitOrder(items, start).stops.map((s) => s.item.place.record.id).sort();
    expect(ids).toEqual(['a', 'b', 'c']);
  });
  it('is empty for no items', () => expect(visitOrder([], start)).toEqual({ stops: [], totalMetres: 0, hasStart: true }));
  it('does not change its input', () => {
    const before = items.map((i) => i.place.record.id);
    visitOrder(items, start);
    expect(items.map((i) => i.place.record.id)).toEqual(before);
  });
});
