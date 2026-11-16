/**
 * Layout for a plain plot of places: no base map, no tiles, no network.
 * Positions come only from the coordinates in the pack. The layout keeps the
 * true proportions between east-west and north-south distance near the middle
 * of the plotted area, so it is a visual aid and not a map to navigate by.
 */

export interface PlotInput {
  id: string;
  lat: number;
  lon: number;
}

export interface PlotPoint {
  id: string;
  /** Percent from the left edge of the plot. */
  xPct: number;
  /** Percent from the top edge of the plot. */
  yPct: number;
}

export interface PlotLayout {
  points: PlotPoint[];
  /** Length of the scale bar in kilometres, 0 when there is nothing to plot. */
  scaleKm: number;
  /** Width of the scale bar as a percent of the plot width. */
  scaleWidthPct: number;
}

/** Plot area in layout units. The plot is drawn 16:10, so the units match the pixels' proportions. */
export const PLOT_WIDTH = 160;
export const PLOT_HEIGHT = 100;
const MARGIN = 14;
const KM_PER_DEGREE = 111.32;
/** Places closer together than this are laid out as if they were this far apart in each direction. */
const MIN_SPAN_KM = 0.05;

/** Largest 1, 2, or 5 times a power of ten that is not above max. */
export function niceKm(max: number): number {
  if (!(max > 0) || !Number.isFinite(max)) return 0;
  const exponent = Math.floor(Math.log10(max));
  const base = 10 ** exponent;
  for (const factor of [5, 2, 1]) {
    if (factor * base <= max) return Number((factor * base).toPrecision(12));
  }
  return base;
}

export function layoutPlot(places: readonly PlotInput[]): PlotLayout {
  if (places.length === 0) return { points: [], scaleKm: 0, scaleWidthPct: 0 };

  const lats = places.map((p) => p.lat);
  const lons = places.map((p) => p.lon);
  const latMax = Math.max(...lats);
  const latMin = Math.min(...lats);
  const lonMin = Math.min(...lons);
  const lonMax = Math.max(...lons);
  const midLat = (latMax + latMin) / 2;
  const kmPerLon = KM_PER_DEGREE * Math.cos((midLat * Math.PI) / 180);

  const spanX = (lonMax - lonMin) * kmPerLon;
  const spanY = (latMax - latMin) * KM_PER_DEGREE;
  const usableW = PLOT_WIDTH - 2 * MARGIN;
  const usableH = PLOT_HEIGHT - 2 * MARGIN;
  const unitsPerKm = Math.min(usableW / Math.max(spanX, MIN_SPAN_KM), usableH / Math.max(spanY, MIN_SPAN_KM));

  const points = places.map((place) => {
    const xKm = (place.lon - lonMin) * kmPerLon - spanX / 2;
    const yKm = (latMax - place.lat) * KM_PER_DEGREE - spanY / 2;
    return {
      id: place.id,
      xPct: ((PLOT_WIDTH / 2 + xKm * unitsPerKm) / PLOT_WIDTH) * 100,
      yPct: ((PLOT_HEIGHT / 2 + yKm * unitsPerKm) / PLOT_HEIGHT) * 100,
    };
  });

  const scaleKm = niceKm((PLOT_WIDTH * 0.3) / unitsPerKm);
  return { points, scaleKm, scaleWidthPct: ((scaleKm * unitsPerKm) / PLOT_WIDTH) * 100 };
}

/** "300 m" below one kilometre, otherwise "5 km". French uses a space before the unit as well. */
export function formatScale(km: number, language: "en" | "fr"): string {
  if (km <= 0) return "";
  const number = (value: number) => value.toLocaleString(language === "fr" ? "fr-CA" : "en-CA", { maximumFractionDigits: 2 });
  return km < 1 ? `${number(Math.round(km * 1000))} m` : `${number(km)} km`;
}

export interface PixelPoint {
  id: string;
  x: number;
  y: number;
}

export interface SeparationResult {
  points: PixelPoint[];
  /** False when the places cannot all fit without overlapping, so the plot should not be drawn. */
  ok: boolean;
}

/**
 * Moves overlapping points apart until every pair is at least minDistance pixels from each other
 * and every point stays inside the plot by half that distance. Points that are already apart do not move.
 * Positions after this step are approximate. The list stays the complete, exact view.
 */
export function separatePoints(input: readonly PixelPoint[], width: number, height: number, minDistance: number): SeparationResult {
  const half = minDistance / 2;
  const maxX = width - half;
  const maxY = height - half;
  const capacity = Math.floor(width / minDistance) * Math.floor(height / minDistance);
  const points = input.map((p) => ({ ...p }));
  if (!(maxX >= half) || !(maxY >= half) || points.length > capacity) return { points, ok: false };

  const clamp = (p: PixelPoint) => {
    p.x = Math.min(maxX, Math.max(half, p.x));
    p.y = Math.min(maxY, Math.max(half, p.y));
  };
  points.forEach(clamp);

  for (let round = 0; round < 400; round += 1) {
    let moved = false;
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const a = points[i]!;
        const b = points[j]!;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        if (dist >= minDistance) continue;
        if (dist < 1e-6) {
          // Same spot: split along a fixed direction that depends on the pair, so the result is repeatable.
          const angle = ((i * 7 + j * 13) % 360) * (Math.PI / 180);
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          dist = 1;
        }
        const push = (minDistance - dist) / 2 + 0.01;
        a.x -= (dx / dist) * push;
        a.y -= (dy / dist) * push;
        b.x += (dx / dist) * push;
        b.y += (dy / dist) * push;
        clamp(a);
        clamp(b);
        moved = true;
      }
    }
    if (!moved) break;
  }

  const ok = points.every((a, i) => points.slice(i + 1).every((b) => Math.hypot(a.x - b.x, a.y - b.y) >= minDistance - 0.5));
  return { points, ok };
}
