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

function baseFeatures() {
  return [
    feature("s1", "Sample Library", "yes", 43.85, -79.43, daysAgo(10)),
    feature("s2", "Sample Café", "limited", 43.85, -79.42, daysAgo(400)),
    feature("s3", "Sample Arena", "no", 43.7, -79.4, daysAgo(900)),
    feature("s4", "Sample Clinic Annex", undefined, 43.851, -79.431, daysAgo(5), "ODbL-1.0"),
  ];
}

function packBuffer(packId = "sample-pack", mutate: (pack: any) => void = () => {}): Buffer {
  const features = baseFeatures();
  const pack = { manifest: { packId, generatedOn: daysAgo(1), recordCount: features.length }, data: { type: "FeatureCollection", features } };
  mutate(pack);
  pack.manifest.recordCount = pack.data.features.length;
  return Buffer.from(JSON.stringify(pack), "utf8");
}

async function axeClean(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

const stored = (page: Page, key: string) => page.evaluate((k) => window.localStorage.getItem(k), key);

async function loadPack(page: Page, buffer: Buffer, label = "Pack file (.json)") {
  const before = await stored(page, "the-app-places-packs");
  await page.getByLabel(label).setInputFiles({ name: "pack.json", mimeType: "application/json", buffer });
  // The file is read and saved asynchronously. Wait for the save so a later navigation cannot cut it off.
  await expect.poll(() => stored(page, "the-app-places-packs")).not.toBe(before);
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
});

test.describe("look at a pack file", () => {
  test("shows what is in the file and saves nothing until Add is chosen", async ({ page }) => {
    await page.goto("/places/inspect");
    await page.getByLabel("Pack file to look at (.json)").setInputFiles({
      name: "pack.json",
      mimeType: "application/json",
      buffer: packBuffer("inspected", (p) => {
        p.data.features[0].properties.wheelchair = "fully accessible";
        p.data.features[1].properties.source = "";
      }),
    });
    await expect(page.getByRole("heading", { name: "What is in pack inspected" })).toBeVisible();
    const facts = page.locator("dl.facts");
    await expect(facts.locator("dt", { hasText: "Places in the file" }).locator("xpath=following-sibling::dd[1]")).toHaveText("4");
    await expect(facts.locator("dt", { hasText: "Places the App can use" }).locator("xpath=following-sibling::dd[1]")).toHaveText("3");
    await expect(facts.locator("dt", { hasText: "Places left out" }).locator("xpath=following-sibling::dd[1]")).toHaveText("1");
    await expect(facts.locator("dt", { hasText: "shown as UNKNOWN because their status was not recognised" }).locator("xpath=following-sibling::dd[1]")).toHaveText("1");
    await expect(page.getByText("Place s1: its status was not one the App recognises, so it is shown as UNKNOWN.")).toBeVisible();
    await expect(page.getByText("UNKNOWN stays UNKNOWN.")).toBeVisible();
    expect(await stored(page, "the-app-places-packs")).toBeNull();
    await axeClean(page);

    await page.getByRole("button", { name: "Add this pack to this device" }).click();
    await expect(page.getByText("Pack inspected was added to this device. 3 places.")).toBeVisible();
    await page.goto("/places");
    await expect(page.getByRole("heading", { name: "Loaded packs (1)" })).toBeVisible();
  });

  test("says when a pack would replace one already on the device, and refuses a file that is not a pack", async ({ page }) => {
    await loadPack(page, packBuffer("same"));
    await page.goto("/places/inspect");
    await page.getByLabel("Pack file to look at (.json)").setInputFiles({ name: "p.json", mimeType: "application/json", buffer: packBuffer("same") });
    await expect(page.getByText("A pack with this id is already on this device. Adding this one replaces it.")).toBeVisible();
    await page.getByRole("button", { name: "Look at a different file" }).click();
    await page.getByLabel("Pack file to look at (.json)").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from("{nope") });
    await expect(page.getByRole("alert")).toContainText("The file cannot be used. The file is not valid JSON.");
    await expect(page.getByRole("heading", { name: /What is in pack/ })).toHaveCount(0);
  });

  test("works in French", async ({ page }) => {
    await page.goto("/places/inspect");
    await page.getByRole("button", { name: "Français" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Examiner un fichier de paquet" })).toBeVisible();
    await page.getByLabel("Fichier de paquet à examiner (.json)").setInputFiles({ name: "p.json", mimeType: "application/json", buffer: packBuffer("fr-pack") });
    await expect(page.getByRole("heading", { name: "Contenu du paquet fr-pack" })).toBeVisible();
    await expect(page.getByText(/UNKNOWN reste UNKNOWN\./)).toBeVisible();
    await axeClean(page);
  });
});

