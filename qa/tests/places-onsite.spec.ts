import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Sample observations and measures made up for these tests. The App ships with no places. */
const NOTES = [
  { id: "a1", lat: 43.85, lon: -79.43, name: "Sample Library", wheelchair: "limited", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-10" },
  { id: "a2", lat: 44.3, lon: -78.3, name: null, wheelchair: "UNKNOWN", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-08" },
];
const SAVED = { version: 1, entries: [{ recordId: "a1", measuredOn: "2026-11-12", method: "tape", steps: 2, stepHeightCm: 14, doorWidthCm: 82.5, doorOpening: null, ramp: null, toilet: null, toiletDoorCm: null }] };

const stored = (page: Page, key: string) => page.evaluate((k) => window.localStorage.getItem(k), key);

async function seed(page: Page, notes: unknown[] = NOTES, measures: unknown = null) {
  await page.goto("/");
  await page.evaluate(
    ([items, book]) => {
      for (const key of ["the-app-onsite-progress", "the-app-onsite-unit", "the-app-place-measures"]) window.localStorage.removeItem(key);
      window.localStorage.setItem("the-app-place-drafts", JSON.stringify(items));
      if (book !== null) window.localStorage.setItem("the-app-place-measures", JSON.stringify(book));
    },
    [notes, measures] as const,
  );
  await page.goto("/places/onsite");
}

async function begin(page: Page, id = "a1") {
  await page.getByLabel("Observation", { exact: true }).selectOption(id);
  await page.getByRole("button", { name: /^Start/ }).click();
}

const keep = (page: Page) => page.getByRole("button", { name: "Keep and go on" }).click();
const skip = (page: Page) => page.getByRole("button", { name: "Skip, leave UNKNOWN" }).click();
const position = (page: Page) => page.getByTestId("onsite-position");

test.describe("measure on site", () => {
  test("is reachable from the places menu and says a skipped question stays UNKNOWN", async ({ page }) => {
    await seed(page);
    await page.goto("/places");
    await page.getByRole("link", { name: "Measure on site", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Measure on site" })).toBeVisible();
    await expect(page.getByTestId("onsite-note")).toContainText("it stays UNKNOWN");
  });

  test("with no observations, points to adding one", async ({ page }) => {
    await seed(page, []);
    await expect(page.getByText("You have no saved observations to measure.")).toBeVisible();
    await expect(page.locator("a.measure-link", { hasText: "Add an observation" })).toHaveAttribute("href", "/places/contribute");
  });

  test("asks one question at a time, passes over what does not apply, and saves only at the end", async ({ page }) => {
    await seed(page);
    await begin(page);
    await expect(position(page)).toHaveText("Question 1 of 7");
    await expect(position(page)).toBeFocused();
    await expect(page.getByTestId("onsite-question")).toHaveText("How many steps are there at the entrance you used?");
    await page.getByRole("button", { name: "One fewer" }).click();
    await expect(page.getByLabel("Number of steps")).toHaveValue("0");
    await keep(page);
    await expect(page.getByTestId("onsite-question")).toHaveText("Is there a ramp to the entrance?");
    await expect(position(page)).toHaveText("Question 2 of 6");
    await skip(page);
    await expect(page.getByTestId("onsite-question")).toHaveText("How wide is the clear opening of the entrance door?");
    await page.getByRole("radio", { name: "Inches" }).check();
    await page.getByLabel("Length in inches").fill("32");
    await page.getByRole("button", { name: "Half a unit more" }).click();
    await expect(page.getByLabel("Length in inches")).toHaveValue("32.5");
    await keep(page);
    await page.getByRole("radio", { name: "By hand" }).check();
    await keep(page);
    await page.getByRole("radio", { name: "No, there is none" }).check();
    await keep(page);
    await expect(page.getByTestId("onsite-question")).toHaveText("How did you take the lengths?");
    await page.getByRole("radio", { name: "Estimated by eye" }).check();
    expect(await stored(page, "the-app-place-measures")).toBeNull();
    await keep(page);

    await expect(page.getByRole("heading", { level: 2, name: "Look over your answers" })).toBeFocused();
    const review = page.getByTestId("onsite-review");
    await expect(review.getByRole("row")).toHaveCount(7);
    await expect(review.getByRole("row", { name: /^Ramp/ })).toContainText("UNKNOWN");
    await expect(review.getByRole("row", { name: /^Entrance door width/ })).toContainText("82.6 cm (32.5 in)");
    await expect(page.getByTestId("onsite-progress")).toHaveText("Answered: 5. Skipped, so UNKNOWN: 1. Still to come: 0.");
    await expect(page.getByTestId("onsite-effects-summary")).toHaveText("New: 4. Changed: 0. The same: 0.");
    expect(await stored(page, "the-app-place-measures")).toBeNull();

    await page.getByRole("button", { name: "Save these measures" }).click();
    await expect(page.locator(".places-notice")).toHaveText("Measures saved for Sample Library. The questions are closed.");
    const book = JSON.parse((await stored(page, "the-app-place-measures")) ?? "{}") as { entries: Record<string, unknown>[] };
    expect(book.entries).toHaveLength(1);
    expect(book.entries[0]).toMatchObject({ recordId: "a1", method: "estimate", steps: 0, stepHeightCm: null, doorWidthCm: 82.6, doorOpening: "manual", ramp: null, toilet: "no", toiletDoorCm: null });
    expect(await stored(page, "the-app-onsite-progress")).toBeNull();
    expect(await stored(page, "the-app-onsite-unit")).toBe("in");
    await expect(page.getByRole("link", { name: "See and edit the measures" })).toHaveAttribute("href", "/places/measure");
  });

  test("refuses an answer it cannot read, says why, and keeps the question", async ({ page }) => {
    await seed(page);
    await begin(page);
    await keep(page);
    await expect(page.getByRole("alert")).toHaveText("Nothing is filled in. Answer, or skip this question to leave it UNKNOWN.");
    await expect(page.getByRole("alert")).toBeFocused();
    await page.getByLabel("Number of steps").fill("a few");
    await keep(page);
    await expect(page.getByRole("alert")).toHaveText("Write a whole number, such as 0 or 3.");
    await expect(position(page)).toHaveText("Question 1 of 7");
    await page.getByLabel("Number of steps").fill("2");
    await keep(page);
    await page.getByLabel("Length in centimetres").fill("900");
    await keep(page);
    await expect(page.getByRole("alert")).toHaveText("This is larger than the App keeps. Look at the number and the unit again.");
    await expect(position(page)).toHaveText("Question 2 of 7");
  });

  test("keeps progress through a reload and comes back to the same question", async ({ page }) => {
    await seed(page);
    await begin(page);
    await page.getByLabel("Number of steps").fill("3");
    await keep(page);
    await page.getByLabel("Length in centimetres").fill("15");
    await keep(page);
    await page.reload();
    await expect(page.locator(".places-notice")).toHaveText("You are back where the questions stopped at Sample Library.");
    await expect(page.getByTestId("onsite-question")).toHaveText("Is there a ramp to the entrance?");
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.getByLabel("Length in centimetres")).toHaveValue("15");
  });

  test("starts from saved measures, says so, and shows what saving would change", async ({ page }) => {
    await seed(page, NOTES, SAVED);
    await page.getByLabel("Observation", { exact: true }).selectOption("a1");
    await page.getByRole("button", { name: "Start from what I saved" }).click();
    await expect(page.getByLabel("Number of steps")).toHaveValue("2");
    await expect(page.getByTestId("onsite-filled-in")).toHaveText("Filled in from what you saved on 2026-11-12. Keep it only if it is still so today.");
    await keep(page);
    await keep(page);
    await page.getByRole("radio", { name: "Yes, there is a ramp" }).check();
    await keep(page);
    await page.getByLabel("Length in centimetres").fill("90");
    await keep(page);
    await skip(page);
    await skip(page);
    await skip(page);
    await keep(page);
    await expect(page.getByTestId("onsite-effects-summary")).toHaveText("New: 1. Changed: 1. The same: 2.");
    const effects = page.getByTestId("onsite-effects");
    await expect(effects.getByRole("row", { name: /^Entrance door width/ })).toContainText("Changes what is saved");
    await expect(effects.getByRole("row", { name: /^Ramp/ })).toContainText("New");
  });

  test("changes one answer from the review and comes straight back", async ({ page }) => {
    await seed(page, NOTES, SAVED);
    await page.getByLabel("Observation", { exact: true }).selectOption("a1");
    await page.getByRole("button", { name: "Start from what I saved" }).click();
    await keep(page);
    await keep(page);
    await skip(page);
    await keep(page);
    await skip(page);
    await skip(page);
    await skip(page);
    await keep(page);
    await expect(page.getByRole("heading", { level: 2, name: "Look over your answers" })).toBeVisible();
    await page.getByRole("button", { name: "Change: Entrance door width" }).click();
    await expect(page.getByLabel("Length in centimetres")).toHaveValue("82.5");
    await skip(page);
    await expect(page.getByRole("heading", { level: 2, name: "Look over your answers" })).toBeVisible();
    await expect(page.getByTestId("onsite-effects-summary")).toContainText("Going back to UNKNOWN: 1.");
    await expect(page.getByTestId("onsite-effects").getByRole("row", { name: /^Entrance door width/ })).toContainText("Goes back to UNKNOWN");
  });

  test("offers nothing to save when every question was skipped, and discarding changes no measures", async ({ page }) => {
    await seed(page, NOTES, SAVED);
    await begin(page, "a2");
    for (let i = 0; i < 7; i += 1) await skip(page);
    await expect(page.getByTestId("onsite-blocked")).toHaveText("Nothing is answered yet, so there is nothing to save. Go back and answer at least one question.");
    await expect(page.getByRole("button", { name: "Save these measures" })).toHaveCount(0);
    await page.getByRole("button", { name: "Stop and discard these answers" }).click();
    await expect(page.locator(".places-notice")).toHaveText("Answers discarded for Place without a name. Nothing changed in your measures.");
    expect(await stored(page, "the-app-onsite-progress")).toBeNull();
    expect(JSON.parse((await stored(page, "the-app-place-measures")) ?? "{}")).toEqual(SAVED);
  });

  test("is in French with French typography", async ({ page }) => {
    await seed(page);
    await page.getByRole("button", { name: "Français" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Mesurer sur place" })).toBeVisible();
    await page.getByLabel("Observation", { exact: true }).selectOption("a1");
    await page.getByRole("button", { name: "Commencer les questions" }).click();
    await expect(position(page)).toHaveText("Question 1 sur 7");
    await expect(page.getByTestId("onsite-question")).toHaveText("Combien de marches y a-t-il à l’entrée que vous avez utilisée\u202f?");
    await expect(page.getByTestId("onsite-place")).toHaveText("Lieu\u00a0: Sample Library.");
    await page.getByRole("button", { name: "Passer, laisser UNKNOWN" }).click();
    await page.getByLabel("Longueur en centimètres").fill("14,5");
    await page.getByRole("button", { name: "Garder et continuer" }).click();
    await expect(page.getByTestId("onsite-progress")).toHaveText("Répondues\u00a0: 1. Passées, donc UNKNOWN\u00a0: 1. À venir\u00a0: 6.");
  });

  test("has no accessibility violations on the chooser, a question, a choice and the review", async ({ page }) => {
    await seed(page);
    const check = async () => expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
    await check();
    await begin(page);
    await check();
    await page.getByLabel("Number of steps").fill("0");
    await keep(page);
    await check();
    for (let i = 0; i < 5; i += 1) await skip(page);
    await expect(page.getByRole("heading", { level: 2, name: "Look over your answers" })).toBeVisible();
    await check();
  });

  test("keeps every control at 44 px or more on a narrow screen", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await seed(page);
    await begin(page);
    await page.getByLabel("Number of steps").fill("2");
    await keep(page);
    for (const control of await page.locator(".onsite-form button, .onsite-form input[type=text], .onsite-choice").all()) {
      const box = await control.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
