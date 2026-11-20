import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * "What I did" and saved sets of must-haves in a real browser, by keyboard:
 * the list shows the steps taken and narrows to one kind; two sets of
 * must-haves are saved and switched between. axe on each page.
 */
const NOTES_KEY = "app.onboarding.notes.v1";
const NEEDS_KEY = "app.onboarding.needs.v1";
const VISITS_KEY = "app.onboarding.visits.v1";
const fact = { key: "elevator", value: "yes", provenance: { source: "City survey", licence: "CC0-1.0", recordedOn: "2026-10-01" } };
const note = { id: "n1", placeName: "Library", address: "1 Main St", createdOn: "2026-10-02", licence: "CC0-1.0", facts: [fact] };

async function press(control: Locator): Promise<void> {
  await control.focus();
  await control.press("Enter");
}

async function axeClean(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).include(".app").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

async function start(page: Page, extra: Record<string, unknown> = {}): Promise<Locator> {
  await page.goto("/");
  await page.evaluate((items) => {
    window.localStorage.clear();
    for (const [k, v] of Object.entries(items)) window.localStorage.setItem(k, JSON.stringify(v));
  }, { [NOTES_KEY]: [note], ...extra });
  await page.goto("/onboarding/first-run");
  const shell = page.locator(".app").first();
  await press(shell.getByRole("navigation").locator('[data-action="view"][data-value="notes"]'));
  return shell;
}

test("What I did lists the steps taken, newest first, and narrows to one kind", async ({ page }) => {
  test.setTimeout(120_000);
  const visit = { id: "v-1", placeId: "x", placeName: "Library", address: "1 Main St", visitedOn: "2026-11-02", found: { elevator: "no" }, words: "Lift closed", writtenOn: "2026-11-02" };
  const shell = await start(page, { [VISITS_KEY]: [visit] });
  await press(shell.getByRole("button", { name: "What I did", exact: true }));
  await expect(shell.getByRole("heading", { level: 2 })).toHaveText("What I did");
  await expect(shell.locator(".journal-entry strong")).toHaveText(["Visit, 2026-11-02: Library, 1 Main St", "Note added, 2026-10-02: Library, 1 Main St"]);
  await axeClean(page);

  const box = shell.getByRole("checkbox", { name: "Visits", exact: true });
  await box.focus();
  await page.keyboard.press("Space");
  await expect(box).not.toBeChecked();
  await expect(box).toBeFocused();
  await expect(shell.locator(".journal-entry strong")).toHaveText(["Note added, 2026-10-02: Library, 1 Main St"]);
  await expect(shell.locator("#journal-count")).toHaveText("1 of 2 entries.");
});

test("two sets of must-haves are saved and switched between", async ({ page }) => {
  test.setTimeout(120_000);
  const shell = await start(page);
  await press(shell.locator('main [data-action="view"][data-value="places"]').first());
  await press(shell.locator('[data-action="view"][data-value="musthaves"]').first());

  await shell.getByRole("group", { name: "Elevator" }).getByRole("radio", { name: "Must be Yes", exact: true }).check();
  await shell.getByLabel("Name for these must-haves").fill("With the walker");
  await press(shell.getByRole("button", { name: "Save these must-haves as a set", exact: true }));
  await expect(shell.locator(".need-sets li")).toHaveCount(1);

  await shell.getByRole("group", { name: "Step-free entrance" }).getByRole("radio", { name: "Must be Yes", exact: true }).check();
  await shell.getByLabel("Name for these must-haves").fill("With the power chair");
  await press(shell.getByRole("button", { name: "Save these must-haves as a set", exact: true }));
  await expect(shell.locator(".need-sets li")).toHaveCount(2);
  await expect(shell.locator(".need-sets li").filter({ hasText: "With the power chair" }).locator("[data-in-use]")).toBeVisible();
  await axeClean(page);

  await press(shell.getByRole("button", { name: "Use With the walker", exact: true }));
  expect(JSON.parse((await page.evaluate((k) => window.localStorage.getItem(k), NEEDS_KEY)) ?? "{}")).toEqual({ elevator: "yes" });
  await expect(shell.getByRole("group", { name: "Step-free entrance" }).getByRole("radio", { name: "Must be Yes", exact: true })).not.toBeChecked();
});

test("a saved set filters Places in one step, and the access card takes its needs from a set", async ({ page }) => {
  test.setTimeout(120_000);
  const sets = [{ id: "s-walker", name: "With the walker", needs: { elevator: "yes" }, savedOn: "2026-11-01" }];
  const shell = await start(page, { "app.onboarding.needsets.v1": sets });
  await press(shell.locator('main [data-action="view"][data-value="places"]').first());
  await press(shell.getByRole("button", { name: "Filter with With the walker", exact: true }));
  await expect(shell.getByRole("button", { name: "Filter with With the walker", exact: true })).toBeFocused();
  expect(JSON.parse((await page.evaluate((k) => window.localStorage.getItem(k), NEEDS_KEY)) ?? "{}")).toEqual({ elevator: "yes" });
  await axeClean(page);

  await press(shell.getByRole("navigation").locator('[data-action="view"][data-value="notes"]'));
  await press(shell.locator('[data-action="view"][data-value="passport"]'));
  await press(shell.getByRole("button", { name: "Use the must-haves of With the walker", exact: true }));
  await expect(shell.getByRole("checkbox", { name: "Elevator", exact: true })).toBeChecked();
  await expect(shell.getByRole("checkbox", { name: "Automatic door", exact: true })).not.toBeChecked();
});
