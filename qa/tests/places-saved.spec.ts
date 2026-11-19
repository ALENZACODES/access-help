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
  const packs = () => page.evaluate(() => window.localStorage.getItem("the-app-places-packs"));
  const before = await packs();
  await page.getByLabel(label).setInputFiles({ name: "pack.json", mimeType: "application/json", buffer });
  // The file is read and saved asynchronously. Wait for the save so a later navigation cannot cut it off.
  await expect.poll(packs).not.toBe(before);
}

async function openDetail(page: Page, name: string) {
  await page.getByRole("link", { name: `Details for ${name}` }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  page.on("request", (request) => {
    const { hostname, protocol } = new URL(request.url());
    if (protocol === "geo:") return;
    if (hostname !== "127.0.0.1" && hostname !== "localhost") throw new Error(`Unexpected request to ${request.url()}`);
  });
  await page.goto("/places");
  await page.evaluate(() => {
    for (const key of ["the-app-places-pack", "the-app-places-packs", "the-app-place-drafts", "the-app-display-prefs", "the-app-saved-places", "the-app-search-presets"]) window.localStorage.removeItem(key);
  });
  await page.reload();
  await loadPack(page, packBuffer());
});

test.describe("place details", () => {
  test("shows what the pack says, where it is from, and a geo link with no map page", async ({ page }) => {
    await openDetail(page, "Sample Library");
    await expect(page.getByRole("heading", { name: "What the packs say" })).toBeVisible();
    await expect(page.getByRole("region", { name: "What the packs say" }).getByText("Step-free access reported.", { exact: true })).toBeVisible();
    await expect(page.getByText("The observation is from the last year.")).toBeVisible();
    await expect(page.getByText(/Pack sample-pack: Step-free access reported\. Observed .*Source: sample data for tests\. Licence: CC0-1\.0\./)).toBeVisible();
    await expect(page.getByRole("region", { name: "Location" }).getByText("Coordinates: 43.85000, -79.43000")).toBeVisible();
    const link = page.getByRole("link", { name: "Open these coordinates in a maps app on this device" });
    await expect(link).toHaveAttribute("href", "geo:43.85000,-79.43000");
    await expect(page.getByRole("textbox", { name: "Summary you can copy" })).toHaveValue(/Place: Sample Library\nAccess status: Step-free access reported/);
    await axeClean(page);
  });

  test("says UNKNOWN for a place with no recorded status, and for an id no pack has", async ({ page }) => {
    await openDetail(page, "Sample Clinic Annex");
    await expect(page.getByRole("region", { name: "What the packs say" }).getByText("UNKNOWN.", { exact: true })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Summary you can copy" })).toHaveValue(/UNKNOWN means no loaded pack records a status/);
    await page.goto("/places/not-a-real-place");
    await expect(page.getByRole("status").filter({ hasText: "Its status is UNKNOWN." })).toBeVisible();
    await expect(page.getByText("This place is not in any pack loaded on this device.")).toBeVisible();
  });

  test("shows UNKNOWN and both reports when two packs disagree", async ({ page }) => {
    await loadPack(page, packBuffer("pack-b", (p) => { p.data.features[0].properties.wheelchair = "no"; }));
    await openDetail(page, "Sample Library");
    await expect(page.getByText("Packs give different statuses for this place. Shown as UNKNOWN.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Reports (2)" })).toBeVisible();
    await expect(page.getByText(/Pack pack-b: No step-free access reported/)).toBeVisible();
    await expect(page.getByText("Packs disagree about this place, so its status is UNKNOWN.")).toBeVisible();
  });

  test("starts the contribute form with the place's location, and nothing else", async ({ page }) => {
    await openDetail(page, "Sample Library");
    await page.getByRole("link", { name: "Record your own observation of this place" }).click();
    await expect(page.getByLabel(/^Latitude/)).toHaveValue("43.85");
    await expect(page.getByLabel(/^Longitude/)).toHaveValue("-79.43");
    await expect(page.getByLabel(/^Place name/)).toHaveValue("Sample Library");
    await expect(page.getByLabel(/^Step-free access/)).toHaveValue("UNKNOWN");
    await expect(page.getByRole("checkbox")).not.toBeChecked();
  });

  test("is in French with a decimal comma, and axe is clean", async ({ page }) => {
    await page.getByRole("button", { name: "Français" }).click();
    await page.getByRole("link", { name: "Détails de Sample Library" }).click();
    await expect(page.getByRole("region", { name: "Emplacement" }).getByText("Coordonnées\u00a0: 43,85000\u202f; -79,43000")).toBeVisible();
    await expect(page.getByText("L’observation date de moins d’un an.")).toBeVisible();
    await axeClean(page);
  });
});

