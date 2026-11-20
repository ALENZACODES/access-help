/**
 * The cards a person received from others, kept in a list of their own. A received card is
 * what someone else saw and measured. It is never mixed into the person's observations or
 * measures, and it never becomes a tag for the map.
 */
import { parseCard, sameCard, serializeCard, type PlaceCard } from './card.js';
import { isIsoDay } from '../presubmit/text.js';

export const MAX_RECEIVED = 100;

export interface ReceivedCard {
  id: string;
  /** The day the person loaded the card, YYYY-MM-DD. */
  receivedOn: string;
  card: PlaceCard;
}

export interface ReceivedBook {
  version: 1;
  cards: ReceivedCard[];
}

export function emptyReceived(): ReceivedBook {
  return { version: 1, cards: [] };
}

function nextId(book: ReceivedBook): string {
  const used = new Set(book.cards.map((entry) => entry.id));
  for (let n = 1; n <= MAX_RECEIVED + 1; n += 1) if (!used.has(`card-${n}`)) return `card-${n}`;
  return `card-${book.cards.length + 1}`;
}

export type ReceiveIssue = 'already-here' | 'too-many' | 'date-invalid';
export type ReceiveResult = { ok: true; book: ReceivedBook; entry: ReceivedCard } | { ok: false; issue: ReceiveIssue };

/** Adds a card to the list, newest first. The same card is not added twice. */
export function receiveCard(book: ReceivedBook, card: PlaceCard, today: string): ReceiveResult {
  if (!isIsoDay(today)) return { ok: false, issue: 'date-invalid' };
  if (book.cards.some((entry) => sameCard(entry.card, card))) return { ok: false, issue: 'already-here' };
  if (book.cards.length >= MAX_RECEIVED) return { ok: false, issue: 'too-many' };
  const entry: ReceivedCard = { id: nextId(book), receivedOn: today, card };
  return { ok: true, book: { version: 1, cards: [entry, ...book.cards] }, entry };
}

export function removeReceived(book: ReceivedBook, id: string): ReceivedBook {
  const cards = book.cards.filter((entry) => entry.id !== id);
  return cards.length === book.cards.length ? book : { version: 1, cards };
}

export function findReceived(book: ReceivedBook, id: string): ReceivedCard | null {
  return book.cards.find((entry) => entry.id === id) ?? null;
}

export interface ReadReceived {
  book: ReceivedBook;
  /** Cards that could not be read and were left out. */
  dropped: number;
}

/** Reads a stored list. Every card goes through the same checks as a card file. */
export function readReceived(value: unknown): ReadReceived {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return { book: emptyReceived(), dropped: 0 };
  const item = value as Record<string, unknown>;
  if (item.version !== 1 || !Array.isArray(item.cards)) return { book: emptyReceived(), dropped: 0 };
  const ids = new Set<string>();
  const cards: ReceivedCard[] = [];
  let dropped = 0;
  for (const raw of item.cards) {
    const entry = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
    const id = entry !== null && typeof entry.id === 'string' && /^card-\d{1,4}$/.test(entry.id) ? entry.id : '';
    const receivedOn = entry !== null && typeof entry.receivedOn === 'string' && isIsoDay(entry.receivedOn) ? entry.receivedOn : '';
    let card: PlaceCard | null = null;
    if (entry !== null && typeof entry.card === 'object' && entry.card !== null) {
      const parsed = parseCard(JSON.stringify(entry.card));
      if (parsed.ok) card = parsed.card;
    }
    if (id === '' || receivedOn === '' || card === null || ids.has(id) || cards.some((kept) => sameCard(kept.card, card)) || cards.length >= MAX_RECEIVED) {
      dropped += 1;
      continue;
    }
    ids.add(id);
    cards.push({ id, receivedOn, card });
  }
  return { book: { version: 1, cards }, dropped };
}

export interface MergeReceived {
  book: ReceivedBook;
  added: number;
  /** Cards left out because the same card is already there, or there was no room. */
  skipped: number;
}

/** Adds cards from a backup. Nothing on the device is replaced, and each card keeps the day it was received. */
export function mergeReceived(current: ReceivedBook, incoming: ReceivedBook): MergeReceived {
  let book = current;
  let added = 0;
  let skipped = 0;
  for (const entry of [...incoming.cards].reverse()) {
    const result = receiveCard(book, entry.card, entry.receivedOn);
    if (result.ok) {
      book = result.book;
      added += 1;
    } else skipped += 1;
  }
  return { book, added, skipped };
}

/** The card as it was received, as a file again, so it can be passed on unchanged. */
export function receivedFileText(entry: ReceivedCard): string {
  return serializeCard(entry.card);
}
