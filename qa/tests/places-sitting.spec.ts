import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Sample observations made up for these tests, on fixed days. The App ships with no places. */
const NOTES = [
  { id: "a1", lat: 43.85, lon: -79.43, name: "Sample Library", wheelchair: "yes", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-10" },
  { id: "a2", lat: 43.851, lon: -79.431, name: "Sample Arena", wheelchair: "no", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-08" },
  { id: "a3", lat: 44.3, lon: -78.32, name: "Sample Café", wheelchair: "limited", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-12" },
  { id: "u1", lat: 43.86, lon: -79.43, name: "Sample Pool", wheelchair: "UNKNOWN", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-11" },
];

const stored = (page: Page, key: string) => page.evaluate((k) => window.localStorage.getItem(k), key);

async function seed(page: Page, notes: unknown[] = NOTES) {
  await page.goto("/");
  await page.evaluate((items) => {
    window.localStorage.removeItem("the-app-add-sitting");
    window.localStorage.removeItem("the-app-submissions");
    window.localStorage.setItem("the-app-place-drafts", JSON.stringify(items));
  }, notes);
  await page.goto("/places/sitting");
}

async function start(page: Page) {
  await seed(page);
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Observation 1 of 3" })).toBeFocused();
}

test.describe("add to the map, one at a time", () => {
  test("is reachable from the places menu and says the App cannot see the map", async ({ page }) => {
    await seed(page);
    await page.goto("/places");
    await page.getByRole("link", { name: "Add one at a time", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Add to the map, one at a time" })).toBeVisible();
    await expect(page.getByTestId("sitting-cannot-see")).toContainText("The App adds nothing to OpenStreetMap and cannot see it.");
  });

  test("shows a calm empty state", async ({ page }) => {
    await seed(page, []);
    await expect(page.getByText("You have no saved observations.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start", exact: true })).toHaveCount(0);
  });

  test("says what is ready and leaves an UNKNOWN observation out", async ({ page }) => {
    await seed(page);
    await expect(page.getByTestId("sitting-ready")).toHaveText("Ready to go through: 3.");
    await expect(page.getByTestId("sitting-left-out")).toHaveText("Status UNKNOWN, so there is nothing to add: 1.");
    await expect(page.getByRole("radio", { name: "Newest first" })).toBeChecked();
  });

  test("cannot start when only UNKNOWN observations are saved", async ({ page }) => {
    await seed(page, [NOTES[3]]);
    await expect(page.getByText("No observation is ready to go through.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start", exact: true })).toHaveCount(0);
  });

  test("starts on the newest observation and shows its tags", async ({ page }) => {
    await start(page);
    await expect(page.locator(".places-notice")).toHaveText("Sitting started. Observation 1 of 3.");
    await expect(page.getByTestId("sitting-name")).toHaveText("Sample Café");
    await expect(page.getByTestId("sitting-record")).toContainText("Status: limited. Source: own visit. Licence: CC0-1.0. Seen on 2026-11-12. Tier: UNKNOWN.");
    await expect(page.getByLabel("Tags to type")).toHaveValue("name=Sample Café\nwheelchair=limited\ncheck_date:wheelchair=2026-11-12\nsource=own visit");
    await expect(page.getByTestId("sitting-outcome")).toHaveText("What you said so far: Not looked at yet.");
    await expect(page.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  test("goes place by place when that order is chosen", async ({ page }) => {
    await seed(page);
    await page.getByRole("radio", { name: "Oldest first" }).check();
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.getByTestId("sitting-name")).toHaveText("Sample Arena");
  });

  test("notes an added observation, puts it on the person's list and moves on", async ({ page }) => {
    await start(page);
    await page.getByLabel("Changeset number (optional)").fill("123456");
    await page.getByRole("button", { name: "I added this to the map" }).click();
    await expect(page.locator(".places-notice")).toHaveText("Noted: you said you added Sample Café. It is on your list of what you added.");
    await expect(page.getByRole("heading", { level: 2, name: "Observation 2 of 3" })).toBeFocused();
    await expect(page.getByTestId("sitting-counts")).toHaveText("In this sitting: 3. Said added: 1. Skipped: 0. For later: 0. Not looked at yet: 2.");
    await expect(page.getByLabel("Changeset number (optional)")).toHaveValue("");
    const ledger = JSON.parse((await stored(page, "the-app-submissions")) ?? "{}") as { entries: { recordId: string; changeset: string | null }[] };
    expect(ledger.entries.map((e) => [e.recordId, e.changeset])).toEqual([["a3", "123456"]]);
  });

  test("refuses a changeset number that is not a number and changes nothing", async ({ page }) => {
    await start(page);
    await page.getByLabel("Changeset number (optional)").fill("abc");
    await page.getByRole("button", { name: "I added this to the map" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Observation 1 of 3" })).toBeVisible();
    await expect(page.getByTestId("sitting-counts")).toContainText("Said added: 0.");
    expect(await stored(page, "the-app-submissions")).toBeNull();
  });

  test("skips with a reason and keeps one for later, without touching the list", async ({ page }) => {
    await start(page);
    await page.getByLabel("Reason for skipping").selectOption("map-is-newer");
    await page.getByRole("button", { name: "Skip this one" }).click();
    await expect(page.locator(".places-notice")).toHaveText("Noted: Sample Café skipped.");
    await page.getByRole("button", { name: "Come back to it later" }).click();
    await expect(page.locator(".places-notice")).toHaveText("Noted: Sample Library kept for later.");
    await expect(page.getByTestId("sitting-counts")).toHaveText("In this sitting: 3. Said added: 0. Skipped: 1. For later: 1. Not looked at yet: 1.");
    expect(await stored(page, "the-app-submissions")).toBeNull();
  });

  test("takes back an added outcome and takes it off the list too", async ({ page }) => {
    await start(page);
    await page.getByRole("button", { name: "I added this to the map" }).click();
    await page.getByRole("button", { name: "Previous" }).click();
    await expect(page.getByTestId("sitting-outcome")).toHaveText("What you said so far: You said you added it.");
    await page.getByRole("button", { name: "Take back what I said" }).click();
    await expect(page.locator(".places-notice")).toHaveText("Taken back for Sample Café.");
    await expect(page.getByTestId("sitting-outcome")).toHaveText("What you said so far: Not looked at yet.");
    const ledger = JSON.parse((await stored(page, "the-app-submissions")) ?? '{"entries":[]}') as { entries: unknown[] };
    expect(ledger.entries).toEqual([]);
  });

  test("ends at a summary with a row per observation, a changeset group and files", async ({ page }) => {
    await start(page);
    await page.getByLabel("Changeset number (optional)").fill("42");
    await page.getByRole("button", { name: "I added this to the map" }).click();
    await page.getByRole("button", { name: "Skip this one" }).click();
    await page.getByRole("button", { name: "Come back to it later" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Summary of this sitting" })).toBeFocused();
    const table = page.getByTestId("sitting-summary-table");
    await expect(table.getByRole("rowheader")).toHaveText(["Sample Café", "Sample Library", "Sample Arena"]);
    await expect(table.getByRole("row", { name: /^Sample Café/ })).toContainText("You said you added it, changeset 42");
    await expect(table.getByRole("row", { name: /^Sample Library/ })).toContainText("Skipped: the map already says the same");
    await expect(table.getByRole("row", { name: /^Sample Arena/ })).toContainText("For later");
    await expect(page.getByTestId("sitting-group-42")).toContainText("Changeset 42: 1 place");
    await expect(page.getByLabel("Draft for Changeset 42: 1 place")).toHaveValue(/^comment=Wheelchair access for 1 place, seen in person on 2026-11-12\./);
    const [text] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download the summary (.txt)" }).click()]);
    expect(text.suggestedFilename()).toMatch(/^adding-by-hand-\d{4}-\d{2}-\d{2}\.txt$/);
    const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download the summary (.csv)" }).click()]);
    expect(csv.suggestedFilename()).toMatch(/^adding-by-hand-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  test("goes back to an observation from the summary", async ({ page }) => {
    await start(page);
    await page.getByRole("button", { name: "Go to the summary" }).click();
    await page.getByRole("button", { name: "Go to Sample Arena" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Observation 3 of 3" })).toBeFocused();
    await expect(page.getByTestId("sitting-name")).toHaveText("Sample Arena");
    await page.getByRole("button", { name: "Go to the summary" }).click();
    await page.getByRole("button", { name: "Go to the first one not looked at" }).click();
    await expect(page.getByTestId("sitting-name")).toHaveText("Sample Café");
  });

  test("picks the sitting up again after a reload", async ({ page }) => {
    await start(page);
    await page.getByRole("button", { name: "Come back to it later" }).click();
    await page.reload();
    await expect(page.locator(".places-notice")).toContainText("Picked up your sitting from");
    await expect(page.getByTestId("sitting-name")).toHaveText("Sample Library");
    await expect(page.getByTestId("sitting-counts")).toContainText("For later: 1.");
  });

  test("ending removes the sitting and keeps the observations and the list", async ({ page }) => {
    await start(page);
    await page.getByRole("button", { name: "I added this to the map" }).click();
    const drafts = await stored(page, "the-app-place-drafts");
    await page.getByRole("button", { name: "End this sitting" }).click();
    await expect(page.locator(".places-notice")).toHaveText("The sitting is ended.");
    expect(await stored(page, "the-app-add-sitting")).toBeNull();
    expect(await stored(page, "the-app-place-drafts")).toBe(drafts);
    expect(await stored(page, "the-app-submissions")).toContain('"a3"');
    await expect(page.getByTestId("sitting-ready")).toHaveText("Ready to go through: 2.");
    await expect(page.getByTestId("sitting-left-out")).toContainText("Already on your list of what you added: 1.");
  });

  test("has no serious accessibility violations on an observation and on the summary", async ({ page }) => {
    await start(page);
    const onItem = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(onItem.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
    await page.getByRole("button", { name: "I added this to the map" }).click();
    await page.getByRole("button", { name: "Go to the summary" }).click();
    await expect(page.getByTestId("sitting-summary-table")).toBeVisible();
    const onSummary = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(onSummary.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  });

  test("shows French with French spacing and keeps the tag keys as they are", async ({ page }) => {
    await seed(page);
    await page.getByRole("button", { name: "Français" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Ajouter à la carte, une à la fois" })).toBeVisible();
    await expect(page.getByTestId("sitting-ready")).toHaveText("Prêtes à parcourir : 3.");
    await page.getByRole("button", { name: "Commencer", exact: true }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Observation 1 sur 3" })).toBeFocused();
    await expect(page.getByLabel("Balises à taper")).toHaveValue(/wheelchair=limited/);
    await page.getByRole("button", { name: "Je l’ai ajoutée à la carte" }).click();
    await expect(page.getByTestId("sitting-counts")).toContainText("Dites ajoutées : 1.");
  });
});
