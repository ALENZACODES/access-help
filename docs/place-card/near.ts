/**
 * Finds which of the person's own observations a received card may be about, by distance in a
 * straight line. It only points at what is close. It decides nothing, changes nothing, and a
 * card with no map point is matched to nothing.
 */
import type { PlaceCard } from './card.js';
import { haversineMetres } from '../presubmit/geo.js';

/** Observations farther than this from the card's point are not offered. */
export const NEAR_METRES = 75;

export interface OwnPoint {
  id: string;
  lat: number;
  lon: number;
  name: string | null;
}

export interface NearOwn {
  id: string;
  name: string | null;
  metres: number;
  /** True when both have a name and the names are the same, ignoring case and spacing. */
  sameName: boolean;
}

function tidy(name: string | null): string {
  return name === null ? '' : name.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** The person's observations within reach of the card's point, closest first. */
export function nearOwn(card: PlaceCard, own: readonly OwnPoint[]): NearOwn[] {
  const { lat, lon } = card.place;
  if (lat === null || lon === null) return [];
  const cardName = tidy(card.place.name);
  return own
    .map((record) => ({ id: record.id, name: record.name, metres: Math.round(haversineMetres({ lat, lon }, record)), sameName: cardName !== '' && tidy(record.name) === cardName }))
    .filter((entry) => entry.metres <= NEAR_METRES)
    .sort((a, b) => a.metres - b.metres || a.id.localeCompare(b.id));
}

export function closestOwn(card: PlaceCard, own: readonly OwnPoint[]): NearOwn | null {
  return nearOwn(card, own)[0] ?? null;
}
