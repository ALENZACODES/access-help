import { describe, expect, it } from "vitest";
import { PLOT_HEIGHT, PLOT_WIDTH, formatScale, layoutPlot, niceKm } from "./plot.js";

describe("niceKm", () => {
  it("rounds down to 1, 2, or 5 times a power of ten", () => {
    expect(niceKm(0.9)).toBe(0.5);
    expect(niceKm(1)).toBe(1);
    expect(niceKm(1.9)).toBe(1);
    expect(niceKm(2)).toBe(2);
    expect(niceKm(4.9)).toBe(2);
    expect(niceKm(7)).toBe(5);
    expect(niceKm(120)).toBe(100);
    expect(niceKm(0.03)).toBe(0.02);
  });

  it("returns 0 for a value that cannot be drawn", () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) expect(niceKm(bad)).toBe(0);
  });
});

describe("layoutPlot", () => {
  it("returns nothing for no places", () => {
    expect(layoutPlot([])).toEqual({ points: [], scaleKm: 0, scaleWidthPct: 0 });
  });

  it("puts a single place in the middle", () => {
    const { points } = layoutPlot([{ id: "a", lat: 43.8, lon: -79.4 }]);
    expect(points[0]).toMatchObject({ id: "a", xPct: 50, yPct: 50 });
  });

  it("puts north at the top and east at the right", () => {
    const { points } = layoutPlot([
      { id: "nw", lat: 44, lon: -80 },
      { id: "se", lat: 43, lon: -79 },
    ]);
    const [nw, se] = points;
    expect(nw!.yPct).toBeLessThan(se!.yPct);
    expect(nw!.xPct).toBeLessThan(se!.xPct);
  });

  it("keeps every point inside the plot, away from the edges", () => {
    const { points } = layoutPlot([
      { id: "a", lat: 43.0, lon: -80.0 },
      { id: "b", lat: 45.5, lon: -75.0 },
      { id: "c", lat: 44.2, lon: -77.5 },
    ]);
    for (const p of points) {
      expect(p.xPct).toBeGreaterThanOrEqual(5);
      expect(p.xPct).toBeLessThanOrEqual(95);
      expect(p.yPct).toBeGreaterThanOrEqual(5);
      expect(p.yPct).toBeLessThanOrEqual(95);
    }
  });

  it("keeps true proportions: equal north-south and east-west distances plot equally far", () => {
    const lat0 = 45;
    const kmPerLon = 111.32 * Math.cos((lat0 * Math.PI) / 180);
    const dLat = 10 / 111.32;
    const dLon = 10 / kmPerLon;
    const { points } = layoutPlot([
      { id: "o", lat: lat0, lon: -75 },
      { id: "n", lat: lat0 + dLat, lon: -75 },
      { id: "e", lat: lat0, lon: -75 + dLon },
    ]);
    const o = points[0]!;
    const n = points[1]!;
    const e = points[2]!;
    const northUnits = Math.abs(n.yPct - o.yPct) * (PLOT_HEIGHT / 100);
    const eastUnits = Math.abs(e.xPct - o.xPct) * (PLOT_WIDTH / 100);
    expect(eastUnits).toBeCloseTo(northUnits, 0);
  });

  it("makes the scale bar match its kilometres", () => {
    const layout = layoutPlot([
      { id: "a", lat: 43.0, lon: -79.0 },
      { id: "b", lat: 43.0, lon: -78.0 },
    ]);
    expect([1, 2, 5].some((f) => Math.abs(Math.log10(layout.scaleKm / f) % 1) < 1e-9)).toBe(true);
    const [a, b] = layout.points;
    const kmBetween = 111.32 * Math.cos((43 * Math.PI) / 180);
    const pctBetween = Math.abs(b!.xPct - a!.xPct);
    expect(layout.scaleWidthPct / pctBetween).toBeCloseTo(layout.scaleKm / kmBetween, 1);
    expect(layout.scaleWidthPct).toBeLessThanOrEqual(30.0001);
  });

  it("stays finite when two places share a location", () => {
    const { points, scaleKm } = layoutPlot([
      { id: "a", lat: 43.8, lon: -79.4 },
      { id: "b", lat: 43.8, lon: -79.4 },
    ]);
    expect(points.every((p) => Number.isFinite(p.xPct) && Number.isFinite(p.yPct))).toBe(true);
    expect(scaleKm).toBeGreaterThan(0);
  });
});

describe("formatScale", () => {
  it("uses metres under a kilometre and a non-breaking space before the unit", () => {
    expect(formatScale(0.5, "en")).toBe("500 m");
    expect(formatScale(5, "en")).toBe("5 km");
    expect(formatScale(0.5, "fr")).toBe("500 m");
    expect(formatScale(0, "en")).toBe("");
  });
});

import { separatePoints } from "./plot.js";

describe("separatePoints", () => {
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

  it("leaves points that are already apart where they are", () => {
    const input = [{ id: "a", x: 100, y: 100 }, { id: "b", x: 300, y: 200 }];
    const result = separatePoints(input, 640, 400, 48);
    expect(result.ok).toBe(true);
    expect(result.points).toEqual(input);
  });

  it("does not change the input", () => {
    const input = [{ id: "a", x: 100, y: 100 }, { id: "b", x: 101, y: 100 }];
    separatePoints(input, 640, 400, 48);
    expect(input[1]).toEqual({ id: "b", x: 101, y: 100 });
  });

  it("pushes overlapping points apart to at least the minimum distance and keeps them inside", () => {
    const input = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, x: 320 + (i % 3), y: 200 + (i % 2) }));
    const result = separatePoints(input, 640, 400, 48);
    expect(result.ok).toBe(true);
    for (const [i, a] of result.points.entries()) {
      expect(a.x).toBeGreaterThanOrEqual(24);
      expect(a.x).toBeLessThanOrEqual(616);
      expect(a.y).toBeGreaterThanOrEqual(24);
      expect(a.y).toBeLessThanOrEqual(376);
      for (const b of result.points.slice(i + 1)) expect(dist(a, b)).toBeGreaterThanOrEqual(47.5);
    }
  });

  it("separates points that share one spot, the same way every time", () => {
    const input = [{ id: "a", x: 50, y: 50 }, { id: "b", x: 50, y: 50 }, { id: "c", x: 50, y: 50 }];
    const first = separatePoints(input, 640, 400, 48);
    expect(first.ok).toBe(true);
    expect(separatePoints(input, 640, 400, 48)).toEqual(first);
  });

  it("pulls a point that starts outside back inside the plot", () => {
    const result = separatePoints([{ id: "a", x: -50, y: 900 }], 640, 400, 48);
    expect(result.points[0]).toEqual({ id: "a", x: 24, y: 376 });
  });

  it("gives up, instead of overlapping, when the places cannot fit", () => {
    const many = Array.from({ length: 200 }, (_, i) => ({ id: `p${i}`, x: 100, y: 100 }));
    expect(separatePoints(many, 640, 400, 48).ok).toBe(false);
    expect(separatePoints([{ id: "a", x: 1, y: 1 }], 40, 400, 48).ok).toBe(false);
  });
});
