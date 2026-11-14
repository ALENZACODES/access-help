import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function axeClean(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  page.on("request", (request) => {
    const { hostname } = new URL(request.url());
    if (hostname !== "127.0.0.1" && hostname !== "localhost") throw new Error(`Unexpected request to ${request.url()}`);
  });
  await page.goto("/demo-record");
  await page.evaluate(() => window.localStorage.removeItem("the-app-demo-record"));
  await page.reload();
});

test("the demo-day record is outside the primary navigation and opens from About", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav.getByRole("link", { name: /demo/i })).toHaveCount(0);
  await page.goto("/about");
  await page.getByRole("link", { name: "Demo-day record on this device" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Demo-day record" })).toBeVisible();
  await expect(page.getByText("Nothing is uploaded or sent from this screen.")).toBeVisible();
  await axeClean(page);
});

test("a question without an answer, agreement, or reason is not added, and focus moves to the status", async ({ page }) => {
  await page.getByLabel("Question as asked").fill("Is the washroom data current?");
  await page.getByRole("button", { name: "Add question" }).click();
  const status = page.getByRole("status").filter({ hasText: "The question was not added." });
  await expect(status).toBeFocused();
  await expect(status).toContainText("Fix 3 problems below.");
  await expect(page.getByText("Keep a question only if SCIO agreed it can be recorded.").first()).toBeVisible();
  await expect(page.getByText("No question is recorded yet.")).toBeVisible();
  await axeClean(page);
});

test("an unconfirmed SCIO commitment is refused, a confirmed one reaches the note, and the record survives a reload", async ({ page }) => {
  await page.getByLabel("Build identifier that was demonstrated").fill("rc-example");
  await page.getByLabel("Date of the demonstration (YYYY-MM-DD)").fill("2026-11-14");
  await page.getByRole("checkbox", { name: "Human owner" }).check();
  await page.getByRole("checkbox", { name: "SCIO attendee" }).check();
  await page.getByLabel("Sections shown, one per line").fill("Place page\nWashroom finder");

  await page.getByLabel("Question as asked").fill("Could peers review entries?");
  await page.getByLabel("Answer given in the session").fill("Not answered in the session.");
  await page.getByRole("checkbox", { name: "SCIO agreed this question can be recorded" }).check();
  await page.getByRole("radio", { name: "Follow-up promised" }).check();
  await page.getByLabel("Follow-up action").fill("Decide whether to discuss peer review");
  await page.getByLabel("Due date (YYYY-MM-DD)").fill("2026-11-28");
  await page.getByRole("radio", { name: "SCIO" }).check();
  await page.getByRole("button", { name: "Add question" }).click();
  await expect(page.getByText("A commitment by SCIO is recorded only after the human owner confirms SCIO made it.").first()).toBeVisible();

  await page.getByRole("checkbox", { name: "The human owner confirms SCIO made this commitment" }).check();
  await page.getByRole("button", { name: "Add question" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Question added. 1 recorded." })).toBeFocused();

  const note = page.getByLabel("Thank-you note draft text");
  await expect(note).toHaveValue(/We showed build rc-example\./);
  await expect(note).toHaveValue(/You said you would:\n- Decide whether to discuss peer review/);
  await expect(note).toHaveValue(/SCIO has not endorsed the App/);

  await page.reload();
  await expect(page.getByText("Could peers review entries?")).toBeVisible();
  await axeClean(page);
});

test("endorsement wording in an answer blocks the note", async ({ page }) => {
  await page.getByLabel("Question as asked").fill("Is this official?");
  await page.getByLabel("Answer given in the session").fill("It is endorsed by SCIO.");
  await page.getByRole("checkbox", { name: "SCIO agreed this question can be recorded" }).check();
  await page.getByLabel("Why no follow-up is needed").fill("Answered in the session.");
  await page.getByRole("button", { name: "Add question" }).click();
  await expect(page.getByText("Remove the endorsement, eligibility, compliance, or health claim.").first()).toBeVisible();
  await expect(page.getByText("No question is recorded yet.")).toBeVisible();
});

test("removing the record asks first, keeps focus, and works in French", async ({ page }) => {
  await page.getByRole("button", { name: "Français" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Registre de la journée de démonstration" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", /^fr/);
  await page.getByRole("button", { name: "Supprimer ce registre de cet appareil" }).click();
  await expect(page.getByRole("button", { name: "Garder le registre" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Supprimer ce registre de cet appareil" })).toBeFocused();
  await page.getByRole("button", { name: "Supprimer ce registre de cet appareil" }).click();
  await page.getByRole("button", { name: "Supprimer le registre", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Le registre a été supprimé de cet appareil." })).toBeFocused();
  await axeClean(page);
  await page.getByRole("button", { name: "English" }).click();
});

test("the demo-day record does not scroll sideways at 320 pixels", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.getByRole("radio", { name: "Follow-up promised" }).check();
  await page.getByRole("radio", { name: "SCIO" }).check();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
