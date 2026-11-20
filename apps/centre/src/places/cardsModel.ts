/**
 * Builds what the place cards page shows: the card being made from one of the person's own
 * observations, and the cards they received, each set beside their own measures when one of
 * their observations is close. Pure: the language and the day come in as arguments and
 * nothing here reads the clock or storage.
 */
import {
  buildPlaceCard,
  cardBesideRows,
  cardBuildFailureText,
  cardFactLines,
  cardFilename,
  cardFromLine,
  cardNearText,
  cardNotNearText,
  cardOtherPersonText,
  cardPlaceLine,
  cardPointLine,
  cardReceivedCountText,
  cardShareNoteText,
  cardTitle,
  closestOwnToCard,
  measuresFor,
  placeCardText,
  receivedCardFileText,
  serializePlaceCard,
  type CardBesideRow,
  type MeasureBook,
  type PlaceCard,
  type ReceivedCard,
  type ReceivedCardBook,
} from "./docs-bridge.js";
import { cardsText } from "./cardsStrings.js";
import type { Language, PlaceRecord } from "./types.js";

const newestFirst = (a: PlaceRecord, b: PlaceRecord) => b.observedOn.localeCompare(a.observedOn) || a.id.localeCompare(b.id);

function nameOf(record: Pick<PlaceRecord, "name">, language: Language): string {
  return record.name === null || record.name.trim() === "" ? cardsText(language, "unnamed") : record.name.trim();
}

export function startCardId(records: readonly PlaceRecord[]): string | null {
  return [...records].sort(newestFirst)[0]?.id ?? null;
}

export function cardOptions(records: readonly PlaceRecord[], language: Language): { id: string; label: string }[] {
  return [...records].sort(newestFirst).map((record) => ({ id: record.id, label: cardsText(language, "optionLabel", { name: nameOf(record, language), day: record.observedOn }) }));
}

export interface ShareChoices {
  withPoint: boolean;
  withTold: boolean;
  from: string;
}

export interface ShareView {
  options: { id: string; label: string }[];
  chosenId: string | null;
  shareNote: string;
  /** True when the place told the person something that could go in the card. */
  hasTold: boolean;
  /** Null when no observation is chosen or no card can be made from it. */
  card: PlaceCard | null;
  /** Why no card could be made. Empty when one was, or when nothing is chosen. */
  failure: string;
  text: string;
}

export interface CardsData {
  records: readonly PlaceRecord[];
  measures: MeasureBook;
  told: MeasureBook;
}

export function buildShareView(data: CardsData, chosenId: string | null, choices: ShareChoices, today: string, language: Language): ShareView {
  const record = data.records.find((entry) => entry.id === chosenId) ?? null;
  const base = { options: cardOptions(data.records, language), shareNote: cardShareNoteText(language) };
  if (record === null) return { ...base, chosenId: null, hasTold: false, card: null, failure: "", text: "" };
  const told = measuresFor(data.told, record.id);
  const result = buildPlaceCard(record, measuresFor(data.measures, record.id), told, choices, today);
  if (!result.ok) return { ...base, chosenId: record.id, hasTold: told !== null, card: null, failure: cardBuildFailureText(result.code, language), text: "" };
  return { ...base, chosenId: record.id, hasTold: told !== null, card: result.card, failure: "", text: placeCardText(result.card, language) };
}

export interface CardFile {
  filename: string;
  mime: string;
  content: string;
}

/** The card being made, as a card file or as text. Null when there is no card. */
export function shareFile(kind: "json" | "txt", view: ShareView): CardFile | null {
  if (view.card === null) return null;
  return kind === "json"
    ? { filename: cardFilename(view.card, "json"), mime: "application/json", content: serializePlaceCard(view.card) }
    : { filename: cardFilename(view.card, "txt"), mime: "text/plain", content: view.text };
}

export interface ReceivedView {
  id: string;
  /** Position in the list, counting from one. */
  position: number;
  title: string;
  fromLine: string;
  placeLine: string;
  pointLine: string;
  receivedLine: string;
  /** One line per fact the sender measured. Empty when nothing was measured. */
  measured: string[];
  /** One line per fact the place told the sender. Empty when the card has none. */
  told: string[];
  /** Says which of the person's observations is close, or why none is. */
  near: string;
  /** The card beside the person's own measures at the close observation. Null when there is none to set it beside. */
  beside: { caption: string; rows: CardBesideRow[] } | null;
}

export interface ReceivedListView {
  count: string;
  otherPerson: string;
  cards: ReceivedView[];
}

function receivedView(entry: ReceivedCard, position: number, data: CardsData, language: Language): ReceivedView {
  const { card } = entry;
  const near = closestOwnToCard(card, data.records);
  const yours = near === null ? null : measuresFor(data.measures, near.id);
  return {
    id: entry.id,
    position,
    title: cardTitle(card, language),
    fromLine: cardFromLine(card, language),
    placeLine: cardPlaceLine(card, language),
    pointLine: cardPointLine(card, language),
    receivedLine: cardsText(language, "receivedOn", { day: entry.receivedOn }),
    measured: card.measures === null ? [] : cardFactLines(card.measures, language),
    told: card.told === null ? [] : cardFactLines(card.told, language),
    near: near === null ? cardNotNearText(card, language) : cardNearText(near, language),
    beside: near === null || (yours === null && card.measures === null) ? null : { caption: cardsText(language, "besideCaption", { name: nameOf({ name: near.name }, language) }), rows: cardBesideRows(yours, card, language) },
  };
}

export function buildReceivedView(book: ReceivedCardBook, data: CardsData, language: Language): ReceivedListView {
  return {
    count: cardReceivedCountText(book.cards.length, language),
    otherPerson: cardOtherPersonText(language),
    cards: book.cards.map((entry, index) => receivedView(entry, index + 1, data, language)),
  };
}

/** A received card as the file it came in, to pass on unchanged. */
export function receivedFile(entry: ReceivedCard): CardFile {
  return { filename: cardFilename(entry.card, "json"), mime: "application/json", content: receivedCardFileText(entry) };
}
