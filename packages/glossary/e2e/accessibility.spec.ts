import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const width of [1280, 320]) {
  for (const language of ["en", "fr"] as const) {
    test(`${language} at ${width}px has zero axe violations`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      if (language === "fr") await page.getByLabel("French", { exact: true }).check();
      await expect(page.locator("html")).toHaveAttribute("lang", `${language}-CA`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const report = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(report.violations).toEqual([]);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow).toBe(false);
    });
  }
}

test("keyboard search and language selection", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("adult change table");
  await expect(page.locator(".term")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page.locator(".term")).toHaveCount(TERMS_COUNT);
});

const TERMS_COUNT = 51;
