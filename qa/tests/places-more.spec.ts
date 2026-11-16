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

function packBuffer(packId = "sample-pack", mutate: (pack: any) => void = () => {}): Buffer {
  const features = [
    feature("s1", "Sample Library", "yes", 43.85, -79.43, daysAgo(10)),
    feature("s2", "Sample Café", "limited", 43.85, -79.42, daysAgo(400)),
    feature("s3", "Sample Arena", "no", 43.7, -79.4, daysAgo(900)),
    feature("s4", "Sample Clinic Annex", undefined, 43.86, -79.44, daysAgo(5), "ODbL-1.0"),
    feature("s5", "Sample Ottawa Hall", "yes", 45.42, -75.69, daysAgo(20)),
  ];
  const pack = { manifest: { packId, generatedOn: daysAgo(1), recordCount: features.length }, data: { type: "FeatureCollection", features } };
  mutate(pack);
  pack.manifest.recordCount = pack.data.features.length;
  return Buffer.from(JSON.stringify(pack), "utf8");
}

async function axeClean(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

async function loadPack(page: Page, buffer: Buffer, label = "Pack file (.json)") {
  await page.getByLabel(label).setInputFiles({ name: "pack.json", mimeType: "application/json", buffer });
}

test.beforeEach(async ({ page }) => {
  page.on("request", (request) => {
    const { hostname } = new URL(request.url());
    if (hostname !== "127.0.0.1" && hostname !== "localhost") throw new Error(`Unexpected request to ${request.url()}`);
  });
  await page.goto("/places");
  await page.evaluate(() => {
    for (const key of ["the-app-places-pack", "the-app-places-packs", "the-app-place-drafts", "the-app-display-prefs"]) window.localStorage.removeItem(key);
  });
  await page.reload();
});

test.describe("several packs", () => {
  test("two packs that disagree show UNKNOWN, keep both reports, and a pack can be removed on its own", async ({ page }) => {
    await loadPack(page, packBuffer("pack-a"));
    await expect(page.getByText("Pack pack-a loaded and saved on this device. 5 places.")).toBeVisible();
    await loadPack(page, packBuffer("pack-b", (p) => { p.data.features[0].properties.wheelchair = "no"; }));
    await expect(page.getByRole("heading", { name: "Loaded packs (2)" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Places where packs disagree (1)" })).toBeVisible();
    await expect(page.getByText("the App shows UNKNOWN. It does not pick one.")).toBeVisible();
    await expect(page.getByText("Pack pack-a says Step-free access reported, observed")).toBeVisible();
    await expect(page.getByText("Pack pack-b says No step-free access reported, observed")).toBeVisible();
    await expect(page.locator(".places-count")).toHaveText("5 places match.");
    const library = page.locator("section[aria-labelledby=places-search] .place-list li").filter({ hasText: "Sample Library" });
    await expect(library).toContainText("Packs give different statuses for this place. Shown as UNKNOWN.");

    await page.getByLabel("Show", { exact: true }).selectOption("yes");
    await expect(page.locator(".places-count")).toHaveText("1 place matches.");
    await expect(page.getByRole("heading", { name: "Not recorded (2)" })).toBeVisible();
    await axeClean(page);

    await page.getByRole("button", { name: "Remove pack pack-b" }).click();
    await expect(page.getByText("Pack pack-b was removed from this device.")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Places where packs disagree/ })).toHaveCount(0);
    await expect(page.locator(".places-count")).toHaveText("2 places match.");
  });

  test("a pack with UNKNOWN does not erase a recorded status from another pack", async ({ page }) => {
    await loadPack(page, packBuffer("pack-a"));
    await loadPack(page, packBuffer("pack-b", (p) => { p.data.features[0].properties.wheelchair = "UNKNOWN"; }));
    await expect(page.getByRole("heading", { name: /Places where packs disagree/ })).toHaveCount(0);
    await expect(page.locator("section[aria-labelledby=places-search] .place-list li").filter({ hasText: "Sample Library" })).toContainText("step-free access reported");
  });

  test("the same pack id replaces the earlier pack, and the ninth pack is refused", async ({ page }) => {
    await loadPack(page, packBuffer("same"));
    await loadPack(page, packBuffer("same", (p) => { p.data.features.pop(); }));
    await expect(page.getByRole("heading", { name: "Loaded packs (1)" })).toBeVisible();
    await expect(page.getByText("4 places, data as of")).toBeVisible();
    for (let i = 1; i < 8; i += 1) await loadPack(page, packBuffer(`extra-${i}`));
    await expect(page.getByRole("heading", { name: "Loaded packs (8)" })).toBeVisible();
    await loadPack(page, packBuffer("one-too-many"));
    await expect(page.getByRole("alert")).toContainText("This device keeps up to 8 packs. Remove one first.");
    await expect(page.getByRole("heading", { name: "Loaded packs (8)" })).toBeVisible();
  });

  test("a pack saved by the first version still opens", async ({ page }) => {
    const text = packBuffer("old-pack").toString("utf8");
    await page.evaluate((value) => window.localStorage.setItem("the-app-places-pack", value), text);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Loaded packs (1)" })).toBeVisible();
    await expect(page.locator(".places-count")).toHaveText("5 places match.");
  });
});

test.describe("CSV and plot", () => {
  test("the CSV lists what is on screen with source, licence, date, UNKNOWN, and safe cells", async ({ page }) => {
    await loadPack(page, packBuffer("csv-pack", (p) => { p.data.features[1].properties.name = "=HYPERLINK(\"x\")"; }));
    await page.getByLabel("Show", { exact: true }).selectOption("yes-or-limited");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download these results (.csv)" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^places-\d{4}-\d{2}-\d{2}\.csv$/);
    const text = readFileSync((await file.path()) as string, "utf8");
    expect(text.charCodeAt(0)).toBe(0xfeff);
    const lines = text.slice(1).split("\r\n");
    expect(lines[0]).toBe("id,name,status,latitude,longitude,source,licence,observed_on,note");
    expect(lines.filter(Boolean)).toHaveLength(5);
    expect(text).toContain("s4,Sample Clinic Annex,UNKNOWN,43.86,-79.44,sample data for tests,ODbL-1.0,");
    expect(text).toContain("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(text).not.toContain("s3,");
    await expect(page.getByText("UNKNOWN stays UNKNOWN.")).toBeVisible();
  });

  test("the plot gives every place a 44 pixel button with a name, uses shapes, and shows details on selection", async ({ page }) => {
    await loadPack(page, packBuffer());
    await page.getByRole("button", { name: "Plot", exact: true }).click();
    await expect(page.getByRole("group", { name: "Plot of places, without a base map" })).toBeVisible();
    const points = page.locator(".plot-point");
    await expect(points).toHaveCount(5);
    for (const box of await points.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()))) {
      expect(box.width).toBeGreaterThanOrEqual(43.5);
      expect(box.height).toBeGreaterThanOrEqual(43.5);
    }
    await expect(page.getByRole("button", { name: "Sample Clinic Annex, UNKNOWN" })).toBeVisible();
    await expect(page.getByText("Circle: step-free access reported.")).toBeVisible();
    await expect(page.getByText("There is no base map.")).toBeVisible();
    await expect(page.locator(".shape-UNKNOWN")).toHaveCount(1);
    const library = page.getByRole("button", { name: "Sample Library, Step-free access reported" });
    await library.focus();
    await page.keyboard.press("Enter");
    await expect(library).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("region", { name: "Sample Library" })).toContainText("Source: sample data for tests. Licence: CC0-1.0.");
    await axeClean(page);
  });

  test("the plot works in French and says a conflict is UNKNOWN", async ({ page }) => {
    await page.getByRole("button", { name: "Français" }).click();
    await loadPack(page, packBuffer("a"), "Fichier de paquet (.json)");
    await loadPack(page, packBuffer("b", (p) => { p.data.features[0].properties.wheelchair = "no"; }), "Fichier de paquet (.json)");
    await page.getByRole("button", { name: "Nuage de points" }).click();
    await expect(page.getByRole("group", { name: "Nuage de points des lieux, sans fond de carte" })).toBeVisible();
    await page.getByRole("button", { name: "Sample Library, UNKNOWN" }).click();
    await expect(page.getByRole("region", { name: "Sample Library" })).toContainText("Les paquets donnent des statuts différents pour ce lieu. Affiché comme UNKNOWN.");
    await expect(page.getByText(/Barre d’échelle : /)).toBeVisible();
    await axeClean(page);
  });
});

