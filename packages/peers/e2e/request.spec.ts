import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const LANGUAGES = ["en", "fr"] as const;
const WIDTHS = [1280, 320] as const;
const STORAGE_KEY = "access.peers.connection-requests.v1";

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

async function fillValid(page: Page, options: { forWhom?: string; contexts?: string[]; region?: string; note?: string } = {}) {
  await page.check(`#pcr-for-${options.forWhom ?? "myself"}`);
  for (const context of options.contexts ?? ["work"]) {
    await page.check(`#pcr-context-${context}`);
  }
  if (options.region) {
    await page.selectOption("#pcr-region", options.region);
  }
  await page.selectOption("#pcr-language", "en");
  if (options.note) {
    await page.fill("#pcr-note", options.note);
  }
  await page.check("#pcr-age");
  for (const item of ["prepare_summary", "include_contexts", "include_region", "include_language", "include_note"]) {
    await page.check(`#pcr-consent-${item}`);
  }
}

const submit = (page: Page) => page.locator("form button[type=submit]").click();

for (const language of LANGUAGES) {
  for (const width of WIDTHS) {
    test.describe(`request flow, ${language} at ${width}px`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/?view=request&lang=${language}`);
        await expect(page.locator("h1")).toBeVisible();
      });

      test("the empty form has no axe violations and nothing is ticked in advance", async ({ page }) => {
        expect(await axeViolations(page)).toEqual([]);
        await noHorizontalScroll(page);
        expect(await page.locator("input:checked").count()).toBe(0);
        for (const box of await page.locator("input[type=checkbox], input[type=radio]").all()) {
          const size = await box.boundingBox();
          expect(size?.width ?? 0).toBeGreaterThanOrEqual(24);
          expect(size?.height ?? 0).toBeGreaterThanOrEqual(24);
        }
      });

      test("a missing consent is an error, moves focus to it, and saves nothing", async ({ page }) => {
        await page.check("#pcr-for-myself");
        await page.check("#pcr-context-work");
        await page.selectOption("#pcr-language", "en");
        await page.check("#pcr-age");
        await submit(page);
        await expect(page.locator("#pcr-problem")).toBeFocused();
        await expect(page.locator("#pcr-problem")).toHaveAttribute("role", "alert");
        await expect(page.locator("#pcr-problem a")).toHaveAttribute("href", "#pcr-consent-prepare_summary");
        expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBeNull();
        expect(await axeViolations(page)).toEqual([]);
        await noHorizontalScroll(page);
      });

      test("a prepared summary, its history and the delete-everything step have no axe violations", async ({ page }) => {
        await fillValid(page, { region: "eastern_ontario", note: "Back to work in the new year." });
        await submit(page);
        await expect(page.locator("#pcr-result")).toBeFocused();
        await expect(page.locator("#pcr-summary")).toHaveValue(/req|conn-/);
        expect(await axeViolations(page)).toEqual([]);
        await noHorizontalScroll(page);
        await page.locator(".peer-audit summary").click();
        await expect(page.locator(".peer-audit li")).toHaveCount(1);
        await page.locator("#pcr-delete-all").click();
        await expect(page.locator("#pcr-delete-no")).toBeFocused();
        expect(await axeViolations(page)).toEqual([]);
        await noHorizontalScroll(page);
      });

      test("crisis wording interrupts the form with signposting and has no axe violations", async ({ page }) => {
        await page.fill("#pcr-note", "I want to end my life");
        await page.locator("#pcr-age").focus();
        await expect(page.locator("#pcr-crisis-title")).toBeVisible();
        await expect(page.locator(".peer-crisis")).toBeFocused();
        await expect(page.locator("form")).toHaveCount(0);
        await expect(page.locator(".peer-crisis li")).toHaveCount(3);
        expect(await axeViolations(page)).toEqual([]);
        await noHorizontalScroll(page);
        await page.locator(".peer-crisis button").click();
        await expect(page.locator("#pcr-form-title")).toBeFocused();
        await expect(page.locator("#pcr-note")).toHaveValue("");
      });
    });
  }
}

test.describe("request flow behaviour (English)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?view=request&lang=en");
  });

  test("with the recorded table the stream is Unknown and the summary says nothing was sent", async ({ page }) => {
    await fillValid(page, { region: "northern_ontario" });
    await submit(page);
    const summary = page.locator("#pcr-summary");
    await expect(summary).toHaveValue(/Programme stream: Unknown\. No programme stream has been recorded in the App yet\./);
    await expect(summary).toHaveValue(/The App has not sent this summary to anyone\./);
    await expect(summary).toHaveValue(/Part of Ontario: Northern Ontario/);
    await expect(page.locator("#pcr-result")).toContainText("Received");
    await expect(page.locator("#pcr-result")).toContainText("cannot promise that a peer will reply");
  });

  test("items without consent are left out of the summary", async ({ page }) => {
    await fillValid(page, { region: "eastern_ontario", note: "Back to work in the new year." });
    await page.uncheck("#pcr-consent-include_region");
    await page.uncheck("#pcr-consent-include_note");
    await submit(page);
    const summary = page.locator("#pcr-summary");
    await expect(summary).toHaveValue(/Part of Ontario: not shared/);
    await expect(summary).not.toHaveValue(/Eastern Ontario/);
    await expect(summary).not.toHaveValue(/Back to work/);
  });

  test("a note with a diagnosis label or injury level is refused and nothing is saved", async ({ page }) => {
    await fillValid(page, { note: "C5 quadriplegic, back at work" });
    await submit(page);
    await expect(page.locator("#pcr-problem")).toContainText("does not collect those");
    await expect(page.locator("#pcr-result")).toHaveCount(0);
    expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  });

  test("the note field cannot hold more than 280 characters", async ({ page }) => {
    await page.fill("#pcr-note", "x".repeat(400));
    expect((await page.inputValue("#pcr-note")).length).toBe(280);
    await expect(page.locator("#pcr-note-count")).toContainText("280 of 280");
  });

  test("crisis wording at submit is never stored", async ({ page }) => {
    await fillValid(page);
    await page.fill("#pcr-note", "thinking about suicide");
    await expect(page.locator("#pcr-note")).toBeFocused();
    await page.evaluate(() => document.querySelector("form")?.requestSubmit());
    await expect(page.locator("#pcr-crisis-title")).toBeVisible();
    await expect(page.locator(".peer-crisis")).toContainText("does not offer counselling");
    expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBeNull();
    expect(await page.evaluate(() => JSON.stringify(window.localStorage))).not.toContain("suicide");
  });

  test("withdrawing consent closes the request and removes its summary", async ({ page }) => {
    await fillValid(page);
    await submit(page);
    await expect(page.locator("#pcr-summary")).toBeVisible();
    await page.getByRole("button", { name: "Withdraw consent and close this request" }).click();
    await expect(page.locator("#pcr-summary")).toHaveCount(0);
    await expect(page.locator("#pcr-result")).toContainText("No summary is available for this request.");
    await expect(page.locator(".peer-status")).toContainText("Consent was withdrawn.");
    await page.locator(".peer-audit summary").click();
    await expect(page.locator(".peer-audit li")).toHaveCount(2);
    await expect(page.locator(".peer-audit li").last()).toContainText("Consent was withdrawn.");
    const stored = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
    expect(JSON.parse(stored ?? "[]")[0].moderation.state).toBe("closed");
  });

  test("history survives a reload, and delete everything empties the device store", async ({ page }) => {
    await fillValid(page);
    await submit(page);
    await fillValid(page, { contexts: ["parenting"] });
    await submit(page);
    await page.reload();
    await expect(page.locator(".peer-history li")).toHaveCount(2);

    await page.locator(".peer-history li").first().getByRole("button", { name: /^Delete this request/ }).click();
    await expect(page.locator(".peer-history li")).toHaveCount(1);
    await expect(page.locator("#pcr-history-title")).toBeFocused();

    await page.locator("#pcr-delete-all").click();
    await page.getByRole("button", { name: "No, keep my requests" }).click();
    await expect(page.locator(".peer-history li")).toHaveCount(1);
    await expect(page.locator("#pcr-delete-all")).toBeFocused();

    await page.locator("#pcr-delete-all").click();
    await page.getByRole("button", { name: "Yes, delete everything" }).click();
    await expect(page.locator(".peer-history li")).toHaveCount(0);
    await expect(page.locator(".peer-status")).toContainText("Every peer request was deleted");
    expect(await page.evaluate(() => window.localStorage.length)).toBe(0);
    await page.reload();
    await expect(page.getByText("No requests are kept on this device.")).toBeVisible();
  });

  test("the whole flow can be completed with the keyboard", async ({ page }) => {
    await page.locator("#pcr-for-myself").focus();
    await page.keyboard.press("Space");
    await page.locator("#pcr-context-work").focus();
    await page.keyboard.press("Space");
    await page.locator("#pcr-language").focus();
    await page.keyboard.press("e");
    await page.locator("#pcr-age").focus();
    await page.keyboard.press("Space");
    await page.locator("#pcr-consent-prepare_summary").focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("Tab");
    await expect(page.locator("#pcr-consent-include_contexts")).toBeFocused();
    await page.keyboard.press("Space");
    await page.locator("form button[type=submit]").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#pcr-result")).toBeFocused();
    await expect(page.locator("#pcr-summary")).toHaveValue(/Would like to talk about: Work/);
  });

  test("the page makes no network request beyond loading itself", async ({ page }) => {
    const origin = new URL(page.url()).origin;
    const outside: string[] = [];
    page.on("request", (request) => {
      if (!request.url().startsWith(origin) && !request.url().startsWith("blob:") && !request.url().startsWith("data:")) {
        outside.push(request.url());
      }
    });
    await fillValid(page, { region: "eastern_ontario" });
    await submit(page);
    await page.getByRole("button", { name: "Withdraw consent and close this request" }).click();
    expect(outside).toEqual([]);
  });
});

test.describe("request flow with sample routing data", () => {
  test("a matching sample rule records a stream that is labelled as sample data", async ({ page }) => {
    await page.goto("/?view=request&lang=en&table=sample");
    await fillValid(page, { contexts: ["parenting"], region: "eastern_ontario" });
    await submit(page);
    await expect(page.locator("#pcr-result")).toContainText("Sample stream B (Sample data, not a real programme)");
    await expect(page.locator("#pcr-result")).toContainText("Programme stream recorded");
    await expect(page.locator("#pcr-summary")).toHaveValue(/Sample data, not a real programme/);
  });

  test("no stream for the region is Unknown, with the reason", async ({ page }) => {
    await page.goto("/?view=request&lang=en&table=sample");
    await fillValid(page, { contexts: ["parenting"], region: "northern_ontario" });
    await submit(page);
    await expect(page.locator("#pcr-result")).toContainText("Unknown. No programme stream is recorded for this region.");
  });

  test("a request for someone else needs review and names no stream", async ({ page }) => {
    await page.goto("/?view=request&lang=en&table=sample");
    await fillValid(page, { forWhom: "someone_i_support", contexts: ["new_injury"] });
    await submit(page);
    await expect(page.locator("#pcr-result")).toContainText("Needs review");
    await expect(page.locator("#pcr-result")).toContainText("Not recorded while the request needs review");
    await expect(page.locator("#pcr-summary")).not.toHaveValue(/Sample stream/);
  });
});
