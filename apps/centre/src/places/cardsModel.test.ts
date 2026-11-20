import { describe, expect, it } from "vitest";
import { buildReceivedView, buildShareView, cardOptions, receivedFile, shareFile, startCardId, type CardsData, type ShareChoices } from "./cardsModel.js";
import { emptyMeasureBook, emptyReceivedCards, parsePlaceCard, putMeasures, receiveCard, type MeasureBook, type Measures, type PlaceCard, type ReceivedCardBook } from "./docs-bridge.js";
import type { PlaceRecord } from "./types.js";

function place(over: Partial<PlaceRecord> = {}): PlaceRecord {
  return { id: "a1", lat: 43.85, lon: -79.43, name: "Sample Library", wheelchair: "limited", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-10", ...over };
}

const NOTES: PlaceRecord[] = [place(), place({ id: "a2", name: null, wheelchair: "UNKNOWN", lat: 44.3, lon: -78.3, observedOn: "2026-11-14" })];
const TODAY = "2026-11-19";
const blank = (recordId: string): Measures => ({ recordId, measuredOn: "2026-11-12", method: "tape", steps: null, stepHeightCm: null, doorWidthCm: null, doorOpening: null, ramp: null, toilet: null, toiletDoorCm: null });

function bookOf(...entries: Measures[]): MeasureBook {
  let book = emptyMeasureBook();
  for (const entry of entries) {
    const result = putMeasures(book, entry);
    if (result.ok) book = result.book;
  }
  return book;
}

const DATA: CardsData = { records: NOTES, measures: bookOf({ ...blank("a1"), steps: 2, doorWidthCm: 82.5 }), told: bookOf({ ...blank("a1"), method: null, ramp: "yes" }) };
const choices = (over: Partial<ShareChoices> = {}): ShareChoices => ({ withPoint: true, withTold: false, from: "", ...over });

const received = (name: string | null, lat: number | null, doorWidthCm: number | null): PlaceCard => ({
  app: "the-app-place-card",
  v: 1,
  madeOn: "2026-11-01",
  from: "Sam",
  place: { name, lat, lon: lat === null ? null : -79.43, wheelchair: "yes", source: "own visit", licence: "ODbL-1.0", observedOn: "2026-10-20" },
  measures: doorWidthCm === null ? null : { ...blank("card"), measuredOn: "2026-10-21", steps: 2, doorWidthCm },
  told: null,
});

function listOf(...cards: PlaceCard[]): ReceivedCardBook {
  let book = emptyReceivedCards();
  for (const card of cards) {
    const result = receiveCard(book, card, TODAY);
    if (result.ok) book = result.book;
  }
  return book;
}

describe("making a card", () => {
  it("opens on the newest observation and lists them newest first", () => {
    expect(startCardId(NOTES)).toBe("a2");
    expect(startCardId([])).toBeNull();
    expect(cardOptions(NOTES, "fr")).toEqual([
      { id: "a2", label: "Lieu sans nom, 2026-11-14" },
      { id: "a1", label: "Sample Library, 2026-11-10" },
    ]);
  });
  it("shows no card when nothing is chosen, but still says what a card holds", () => {
    const view = buildShareView({ records: [], measures: emptyMeasureBook(), told: emptyMeasureBook() }, null, choices(), TODAY, "en");
    expect(view).toMatchObject({ chosenId: null, card: null, text: "", failure: "" });
    expect(view.shareNote).toContain("It holds nothing about you unless you type a label.");
  });
  it("makes a card with the person’s measures and its text", () => {
    const view = buildShareView(DATA, "a1", choices(), TODAY, "en");
    expect(view.card?.measures).toMatchObject({ steps: 2, doorWidthCm: 82.5 });
    expect(view.text).toContain("Place card: Sample Library");
    expect(view.text).toContain("From: UNKNOWN. Card made on 2026-11-19.");
    expect(view.hasTold).toBe(true);
  });
  it("leaves what the place said out unless the person ticks it", () => {
    expect(buildShareView(DATA, "a1", choices(), TODAY, "en").card?.told).toBeNull();
    expect(buildShareView(DATA, "a1", choices({ withTold: true }), TODAY, "en").card?.told).toMatchObject({ ramp: "yes" });
  });
  it("leaves the map point out when asked, and puts the label in when typed", () => {
    const view = buildShareView(DATA, "a1", choices({ withPoint: false, from: " Sam " }), TODAY, "en");
    expect(view.card?.place).toMatchObject({ lat: null, lon: null });
    expect(view.card?.from).toBe("Sam");
    expect(view.text).toContain("Map point: left out by the sender.");
  });
  it("says there is nothing from the place for an observation with no answer", () => {
    expect(buildShareView(DATA, "a2", choices(), TODAY, "en").hasTold).toBe(false);
  });
  it("makes no card for a licence the App does not take, and says why", () => {
    const data = { ...DATA, records: [place({ licence: "CC-BY-4.0" as PlaceRecord["licence"] })] };
    const view = buildShareView(data, "a1", choices(), TODAY, "en");
    expect(view.card).toBeNull();
    expect(view.failure).toContain("licence the App does not take");
    expect(shareFile("json", view)).toBeNull();
  });
  it("makes a card file the App can read back, and a text file", () => {
    const view = buildShareView(DATA, "a1", choices({ from: "Sam" }), TODAY, "en");
    const file = shareFile("json", view);
    expect(file).toMatchObject({ filename: "place-card-sample-library-2026-11-19.json", mime: "application/json" });
    const parsed = parsePlaceCard(file?.content ?? "");
    expect(parsed.ok && parsed.card).toEqual(view.card);
    expect(shareFile("txt", view)).toMatchObject({ filename: "place-card-sample-library-2026-11-19.txt", mime: "text/plain", content: view.text });
  });
  it("never puts the observation id in the card file", () => {
    expect(shareFile("json", buildShareView(DATA, "a1", choices(), TODAY, "en"))?.content).not.toContain('"a1"');
  });
});

describe("cards a person received", () => {
  it("counts the cards and always says they are another person’s facts", () => {
    const view = buildReceivedView(emptyReceivedCards(), DATA, "en");
    expect(view.count).toBe("Cards you received: 0.");
    expect(view.otherPerson).toContain("They are not yours and not something you saw.");
    expect(view.cards).toEqual([]);
  });
  it("shows each card with who it is from, its record line, its point and the day it came", () => {
    const [card] = buildReceivedView(listOf(received("Sample Library", 43.8502, 90)), DATA, "en").cards;
    expect(card).toMatchObject({
      position: 1,
      title: "Sample Library",
      fromLine: "From: Sam. Card made on 2026-11-01.",
      placeLine: "Status: yes. Source: own visit. Licence: ODbL-1.0. Seen: 2026-10-20. Tier: UNKNOWN.",
      pointLine: "Map point: 43.85020, -79.43000.",
      receivedLine: "Received on 2026-11-19.",
    });
    expect(card?.measured).toHaveLength(7);
    expect(card?.told).toEqual([]);
  });
  it("sets a card beside the person’s own measures when one of their observations is close", () => {
    const [card] = buildReceivedView(listOf(received("Sample Library", 43.8502, 90)), DATA, "en").cards;
    expect(card?.near).toBe("Close to Sample Library, in a straight line: 22 m. The names are the same.");
    expect(card?.beside?.caption).toBe("This card beside what you measured at Sample Library.");
    expect(card?.beside?.rows[2]).toMatchObject({ yours: "82.5 cm (32.5 in)", theirs: "90 cm (35.4 in)", note: "Differs. The card says 7.5 cm more than you measured." });
  });
  it("sets nothing beside a card that is far from every observation, or has no point", () => {
    const view = buildReceivedView(listOf(received("Far", 45.4, 90), received("No point", null, 90)), DATA, "en");
    const far = view.cards.find((card) => card.title === "Far");
    const pointless = view.cards.find((card) => card.title === "No point");
    expect(far).toMatchObject({ near: "None of your observations is close to this card’s map point.", beside: null });
    expect(pointless).toMatchObject({ near: "The card has no map point, so it is not set beside any of your observations.", beside: null, pointLine: "Map point: left out by the sender." });
  });
  it("sets nothing beside when neither side has measures", () => {
    const data = { ...DATA, measures: emptyMeasureBook() };
    const [card] = buildReceivedView(listOf(received("Sample Library", 43.8502, null)), data, "en").cards;
    expect(card?.beside).toBeNull();
    expect(card?.measured).toEqual([]);
    expect(card?.near).toMatch(/^Close to Sample Library/);
  });
  it("numbers the cards newest first", () => {
    const view = buildReceivedView(listOf(received("A", null, null), received("B", null, null)), DATA, "en");
    expect(view.cards.map((card) => [card.position, card.title])).toEqual([
      [1, "B"],
      [2, "A"],
    ]);
  });
  it("writes French for the same view", () => {
    const [card] = buildReceivedView(listOf(received(null, 43.8502, 90)), DATA, "fr").cards;
    expect(card?.title).toBe("Lieu sans nom");
    expect(card?.receivedLine).toBe("Reçue le 2026-11-19.");
    expect(card?.beside?.rows[2]?.note).toBe("Diffère. La fiche indique 7,5\u00a0cm de plus que votre mesure.");
  });
  it("gives a received card back as the same file", () => {
    const entry = listOf(received("Sample Arena", 43.85, 90)).cards[0]!;
    const file = receivedFile(entry);
    expect(file.filename).toBe("place-card-sample-arena-2026-11-01.json");
    const parsed = parsePlaceCard(file.content);
    expect(parsed.ok && parsed.card).toEqual(entry.card);
  });
});
