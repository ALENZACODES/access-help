import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Sample observations made up for these tests. Dates are relative to the test run. */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DRAFTS = () => [
  { id: "r1", lat: 43.856123, lon: -79.452341, name: "Sample Library", wheelchair: "yes", source: "own site visit", licence: "ODbL-1.0", observedOn: daysAgo(3) },
  { id: "r2", lat: 43.7, lon: -79.4, name: null, wheelchair: "UNKNOWN", source: "own site visit", licence: "CC0-1.0", observedOn: daysAgo(2) },
  { id: "r3", lat: 43.65, lon: -79.3, name: "Sample Arena", wheelchair: "no", source: "a friend told me", licence: "CC0-1.0", observedOn: daysAgo(800) },
];

async function seed(page: Page, drafts: unknown[] = DRAFTS()) {
  await page.goto("/");
  await page.evaluate((items) => {
    window.localStorage.removeItem("the-app-submit-review");
    window.localStorage.setItem("the-app-place-drafts", JSON.stringify(items));
  }, drafts);
}

test.describe("review before submitting", () => {
  test("is reachable from the places menu and says nothing is uploaded", async ({ page }) => {
    await seed(page);
    await page.goto("/places");
    await page.getByRole("link", { name: "Review before submitting" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Review before you submit" })).toBeVisible();
    await expect(page.getByText(/does not upload anything/)).toBeVisible();
  });

  test("with no saved observations it says so and links to adding one", async ({ page }) => {
    await seed(page, []);
    await page.goto("/places/review");
    await expect(page.getByText("You have no saved observations to review.")).toBeVisible();
    await page.getByRole("link", { name: "Add an observation" }).first().click();
    await expect(page).toHaveURL(/\/places\/contribute$/);
  });

  test("lists what to look at, in words, and keeps UNKNOWN as UNKNOWN", async ({ page }) => {
    await seed(page);
    await page.goto("/places/review");
    const summary = page.getByTestId("review-summary");
    await expect(summary).toContainText("3 observations");
    const arena = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Sample Arena" }) });
    await expect(arena).toContainText("Look again");
    await expect(arena).toContainText("days old");
    await expect(arena).toContainText("does not say it was your own visit");
    const unnamed = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Place without a name" }) });
    await expect(unnamed).toContainText("The status is UNKNOWN. It stays UNKNOWN and no access tag is written.");
    await expect(page.locator("main")).not.toContainText(/\bapproved\b|\bcertified\b|\bis correct\b/i);
  });

  test("shows tag lines with no access tag for UNKNOWN", async ({ page }) => {
    await seed(page);
    await page.goto("/places/review");
    const tags = page.getByRole("textbox", { name: "Tag drafts" });
    await expect(tags).toContainText("wheelchair=yes");
    await expect(tags).toContainText("Access status: UNKNOWN, so no access tag is written.");
    const value = await tags.inputValue();
    expect(value.match(/^wheelchair=/gm)?.length).toBe(2);
    expect(value).not.toMatch(/wheelchair=UNKNOWN/);
  });

  test("leaving an observation out removes it from the draft and survives a reload", async ({ page }) => {
    await seed(page);
    await page.goto("/places/review");
    await page.getByRole("checkbox", { name: "Leave Sample Library out of what I submit" }).check();
    await expect(page.getByRole("status").filter({ hasText: "Sample Library is now left out of the draft files." })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Tag drafts" })).not.toContainText("Sample Library");
    await page.reload();
    await expect(page.getByRole("checkbox", { name: "Leave Sample Library out of what I submit" })).toBeChecked();
    await expect(page.getByRole("textbox", { name: "Changeset comment" })).toContainText("for 2 places");
  });

  test("ticks steps, announces them, and keeps them on this device", async ({ page }) => {
    await seed(page);
    await page.goto("/places/review");
    await expect(page.getByTestId("review-progress")).toHaveText("0 of 8 steps ticked");
    await page.getByRole("checkbox", { name: /Done: Read the review of your observations/ }).check();
    await expect(page.getByTestId("review-progress")).toHaveText("1 of 8 steps ticked");
    await expect(page.getByRole("status").filter({ hasText: "Ticked: Read the review of your observations." })).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("review-progress")).toHaveText("1 of 8 steps ticked");
    const stored = await page.evaluate(() => window.localStorage.getItem("the-app-submit-review"));
    expect(JSON.parse(stored ?? "{}").ticks).toEqual({ review: true });
  });

  test("blocks an observation with an item to fix and holds back the later steps", async ({ page }) => {
    await seed(page, [{ ...DRAFTS()[0], id: "r9", observedOn: daysAgo(-5) }, ...DRAFTS().slice(1)]);
    await page.goto("/places/review");
    const bad = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Sample Library" }) });
    await expect(bad).toContainText("Fix before submitting");
    await expect(bad).toContainText("is after today");
    await expect(bad).toContainText("Not in the draft files until the items to fix are dealt with.");
    await expect(page.getByText("Wait: some observations still have an item to fix.").first()).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Tag drafts" })).not.toContainText("Sample Library");
  });

  test("downloads the draft and the list as files made on the device, with no request sent", async ({ page }) => {
    const writes: string[] = [];
    page.on("request", (request) => {
      if (request.method() !== "GET" && request.method() !== "HEAD") writes.push(`${request.method()} ${request.url()}`);
    });
    await seed(page);
    await page.goto("/places/review");
    const [draft] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download the draft (.txt)" }).click()]);
    expect(draft.suggestedFilename()).toMatch(/^observation-draft-\d{4}-\d{2}-\d{2}\.txt$/);
    const [list] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download the list of items (.csv)" }).click()]);
    expect(list.suggestedFilename()).toMatch(/^observation-review-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(writes).toEqual([]);
  });

  test("French shows the same screen with French punctuation and a decimal comma in the draft", async ({ page }) => {
    await seed(page);
    await page.evaluate(() => window.localStorage.setItem("the-app-language", "fr"));
    await page.goto("/places/review");
    await expect(page.getByRole("heading", { level: 1, name: "Revue avant de soumettre" })).toBeVisible();
    await expect(page.getByTestId("review-progress")).toHaveText("0 sur 8 étapes cochées");
    await expect(page.getByRole("textbox", { name: "Brouillons de balises" })).toContainText("43,856123");
    await expect(page.getByTestId("review-summary")).toContainText("3 observations :");
    await expect(page.locator("main")).not.toContainText("'");
  });

  test("has no accessibility violations in either language, and targets are at least 44 px", async ({ page }) => {
    await seed(page);
    for (const language of ["en", "fr"]) {
      await page.evaluate((value) => window.localStorage.setItem("the-app-language", value), language);
      await page.goto("/places/review");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    }
    const small = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>("main button, main a, main label.review-check"))
        .map((el) => ({ text: el.textContent?.trim().slice(0, 40), height: el.getBoundingClientRect().height }))
        .filter((item) => item.height > 0 && item.height < 44),
    );
    expect(small).toEqual([]);
  });

  test("can be used by keyboard alone", async ({ page }) => {
    await seed(page);
    await page.goto("/places/review");
    const box = page.getByRole("checkbox", { name: "Leave Sample Library out of what I submit" });
    await box.focus();
    await page.keyboard.press("Space");
    await expect(box).toBeChecked();
    await page.keyboard.press("Space");
    await expect(box).not.toBeChecked();
  });
});
