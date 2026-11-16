import { readFileSync } from "node:fs";
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

function packBuffer(overrides: (pack: any) => void = () => {}): Buffer {
  const features = [
    feature("s1", "Sample Library", "yes", 43.85, -79.43, daysAgo(10)),
    feature("s2", "Sample Café", "limited", 43.85, -79.42, daysAgo(400)),
    feature("s3", "Sample Arena", "no", 43.7, -79.4, daysAgo(900)),
    feature("s4", "Sample Clinic Annex", undefined, 43.86, -79.44, daysAgo(5), "ODbL-1.0"),
    feature("s5", "Sample Ottawa Hall", "yes", 45.42, -75.69, daysAgo(20)),
  ];
  const pack = {
    manifest: { packId: "sample-pack", generatedOn: daysAgo(1), recordCount: features.length },
    data: { type: "FeatureCollection", features },
  };
  overrides(pack);
  return Buffer.from(JSON.stringify(pack), "utf8");
}

async function axeClean(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

async function expectTargetsAtLeast44(page: Page) {
  const sizes = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>("button, select, input:not([type=checkbox]), nav a, .error-summary a")).map((el) => ({
      label: el.textContent?.trim().slice(0, 30) || el.id || el.tagName,
      height: el.getBoundingClientRect().height,
      width: el.getBoundingClientRect().width,
    })),
  );
  expect(sizes.length).toBeGreaterThan(0);
  for (const size of sizes) {
    expect(size.height, `${size.label} height`).toBeGreaterThanOrEqual(43.5);
    expect(size.width, `${size.label} width`).toBeGreaterThanOrEqual(43.5);
  }
}

test.beforeEach(async ({ page }) => {
  page.on("request", (request) => {
    const { hostname } = new URL(request.url());
    if (hostname !== "127.0.0.1" && hostname !== "localhost") throw new Error(`Unexpected request to ${request.url()}`);
  });
  await page.goto("/places");
  await page.evaluate(() => {
    for (const key of ["the-app-places-pack", "the-app-places-packs", "the-app-place-drafts", "the-app-display-prefs", "the-app-saved-places"]) window.localStorage.removeItem(key);
  });
  await page.reload();
});

async function loadPack(page: Page, buffer = packBuffer()) {
  await page.getByLabel("Pack file (.json)").setInputFiles({ name: "sample-pack.json", mimeType: "application/json", buffer });
  await expect(page.getByText("Pack sample-pack loaded and saved on this device. 5 places.")).toBeVisible();
}

test("Places opens from the primary navigation and says there are no places until a pack is loaded", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Places" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Places on this device" })).toBeVisible();
  await expect(page.getByText("The App ships with no places.")).toBeVisible();
  await expect(page.getByText("No pack is loaded.")).toBeVisible();
  await expect(page.getByRole("searchbox")).toHaveCount(0);
  await axeClean(page);
  await expectTargetsAtLeast44(page);
});

test("a loaded pack lists places with source, licence, and date, and keeps UNKNOWN visible", async ({ page }) => {
  await loadPack(page);
  await expect(page.locator(".places-count")).toHaveText("5 places match.");
  const library = page.getByRole("listitem").filter({ hasText: "Sample Library" });
  await expect(library).toContainText("step-free access reported");
  await expect(library).toContainText("Source: sample data for tests. Licence: CC0-1.0.");
  await expect(page.getByRole("listitem").filter({ hasText: "Sample Clinic Annex" })).toContainText("UNKNOWN (not observed yet)");
  await expect(page.getByText("has not checked any of these places on site")).toBeVisible();
  await axeClean(page);
  await expectTargetsAtLeast44(page);
});

test("a step-free filter never counts UNKNOWN as a match and lists it separately", async ({ page }) => {
  await loadPack(page);
  await page.getByLabel("Show", { exact: true }).selectOption("yes");
  await expect(page.locator(".places-count")).toHaveText("2 places match.");
  await expect(page.getByRole("heading", { name: "Not recorded (1)" })).toBeVisible();
  await expect(page.getByText("their status is UNKNOWN. They are not counted as matches.")).toBeVisible();
  await expect(page.getByText("2 other places match your search but have a recorded status that does not fit this filter.")).toBeVisible();
  const matched = page.locator("section[aria-labelledby=places-search] .place-list").first();
  await expect(matched.getByText("Sample Clinic Annex")).toHaveCount(0);
  await expect(page.locator("section[aria-labelledby=places-search] .place-list").nth(1).getByRole("heading", { name: "Sample Clinic Annex" })).toBeVisible();
  await axeClean(page);
});

