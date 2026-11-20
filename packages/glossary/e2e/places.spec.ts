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
  await openPanel(page, "details.gl-sources-panel");
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
  await openPanel(page, "details.gl-sources-panel");
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
  await openPanel(page, "details.gl-sources-panel");
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
  await openPanel(page, "details.gl-sources-panel");
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
  await openPanel(page, "details.gl-sources-panel");
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

test("places: a record can be changed in place, and the change can be cancelled", async ({ page }) => {
  await page.goto("/#places");
  await loadTable(page, "Load the records");
  const records = page.locator("details.gl-records", { hasText: "Sources for Library" });
  await records.locator("summary").click();
  await records.getByRole("button", { name: "Change the record: Elevator, Transit agency" }).click();
  await expect(page.locator("#gl-rec-status")).toBeFocused();
  await expect(page.locator("#gl-rec-name")).toHaveAttribute("readonly", "");
  expect(await violations(page)).toEqual([]);
  await page.getByRole("button", { name: "Cancel the change" }).click();
  await expect(page.locator("[data-gl-announce]")).toContainText("The change was cancelled.");
  const again = page.locator("details.gl-records", { hasText: "Sources for Library" });
  await again.locator("summary").click();
  await again.getByRole("button", { name: "Change the record: Elevator, Transit agency" }).click();
  await page.locator("#gl-rec-status").selectOption("present");
  await page.locator("#gl-rec-tier").selectOption("tier-0");
  await page.getByRole("button", { name: "Save the change" }).click();
  await expect(page.locator("[data-gl-announce]")).toContainText("Changed a record for Library: Elevator.");
  await page.reload();
  const after = page.locator("details.gl-records", { hasText: "Sources for Library" });
  await after.locator("summary").click();
  await expect(after.getByRole("row", { name: /Elevator/ })).toContainText("reported as available");
  await expect(after.getByRole("row", { name: /Elevator/ })).toContainText("Tier 0");
});

test("places: every record can be saved as a page to print", async ({ page }) => {
  await page.goto("/#places");
  await loadTable(page, "Load the records");
  await openPanel(page, "details.gl-sources-panel");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save every record as a page to print" }).click();
  expect((await download).suggestedFilename()).toBe("records-to-print-en.html");
});

const SPLIT = [
  HEAD,
  "lib,Library,ramp,present,City open data,CC0-1.0,2026-10-01,tier-1,",
  "lib,Library,ramp,absent,Transit agency,OGL-Canada-2.0,2025-03-04,,",
  "hall,Town Hall,elevator,present,City open data,CC0-1.0,2026-10-01,tier-1,",
].join("\n");

async function loadSplit(page: Page, load: string): Promise<void> {
  await openPanel(page, "details.gl-sources-panel");
  await page.locator("#gl-records-text").fill(SPLIT);
  await page.getByRole("button", { name: load }).click();
}

for (const language of ["en", "fr"] as const) {
  test(`places: ${language} lists both sides where sources disagree, and picks neither`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/#places");
    if (language === "fr") await page.getByLabel("French", { exact: true }).check();
    await loadSplit(page, language === "fr" ? "Charger les fiches" : "Load the records");
    const panel = page.locator("details.gl-disagree-panel");
    await panel.locator("> summary").click();
    await expect(panel.getByRole("status")).toHaveText(
      language === "fr" ? "Les sources ne concordent pas pour 1 caractéristique. Elle se trouve dans 1 lieu." : "Sources disagree about 1 feature. It is in 1 place.",
    );
    await expect(panel.locator("ul.gl-disagree > li")).toHaveCount(1);
    await expect(panel.locator("ul.gl-disagree li li")).toHaveCount(2);
    await expect(panel.locator('li[data-status="present"]')).toContainText("City open data");
    await expect(panel.locator('li[data-status="absent"]')).toContainText("Transit agency");
    await expect(panel).not.toContainText(/accessible|inconnue/i);
    await openAll(page);
    expect(await violations(page)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  });
}

test("places: a disagreement can be saved as text, and Show puts its place in the list", async ({ page }) => {
  await page.goto("/#places");
  await loadSplit(page, "Load the records");
  const panel = page.locator("details.gl-disagree-panel");
  await panel.locator("> summary").click();
  const download = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Save this list as text" }).click();
  expect((await download).suggestedFilename()).toBe("sources-disagree-en.txt");
  await panel.getByRole("button", { name: "Show Library in the list" }).click();
  await expect(page.locator("#gl-pq")).toHaveValue("Library");
  await expect(page.locator("#gl-pq")).toBeFocused();
  await expect(page.getByRole("heading", { name: "Town Hall" })).toHaveCount(0);
});

test("places: a record can be found by its source, and typing keeps the focus in the box", async ({ page }) => {
  await page.goto("/#places");
  await loadSplit(page, "Load the records");
  const panel = page.locator("details.gl-recsearch");
  await panel.locator("> summary").click();
  const box = page.getByLabel("Words to find in the records");
  await box.pressSequentially("transit");
  await expect(box).toBeFocused();
  await expect(box).toHaveValue("transit");
  await expect(panel.getByRole("status")).toHaveText("1 record has those words.");
  await expect(panel.locator("ul.gl-recmatches li")).toContainText("Library. Ramp: reported as not available. Source: Transit agency. Licence: OGL-Canada-2.0. Dated: 2025-03-04.");
  await box.fill("zzz");
  await expect(panel.getByRole("status")).toHaveText("No records have those words.");
  await box.fill("city hall");
  await panel.getByRole("button", { name: "Show Town Hall in the list" }).click();
  await expect(page.locator("#gl-pq")).toHaveValue("Town Hall");
  await openAll(page);
  expect(await violations(page)).toEqual([]);
});

