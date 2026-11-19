import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Sample observations made up for these tests, on fixed days. The App ships with no places. */
const NOTES = [
  { id: "a1", lat: 43.85, lon: -79.43, name: "Sample Library", wheelchair: "yes", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-10" },
  { id: "a2", lat: 43.86, lon: -79.43, name: null, wheelchair: "UNKNOWN", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-14" },
  { id: "a3", lat: 43.87, lon: -79.44, name: "Sample Arena", wheelchair: "no", source: "field notes", licence: "ODbL-1.0", observedOn: "2026-11-12" },
];

const MAP_TEXT = "name=Sample Public Library\namenity=library\nwheelchair=limited\ncheck_date:wheelchair=2026-11-15";

const stored = (page: Page, key: string) => page.evaluate((k) => window.localStorage.getItem(k), key);

async function seed(page: Page, notes: unknown[] = NOTES) {
  await page.goto("/");
  await page.evaluate((items) => window.localStorage.setItem("the-app-place-drafts", JSON.stringify(items)), notes);
  await page.goto("/places/tags");
}

test.describe("tags to type by hand", () => {
  test("is reachable from the places menu and says the App adds nothing to the map", async ({ page }) => {
    await seed(page);
    await page.goto("/places");
    await page.getByRole("link", { name: "Tags to type", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Tags to type by hand" })).toBeVisible();
    await expect(page.getByTestId("tags-never")).toContainText("The App adds nothing to OpenStreetMap.");
  });

  test("shows a calm empty state", async ({ page }) => {
    await seed(page, []);
    await expect(page.getByText("You have no saved observations.")).toBeVisible();
    await expect(page.getByRole("combobox")).toHaveCount(0);
  });

  test("opens on the newest observation with a status and shows its tags", async ({ page }) => {
    await seed(page);
    await expect(page.getByLabel("Observation", { exact: true })).toHaveValue("a3");
    await expect(page.getByTestId("tags-record-line")).toHaveText("Status: no. Source: field notes. Licence: ODbL-1.0. Seen on 2026-11-12. Tier: UNKNOWN. Spot: 43.87000, -79.44000.");
    const table = page.getByTestId("tags-table");
    await expect(table.getByRole("rowheader")).toHaveText(["name", "wheelchair", "check_date:wheelchair", "source"]);
    await expect(table.getByRole("row", { name: /^wheelchair/ })).toContainText("no");
    await expect(page.getByLabel("Tags to copy")).toHaveValue("name=Sample Arena\nwheelchair=no\ncheck_date:wheelchair=2026-11-12\nsource=field notes");
    await expect(page.getByTestId("tags-steps-list").getByRole("listitem")).toHaveCount(8);
  });

  test("writes no wheelchair tag for an UNKNOWN observation and says why", async ({ page }) => {
    await seed(page);
    await page.getByLabel("Observation", { exact: true }).selectOption("a2");
    await expect(page.locator(".places-notice")).toHaveText("Showing the tags for Place without a name.");
    await expect(page.getByTestId("tags-table").getByRole("rowheader")).toHaveText(["source"]);
    await expect(page.getByTestId("tags-held-back")).toContainText("UNKNOWN is never turned into yes, limited or no.");
    await expect(page.getByTestId("tags-steps-list").getByRole("listitem")).toHaveCount(1);
    await expect(page.getByLabel("Comment draft")).toHaveCount(0);
    await expect(page.getByTestId("tags-changeset-notes")).toContainText("Observations left out because their status is UNKNOWN: 1.");
  });

  test("sets pasted map tags beside the observation's tags and gives cautions", async ({ page }) => {
    await seed(page);
    await page.getByLabel("Observation", { exact: true }).selectOption("a1");
    await page.getByLabel("Tags on the map now").fill(MAP_TEXT);
    await expect(page.getByTestId("tags-summary")).toHaveText("Tags - to add: 1; the same: 0; different: 3; on the map only: 1.");
    const compare = page.getByTestId("tags-compare");
    await expect(compare.getByRole("row", { name: /^wheelchair/ })).toContainText("Differs from the map");
    await expect(compare.getByRole("row", { name: /^amenity/ })).toContainText("On the map only: leave it");
    await expect(compare.getByRole("row", { name: /^source/ })).toContainText("Would be added");
    await expect(page.getByTestId("tags-cautions")).toContainText("The check date on the map is newer than your observation.");
    await expect(page.getByTestId("tags-cautions")).toContainText("Neither is marked as wrong here.");
  });

  test("reports pasted lines it cannot read, and clears the paste", async ({ page }) => {
    await seed(page);
    await page.getByLabel("Tags on the map now").fill("these are words\nwheelchair=no");
    await expect(page.getByTestId("tags-paste-notes")).toHaveText("Lines the App could not read as key=value: 1.");
    await page.getByRole("button", { name: "Clear the pasted tags" }).click();
    await expect(page.getByLabel("Tags on the map now")).toHaveValue("");
    await expect(page.locator(".places-notice")).toHaveText("The pasted tags are cleared.");
    await expect(page.getByTestId("tags-compare")).toHaveCount(0);
  });

  test("drops the pasted tags when another observation is chosen", async ({ page }) => {
    await seed(page);
    await page.getByLabel("Tags on the map now").fill(MAP_TEXT);
    await expect(page.getByTestId("tags-compare")).toBeVisible();
    await page.getByLabel("Observation", { exact: true }).selectOption("a1");
    await expect(page.getByLabel("Tags on the map now")).toHaveValue("");
    await expect(page.getByTestId("tags-compare")).toHaveCount(0);
  });

  test("gives a changeset draft and downloads the sheet", async ({ page }) => {
    await seed(page);
    await page.getByLabel("Observation", { exact: true }).selectOption("a1");
    await expect(page.getByLabel("Comment draft")).toHaveValue("Wheelchair access for 1 place, seen in person on 2026-11-10.");
    await expect(page.getByLabel("Source draft")).toHaveValue("own visit");
    await expect(page.getByTestId("tags-changeset-notes")).toContainText("Comment length: 60 / 255.");
    const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download this sheet (.txt)" }).click()]);
    expect(file.suggestedFilename()).toBe("tags-a1.txt");
  });

  test("never changes the saved observations and saves nothing of its own", async ({ page }) => {
    await seed(page);
    const before = await stored(page, "the-app-place-drafts");
    const keys = await page.evaluate(() => Object.keys(window.localStorage).sort().join(","));
    await page.getByLabel("Observation", { exact: true }).selectOption("a1");
    await page.getByLabel("Tags on the map now").fill(MAP_TEXT);
    expect(await stored(page, "the-app-place-drafts")).toBe(before);
    expect(await page.evaluate(() => Object.keys(window.localStorage).sort().join(","))).toBe(keys);
  });

  test("has no serious accessibility violations with a comparison shown", async ({ page }) => {
    await seed(page);
    await page.getByLabel("Tags on the map now").fill(MAP_TEXT);
    await expect(page.getByTestId("tags-compare")).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  });

  test("shows French with French spacing and keeps the tag keys as they are", async ({ page }) => {
    await seed(page);
    await page.getByRole("button", { name: "Français" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Balises à taper à la main" })).toBeVisible();
    await page.getByLabel("Observation", { exact: true }).selectOption("a1");
    await expect(page.getByTestId("tags-record-line")).toContainText("Niveau : UNKNOWN.");
    await expect(page.getByLabel("Balises à copier")).toHaveValue(/wheelchair=yes/);
    await page.getByLabel("Balises sur la carte maintenant").fill(MAP_TEXT);
    await expect(page.getByTestId("tags-summary")).toContainText("à ajouter : 1 ; identiques : 0");
    await expect(page.getByLabel("Brouillon du commentaire")).toHaveValue("Accès en fauteuil roulant pour 1 lieu, vu sur place le 2026-11-10.");
  });
});