test("search ignores accents and the age filter hides older observations", async ({ page }) => {
  await loadPack(page);
  await page.getByRole("searchbox", { name: "Place name or source" }).fill("cafe");
  await expect(page.locator(".places-count")).toHaveText("1 place matches.");
  await page.getByRole("searchbox", { name: "Place name or source" }).fill("");
  await page.getByLabel("Observed", { exact: true }).selectOption("365");
  await expect(page.locator(".places-count")).toHaveText("3 places match.");
  await page.getByLabel("Observed", { exact: true }).selectOption("730");
  await expect(page.locator(".places-count")).toHaveText("4 places match.");
});

test("sorting by distance uses the location once and shows straight-line distance", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 45.4, longitude: -75.7 });
  await loadPack(page);
  await page.getByRole("button", { name: "Sort by distance from me" }).click();
  const first = page.locator("section[aria-labelledby=places-search] .place-list").first().getByRole("listitem").first();
  await expect(first).toContainText("Sample Ottawa Hall");
  await expect(first).toContainText("km in a straight line");
});

test("a refused location leaves places sorted by name and says so", async ({ page, context }) => {
  await context.clearPermissions();
  await loadPack(page);
  await page.evaluate(() => {
    navigator.geolocation.getCurrentPosition = (_ok, fail) => fail?.({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError);
  });
  await page.getByRole("button", { name: "Sort by distance from me" }).click();
  await expect(page.getByText("Location was not shared, so places stay sorted by name.")).toBeVisible();
});

test("a bad file is refused with a reason, and nothing is saved", async ({ page }) => {
  await page.getByLabel("Pack file (.json)").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from("{nope") });
  await expect(page.getByRole("alert").filter({ hasText: "The file was not loaded. The file is not valid JSON." })).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem("the-app-places-packs"))).toBeNull();
  await page.getByLabel("Pack file (.json)").setInputFiles({
    name: "short.json",
    mimeType: "application/json",
    buffer: packBuffer((p) => { p.manifest.recordCount = 9; }),
  });
  await expect(page.getByRole("alert")).toContainText("does not match the places in it");
});

test("an unrecognised status is shown as UNKNOWN with a note", async ({ page }) => {
  await page.getByLabel("Pack file (.json)").setInputFiles({
    name: "odd.json",
    mimeType: "application/json",
    buffer: packBuffer((p) => { p.data.features[0].properties.wheelchair = "definitely"; }),
  });
  await expect(page.getByText("Place s1: its status was not one the App recognises, so it is shown as UNKNOWN.")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Sample Library" })).toContainText("UNKNOWN (not observed yet)");
});

test("the saved pack survives a reload and is readable offline, and can be removed", async ({ page, context }) => {
  await loadPack(page);
  await page.reload();
  await expect(page.locator(".places-count")).toHaveText("5 places match.");
  await context.setOffline(true);
  await page.getByRole("navigation", { name: "Places" }).getByRole("link", { name: "How to read the data" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "How to read the data" })).toBeVisible();
  await expect(page.getByText("sample-pack", { exact: true })).toBeVisible();
  await context.setOffline(false);
  await page.getByRole("navigation", { name: "Places" }).getByRole("link", { name: "Places", exact: true }).click();
  await page.getByRole("button", { name: "Remove pack sample-pack" }).click();
  await expect(page.getByText("Pack sample-pack was removed from this device.")).toBeVisible();
  await expect(page.getByText("No pack is loaded.")).toBeVisible();
});

test("the data page explains the labels, the age of records, and what the data does not say", async ({ page }) => {
  await loadPack(page);
  await page.getByRole("navigation", { name: "Places" }).getByRole("link", { name: "How to read the data" }).click();
  await expect(page.getByRole("heading", { name: "What the labels mean" })).toBeVisible();
  await expect(page.getByText(/UNKNOWN: nobody has recorded this/)).toBeVisible();
  await expect(page.getByText("Step-free access reported: 2")).toBeVisible();
  await expect(page.getByText("UNKNOWN: 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Within the last year: 3")).toBeVisible();
  await expect(page.getByText("Older than a year, may be out of date: 2")).toBeVisible();
  await expect(page.getByText("It does not show live status such as a lift out of service.")).toBeVisible();
  await expect(page.getByText("It gives no medical advice and no decision about benefits or eligibility.")).toBeVisible();
  await axeClean(page);
  await expectTargetsAtLeast44(page);
});

