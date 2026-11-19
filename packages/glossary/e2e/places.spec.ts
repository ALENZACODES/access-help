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