test.describe("data quality", () => {
  test("counts statuses and ages, lists possible repeats, unnamed places, and places outside the box, with no rating", async ({ page }) => {
    await loadPack(
      page,
      packBuffer("quality", (p) => {
        p.data.features.push(
          feature("r1", "Repeat Place", "yes", 43.9, -79.5, daysAgo(3)),
          feature("r2", "Repeat Place", "no", 43.90005, -79.5, daysAgo(3)),
          feature("u1", null, undefined, 43.8, -79.3, daysAgo(3)),
          feature("far", "Far Place", "yes", 51.05, -114.07, daysAgo(3)),
        );
      }),
    );
    await page.goto("/places/quality");
    const all = page.getByRole("region", { name: "All loaded packs, merged" });
    await expect(all.getByText("Places: 8")).toBeVisible();
    await expect(all.getByText("Step-free access reported: 3. Partial access reported: 1. No step-free access reported: 2. UNKNOWN: 2.")).toBeVisible();
    await expect(all.getByText("25% of places have status UNKNOWN. UNKNOWN stays UNKNOWN.")).toBeVisible();
    await expect(all.getByText("Places with no name: 1")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Possible repeats (1)" })).toBeVisible();
    await expect(page.getByText(/r1 and r2, \d+ metres apart/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Places outside the rough Ontario box (1)" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pack quality" })).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/\b(good|bad|poor|score|grade|rating of)\b/i);
    await axeClean(page);
    await page.getByRole("link", { name: "Details for Far Place" }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: "Far Place" })).toBeVisible();
  });

  test("says there is nothing to count with no pack, and is in French", async ({ page }) => {
    await page.getByRole("button", { name: "Français" }).click();
    await page.goto("/places/quality");
    await page.getByRole("button", { name: "Français" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Qualité des données" })).toBeVisible();
    await expect(page.getByText("Aucun paquet n’est chargé, donc il n’y a rien à compter.")).toBeVisible();
    await axeClean(page);
  });
});