test("French shows the same screens with French punctuation and a decimal comma", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 45.4, longitude: -75.7 });
  await page.getByRole("button", { name: "Français" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Lieux sur cet appareil" })).toBeVisible();
  await page.getByLabel("Fichier de paquet (.json)").setInputFiles({ name: "sample-pack.json", mimeType: "application/json", buffer: packBuffer() });
  await expect(page.getByText("Paquet sample-pack chargé et enregistré sur cet appareil. 5 lieux.")).toBeVisible();
  await expect(page.locator(".places-count")).toHaveText("5 lieux correspondent.");
  await expect(page.getByRole("listitem").filter({ hasText: "Sample Clinic Annex" })).toContainText("UNKNOWN (pas encore observé)");
  await expect(page.getByRole("listitem").filter({ hasText: "Sample Library" })).toContainText("Source : sample data for tests.");
  await page.getByRole("button", { name: "Trier par distance depuis moi" }).click();
  await expect(page.locator("section[aria-labelledby=places-search] .place-list").first()).toContainText(/\d+,\d km en ligne droite/);
  await axeClean(page);
});

test("an observation needs a source, a licence, a real date, and a confirmation, and focus moves to the errors", async ({ page }) => {
  await page.goto("/places/contribute");
  await page.getByRole("button", { name: "Save observation on this device" }).click();
  const summary = page.getByRole("alert").filter({ hasText: "fields need attention" });
  await expect(summary).toBeFocused();
  await expect(summary).toContainText("Enter a latitude between -90 and 90.");
  await expect(summary).toContainText("Enter a source.");
  await expect(summary).toContainText("Tick the box to confirm.");
  await expect(page.getByLabel("Latitude")).toHaveAttribute("aria-invalid", "true");
  await axeClean(page);
  await expectTargetsAtLeast44(page);
});

test("a saved observation can be exported as files a person submits themselves, and UNKNOWN stays UNKNOWN", async ({ page }) => {
  await page.goto("/places/contribute");
  await expect(page.getByLabel("Step-free access")).toHaveValue("UNKNOWN");
  await page.getByLabel("Place name (optional)").fill("Sample Hall");
  await page.getByLabel("Latitude").fill("43,8561");
  await page.getByLabel("Longitude").fill("-79.3370");
  await page.getByLabel("Source", { exact: true }).fill("my own visit");
  await page.getByLabel("I saw this myself and I release it under the licence chosen above.").check();
  await page.getByRole("button", { name: "Save observation on this device" }).click();
  await expect(page.getByText("Observation saved on this device.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your observations on this device (1)" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Sample Hall" })).toContainText("UNKNOWN · CC0-1.0");
  await expect(page.getByText("You submit the files to OpenStreetMap yourself.")).toBeVisible();

  const osc = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download editing file (.osc)" }).click();
  const oscFile = await osc;
  expect(oscFile.suggestedFilename()).toMatch(/^observations-\d{4}-\d{2}-\d{2}\.osc$/);
  const xml = readFileSync((await oscFile.path()) as string, "utf8");
  expect(xml).toContain("licence CC0-1.0");
  expect(xml).toContain('k="source" v="my own visit"');
  expect(xml).not.toContain('k="wheelchair"');

  const pack = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download pack file (.json)" }).click();
  const packFile = await pack;
  const packPath = (await packFile.path()) as string;
  await page.goto("/places");
  await page.getByLabel("Pack file (.json)").setInputFiles(packPath);
  await expect(page.getByText("Pack my-observations loaded and saved on this device. 1 places.")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Sample Hall" })).toContainText("UNKNOWN (not observed yet)");
});

test("a saved observation can be removed", async ({ page }) => {
  await page.goto("/places/contribute");
  await page.getByLabel("Latitude").fill("43.85");
  await page.getByLabel("Longitude").fill("-79.33");
  await page.getByLabel("Step-free access").selectOption("yes");
  await page.getByLabel("Source", { exact: true }).fill("my own visit");
  await page.getByLabel("I saw this myself and I release it under the licence chosen above.").check();
  await page.getByRole("button", { name: "Save observation on this device" }).click();
  await page.getByRole("button", { name: "Remove this place" }).click();
  await expect(page.getByText("You have not saved any observations yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Download editing file (.osc)" })).toHaveCount(0);
});
