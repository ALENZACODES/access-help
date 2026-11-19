import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Sample data made up for these tests, on fixed days. The App ships with no places. */
function feature(id: string, name: string, status: string, lat: number, lon: number, observedOn: string) {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lon, lat] },
    properties: { id, name, wheelchair: status, source: "Sample open pack", licence: "ODbL-1.0", observedOn },
  };
}

function packBuffer(): Buffer {
  const features = [feature("p1", "Sample Arena", "no", 43.7, -79.4, "2026-09-15"), feature("p2", "Sample Café", "limited", 43.71, -79.41, "2026-09-20")];
  return Buffer.from(JSON.stringify({ manifest: { packId: "sample-pack", generatedOn: "2026-09-21", recordCount: features.length }, data: { type: "FeatureCollection", features } }), "utf8");
}

const NOTES = [
  { id: "a1", lat: 43.85, lon: -79.43, name: "Sample Library", wheelchair: "yes", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-10" },
  { id: "a2", lat: 43.86, lon: -79.43, name: null, wheelchair: "UNKNOWN", source: "own visit", licence: "CC0-1.0", observedOn: "2026-10-01" },
];

const stored = (page: Page, key: string) => page.evaluate((k) => window.localStorage.getItem(k), key);

async function seed(page: Page, options: { notes?: unknown[]; pack?: boolean } = {}) {
  const { notes = NOTES, pack = true } = options;
  await page.goto("/places");
  await page.evaluate((items) => {
    window.localStorage.removeItem("the-app-places-packs");
    window.localStorage.setItem("the-app-place-drafts", JSON.stringify(items));
  }, notes);
  if (pack) {
    await page.reload();
    const before = await stored(page, "the-app-places-packs");
    await page.getByLabel("Pack file (.json)").setInputFiles({ name: "pack.json", mimeType: "application/json", buffer: packBuffer() });
    // The file is read and saved asynchronously. Wait for the save so the next navigation cannot cut it off.
    await expect.poll(() => stored(page, "the-app-places-packs")).not.toBe(before);
  }
  await page.goto("/places/licences");
}

test.describe("licences on my records", () => {
  test("is reachable from the places menu and says it is not legal advice", async ({ page }) => {
    await seed(page, { pack: false });
    await page.goto("/places");
    await page.getByRole("link", { name: "Licences", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Licences on my records" })).toBeVisible();
    await expect(page.getByTestId("licences-advice")).toHaveText("This is a short summary, not legal advice. Read the licence text before you share data.");
  });

  test("opens on a person's own observations and asks nothing for CC0-1.0", async ({ page }) => {
    await seed(page);
    await expect(page.getByRole("radio", { name: "My own observations (2 records)" })).toBeChecked();
    await expect(page.getByTestId("licences-mix")).toHaveText("Every record is CC0-1.0");
    await expect(page.getByText("Nothing is asked.", { exact: true })).toBeVisible();
    await expect(page.getByTestId("licences-split-label")).toHaveText("One file is enough");
  });

  test("shows the duties, the sources and two files for both scopes together", async ({ page }) => {
    await seed(page);
    await page.getByRole("radio", { name: "Both (4 records)" }).check();
    await expect(page.locator(".places-notice")).toHaveText("Looking at 4 records.");
    await expect(page.getByTestId("licences-mix")).toHaveText("CC0-1.0 and ODbL-1.0 together");
    await expect(page.getByTestId("licences-summary")).toHaveText("Records: 4. CC0-1.0: 2. ODbL-1.0: 2. Licence for a combined file: ODbL-1.0.");
    await expect(page.getByTestId("licences-duties").getByRole("listitem")).toHaveCount(3);
    const table = page.getByRole("table");
    await expect(table.getByRole("rowheader")).toHaveText(["Sample open pack", "own visit"]);
    await expect(table.getByRole("row", { name: /own visit/ })).toContainText("yes: 1; limited: 0; no: 0; UNKNOWN: 1");
    await expect(table.getByRole("row", { name: /Sample open pack/ })).toContainText("Asked");
    await expect(table).toContainText("Tier is UNKNOWN for every row");
    await expect(page.getByTestId("licences-split-label")).toHaveText("Two files keep the duties apart");
    await expect(page.getByTestId("licences-part-CC0-1.0")).toContainText("Sharing this file asks for nothing.");
    await expect(page.getByTestId("licences-part-ODbL-1.0")).toContainText("ODbL-1.0 file: 2 records");
  });

  test("gives a credit text and a notice that changes with its length", async ({ page }) => {
    await seed(page);
    await page.getByRole("radio", { name: "Both (4 records)" }).check();
    await expect(page.getByLabel("Credit text to copy")).toHaveValue(/Sources that ask for credit\n- Sample open pack, ODbL-1\.0, 2 records, seen from 2026-09-15 to 2026-09-20\./);
    await expect(page.getByLabel("Notice to copy")).toHaveValue("Contains data from Sample open pack, under ODbL-1.0. Other data is CC0-1.0.");
    await expect(page.getByText("75 characters")).toBeVisible();
    await page.getByRole("radio", { name: "Full" }).check();
    await expect(page.getByLabel("Notice to copy")).toHaveValue(/^This contains data under ODbL-1\.0 from:/);
    await expect(page.getByTestId("licences-notice-hint")).toContainText("ODbL-1.0 asks for a notice like this");
  });

  test("keeps a checklist the person ticks, and drops ticks that no longer apply", async ({ page }) => {
    await seed(page);
    await page.getByRole("radio", { name: "Both (4 records)" }).check();
    await expect(page.getByRole("checkbox")).toHaveCount(5);
    await page.getByRole("checkbox", { name: "The credit for the ODbL-1.0 sources is where people will see it." }).check();
    await page.getByRole("checkbox", { name: "I read the licence text for the records I am sharing." }).check();
    await expect(page.getByTestId("licences-progress")).toHaveText("Ticked: 2. Not ticked: 3. The ticks are yours. The App does not know what was done.");
    await page.getByRole("radio", { name: "My own observations (2 records)" }).check();
    await expect(page.getByRole("checkbox")).toHaveCount(2);
    await expect(page.getByTestId("licences-progress")).toContainText("Ticked: 1. Not ticked: 1.");
  });

  test("downloads a pack file for one licence and a sharing plan", async ({ page }) => {
    await seed(page);
    await page.getByRole("radio", { name: "Both (4 records)" }).check();
    const [part] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download the ODbL-1.0 records (.json)" }).click()]);
    expect(part.suggestedFilename()).toMatch(/^records-odbl-1\.0-\d{4}-\d{2}-\d{2}\.json$/);
    const [plan] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download the sharing plan (.txt)" }).click()]);
    expect(plan.suggestedFilename()).toMatch(/^sharing-plan-\d{4}-\d{2}-\d{2}\.txt$/);
    const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download the sources (.csv)" }).click()]);
    expect(csv.suggestedFilename()).toMatch(/^sources-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  test("never changes the saved observations or packs", async ({ page }) => {
    await seed(page);
    const drafts = await stored(page, "the-app-place-drafts");
    const packs = await stored(page, "the-app-places-packs");
    await page.getByRole("radio", { name: "Both (4 records)" }).check();
    await page.getByRole("radio", { name: "Full" }).check();
    await page.getByRole("checkbox").first().check();
    expect(await stored(page, "the-app-place-drafts")).toBe(drafts);
    expect(await stored(page, "the-app-places-packs")).toBe(packs);
  });

  test("shows a calm empty state and still explains the two licences", async ({ page }) => {
    await seed(page, { notes: [], pack: false });
    await expect(page.getByText("There are no records to look at here.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Download/ })).toHaveCount(0);
    await page.getByText("ODbL-1.0 (Open Data Commons Open Database License 1.0)").click();
    await expect(page.getByText("Credit the source in the way the licence describes.")).toBeVisible();
    await page.getByText("Do these licences cover photos?").click();
    await expect(page.getByText("The App stores no photos.", { exact: false })).toBeVisible();
  });

  test("opens on the packs when a person has no observations", async ({ page }) => {
    await seed(page, { notes: [] });
    await expect(page.getByRole("radio", { name: "Packs on this device (2 records)" })).toBeChecked();
    await expect(page.getByTestId("licences-mix")).toHaveText("Every record is ODbL-1.0");
  });

  test("has no serious accessibility violations with both scopes shown", async ({ page }) => {
    await seed(page);
    await page.getByRole("radio", { name: "Both (4 records)" }).check();
    await expect(page.getByRole("table")).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  });

  test("shows French with French spacing", async ({ page }) => {
    await seed(page);
    await page.getByRole("button", { name: "Français" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Licences de mes fiches" })).toBeVisible();
    await page.getByRole("radio", { name: "Les deux (4 fiches)" }).check();
    await expect(page.locator(".places-notice")).toHaveText("Fiches examinées : 4 fiches.");
    await expect(page.getByTestId("licences-summary")).toContainText("Fiches : 4.");
    await expect(page.getByRole("table")).toContainText("yes : 1 ; limited : 0");
    await expect(page.getByTestId("licences-part-ODbL-1.0")).toContainText("Fichier ODbL-1.0 : 2 fiches");
  });
});
