/**
 * A place card: one observation with its measured facts, packed into a small file a person can
 * hand to someone else. Pure: no network, no storage, no clock. A card says who measured what
 * and when. It carries nothing about the sender beyond a label they chose to type, and reading
 * one never changes the reader's own observations or measures.
 */
import { cleanMeasures, hasAnyFact, type Measures } from '../place-measures/index.js';
import { inOntarioBox } from '../presubmit/geo.js';
import { isIsoDay } from '../presubmit/text.js';

export const CARD_APP = 'the-app-place-card';
export const CARD_VERSION = 1;
export const MAX_CARD_CHARACTERS = 20_000;
export const MAX_CARD_NAME = 120;
export const MAX_CARD_LABEL = 40;
export const CARD_LICENCES = ['CC0-1.0', 'ODbL-1.0'] as const;
export type CardLicence = (typeof CARD_LICENCES)[number];
export type CardStatus = 'yes' | 'limited' | 'no' | 'UNKNOWN';

export interface CardPlace {
  /** Null when the place has no name. */
  name: string | null;
  /** Null when the sender chose to leave the map point out. */
  lat: number | null;
  lon: number | null;
  wheelchair: CardStatus;
  source: string;
  licence: CardLicence;
  /** The day the sender saw the place, YYYY-MM-DD. */
  observedOn: string;
}

export interface PlaceCard {
  app: typeof CARD_APP;
  v: typeof CARD_VERSION;
  /** The day the card was made, YYYY-MM-DD. */
  madeOn: string;
  /** A label the sender typed for themselves, or empty. */
  from: string;
  place: CardPlace;
  /** What the sender measured, or null. */
  measures: Measures | null;
  /** What the place told the sender, or null. Kept apart from the measures. */
  told: Measures | null;
}

export interface CardSource {
  id: string;
  lat: number;
  lon: number;
  name: string | null;
  wheelchair: string;
  source: string;
  licence: string;
  observedOn: string;
}

export interface CardOptions {
  /** Puts the map point in the card. */
  withPoint: boolean;
  /** Puts what the place said in the card. */
  withTold: boolean;
  /** A label for the sender. Empty leaves it out. */
  from: string;
}

/** One line, single spaces, no control characters, at most the given length. */
export function cleanLine(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  const text = [...value.replace(/\s+/g, ' ')].filter((ch) => ch >= ' ' && ch !== '\u007f').join('').replace(/ +/g, ' ').trim();
  return [...text].slice(0, max).join('').trim();
}

export function cardStatus(value: unknown): CardStatus {
  return value === 'yes' || value === 'limited' || value === 'no' ? value : 'UNKNOWN';
}

function isCardLicence(value: unknown): value is CardLicence {
  return typeof value === 'string' && (CARD_LICENCES as readonly string[]).includes(value);
}

/** Measures as they travel in a card: tied to the card, not to an observation id on the sender's device. */
function forCard(measures: Measures | null): Measures | null {
  if (measures === null) return null;
  const clean = cleanMeasures({ ...measures, recordId: 'card' });
  return clean !== null && hasAnyFact(clean) ? clean : null;
}

function round5(value: number): number {
  return Math.round(value * 1e5) / 1e5;
}

export type BuildFailure = 'licence-not-open' | 'date-invalid';
export type BuildResult = { ok: true; card: PlaceCard } | { ok: false; code: BuildFailure };

/** Makes a card from one of the person's own observations. The observation is not changed. */
export function buildCard(record: CardSource, measures: Measures | null, told: Measures | null, options: CardOptions, today: string): BuildResult {
  if (!isCardLicence(record.licence)) return { ok: false, code: 'licence-not-open' };
  if (!isIsoDay(record.observedOn) || !isIsoDay(today)) return { ok: false, code: 'date-invalid' };
  const name = record.name === null ? '' : cleanLine(record.name, MAX_CARD_NAME);
  return {
    ok: true,
    card: {
      app: CARD_APP,
      v: CARD_VERSION,
      madeOn: today,
      from: cleanLine(options.from, MAX_CARD_LABEL),
      place: {
        name: name === '' ? null : name,
        lat: options.withPoint ? round5(record.lat) : null,
        lon: options.withPoint ? round5(record.lon) : null,
        wheelchair: cardStatus(record.wheelchair),
        source: cleanLine(record.source, MAX_CARD_NAME),
        licence: record.licence,
        observedOn: record.observedOn,
      },
      measures: forCard(measures),
      told: options.withTold ? forCard(told) : null,
    },
  };
}

