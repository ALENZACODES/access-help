import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Keeping places tidy in a real browser, by keyboard: two places that are
 * one are combined from a place's page and the combining undone; a place is
 * renamed; some notes are moved to another place. axe on each page.
 */
const NOTES_KEY = "app.onboarding.notes.v1";
const SHORTLIST_KEY = "app.onboarding.shortlist.v1";
const fact = (key: string, value: string): unknown => ({ key, value, provenance: { source: "City survey", licence: "CC0-1.0", recordedOn: "2026-10-01" } });
const notes = [
  { id: "a1", placeName: "Library", address: "1 Main St", createdOn: "2026-10-02", licence: "CC0-1.0", facts: [fact("elevator", "yes")] },
  { id: "b1", placeName: "Library", address: null, createdOn: "2026-10-03", licence: "CC0-1.0", facts: [fact("automatic-door", "no")] },
  { id: "c1", placeName: "Pool", address: "2 Side Rd", createdOn: "2026-10-04", licence: "CC0-1.0", facts: [fact("step-free-entry", "yes")] },
  { id: "c2", placeName: "Pool", address: "2 Side Rd", createdOn: "2026-10-05", licence: "CC0-1.0", facts: [fact("elevator", "no")] },
];

async function press(control: Locator): Promise<void> {
  await control.focus();
  await control.press("Enter");
}

async function axeClean(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).include(".app").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

async function start(page: Page): Promise<Locator> {
  await page.goto("/");
  await page.evaluate(([k, n]) => {
    window.localStorage.clear();
    window.localStorage.setItem(k as string, JSON.stringify(n));
  }, [NOTES_KEY, notes] as const);
  await page.goto("/onboarding/first-run");
  const shell = page.locator(".app").first();
  await press(shell.getByRole("navigation").locator('[data-action="view"][data-value="notes"]'));
  await press(shell.locator('[data-action="view"][data-value="places"]'));
  return shell;
}

const stored = async (page: Page): Promise<Array<{ id: string; placeName: string; address?: string | null }>> =>
  JSON.parse((await page.evaluate((k) => window.localStorage.getItem(k), NOTES_KEY)) ?? "[]");

test("two places that are one are combined from a place's page, and the combining is undone", async ({ page }) => {
  test.setTimeout(120_000);
  const shell = await start(page);
  await press(shell.locator("article.card").filter({ hasText: "1 Main St" }).locator('[data-action="open-place"]'));
  await press(shell.getByRole("button", { name: /^Combine with Library/ }));
  await expect(shell.getByRole("heading", { level: 2 })).toHaveText("Combine two places");
  await expect(shell.getByRole("radio", { name: "1 Main St", exact: true })).toBeChecked();
  await axeClean(page);

  await press(shell.getByRole("button", { name: "Combine the two places", exact: true }));
  await expect(shell.getByText("The two places were combined.")).toBeVisible();
  expect((await stored(page)).filter((n) => n.placeName === "Library").map((n) => n.address)).toEqual(["1 Main St", "1 Main St"]);
  await axeClean(page);

  await press(shell.getByRole("button", { name: "Undo combining the two places", exact: true }));
  await expect(shell.getByRole("heading", { level: 2 })).toHaveText("Possible matches");
  expect((await stored(page)).map((n) => n.address ?? null)).toEqual(["1 Main St", null, "2 Side Rd", "2 Side Rd"]);
});

test("a place is renamed, its shortlist entry follows, and some notes are moved to another place", async ({ page }) => {
  test.setTimeout(120_000);
  const shell = await start(page);
  const pool = shell.locator("article.card").filter({ hasText: "Pool" });
  await press(pool.locator('[data-action="toggle-shortlist"]'));
  const poolId = (await pool.locator('[data-action="open-place"]').getAttribute("data-value")) ?? "";
  expect(JSON.parse((await page.evaluate((k) => window.localStorage.getItem(k), SHORTLIST_KEY)) ?? "[]")).toEqual([poolId]);
  await press(pool.locator('[data-action="open-place"]'));

  await press(shell.getByRole("button", { name: "Move some notes to another place", exact: true }));
  await shell.getByRole("checkbox", { name: /Elevator: No/ }).check();
  await shell.getByLabel("Name", { exact: true }).fill("Pool annex");
  await press(shell.getByRole("button", { name: "Look at what would change", exact: true }));
  await expect(shell.locator("#pe-preview")).toBeFocused();
  await axeClean(page);
  await press(shell.getByRole("button", { name: "Move the chosen notes", exact: true }));
  await expect(shell.getByText("The notes were moved.")).toBeVisible();
  expect((await stored(page)).map((n) => n.placeName)).toEqual(["Library", "Library", "Pool", "Pool annex"]);

  await press(shell.getByRole("button", { name: "Change this place’s name or address", exact: true }));
  await shell.getByLabel("Address (optional)").fill("2 Side Road");
  await press(shell.getByRole("button", { name: "Look at what would change", exact: true }));
  await expect(shell.locator("#pe-preview li").first()).toHaveText("1 of 1 note will be named “Pool, 2 Side Road”.");
  await press(shell.getByRole("button", { name: "Save the new name and address", exact: true }));
  await expect(shell.getByText("The place’s name and address were changed.")).toBeVisible();
  expect((await stored(page)).find((n) => n.id === "c1")?.address).toBe("2 Side Road");
  const shortlist = JSON.parse((await page.evaluate((k) => window.localStorage.getItem(k), SHORTLIST_KEY)) ?? "[]") as string[];
  expect(shortlist).toHaveLength(1);
  expect(shortlist[0]).not.toBe(poolId);
});

test("in French, the combine page and its preview read correctly and pass axe", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  if (!(await page.evaluate(() => document.documentElement.lang)).startsWith("fr")) {
    await page.getByRole("group", { name: /^(Language|Langue)$/ }).getByRole("button", { name: "Français", exact: true }).click();
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toMatch(/^fr/);
  }
  await page.evaluate(([k, n]) => window.localStorage.setItem(k as string, JSON.stringify(n)), [NOTES_KEY, notes] as const);
  await page.goto("/onboarding/first-run");
  const shell = page.locator(".app").first();
  await press(shell.getByRole("navigation").getByRole("button", { name: "Notes", exact: true }));
  await press(shell.locator('main [data-action="view"][data-value="places"]').first());
  await press(shell.locator("article.card").filter({ hasText: "1 Main St" }).locator('[data-action="open-place"]'));
  await press(shell.getByRole("button", { name: /^Réunir avec Library/ }));
  await expect(shell.getByRole("heading", { level: 2 })).toHaveText("Réunir deux lieux");
  await expect(shell.locator("#combine-preview li").first()).toHaveText("1 note sur 2 prendra le nom «\u202FLibrary, 1 Main St\u202F».");
  await axeClean(page);
});
