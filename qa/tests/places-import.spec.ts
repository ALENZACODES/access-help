import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const HEADER = "id,name,status,latitude,longitude,source,licence,observed_on";
const sheet = (...lines: string[]) => [HEADER, ...lines].join("\n");
const GOOD = () => `n1,Sample Hall,yes,43.80123,-79.40123,own visit,CC0-1.0,${today()}`;
const UNCLEAR = () => `n2,Sample Rink,accessible,43.90123,-79.50123,own visit,ODbL-1.0,${today()}`;
const BAD = () => `n3,Sample Depot,no,43.7,-79.3,own visit,CC-BY-4.0,${today()}`;

const drafts = (page: Page) => page.evaluate(() => JSON.parse(window.localStorage.getItem("the-app-place-drafts") ?? "[]") as { id: string; wheelchair: string; licence: string }[]);

async function open(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.removeItem("the-app-place-drafts"));
  await page.goto("/places/import");
}

async function readSheet(page: Page, text: string) {
  await page.getByLabel("Or paste the sheet text").fill(text);
  await page.getByRole("button", { name: "Read this sheet" }).click();
}

test.describe("bring in a sheet", () => {
  test("is reachable from the places menu and says nothing is uploaded", async ({ page }) => {
    await page.goto("/places");
    await page.getByRole("link", { name: "Bring in a sheet" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Bring in a sheet of your own notes" })).toBeVisible();
    await expect(page.getByText("Nothing is uploaded.", { exact: false }).first()).toBeVisible();
  });

  test("asks for a sheet when there is none", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Read this sheet" }).click();
    await expect(page.locator(".places-notice")).toContainText("Choose a file or paste the sheet text first.");
  });

  test("names the missing columns and saves nothing", async ({ page }) => {
    await open(page);
    await readSheet(page, "name,lat,lon\nCafe,43.8,-79.4");
    await expect(page.getByRole("heading", { level: 2, name: "The sheet could not be read" })).toBeFocused();
    await expect(page.getByText("no column for source, licence and date seen", { exact: false })).toBeVisible();
    expect(await drafts(page)).toEqual([]);
  });

  test("shows what it found, keeps an unclear status as UNKNOWN, and saves nothing before confirmation", async ({ page }) => {
    await open(page);
    await readSheet(page, sheet(GOOD(), UNCLEAR(), BAD()));
    await expect(page.getByTestId("import-summary")).toContainText("Lines read: 3. To add: 2.");
    await expect(page.getByTestId("import-summary")).toContainText("With a problem: 1.");
    const rink = page.locator(".import-line").filter({ hasText: "Sample Rink" });
    await expect(rink).toContainText("Status: UNKNOWN");
    await expect(rink).toContainText("Tier: UNKNOWN.");
    await expect(rink).toContainText("Licence: ODbL-1.0.");
    await expect(page.locator(".import-line").filter({ hasText: "Sample Depot" })).toContainText("The licence is not CC0-1.0 or ODbL-1.0.");
    expect(await drafts(page)).toEqual([]);
  });

  test("needs the confirmation box, then saves the good lines on the device", async ({ page }) => {
    await open(page);
    await readSheet(page, sheet(GOOD(), UNCLEAR(), BAD()));
    await page.getByRole("button", { name: "Save 2 to my observations" }).click();
    await expect(page.getByRole("alert")).toContainText("Tick the box to confirm.");
    expect(await drafts(page)).toEqual([]);
    await page.getByLabel("These are my own observations", { exact: false }).check();
    await page.getByRole("button", { name: "Save 2 to my observations" }).click();
    await expect(page.locator(".places-notice")).toContainText("2 saved to your observations on this device.");
    const saved = await drafts(page);
    expect(saved.map((r) => r.id)).toEqual(["n1", "n2"]);
    expect(saved[1]).toMatchObject({ wheelchair: "UNKNOWN", licence: "ODbL-1.0" });
    await expect(page.getByRole("link", { name: "Check before you submit" }).last()).toBeVisible();
  });

  test("reads a semicolon sheet with French column names", async ({ page }) => {
    await open(page);
    await readSheet(page, `nom;etat;latitude;longitude;source;licence;vu_le\nSalle Exemple;oui;43,80123;-79,40123;visite;CC0-1.0;${today()}`);
    await expect(page.getByTestId("import-summary")).toContainText("To add: 1.");
    await expect(page.locator(".import-line")).toContainText("Status: yes");
  });

  test("can show only the lines with a problem", async ({ page }) => {
    await open(page);
    await readSheet(page, sheet(GOOD(), BAD()));
    await page.getByLabel("Show only lines with a problem").check();
    await expect(page.locator(".import-line")).toHaveCount(1);
    await expect(page.locator(".import-line")).toContainText("Sample Depot");
  });

  test("reads a chosen file", async ({ page }) => {
    await open(page);
    await page.getByLabel("Sheet file (.csv)").setInputFiles({ name: "notes.csv", mimeType: "text/csv", buffer: Buffer.from(sheet(GOOD()), "utf8") });
    await expect.poll(() => page.getByLabel("Sheet file (.csv)").evaluate((el) => (el as HTMLInputElement).files?.length)).toBe(1);
    await page.getByRole("button", { name: "Read this sheet" }).click();
    await expect(page.getByTestId("import-summary")).toContainText("To add: 1.");
  });

  test("has no serious accessibility violations with a sheet read", async ({ page }) => {
    await open(page);
    await readSheet(page, sheet(GOOD(), UNCLEAR(), BAD()));
    await expect(page.getByTestId("import-summary")).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  });

  test("shows French with French spacing", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Français" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Importer une feuille de vos propres notes" })).toBeVisible();
    await page.getByLabel("Ou collez le texte de la feuille").fill(sheet(GOOD()));
    await page.getByRole("button", { name: "Lire cette feuille" }).click();
    await expect(page.getByTestId("import-summary")).toContainText("Lignes lues : 1.");
    await expect(page.locator(".import-line")).toContainText("Niveau : UNKNOWN.");
  });
});
