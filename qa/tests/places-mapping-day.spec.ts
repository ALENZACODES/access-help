import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Sample observations made up for these tests. Dates are relative to the test run. */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DRAFTS = () => [
  { id: "m1", lat: 43.8595, lon: -79.4395, name: "Sample Library", wheelchair: "yes", source: "own visit", licence: "CC0-1.0", observedOn: today() },
  { id: "m2", lat: 43.8595, lon: -79.4392, name: null, wheelchair: "UNKNOWN", source: "own visit", licence: "CC0-1.0", observedOn: today() },
  { id: "m3", lat: 43.7, lon: -79.4, name: null, wheelchair: "no", source: "own visit", licence: "ODbL-1.0", observedOn: today() },
];

async function seed(page: Page, drafts: unknown[] = DRAFTS()) {
  await page.goto("/");
  await page.evaluate(
    (items) => {
      window.localStorage.removeItem("the-app-mapping-days");
      window.localStorage.setItem("the-app-place-drafts", JSON.stringify(items));
    },
    drafts,
  );
}

async function fillArea(page: Page, name = "Sample street") {
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("South edge (latitude)").fill("43.85");
  await page.getByLabel("West edge (longitude)").fill("-79.44");
  await page.getByLabel("North edge (latitude)").fill("43.86");
  await page.getByLabel("East edge (longitude)").fill("-79.42");
  await page.getByLabel("Cell size").selectOption("400");
}

test.describe("mapping day", () => {
  test("is reachable from the places menu", async ({ page }) => {
    await seed(page);
    await page.goto("/places");
    await page.getByRole("link", { name: "Mapping day" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Plan a mapping day" })).toBeVisible();
    await expect(page.getByText("The App uploads nothing.")).toBeVisible();
    await expect(page.getByText("No mapping days saved yet.")).toBeVisible();
  });

  test("points at the fields that are wrong and saves nothing", async ({ page }) => {
    await seed(page);
    await page.goto("/places/mapping-day");
    await page.getByRole("button", { name: "Save this mapping day" }).click();
    const alert = page.getByRole("alert").filter({ hasText: "Fix these before saving" });
    await expect(alert).toBeFocused();
    await expect(alert).toContainText("Give the mapping day a name.");
    await expect(alert).toContainText("Enter a number");
    expect(await page.evaluate(() => window.localStorage.getItem("the-app-mapping-days"))).toBeNull();
  });

  test("makes a grid, counts records by cell and keeps UNKNOWN as UNKNOWN", async ({ page }) => {
    await seed(page);
    await page.goto("/places/mapping-day");
    await fillArea(page);
    await page.getByRole("button", { name: "Save this mapping day" }).click();
    await expect(page.getByText("Mapping day saved on this device.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Sample street" })).toBeVisible();
    const table = page.getByRole("table", { name: "Records by cell, north at the top" });
    await expect(table).toBeVisible();
    await expect(table).toContainText("A1: 2 records, 1 recorded as step-free entrance, 1 UNKNOWN");
    await expect(page.getByText("Records outside the area, not shown in any cell: 1.")).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/fully mapped|\bcomplete\b|\bscore of\b|\bverified\b/i);
  });

  test("estimates no time until the person gives a pace", async ({ page }) => {
    await seed(page);
    await page.goto("/places/mapping-day");
    await fillArea(page);
    await page.getByRole("button", { name: "Save this mapping day" }).click();
    await expect(page.getByText(/^No time is estimated/)).toBeVisible();
    await page.getByLabel("Metres per minute").fill("40");
    await page.getByLabel("Minutes in each cell").fill("5");
    await expect(page.getByText(/^At your pace, about/)).toBeVisible();
  });

  test("keeps checklist ticks with the day across a reload", async ({ page }) => {
    await seed(page);
    await page.goto("/places/mapping-day");
    await fillArea(page);
    await page.getByRole("button", { name: "Save this mapping day" }).click();
    const box = page.getByRole("checkbox", { name: /Charge your device/ });
    await box.check();
    await expect(page.getByText("1 of 12 ticked")).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Open Sample street" }).click();
    await expect(page.getByRole("checkbox", { name: /Charge your device/ })).toBeChecked();
  });

  test("takes an area from saved observations", async ({ page }) => {
    await seed(page, [DRAFTS()[0]]);
    await page.goto("/places/mapping-day");
    await page.getByRole("button", { name: "Use the area around my saved observations" }).click();
    await expect(page.getByText(/margin of about 120 metres/)).toBeVisible();
    await expect(page.getByLabel("South edge (latitude)")).not.toHaveValue("");
    await page.getByLabel("Name", { exact: true }).fill("Around my records");
    await page.getByRole("button", { name: "Save this mapping day" }).click();
    await expect(page.getByText("Mapping day saved on this device.")).toBeVisible();
  });

  test("says there is nothing to take an area from when nothing is saved", async ({ page }) => {
    await seed(page, []);
    await page.goto("/places/mapping-day");
    await page.getByRole("button", { name: "Use the area around my saved observations" }).click();
    await expect(page.getByText("There are no saved observations to take an area from.")).toBeVisible();
  });

  test("downloads the cells and the debrief, and makes no write request", async ({ page }) => {
    await seed(page);
    const writes: string[] = [];
    page.on("request", (request) => {
      if (request.method() !== "GET") writes.push(request.method());
    });
    await page.goto("/places/mapping-day");
    await fillArea(page);
    await page.getByRole("button", { name: "Save this mapping day" }).click();
    const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Download .*-cells\.csv/ }).click()]);
    expect(csv.suggestedFilename()).toMatch(/^mapping-day-\d{4}-\d{2}-\d{2}-sample-street-cells\.csv$/);
    const text = readFileSync((await csv.path()) as string, "utf8");
    expect(text.split("\r\n")[0]).toBe("cell,row,col,south,west,north,east,records,yes,limited,no,UNKNOWN,state,oldest,newest");
    expect(text).toMatch(/^A1,0,0,/m);
    const [debrief] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Download .*-debrief\.txt/ }).click()]);
    expect(readFileSync((await debrief.path()) as string, "utf8")).toContain("A cell with no record is not inaccessible");
    expect(writes).toEqual([]);
  });

  test("removes a day", async ({ page }) => {
    await seed(page);
    await page.goto("/places/mapping-day");
    await fillArea(page);
    await page.getByRole("button", { name: "Save this mapping day" }).click();
    await page.getByRole("button", { name: "Remove Sample street" }).click();
    await expect(page.getByText("Mapping day removed.")).toBeVisible();
    await expect(page.getByText("No mapping days saved yet.")).toBeVisible();
  });

  test("works in French with a decimal comma, and has no accessibility violations", async ({ page }) => {
    await seed(page);
    await page.goto("/places/mapping-day");
    await page.getByRole("button", { name: "Français" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Planifier une journée de cartographie" })).toBeVisible();
    await page.getByLabel("Nom", { exact: true }).fill("Rue d’essai");
    await page.getByLabel("Bord sud (latitude)").fill("43,85");
    await page.getByLabel("Bord ouest (longitude)").fill("-79,44");
    await page.getByLabel("Bord nord (latitude)").fill("43,86");
    await page.getByLabel("Bord est (longitude)").fill("-79,42");
    await page.getByLabel("Taille des cellules").selectOption("400");
    await page.getByRole("button", { name: "Enregistrer cette journée de cartographie" }).click();
    await expect(page.getByText("Journée de cartographie enregistrée sur cet appareil.")).toBeVisible();
    await expect(page.getByRole("table")).toContainText("Aucune fiche ici pour l’instant");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
});
