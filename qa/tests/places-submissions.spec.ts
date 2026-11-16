import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DRAFTS = () => [
  { id: "m1", lat: 43.8595, lon: -79.4395, name: "Sample Library", wheelchair: "yes", source: "own visit", licence: "CC0-1.0", observedOn: today() },
  { id: "m2", lat: 43.8595, lon: -79.4392, name: null, wheelchair: "UNKNOWN", source: "own visit", licence: "CC0-1.0", observedOn: today() },
];

async function seed(page: Page, drafts: unknown[] = DRAFTS()) {
  await page.goto("/");
  await page.evaluate((items) => {
    window.localStorage.removeItem("the-app-submissions");
    window.localStorage.setItem("the-app-place-drafts", JSON.stringify(items));
  }, drafts);
}

test.describe("my submissions", () => {
  test("is reachable from the places menu and says the App cannot see OpenStreetMap", async ({ page }) => {
    await seed(page);
    await page.goto("/places");
    await page.getByRole("link", { name: "My submissions" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Mark what you submitted" })).toBeVisible();
    await expect(page.getByText("The App cannot see OpenStreetMap", { exact: false }).first()).toBeVisible();
  });

  test("shows a calm empty state with no saved observations", async ({ page }) => {
    await seed(page, []);
    await page.goto("/places/submissions");
    await expect(page.getByText("You have no saved observations to mark.")).toBeVisible();
  });

  test("marks an observation as submitted and keeps it after a reload", async ({ page }) => {
    await seed(page);
    await page.goto("/places/submissions");
    await page.getByRole("button", { name: "Mark Sample Library as submitted" }).click();
    await expect(page.locator(".places-notice")).toContainText("Sample Library is marked as submitted.");
    await page.reload();
    await expect(page.getByText("Marked as submitted on", { exact: false })).toBeVisible();
    const stored = await page.evaluate(() => window.localStorage.getItem("the-app-submissions"));
    expect(JSON.parse(stored ?? "{}").entries).toHaveLength(1);
  });

  test("points at a wrong date and saves nothing", async ({ page }) => {
    await seed(page);
    await page.goto("/places/submissions");
    await page.getByLabel("Day you submitted (YYYY-MM-DD)").first().fill("2999-01-01");
    await page.getByRole("button", { name: "Mark Sample Library as submitted" }).click();
    await expect(page.getByRole("alert").first()).toBeFocused();
    expect(await page.evaluate(() => window.localStorage.getItem("the-app-submissions"))).toBeNull();
  });

  test("removes a mark", async ({ page }) => {
    await seed(page);
    await page.goto("/places/submissions");
    await page.getByRole("button", { name: "Mark Sample Library as submitted" }).click();
    await page.getByRole("button", { name: "Remove the mark from Sample Library" }).click();
    await expect(page.locator(".places-notice")).toContainText("The mark is removed from Sample Library.");
  });

  test("has no serious accessibility violations", async ({ page }) => {
    await seed(page);
    await page.goto("/places/submissions");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  });
});
