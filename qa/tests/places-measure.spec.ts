import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Sample observations made up for these tests, on fixed days. The App ships with no places. */
const NOTES = [
  { id: "a1", lat: 43.85, lon: -79.43, name: "Sample Library", wheelchair: "limited", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-10" },
  { id: "a2", lat: 43.86, lon: -79.43, name: null, wheelchair: "UNKNOWN", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-14" },
];

const stored = (page: Page, key: string) => page.evaluate((k) => window.localStorage.getItem(k), key);

async function seed(page: Page, notes: unknown[] = NOTES) {
  await page.goto("/");
  await page.evaluate((items) => {
    window.localStorage.removeItem("the-app-place-measures");
    window.localStorage.setItem("the-app-place-drafts", JSON.stringify(items));
  }, notes);
  await page.goto("/places/measure");
}

async function chooseLibrary(page: Page) {
  await seed(page);
  await page.getByLabel("Observation", { exact: true }).selectOption("a1");
  await page.getByLabel("Day you measured").fill("2026-11-12");
}

test.describe("measure a place", () => {
  test("is reachable from the places menu and says it is not a judgment", async ({ page }) => {
    await seed(page);
    await page.goto("/places");
    await page.getByRole("link", { name: "Measure a place", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Measure a place" })).toBeVisible();
    await expect(page.getByTestId("measure-no-judgment")).toContainText("does not say who can use the place");
  });

  test("shows a calm empty state", async ({ page }) => {
    await seed(page, []);
    await expect(page.getByText("You have no saved observations.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save these measures" })).toHaveCount(0);
  });

  test("opens on the newest observation with its status, source, licence, date and tier", async ({ page }) => {
    await seed(page);
    await expect(page.getByLabel("Observation", { exact: true })).toHaveValue("a2");
    await expect(page.getByTestId("measure-name")).toHaveText("Place without a name");
    await expect(page.getByTestId("measure-place-line")).toHaveText("Status: UNKNOWN. Source: own visit. Licence: CC0-1.0. Seen: 2026-11-14. Tier: UNKNOWN.");
    await expect(page.getByTestId("measure-counts")).toHaveText("Observations with measures: 0. Without: 2.");
    await expect(page.getByText("No measures are saved for this observation.")).toBeVisible();
  });

  test("saves measures, writes a description and tags, and keeps what was not measured UNKNOWN", async ({ page }) => {
    await chooseLibrary(page);
    await page.getByLabel("How you took the lengths").selectOption("tape");
    await page.getByLabel("Steps at the entrance").fill("2");
    await page.getByLabel("Height of the highest step").fill("14");
    await page.getByLabel("Clear width of the entrance door").fill("32.5 in");
    await page.getByRole("button", { name: "Save these measures" }).click();
    await expect(page.locator(".places-notice")).toHaveText("Measures saved for Sample Library.");
    await expect(page.getByTestId("measure-measured-line")).toHaveText("Measured on 2026-11-12. With a tape.");
    const facts = page.getByTestId("measure-facts");
    await expect(facts.getByRole("row", { name: /^Steps at the entrance/ })).toContainText("2");
    await expect(facts.getByRole("row", { name: /^Entrance door width/ })).toContainText("82.6 cm (32.5 in)");
    await expect(facts.getByRole("row", { name: /^Ramp/ })).toContainText("UNKNOWN");
    await expect(facts.getByRole("row", { name: /^Wheelchair toilet/ })).toContainText("UNKNOWN");
    await expect(page.getByTestId("measure-still-unknown")).toHaveText("Still UNKNOWN: how the door opens, ramp, wheelchair toilet and toilet door width.");
    await expect(page.getByLabel("Description for the map")).toHaveValue("2 steps at the entrance, highest 14 cm. Entrance door 82.6 cm wide. Measured with a tape on 2026-11-12.");
    await expect(page.getByLabel("Tags to type")).toHaveValue(/^wheelchair:description:en=2 steps at the entrance/);
    await expect(page.getByLabel("Tags to type")).not.toHaveValue(/toilets:wheelchair|^wheelchair=/m);
    await expect(page.getByLabel("Clear width of the entrance door")).toHaveValue("82.6");
    await expect(page.getByTestId("measure-counts")).toHaveText("Observations with measures: 1. Without: 1.");
  });

  test("adds the toilet tag only when the person answers", async ({ page }) => {
    await chooseLibrary(page);
    await page.getByLabel("Wheelchair toilet").selectOption("no");
    await page.getByLabel("Steps at the entrance").fill("0");
    await page.getByRole("button", { name: "Save these measures" }).click();
    await expect(page.getByLabel("Tags to type")).toHaveValue(/toilets:wheelchair=no$/);
    await expect(page.getByLabel("Description for the map")).toHaveValue("No step at the entrance. No wheelchair toilet. Noted on 2026-11-12.");
    const facts = page.getByTestId("measure-facts");
    await expect(facts.getByRole("row", { name: /^Highest step/ })).toContainText("No step to measure");
    await expect(facts.getByRole("row", { name: /^Toilet door width/ })).toContainText("No toilet door to measure");
  });

  test("refuses fields it cannot read, says which, and saves nothing", async ({ page }) => {
    await chooseLibrary(page);
    await page.getByLabel("Steps at the entrance").fill("two");
    await page.getByLabel("Clear width of the entrance door").fill("0.82");
    await page.getByRole("button", { name: "Save these measures" }).click();
    await expect(page.getByRole("alert")).toHaveText("Some fields need another look. Nothing was saved.");
    await expect(page.getByRole("alert")).toBeFocused();
    await expect(page.getByLabel("Steps at the entrance")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#measure-steps-error")).toHaveText("Write a whole number, such as 0 or 3.");
    await expect(page.locator("#measure-doorWidth-error")).toContainText("smaller than the App keeps");
    expect(await stored(page, "the-app-place-measures")).toBeNull();
  });

  test("refuses an empty form and a day before the place was seen", async ({ page }) => {
    await chooseLibrary(page);
    await page.getByRole("button", { name: "Save these measures" }).click();
    await expect(page.locator("#measure-steps-error")).toContainText("Nothing is filled in.");
    await page.getByLabel("Steps at the entrance").fill("1");
    await page.getByLabel("Day you measured").fill("2026-11-01");
    await page.getByRole("button", { name: "Save these measures" }).click();
    await expect(page.locator("#measure-measuredOn-error")).toHaveText("The day is before the day you saw the place.");
    expect(await stored(page, "the-app-place-measures")).toBeNull();
  });

  test("keeps measures across a reload, fills the form again, and removes them", async ({ page }) => {
    await chooseLibrary(page);
    await page.getByLabel("Ramp").selectOption("yes");
    await page.getByRole("button", { name: "Save these measures" }).click();
    await expect(page.locator(".places-notice")).toHaveText("Measures saved for Sample Library.");
    await page.reload();
    await page.getByLabel("Observation", { exact: true }).selectOption("a1");
    await expect(page.getByLabel("Ramp")).toHaveValue("yes");
    await expect(page.getByLabel("Day you measured")).toHaveValue("2026-11-12");
    await expect(page.getByLabel("Observation", { exact: true }).locator("option:checked")).toHaveText("Sample Library, 2026-11-10, measured");
    await page.getByRole("button", { name: "Remove these measures" }).click();
    await expect(page.locator(".places-notice")).toHaveText("Measures removed for Sample Library.");
    await expect(page.getByText("No measures are saved for this observation.")).toBeVisible();
    expect(await stored(page, "the-app-place-measures")).toBeNull();
  });

  test("never changes the observation, whatever is measured", async ({ page }) => {
    await chooseLibrary(page);
    const before = await stored(page, "the-app-place-drafts");
    await page.getByLabel("Steps at the entrance").fill("0");
    await page.getByLabel("Ramp").selectOption("yes");
    await page.getByRole("button", { name: "Save these measures" }).click();
    await expect(page.getByTestId("measure-facts")).toBeVisible();
    expect(await stored(page, "the-app-place-drafts")).toBe(before);
    await expect(page.getByTestId("measure-place-line")).toContainText("Status: limited.");
  });

  test("downloads a sheet and a CSV", async ({ page }) => {
    await chooseLibrary(page);
    await page.getByLabel("Steps at the entrance").fill("1");
    await page.getByRole("button", { name: "Save these measures" }).click();
    const [sheet] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download this sheet (.txt)" }).click()]);
    expect(sheet.suggestedFilename()).toBe("measures-a1.txt");
    const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download all my measures (.csv)" }).click()]);
    expect(csv.suggestedFilename()).toMatch(/^measures-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  test("has no serious accessibility violations, with errors and with saved measures", async ({ page }) => {
    await chooseLibrary(page);
    await page.getByLabel("Steps at the entrance").fill("x");
    await page.getByRole("button", { name: "Save these measures" }).click();
    await expect(page.locator("#measure-steps-error")).toBeVisible();
    const withErrors = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(withErrors.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
    await page.getByLabel("Steps at the entrance").fill("2");
    await page.getByRole("button", { name: "Save these measures" }).click();
    await expect(page.getByTestId("measure-facts")).toBeVisible();
    const saved = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(saved.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  });

  test("shows French with a decimal comma and French spacing", async ({ page }) => {
    await seed(page);
    await page.getByRole("button", { name: "Français" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Mesurer un lieu" })).toBeVisible();
    await page.getByLabel("Observation", { exact: true }).selectOption("a1");
    await page.getByLabel("Jour de la mesure").fill("2026-11-12");
    await page.getByLabel("Largeur libre de la porte d’entrée").fill("82,5");
    await page.getByLabel("Comment vous avez pris les longueurs").selectOption("estimate");
    await page.getByRole("button", { name: "Enregistrer ces mesures" }).click();
    await expect(page.getByTestId("measure-facts").getByRole("row", { name: /^Largeur de la porte d’entrée/ })).toContainText("82,5 cm (32,5 po)");
    await expect(page.getByTestId("measure-facts").getByRole("row", { name: /^Rampe/ })).toContainText("UNKNOWN");
    await expect(page.getByLabel("Description pour la carte")).toHaveValue(/^Porte d’entrée large d’environ 82,5.cm\. Estimé à l’œil le 2026-11-12\.$/);
    await expect(page.getByLabel("Balises à taper")).toHaveValue(/^wheelchair:description:fr=/);
    await expect(page.getByLabel("Largeur libre de la porte d’entrée")).toHaveValue("82,5");
  });
});
