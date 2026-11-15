import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Days 22 and 24 checks for the help centre (checkId playwright-release):
 * no console errors on its routes in either language, unknown addresses and
 * unknown articles explain themselves and offer a next action that works by
 * keyboard, and a fresh offline copy still supports search, article, and back.
 */
const ROUTES = ["/", "/help/offline", "/community", "/community/events", "/community/safety", "/practice", "/about", "/no-such-page", "/help/no-such-article"];

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${page.url()} ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`${page.url()} ${error.message}`));
  return errors;
}

async function axeClean(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

test("help centre routes log no console errors in English or French", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  for (const language of ["English", "Français"] as const) {
    await page.goto("/");
    await page.getByRole("button", { name: language }).click();
    for (const route of ROUTES) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    }
  }
  expect(errors).toEqual([]);
});

test("an unknown address has a heading, plain language, and links that work by keyboard", async ({ page }) => {
  await page.goto("/no-such-page");
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
  await expect(page.getByText("Check the address, or use one of these links.")).toBeVisible();
  await axeClean(page);
  const help = page.getByRole("main").getByRole("link", { name: "Open help" });
  await help.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Help" })).toBeVisible();

  await page.getByRole("button", { name: "Français" }).click();
  await page.goto("/no-such-page");
  await expect(page.getByRole("heading", { level: 1, name: "Page introuvable" })).toBeVisible();
  const about = page.getByRole("main").getByRole("link", { name: "Ouvrir À propos" });
  await about.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "À propos" })).toBeVisible();
});

test("an unknown article explains itself and links back to help", async ({ page }) => {
  await page.goto("/help/no-such-article");
  await expect(page.getByRole("heading", { level: 1, name: "Article not found" })).toBeVisible();
  await expect(page.getByText("Search help or open the list of articles.")).toBeVisible();
  await axeClean(page);
  await page.getByRole("main").getByRole("link", { name: "Open help" }).click();
  await expect(page.getByRole("searchbox", { name: "Search help" })).toBeVisible();
});

test("a fresh offline copy still supports search, an article, and back", async ({ page, context }) => {
  await page.goto("/");
  // The bundled pack is saved on first load. Wait for an article page to show its saved time.
  await page.goto("/help/offline");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.goto("/");
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(page.getByRole("status").filter({ hasText: "offline" })).toBeVisible();

  const search = page.getByRole("searchbox", { name: "Search help" });
  await search.focus();
  await search.fill("toilette");
  const hit = page.getByRole("button", { name: "Labels and unknowns" });
  await hit.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "What the App does not do" })).toBeVisible();
  await page.getByRole("button", { name: "Back to help" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Help" })).toBeVisible();

  await page.getByRole("button", { name: "Français" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Aide" })).toBeVisible();
  await context.setOffline(false);
});
