import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * The peer request and the event-night screens as the help centre serves them.
 * Each package tests its own screen in a harness; these tests cover the wiring:
 * the menu labels in English and French, the routes, storage on this device,
 * one level-1 heading per screen, and axe on every screen in both languages.
 */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const PEER_KEY = "access.peers.connection-requests.v1";
const PLAN_KEY = "access.outings.event-plans.v1";

const SCREENS = [
  { path: "/peers/request", en: "Ask for a peer connection", fr: "Demander à parler avec un pair" },
  { path: "/event-night", en: "Event night", fr: "Soirée d’événement" },
  { path: "/event-night/organiser", en: "Organiser checklist", fr: "Liste de l'organisateur" },
  { path: "/event-night/open", en: "Open an organiser file", fr: "Ouvrir un fichier d'organisateur" },
  { path: "/event-night/journey", en: "Getting to the door", fr: "Se rendre à la porte" },
  { path: "/event-night/outing", en: "Plan an outing to an event", fr: "Planifier une sortie à un événement" },
] as const;

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

async function clearDevice(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
}

async function useFrench(page: Page) {
  await page.getByRole("button", { name: "Français" }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toMatch(/^fr/);
}

/** Test-only answers. They describe no real event. */
async function fillChecklist(page: Page) {
  await page.getByLabel("Event name (English)").fill("Test-only evening");
  await page.getByLabel("Event date").fill("2030-06-01");
  await page.getByLabel("Who is making this statement").fill("test organiser role");
  await page.getByLabel("Temporary ramp in place").selectOption("yes");
  await page.getByLabel("Quiet space available").selectOption("no");
}

test.beforeEach(async ({ page }) => {
  await clearDevice(page);
});

test.describe("menu and routes", () => {
  test("the primary menu links to the peer request and to event night, in English and French", async ({ page }) => {
    const primary = page.getByRole("navigation", { name: "Primary" });
    await primary.getByRole("link", { name: "Peer request" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Ask for a peer connection" })).toBeVisible();
    await primary.getByRole("link", { name: "Event night" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Event night" })).toBeVisible();

    await useFrench(page);
    const principal = page.getByRole("navigation", { name: "Principal" });
    await principal.getByRole("link", { name: "Soirée d’événement" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Soirée d’événement" })).toBeVisible();
    await principal.getByRole("link", { name: "Demande de pair" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Demander à parler avec un pair" })).toBeVisible();
  });

  test("the event-night menu opens every event-night screen by keyboard", async ({ page }) => {
    await page.goto("/event-night");
    const menu = page.getByRole("navigation", { name: "Event night" });
    for (const [link, heading] of [
      ["Organiser checklist", "Organiser checklist"],
      ["Open an organiser file", "Open an organiser file"],
      ["Getting to the door", "Getting to the door"],
      ["Plan an outing", "Plan an outing to an event"],
    ] as const) {
      await menu.getByRole("link", { name: link, exact: true }).focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(menu.getByRole("link", { name: link, exact: true })).toHaveAttribute("aria-current", "page");
    }
  });

  test("the event-night landing screen links to each tool and says nothing is sent", async ({ page }) => {
    await page.goto("/event-night");
    await expect(page.getByText("Everything here stays on this device. Nothing is sent.", { exact: false })).toBeVisible();
    await page.locator(".event-night-list").getByRole("link", { name: "Open an organiser file" }).click();
    await expect(page).toHaveURL(/\/event-night\/open$/);
  });

  for (const language of ["en", "fr"] as const) {
    for (const screen of SCREENS) {
      test(`${screen.path} in ${language}: one level-1 heading, the page title, no axe violations, no sideways scroll at 320 px`, async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 800 });
        if (language === "fr") await useFrench(page);
        await page.goto(screen.path);
        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
        await expect(page.getByRole("heading", { level: 1, name: screen[language] })).toBeVisible();
        await expect(page).toHaveTitle(new RegExp(`^${screen[language].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} — `));
        await expectNoViolations(page);
        await expectNoSidewaysScroll(page);
      });
    }
  }
});

test.describe("peer request in the help centre", () => {
  test("prepares a summary on this device, keeps it after a reload, and sends nothing", async ({ page }) => {
    await page.goto("/peers/request");
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await expect(page.getByText("The App sends nothing.", { exact: false })).toBeVisible();
    expect(await page.locator("#main input:checked").count()).toBe(0);

    await page.check("#pcr-for-myself");
    await page.check("#pcr-context-work");
    await page.selectOption("#pcr-language", "en");
    await page.check("#pcr-age");
    for (const item of ["prepare_summary", "include_contexts", "include_language"]) await page.check(`#pcr-consent-${item}`);
    await page.getByRole("button", { name: "Prepare my request summary" }).click();
    await expect(page.locator("#pcr-result")).toBeFocused();
    await expect(page.getByLabel("Summary to share yourself")).not.toHaveValue("");
    await expectNoViolations(page);
    expect(requests).toEqual([]);

    const stored = await page.evaluate((key) => window.localStorage.getItem(key), PEER_KEY);
    expect(stored).not.toBeNull();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Requests kept on this device" })).toBeVisible();
    await expect(page.locator(".peer-history li").first()).toBeVisible();
  });

  test("offers no match, no mentor and no way to write to another person", async ({ page }) => {
    for (const language of ["en", "fr"] as const) {
      if (language === "fr") await useFrench(page);
      await page.goto("/peers/request");
      await expect(page.locator("#main h1")).toBeVisible();
      const text = await page.locator("#main").innerText();
      expect(text).not.toMatch(/\bmatch|mentor|jumel|demonstration profile|profil de démonstration/i);
      expect(text).not.toMatch(/send (a |your )?message|chat with|inbox|messagerie|clavard/i);
      await expect(page.locator("#main a[href^='mailto:'], #main a[href^='tel:'], #main a[href^='sms:'], #main a[href^='http']")).toHaveCount(0);
    }
  });

  test("crisis wording interrupts the form and is not stored", async ({ page }) => {
    await page.goto("/peers/request");
    await page.fill("#pcr-note", "I want to end my life");
    await page.locator("#pcr-age").focus();
    await expect(page.locator(".peer-crisis")).toBeFocused();
    await expect(page.locator(".peer-crisis li")).toHaveCount(3);
    expect(await page.evaluate((key) => window.localStorage.getItem(key), PEER_KEY)).toBeNull();
    await expectNoViolations(page);
  });
});

test.describe("event night in the help centre", () => {
  test("an organiser saves a file, and opening it shows an organiser statement that is not confirmed", async ({ page }) => {
    await page.goto("/event-night/organiser");
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await fillChecklist(page);
    await page.getByRole("button", { name: "Check answers" }).click();
    await expect(page.getByRole("heading", { name: "Completeness" })).toBeFocused();
    await expectNoViolations(page);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save file" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("event-access-organiser-2030-06-01-test-only-evening.json");
    const path = await download.path();
    const file = JSON.parse(await readFile(path, "utf8")) as { statement: string; record: { confirmation: string } };
    expect(file.statement).toBe("organiser_claim_unverified");
    expect(file.record.confirmation).toBe("organiser_statement_unverified");
    expect(requests.filter((url) => !url.startsWith("blob:"))).toEqual([]);

    await page.getByRole("navigation", { name: "Event night" }).getByRole("link", { name: "Open an organiser file" }).click();
    await page.getByLabel("Organiser file", { exact: true }).setInputFiles(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 2, name: "Test-only evening" })).toBeVisible();
    await expect(page.locator("[data-confirmation]")).toHaveText("Organiser statement, not verified");
    await expect(page.getByText("Confirmed for this occurrence")).toHaveCount(0);
    await expect(page.locator('[data-field="temporary.stageAccess"]')).toHaveAttribute("data-unknown", "true");
    await expectNoViolations(page);
    await expectNoSidewaysScroll(page);
  });

  test("a file that is not an organiser statement is refused", async ({ page }) => {
    await page.goto("/event-night/open");
    await page.getByLabel("Organiser file", { exact: true }).setInputFiles({ name: "other.json", mimeType: "application/json", buffer: Buffer.from('{"kind":"other"}') });
    await expect(page.locator("#open-error")).toContainText("This file is not an organiser statement file.");
    await expect(page.locator("[data-field]")).toHaveCount(0);
    await expectNoViolations(page);
  });

  test("getting to the door shows the hand-off for the chosen demonstration event and plans no route", async ({ page }) => {
    await page.goto("/event-night/journey");
    await expect(page.getByText("These events are made up for testing. They describe no real place.")).toBeVisible();
    await expect(page.getByText("The journey planner is not connected.", { exact: false })).toBeVisible();
    const picker = page.getByLabel("Demonstration event");
    const options = await picker.locator("option").allTextContents();
    expect(options.length).toBeGreaterThan(1);
    await picker.selectOption({ index: options.length - 1 });
    await expect(page.locator("#main .lede")).toHaveText(options[options.length - 1] ?? "");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expectNoViolations(page);
  });

  test("an outing plan starts from a sample event, is kept on this device, and can be deleted", async ({ page }) => {
    await page.goto("/event-night/outing");
    await expect(page.getByText("No plans saved on this device.")).toBeVisible();
    await page.getByRole("button", { name: "Start a plan" }).click();
    const plan = page.locator("[data-plan]");
    await expect(plan).toHaveCount(1);
    await expect(plan).toContainText("Sample data. This event is made up for testing.");
    await plan.locator("input[type=checkbox]").first().check();
    await expectNoViolations(page);

    await page.reload();
    await expect(page.locator("[data-plan] input[type=checkbox]").first()).toBeChecked();
    expect(await page.evaluate((key) => window.localStorage.getItem(key), PLAN_KEY)).not.toBeNull();

    await page.locator("[data-plan]").getByRole("button", { name: "Delete this plan" }).click();
    await page.getByRole("button", { name: "Yes, delete" }).click();
    await expect(page.locator("[data-plan]")).toHaveCount(0);
    await expectNoViolations(page);
  });
});
