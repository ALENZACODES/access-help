import { buildCard, type CardOptions, type CardSource, type PlaceCard } from './card.js';
import { emptyMeasures, type Measures } from '../place-measures/index.js';

export const TODAY = '2026-11-19';

export function source(over: Partial<CardSource> = {}): CardSource {
  return { id: 'a1', lat: 43.85, lon: -79.43, name: 'Sample Library', wheelchair: 'limited', source: 'own visit', licence: 'CC0-1.0', observedOn: '2026-11-10', ...over };
}

export function measured(over: Partial<Measures> = {}): Measures {
  return { ...emptyMeasures('a1', '2026-11-12'), method: 'tape', steps: 2, stepHeightCm: 14, doorWidthCm: 82.5, ...over };
}

export function told(over: Partial<Measures> = {}): Measures {
  return { ...emptyMeasures('a1', '2026-11-16'), ramp: 'yes', toilet: 'yes', ...over };
}

export const ALL: CardOptions = { withPoint: true, withTold: true, from: 'Sam' };

/** A full card: point, measures, what the place said and a label. */
export function card(over: Partial<CardOptions> = {}, from: Partial<CardSource> = {}): PlaceCard {
  const result = buildCard(source(from), measured(), told(), { ...ALL, ...over }, TODAY);
  if (!result.ok) throw new Error(result.code);
  return result.card;
}

/** A card with no measures, no point and no label. */
export function bare(): PlaceCard {
  const result = buildCard(source({ name: null, wheelchair: 'UNKNOWN' }), null, null, { withPoint: false, withTold: false, from: '' }, TODAY);
  if (!result.ok) throw new Error(result.code);
  return result.card;
}