test.describe("saved places", () => {
  test("saves from the detail page, keeps a note across a reload, and removes", async ({ page }) => {
    await openDetail(page, "Sample Library");
    await page.getByRole("button", { name: "Save this place" }).click();
    await expect(page.getByText("Saved on this device.")).toBeVisible();
    await page.getByRole("navigation", { name: "Places" }).getByRole("link", { name: "Saved" }).click();
    await expect(page.getByRole("heading", { name: "Saved places (1)" })).toBeVisible();
    await expect(page.getByText("step-free access reported", { exact: false }).first()).toBeVisible();
    await page.getByLabel(/^Your note about Sample Library/).fill("side door,\nask first");
    await page.getByRole("button", { name: "Save note for Sample Library" }).click();
    await expect(page.getByText("Note saved.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel(/^Your note about Sample Library/)).toHaveValue("side door, ask first");
    await axeClean(page);
    await page.getByRole("button", { name: "Remove Sample Library from saved places" }).click();
    await expect(page.getByText("Sample Library was removed from saved places.")).toBeVisible();
    await expect(page.getByText("You have not saved a place yet.")).toBeVisible();
  });

  test("reads UNKNOWN for a saved place once its pack is removed, and never keeps the old status", async ({ page }) => {
    await openDetail(page, "Sample Library");
    await page.getByRole("button", { name: "Save this place" }).click();
    expect(await page.evaluate(() => window.localStorage.getItem("the-app-saved-places"))).not.toMatch(/wheelchair|step-free|"yes"/);
    await page.goto("/places");
    await page.getByRole("button", { name: "Remove pack sample-pack" }).click();
    await page.getByRole("navigation", { name: "Places" }).getByRole("link", { name: "Saved" }).click();
    await expect(page.getByRole("heading", { name: "Sample Library" })).toBeVisible();
    await expect(page.getByText("This place is in no pack loaded now. Status: UNKNOWN.")).toBeVisible();
  });
});

test.describe("visit plan", () => {
  async function saveTwo(page: Page) {
    for (const name of ["Sample Library", "Sample Arena"]) {
      await page.goto("/places");
      await openDetail(page, name);
      await page.getByRole("button", { name: "Save this place" }).click();
    }
  }

  test("builds questions for the chosen places, flags old records, and says UNKNOWN where it is", async ({ page, context }) => {
    await saveTwo(page);
    await page.goto("/places/plan");
    await expect(page.getByRole("heading", { level: 3, name: "Sample Library" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Sample Arena" })).toBeVisible();
    await expect(page.getByText("Is there a step-free route from the street to the main entrance?")).toHaveCount(2);
    await expect(page.getByText("The record is older than a year, or its date is UNKNOWN.")).toHaveCount(1);
    await page.getByLabel("Sample Arena", { exact: true }).uncheck();
    await expect(page.getByRole("heading", { level: 3, name: "Sample Arena" })).toHaveCount(0);
    await page.getByLabel("Sample Library", { exact: true }).uncheck();
    await expect(page.getByText("Choose at least one place to see its questions.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Print this plan" })).toBeDisabled();
    await page.getByLabel("Sample Library", { exact: true }).check();
    await axeClean(page);

    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy the plan as text" }).click();
    await expect(page.getByText("Plan copied.")).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain("Visit plan");
    expect(copied).toContain("Sample Library");
    expect(copied).toContain("8. When was each of these last looked at by someone on site?");
    expect(copied).not.toContain("Sample Arena");
  });

  test("prints only the plan", async ({ page }) => {
    await saveTwo(page);
    await page.goto("/places/plan");
    await page.evaluate(() => { (window as any).__printed = 0; window.print = () => { (window as any).__printed += 1; }; });
    await page.getByRole("button", { name: "Print this plan" }).click();
    expect(await page.evaluate(() => (window as any).__printed)).toBe(1);
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".places-nav")).toBeHidden();
    await expect(page.getByRole("button", { name: "Print this plan" })).toBeHidden();
    await expect(page.getByRole("heading", { level: 3, name: "Sample Library" })).toBeVisible();
  });

  test("with nothing saved, says to save a place first", async ({ page }) => {
    await page.goto("/places/plan");
    await expect(page.getByText("Save a place first.")).toBeVisible();
  });

  test("works in French, with French question marks", async ({ page }) => {
    await saveTwo(page);
    await page.goto("/places/plan");
    await page.getByRole("button", { name: "Français" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Plan de visite" })).toBeVisible();
    await expect(page.getByText("Y a-t-il un trajet de plain-pied entre la rue et l’entrée principale ?").first()).toBeVisible();
    await axeClean(page);
  });
});

test.describe("sources and licences", () => {
  test("lists the packs, licences, and sources with counts, and copies the attribution text", async ({ page, context }) => {
    await page.getByRole("navigation", { name: "Places" }).getByRole("link", { name: "Sources and licences" }).click();
    await expect(page.getByRole("heading", { name: "Packs (1)" })).toBeVisible();
    await expect(page.getByText("CC0-1.0: 3 places")).toBeVisible();
    await expect(page.getByText("ODbL-1.0: 1 places")).toBeVisible();
    await expect(page.getByText("sample data for tests: 4 places")).toBeVisible();
    await expect(page.getByText("Places under ODbL-1.0: 1.")).toBeVisible();
    await expect(page.getByText("Read the full licence text before you share.")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Attribution text" })).toHaveValue(/Licences: CC0-1\.0, ODbL-1\.0\. Sources: sample data for tests\./);
    await axeClean(page);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy the attribution text" }).click();
    await expect(page.getByText("Attribution text copied.")).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("Licences: CC0-1.0, ODbL-1.0.");
  });

  test("says there is nothing to list when no pack is loaded, and is in French", async ({ page }) => {
    await page.getByRole("button", { name: "Remove pack sample-pack" }).click();
    await page.goto("/places/sources");
    await expect(page.getByText("No pack is loaded, so there are no sources to list.")).toBeVisible();
    await page.getByRole("button", { name: "Français" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Sources et licences" })).toBeVisible();
    await axeClean(page);
  });
});

test.describe("backup and restore", () => {
  test("saves a backup, clears the device, restores it, and keeps data the file did not hold", async ({ page }) => {
    await openDetail(page, "Sample Library");
    await page.getByRole("button", { name: "Save this place" }).click();
    await page.goto("/settings");
    await page.getByLabel("Larger", { exact: true }).check();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save a backup file (.json)" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^the-app-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const text = readFileSync((await file.path()) as string, "utf8");
    const parsed = JSON.parse(text);
    expect(parsed).toMatchObject({ app: "the-app-device-backup", v: 1 });
    expect(parsed.packs).toHaveLength(1);
    expect(parsed.saved).toHaveLength(1);
    expect(parsed.prefs.textSize).toBe("larger");

    await page.getByRole("button", { name: "Remove all places data from this device" }).click();
    await page.getByRole("button", { name: "Yes, remove it all" }).click();
    expect(await page.evaluate(() => window.localStorage.getItem("the-app-saved-places"))).toBeNull();
    await page.getByRole("button", { name: "Reset display settings" }).click();

    await page.getByLabel("Restore from a backup file (.json)").setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(text, "utf8") });
    await expect(page.getByText("Backup restored. Packs added: 1. Observations added: 0. Saved places added: 1. Saved searches added: 0. Display settings: restored.")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-text-size", "larger");
    await page.goto("/places/saved");
    await expect(page.getByRole("heading", { name: "Saved places (1)" })).toBeVisible();
    await page.goto("/places");
    await expect(page.getByRole("heading", { name: "Loaded packs (1)" })).toBeVisible();
  });

  test("refuses a file that is not a backup, and changes nothing", async ({ page }) => {
    await page.goto("/settings");
    for (const [content, message] of [
      ["{nope", "The file is not valid JSON."],
      [JSON.stringify({ app: "other", v: 1 }), "The file is not a backup file from the App."],
      [JSON.stringify({ app: "the-app-device-backup", v: 9 }), "The backup file is from a version this App does not read."],
      [JSON.stringify({ app: "the-app-device-backup", v: 1, packs: [], drafts: [], saved: [], prefs: null }), "The backup file has nothing in it that can be restored."],
    ] as const) {
      await page.getByLabel("Restore from a backup file (.json)").setInputFiles({ name: "b.json", mimeType: "application/json", buffer: Buffer.from(content, "utf8") });
      await expect(page.getByRole("alert").filter({ hasText: "The backup was not restored." })).toContainText(message);
    }
    expect(await page.evaluate(() => window.localStorage.getItem("the-app-saved-places"))).toBeNull();
  });

  test("a restored pack with a made-up status shows UNKNOWN", async ({ page }) => {
    await page.getByRole("button", { name: "Remove pack sample-pack" }).click();
    await page.goto("/settings");
    const inner = JSON.parse(packBuffer("restored", (p) => { p.data.features[0].properties.wheelchair = "fully accessible"; }).toString("utf8"));
    const backup = { app: "the-app-device-backup", v: 1, createdOn: daysAgo(0), packs: [JSON.stringify(inner)], drafts: [], saved: [], prefs: null };
    await page.getByLabel("Restore from a backup file (.json)").setInputFiles({ name: "b.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup), "utf8") });
    await expect(page.getByText(/^Backup restored\. Packs added: 1\./)).toBeVisible();
    await page.goto("/places/s1");
    await expect(page.getByRole("region", { name: "What the packs say" }).getByText("UNKNOWN.", { exact: true })).toBeVisible();
  });

  test("the settings screen is in French and passes axe", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: "Français" }).click();
    await expect(page.getByRole("heading", { name: "Copie de sauvegarde" })).toBeVisible();
    await page.getByLabel("Restaurer depuis un fichier de sauvegarde (.json)").setInputFiles({ name: "b.json", mimeType: "application/json", buffer: Buffer.from("{nope") });
    await expect(page.getByRole("alert")).toContainText("La sauvegarde n’a pas été restaurée. Le fichier n’est pas du JSON valide.");
    await axeClean(page);
  });
});

test("every new screen passes axe in high contrast with wide spacing and larger text", async ({ page }) => {
  await openDetail(page, "Sample Library");
  await page.getByRole("button", { name: "Save this place" }).click();
  await page.goto("/settings");
  await page.getByLabel("Larger", { exact: true }).check();
  await page.getByLabel(/^High contrast/).check();
  await page.getByLabel(/^Wide/).check();
  for (const path of ["/places/s1", "/places/saved", "/places/plan", "/places/sources", "/settings"]) {
    await page.goto(path);
    await axeClean(page);
  }
});
