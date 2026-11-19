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
    feature("s1", "Sample Library", "yes", 43.85, -79.43, daysAgo(40)),
    feature("s3", "Sample Arena", "no", 43.7, -79.4, daysAgo(900)),
    feature("s4", "Sample Clinic Annex", undefined, 43.9, -79.5, daysAgo(5), "ODbL-1.0"),
  ];
  return Buffer.from(JSON.stringify({ manifest: { packId: "sample-pack", generatedOn: daysAgo(1), recordCount: features.length }, data: { type: "FeatureCollection", features } }), "utf8");
}

const NOTES = () => [
  { id: "n-agree", lat: 43.85005, lon: -79.43, name: "Sample Library", wheelchair: "yes", source: "own visit", licence: "CC0-1.0", observedOn: daysAgo(2) },
  { id: "n-differ", lat: 43.70005, lon: -79.4, name: "Sample Arena", wheelchair: "yes", source: "own visit", licence: "CC0-1.0", observedOn: daysAgo(3) },
  { id: "n-fill", lat: 43.90005, lon: -79.5, name: "Sample Clinic Annex", wheelchair: "limited", source: "own visit", licence: "CC0-1.0", observedOn: daysAgo(1) },
  { id: "n-new", lat: 44.9, lon: -78.1, name: "Sample Depot", wheelchair: "UNKNOWN", source: "own visit", licence: "CC0-1.0", observedOn: daysAgo(1) },
];

const stored = (page: Page, key: string) => page.evaluate((k) => window.localStorage.getItem(k), key);

async function seed(page: Page, options: { notes?: unknown[]; pack?: boolean } = {}) {
  const { notes = NOTES(), pack = true } = options;
  await page.goto("/places");
  await page.evaluate((items) => {
    window.localStorage.removeItem("the-app-places-packs");
    window.localStorage.setItem("the-app-place-drafts", JSON.stringify(items));
  }, notes);
  if (pack) {
    await page.reload();
    const before = await stored(page, "the-app-places-packs");
    await page.getByLabel("Pack file (.json)").setInputFiles({ name: "pack.json", mimeType: "application/json", buffer: packBuffer() });
    await expect.poll(() => stored(page, "the-app-places-packs")).not.toBe(before);
  }
}

test.describe("my notes beside the packs", () => {
  test("is reachable from the places menu and says a match is a suggestion", async ({ page }) => {
    await seed(page);
    await page.goto("/places");
    await page.getByRole("link", { name: "My notes beside the packs" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Set my notes beside the packs" })).toBeVisible();
    await expect(page.getByText("A match is a suggestion.", { exact: false }).first()).toBeVisible();
  });

  test("says so when there are no notes, and when there is no pack", async ({ page }) => {
    await seed(page, { notes: [], pack: false });
    await page.goto("/places/compare");
    await expect(page.getByText("You have no saved observations to compare.")).toBeVisible();
    await seed(page, { pack: false });
    await page.goto("/places/compare");
    await expect(page.getByText("No pack is loaded on this device", { exact: false })).toBeVisible();
  });

  test("sets each note beside its pack place without picking a side", async ({ page }) => {
    await seed(page);
    await page.goto("/places/compare");
    await expect(page.getByTestId("compare-summary")).toContainText("Observations compared: 4.");
    await expect(page.getByTestId("compare-summary")).toContainText("Differ from the pack: 1.");
    const differ = page.locator(".compare-row").filter({ has: page.getByRole("heading", { level: 3, name: "Sample Arena" }) });
    await expect(differ).toContainText("Your note and the pack differ");
    await expect(differ).toContainText("The App does not say which is right.");
    await expect(differ).toContainText("Status: yes. Source: own visit. Licence: CC0-1.0.");
    await expect(differ).toContainText("Status: no. Source: sample data for tests. Licence: CC0-1.0.");
    await expect(differ.getByText("Tier: UNKNOWN.", { exact: false })).toHaveCount(2);
    const fill = page.locator(".compare-row").filter({ has: page.getByRole("heading", { level: 3, name: "Sample Clinic Annex" }) });
    await expect(fill).toContainText("The pack has UNKNOWN, you have a status");
    await expect(fill).toContainText("The two records have different licences. Each keeps its own.");
    await expect(page.locator(".compare-row").filter({ hasText: "Sample Depot" })).toContainText("No pack place nearby");
  });

  test("changes nothing on the device", async ({ page }) => {
    await seed(page);
    const before = [await stored(page, "the-app-place-drafts"), await stored(page, "the-app-places-packs")];
    await page.goto("/places/compare");
    await page.getByLabel("How close counts as nearby").selectOption("60");
    await page.getByLabel("Show").selectOption("differs");
    expect([await stored(page, "the-app-place-drafts"), await stored(page, "the-app-places-packs")]).toEqual(before);
  });

  test("can show one group and links to the pack place", async ({ page }) => {
    await seed(page);
    await page.goto("/places/compare");
    await page.getByLabel("Show").selectOption("differs");
    await expect(page.locator(".compare-row")).toHaveCount(1);
    await page.getByRole("link", { name: "Open Sample Arena in the packs" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Sample Arena" })).toBeVisible();
  });

  test("has no serious accessibility violations", async ({ page }) => {
    await seed(page);
    await page.goto("/places/compare");
    await expect(page.getByTestId("compare-summary")).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  });

  test("shows French with French spacing", async ({ page }) => {
    await seed(page);
    await page.goto("/places/compare");
    await page.getByRole("button", { name: "Français" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Mettre mes notes à côté des paquets" })).toBeVisible();
    await expect(page.getByTestId("compare-summary")).toContainText("Observations comparées : 4.");
    await expect(page.locator(".compare-row").first()).toContainText("Niveau : UNKNOWN.");
  });
});
