import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { DEMONSTRATION_RECORDS } from "../src/fixtures.js";

const WIDTHS = [1280, 320] as const;
const LANGS = ["en", "fr"] as const;
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

for (const lang of LANGS) {
  for (const width of WIDTHS) {
    for (const record of DEMONSTRATION_RECORDS) {
      test(`axe: ${record.eventId} ${lang} ${width}px has 0 violations`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/?lang=${lang}&event=${record.eventId}`);
        await expect(page.locator("h1")).toHaveText(record.eventLabel[lang]);
        await expect(page.locator("html")).toHaveAttribute("lang", lang);
        const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
        expect(results.violations).toEqual([]);
      });
    }
  }

  test(`reflow: no horizontal scroll at 320px (${lang})`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(`/?lang=${lang}&event=demo-hybrid-confirmed`);
    await expect(page.locator("h1")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("Unknown fields show the empty state and no value", async ({ page }) => {
  await page.goto("/?lang=en&event=demo-nothing-known");
  const door = page.locator('[data-field="entrance.doorClearWidthMm"]');
  await expect(door).toHaveAttribute("data-unknown", "true");
  await expect(door).toContainText("Nothing has been measured or reported");
  await expect(door).toContainText("2026-11-15");
  await expect(door).not.toContainText(/\d+\s*mm/);
});

test("language and event controls work by keyboard and meet the 44px target size", async ({ page }) => {
  await page.goto("/?lang=en&event=demo-nothing-known");
  const french = page.getByRole("button", { name: "Français" });
  const box = await french.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  await french.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator("main")).toContainText("n'est pas disponible dans ce module");
  await page.getByLabel("Choisir un événement").selectOption("demo-virtual-captions-unknown");
  await expect(page.locator('[data-section="captions"]')).toContainText("Inconnu");
});

test("page offers no ticket purchase and no journey button", async ({ page }) => {
  await page.goto("/?lang=en&event=demo-hybrid-confirmed");
  await expect(page.locator("main")).toContainText("A door-to-door plan is not available in this package.");
  await expect(page.locator("main button, main a")).toHaveCount(0);
});
