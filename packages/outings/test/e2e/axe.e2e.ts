import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Requires the dev harness (playwright.config.ts starts vite). 320 and 1280 px, EN and FR, index and detail.
for (const width of [320, 1280]) {
  for (const lang of ["en", "fr"]) {
    for (const list of ["", "parks-step-free-entrance", "pack-pinned-placeholder"]) {
      test(`axe 0 violations: ${lang} ${list || "index"} @${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(`/?lang=${lang}${list ? `&list=${list}` : ""}`);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
      });
    }
  }
}
