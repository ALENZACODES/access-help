import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * "Bring notes in from a spreadsheet" in a real browser: a CSV file is chosen
 * with the file picker, previewed, one note is left out, and the rest are added
 * by keyboard. The rows that cannot be used are listed with their reasons. axe
 * on each screen.
 */
const NOTES_KEY = "app.onboarding.notes.v1";
const CSV = [
  "place_name,address,detail,value,source,licence,recorded_on",
  "Arena,5 Park Rd,elevator,yes,City survey,CC0-1.0,2026-10-01",
  "Arena,5 Park Rd,automatic-door,no,City survey,CC0-1.0,2026-10-01",
  "Pool,,elevator,yes,,CC0-1.0,2026-10-01",
  "Rink,,step-free-entry,no,Site visit,ODbL-1.0,2026-09-15",
].join("\r\n");

async function press(control: Locator): Promise<void> {
  await control.focus();
  await control.press("Enter");
}

async function axeClean(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).include(".app").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

test("a spreadsheet is chosen, previewed, one note left out, and the rest added", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.goto("/onboarding/first-run");
  const shell = page.locator(".app").first();
  await press(shell.getByRole("navigation").locator('[data-action="view"][data-value="notes"]'));
  await press(shell.getByRole("button", { name: "Bring notes in from a spreadsheet", exact: true }));
  await expect(shell.getByRole("heading", { level: 2 })).toHaveText("Bring notes in from a spreadsheet");
  await axeClean(page);

  await shell.getByLabel("Choose a CSV file").setInputFiles({ name: "places.csv", mimeType: "text/csv", buffer: Buffer.from(CSV, "utf8") });
  await expect(shell.locator("#csv-message")).toHaveText("The file was read. Look at what would be added next.");
  await press(shell.getByRole("button", { name: "Look at what would be added", exact: true }));
  await expect(shell.locator("#csv-preview")).toBeFocused();
  await expect(shell.locator("#csv-preview table tbody tr")).toHaveText(["4sourceA Yes or No needs a source."]);
  await expect(shell.getByRole("checkbox")).toHaveCount(2);
  await axeClean(page);

  const rink = shell.getByRole("checkbox", { name: "Rink" });
  await rink.focus();
  await page.keyboard.press("Space");
  await expect(rink).not.toBeChecked();
  await expect(rink).toBeFocused();
  await press(shell.getByRole("button", { name: "Add 1 note", exact: true }));
  await expect(shell.getByRole("heading", { level: 2 })).toHaveText("My notes");

  const kept = JSON.parse((await page.evaluate((k) => window.localStorage.getItem(k), NOTES_KEY)) ?? "[]") as Array<{ placeName: string; facts: Array<{ key: string; value: string; provenance?: { source: string } }> }>;
  expect(kept.map((n) => n.placeName)).toEqual(["Arena"]);
  expect(kept[0]?.facts.filter((f) => f.value !== "unknown").map((f) => `${f.key}=${f.value}:${f.provenance?.source}`)).toEqual(["automatic-door=no:City survey", "elevator=yes:City survey"]);
});

test("notes downloaded one row per note come back unchanged on a clean device, and can be taken back", async ({ page }) => {
  test.setTimeout(120_000);
  const fact = (key: string, value: string, source: string): unknown => ({ key, value, provenance: { source, licence: "CC0-1.0", recordedOn: "2026-10-01" } });
  const notes = [
    { id: "n1", placeName: "Library", address: "1 Main St", createdOn: "2026-10-02", licence: "CC0-1.0", facts: [fact("elevator", "yes", "City survey"), fact("automatic-door", "no", "Site visit")] },
    { id: "n2", placeName: "Pool, east", address: null, createdOn: "2026-10-03", licence: "CC0-1.0", facts: [fact("step-free-entry", "yes", "City survey")] },
  ];
  await page.goto("/");
  await page.evaluate(([k, n]) => {
    window.localStorage.clear();
    window.localStorage.setItem(k as string, JSON.stringify(n));
  }, [NOTES_KEY, notes] as const);
  await page.goto("/onboarding/first-run");
  const shell = page.locator(".app").first();
  await press(shell.getByRole("navigation").locator('[data-action="view"][data-value="notes"]'));
  const href = (await shell.locator("[data-notes-wide-csv]").getAttribute("href")) ?? "";
  const csv = decodeURIComponent(href.slice(href.indexOf(",") + 1));
  const before = await page.evaluate((k) => window.localStorage.getItem(k), NOTES_KEY);

  // A clean device: nothing kept.
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await press(shell.getByRole("navigation").locator('[data-action="view"][data-value="notes"]'));
  await press(shell.getByRole("button", { name: "Bring notes in from a spreadsheet", exact: true }));
  await shell.locator("#csv-text").fill(csv);
  await press(shell.getByRole("button", { name: "Look at what would be added", exact: true }));
  await expect(shell.locator("#csv-preview table")).toHaveCount(0);
  await press(shell.getByRole("button", { name: "Add 2 notes", exact: true }));
  // The same notes: ids, places, days and every Yes or No with its record. Details with no record are kept as UNKNOWN.
  type Kept = { id: string; placeName: string; address?: string | null; createdOn: string; facts: Array<{ key: string; value: string; provenance?: unknown }> };
  const known = (list: Kept[]): unknown => list.map((n) => [n.id, n.placeName, n.address ?? null, n.createdOn, n.facts.filter((f) => f.value !== "unknown").sort((a, b) => a.key.localeCompare(b.key))]);
  const after = JSON.parse((await page.evaluate((k) => window.localStorage.getItem(k), NOTES_KEY)) ?? "[]") as Kept[];
  expect(known(after)).toEqual(known(JSON.parse(before ?? "[]") as Kept[]));
  await axeClean(page);

  await press(shell.getByRole("button", { name: "Take back the 2 notes just added", exact: true }));
  await expect(shell.getByRole("status").filter({ hasText: "The 2 notes from the spreadsheet were taken back." })).toBeVisible();
  expect(JSON.parse((await page.evaluate((k) => window.localStorage.getItem(k), NOTES_KEY)) ?? "[]")).toEqual([]);
});
