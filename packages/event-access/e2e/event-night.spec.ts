import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const LANGS = ["en", "fr"] as const;
const WIDTHS = [1280, 320] as const;

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(results.violations).toEqual([]);
}

async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Test-only answers. They describe no real event. */
async function fillChecklist(page: Page) {
  await page.getByLabel("Event name (English)").fill("Test-only evening");
  await page.getByLabel("Event date").fill("2030-06-01");
  await page.getByLabel("Who is making this statement").fill("test organiser role");
  await page.getByLabel("Temporary ramp in place").selectOption("yes");
  await page.getByLabel("Quiet space available").selectOption("no");
}

for (const lang of LANGS) {
  for (const width of WIDTHS) {
    for (const view of ["journey", "organiser", "open"]) {
      test(`axe: ${view} ${lang} ${width}px has 0 violations and no sideways scroll`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/?lang=${lang}&event=demo-hybrid-confirmed&view=${view}`);
        await expect(page.locator("main h1")).toBeVisible();
        await expectNoViolations(page);
        await expectNoSidewaysScroll(page);
      });
    }

    test(`axe: past record ${lang} ${width}px has 0 violations`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/?lang=${lang}&event=demo-past-evening`);
      await expect(page.locator('[data-timing-notice="past"]')).toBeVisible();
      await expectNoViolations(page);
      await expectNoSidewaysScroll(page);
    });
  }
}

test("a past event's record is shown as past", async ({ page }) => {
  await page.goto("/?lang=en&event=demo-past-evening");
  await expect(page.locator('[data-timing-notice="past"]')).toContainText("This event date has passed");
  await expect(page.locator('[data-field="temporary.ramp"]')).toContainText("Tier 1, operator claim");
  await expect(page.locator('[data-field="temporary.ramp"]')).toContainText("Stated 11 days before the event date");
  await expect(page.locator('[data-field="temporary.stageAccess"]')).toHaveAttribute("data-unknown", "true");
});

test("the journey view says the planner is not connected and claims no route", async ({ page }) => {
  await page.goto("/?lang=en&event=demo-hybrid-confirmed");
  const tab = page.getByRole("button", { name: "Getting there" });
  await tab.focus();
  await page.keyboard.press("Enter");
  await expect(tab).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-journey-state="not_connected"]')).toContainText("The journey planner is not connected");
  await expect(page.locator('[data-handoff="placeId"]')).toContainText("demo-place-001");
  await expect(page.locator('[data-handoff="window"]')).toContainText("18:00 to 19:00");
  await expect(page.locator('[data-handoff="address"]')).toContainText("Unknown");
  await expect(page.locator("main")).not.toContainText(/route (works|is accessible)/i);
  await expect(page.locator('[data-journey-state="planner_result"]')).toHaveCount(0);
});

test("the questions file is saved on the device and lists the Unknown items", async ({ page }) => {
  await page.goto("/?lang=en&event=demo-hybrid-confirmed&view=journey");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save questions file" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("event-questions-demo-hybrid-confirmed.json");
  const source = JSON.parse(await readFile(await download.path(), "utf8")) as { kind: string; unknownItems: { fieldId: string }[] };
  expect(source.kind).toBe("event-outing-source");
  expect(source.unknownItems.map((item) => item.fieldId)).toContain("quiet.space");
  expect(source.unknownItems.map((item) => item.fieldId)).not.toContain("seating.wheelchairSpace");
  await expect(page.getByRole("status")).toContainText("Nothing was sent");
});

test("the checklist moves focus to the error list and links each error to its field", async ({ page }) => {
  await page.goto("/?lang=en&view=organiser");
  await page.getByLabel("Date of this statement").fill("");
  await page.getByRole("button", { name: "Check answers" }).click();
  const heading = page.getByRole("heading", { name: "4 things need fixing" });
  await expect(heading).toBeFocused();
  await expect(page.getByLabel("Who is making this statement")).toHaveAttribute("aria-invalid", "true");
  await page.getByRole("link", { name: "Say who is making this statement." }).click();
  await expect(page.getByLabel("Who is making this statement")).toBeFocused();
  await expect(page.getByRole("button", { name: "Save file" })).toHaveCount(0);
});

