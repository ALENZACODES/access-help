import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const LANGUAGES = ["en", "fr"] as const;
const WIDTHS = [1280, 320] as const;

async function axeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return results.violations.map((violation) => `${violation.id}: ${violation.help}`);
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function fillAndSubmit(
  page: Page,
  values: { topic: string; language: string; city?: string; note?: string; age: boolean },
) {
  await page.selectOption("#peer-topic", values.topic);
  await page.selectOption("#peer-language", values.language);
  if (values.city) {
    await page.selectOption("#peer-city", values.city);
  }
  if (values.note) {
    await page.fill("#peer-note", values.note);
  }
  if (values.age) {
    await page.check("#peer-age");
  }
  await page.locator("form button[type=submit]").click();
}

for (const language of LANGUAGES) {
  for (const width of WIDTHS) {
    test.describe(`${language} at ${width}px`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/?lang=${language}`);
        await expect(page.locator("h1")).toBeVisible();
      });

      test("submit form and partner signpost have no axe violations", async ({ page }) => {
        expect(await axeViolations(page)).toEqual([]);
        await noHorizontalScroll(page);
        const link = page.locator("a.peer-link");
        await expect(link).toHaveAttribute("href", "https://example.invalid/peer-programme");
        const box = await link.boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      });

      test("no match yet has no axe violations", async ({ page }) => {
        await fillAndSubmit(page, { topic: "travel", language: "fr", age: true });
        await expect(page.locator("#peer-result-title")).toBeVisible();
        await expect(page.locator(".peer-result")).toBeFocused();
        expect(await axeViolations(page)).toEqual([]);
        await noHorizontalScroll(page);
      });

      test("a match result has no axe violations", async ({ page }) => {
        await fillAndSubmit(page, { topic: "public_transit", language: "en", city: "toronto", age: true });
        await expect(page.locator(".peer-result")).toContainText("1");
        expect(await axeViolations(page)).toEqual([]);
        await noHorizontalScroll(page);
      });

      test("refusals and the age gate have no axe violations", async ({ page }) => {
        await fillAndSubmit(page, { topic: "travel", language: "en", note: "How do I treat a wound?", age: true });
        await expect(page.locator(".peer-result")).toHaveAttribute("role", "alert");
        expect(await axeViolations(page)).toEqual([]);
        await page.reload();
        await fillAndSubmit(page, { topic: "travel", language: "en", age: false });
        await expect(page.locator(".peer-result")).toHaveAttribute("role", "alert");
        expect(await axeViolations(page)).toEqual([]);
      });

      test("crisis wording redirects without saving the text", async ({ page }) => {
        await fillAndSubmit(page, { topic: "travel", language: "en", note: "I want to die", age: true });
        await expect(page.locator(".peer-result")).toContainText("9-8-8");
        await expect(page.locator("#peer-note")).toHaveValue("");
        expect(await axeViolations(page)).toEqual([]);
      });
    });
  }
}