test.describe("compare packs", () => {
  async function twoPacks(page: Page) {
    await loadPack(page, packBuffer("older"));
    await loadPack(
      page,
      packBuffer("newer", (p) => {
        p.data.features[3].properties.wheelchair = "yes";
        p.data.features[0].properties.wheelchair = "UNKNOWN";
        p.data.features.splice(2, 1);
        p.data.features.push(feature("n1", "Brand New", "limited", 43.8, -79.3, daysAgo(2)));
      }),
    );
  }

  test("lists what was added, removed, and changed, counts status changes, and never calls a change good", async ({ page }) => {
    await twoPacks(page);
    await page.goto("/places/changes");
    await page.getByLabel("Older pack").selectOption("older");
    await page.getByLabel("Newer pack").selectOption("newer");
    await page.getByRole("button", { name: "Compare these packs" }).click();
    await expect(page.getByText("Added: 1. Removed: 1. Changed: 2. Unchanged: 1.")).toBeVisible();
    await expect(page.getByText("UNKNOWN to Step-free access reported: 0")).toHaveCount(0);
    await expect(page.getByRole("listitem").filter({ hasText: "UNKNOWN to Step-free access reported: 1" })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Step-free access reported to UNKNOWN: 1" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Only in newer (1)" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Only in older (1)" })).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/improv|worse|better|upgrade|downgrade/i);
    await axeClean(page);

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download these differences (.csv)" }).click();
    const text = readFileSync(((await (await download).path()) as string), "utf8");
    expect(text.charCodeAt(0)).toBe(0xfeff);
    const rows = text.slice(1).split("\r\n").filter(Boolean);
    expect(rows[0]).toBe("id,name,change,differs_in,status_before,status_after,latitude,longitude,source,licence,observed_on");
    expect(rows.filter((r) => r.includes(",added,"))).toHaveLength(1);
    expect(rows.filter((r) => r.includes(",removed,"))).toHaveLength(1);
    expect(rows.filter((r) => r.includes(",changed,"))).toHaveLength(2);
    expect(rows.some((r) => r.includes(",status,UNKNOWN,yes,"))).toBe(true);
  });

  test("needs two different packs", async ({ page }) => {
    await page.goto("/places/changes");
    await expect(page.getByText("Load at least two packs to compare them.")).toBeVisible();
    await page.goto("/places");
    await twoPacks(page);
    await page.goto("/places/changes");
    await page.getByLabel("Older pack").selectOption("older");
    await page.getByLabel("Newer pack").selectOption("older");
    await page.getByRole("button", { name: "Compare these packs" }).click();
    await expect(page.getByText("Choose two different packs.")).toBeVisible();
  });

  test("works in French", async ({ page }) => {
    await twoPacks(page);
    await page.goto("/places/changes");
    await page.getByRole("button", { name: "Français" }).click();
    await page.getByLabel("Paquet plus ancien").selectOption("older");
    await page.getByLabel("Paquet plus récent").selectOption("newer");
    await page.getByRole("button", { name: "Comparer ces paquets" }).click();
    await expect(page.getByText("Ajoutés : 1. Retirés : 1. Modifiés : 2. Inchangés : 1.")).toBeVisible();
    await axeClean(page);
  });
});

test.describe("saved searches and distance limits", () => {
  test("saves a search, uses it after a reload, and keeps no location in it", async ({ page }) => {
    await loadPack(page, packBuffer());
    await page.getByLabel("Show", { exact: true }).selectOption("yes-or-limited");
    await page.getByLabel("Observed", { exact: true }).selectOption("730");
    await page.getByLabel("Place name or source").fill("sample");
    await page.getByLabel(/^Name for this search/).fill("Step-free, recent");
    await page.getByRole("button", { name: "Save this search" }).click();
    await expect(page.getByText("Search saved: Step-free, recent.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "My searches (1)" })).toBeVisible();
    const raw = (await stored(page, "the-app-search-presets"))!;
    expect(JSON.parse(raw)[0]).toMatchObject({ label: "Step-free, recent", text: "sample", access: "yes-or-limited", maxAgeDays: 730, radiusKm: null });
    expect(raw).not.toMatch(/lat|lon|origin/);

    await page.reload();
    await page.getByLabel("Show", { exact: true }).selectOption("any");
    await page.getByLabel("Place name or source").fill("");
    await page.getByRole("button", { name: "Use search Step-free, recent" }).click();
    await expect(page.getByText("Using search: Step-free, recent.")).toBeVisible();
    await expect(page.getByLabel("Show", { exact: true })).toHaveValue("yes-or-limited");
    await expect(page.getByLabel("Observed", { exact: true })).toHaveValue("730");
    await expect(page.getByLabel("Place name or source")).toHaveValue("sample");
    await expect(page.locator(".places-count")).toHaveText("2 places match.");
    await page.getByRole("button", { name: "Remove search Step-free, recent" }).click();
    await expect(page.getByText("You have no saved searches yet.")).toBeVisible();
  });

  test("asks for a name first", async ({ page }) => {
    await loadPack(page, packBuffer());
    await page.getByRole("button", { name: "Save this search" }).click();
    await expect(page.getByText("Give the search a name first.")).toBeVisible();
    expect(await stored(page, "the-app-search-presets")).toBeNull();
  });

  test("a distance limit narrows the list, keeps UNKNOWN places listed apart, and needs the location first", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 43.85, longitude: -79.43 });
    await loadPack(page, packBuffer());
    await page.getByLabel("Within").selectOption("1");
    await expect(page.getByText("A distance limit needs your location. Choose Sort by distance from me first.")).toBeVisible();
    await expect(page.locator(".places-count")).toHaveText("4 places match.");
    await page.getByRole("button", { name: "Sort by distance from me" }).click();
    await expect(page.locator(".places-count")).toHaveText("3 places match.");
    await expect(page.getByText("Distances are in a straight line. They are not routes.")).toBeVisible();
    await page.getByLabel("Show", { exact: true }).selectOption("yes");
    await expect(page.locator(".places-count")).toHaveText("1 place matches.");
    await expect(page.getByRole("heading", { name: "Not recorded (1)" })).toBeVisible();
    await page.getByLabel("Within").selectOption("any");
    await expect(page.locator(".places-count")).toHaveText("1 place matches.");
    await axeClean(page);
  });

  test("a search with a distance limit says it needs the location, and is in French", async ({ page }) => {
    await loadPack(page, packBuffer());
    await page.getByLabel("Within").selectOption("5");
    await page.getByLabel(/^Name for this search/).fill("Close by");
    await page.getByRole("button", { name: "Save this search" }).click();
    await page.getByLabel("Within").selectOption("any");
    await page.getByRole("button", { name: "Use search Close by" }).click();
    await expect(page.getByText("Using search: Close by. This search has a distance limit. Choose Sort by distance from me to use it.")).toBeVisible();
    await page.getByRole("button", { name: "Français" }).click();
    await expect(page.getByRole("heading", { name: "Mes recherches (1)" })).toBeVisible();
    await expect(page.getByLabel("À moins de")).toHaveValue("5");
    await axeClean(page);
  });
});

