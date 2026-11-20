import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";

/**
 * Two devices, as two separate browsers with their own storage: everything is
 * moved from one to the other through the "Move everything" file, and some
 * notes are shared through the "Share some notes" file and the usual notes
 * import. Keyboard only, axe on each screen, one test per flow.
 */
const NOTES_KEY = "app.onboarding.notes.v1";
const BIN_KEY = "app.onboarding.bin.v1";
const fact = { key: "elevator", value: "yes", provenance: { source: "Contributor report", licence: "CC0-1.0", recordedOn: "2026-11-01" } };
const note = (id: string, placeName: string, text?: string): Record<string, unknown> => ({
  id,
  placeName,
  address: "1 Main St",
  createdOn: "2026-11-01",
  licence: "CC0-1.0",
  facts: [fact],
  ...(text ? { note: text } : {}),
});

async function press(control: Locator): Promise<void> {
  await control.focus();
  await control.press("Enter");
}

async function axeClean(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).include(".app").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

/** A fresh "device": its own browser context, with what it keeps written in first. */
async function device(browser: Browser, baseURL: string, kept: Record<string, unknown>): Promise<Page> {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await page.goto("/");
  await page.evaluate((items) => {
    for (const [k, v] of Object.entries(items)) window.localStorage.setItem(k, JSON.stringify(v));
  }, kept);
  return page;
}

/** Help, then "what is kept on this device", then "Move everything": as a person would get there. */
async function openMove(page: Page): Promise<Locator> {
  await page.goto("/onboarding/first-run");
  const shell = page.locator(".app").first();
  await press(shell.getByRole("navigation").locator('[data-action="view"][data-value="help"]'));
  await press(shell.locator('[data-action="open-device"]').first());
  await press(shell.locator('[data-action="open-move"]'));
  return shell;
}

const stored = async (page: Page, key: string): Promise<Array<{ id?: string; note?: unknown }>> =>
  JSON.parse((await page.evaluate((k) => window.localStorage.getItem(k), key)) ?? "[]") as Array<{ id?: string; note?: unknown }>;

/** The text of a download link: a data address, decoded. */
async function linkText(link: Locator): Promise<string> {
  const href = (await link.getAttribute("href")) ?? "";
  return decodeURIComponent(href.slice(href.indexOf(",") + 1));
}

test("everything moves from one device to another by keyboard", async ({ browser }, info) => {
  test.setTimeout(120_000);
  const baseURL = String(info.project.use.baseURL ?? "");
  const a = await device(browser, baseURL, {
    [NOTES_KEY]: [note("a1", "Library"), note("a2", "Cafe")],
    [BIN_KEY]: [{ note: note("a3", "Arena"), removedOn: new Date().toISOString().slice(0, 10) }],
  });
  const shellA = await openMove(a);
  await expect(shellA.getByRole("heading", { level: 2 })).toHaveText("Move everything to another device");
  await axeClean(a);
  const text = await linkText(shellA.locator("[data-move-download]"));
  expect(JSON.parse(text).notes).toHaveLength(2);

  const b = await device(browser, baseURL, { [NOTES_KEY]: [note("b1", "Pool")] });
  const shellB = await openMove(b);
  await shellB.locator("#move-text").fill(text);
  await press(shellB.getByRole("button", { name: "Show what the file would add", exact: true }));
  await expect(shellB.locator("#move-preview")).toBeFocused();
  await axeClean(b);
  await press(shellB.getByRole("button", { name: "Bring in the chosen parts", exact: true }));
  await expect(shellB.getByText("Brought in: Notes (2), Recently removed (1).", { exact: true }).first()).toBeAttached();
  expect((await stored(b, NOTES_KEY)).map((n) => n.id)).toEqual(["b1", "a1", "a2"]);
  expect((await stored(b, BIN_KEY)).length).toBe(1);
  await a.context().close();
  await b.context().close();
});

test("some notes are shared and brought in with the usual notes import, without the private text", async ({ browser }, info) => {
  test.setTimeout(120_000);
  const baseURL = String(info.project.use.baseURL ?? "");
  const a = await device(browser, baseURL, { [NOTES_KEY]: [note("a1", "Library", "My cousin works here"), note("a2", "Cafe")] });
  await a.goto("/onboarding/first-run");
  const shellA = a.locator(".app").first();
  await press(shellA.getByRole("navigation").locator('[data-action="view"][data-value="notes"]'));
  await press(shellA.locator('main [data-action="view"][data-value="share"]'));
  await shellA.locator('[data-action="share-pick"][data-value="a1"]').check();
  await axeClean(a);
  const file = shellA.locator("[data-share-download]");
  const box = await file.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  const text = await linkText(file);
  expect(text).not.toContain("My cousin");

  const b = await device(browser, baseURL, {});
  await b.goto("/onboarding/first-run");
  const shellB = b.locator(".app").first();
  await press(shellB.getByRole("navigation").locator('[data-action="view"][data-value="notes"]'));
  await shellB.locator("#import-text").fill(text);
  await press(shellB.locator('[data-action="import-run"]'));
  await expect.poll(async () => (await stored(b, NOTES_KEY)).map((n) => n.id)).toEqual(["a1"]);
  expect((await stored(b, NOTES_KEY))[0]?.note).toBeUndefined();
  await a.context().close();
  await b.context().close();
});
