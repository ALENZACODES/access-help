import { describe, expect, it } from 'vitest';
import { serializeCard } from './card.js';
import { bare, card, TODAY } from './fixtures.js';
import { MAX_RECEIVED, emptyReceived, findReceived, mergeReceived, readReceived, receiveCard, receivedFileText, removeReceived, type ReceivedBook } from './received.js';

function bookOf(...names: string[]): ReceivedBook {
  let book = emptyReceived();
  for (const name of names) {
    const result = receiveCard(book, card({}, { name }), TODAY);
    if (result.ok) book = result.book;
  }
  return book;
}

describe('cards a person received', () => {
  it('start empty', () => {
    expect(emptyReceived()).toEqual({ version: 1, cards: [] });
  });
  it('take a card with an id and the day it was loaded, newest first', () => {
    const book = bookOf('A', 'B');
    expect(book.cards.map((entry) => [entry.id, entry.card.place.name, entry.receivedOn])).toEqual([
      ['card-2', 'B', TODAY],
      ['card-1', 'A', TODAY],
    ]);
  });
  it('do not take the same card twice', () => {
    expect(receiveCard(bookOf('A'), card({}, { name: 'A' }), TODAY)).toEqual({ ok: false, issue: 'already-here' });
  });
  it('take two cards for the same place from different people', () => {
    const result = receiveCard(bookOf('A'), card({ from: 'Alex' }, { name: 'A' }), TODAY);
    expect(result.ok && result.book.cards).toHaveLength(2);
  });
  it('keep only so many', () => {
    const book = bookOf(...Array.from({ length: MAX_RECEIVED }, (_, i) => `P${i}`));
    expect(book.cards).toHaveLength(MAX_RECEIVED);
    expect(receiveCard(book, bare(), TODAY)).toEqual({ ok: false, issue: 'too-many' });
  });
  it('refuse a day that is not a day', () => {
    expect(receiveCard(emptyReceived(), card(), 'today')).toEqual({ ok: false, issue: 'date-invalid' });
  });
  it('remove and find cards, and reuse a freed id', () => {
    const book = bookOf('A', 'B', 'C');
    const fewer = removeReceived(book, 'card-2');
    expect(fewer.cards.map((entry) => entry.id)).toEqual(['card-3', 'card-1']);
    expect(removeReceived(book, 'nope')).toBe(book);
    expect(findReceived(book, 'card-3')?.card.place.name).toBe('C');
    expect(findReceived(book, 'nope')).toBeNull();
    const again = receiveCard(fewer, card({}, { name: 'D' }), TODAY);
    expect(again.ok && again.entry.id).toBe('card-2');
  });
  it('give a received card back as the same file', () => {
    const entry = bookOf('A').cards[0]!;
    expect(receivedFileText(entry)).toBe(serializeCard(card({}, { name: 'A' })));
  });
  it('do not change the list they were given', () => {
    const book = bookOf('A');
    const copy = JSON.stringify(book);
    receiveCard(book, bare(), TODAY);
    removeReceived(book, 'card-1');
    expect(JSON.stringify(book)).toBe(copy);
  });
});

describe('reading a stored list of cards', () => {
  it('reads back what was stored', () => {
    const book = bookOf('A', 'B');
    expect(readReceived(JSON.parse(JSON.stringify(book)))).toEqual({ book, dropped: 0 });
  });
  it('reads anything else as no cards', () => {
    for (const bad of [null, 'x', [], {}, { version: 2, cards: [] }, { version: 1, cards: 'no' }]) expect(readReceived(bad)).toEqual({ book: emptyReceived(), dropped: 0 });
  });
  it('checks every stored card again and drops what it cannot read', () => {
    const good = bookOf('A').cards[0]!;
    const read = readReceived({
      version: 1,
      cards: [good, { ...good, id: 'x' }, { ...good, id: 'card-2', receivedOn: 'soon' }, { ...good, id: 'card-3', card: { ...good.card, place: { ...good.card.place, licence: 'none' } } }, { ...good, id: 'card-4' }, 'junk'],
    });
    expect(read.book.cards).toEqual([good]);
    expect(read.dropped).toBe(5);
  });
  it('turns a damaged status inside a stored card into UNKNOWN', () => {
    const good = bookOf('A').cards[0]!;
    const read = readReceived({ version: 1, cards: [{ ...good, card: { ...good.card, place: { ...good.card.place, wheelchair: 'great' } } }] });
    expect(read.book.cards[0]?.card.place.wheelchair).toBe('UNKNOWN');
  });
});

describe('adding cards from a backup', () => {
  it('adds cards that are not on the device and keeps the day each was received', () => {
    const incoming = receiveCard(emptyReceived(), card({}, { name: 'B' }), '2026-10-01');
    const merged = mergeReceived(bookOf('A'), incoming.ok ? incoming.book : emptyReceived());
    expect(merged).toMatchObject({ added: 1, skipped: 0 });
    expect(merged.book.cards.find((entry) => entry.card.place.name === 'B')?.receivedOn).toBe('2026-10-01');
    expect(new Set(merged.book.cards.map((entry) => entry.id)).size).toBe(2);
  });
  it('skips a card that is already there', () => {
    expect(mergeReceived(bookOf('A'), bookOf('A'))).toMatchObject({ added: 0, skipped: 1 });
  });
  it('keeps the order of the incoming cards', () => {
    const merged = mergeReceived(emptyReceived(), bookOf('A', 'B', 'C'));
    expect(merged.book.cards.map((entry) => entry.card.place.name)).toEqual(['C', 'B', 'A']);
  });
});