test.describe("saved places: labels and CSV", () => {
  async function saveTwo(page: Page) {
    await loadPack(page, packBuffer());
    for (const name of ["Sample Library", "Sample Arena"]) {
      await page.goto("/places");
      await page.getByRole("link", { name: `Details for ${name}` }).click();
      await page.getByRole("button", { name: "Save this place" }).click();
    }
    await page.goto("/places/saved");
  }

  test("adds labels, filters by label, and downloads a CSV with current statuses", async ({ page }) => {
    await saveTwo(page);
    await page.getByLabel(/^Labels for Sample Library/).fill("weekend, Work,  weekend");
    await page.getByRole("button", { name: "Save labels for Sample Library" }).click();
    await expect(page.getByText("Labels saved.")).toBeVisible();
    await expect(page.getByText("Labels: weekend, Work")).toBeVisible();
    await page.getByLabel(/^Labels for Sample Arena/).fill("work");
    await page.getByRole("button", { name: "Save labels for Sample Arena" }).click();
    await page.getByLabel("Show saved places with the label").selectOption("weekend");
    await expect(page.getByRole("heading", { name: "Saved places (1)" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Sample Library" })).toBeVisible();
    await page.getByLabel("Show saved places with the label").selectOption("");
    await expect(page.getByRole("heading", { name: "Saved places (2)" })).toBeVisible();
    await axeClean(page);

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download saved places (.csv)" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^saved-places-\d{4}-\d{2}-\d{2}\.csv$/);
    const rows = readFileSync(((await file.path()) as string), "utf8").slice(1).split("\r\n").filter(Boolean);
    expect(rows[0]).toBe("id,name,status,labels,note,latitude,longitude,source,licence,observed_on,in_loaded_packs,saved_on");
    expect(rows.find((r) => r.startsWith("s1,"))).toContain(",yes,weekend; Work,");
    expect(rows.find((r) => r.startsWith("s3,"))).toContain(",no,work,");
  });

  test("the CSV says UNKNOWN for a saved place whose pack was removed", async ({ page }) => {
    await saveTwo(page);
    await page.goto("/places");
    await page.getByRole("button", { name: "Remove pack sample-pack" }).click();
    await page.goto("/places/saved");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download saved places (.csv)" }).click();
    const rows = readFileSync(((await (await download).path()) as string), "utf8").slice(1).split("\r\n").filter(Boolean);
    expect(rows.find((r) => r.startsWith("s1,"))).toMatch(/^s1,Sample Library,UNKNOWN,,,,,,,,no,/);
  });

  test("labels work in French", async ({ page }) => {
    await saveTwo(page);
    await page.getByRole("button", { name: "Français" }).click();
    await page.getByLabel(/^Étiquettes pour Sample Library/).fill("semaine");
    await page.getByRole("button", { name: "Enregistrer les étiquettes pour Sample Library" }).click();
    await expect(page.getByText("Étiquettes enregistrées.")).toBeVisible();
    await expect(page.getByText("Étiquettes : semaine")).toBeVisible();
    await axeClean(page);
  });
});

test.describe("backup keeps saved searches", () => {
  test("a backup holds them, clear-all removes them, and restore brings them back", async ({ page }) => {
    await loadPack(page, packBuffer());
    await page.getByLabel(/^Name for this search/).fill("Keep me");
    await page.getByRole("button", { name: "Save this search" }).click();
    await page.goto("/settings");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save a backup file (.json)" }).click();
    const text = readFileSync(((await (await download).path()) as string), "utf8");
    expect(JSON.parse(text).presets).toHaveLength(1);
    await page.getByRole("button", { name: "Remove all places data from this device" }).click();
    await page.getByRole("button", { name: "Yes, remove it all" }).click();
    expect(await stored(page, "the-app-search-presets")).toBeNull();
    await page.getByLabel("Restore from a backup file (.json)").setInputFiles({ name: "b.json", mimeType: "application/json", buffer: Buffer.from(text) });
    await expect(page.getByText(/Saved searches added: 1\./)).toBeVisible();
    await page.goto("/places");
    await expect(page.getByRole("heading", { name: "My searches (1)" })).toBeVisible();
  });
});

test.describe("page title and focus after a screen change", () => {
  test("the title is the screen's own heading, in the language in use", async ({ page }) => {
    await page.goto("/places/saved");
    await expect(page).toHaveTitle("Saved places — the App");
    await page.goto("/settings");
    await expect(page).toHaveTitle("Settings — the App");
    await page.getByRole("button", { name: "Français" }).click();
    await expect(page).toHaveTitle("Réglages — l’application");
    await page.goto("/places/not-a-real-place");
    await expect(page).toHaveTitle("Place details — l’application".replace("Place details", "Détails du lieu"));
  });

  test("focus moves to the main region when a link opens another screen, but not on the first load", async ({ page }) => {
    await page.goto("/");
    expect(await page.evaluate(() => document.activeElement?.id)).not.toBe("main");
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Places" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Places on this device" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("main");
    await expect(page).toHaveTitle("Places on this device — the App");
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.closest("main") !== null)).toBe(true);
  });

  test("changing language on the same screen does not move focus away from the button", async ({ page }) => {
    await page.goto("/places/saved");
    await page.getByRole("button", { name: "Français" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1, name: "Lieux enregistrés" })).toBeVisible();
    expect(await page.evaluate(() => document.activeElement?.textContent)).toBe("Français");
  });

  test("a link to a place inside the page does not steal focus", async ({ page }) => {
    await page.goto("/places/contribute");
    await page.getByRole("button", { name: "Save observation on this device" }).click();
    await page.getByRole("alert").getByRole("link").first().click();
    expect(await page.evaluate(() => document.activeElement?.id)).not.toBe("main");
  });
});

test("every new screen passes axe in high contrast with wide spacing and larger text", async ({ page }) => {
  await loadPack(page, packBuffer("a"));
  await loadPack(page, packBuffer("b", (p) => { p.data.features[0].properties.wheelchair = "no"; }));
  await page.goto("/settings");
  await page.getByLabel("Larger", { exact: true }).check();
  await page.getByLabel(/^High contrast/).check();
  await page.getByLabel(/^Wide/).check();
  for (const path of ["/places/quality", "/places/changes", "/places/inspect", "/places"]) {
    await page.goto(path);
    await axeClean(page);
  }
});
