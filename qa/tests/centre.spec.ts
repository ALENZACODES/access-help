import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function expectNoSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

test("home shows the App, the prototype notice, and the build identifier", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("the App").first()).toBeVisible();
  await expect(page.getByText(/Prototype/)).toBeVisible();
  await expect(page.getByText("access-help-0.1.0")).toBeVisible();
  await expectNoSeriousAxeViolations(page);
});

test("the skip link is the first tab stop and About opens from the keyboard", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.getByRole("link", { name: "About", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "About" })).toBeVisible();
  await expect(page.getByText("The App does not give medical advice, legal advice, or a benefits decision.")).toBeVisible();
  await expect(page.getByText(/not endorsed/i).first()).toBeVisible();
  await expectNoSeriousAxeViolations(page);
});

test("help search, article, and back work by keyboard", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("searchbox", { name: "Search help" });
  await search.focus();
  await search.fill("toilette");
  const hit = page.getByRole("button", { name: "Labels and unknowns" });
  await expect(hit).toBeVisible();
  await hit.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Labels and unknowns" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What the App does", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What the App does not do" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What data it uses" })).toBeVisible();
  await page.getByRole("button", { name: "Back to help" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Help" })).toBeVisible();
  await expectNoSeriousAxeViolations(page);
});

test("French persists and still switches while offline", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Français" }).click();
  await expect(page.getByRole("heading", { name: "Aide" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Communauté" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Aide" })).toBeVisible();
  await context.setOffline(true);
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "Help" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "offline" })).toBeVisible();
  await context.setOffline(false);
});

test("directory, events, and safety have no registration or tip form", async ({ page }) => {
  await page.goto("/community");
  await expect(page.getByText("does not replace SCIO services")).toBeVisible();
  await expect(page.getByText("Not listed as a current programme")).toBeVisible();
  await expect(page.locator("textarea")).toHaveCount(0);
  await expectNoSeriousAxeViolations(page);

  await page.goto("/community/events");
  await expect(page.getByRole("heading", { name: /Demonstration event/ }).first()).toBeVisible();
  await page.getByRole("button", { name: "Open the listing" }).first().click();
  await expect(page.getByRole("link", { name: /Registration on the organisation/ })).toHaveAttribute("href", "https://sciontario.org/");
  await expect(page.locator("form")).toHaveCount(0);
  await expect(page.getByText("Per-event data is not confirmed for this date.").first()).toBeVisible();
  await expectNoSeriousAxeViolations(page);

  await page.goto("/community/safety");
  await expect(page.getByText("This is not running in the prototype.")).toHaveCount(6);
  await expect(page.locator("textarea")).toHaveCount(0);
  await expectNoSeriousAxeViolations(page);
});

test("the phone width does not scroll sideways", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const wider = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(wider).toBe(false);
  await expect(page.getByText("access-help-0.1.0")).toBeVisible();
});

test("practice review does not publish health advice or store a crisis", async ({ page }) => {
  await page.goto("/practice");
  await expectNoSeriousAxeViolations(page);
  await page.getByLabel("Display name").fill("Side door");
  await page.getByLabel("Practical tip").fill("I want to die");
  await page.getByRole("checkbox", { name: "I am 16 or older." }).check();
  await page.getByRole("button", { name: "Submit for review on this device" }).click();
  await expect(page.getByRole("status").filter({ hasText: "does not save this text" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "I want to die" })).toHaveCount(0);

  await page.getByLabel("Practical tip").fill("Catheterize every 4 hours.");
  await page.getByRole("button", { name: "Submit for review on this device" }).click();
  await page.getByRole("button", { name: "Publish after human review" }).click();
  await expect(page.getByRole("status").filter({ hasText: /health advice/i })).toBeVisible();
  await expect(page.getByText("Community tips are not yet available.")).toBeVisible();
});
