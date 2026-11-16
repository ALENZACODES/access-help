import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DRAFTS = () => [
  { id: "c1", lat: 43.85123, lon: -79.43456, name: "Sample Library", wheelchair: "yes", source: "own visit", licence: "CC0-1.0", observedOn: today() },
  { id: "c2", lat: 43.9, lon: -79.4, name: "CITY HALL", wheelchair: "UNKNOWN", source: "own visit", licence: "ODbL-1.0", observedOn: "2020-01-05" },
  { id: "c3", lat: 43.7123, lon: -79.4123, name: " Spaced  Name ", wheelchair: "no", source: "own visit", licence: "CC0-1.0", observedOn: today() },
];

async function seed(page: Page, drafts: unknown[] = DRAFTS()) {
  await page.goto("/");
  await page.evaluate((items) => {
    window.localStorage.setItem("the-app-place-drafts", JSON.stringify(items));
  }, drafts);
}

test.describe("check before you submit", () => {
  test("is reachable from the places menu and says what the checks are not", async ({ page }) => {
    await seed(page);
    await page.goto("/places");
    await page.getByRole("link", { name: "Check before you submit" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Check before you submit" })).toBeVisible();
    await expect(page.getByText("do not say the map will take an edit", { exact: false }).first()).toBeVisible();
    await expect(page.getByTestId("check-summary")).toContainText("3 saved places");
  });

  test("shows a calm empty state with no saved observations", async ({ page }) => {
    await seed(page, []);
    await page.goto("/places/check");
    await expect(page.getByText("You have no saved observations to check.")).toBeVisible();
  });

  test("lists findings and leaves the wheelchair tag out for UNKNOWN", async ({ page }) => {
    await seed(page);
    await page.goto("/places/check");
    const card = page.getByRole("listitem").filter({ has: page.getByRole("heading", { level: 3, name: "CITY HALL" }) });
    await expect(card).toContainText("The name is all capitals");
    await expect(card).toContainText("days ago");
    await expect(card.locator(".check-tags")).not.toContainText("wheelchair");
    await expect(card.locator(".check-tags")).toContainText("name=CITY HALL");
  });

  test("can show only places with something to fix or look at", async ({ page }) => {
    await seed(page);
    await page.goto("/places/check");
    await page.getByLabel("Show only places with something to fix or look at").check();
    await expect(page.getByRole("heading", { level: 3, name: "Sample Library" })).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 3, name: "CITY HALL" })).toBeVisible();
  });

  test("tidies typed spacing, saves it on the device and keeps the place", async ({ page }) => {
    await seed(page);
    await page.goto("/places/check");
    await page.getByRole("button", { name: /^Tidy the text of/ }).click();
    await expect(page.locator(".places-notice")).toContainText("is tidied and saved on this device.");
    const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("the-app-place-drafts") ?? "[]"));
    expect(stored).toHaveLength(3);
    expect(stored.find((r: { id: string }) => r.id === "c3").name).toBe("Spaced Name");
  });

  test("offers the changeset words as editable text", async ({ page }) => {
    await seed(page);
    await page.goto("/places/check");
    const box = page.getByLabel("Changeset comment");
    await expect(box).toHaveValue(/^Add wheelchair access/);
    await box.fill("My own words");
    await expect(box).toHaveValue("My own words");
  });

  test("has no serious accessibility violations", async ({ page }) => {
    await seed(page);
    await page.goto("/places/check");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  });

  test("shows French with French spacing", async ({ page }) => {
    await seed(page);
    await page.goto("/places/check");
    await page.getByRole("button", { name: "Français" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Contrôler avant de soumettre" })).toBeVisible();
    await expect(page.getByTestId("check-summary")).toContainText("Ces vérifications ne cherchent que des oublis.");
    await expect(page.getByText("CC0-1.0\u00a0: 2 lieux")).toBeVisible();
  });
});