test.describe("settings", () => {
  test("text size, contrast, and spacing apply at once, persist across a reload, and can be reset", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
    const fontSize = () => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    const before = await fontSize();
    await page.getByLabel("Larger", { exact: true }).check();
    expect(await fontSize()).toBeGreaterThan(before * 1.4);
    await page.getByLabel(/^High contrast/).check();
    await page.getByLabel(/^Wide/).check();
    await expect(page.getByText("Display settings saved on this device.")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(0, 0, 0)");
    expect(await page.evaluate(() => getComputedStyle(document.body).letterSpacing)).not.toBe("normal");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-text-size", "larger");
    await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
    await page.getByRole("button", { name: "Reset display settings" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-contrast", "standard");
    expect(await fontSize()).toBeCloseTo(before, 0);
  });

  test("every places screen passes axe in high contrast with wide spacing and larger text", async ({ page }) => {
    await page.goto("/settings");
    await page.getByLabel("Larger", { exact: true }).check();
    await page.getByLabel(/^High contrast/).check();
    await page.getByLabel(/^Wide/).check();
    await axeClean(page);
    await page.goto("/places");
    await loadPack(page, packBuffer("a"));
    await loadPack(page, packBuffer("b", (p) => { p.data.features[0].properties.wheelchair = "no"; }));
    await axeClean(page);
    await page.getByRole("button", { name: "Plot", exact: true }).click();
    await page.getByRole("button", { name: "Sample Library, UNKNOWN" }).click();
    await axeClean(page);
    await page.goto("/places/status");
    await axeClean(page);
    await page.goto("/places/contribute");
    await page.getByRole("button", { name: "Save observation on this device" }).click();
    await axeClean(page);
  });

  test("French settings use French labels and keep the saved choice", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: "Français" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Réglages" })).toBeVisible();
    await page.getByLabel(/^Contraste élevé/).check();
    await expect(page.getByText("Réglages d’affichage enregistrés sur cet appareil.")).toBeVisible();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
    await axeClean(page);
  });

  test("offline readiness writes out each state in words, and reacts to going offline", async ({ page, context }) => {
    await page.goto("/settings");
    const panel = page.getByRole("region", { name: "Offline readiness" });
    await expect(panel.getByText("Connection", { exact: true })).toBeVisible();
    await expect(panel.locator("dd").first()).toContainText("Ready: Connected.");
    const states = await panel.locator("dd").allTextContents();
    expect(states).toHaveLength(5);
    for (const text of states) expect(text).toMatch(/^(Ready|Needs attention|UNKNOWN)/);
    await expect(panel.locator("dd").nth(2)).toContainText("Needs attention: No pack is saved yet.");
    await context.setOffline(true);
    await expect(panel.locator("dd").first()).toContainText("Needs attention: Offline now.");
    await context.setOffline(false);
    await panel.getByRole("button", { name: "Check again" }).click();
    await expect(panel.locator("dd").first()).toContainText("Ready: Connected.");
    await axeClean(page);
  });

  test("removing all places data asks first, keeps focus on the safe choice, and then clears packs and observations", async ({ page }) => {
    await page.goto("/places");
    await loadPack(page, packBuffer("gone"));
    await page.evaluate(() => window.localStorage.setItem("the-app-place-drafts", "[]"));
    await page.goto("/settings");
    await page.getByRole("button", { name: "Remove all places data from this device" }).click();
    await expect(page.getByRole("button", { name: "Keep my data" })).toBeFocused();
    await page.getByRole("button", { name: "Keep my data" }).click();
    await expect(page.getByText("Nothing was removed.")).toBeVisible();
    expect(await page.evaluate(() => window.localStorage.getItem("the-app-places-packs"))).not.toBeNull();
    await page.getByRole("button", { name: "Remove all places data from this device" }).click();
    await page.getByRole("button", { name: "Yes, remove it all" }).click();
    await expect(page.getByText("All places data was removed from this device.")).toBeVisible();
    expect(await page.evaluate(() => [window.localStorage.getItem("the-app-places-packs"), window.localStorage.getItem("the-app-place-drafts")])).toEqual([null, null]);
  });
});
