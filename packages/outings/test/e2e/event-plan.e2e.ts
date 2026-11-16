import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const KEY = "access.outings.event-plans.v1";

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(results.violations).toEqual([]);
}

for (const width of [320, 1280]) {
  for (const lang of ["en", "fr"]) {
    test(`axe 0 violations and no sideways scroll: event plan ${lang} @${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`/?lang=${lang}&view=event-plan`);
      await expectNoViolations(page);
      await page.locator("form button[type=submit]").first().click();
      await expect(page.locator("[data-plan]")).toHaveCount(1);
      await page.locator("[data-plan] input[type=checkbox]").first().check();
      await expectNoViolations(page);
      await page.locator('[data-focus^="delete:plan"]').click();
      await expectNoViolations(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
}

test("a plan is built from the Unknown items, kept on the device, and deleted by keyboard", async ({ page }) => {
  const requests: string[] = [];
  await page.goto("/?lang=en&view=event-plan");
  page.on("request", (request) => requests.push(request.url()));
  await expect(page.getByText("No plans saved on this device.")).toBeVisible();

  await page.getByLabel("Sample event").focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  const heading = page.getByRole("heading", { level: 3, name: "Demonstration event: evening with some items Unknown" });
  await expect(heading).toBeFocused();
  await expect(page.getByRole("status")).toContainText("Plan started for");
  const plan = page.locator('[data-plan="sample-evening-some-unknown"]');
  await expect(plan).toContainText("Sample data. This event is made up for testing.");
  await expect(plan.locator('[data-item-kind="ask_organiser"]')).toHaveCount(5);
  await expect(plan.getByLabel("Ask the organiser about: Quiet space available")).not.toBeChecked();

  await plan.getByLabel("Ask the organiser about: Quiet space available").focus();
  await page.keyboard.press("Space");
  await expect(plan.locator("[data-plan-progress]")).toHaveAttribute("data-plan-progress", "1/5");

  await plan.getByLabel("Add your own line").fill("Test-only own line");
  await page.keyboard.press("Enter");
  await expect(plan.getByLabel("Test-only own line")).toBeVisible();
  await plan.getByRole("button", { name: "Add" }).click();
  await expect(plan.getByText("Write something to add.")).toBeVisible();

  await page.reload();
  const again = page.locator('[data-plan="sample-evening-some-unknown"]');
  await expect(again.getByLabel("Ask the organiser about: Quiet space available")).toBeChecked();
  await expect(again.locator("[data-plan-progress]")).toHaveAttribute("data-plan-progress", "1/6");
  const stored = await page.evaluate((key) => ({ keys: Object.keys(localStorage), value: localStorage.getItem(key) }), KEY);
  expect(stored.keys).toEqual([KEY]);
  expect(stored.value).toContain("Test-only own line");

  await page.getByRole("button", { name: "Start a plan" }).click();
  await expect(page.getByRole("status")).toContainText("There is already a plan for this event.");
  await expect(page.locator("[data-plan]")).toHaveCount(1);

  await again.getByRole("button", { name: "Delete this plan" }).focus();
  await page.keyboard.press("Enter");
  const yes = again.getByRole("button", { name: "Yes, delete" });
  await expect(yes).toBeFocused();
  const box = await yes.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-plan]")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Saved plans" })).toBeFocused();
  await expect(page.getByRole("status")).toContainText("Plan deleted from this device.");
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(requests.filter((url) => !url.startsWith("http://localhost:4173/"))).toEqual([]);
});

test("a past sample event's plan is shown as past, and delete all clears the device", async ({ page }) => {
  await page.goto("/?lang=en&view=event-plan");
  await page.getByLabel("Sample event").selectOption("sample-past-evening");
  await page.getByRole("button", { name: "Start a plan" }).click();
  await page.getByLabel("Sample event").selectOption("sample-nothing-recorded");
  await page.getByRole("button", { name: "Start a plan" }).click();
  await expect(page.locator('[data-plan="sample-past-evening"] [data-plan-timing]')).toHaveAttribute("data-plan-timing", "past");
  await expect(page.locator('[data-plan="sample-past-evening"]')).toContainText("This event date has passed.");
  await expect(page.locator('[data-plan="sample-nothing-recorded"]')).toContainText("Event date: Unknown");

  await page.getByRole("button", { name: "Delete all plans" }).click();
  await page.getByRole("button", { name: "Keep the plans" }).click();
  await expect(page.getByRole("button", { name: "Delete all plans" })).toBeFocused();
  await expect(page.locator("[data-plan]")).toHaveCount(2);
  await page.getByRole("button", { name: "Delete all plans" }).click();
  await page.getByRole("button", { name: "Yes, delete all" }).click();
  await expect(page.locator("[data-plan]")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test("a questions file starts a plan and a wrong file is refused", async ({ page }) => {
  await page.goto("/?lang=en&view=event-plan");
  const source = {
    kind: "event-outing-source",
    formatVersion: 1,
    eventId: "test-file-event",
    label: { en: "Test-only file event", fr: "Événement de fichier pour essai" },
    eventDate: "2030-06-01",
    demonstration: false,
    preparedOn: "2026-11-16",
    totalFields: 4,
    unknownItems: [{ fieldId: "quiet.space", label: { en: "Quiet space available", fr: "Espace calme offert" } }],
  };
  const picker = page.getByLabel("Or open an event questions file");
  await picker.setInputFiles({ name: "q.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(source)) });
  const plan = page.locator('[data-plan="test-file-event"]');
  await expect(plan.getByLabel("Ask the organiser about: Quiet space available")).toBeVisible();
  await expect(plan).not.toContainText("Sample data");
  await expect(plan).toContainText("1 of 4 items were Unknown");

  await picker.setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from('{"kind":"other"}') });
  await expect(page.getByRole("alert")).toContainText("This file is not an event questions file.");
  await expect(page.locator("[data-plan]")).toHaveCount(1);
});