export function serializeCard(card: PlaceCard): string {
  return `${JSON.stringify(card, null, 2)}\n`;
}

/** A file name from the place name, kept to letters, digits and dashes. */
export function cardFilename(card: PlaceCard, extension: 'json' | 'txt'): string {
  const base = (card.place.name ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `place-card-${base === '' ? 'place' : base}-${card.madeOn}.${extension}`;
}

export type CardFailure = 'too-large' | 'not-json' | 'not-a-card' | 'unsupported-version' | 'bad-place' | 'licence-not-open';
export type ParseCardResult = { ok: true; card: PlaceCard; notes: CardNote[] } | { ok: false; code: CardFailure };

/** Things the reader should know about a card that was read but had to be tidied. */
export type CardNote = 'status-set-unknown' | 'point-left-out' | 'point-outside-ontario' | 'measures-left-out' | 'told-left-out';

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Reads a card file. Everything in it is checked again: a status that is not yes, limited or no
 * becomes UNKNOWN, a number out of range becomes UNKNOWN, and a licence that is not open is
 * refused. Nothing in a card is ever run or followed.
 */
export function parseCard(text: string): ParseCardResult {
  if (text.length > MAX_CARD_CHARACTERS) return { ok: false, code: 'too-large' };
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, code: 'not-json' };
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return { ok: false, code: 'not-a-card' };
  const file = value as Record<string, unknown>;
  if (file.app !== CARD_APP) return { ok: false, code: 'not-a-card' };
  if (file.v !== CARD_VERSION) return { ok: false, code: 'unsupported-version' };
  const raw = typeof file.place === 'object' && file.place !== null && !Array.isArray(file.place) ? (file.place as Record<string, unknown>) : null;
  if (raw === null || typeof file.madeOn !== 'string' || !isIsoDay(file.madeOn)) return { ok: false, code: 'bad-place' };
  if (typeof raw.observedOn !== 'string' || !isIsoDay(raw.observedOn) || raw.observedOn > file.madeOn) return { ok: false, code: 'bad-place' };
  if (!isCardLicence(raw.licence)) return { ok: false, code: 'licence-not-open' };
  const source = cleanLine(raw.source, MAX_CARD_NAME);
  if (source === '') return { ok: false, code: 'bad-place' };

  const notes: CardNote[] = [];
  const wheelchair = cardStatus(raw.wheelchair);
  if (wheelchair === 'UNKNOWN' && raw.wheelchair !== 'UNKNOWN') notes.push('status-set-unknown');

  let lat = numberOrNull(raw.lat);
  let lon = numberOrNull(raw.lon);
  const hadPoint = raw.lat !== null && raw.lat !== undefined;
  if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    if (hadPoint || (raw.lon !== null && raw.lon !== undefined)) notes.push('point-left-out');
    lat = null;
    lon = null;
  } else if (!inOntarioBox({ lat, lon })) notes.push('point-outside-ontario');

  const measures = file.measures === null || file.measures === undefined ? null : forCard(cleanMeasures({ ...(file.measures as object), recordId: 'card' }));
  if (measures === null && file.measures !== null && file.measures !== undefined) notes.push('measures-left-out');
  const told = file.told === null || file.told === undefined ? null : forCard(cleanMeasures({ ...(file.told as object), recordId: 'card' }));
  if (told === null && file.told !== null && file.told !== undefined) notes.push('told-left-out');

  const name = cleanLine(raw.name, MAX_CARD_NAME);
  return {
    ok: true,
    notes,
    card: {
      app: CARD_APP,
      v: CARD_VERSION,
      madeOn: file.madeOn,
      from: cleanLine(file.from, MAX_CARD_LABEL),
      place: { name: name === '' ? null : name, lat: lat === null ? null : round5(lat), lon: lon === null ? null : round5(lon), wheelchair, source, licence: raw.licence, observedOn: raw.observedOn },
      measures,
      told,
    },
  };
}

/** Two cards are the same card when they describe the same place, made on the same day by the same label. */
export function sameCard(a: PlaceCard, b: PlaceCard): boolean {
  return a.madeOn === b.madeOn && a.from === b.from && a.place.name === b.place.name && a.place.lat === b.place.lat && a.place.lon === b.place.lon && a.place.observedOn === b.place.observedOn && a.place.source === b.place.source;
}