test("places: older records are listed with their source and date, and can be saved", async ({ page }) => {
  await page.goto("/#places");
  await loadTable(page, "Load the records");
  const panel = page.locator("details.gl-recages-panel");
  await panel.locator("> summary").click();
  await expect(panel.locator("ul.gl-oldrecords li")).toHaveCount(1);
  await expect(panel.locator("ul.gl-oldrecords li")).toContainText("Library, Elevator: reported as not available. Transit agency, dated 2025-03-04.");
  const download = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Save this list as text" }).click();
  expect((await download).suggestedFilename()).toBe("older-records-en.txt");
  await panel.getByRole("button", { name: "Show Library in the list" }).click();
  await expect(page.locator("#gl-pq")).toHaveValue("Library");
});

for (const language of ["en", "fr"] as const) {
  test(`places: ${language} shows one feature in every place, and unknown stays unknown`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/#places");
    if (language === "fr") await page.getByLabel("French", { exact: true }).check();
    await loadTable(page, language === "fr" ? "Charger les fiches" : "Load the records");
    const panel = page.locator("details.gl-fview-panel");
    await panel.locator("> summary").click();
    const list = page.locator("#gl-fview");
    await list.focus();
    await list.selectOption("ramp");
    await expect(list).toBeFocused();
    await expect(list).toHaveValue("ramp");
    const rows = panel.locator("tbody tr");
    await expect(rows).toHaveCount(3);
    await expect(panel.locator('td[data-status="present"]')).toHaveCount(1);
    await expect(panel.locator('td[data-status="unknown"]')).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("Library");
    await expect(rows.nth(0)).toContainText("2026-10-01");
    await expect(panel).not.toContainText(/inconnues?(?![a-zà-ÿ])/i);
    await openAll(page);
    expect(await violations(page)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await list.selectOption("");
    await expect(panel.locator("table")).toHaveCount(0);
  });
}

for (const language of ["en", "fr"] as const) {
  test(`places: ${language} lists what is still unknown, and follows the chosen features`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/#places");
    if (language === "fr") await page.getByLabel("French", { exact: true }).check();
    await loadTable(page, language === "fr" ? "Charger les fiches" : "Load the records");
    const panel = page.locator("details.gl-gaps-panel");
    await panel.locator("> summary").click();
    await expect(panel.locator("ul.gl-gaps > li")).toHaveCount(3);
    await expect(panel.locator('li[data-reason="not-usable"]')).toHaveCount(1);
    await expect(panel.locator("ul.gl-gaps > li").first()).toContainText("Town Hall");
    await page.locator("#gl-f-ramp").check();
    await expect(panel.locator("ul.gl-gaps > li")).toHaveCount(2);
    await expect(panel).not.toContainText("Library");
    await expect(panel).not.toContainText(/inconnues?(?![a-zà-ÿ])/i);
    await openAll(page);
    expect(await violations(page)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  });
}

test("places: every record of one source can be listed and saved", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/#places");
  await loadTable(page, "Load the records");
  const panel = page.locator("details.gl-sview-panel");
  await panel.locator("> summary").click();
  const list = page.locator("#gl-sview");
  await list.focus();
  await list.selectOption({ label: "Transit agency" });
  await expect(list).toBeFocused();
  await expect(panel.getByRole("status")).toHaveText("1 record, in 1 place. Dated 2025-03-04.");
  await expect(panel.locator("tbody tr")).toHaveCount(1);
  await expect(panel.locator("tbody tr")).toContainText("Library");
  await expect(panel.locator("tbody tr")).toContainText("OGL-Canada-2.0");
  const download = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Save this table as text" }).click();
  expect((await download).suggestedFilename()).toBe("source-records-en.txt");
  await openAll(page);
  expect(await violations(page)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await list.selectOption("");
  await expect(panel.locator("table")).toHaveCount(0);
});

for (const language of ["en", "fr"] as const) {
  test(`places: ${language} compares two sources side by side, and picks neither`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/#places");
    if (language === "fr") await page.getByLabel("French", { exact: true }).check();
    await loadSplit(page, language === "fr" ? "Charger les fiches" : "Load the records");
    const panel = page.locator("details.gl-sc-panel");
    await panel.locator("> summary").click();
    const first = page.locator("#gl-sca");
    const second = page.locator("#gl-scb");
    await first.selectOption({ label: "City open data" });
    await expect(panel.locator("table")).toHaveCount(0);
    await second.focus();
    await second.selectOption({ label: "Transit agency" });
    await expect(second).toBeFocused();
    await expect(first).toHaveValue("0");
    await expect(panel.locator("tbody tr")).toHaveCount(2);
    await expect(panel.locator('tr[data-outcome="differ"]')).toHaveCount(1);
    await expect(panel.locator('tr[data-outcome="only-a"]')).toContainText("Town Hall");
    await expect(panel.getByRole("status")).toContainText(language === "fr" ? "Elles diffèrent dans 1 cas." : "They differ in 1 case.");
    await expect(panel).not.toContainText(/inconnues?(?![a-zà-ÿ])/i);
    await openAll(page);
    expect(await violations(page)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await second.selectOption({ label: "City open data" });
    await expect(panel.locator("table")).toHaveCount(0);
  });
}

