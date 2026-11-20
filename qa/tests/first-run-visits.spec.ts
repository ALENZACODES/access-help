import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * "My visits" in a real browser: a visit is written by keyboard from a place's
 * page, compared with the notes, turned into the start of a note, and removed
 * after a confirmation that names it. axe on each screen.
 */
const NOTES_KEY = "app.onboarding.notes.v1";
const VISITS_KEY = "app.onboarding.visits.v1";
const fact = { key: "elevator", value: "yes", provenance: { source: "Contributor report", licence: "CC0-1.0", recordedOn: "2026-11-01" } };
const note = { id: "n1", placeName: "Library", address: "1 Main St", createdOn: "2026-11-01", licence: "CC0-1.0", facts: [fact] };

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
    window.localStorage.setItem(k as string, JSON.stringify([n]));
  }, [NOTES_KEY, note] as const);
  await page.goto("/onboarding/first-run");
  const shell = page.locator(".app").first();
  await press(shell.getByRole("navigation").locator('[data-action="view"][data-value="notes"]'));
  return shell;
}

test("a visit is written from a place's page, compared with the notes, and starts a note", async ({ page }) => {
  test.setTimeout(120_000);
  const shell = await start(page);
  await press(shell.locator('[data-action="view"][data-value="places"]'));
  await press(shell.locator('[data-action="open-place"]').first());
  await press(shell.getByRole("button", { name: "Write about a visit here", exact: true }));
  await expect(shell.getByRole("heading", { level: 2 })).toHaveText("Write about a visit");
  await expect(shell.locator("#vs-place")).toHaveValue(/^library-/);
  await axeClean(page);

  await press(shell.getByRole("button", { name: "Save this visit", exact: true }));
  await expect(shell.locator("#error-summary")).toBeFocused();
  await axeClean(page);

  await shell.getByRole("group", { name: "Elevator" }).getByRole("radio", { name: "No", exact: true }).check();
  await shell.locator("#vs-words").fill("Lift was out of order.");
  await press(shell.getByRole("button", { name: "Save this visit", exact: true }));
  await expect(shell.getByRole("heading", { level: 2 })).toHaveText("My visits");
  await expect(shell.locator(".follow-ups li li")).toHaveText(["Elevator: No, not what your notes say."]);
  const kept = JSON.parse((await page.evaluate((k) => window.localStorage.getItem(k), VISITS_KEY)) ?? "[]") as Array<{ found: unknown }>;
  expect(kept.map((v) => v.found)).toEqual([{ elevator: "no" }]);
  await axeClean(page);

  await press(shell.getByRole("button", { name: /^Start a note from the visit to Library/ }).last());
  await expect(shell.locator("#f-placeName")).toHaveValue("Library");
  await expect(shell.locator('input[name="detail-elevator"][value="no"]')).toBeChecked();
  await expect(shell.locator("#f-licence")).toHaveValue("");
});

test("a visit is removed only after a confirmation that names it", async ({ page }) => {
  test.setTimeout(120_000);
  const shell = await start(page);
  await page.evaluate((k) => {
    window.localStorage.setItem(
      k,
      JSON.stringify([{ id: "v-e2e1", placeId: "x-1", placeName: "Arena", visitedOn: "2026-11-02", found: {}, words: "Closed for the day", writtenOn: "2026-11-02" }]),
    );
  }, VISITS_KEY);
  await page.reload();
  await press(shell.getByRole("navigation").locator('[data-action="view"][data-value="notes"]'));
  await press(shell.locator('[data-action="view"][data-value="visits"]'));
  await expect(shell.getByText("This place is no longer in your notes.")).toBeVisible();
  await press(shell.getByRole("button", { name: "Remove the visit to Arena on 2026-11-02", exact: true }));
  const yes = shell.getByRole("button", { name: "Yes, remove it", exact: true });
  await expect(yes).toBeFocused();
  await axeClean(page);
  await press(yes);
  await expect(shell.getByText("No visits written down yet.")).toBeVisible();
  expect(await page.evaluate((k) => window.localStorage.getItem(k), VISITS_KEY)).toBeNull();
});
