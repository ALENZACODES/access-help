/**
 * The place cards a person received from others, kept on this device only and apart from
 * their own observations and measures. Reads re-run every check a card file goes through, so
 * edited or damaged storage cannot put anything unchecked on screen.
 */
import { emptyReceivedCards, readReceivedCards, receiveCard, removeReceivedCard, type CardReceiveIssue, type PlaceCard, type ReceivedCardBook } from "./docs-bridge.js";
import type { KeyValueStorage, SaveResult } from "./store.js";

export const RECEIVED_CARDS_KEY = "the-app-received-cards";

export type AddCardResult = { ok: true; id: string } | { ok: false; kind: "issue"; issue: CardReceiveIssue } | { ok: false; kind: "save"; reason: "storage-full" | "storage-unavailable" };

export interface CardsStore {
  read(): ReceivedCardBook;
  add(card: PlaceCard, today: string): AddCardResult;
  remove(id: string): SaveResult;
  /** Replaces the whole list, for a restore. */
  replace(book: ReceivedCardBook): SaveResult;
  clear(): void;
}

export function parseStoredCards(raw: string | null): ReceivedCardBook {
  if (raw === null) return emptyReceivedCards();
  try {
    return readReceivedCards(JSON.parse(raw)).book;
  } catch {
    return emptyReceivedCards();
  }
}

export function createCardsStore(storage: KeyValueStorage): CardsStore {
  function read(): ReceivedCardBook {
    try {
      return parseStoredCards(storage.getItem(RECEIVED_CARDS_KEY));
    } catch {
      return emptyReceivedCards();
    }
  }
  function write(book: ReceivedCardBook): SaveResult {
    try {
      if (book.cards.length === 0) storage.removeItem(RECEIVED_CARDS_KEY);
      else storage.setItem(RECEIVED_CARDS_KEY, JSON.stringify(book));
      return { ok: true };
    } catch (error) {
      const quota = error instanceof DOMException && (error.name === "QuotaExceededError" || error.code === 22);
      return { ok: false, reason: quota ? "storage-full" : "storage-unavailable" };
    }
  }
  return {
    read,
    add(card, today) {
      const result = receiveCard(read(), card, today);
      if (!result.ok) return { ok: false, kind: "issue", issue: result.issue };
      const written = write(result.book);
      return written.ok ? { ok: true, id: result.entry.id } : { ok: false, kind: "save", reason: written.reason };
    },
    remove(id) {
      return write(removeReceivedCard(read(), id));
    },
    replace: write,
    clear() {
      try {
        storage.removeItem(RECEIVED_CARDS_KEY);
      } catch {
        /* nothing to clear */
      }
    },
  };
}

/** Removes the received cards from this device. Called when the person clears their places data. */
export function clearCardsData(storage: KeyValueStorage): void {
  createCardsStore(storage).clear();
}
