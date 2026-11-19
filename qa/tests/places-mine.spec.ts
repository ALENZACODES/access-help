import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Sample observations made up for these tests. */
const NOTES = () => [
  { id: "m1", lat: 43.85, lon: -79.43, name: "Sample Library", wheelchair: "yes", source: "own visit", licence: "CC0-1.0", observedOn: daysAgo(2) },
  { id: "m2", lat: 43.86, lon: -79.44, name: "Café Exemple", wheelchair: "limited", source: "field notes", licence: "ODbL-1.0", observedOn: daysAgo(30) },
  { id: "m3", lat: 43.87, lon: -79.45, name: null, wheelchair: "UNKNOWN", source: "own visit", licence: "CC0-1.0", observedOn: daysAgo(1) },
];

type Draft = { id: string; wheelchair: string; name: string | null };
const drafts = (page: Page) => page.evaluate(() => JSON.parse(window.localStorage.getItem("the-app-place-drafts") ?? "[]") as Draft[]);

async function seed(page: Page, notes: unknown[] = NOTES()) {
  await page.goto("/");
  await page.evaluate((items) => window.localStorage.setItem("the-app-place-drafts", JSON.stringify(items)), notes);
  await page.goto("/places/mine");
}

test.describe("my observations", () => {
  test("is reachable from the places menu and shows what is saved", async ({ page }) => {
    await seed(page);
    await page.goto("/places");
    await page.getByRole("link", { name: "My observations", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Look after my observations" })).toBeVisible();
    await expect(page.getByTestId("mine-summary")).toContainText("Saved observations: 3.");
    await expect(page.getByTestId("mine-summary")).toContainText("By licence - CC0-1.0: 2; ODbL-1.0: 1.");
    await expect(page.locator(".mine-row").first()).toContainText("Tier: UNKNOWN.");
  });

  test("shows a calm empty state", async ({ page }) => {
    await seed(page, []);
    await expect(page.getByText("You have no saved observations.")).toBeVisible();
  });

  test("searches without accents and sorts", async ({ page }) => {
    await seed(page);
    await page.getByLabel("Search by name, source, status, licence or date").fill("cafe");
    await expect(page.getByTestId("mine-shown")).toHaveText("Showing 1 of 3.");
    await expect(page.locator(".mine-row")).toContainText("Café Exemple");
    await page.getByLabel("Search by name, source, status, licence or date").fill("");
    await page.getByLabel("Sort", { exact: true }).selectOption("status");
    await expect(page.locator(".mine-row").first()).toContainText("Status: UNKNOWN.");
  });

  test("previews a correction, needs the confirmation box, then saves it", async ({ page }) => {
    await seed(page);
    await page.getByRole("button", { name: "Correct Sample Library" }).click();
    await expect(page.getByRole("heading", { level: 4, name: "Correct Sample Library" })).toBeFocused();
    await expect(page.getByText("Nothing is changed yet.")).toBeVisible();
    await page.getByLabel("Step-free access").selectOption("no");
    await expect(page.getByTestId("edit-changes")).toHaveText("Status: yes becomes no");
    await expect(page.getByText("only if it is what you saw yourself", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Save the correction" }).click();
    await expect(page.getByRole("alert")).toContainText("Tick the box to confirm.");
    expect((await drafts(page)).find((d) => d.id === "m1")?.wheelchair).toBe("yes");
    await page.getByLabel("This is what I saw myself", { exact: false }).check();
    await page.getByRole("button", { name: "Save the correction" }).click();
    await expect(page.locator(".places-notice")).toContainText("The correction to Sample Library is saved on this device.");
    const saved = await drafts(page);
    expect(saved).toHaveLength(3);
    expect(saved.find((d) => d.id === "m1")?.wheelchair).toBe("no");
  });

  test("takes a correction back", async ({ page }) => {
    await seed(page);
    await page.getByRole("button", { name: "Correct Sample Library" }).click();
    await page.getByLabel("Step-free access").selectOption("UNKNOWN");
    await page.getByLabel("This is what I saw myself", { exact: false }).check();
    await page.getByRole("button", { name: "Save the correction" }).click();
    await page.getByRole("button", { name: "Take back my last change" }).click();
    await expect(page.locator(".places-notice")).toContainText("Took back your edit of Sample Library.");
    expect((await drafts(page)).find((d) => d.id === "m1")?.wheelchair).toBe("yes");
    await expect(page.getByRole("button", { name: "Take back my last change" })).toHaveCount(0);
  });

  test("asks before removing, removes, and can bring the observations back", async ({ page }) => {
    await seed(page);
    await page.getByLabel("Select Sample Library").check();
    await page.getByLabel("Select Place without a name").check();
    await expect(page.getByText("Selected: 2.")).toBeVisible();
    await page.getByRole("button", { name: "Remove the selected observations" }).click();
    expect(await drafts(page)).toHaveLength(3);
    await page.getByRole("button", { name: "Yes, remove 2 from this device" }).click();
    await expect(page.locator(".places-notice")).toContainText("Removed from this device: 2.");
    expect((await drafts(page)).map((d) => d.id)).toEqual(["m2"]);
    await page.getByRole("button", { name: "Take back my last change" }).click();
    await expect(page.locator(".places-notice")).toContainText("Took back your removal of 2.");
    expect((await drafts(page)).map((d) => d.id).sort()).toEqual(["m1", "m2", "m3"]);
  });

  test("keeps the observations when the person changes their mind", async ({ page }) => {
    await seed(page);
    await page.getByLabel("Select Sample Library").check();
    await page.getByRole("button", { name: "Remove the selected observations" }).click();
    await page.getByRole("button", { name: "Keep them" }).click();
    expect(await drafts(page)).toHaveLength(3);
    await page.getByRole("button", { name: "Correct Café Exemple" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("button", { name: "Correct Café Exemple" })).toBeVisible();
  });

  test("has no serious accessibility violations with the form open", async ({ page }) => {
    await seed(page);
    await page.getByRole("button", { name: "Correct Sample Library" }).click();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  });

  test("shows French with French spacing", async ({ page }) => {
    await seed(page);
    await page.getByRole("button", { name: "Français" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Tenir mes observations à jour" })).toBeVisible();
    await expect(page.getByTestId("mine-summary")).toContainText("Observations enregistrées : 3.");
    await expect(page.getByTestId("mine-shown")).toHaveText("Affichées : 3 sur 3.");
  });
});
