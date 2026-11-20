import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * "My access card" and the visit cards in a real browser: the card is made by
 * keyboard, shown to staff in both languages, and printed with a place's visit
 * card. In print layout the controls are hidden and the cards stay. axe on each
 * screen.
 */
const NOTES_KEY = "app.onboarding.notes.v1";
const NEEDS_KEY = "app.onboarding.needs.v1";
const PASSPORT_KEY = "app.onboarding.passport.v1";
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

async function start(page: Page, kept: Record<string, unknown>): Promise<Locator> {
  await page.goto("/");
  await page.evaluate((items) => {
    window.localStorage.clear();
    for (const [k, v] of Object.entries(items)) window.localStorage.setItem(k, JSON.stringify(v));
  }, kept);
  await page.goto("/onboarding/first-run");
  const shell = page.locator(".app").first();
  await press(shell.getByRole("navigation").locator('[data-action="view"][data-value="notes"]'));
  return shell;
}

test("the access card is made by keyboard, shown to staff in both languages, and its form is left off the printed page", async ({ page }) => {
  test.setTimeout(120_000);
  const shell = await start(page, { [NOTES_KEY]: [note], [NEEDS_KEY]: { elevator: "yes" } });
  await press(shell.locator('[data-action="view"][data-value="passport"]'));
  await expect(shell.getByRole("heading", { level: 2 })).toHaveText("My access card");
  await axeClean(page);

  await shell.getByRole("radio", { name: "A manual wheelchair", exact: true }).check();
  await shell.locator("#pp-width").fill("64");
  await press(shell.getByRole("button", { name: "Use my must-haves", exact: true }));
  await expect(shell.getByRole("checkbox", { name: "Elevator", exact: true })).toBeChecked();
  await shell.locator("#pp-helps").fill("Please hold the door.");
  await press(shell.getByRole("button", { name: "Save my access card", exact: true }));
  await expect(shell.locator("#pp-preview")).toBeFocused();
  await expect(shell.locator(".access-card li").first()).toHaveText("I use a manual wheelchair.");
  const saved = JSON.parse((await page.evaluate((k) => window.localStorage.getItem(k), PASSPORT_KEY)) ?? "{}") as { needs?: string[] };
  expect(saved.needs).toEqual(["elevator"]);
  await axeClean(page);

  await page.emulateMedia({ media: "print" });
  await expect(shell.locator("#passport-form")).toBeHidden();
  await expect(shell.locator(".access-card")).toBeVisible();
  await page.emulateMedia({ media: "screen" });

  await press(shell.getByRole("button", { name: "Show my card to staff", exact: true }));
  await expect(shell.getByRole("heading", { level: 2 })).toHaveText("Show to staff");
  await shell.getByRole("checkbox", { name: "Also show it in French", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(shell.locator("section.show-block")).toHaveCount(2);
  await expect(shell.locator('section.show-block[lang="fr"] li').first()).toHaveText("J’utilise un fauteuil roulant manuel.");
  await shell.getByRole("radio", { name: "Largest", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(shell.locator(".show-card")).toHaveAttribute("style", /font-size:\s*275%/);
  await axeClean(page);
  await press(shell.getByRole("button", { name: "Done showing", exact: true }));
  await expect(shell.getByRole("heading", { level: 2 })).toHaveText("My access card");
});

test("a place's visit card prints with the access card first, and the controls stay off paper", async ({ page }) => {
  test.setTimeout(120_000);
  const shell = await start(page, {
    [NOTES_KEY]: [note],
    [PASSPORT_KEY]: { device: "walker", sizes: { width: "", length: "", seatHeight: "" }, needs: [], helps: "", updatedOn: "2026-11-19" },
  });
  await press(shell.locator('[data-action="view"][data-value="places"]'));
  await press(shell.locator('[data-action="open-place"]').first());
  await press(shell.locator('[data-action="open-place-card"]'));
  const cards = shell.locator("article.place-card");
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toHaveClass(/access-card/);
  await axeClean(page);

  await page.emulateMedia({ media: "print" });
  await expect(shell.locator(".no-print").first()).toBeHidden();
  await expect(cards.nth(1)).toBeVisible();
  await page.emulateMedia({ media: "screen" });

  await shell.getByRole("checkbox", { name: /access card/i }).focus();
  await page.keyboard.press("Space");
  await expect(cards).toHaveCount(1);
  await expect(shell.getByRole("checkbox", { name: /access card/i })).toBeFocused();
});