test("the checklist counts Unknowns, saves a file by keyboard, and sends nothing", async ({ page }) => {
  const requests: string[] = [];
  await page.goto("/?lang=en&view=organiser");
  page.on("request", (request) => requests.push(request.url()));
  await fillChecklist(page);
  await page.getByLabel("Who is making this statement").press("Enter");
  await expect(page.getByRole("heading", { name: "Completeness" })).toBeFocused();
  const summary = page.locator("[data-summary-unknown]");
  const total = Number(await summary.getAttribute("data-summary-total"));
  expect(total).toBeGreaterThan(20);
  await expect(summary).toHaveAttribute("data-summary-unknown", String(total - 2));
  await expect(summary).toContainText(`2 of ${total} items answered`);
  await expect(page.locator('[data-form-outcome="summary"]')).toContainText("Items left Unknown will be shown to people as Unknown.");

  const downloadPromise = page.waitForEvent("download");
  const save = page.getByRole("button", { name: "Save file" });
  await save.focus();
  await page.keyboard.press("Enter");
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("event-access-organiser-2030-06-01-test-only-evening.json");
  const file = JSON.parse(await readFile(await download.path(), "utf8")) as {
    statement: string;
    record: { demonstration: boolean; temporary: { ramp: { value: string; tier: number; prototypeLabel: string }; stageAccess: { value: string; tier: number } } };
  };
  expect(file.statement).toBe("organiser_claim_unverified");
  expect(file.record.demonstration).toBe(false);
  expect(file.record.temporary.ramp).toMatchObject({ value: "yes", tier: 1, prototypeLabel: "PROTOTYPE-UNVERIFIED" });
  expect(file.record.temporary.stageAccess).toMatchObject({ value: "Unknown", tier: 0 });
  await expect(page.locator('[data-form-outcome="summary"]').getByRole("status")).toContainText("Nothing was sent");
  expect(requests.filter((url) => !url.startsWith("blob:"))).toEqual([]);

  await page.getByLabel("Quiet space available").selectOption("");
  await expect(page.locator("[data-form-outcome]")).toHaveCount(0);
});

test("a saved organiser file opens as an unverified organiser statement, and a wrong file is refused", async ({ page }) => {
  await page.goto("/?lang=en&view=organiser");
  await fillChecklist(page);
  await page.getByRole("button", { name: "Check answers" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save file" }).click();
  const path = await (await downloadPromise).path();

  await page.getByRole("button", { name: "Open an organiser file" }).click();
  await page.getByLabel("Organiser file", { exact: true }).setInputFiles(path);
  await expect(page.locator('[data-origin="organiser_file"]')).toContainText("has not been verified");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1, name: "Open an organiser file" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Test-only evening" })).toBeVisible();
  await expect(page.locator("[data-confirmation]")).toHaveAttribute("data-confirmation", "organiser_statement_unverified");
  await expect(page.locator("[data-confirmation]")).toHaveText("Organiser statement, not verified");
  await expect(page.getByText("Confirmed for this occurrence")).toHaveCount(0);
  await expect(page.locator('[data-field="temporary.ramp"]')).toContainText("Organiser statement by test organiser role");
  await expect(page.locator('[data-field="quiet.space"]')).toContainText("No");
  await expect(page.locator('[data-field="temporary.stageAccess"]')).toHaveAttribute("data-unknown", "true");
  await expectNoViolations(page);

  await page.getByLabel("Organiser file", { exact: true }).setInputFiles({ name: "other.json", mimeType: "application/json", buffer: Buffer.from('{"kind":"other"}') });
  await expect(page.getByRole("alert")).toContainText("This file is not an organiser statement file.");
  await expect(page.locator("[data-field]")).toHaveCount(0);
});

test("checklist controls meet the 44px target size", async ({ page }) => {
  await page.goto("/?lang=fr&view=organiser");
  for (const locator of [page.getByLabel("Rampe temporaire en place"), page.getByRole("button", { name: "Vérifier les réponses" }), page.getByLabel("Date de l'événement")]) {
    const box = await locator.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});
