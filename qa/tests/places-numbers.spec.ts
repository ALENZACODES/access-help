import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Sample observations, measures and answers made up for these tests. The App ships with no places. */
const NOTES = [
  { id: "a1", lat: 43.85, lon: -79.43, name: "Sample Library", wheelchair: "limited", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-10" },
  { id: "a2", lat: 43.86, lon: -79.43, name: "Sample Arena", wheelchair: "no", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-11" },
  { id: "a3", lat: 43.87, lon: -79.43, name: null, wheelchair: "UNKNOWN", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-12" },
];
const blank = { measuredOn: "2026-11-12", method: "tape", steps: null, stepHeightCm: null, doorWidthCm: null, doorOpening: null, ramp: null, toilet: null, toiletDoorCm: null };
const MEASURES = { version: 1, entries: [{ ...blank, recordId: "a1", steps: 0, doorWidthCm: 90 }, { ...blank, recordId: "a2", steps: 3, doorWidthCm: 76, ramp: "yes" }] };
const TOLD = { version: 1, entries: [{ ...blank, recordId: "a3", method: null, steps: 0, doorWidthCm: 85 }] };

const stored = (page: Page, key: string) => page.evaluate((k) => window.localStorage.getItem(k), key);

async function seed(page: Page, notes: unknown[] = NOTES) {
  await page.goto("/");
  await page.evaluate(
    ([items, measures, told]) => {
      window.localStorage.removeItem("the-app-match-sets");
      window.localStorage.removeItem("the-app-match-current");
      window.localStorage.setItem("the-app-place-drafts", JSON.stringify(items));
      window.localStorage.setItem("the-app-place-measures", JSON.stringify(measures));
      window.localStorage.setItem("the-app-place-told", JSON.stringify(told));
    },
    [notes, MEASURES, TOLD] as const,
  );
  await page.goto("/places/numbers");
}

async function setSimple(page: Page) {
  await seed(page);
  await page.getByLabel("Steps at the entrance, at most").fill("0");
  await page.getByLabel("Entrance door, at least this wide").fill("80");
  await page.getByRole("button", { name: "Look through my places" }).click();
}

test.describe("my places against my numbers", () => {
  test("is reachable from the places menu and says the numbers are the person's own", async ({ page }) => {
    await seed(page);
    await page.goto("/places");
    await page.getByRole("link", { name: "My numbers", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "My places against my numbers" })).toBeVisible();
    await expect(page.getByTestId("match-yours")).toContainText("The App suggests none, holds no standard and does not say who can use a place.");
  });

  test("shows a calm empty state", async ({ page }) => {
    await seed(page, []);
    await expect(page.getByText("You have no saved observations.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Look through my places" })).toHaveCount(0);
  });

  test("starts with every number empty and asks for one before showing a result", async ({ page }) => {
    await seed(page);
    for (const label of ["Steps at the entrance, at most", "Highest step, at most", "Entrance door, at least this wide", "Toilet door, at least this wide"]) await expect(page.getByLabel(label)).toHaveValue("");
    await expect(page.getByLabel("How the door opens")).toHaveValue("any");
    await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(0);
    await expect(page.getByTestId("match-set-first")).toHaveText("Set at least one number to look through your places.");
    await expect(page.getByRole("button", { name: /Download/ })).toHaveCount(0);
  });

  test("sorts the places into three groups and never counts UNKNOWN either way", async ({ page }) => {
    await setSimple(page);
    await expect(page.locator(".places-notice")).toHaveText("Looked through your places. Places looked through: 3. Within every number: 1. Outside a number: 1. Cannot be said: 1.");
    await expect(page.getByTestId("match-numbers").getByRole("listitem")).toHaveText(["No step at the entrance", "Entrance door at least 80 cm wide"]);
    await expect(page.getByTestId("match-group-fits")).toContainText("Within every number you set (1)");
    await expect(page.getByTestId("match-group-fits")).toContainText("Sample Library");
    await expect(page.getByTestId("match-group-fits")).toContainText("Entrance door at least 80 cm wide: 90 cm, 10 cm more than the number you set.");
    await expect(page.getByTestId("match-group-cannot-say")).toContainText("Place without a name");
    await expect(page.getByTestId("match-group-cannot-say")).toContainText("No step at the entrance: UNKNOWN.");
    await expect(page.getByTestId("match-group-cannot-say")).toContainText("Tier: UNKNOWN.");
    await expect(page.getByTestId("match-group-does-not-fit")).toContainText("Sample Arena");
    await expect(page.getByTestId("match-group-does-not-fit")).toContainText("76 cm, 4 cm less than the number you set.");
    await expect(page.getByTestId("match-tally")).toContainText("UNKNOWN at 1 place: number of steps.");
  });

  test("lets a ramp stand in for the step limit only when the person says so", async ({ page }) => {
    await seed(page);
    await page.getByLabel("Steps at the entrance, at most").fill("0");
    await page.getByRole("button", { name: "Look through my places" }).click();
    await expect(page.getByTestId("match-group-does-not-fit")).toContainText("No step at the entrance: 3 steps.");
    await page.getByRole("checkbox", { name: "A ramp counts in place of the step limits" }).check();
    await page.getByRole("button", { name: "Look through my places" }).click();
    await expect(page.getByTestId("match-group-fits")).toContainText("Sample Arena");
    await expect(page.getByTestId("match-group-fits")).toContainText("No step at the entrance, or a ramp: there is a ramp.");
    await expect(page.getByTestId("match-group-does-not-fit")).toHaveCount(0);
  });

  test("uses what a place said only when asked to, and marks it", async ({ page }) => {
    await setSimple(page);
    await expect(page.getByTestId("match-told-note")).toHaveCount(0);
    await page.getByRole("checkbox", { name: /use what the place told me/ }).check();
    await page.getByRole("button", { name: "Look through my places" }).click();
    await expect(page.getByTestId("match-told-note")).toContainText("Your own measure always comes first.");
    await expect(page.getByTestId("match-group-cannot-say")).toHaveCount(0);
    await expect(page.getByTestId("match-group-fits")).toContainText("Place without a name");
    await expect(page.getByTestId("match-group-fits")).toContainText("This comes from what the place said, not from your own measure.");
  });

  test("refuses a number it cannot read and keeps the result as it was", async ({ page }) => {
    await setSimple(page);
    await page.getByLabel("Entrance door, at least this wide").fill("wide");
    await page.getByRole("button", { name: "Look through my places" }).click();
    await expect(page.locator("#match-minDoorWidth-error")).toHaveText("Write a length, such as 80, 80.5 cm or 32 in, or leave it empty.");
    await expect(page.getByLabel("Entrance door, at least this wide")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByTestId("match-numbers").getByRole("listitem")).toHaveText(["No step at the entrance", "Entrance door at least 80 cm wide"]);
  });

  test("reads inches and keeps the numbers across a reload", async ({ page }) => {
    await seed(page);
    await page.getByLabel("Entrance door, at least this wide").fill("32 in");
    await page.getByRole("button", { name: "Look through my places" }).click();
    await expect(page.getByTestId("match-numbers")).toHaveText("Entrance door at least 81.3 cm wide");
    await page.reload();
    await expect(page.getByLabel("Entrance door, at least this wide")).toHaveValue("81.3");
    await expect(page.getByTestId("match-group-does-not-fit")).toContainText("Sample Arena");
  });

  test("saves a named set, uses it again and removes it", async ({ page }) => {
    await setSimple(page);
    await expect(page.getByText("You have no saved set.")).toBeVisible();
    await page.getByRole("button", { name: "Save these numbers as a set" }).click();
    await expect(page.locator("#match-set-problem")).toHaveText("Give the set a name first.");
    await page.getByLabel("Name for these numbers").fill("Manual chair");
    await page.getByRole("button", { name: "Save these numbers as a set" }).click();
    await expect(page.locator(".places-notice")).toHaveText("Saved the set Manual chair.");
    await page.getByRole("button", { name: "Clear my numbers" }).click();
    await expect(page.locator(".places-notice")).toHaveText("Your numbers are cleared.");
    await expect(page.getByTestId("match-set-first")).toBeVisible();
    await expect(page.getByLabel("Steps at the entrance, at most")).toHaveValue("");
    await page.getByRole("button", { name: "Use this set" }).click();
    await expect(page.locator(".places-notice")).toContainText("Using the set Manual chair. Places looked through: 3.");
    await expect(page.getByLabel("Entrance door, at least this wide")).toHaveValue("80");
    await page.getByRole("button", { name: "Remove this set" }).click();
    await expect(page.locator(".places-notice")).toHaveText("Removed the set Manual chair.");
    expect(await stored(page, "the-app-match-sets")).toBeNull();
  });

  test("never changes the observations, the measures or what places said", async ({ page }) => {
    await seed(page);
    const before = await Promise.all(["the-app-place-drafts", "the-app-place-measures", "the-app-place-told"].map((key) => stored(page, key)));
    await page.getByLabel("Steps at the entrance, at most").fill("0");
    await page.getByRole("checkbox", { name: /use what the place told me/ }).check();
    await page.getByRole("button", { name: "Look through my places" }).click();
    await expect(page.getByTestId("match-counts")).toBeVisible();
    expect(await Promise.all(["the-app-place-drafts", "the-app-place-measures", "the-app-place-told"].map((key) => stored(page, key)))).toEqual(before);
  });

  test("downloads the result as text and as CSV", async ({ page }) => {
    await setSimple(page);
    const [text] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download the result (.txt)" }).click()]);
    expect(text.suggestedFilename()).toMatch(/^places-against-my-numbers-\d{4}-\d{2}-\d{2}\.txt$/);
    const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download the result (.csv)" }).click()]);
    expect(csv.suggestedFilename()).toMatch(/^places-against-my-numbers-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  test("has no serious accessibility violations, with an error and with a result", async ({ page }) => {
    await setSimple(page);
    await expect(page.getByTestId("match-group-fits")).toBeVisible();
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(result.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
    await page.getByLabel("Steps at the entrance, at most").fill("x");
    await page.getByRole("button", { name: "Look through my places" }).click();
    await expect(page.locator("#match-maxSteps-error")).toBeVisible();
    const withError = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(withError.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  });

  test("shows French with a decimal comma and French spacing", async ({ page }) => {
    await seed(page);
    await page.getByRole("button", { name: "Français" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Mes lieux face à mes chiffres" })).toBeVisible();
    await page.getByLabel("Porte d’entrée, large d’au moins").fill("80,5");
    await page.getByRole("button", { name: "Examiner mes lieux" }).click();
    await expect(page.getByTestId("match-numbers")).toHaveText("Porte d’entrée large d’au moins 80,5 cm");
    await expect(page.getByTestId("match-counts")).toHaveText("Lieux examinés : 3. Dans tous les chiffres : 1. Hors d’un chiffre : 1. Impossible à dire : 1.");
    await expect(page.getByTestId("match-group-cannot-say")).toContainText("Impossible à dire : un fait est UNKNOWN (1)");
    await expect(page.getByLabel("Porte d’entrée, large d’au moins")).toHaveValue("80,5");
  });
});
