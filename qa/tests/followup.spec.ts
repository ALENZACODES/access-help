import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  page.on("request", (request) => {
    const { hostname } = new URL(request.url());
    if (hostname !== "127.0.0.1" && hostname !== "localhost") {
      throw new Error(`Unexpected request to ${request.url()}`);
    }
  });
});

test("an incomplete question is refused with a focused summary that names each field", async ({ page }) => {
  await page.goto("/team/follow-up");
  await expect(page.getByRole("heading", { level: 1, name: "Demo follow-up" })).toBeVisible();
  await expect(page.getByText("Write roles, not names.")).toBeVisible();
  await expectNoAxeViolations(page);

  await page.getByLabel("Question asked").fill("Synthetic question about seeded counts?");
  await page.getByLabel("Answer given in the room").fill("Reach the team at person@example.com.");
  await page.getByRole("button", { name: "Add to the log" }).click();

  const summary = page.getByRole("alert");
  await expect(summary).toBeFocused();
  await expect(summary.getByRole("link")).toHaveText([
    "Only record a question SCIO agreed can be recorded.",
    "Remove the email address, phone number, or postal code.",
    "Choose whether a follow-up was promised.",
  ]);
  await expect(page.getByLabel("Answer given in the room")).toHaveAttribute("aria-invalid", "true");
  await expect(summary).not.toContainText("person@example.com");
  await expectNoAxeViolations(page);

  await summary.getByRole("link", { name: "Remove the email address, phone number, or postal code." }).click();
  await expect(page.getByLabel("Answer given in the room")).toBeFocused();
});

test("a deferred question is logged, triaged, copied out, and deleted by keyboard", async ({ page }) => {
  await page.goto("/team/follow-up");
  await page.getByLabel("Question asked").fill("Synthetic question about transit licences?");
  await page.getByLabel("Answer given in the room").fill("Synthetic answer: deferred, the terms are not settled.");
  await page.getByLabel("Deferred").check();
  await page.getByLabel("Follow-up promised").check();
  await page.getByLabel("Follow-up action").fill("Synthetic: send the licence position per source.");
  await page.getByLabel("Owner", { exact: true }).selectOption("builder");
  await page.getByLabel("Due date", { exact: true }).fill("2099-01-10");
  await page.getByLabel("SCIO agreed this question can be recorded.").check();
  await page.getByRole("button", { name: "Add to the log" }).press("Enter");

  await expect(page.getByRole("status").filter({ hasText: "Q01 added to the log." })).toBeAttached();
  await expect(page.getByRole("heading", { level: 3, name: "Q01" })).toBeVisible();
  await expect(page.getByText("Q01: the promised follow-up has no disposition yet.")).toBeVisible();

  const triage = page.getByRole("group", { name: "Triage for Q01" });
  await triage.getByLabel("Disposition").selectOption("needs-fresh-evidence");
  await triage.getByLabel("Owner").selectOption("builder");
  await triage.getByLabel("Due date").fill("2099-01-10");
  await expect(page.getByText("Every promised follow-up has a disposition, an owner, and a due date.")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { level: 3, name: "Q01" })).toBeVisible();

  const show = page.getByRole("button", { name: "Show the tracker as text" });
  await show.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Hide the tracker text" })).toHaveAttribute("aria-expanded", "true");
  const text = page.getByLabel("Tracker and questions log as Markdown");
  await expect(text).toHaveValue(/\| T-Q01 \| question Q01 \| Synthetic question about transit licences\? \| needs-fresh-evidence \| builder \| 2099-01-10 \|/);
  await expectNoAxeViolations(page);

  await page.getByRole("button", { name: "Delete Q01" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Yes, delete" })).toBeFocused();
  await page.getByRole("button", { name: "Cancel" }).press("Enter");
  await expect(page.getByRole("button", { name: "Delete Q01" })).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 2, name: "Questions log" })).toBeFocused();
  await expect(page.getByText("No questions are recorded on this device.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("No questions are recorded on this device.")).toBeVisible();
});

test("the desk works in French and at phone width without horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/about");
  await page.getByRole("button", { name: "Français" }).click();
  await page.getByRole("link", { name: "Suivi de la démonstration : registre des questions et suivi" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Suivi de la démonstration" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toMatch(/^fr/);
  await page.getByRole("button", { name: "Ajouter au registre" }).click();
  await expect(page.getByRole("alert").getByRole("link")).toHaveText([
    "Ne consignez qu'une question que Lésions Médullaires Ontario a accepté de faire consigner.",
    "Écrivez la question.",
    "Écrivez la réponse donnée, ou indiquez qu'elle a été reportée.",
    "Indiquez si un suivi a été promis.",
  ]);
  await expect(page.getByText("Only record a question SCIO agreed can be recorded.")).toHaveCount(0);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoAxeViolations(page);
});
