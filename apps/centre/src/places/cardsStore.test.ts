import { describe, expect, it } from "vitest";
import { RECEIVED_CARDS_KEY, clearCardsData, createCardsStore, parseStoredCards } from "./cardsStore.js";
import type { PlaceCard } from "./docs-bridge.js";
import { clearPlacesData, DRAFTS_KEY } from "./store.js";
import { MemoryStorage } from "./testing.js";

const TODAY = "2026-11-19";
const card = (name: string, from = "Sam"): PlaceCard => ({
  app: "the-app-place-card",
  v: 1,
  madeOn: "2026-11-01",
  from,
  place: { name, lat: 43.85, lon: -79.43, wheelchair: "limited", source: "own visit", licence: "CC0-1.0", observedOn: "2026-10-20" },
  measures: null,
  told: null,
});

describe("received cards store", () => {
  it("starts with no cards", () => {
    expect(createCardsStore(new MemoryStorage()).read()).toEqual({ version: 1, cards: [] });
  });
  it("adds a card and reads it back with the day it was received", () => {
    const store = createCardsStore(new MemoryStorage());
    expect(store.add(card("A"), TODAY)).toEqual({ ok: true, id: "card-1" });
    expect(store.read().cards).toEqual([{ id: "card-1", receivedOn: TODAY, card: card("A") }]);
  });
  it("does not add the same card twice, and says so", () => {
    const store = createCardsStore(new MemoryStorage());
    store.add(card("A"), TODAY);
    expect(store.add(card("A"), TODAY)).toEqual({ ok: false, kind: "issue", issue: "already-here" });
    expect(store.read().cards).toHaveLength(1);
  });
  it("never writes to the person’s own observations", () => {
    const storage = new MemoryStorage();
    createCardsStore(storage).add(card("A"), TODAY);
    expect(storage.getItem(DRAFTS_KEY)).toBeNull();
  });
  it("removes a card, and the key with the last of them", () => {
    const storage = new MemoryStorage();
    const store = createCardsStore(storage);
    store.add(card("A"), TODAY);
    store.add(card("B"), TODAY);
    store.remove("card-1");
    expect(store.read().cards.map((entry) => entry.card.place.name)).toEqual(["B"]);
    store.remove("card-2");
    expect(storage.getItem(RECEIVED_CARDS_KEY)).toBeNull();
  });
  it("checks stored cards again: a damaged status reads UNKNOWN and a card with a closed licence is dropped", () => {
    const storage = new MemoryStorage();
    const bad = { ...card("B"), place: { ...card("B").place, licence: "none" } };
    const odd = { ...card("A"), place: { ...card("A").place, wheelchair: "great" } };
    storage.setItem(RECEIVED_CARDS_KEY, JSON.stringify({ version: 1, cards: [{ id: "card-1", receivedOn: TODAY, card: odd }, { id: "card-2", receivedOn: TODAY, card: bad }] }));
    const cards = createCardsStore(storage).read().cards;
    expect(cards).toHaveLength(1);
    expect(cards[0]?.card.place.wheelchair).toBe("UNKNOWN");
  });
  it("reads damaged storage as no cards", () => {
    expect(parseStoredCards("{oops")).toEqual({ version: 1, cards: [] });
    expect(parseStoredCards(null)).toEqual({ version: 1, cards: [] });
  });
  it("reports a refused write instead of throwing", () => {
    const storage = new MemoryStorage();
    storage.setItem = () => {
      throw new Error("refused");
    };
    expect(createCardsStore(storage).add(card("A"), TODAY)).toEqual({ ok: false, kind: "save", reason: "storage-unavailable" });
  });
  it("is cleared on its own and with the rest of the places data", () => {
    const storage = new MemoryStorage();
    createCardsStore(storage).add(card("A"), TODAY);
    clearCardsData(storage);
    expect(storage.getItem(RECEIVED_CARDS_KEY)).toBeNull();
    createCardsStore(storage).add(card("A"), TODAY);
    clearPlacesData(storage);
    expect(storage.getItem(RECEIVED_CARDS_KEY)).toBeNull();
  });
});
