import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const HEAD = "place_id,place_name,feature,status,source,licence,date,tier,url";
const TABLE = [
  HEAD,
  "lib,Library,ramp,present,City open data,CC0-1.0,2026-10-01,tier-1,",
  "lib,Library,elevator,absent,Transit agency,OGL-Canada-2.0,2025-03-04,,",
  "hall,Town Hall,ramp,present,,,,,",
  "cafe,Café Nord,,,,,,,",
].join("\n");

/** Each violation as "rule: element", so a failure names what to fix. */
async function violations(page: Page): Promise<string[]> {
  const report = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return report.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.html.slice(0, 160)}`));
}

async function openAll(page: Page): Promise<void> {
  await page.evaluate(() => { document.querySelectorAll("details").forEach((d) => { d.open = true; }); });
}

async function loadTable(page: Page, load: string): Promise<void> {
  const panel = page.locator("details.gl-sources-panel");
  if ((await panel.getAttribute("open")) === null) await panel.locator("> summary").click();
  await page.locator("#gl-records-text").fill(TABLE);
  await page.getByRole("button", { name: load }).click();
}

for (const width of [1280, 320]) {
  for (const language of ["en", "fr"] as const) {
    test(`places: ${language} at ${width}px has zero axe violations, empty and with records`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/#places");
      if (language === "fr") await page.getByLabel("French", { exact: true }).check();
      await expect(page.locator("html")).toHaveAttribute("lang", `${language}-CA`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(language === "fr" ? "Lieux" : "Places");
      await openAll(page);
      expect(await violations(page)).toEqual([]);
      await loadTable(page, language === "fr" ? "Charger les fiches" : "Load the records");
      await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
      await openAll(page);
      expect(await violations(page)).toEqual([]);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow).toBe(false);
    });
  }
}

test("places: the section link switches views and back", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Places" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Places");
  await expect(page.getByRole("link", { name: "Places" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Terms" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Glossary");
});

test("places: a loaded table shows source, licence, date and tier for each record and stays after a reload", async ({ page }) => {
  await page.goto("/#places");
  await loadTable(page, "Load the records");
  await expect(page.locator("[data-gl-announce]")).toContainText("Loaded 3 records for 3 places.");
  const records = page.locator("details.gl-records", { hasText: "Sources for Library" });
  await records.locator("summary").click();
  await expect(records.getByRole("row", { name: /Ramp/ })).toContainText("City open data");
  await expect(records.getByRole("row", { name: /Ramp/ })).toContainText("Tier 1");
  await expect(records.getByRole("row", { name: /Elevator/ })).toContainText("Tier unknown");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Town Hall" })).toBeVisible();
});

test("places: a record with no source is shown as unknown", async ({ page }) => {
  await page.goto("/#places");
  await loadTable(page, "Load the records");
  const records = page.locator("details.gl-records", { hasText: "Sources for Town Hall" });
  await records.locator("summary").click();
  await expect(records.getByRole("row", { name: /Ramp/ })).toContainText("unknown");
  await expect(records.getByRole("row", { name: /Ramp/ })).not.toContainText("reported as available");
});

test("places: the credits can be saved as a text file", async ({ page }) => {
  await page.goto("/#places");
  await loadTable(page, "Load the records");
  await page.locator("details.gl-sources-panel > summary").click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save the credits as text" }).click();
  expect((await download).suggestedFilename()).toBe("data-credits-en.txt");
});

for (const [language, width] of [["en", 320], ["fr", 1280]] as const) {
  test(`places: ${language} at ${width}px has zero axe violations after the person has used the page`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/#places");
    if (language === "fr") await page.getByLabel("French", { exact: true }).check();
    await loadTable(page, language === "fr" ? "Charger les fiches" : "Load the records");
    await page.locator("#gl-f-ramp").check();
    await page.locator("#gl-save-0").click();
    await page.locator("#gl-save-1").click();
    await page.locator("#gl-visit-0").click();
    await page.locator("#gl-tag-0").fill("spring");
    await page.locator("#gl-tagadd-0").click();
    await page.locator("#gl-due-0").fill("2027-01-15");
    await page.locator("#gl-due-0").dispatchEvent("change");
    await page.locator("#gl-day-0").selectOption("wed");
    await openAll(page);
    await page.locator("#gl-must-ramp").check();
    await openAll(page);
    await page.locator("#gl-prac-show").click();
    await page.locator("#gl-quiz-opt-unknown").click();
    await openAll(page);
    expect(await violations(page)).toEqual([]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
}

test("places: a record can be added by hand, and needs a source with an open licence", async ({ page }) => {
  await page.goto("/#places");
  await page.locator("details.gl-sources-panel > summary").click();
  await page.locator("#gl-rec-name").fill("Town Hall");
  await page.locator("#gl-rec-feature").selectOption("ramp");
  await page.locator("#gl-rec-status").selectOption("present");
  await page.getByRole("button", { name: "Add the record" }).click();
  await expect(page.getByRole("alert")).toContainText("Type the name of the source.");
  await expect(page.locator("#gl-rec-source")).toBeFocused();
  await expect(page.locator("#gl-rec-licence option")).toHaveCount(12);
  expect(await violations(page)).toEqual([]);
  await page.locator("#gl-rec-source").fill("Town list");
  await page.locator("#gl-rec-licence").selectOption("CC-BY-4.0");
  await page.locator("#gl-rec-date").fill("2026-01-15");
  await page.locator("#gl-rec-tier").selectOption("tier-1");
  await page.getByRole("button", { name: "Add the record" }).click();
  await expect(page.locator("[data-gl-announce]")).toContainText("Added Town Hall with a record: Ramp.");
  await expect(page.getByRole("heading", { name: "Town Hall" })).toBeVisible();
  await page.reload();
  const records = page.locator("details.gl-records", { hasText: "Sources for Town Hall" });
  await records.locator("summary").click();
  await expect(records.getByRole("row", { name: /Ramp/ })).toContainText("Town list");
  await expect(records.getByRole("row", { name: /Ramp/ })).toContainText("Tier 1");
});

test("places: a record can be removed and put back", async ({ page }) => {
  await page.goto("/#places");
  await loadTable(page, "Load the records");
  const records = page.locator("details.gl-records", { hasText: "Sources for Library" });
  await records.locator("summary").click();
  await records.getByRole("button", { name: "Remove the record: Elevator, Transit agency" }).click();
  await expect(page.locator("[data-gl-announce]")).toContainText("Removed a record from Library: Elevator.");
  await expect(page.getByRole("button", { name: "Undo: remove record" })).toBeFocused();
  await page.reload();
  const after = page.locator("details.gl-records", { hasText: "Sources for Library" });
  await after.locator("summary").click();
  await expect(after.getByRole("row")).toHaveCount(2);
  await loadTable(page, "Load the records");
  const again = page.locator("details.gl-records", { hasText: "Sources for Library" });
  await again.locator("summary").click();
  await again.getByRole("button", { name: "Remove the record: Elevator, Transit agency" }).click();
  await page.getByRole("button", { name: "Undo: remove record" }).click();
  await page.reload();
  const back = page.locator("details.gl-records", { hasText: "Sources for Library" });
  await back.locator("summary").click();
  await expect(back.getByRole("row")).toHaveCount(3);
});

test("places: a source can be left out and counted again, and nothing is deleted", async ({ page }) => {
  await page.goto("/#places");
  await loadTable(page, "Load the records");
  await page.locator("details.gl-recordview-panel > summary").click();
  await page.getByLabel("City open data", { exact: true }).uncheck();
  await expect(page.locator("[data-gl-announce]")).toContainText("Leaving out records from City open data.");
  await expect(page.locator("[data-gl-rv-note]")).toHaveText("1 record is left out of this list.");
  await expect(page.locator("details.gl-records", { hasText: "Sources for Library" }).locator("summary")).toContainText("(1 record)");
  await page.reload();
  await expect(page.locator("[data-gl-rv-note]")).toHaveText("1 record is left out of this list.");
  await openAll(page);
  expect(await violations(page)).toEqual([]);
  await page.getByRole("button", { name: "Count every record" }).click();
  await expect(page.locator("details.gl-records", { hasText: "Sources for Library" }).locator("summary")).toContainText("(2 records)");
});

test("places: a table can be added to the records held, and the load can be undone", async ({ page }) => {
  await page.goto("/#places");
  await loadTable(page, "Load the records");
  await page.locator("details.gl-sources-panel > summary").click();
  await page.getByLabel("Add to the records I have").check();
  await page.locator("#gl-records-text").fill(`${HEAD}\nnew,New Place,ramp,present,Town list,CC-BY-4.0,2026-11-01,tier-0,\nlib,Library,ramp,present,City open data,CC0-1.0,2026-10-01,tier-1,`);
  await page.getByRole("button", { name: "Load the records" }).click();
  await expect(page.locator("[data-gl-announce]")).toContainText("Added 1 records and 1 new places. 1 record was already there.");
  await expect(page.getByRole("heading", { name: "New Place" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Town Hall" })).toBeVisible();
  await page.getByRole("button", { name: "Undo: load table" }).click();
  await expect(page.getByRole("heading", { name: "New Place" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Town Hall" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "New Place" })).toHaveCount(0);
});

test("places: the visit button says what it will do", async ({ page }) => {
  await page.goto("/#places");
  await loadTable(page, "Load the records");
  await page.getByRole("button", { name: "Mark as visited: Library" }).click();
  await expect(page.getByRole("button", { name: "Remove visit mark: Library" })).toBeVisible();
  await page.getByRole("button", { name: "Remove visit mark: Library" }).click();
  await expect(page.getByRole("button", { name: "Mark as visited: Library" })).toBeVisible();
});

test("places: a place can be renamed, two entries can be joined, and the changes are listed", async ({ page }) => {
  await page.goto("/#places");
  await page.locator("details.gl-sources-panel > summary").click();
  await page.locator("#gl-records-text").fill(`${TABLE}\nlib-2,library,ramp,present,Town list,CC-BY-4.0,2026-11-01,tier-0,`);
  await page.getByRole("button", { name: "Load the records" }).click();
  await page.locator("details.gl-dupes-panel > summary").click();
  await page.getByRole("button", { name: "Join the entries for Library" }).click();
  await expect(page.locator("[data-gl-announce]")).toContainText("Joined the entries for Library. 1 records were moved.");
  await expect(page.getByRole("heading", { name: "library", exact: true })).toHaveCount(0);
  const card = page.locator("li", { has: page.getByRole("heading", { name: "Town Hall" }) }).first();
  await card.locator("details.gl-rename > summary").click();
  await card.getByLabel("New name for Town Hall").fill("City Hall");
  await card.getByRole("button", { name: "Rename place: Town Hall" }).click();
  await expect(page.getByRole("heading", { name: "City Hall" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "City Hall" })).toBeVisible();
  await page.locator("details.gl-editlog-panel > summary").click();
  await expect(page.locator("[data-gl-editlog] li")).toHaveCount(3);
  await expect(page.locator("[data-gl-editlog] li").first()).toContainText("Renamed Town Hall to City Hall.");
  await openAll(page);
  expect(await violations(page)).toEqual([]);
});

test("places: a table can be checked before it is loaded, and the check changes nothing", async ({ page }) => {
  await page.goto("/#places");
  await page.locator("details.gl-sources-panel > summary").click();
  await page.locator("#gl-records-text").fill(`${TABLE}\nx,X,teleporter,present,,,,,`);
  await page.getByRole("button", { name: "Check the table first" }).click();
  await expect(page.locator("[data-gl-preview]")).toContainText("The table has 3 records for 3 places.");
  await expect(page.locator("[data-gl-preview]")).toContainText("Line 6: The feature is not one we know.");
  await expect(page.locator("[data-gl-preview]")).toContainText("This was only a check. Nothing was changed.");
  await expect(page.getByRole("heading", { name: "Library" })).toHaveCount(0);
  expect(await violations(page)).toEqual([]);
});

test("places: French uses the UNKNOWN token instead of an agreed word", async ({ page }) => {
  await page.goto("/#places");
  await page.getByLabel("French", { exact: true }).check();
  await loadTable(page, "Charger les fiches");
  await expect(page.locator("[data-gl-glance]")).toContainText("sont UNKNOWN.");
  await expect(page.locator("main")).not.toContainText(/inconnues?\b/i);
});
