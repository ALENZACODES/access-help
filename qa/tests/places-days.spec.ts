import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Sample observations made up for these tests, on fixed days so the calendar is the same every run. */
const NOTES = [
  { id: "g1", lat: 43.85, lon: -79.43, name: "Sample Library", wheelchair: "yes", source: "own visit", licence: "CC0-1.0", observedOn: "2026-03-10" },
  { id: "g2", lat: 43.86, lon: -79.43, name: null, wheelchair: "UNKNOWN", source: "field notes", licence: "ODbL-1.0", observedOn: "2026-03-10" },
  { id: "g3", lat: 43.87, lon: -79.44, name: "Sample Arena", wheelchair: "no", source: "own visit", licence: "CC0-1.0", observedOn: "2026-03-12" },
  { id: "g4", lat: 43.88, lon: -79.45, name: "Sample Café", wheelchair: "limited", source: "own visit", licence: "CC0-1.0", observedOn: "2026-02-27" },
];

const stored = (page: Page, key: string) => page.evaluate((k) => window.localStorage.getItem(k), key);

async function seed(page: Page, notes: unknown[] = NOTES) {
  await page.goto("/");
  await page.evaluate((items) => {
    window.localStorage.removeItem("the-app-day-notes");
    window.localStorage.setItem("the-app-place-drafts", JSON.stringify(items));
  }, notes);
  await page.goto("/places/days");
}

test.describe("my days", () => {
  test("is reachable from the places menu and opens on the month of the newest observation", async ({ page }) => {
    await seed(page);
    await page.goto("/places");
    await page.getByRole("link", { name: "My days", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "My observing days" })).toBeVisible();
    await expect(page.getByTestId("days-month")).toHaveText("March 2026");
    await expect(page.getByTestId("days-totals")).toContainText("Days with observations: 3.");
    await expect(page.getByTestId("days-totals")).toContainText("They do not say a day is finished.");
  });

  test("shows a calm empty state", async ({ page }) => {
    await seed(page, []);
    await expect(page.getByText("You have no saved observations.")).toBeVisible();
  });

  test("has a calendar where only days with observations are buttons", async ({ page }) => {
    await seed(page);
    const calendar = page.getByRole("table");
    await expect(calendar.getByRole("columnheader")).toHaveCount(7);
    await expect(calendar.getByRole("button")).toHaveCount(2);
    await expect(calendar.getByRole("button", { name: "10, 2 observations. Show this day." })).toBeVisible();
  });

  test("opens a day from the calendar, moves focus to it and lists its places", async ({ page }) => {
    await seed(page);
    await page.getByRole("button", { name: "10, 2 observations. Show this day." }).click();
    const heading = page.getByRole("heading", { level: 2, name: "Day: Tuesday, 10 March 2026 (2026-03-10)" });
    await expect(heading).toBeFocused();
    await expect(page.getByTestId("days-stats")).toContainText("By status - yes: 1; limited: 0; no: 0; UNKNOWN: 1.");
    await expect(page.getByTestId("days-stats")).toContainText("in a straight line");
    const day = page.locator(".days-day");
    await expect(day).toContainText("Place without a name");
    await expect(day).toContainText("Status: UNKNOWN. Source: field notes. Licence: ODbL-1.0. Seen on 2026-03-10. Tier: UNKNOWN.");
    await expect(page.getByRole("button", { name: "10, 2 observations. Show this day." })).toHaveAttribute("aria-pressed", "true");
  });

  test("moves between months and announces the month", async ({ page }) => {
    await seed(page);
    await page.getByRole("button", { name: "Previous month" }).click();
    await expect(page.getByTestId("days-month")).toHaveText("February 2026");
    await expect(page.locator(".places-notice")).toHaveText("Showing February 2026.");
    await expect(page.getByRole("button", { name: "Show 2026-02-27, 1 observation" })).toBeVisible();
    await page.getByRole("button", { name: "Previous month" }).click();
    await expect(page.getByText("No observations in January 2026.")).toBeVisible();
  });

  test("keeps a day note on the device across a reload, and removes it when emptied", async ({ page }) => {
    await seed(page);
    await page.getByRole("button", { name: "Show 2026-03-12, 1 observation" }).click();
    await page.getByLabel("Note for 2026-03-12").fill("Windy, came with a friend.");
    await expect(page.getByText("26 of 500 characters")).toBeVisible();
    await page.getByRole("button", { name: "Save the note" }).click();
    await expect(page.locator(".places-notice")).toHaveText("The note for 2026-03-12 is saved on this device.");
    expect(JSON.parse((await stored(page, "the-app-day-notes")) ?? "{}")).toEqual({ "2026-03-12": "Windy, came with a friend." });
    await page.reload();
    await page.getByRole("button", { name: "Show 2026-03-12, 1 observation" }).click();
    await expect(page.getByLabel("Note for 2026-03-12")).toHaveValue("Windy, came with a friend.");
    await page.getByLabel("Note for 2026-03-12").fill("");
    await page.getByRole("button", { name: "Save the note" }).click();
    await expect(page.locator(".places-notice")).toHaveText("The note for 2026-03-12 is removed.");
    expect(await stored(page, "the-app-day-notes")).toBeNull();
  });

  test("never changes the saved observations", async ({ page }) => {
    await seed(page);
    const before = await stored(page, "the-app-place-drafts");
    await page.getByRole("button", { name: "10, 2 observations. Show this day." }).click();
    await page.getByLabel("Note for 2026-03-10").fill("A note");
    await page.getByRole("button", { name: "Save the note" }).click();
    await page.getByRole("button", { name: "Next month" }).click();
    expect(await stored(page, "the-app-place-drafts")).toBe(before);
  });

  test("offers day files only once a day is chosen", async ({ page }) => {
    await seed(page);
    await expect(page.getByRole("button", { name: "Download a line per day (.csv)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download this day (.txt)" })).toHaveCount(0);
    await page.getByRole("button", { name: "Show 2026-03-12, 1 observation" }).click();
    await expect(page.getByRole("button", { name: "Download this day (.txt)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download this day for OpenStreetMap (.osc)" })).toBeVisible();
  });

  test("has no serious accessibility violations with a day open", async ({ page }) => {
    await seed(page);
    await page.getByRole("button", { name: "10, 2 observations. Show this day." }).click();
    await expect(page.getByTestId("days-stats")).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  });

  test("shows French with French spacing", async ({ page }) => {
    await seed(page);
    await page.getByRole("button", { name: "Français" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Mes journées d’observation" })).toBeVisible();
    await expect(page.getByTestId("days-month")).toHaveText("mars 2026");
    await expect(page.getByTestId("days-totals")).toContainText("Jours avec des observations : 3.");
    await page.getByRole("button", { name: "Afficher le 2026-03-10, 2 observations" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Jour : mardi 10 mars 2026 (2026-03-10)" })).toBeVisible();
    await expect(page.getByTestId("days-stats")).toContainText("yes : 1 ; limited : 0");
  });
});
