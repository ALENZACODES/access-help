import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Sample data made up for these tests. The App ships with no places. */
function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function feature(id: string, name: string | null, status: string | undefined, lat: number, lon: number, observedOn: string, licence = "CC0-1.0") {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lon, lat] },
    properties: { id, name, ...(status === undefined ? {} : { wheelchair: status }), source: "sample data for tests", licence, observedOn },
  };
}

function packBuffer(): Buffer {
  const features = [
    feature("s1", "Sample Library", "yes", 43.85, -79.43, daysAgo(10)),
    feature("s2", "Sample Café", "limited", 43.86, -79.43, daysAgo(400)),
    feature("s3", "Sample Arena", "no", 43.7, -79.4, daysAgo(900)),
    feature("s4", "Sample Clinic Annex", undefined, 43.851, -79.43, daysAgo(5), "ODbL-1.0"),
  ];
  return Buffer.from(JSON.stringify({ manifest: { packId: "sample-pack", generatedOn: daysAgo(1), recordCount: features.length }, data: { type: "FeatureCollection", features } }), "utf8");
}

const stored = (page: Page, key: string) => page.evaluate((k) => window.localStorage.getItem(k), key);

async function seed(page: Page) {
  await page.goto("/places");
  await page.evaluate(() => window.localStorage.removeItem("the-app-places-packs"));
  await page.reload();
  const before = await stored(page, "the-app-places-packs");
  await page.getByLabel("Pack file (.json)").setInputFiles({ name: "pack.json", mimeType: "application/json", buffer: packBuffer() });
  await expect.poll(() => stored(page, "the-app-places-packs")).not.toBe(before);
}

test.describe("places to revisit", () => {
  test("says so when no pack is loaded", async ({ page }) => {
    await page.goto("/places");
    await page.evaluate(() => window.localStorage.removeItem("the-app-places-packs"));
    await page.goto("/places/revisit");
    await expect(page.getByText("No pack is loaded on this device", { exact: false })).toBeVisible();
  });

  test("is reachable from the places menu and lists only places with a reason", async ({ page }) => {
    await seed(page);
    await page.getByRole("link", { name: "Places to revisit" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Places worth another visit" })).toBeVisible();
    await expect(page.getByTestId("revisit-summary")).toContainText("Places looked at: 4. With a reason to revisit: 3. Shown: 3.");
    await expect(page.locator(".revisit-stop")).toHaveCount(3);
    await expect(page.locator(".revisit-stop").filter({ hasText: "Sample Library" })).toHaveCount(0);
    const annex = page.locator(".revisit-stop").filter({ hasText: "Sample Clinic Annex" });
    await expect(annex).toContainText("UNKNOWN is not a no.");
    await expect(annex).toContainText("Licence: ODbL-1.0.");
    await expect(annex).toContainText("Tier: UNKNOWN.");
  });

  test("narrows by reason", async ({ page }) => {
    await seed(page);
    await page.goto("/places/revisit");
    await page.getByLabel("Status is UNKNOWN (1)").check();
    await expect(page.locator(".revisit-stop")).toHaveCount(1);
    await expect(page.locator(".revisit-stop")).toContainText("Sample Clinic Annex");
  });

  test("orders from a typed start, says straight line, and can narrow by distance", async ({ page }) => {
    await seed(page);
    await page.goto("/places/revisit");
    await expect(page.getByLabel("How far from the start")).toBeDisabled();
    await page.getByLabel("Start latitude").fill("43.7");
    await page.getByLabel("Start longitude").fill("-79.4");
    await expect(page.locator(".revisit-stop").first()).toContainText("Sample Arena");
    await expect(page.locator(".revisit-stop").first()).toContainText("in a straight line");
    await expect(page.getByText("knows nothing about kerbs, slopes, stairs or closures", { exact: false })).toBeVisible();
    await page.getByLabel("How far from the start").selectOption("1");
    await expect(page.locator(".revisit-stop")).toHaveCount(1);
  });

  test("explains a start that is not a pair of coordinates and keeps the list", async ({ page }) => {
    await seed(page);
    await page.goto("/places/revisit");
    await page.getByLabel("Start latitude").fill("north");
    await expect(page.getByText("The start is not a pair of coordinates.", { exact: false })).toBeVisible();
    await expect(page.getByLabel("Start latitude")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator(".revisit-stop")).toHaveCount(3);
  });

  test("changes nothing on the device and links on to the sheet import", async ({ page }) => {
    await seed(page);
    const before = await stored(page, "the-app-places-packs");
    await page.goto("/places/revisit");
    await page.getByLabel("How many places").selectOption("10");
    expect(await stored(page, "the-app-places-packs")).toBe(before);
    expect(await stored(page, "the-app-place-drafts")).toBeNull();
    await page.getByRole("link", { name: "Bring in a sheet" }).last().click();
    await expect(page.getByRole("heading", { level: 1, name: "Bring in a sheet of your own notes" })).toBeVisible();
  });

  test("has no serious accessibility violations", async ({ page }) => {
    await seed(page);
    await page.goto("/places/revisit");
    await expect(page.getByTestId("revisit-summary")).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  });

  test("shows French with French spacing", async ({ page }) => {
    await seed(page);
    await page.goto("/places/revisit");
    await page.getByRole("button", { name: "Français" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Lieux qui méritent une autre visite" })).toBeVisible();
    await expect(page.getByTestId("revisit-summary")).toContainText("Lieux examinés : 4.");
    await expect(page.locator(".revisit-stop").first()).toContainText("Niveau : UNKNOWN.");
  });
});
