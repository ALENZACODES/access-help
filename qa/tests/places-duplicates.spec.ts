import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Sample observations made up for these tests. d1 and d2 are about 11 m apart; d3 and d4 disagree. */
const NOTES = () => [
  { id: "d1", lat: 43.85, lon: -79.43, name: "Sample Library", wheelchair: "yes", source: "own visit", licence: "CC0-1.0", observedOn: daysAgo(9) },
  { id: "d2", lat: 43.8501, lon: -79.43, name: "Sample Library", wheelchair: "yes", source: "own visit", licence: "ODbL-1.0", observedOn: daysAgo(2) },
  { id: "d3", lat: 43.9, lon: -79.5, name: "Sample Arena", wheelchair: "yes", source: "own visit", licence: "CC0-1.0", observedOn: daysAgo(5) },
  { id: "d4", lat: 43.9001, lon: -79.5, name: "Sample Arena", wheelchair: "no", source: "own visit", licence: "CC0-1.0", observedOn: daysAgo(1) },
  { id: "d5", lat: 44.5, lon: -78.1, name: "Sample Depot", wheelchair: "UNKNOWN", source: "own visit", licence: "CC0-1.0", observedOn: daysAgo(1) },
];

const ids = (page: Page) => page.evaluate(() => (JSON.parse(window.localStorage.getItem("the-app-place-drafts") ?? "[]") as { id: string }[]).map((r) => r.id).sort());

async function seed(page: Page, notes: unknown[] = NOTES()) {
  await page.goto("/");
  await page.evaluate((items) => window.localStorage.setItem("the-app-place-drafts", JSON.stringify(items)), notes);
  await page.goto("/places/duplicates");
}

const group = (page: Page, name: string) => page.locator(".dup-group").filter({ has: page.getByRole("heading", { level: 3, name: new RegExp(name) }) });

test.describe("notes saved twice", () => {
  test("is reachable from the places menu and says a group is a suggestion", async ({ page }) => {
    await seed(page);
    await page.goto("/places");
    await page.getByRole("link", { name: "Same place twice" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Notes that may be the same place" })).toBeVisible();
    await expect(page.getByTestId("duplicates-summary")).toContainText("Groups that may be one place: 2.");
    await expect(page.getByTestId("duplicates-summary")).toContainText("A group is a suggestion.");
  });

  test("shows a calm empty state, and says when nothing looks saved twice", async ({ page }) => {
    await seed(page, []);
    await expect(page.getByText("You have no saved observations.")).toBeVisible();
    await seed(page, NOTES().slice(4));
    await expect(page.getByText("Nothing here looks like the same place saved twice.")).toBeVisible();
  });

  test("suggests the newest when the notes agree, and names the different licences", async ({ page }) => {
    await seed(page);
    const library = group(page, "Sample Library");
    await expect(library).toContainText("Same status, different details");
    await expect(library).toContainText("The notes have different licences (CC0-1.0 and ODbL-1.0).");
    await expect(library.getByRole("radio").first()).toBeChecked();
    await expect(library.locator(".dup-choice").first()).toContainText("(Suggested)");
    await expect(library.locator(".dup-choice").first()).toContainText("Tier: UNKNOWN.");
  });

  test("suggests nothing when the notes disagree, and asks for a choice", async ({ page }) => {
    await seed(page);
    const arena = group(page, "Sample Arena");
    await expect(arena).toContainText("Your notes give different statuses");
    await expect(arena).toContainText("The App suggests none of these.");
    for (const radio of await arena.getByRole("radio").all()) await expect(radio).not.toBeChecked();
    await arena.getByRole("button", { name: /^Keep the chosen note in group/ }).click();
    await expect(arena.getByRole("alert")).toContainText("Choose a note to keep first.");
    expect(await ids(page)).toEqual(["d1", "d2", "d3", "d4", "d5"]);
  });

  test("removes nothing before the second confirmation, then keeps the chosen note", async ({ page }) => {
    await seed(page);
    const library = group(page, "Sample Library");
    await library.getByRole("button", { name: /^Keep the chosen note in group/ }).click();
    await expect(library).toContainText("This removes 1 from this device and keeps the one you chose.");
    expect(await ids(page)).toHaveLength(5);
    await library.getByRole("button", { name: /^Yes, remove 1 from group/ }).click();
    await expect(page.locator(".places-notice")).toContainText("Kept one and removed 1 from this device.");
    expect(await ids(page)).toEqual(["d2", "d3", "d4", "d5"]);
  });

  test("puts the removed note back", async ({ page }) => {
    await seed(page);
    const library = group(page, "Sample Library");
    await library.getByRole("button", { name: /^Keep the chosen note in group/ }).click();
    await library.getByRole("button", { name: /^Yes, remove 1 from group/ }).click();
    await page.getByRole("button", { name: "Put the removed notes back" }).click();
    await expect(page.locator(".places-notice")).toContainText("Put back on this device: 1.");
    expect(await ids(page)).toEqual(["d1", "d2", "d3", "d4", "d5"]);
  });

  test("leaves a group alone when the person says they are different places", async ({ page }) => {
    await seed(page);
    await group(page, "Sample Arena").getByRole("button", { name: /^These are different places/ }).click();
    await expect(page.locator(".dup-group")).toHaveCount(1);
    expect(await ids(page)).toHaveLength(5);
  });

  test("finds nothing at a smaller distance", async ({ page }) => {
    await seed(page);
    await page.getByLabel("How close counts as the same place").selectOption("10");
    await expect(page.locator(".dup-group")).toHaveCount(0);
    await expect(page.getByTestId("duplicates-summary")).toContainText("Distance used: 10 m.");
  });

  test("has no serious accessibility violations", async ({ page }) => {
    await seed(page);
    await expect(page.getByTestId("duplicates-summary")).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  });

  test("shows French with French spacing", async ({ page }) => {
    await seed(page);
    await page.getByRole("button", { name: "Français" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Notes qui sont peut-être le même lieu" })).toBeVisible();
    await expect(page.getByTestId("duplicates-summary")).toContainText("Distance utilisée : 25 m.");
    await expect(page.getByText("Quelle note gardez-vous ?").first()).toBeVisible();
  });
});
