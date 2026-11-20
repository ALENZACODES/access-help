import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

/** Sample observations, measures and cards made up for these tests. The App ships with no places. */
const NOTES = [
  { id: "a1", lat: 43.85, lon: -79.43, name: "Sample Library", wheelchair: "limited", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-10" },
  { id: "a2", lat: 44.3, lon: -78.3, name: null, wheelchair: "UNKNOWN", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-08" },
];
const blank = { measuredOn: "2026-11-12", method: "tape", steps: null, stepHeightCm: null, doorWidthCm: null, doorOpening: null, ramp: null, toilet: null, toiletDoorCm: null };
const MEASURES = { version: 1, entries: [{ ...blank, recordId: "a1", steps: 2, doorWidthCm: 82.5 }] };
const TOLD = { version: 1, entries: [{ ...blank, recordId: "a1", method: null, ramp: "yes" }] };

function cardFile(over: Record<string, unknown> = {}, place: Record<string, unknown> = {}) {
  const card = {
    app: "the-app-place-card",
    v: 1,
    madeOn: "2026-11-01",
    from: "Sam",
    place: { name: "Sample Library", lat: 43.8502, lon: -79.43, wheelchair: "yes", source: "own visit", licence: "ODbL-1.0", observedOn: "2026-10-20", ...place },
    measures: { ...blank, recordId: "card", measuredOn: "2026-10-21", steps: 2, doorWidthCm: 90 },
    told: null,
    ...over,
  };
  return { name: "card.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(card), "utf8") };
}

const stored = (page: Page, key: string) => page.evaluate((k) => window.localStorage.getItem(k), key);

async function seed(page: Page, notes: unknown[] = NOTES) {
  await page.goto("/");
  await page.evaluate(
    ([items, measures, told]) => {
      window.localStorage.removeItem("the-app-received-cards");
      window.localStorage.setItem("the-app-place-drafts", JSON.stringify(items));
      window.localStorage.setItem("the-app-place-measures", JSON.stringify(measures));
      window.localStorage.setItem("the-app-place-told", JSON.stringify(told));
    },
    [notes, MEASURES, TOLD] as const,
  );
  await page.goto("/places/cards");
}

test.describe("place cards", () => {
  test("is reachable from the places menu and says a card holds nothing about the sender", async ({ page }) => {
    await seed(page);
    await page.goto("/places");
    await page.getByRole("link", { name: "Place cards", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Place cards" })).toBeVisible();
    await expect(page.getByTestId("cards-share-note")).toContainText("It holds nothing about you unless you type a label.");
    await expect(page.getByTestId("cards-share-note")).toContainText("The App sends nothing");
  });

  test("with no observations, still lets a person load a card", async ({ page }) => {
    await seed(page, []);
    await expect(page.getByText("You have no saved observations to make a card from.")).toBeVisible();
    await page.getByLabel("Card file (.json)").setInputFiles(cardFile());
    await expect(page.locator(".places-notice")).toHaveText("Card added: Sample Library.");
    await expect(page.getByTestId("cards-near-card-1")).toHaveText("None of your observations is close to this card’s map point.");
  });

  test("makes a card with measures and UNKNOWN for the rest, and changes it with the options", async ({ page }) => {
    await seed(page);
    await page.getByLabel("Observation", { exact: true }).selectOption("a1");
    const preview = page.getByLabel("The card as text");
    await expect(preview).toHaveValue(/^Place card: Sample Library\nFrom: UNKNOWN\. Card made on \d{4}-\d{2}-\d{2}\.\nStatus: limited\. Source: own visit\. Licence: CC0-1\.0\. Seen: 2026-11-10\. Tier: UNKNOWN\.\nMap point: 43\.85000, -79\.43000\./);
    await expect(preview).toHaveValue(/Entrance door width: 82\.5 cm \(32\.5 in\)\nHow the door opens: UNKNOWN/);
    await expect(preview).not.toHaveValue(/What the place told the sender/);
    await page.getByRole("checkbox", { name: "Put what the place told me in the card" }).check();
    await expect(preview).toHaveValue(/What the place told the sender\nAnswered on 2026-11-12\./);
    await page.getByRole("checkbox", { name: "Put the map point in the card" }).uncheck();
    await expect(preview).toHaveValue(/Map point: left out by the sender\./);
    await page.getByLabel("A label for you (optional)").fill("Sam");
    await expect(preview).toHaveValue(/From: Sam\. Card made on/);
  });

  test("offers no place-said option for an observation with no answer, and writes UNKNOWN for no measures", async ({ page }) => {
    await seed(page);
    await page.getByLabel("Observation", { exact: true }).selectOption("a2");
    await expect(page.getByRole("checkbox", { name: "Put what the place told me in the card" })).toHaveCount(0);
    await expect(page.getByLabel("The card as text")).toHaveValue(/Place card: Place without a name[^]*Status: UNKNOWN\.[^]*Nothing was measured\. Every fact is UNKNOWN\./);
  });

  test("downloads a card file with no observation id and no label unless typed, and reads it back", async ({ page }) => {
    await seed(page);
    await page.getByLabel("Observation", { exact: true }).selectOption("a1");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download the card file (.json)" }).click()]);
    expect(download.suggestedFilename()).toMatch(/^place-card-sample-library-\d{4}-\d{2}-\d{2}\.json$/);
    const text = await readFile(await download.path(), "utf8");
    const card = JSON.parse(text) as { from: string; place: { name: string }; measures: { recordId: string; doorWidthCm: number } };
    expect(card.from).toBe("");
    expect(card.measures).toMatchObject({ recordId: "card", doorWidthCm: 82.5 });
    expect(text).not.toContain('"a1"');
    await page.getByLabel("Card file (.json)").setInputFiles({ name: "mine.json", mimeType: "application/json", buffer: Buffer.from(text, "utf8") });
    await expect(page.locator(".places-notice")).toHaveText("Card added: Sample Library.");
    const [asText] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download the card as text (.txt)" }).click()]);
    expect(asText.suggestedFilename()).toMatch(/\.txt$/);
  });

  test("keeps a received card apart and sets it beside the person's own measures", async ({ page }) => {
    await seed(page);
    const before = await Promise.all(["the-app-place-drafts", "the-app-place-measures", "the-app-place-told"].map((key) => stored(page, key)));
    await page.getByLabel("Card file (.json)").setInputFiles(cardFile());
    await expect(page.getByTestId("cards-count")).toHaveText("Cards you received: 1.");
    const item = page.getByTestId("cards-list").getByRole("listitem").first();
    await expect(item).toContainText("From: Sam. Card made on 2026-11-01.");
    await expect(item).toContainText("Status: yes. Source: own visit. Licence: ODbL-1.0. Seen: 2026-10-20. Tier: UNKNOWN.");
    await expect(page.getByTestId("cards-near-card-1")).toHaveText("Close to Sample Library, in a straight line: 22 m. The names are the same.");
    const table = page.getByRole("table", { name: "This card beside what you measured at Sample Library." });
    await expect(table.getByRole("row", { name: /^Entrance door width/ })).toContainText("Differs. The card says 7.5 cm more than you measured.");
    await expect(table.getByRole("row", { name: /^Ramp/ })).toContainText("UNKNOWN from both");
    await expect(page.getByTestId("cards-other-person")).toContainText("They are not yours and not something you saw.");
    expect(await Promise.all(["the-app-place-drafts", "the-app-place-measures", "the-app-place-told"].map((key) => stored(page, key)))).toEqual(before);
    await expect(page.locator("textarea")).not.toHaveValue(/wheelchair:description|toilets:wheelchair/);
  });

  test("refuses a file that is not a card, a closed licence and the same card twice", async ({ page }) => {
    await seed(page);
    await page.getByLabel("Card file (.json)").setInputFiles({ name: "x.json", mimeType: "application/json", buffer: Buffer.from("{not json", "utf8") });
    await expect(page.getByTestId("cards-problem")).toHaveText("This file could not be read. It may be damaged, or it is not a place card.");
    await page.getByLabel("Card file (.json)").setInputFiles({ name: "x.json", mimeType: "application/json", buffer: Buffer.from('{"app":"other"}', "utf8") });
    await expect(page.getByTestId("cards-problem")).toHaveText("This is not a place card made by the App.");
    await page.getByLabel("Card file (.json)").setInputFiles(cardFile({}, { licence: "All rights reserved" }));
    await expect(page.getByTestId("cards-problem")).toHaveText("The card has a licence the App does not take, so it was not kept.");
    expect(await stored(page, "the-app-received-cards")).toBeNull();
    await page.getByLabel("Card file (.json)").setInputFiles(cardFile());
    await expect(page.getByTestId("cards-problem")).toHaveText("");
    await page.getByLabel("Card file (.json)").setInputFiles(cardFile());
    await expect(page.getByTestId("cards-problem")).toHaveText("You already have this card.");
    await expect(page.getByTestId("cards-count")).toHaveText("Cards you received: 1.");
  });

  test("turns an odd status and an out-of-range number into UNKNOWN and says what was tidied", async ({ page }) => {
    await seed(page);
    await page.getByLabel("Card file (.json)").setInputFiles(cardFile({ measures: { ...blank, recordId: "card", measuredOn: "2026-10-21", steps: 2, doorWidthCm: 99999 } }, { wheelchair: "<b>great</b>", lat: 48.85, lon: 2.35 }));
    await expect(page.getByTestId("cards-notes").getByRole("listitem")).toHaveText(["The status in the card was not yes, limited or no, so it reads UNKNOWN.", "The map point in the card is outside Ontario. Look at it again before you go by it."]);
    const item = page.getByTestId("cards-list").getByRole("listitem").first();
    await expect(item).toContainText("Status: UNKNOWN.");
    await expect(item).toContainText("Entrance door width: UNKNOWN");
    await expect(item.locator("b")).toHaveCount(0);
  });

  test("keeps received cards across a reload, downloads one again and removes it", async ({ page }) => {
    await seed(page);
    await page.getByLabel("Card file (.json)").setInputFiles(cardFile());
    await expect(page.getByTestId("cards-count")).toHaveText("Cards you received: 1.");
    await page.reload();
    await expect(page.getByTestId("cards-list").getByRole("listitem").first()).toContainText("Sample Library");
    const [again] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download card 1 again" }).click()]);
    expect(again.suggestedFilename()).toBe("place-card-sample-library-2026-11-01.json");
    await page.getByRole("button", { name: "Remove card 1" }).click();
    await expect(page.locator(".places-notice")).toHaveText("Card removed: Sample Library.");
    await expect(page.getByText("You have no received card.")).toBeVisible();
    expect(await stored(page, "the-app-received-cards")).toBeNull();
  });

  test("makes no request to another host while making and loading a card", async ({ page }) => {
    const other: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (!["localhost", "127.0.0.1"].includes(url.hostname) && url.protocol !== "data:" && url.protocol !== "blob:") other.push(request.url());
    });
    await seed(page);
    await page.getByLabel("A label for you (optional)").fill("Sam");
    await page.getByLabel("Card file (.json)").setInputFiles(cardFile());
    await expect(page.getByTestId("cards-list")).toBeVisible();
    expect(other).toEqual([]);
  });

  test("has no serious accessibility violations with a card made, a card received and an error shown", async ({ page }) => {
    await seed(page);
    await page.getByLabel("Observation", { exact: true }).selectOption("a1");
    await page.getByLabel("Card file (.json)").setInputFiles(cardFile());
    await expect(page.getByTestId("cards-list")).toBeVisible();
    await page.getByLabel("Card file (.json)").setInputFiles(cardFile());
    await expect(page.getByTestId("cards-problem")).toHaveText("You already have this card.");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  });

  test("shows French with French spacing and keeps UNKNOWN as it is", async ({ page }) => {
    await seed(page);
    await page.getByRole("button", { name: "Français" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Fiches de lieu" })).toBeVisible();
    await page.getByLabel("Observation", { exact: true }).selectOption("a1");
    await expect(page.getByLabel("La fiche en texte")).toHaveValue(/^Fiche de lieu.: Sample Library\nDe.: UNKNOWN\. Fiche faite le/);
    await expect(page.getByLabel("La fiche en texte")).toHaveValue(/Largeur de la porte d’entrée.: 82,5.cm \(32,5.po\)/);
    await page.getByLabel("Fichier de fiche (.json)").setInputFiles(cardFile());
    await expect(page.locator(".places-notice")).toHaveText("Fiche ajoutée : Sample Library.");
    await expect(page.getByTestId("cards-count")).toHaveText("Fiches reçues : 1.");
    await expect(page.getByTestId("cards-near-card-1")).toHaveText("Près de Sample Library, en ligne droite : 22 m. Les noms sont les mêmes.");
  });
});