test("places: the comparison, the licences, the years and the summary can each be saved", async ({ page }) => {
  await page.goto("/#places");
  await loadSplit(page, "Load the records");
  await openAll(page);
  await page.locator("#gl-sca").selectOption({ label: "City open data" });
  await page.locator("#gl-scb").selectOption({ label: "Transit agency" });
  const files: [string, string][] = [
    ["details.gl-sc-panel", "two-sources-en.txt"],
    ["details.gl-licences-panel", "records-by-licence-en.txt"],
    ["details.gl-years-panel", "records-by-year-en.txt"],
    ["details.gl-report-panel", "records-summary-en.txt"],
  ];
  for (const [panel, name] of files) {
    const download = page.waitForEvent("download");
    await page.locator(panel).getByRole("button", { name: /^Save this (table|summary) as text$/ }).click();
    expect((await download).suggestedFilename()).toBe(name);
  }
});

test("places: the summary agrees with the tables beside it", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/#places");
  await loadSplit(page, "Load the records");
  await openAll(page);
  const report = page.locator("details.gl-report-panel");
  await expect(report.locator('tr[data-count="places"] td')).toHaveText("2");
  await expect(report.locator('tr[data-count="held"] td')).toHaveText("3");
  await expect(report.locator('tr[data-count="usable"] td')).toHaveText("3");
  await expect(report.locator('tr[data-count="disagreements"] td')).toHaveText("1");
  await expect(report.locator('tr[data-count="sources"] td')).toHaveText("2");
  const licences = page.locator("details.gl-licences-panel");
  await expect(licences.locator("tbody tr")).toHaveCount(2);
  await expect(licences.locator('tr[data-open="no"]')).toHaveCount(0);
  const years = page.locator("details.gl-years-panel");
  await expect(years.locator("tbody tr")).toHaveCount(2);
  await expect(years.locator("tbody tr").first()).toContainText("2026");
  expect(await violations(page)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

/** Opens a panel when it is closed. The page closes its panels when the records change. */
async function openPanel(page: Page, selector: string): Promise<void> {
  const panel = page.locator(selector);
  if ((await panel.getAttribute("open")) === null) await panel.locator("> summary").click();
}

for (const language of ["en", "fr"] as const) {
  test(`places: ${language} keeps a copy of the records, shows what differs, and goes back to it`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/#places");
    if (language === "fr") await page.getByLabel("French", { exact: true }).check();
    const t =
      language === "fr"
        ? { load: "Charger les fiches", name: "Nom de la copie", keep: "Garder une copie maintenant", diff: /^Voir ce qui diffère de la copie/, use: /^Revenir à cette copie/, removed: "1 fiche retirée.", undo: /^Annuler\s: revenir à une copie$/ }
        : { load: "Load the records", name: "Name for the copy", keep: "Keep a copy now", diff: /^See what differs from the copy/, use: /^Go back to this copy/, removed: "1 record removed.", undo: /^Undo: go back to a copy$/ };
    await loadSplit(page, t.load);
    const panel = page.locator("details.gl-snapshots-panel");
    await panel.locator("> summary").click();
    await page.getByLabel(t.name).fill("Before");
    await panel.getByRole("button", { name: t.keep }).click();
    await expect(panel.locator("ul.gl-snapshots > li")).toHaveCount(1);
    await expect(page.getByLabel(t.name)).toBeFocused();
    await page.locator("details.gl-records").first().locator("> summary").click();
    await page.locator('[id^="gl-rrm-"]').first().click();
    await openPanel(page, "details.gl-snapshots-panel");
    await panel.getByRole("button", { name: t.diff }).click();
    await expect(panel.locator("[data-gl-snap-diff]").getByRole("status")).toHaveText(t.removed);
    await expect(panel.locator('li[data-diff="record-removed"]')).toHaveCount(1);
    await openAll(page);
    expect(await violations(page)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    const before = await page.locator('[id^="gl-rrm-"]').count();
    await openPanel(page, "details.gl-snapshots-panel");
    await panel.getByRole("button", { name: t.use }).click();
    await expect(page.locator('[id^="gl-rrm-"]')).toHaveCount(before + 1);
    await expect(page.getByRole("button", { name: t.undo })).toBeVisible();
    await page.reload();
    await expect(page.locator('[id^="gl-rrm-"]')).toHaveCount(before + 1);
    await expect(page.locator("details.gl-snapshots-panel ul.gl-snapshots > li")).toHaveCount(1);
  });
}

test("places: the check of a table lists each difference, and the list can be saved", async ({ page }) => {
  await page.goto("/#places");
  await loadSplit(page, "Load the records");
  await openPanel(page, "details.gl-sources-panel");
  await page.locator("#gl-records-text").fill(TABLE);
  await page.getByRole("button", { name: "Check the table first" }).click();
  const detail = page.locator("details.gl-preview-detail");
  await detail.locator("> summary").click();
  await expect(detail.locator('li[data-diff="place-added"]')).toContainText("Café Nord");
  await expect(detail.locator('li[data-diff="record-changed"], li[data-diff="record-removed"], li[data-diff="record-added"]').first()).toBeVisible();
  const download = page.waitForEvent("download");
  await detail.getByRole("button", { name: "Save the differences as text" }).click();
  expect((await download).suggestedFilename()).toBe("table-differences-en.txt");
  await expect(page.getByRole("heading", { name: "Café Nord" })).toHaveCount(0);
  expect(await violations(page)).toEqual([]);
});

test("places: a panel a person opened stays open when the records change, and closes when they close it", async ({ page }) => {
  await page.goto("/#places");
  await loadSplit(page, "Load the records");
  const tidy = page.locator("details.gl-tidy-panel");
  const gaps = page.locator("details.gl-gaps-panel");
  await tidy.locator("> summary").click();
  await gaps.locator("> summary").click();
  await gaps.locator("> summary").click();
  await page.locator("details.gl-records").first().locator("> summary").click();
  await page.locator('[id^="gl-rrm-"]').first().click();
  await expect(page.locator("details.gl-tidy-panel")).toHaveAttribute("open", "");
  await expect(page.locator("details.gl-gaps-panel")).not.toHaveAttribute("open", "");
  await expect(page.locator("details.gl-records[open]")).toHaveCount(0);
  await expect(tidy.locator("#gl-tidy-src")).toBeVisible();
});

for (const language of ["en", "fr"] as const) {
  test(`places: ${language} tidies a whole source away in one step, and Undo brings it back`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/#places");
    if (language === "fr") await page.getByLabel("French", { exact: true }).check();
    const t =
      language === "fr"
        ? { load: "Charger les fiches", remove: "Retirer toutes les fiches de cette source", done: "1 fiche retirée de 1 lieu.", undo: /^Annuler\s: ranger les fiches$/ }
        : { load: "Load the records", remove: "Remove every record from this source", done: "Removed 1 record from 1 place.", undo: /^Undo: tidy the records$/ };
    await loadSplit(page, t.load);
    const panel = page.locator("details.gl-tidy-panel");
    await panel.locator("> summary").click();
    await expect(panel.getByRole("button", { name: t.remove })).toHaveCount(0);
    const list = page.locator("#gl-tidy-src");
    await list.focus();
    await list.selectOption({ label: "Transit agency" });
    await expect(list).toBeFocused();
    await openAll(page);
    expect(await violations(page)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    const before = await page.locator('[id^="gl-rrm-"]').count();
    await panel.getByRole("button", { name: t.remove }).click();
    await expect(page.locator('[id^="gl-rrm-"]')).toHaveCount(before - 1);
    await expect(page.locator("details.gl-tidy-panel")).toHaveAttribute("open", "");
    await expect(panel.locator("[data-gl-tidy-msg]")).toHaveText(t.done);
    await expect(page.getByRole("button", { name: t.undo })).toBeFocused();
    await page.getByRole("button", { name: t.undo }).click();
    await expect(page.locator('[id^="gl-rrm-"]')).toHaveCount(before);
  });
}

test("places: every place and feature is one table that follows the chosen features and saves for a spreadsheet", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/#places");
  await loadSplit(page, "Load the records");
  const panel = page.locator("details.gl-matrix-panel");
  await panel.locator("> summary").click();
  await expect(panel.locator("tbody tr")).toHaveCount(2);
  await expect(panel.locator('td[data-status="conflict"]')).toHaveCount(1);
  await page.locator("#gl-f-ramp").check();
  await expect(panel.locator("thead th")).toHaveCount(2);
  await expect(panel.locator("tbody tr").first()).toContainText("sources disagree");
  await openAll(page);
  expect(await violations(page)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  const download = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Save this table for a spreadsheet" }).click();
  expect((await download).suggestedFilename()).toBe("places-and-features-en.csv");
});

const KINDS = [
  `${HEAD},place_kind,place_area`,
  "lib,Library,,,City open data,CC0-1.0,2026-10-01,tier-1,,library,Riverside",
  "lib,Library,ramp,present,City open data,CC0-1.0,2026-10-01,tier-1,,,",
  "cafe,Corner Cafe,,,City open data,CC0-1.0,2026-10-01,tier-1,,cafe,Riverside",
  "hall,Town Hall,elevator,present,City open data,CC0-1.0,2026-10-01,tier-1,,,",
].join("\n");

for (const language of ["en", "fr"] as const) {
  test(`places: ${language} narrows the list by kind and area, and keeps places with nothing known under Unknown`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/#places");
    if (language === "fr") await page.getByLabel("French", { exact: true }).check();
    const t =
      language === "fr"
        ? { load: "Charger les fiches", line: /Type de lieu\s: Bibliothèque\. Secteur\s: Riverside\./, none: /Type de lieu\s: UNKNOWN\. Secteur\s: UNKNOWN\./, one: "1 lieux sur 3 sont de ce type et dans ce secteur.", two: "2 lieux sur 3 sont de ce type et dans ce secteur." }
        : { load: "Load the records", line: /Kind of place: Library\. Area: Riverside\./, none: /Kind of place: Unknown\. Area: Unknown\./, one: "1 of 3 places are of this kind and in this area.", two: "2 of 3 places are of this kind and in this area." };
    await openPanel(page, "details.gl-sources-panel");
    await page.locator("#gl-records-text").fill(KINDS);
    await page.getByRole("button", { name: t.load }).click();
    const lines = page.locator("[data-gl-presults] p.gl-placeinfo");
    await expect(lines).toHaveCount(3);
    await expect(page.locator('[data-gl-presults] p.gl-placeinfo[data-kind="library"]')).toHaveText(t.line);
    await expect(page.locator('[data-gl-presults] p.gl-placeinfo[data-kind="unknown"]')).toHaveText(t.none);
    await page.locator("#gl-if-kind").selectOption("library");
    await expect(lines).toHaveCount(1);
    await expect(page.locator("[data-gl-if-status]")).toHaveText(t.one);
    await expect(page.locator("#gl-if-kind")).toBeFocused();
    await page.locator("#gl-if-kind").selectOption("");
    await page.locator("#gl-if-area").selectOption("0");
    await expect(lines).toHaveCount(2);
    await expect(page.locator("[data-gl-if-status]")).toHaveText(t.two);
    await page.locator("#gl-if-area").selectOption("unknown");
    await expect(lines).toHaveCount(1);
    await expect(lines.first()).toHaveText(t.none);
    await page.locator("#gl-if-clear").click();
    await expect(lines).toHaveCount(3);
    for (const id of ["#gl-if-kind", "#gl-if-area"]) {
      const box = await page.locator(id).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    await openAll(page);
    await expect(page.locator('details.gl-info-panel tr[data-row="library"] td')).toHaveText("1");
    expect(await violations(page)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await page.reload();
    await expect(page.locator("[data-gl-presults] p.gl-placeinfo")).toHaveCount(3);
  });
}

test("places: a kind and area can be set with a source, need an open licence, and can be undone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/#places");
  await loadSplit(page, "Load the records");
  await expect(page.locator("p.gl-placeinfo")).toHaveCount(0);
  await expect(page.locator("#gl-if-kind")).toHaveCount(0);
  const panel = page.locator("details.gl-info-panel");
  await panel.locator("> summary").click();
  await page.locator("#gl-pi-place").selectOption({ label: "Town Hall" });
  await page.locator("#gl-pi-kind").selectOption("government");
  await page.locator("#gl-pi-area").fill("Old Town");
  await page.locator("#gl-pi-save").click();
  await expect(panel.getByRole("alert")).toContainText("There are 3 things to fix before this can be saved.");
  await expect(page.locator("#gl-pi-area")).toHaveValue("Old Town");
  await expect(page.locator("p.gl-placeinfo")).toHaveCount(0);
  await page.locator("#gl-pi-source").fill("City open data");
  await page.locator("#gl-pi-licence").selectOption("CC0-1.0");
  await page.locator("#gl-pi-date").fill("2026-10-01");
  for (const id of ["#gl-pi-place", "#gl-pi-kind", "#gl-pi-area", "#gl-pi-source", "#gl-pi-date", "#gl-pi-save", "#gl-pq"]) {
    const box = await page.locator(id).boundingBox();
    expect(box?.height ?? 0, id).toBeGreaterThanOrEqual(44);
  }
  await page.locator("#gl-pi-save").click();
  await expect(page.locator('p.gl-placeinfo[data-kind="government"]')).toHaveText(/Kind of place: Government office\. Area: Old Town\. Source: City open data, dated 2026-10-01\./);
  await expect(page.locator("#gl-if-kind")).toBeVisible();
  await openAll(page);
  expect(await violations(page)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.reload();
  await expect(page.locator('p.gl-placeinfo[data-kind="government"]')).toHaveCount(1);
  await page.goto("/#places");
  await openPanel(page, "details.gl-info-panel");
  await page.locator("#gl-pi-place").selectOption({ label: "Town Hall" });
  await page.locator("#gl-pi-remove").click();
  await expect(page.locator("p.gl-placeinfo")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo: kind and area" }).click();
  await expect(page.locator('p.gl-placeinfo[data-kind="government"]')).toHaveCount(1);
});

for (const language of ["en", "fr"] as const) {
  test(`places: ${language} keeps what a person saw beside the records, and never as a record`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/#places");
    if (language === "fr") await page.getByLabel("French", { exact: true }).check();
    const t =
      language === "fr"
        ? { load: "Charger les fiches", pick: "Choisissez d’abord un lieu.", none: "Vous n’avez rien ajouté de ce que vous avez vu.", one: "Vous avez 1 note sur ce que vous avez vu.", two: "Vous avez 2 notes sur ce que vous avez vu.", same: "Les fiches disent la même chose.", unknown: "Les fiches indiquent UNKNOWN pour cette caractéristique.", card: /Rampe\s: c’était là\./, undo: /^Annuler\s: retirer la note$/ }
        : { load: "Load the records", pick: "Choose a place first.", none: "You have not added anything you saw.", one: "You have 1 note of what you saw.", two: "You have 2 notes of what you saw.", same: "The records say the same.", unknown: "The records show this feature as Unknown.", card: /Ramp: it was there\./, undo: /^Undo: remove what you saw$/ };
    await openPanel(page, "details.gl-sources-panel");
    await page.locator("#gl-records-text").fill(KINDS);
    await page.getByRole("button", { name: t.load }).click();
    const panel = page.locator("details.gl-seen-panel");
    await openPanel(page, "details.gl-seen-panel");
    await expect(panel.locator("[data-gl-seen-list]").getByRole("status")).toHaveText(t.none);
    await page.locator("#gl-seen-save").click();
    await expect(panel.locator("[data-gl-seen-msg]")).toHaveText(t.pick);
    await expect(page.locator("#gl-seen-place")).toBeFocused();
    await expect(panel.locator("[data-gl-seen-list]").getByRole("status")).toHaveText(t.none);
    const records = await page.locator('[id^="gl-rrm-"]').count();
    await page.locator("#gl-seen-place").selectOption({ label: "Library" });
    await page.locator("#gl-seen-feature").selectOption("ramp");
    await page.locator("#gl-seen-what").selectOption("there");
    for (const id of ["#gl-seen-place", "#gl-seen-feature", "#gl-seen-what", "#gl-seen-date", "#gl-seen-note", "#gl-seen-save"]) {
      const box = await page.locator(id).boundingBox();
      expect(box?.height ?? 0, id).toBeGreaterThanOrEqual(44);
    }
    await page.locator("#gl-seen-save").click();
    await expect(panel.locator("[data-gl-seen-list]").getByRole("status")).toHaveText(t.one);
    await expect(panel.locator('li[data-against="same"][data-seen="there"]')).toContainText(t.same);
    await expect(page.locator("[data-gl-presults] .gl-seen li")).toHaveText(t.card);
    await expect(page.locator("#gl-seen-feature")).toBeFocused();
    await expect(page.locator('[id^="gl-rrm-"]')).toHaveCount(records);
    await page.locator("#gl-seen-place").selectOption({ label: "Town Hall" });
    await page.locator("#gl-seen-feature").selectOption("ramp");
    await page.locator("#gl-seen-what").selectOption("not-there");
    await page.locator("#gl-seen-save").click();
    await expect(panel.locator("[data-gl-seen-list]").getByRole("status")).toHaveText(t.two);
    await expect(panel.locator('ul.gl-seen-list > li[data-against="records-unknown"]')).toContainText(t.unknown);
    await page.locator("#gl-seen-filter").selectOption("records-unknown");
    await expect(panel.locator("ul.gl-seen-list > li")).toHaveCount(1);
    await expect(page.locator("#gl-seen-filter")).toBeFocused();
    await page.locator("#gl-seen-filter").selectOption("all");
    await openAll(page);
    expect(await violations(page)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await page.reload();
    await expect(page.locator("[data-gl-presults] .gl-seen li")).toHaveCount(2);
    if (language === "fr") await page.getByLabel("French", { exact: true }).check();
    await openPanel(page, "details.gl-seen-panel");
    const remove = page.locator('[id^="gl-seen-rm-"]').first();
    expect((await remove.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await remove.click();
    await expect(page.locator("[data-gl-presults] .gl-seen li")).toHaveCount(1);
    await page.getByRole("button", { name: t.undo }).click();
    await expect(page.locator("[data-gl-presults] .gl-seen li")).toHaveCount(2);
  });
}

test("places: what a person saw can be saved as text and as a table of records with their name and an open licence", async ({ page }) => {
  await page.goto("/#places");
  await loadSplit(page, "Load the records");
  await openPanel(page, "details.gl-seen-panel");
  await page.locator("#gl-seen-place").selectOption({ label: "Town Hall" });
  await page.locator("#gl-seen-feature").selectOption("ramp");
  await page.locator("#gl-seen-what").selectOption("there");
  await page.locator("#gl-seen-save").click();
  const panel = page.locator("details.gl-seen-panel");
  const text = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Save what you saw as text" }).click();
  expect((await text).suggestedFilename()).toBe("what-you-saw-en.txt");
  await page.locator("#gl-seen-share").click();
  await expect(panel.locator("#gl-seen-share-errors")).toContainText("Give a name for the source.");
  await expect(page.locator("#gl-seen-name")).toBeFocused();
  await page.locator("#gl-seen-name").fill("Sam Lee");
  await page.locator("#gl-seen-licence").selectOption("CC0-1.0");
  const table = page.waitForEvent("download");
  await page.locator("#gl-seen-share").click();
  const file = await table;
  expect(file.suggestedFilename()).toBe("what-you-saw-records.csv");
  const stream = await file.createReadStream();
  let csv = "";
  for await (const chunk of stream) csv += String(chunk);
  expect(csv).toContain("hall,Town Hall,ramp,present,Sam Lee,CC0-1.0,");
  await expect(panel.locator("[data-gl-seen-share-msg]")).toHaveText("Saved a table with 1 record.");
});

for (const language of ["en", "fr"] as const) {
  test(`places: ${language} sets out a visit step by step and says where the information runs short`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/#places");
    if (language === "fr") await page.getByLabel("French", { exact: true }).check();
    const t =
      language === "fr"
        ? { load: "Charger les fiches", title: "Une visite à Library, étape par étape", status: /UNKNOWN\s: 8 sur 8\.$/, first: /étape\s: Arriver\.$/, disagree: /^Rampe\s: UNKNOWN, car les sources ne concordent pas\.$/, see: "Voir les étapes d’une visite à Town Hall", hall: "Une visite à Town Hall, étape par étape", cell: "1 sur 8 connues" }
        : { load: "Load the records", title: "A visit to Library, step by step", status: /still Unknown: 8 of 8\.$/, first: /this step: Arriving\.$/, disagree: /^Ramp: Unknown, because the sources disagree\.$/, see: "See the steps of a visit to Town Hall", hall: "A visit to Town Hall, step by step", cell: "1 of 8 known" };
    await loadSplit(page, t.load);
    const panel = page.locator("details.gl-steps-panel");
    await openPanel(page, "details.gl-steps-panel");
    await expect(panel.locator("#gl-steps-title")).toHaveCount(0);
    await page.locator("#gl-steps-place").selectOption({ label: "Library" });
    await expect(panel.locator("#gl-steps-title")).toHaveText(t.title);
    await expect(panel.locator("[data-gl-steps-walk]").getByRole("status")).toHaveText(t.status);
    await expect(panel.locator("[data-gl-steps-first]")).toHaveText(t.first);
    await expect(panel.locator("ol.gl-steps > li")).toHaveCount(4);
    await expect(panel.locator('ol.gl-steps li[data-state="disagree"]')).toHaveText(t.disagree);
    await expect(panel.locator('ol.gl-steps li[data-state="available"]')).toHaveCount(0);
    await expect(page.locator("#gl-steps-place")).toBeFocused();
    await expect(panel).not.toContainText(/inconnu/i);
    await expect(panel.locator('[data-steps-list="ask"] li')).toHaveCount(8);
    await expect(panel.locator("table.gl-compare tbody tr")).toHaveCount(2);
    await expect(panel.locator("table.gl-compare tbody tr").first().locator("th")).toHaveText("Town Hall");
    await expect(panel.locator("table.gl-compare tbody tr").first().locator("td").nth(4)).toHaveText(t.cell);
    await page.locator("#gl-steps-sort").selectOption("name");
    await expect(panel.locator("table.gl-compare tbody tr").first().locator("th")).toHaveText("Library");
    await expect(page.locator("#gl-steps-sort")).toBeFocused();
    for (const id of ["#gl-steps-place", "#gl-steps-scope", "#gl-steps-sort", "#gl-steps-see-0"]) {
      const box = await page.locator(id).boundingBox();
      expect(box?.height ?? 0, id).toBeGreaterThanOrEqual(44);
    }
    await panel.getByRole("button", { name: t.see }).click();
    await expect(panel.locator("#gl-steps-title")).toHaveText(t.hall);
    await expect(panel.locator("#gl-steps-title")).toBeFocused();
    await expect(panel.locator('ol.gl-steps li[data-state="available"]')).toHaveCount(1);
    await page.locator("#gl-steps-other").selectOption({ label: "Library" });
    await expect(panel.locator("#gl-steps-compare-title")).toBeVisible();
    await expect(panel.locator("table[data-step]")).toHaveCount(4);
    await expect(panel.locator('tr[data-differs="true"]')).toHaveCount(1);
    await expect(panel.locator('tr[data-differs="true"] strong')).toHaveCount(2);
    await expect(page.locator("#gl-steps-other")).toBeFocused();
    expect((await page.locator("#gl-steps-other").boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await openAll(page);
    expect(await violations(page)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  });
}

test("places: the steps follow must-haves and saved places, and save as text and as a table", async ({ page }) => {
  await page.goto("/#places");
  await loadSplit(page, "Load the records");
  await openPanel(page, "details.gl-steps-panel");
  const panel = page.locator("details.gl-steps-panel");
  await page.locator("#gl-steps-place").selectOption({ label: "Town Hall" });
  await expect(panel.locator('[data-steps-list="must"]')).toHaveCount(0);
  await openPanel(page, "details.gl-must-panel");
  await page.locator("#gl-must-ramp").check();
  await openPanel(page, "details.gl-steps-panel");
  await expect(panel.locator('[data-steps-list="must"] li')).toHaveText("Ramp: Unknown.");
  await page.locator("#gl-steps-scope").selectOption("saved");
  await expect(panel.locator("[data-gl-steps-empty]")).toHaveText("You have no saved places.");
  await page.locator("#gl-steps-scope").selectOption("all");
  const text = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Save these steps as text" }).click();
  expect((await text).suggestedFilename()).toBe("visit-step-by-step-en.txt");
  const table = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Save the table of steps for a spreadsheet" }).click();
  const file = await table;
  expect(file.suggestedFilename()).toBe("visit-steps-by-place-en.csv");
  const stream = await file.createReadStream();
  let csv = "";
  for await (const chunk of stream) csv += String(chunk);
  expect(csv.trimEnd().split("\r\n")).toHaveLength(3);
  expect(csv).toContain("Town Hall,0,0,2,0,0,4,1,0,1,0,0,3,1,0,7");
});

const MAP_DATA = JSON.stringify({
  osm3s: { timestamp_osm_base: "2026-11-01T00:00:00Z" },
  elements: [
    { type: "node", id: 1, timestamp: "2026-10-01T10:00:00Z", tags: { name: "Riverside Library", amenity: "library", "addr:city": "Riverside", ramp: "yes", "toilets:wheelchair": "no" } },
    { type: "node", id: 2, timestamp: "2026-10-01T10:00:00Z", tags: { name: "Corner Shop", shop: "books", automatic_door: "button" } },
    { type: "node", id: 3, timestamp: "2026-10-01T10:00:00Z", tags: { name: "Bench", wheelchair: "yes" } },
  ],
});

for (const language of ["en", "fr"] as const) {
  test(`places: ${language} turns pasted open map data into records with their source, and leaves the general tag out`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/#places");
    if (language === "fr") await page.getByLabel("French", { exact: true }).check();
    const t =
      language === "fr"
        ? { load: "Charger les fiches", check: "Examiner ces données", add: "Ajouter ces fiches aux fiches gardées", status: /Lieux avec des fiches\s: 2\. Fiches créées\s: 3\.$/, general: /wheelchair\s: 1\.$/, undo: /^Annuler\s: charger le tableau$/, empty: "Collez d’abord des données cartographiques." }
        : { load: "Load the records", check: "Check this map data", add: "Add these records to the records held", status: /Places with records: 2\. Records made: 3\.$/, general: /general wheelchair tag: 1\.$/, undo: /^Undo: load table$/, empty: "Paste map data first." };
    await loadSplit(page, t.load);
    const panel = page.locator("details.gl-osm-panel");
    await openPanel(page, "details.gl-osm-panel");
    await panel.getByRole("button", { name: t.check }).click();
    await expect(panel.getByRole("alert")).toHaveText(t.empty);
    const before = await page.locator("[data-gl-presults] h3").count();
    await page.locator("#gl-osm-text").fill(MAP_DATA);
    await panel.getByRole("button", { name: t.check }).click();
    await expect(panel.locator("[data-gl-osm-status]")).toHaveText(t.status);
    await expect(panel.locator("[data-gl-osm-left] li").nth(1)).toHaveText(t.general);
    await expect(panel.locator("table[data-gl-osm-places] tbody tr")).toHaveCount(2);
    await expect(page.locator("[data-gl-presults] h3")).toHaveCount(before);
    for (const id of ["#gl-osm-text", "#gl-osm-check", "#gl-osm-add"]) {
      const box = await page.locator(id).boundingBox();
      expect(box?.height ?? 0, id).toBeGreaterThanOrEqual(44);
    }
    await openAll(page);
    expect(await violations(page)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await openPanel(page, "details.gl-osm-panel");
    await panel.getByRole("button", { name: t.add }).click();
    await expect(page.locator("[data-gl-presults] h3")).toHaveCount(before + 2);
    await expect(page.locator("[data-gl-presults]")).toContainText("Riverside Library");
    await expect(page.locator("[data-gl-presults]")).not.toContainText("Bench");
    await expect(page.locator("#gl-if-kind")).toBeVisible();
    await page.reload();
    await expect(page.locator("[data-gl-presults] h3")).toHaveCount(before + 2);
  });
}

test("places: records made from open map data can be undone and saved as a table", async ({ page }) => {
  await page.goto("/#places");
  await loadSplit(page, "Load the records");
  const before = await page.locator("[data-gl-presults] h3").count();
  await openPanel(page, "details.gl-osm-panel");
  const panel = page.locator("details.gl-osm-panel");
  await page.locator("#gl-osm-text").fill(MAP_DATA);
  await panel.getByRole("button", { name: "Check this map data" }).click();
  const download = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Save these records as a table" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("open-map-records.csv");
  const stream = await file.createReadStream();
  let csv = "";
  for await (const chunk of stream) csv += String(chunk);
  expect(csv).toContain("osm-node-1,Riverside Library,ramp,present,OpenStreetMap contributors,ODbL-1.0,2026-10-01,,https://www.openstreetmap.org/node/1,,");
  expect(csv).not.toContain("Bench");
  await panel.getByRole("button", { name: "Add these records to the records held" }).click();
  await expect(page.locator("[data-gl-presults] h3")).toHaveCount(before + 2);
  await page.getByRole("button", { name: "Undo: load table" }).click();
  await expect(page.locator("[data-gl-presults] h3")).toHaveCount(before);  await openPanel(page, "details.gl-osm-panel");
  await page.locator("#gl-osm-text").fill('<osm version="0.6"><node id="9" timestamp="2026-10-01T10:00:00Z"><tag k="name" v="Fish &amp; Chips"/><tag k="elevator" v="no"/></node></osm>');
  await panel.getByRole("button", { name: "Check this map data" }).click();
  await expect(panel.locator("table[data-gl-osm-places] tbody tr th")).toHaveText("Fish & Chips");
  await expect(panel.locator("table[data-gl-osm-places] tbody tr td")).toHaveText("Elevator: reported as not available.");
});
