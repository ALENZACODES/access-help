import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Sample observations and measures made up for these tests, on fixed days. The App ships with no places. */
const NOTES = [
  { id: "a1", lat: 43.85, lon: -79.43, name: "Sample Library", wheelchair: "limited", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-10" },
  { id: "a2", lat: 43.86, lon: -79.43, name: null, wheelchair: "UNKNOWN", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-14" },
];
const MEASURES = {
  version: 1,
  entries: [{ recordId: "a1", measuredOn: "2026-11-12", method: "tape", steps: 2, stepHeightCm: 14, doorWidthCm: 82.5, doorOpening: null, ramp: null, toilet: null, toiletDoorCm: null }],
};

const stored = (page: Page, key: string) => page.evaluate((k) => window.localStorage.getItem(k), key);

async function seed(page: Page, notes: unknown[] = NOTES) {
  await page.goto("/");
  await page.evaluate(
    ([items, measures]) => {
      window.localStorage.removeItem("the-app-place-asks");
      window.localStorage.removeItem("the-app-place-told");
      window.localStorage.setItem("the-app-place-drafts", JSON.stringify(items));
      window.localStorage.setItem("the-app-place-measures", JSON.stringify(measures));
    },
    [notes, MEASURES] as const,
  );
  await page.goto("/places/ask");
}

async function chooseLibrary(page: Page) {
  await seed(page);
  await page.getByLabel("Observation", { exact: true }).selectOption("a1");
}

test.describe("ask a place", () => {
  test("is reachable from the places menu and says the draft holds nothing about the person", async ({ page }) => {
    await seed(page);
    await page.goto("/places");
    await page.getByRole("link", { name: "Ask a place", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Ask a place" })).toBeVisible();
    await expect(page.getByTestId("ask-privacy")).toContainText("The draft says nothing about you, your health or your body.");
    await expect(page.getByTestId("ask-privacy")).toContainText("The App sends nothing");
  });

  test("shows a calm empty state", async ({ page }) => {
    await seed(page, []);
    await expect(page.getByText("You have no saved observations.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Note that I asked" })).toHaveCount(0);
  });

  test("ticks every question for a place with no measures and drafts an email", async ({ page }) => {
    await seed(page);
    await expect(page.getByLabel("Observation", { exact: true })).toHaveValue("a2");
    await expect(page.getByRole("group", { name: "Questions to ask" }).getByRole("checkbox", { checked: true })).toHaveCount(7);
    await expect(page.getByLabel("Subject")).toHaveValue("A few questions about your entrance");
    await expect(page.getByLabel("Words to copy")).toHaveValue(/^Hello,\n\nI am planning a visit/);
    await expect(page.getByLabel("Words to copy")).toHaveValue(/7\. How wide is the clear opening of that toilet’s door, in centimetres\?/);
  });

  test("ticks only what is still UNKNOWN for a measured place, and marks the rest", async ({ page }) => {
    await chooseLibrary(page);
    const group = page.getByRole("group", { name: "Questions to ask" });
    await expect(group.getByRole("checkbox", { checked: true })).toHaveCount(4);
    await expect(group.getByRole("checkbox", { name: /How many steps.*you measured this/ })).not.toBeChecked();
    await expect(page.getByLabel("Subject")).toHaveValue("A few questions about the entrance at Sample Library");
    await expect(page.getByLabel("Words to copy")).toHaveValue(/1\. Does the entrance door open by itself, with a button, or by hand\?/);
    await expect(page.getByLabel("Words to copy")).not.toHaveValue(/How many steps/);
  });

  test("changes the draft with the questions, the way of asking and the language", async ({ page }) => {
    await chooseLibrary(page);
    await page.getByRole("checkbox", { name: /Is there a ramp/ }).uncheck();
    await expect(page.getByLabel("Words to copy")).not.toHaveValue(/ramp/);
    await page.getByRole("radio", { name: "Phone call" }).check();
    await expect(page.getByLabel("Subject")).toHaveCount(0);
    await expect(page.getByLabel("Words to copy")).toHaveValue(/Is now a good time\?/);
    await expect(page.getByLabel("Words to copy")).toHaveValue(/Answer: ____________/);
    await page.getByRole("radio", { name: "Short message or contact form" }).check();
    await expect(page.getByLabel("Words to copy")).not.toHaveValue(/\n/);
    await page.getByRole("radio", { name: "French", exact: true }).check();
    await expect(page.getByLabel("Words to copy")).toHaveValue(/^Bonjour, je prépare une visite/);
    await page.getByRole("radio", { name: "English and French" }).check();
    await expect(page.getByLabel("Words to copy")).toHaveValue(/^Hello, I am planning[^]*\n\nBonjour, je prépare/);
  });

  test("says to choose a question when none is ticked, and refuses to note an ask", async ({ page }) => {
    await chooseLibrary(page);
    const ticked = page.getByRole("group", { name: "Questions to ask" }).getByRole("checkbox", { checked: true });
    // The list of ticked boxes shrinks with every untick, so always take the first one left.
    while ((await ticked.count()) > 0) await ticked.first().uncheck();
    await expect(page.getByTestId("ask-draft-note")).toHaveText("Choose at least one question to get a draft.");
    await expect(page.getByLabel("Words to copy")).toHaveCount(0);
    await page.getByRole("button", { name: "Note that I asked" }).click();
    await expect(page.locator("#ask-asked-problem")).toHaveText("Choose at least one question first.");
    expect(await stored(page, "the-app-place-asks")).toBeNull();
  });

  test("notes an ask, counts the days, and lets the person close, reopen and remove it", async ({ page }) => {
    await chooseLibrary(page);
    await page.getByLabel("Day you asked").fill("2026-11-15");
    await page.getByRole("button", { name: "Note that I asked" }).click();
    await expect(page.locator(".places-notice")).toHaveText("Noted: you asked Sample Library on 2026-11-15.");
    await expect(page.getByTestId("ask-counts")).toHaveText("Times you asked: 1. Waiting: 1. Answered: 0. No reply: 0.");
    await expect(page.getByTestId("ask-list").getByRole("listitem")).toContainText("Asked on 2026-11-15. How: email.");
    await expect(page.getByTestId("ask-list").getByRole("listitem")).toContainText("Waiting for an answer. Days since you asked:");
    await page.getByRole("button", { name: "Mark ask 1 as answered" }).click();
    await expect(page.getByTestId("ask-counts")).toHaveText("Times you asked: 1. Waiting: 0. Answered: 1. No reply: 0.");
    await expect(page.getByTestId("ask-list")).toContainText("You said it was answered. Closed on");
    await page.getByRole("button", { name: "Set ask 1 back to waiting" }).click();
    await expect(page.getByTestId("ask-counts")).toContainText("Waiting: 1.");
    await page.getByRole("button", { name: "Remove ask 1" }).click();
    await expect(page.locator(".places-notice")).toHaveText("Ask 1 removed.");
    await expect(page.getByText("You have not noted an ask for this place.")).toBeVisible();
    expect(await stored(page, "the-app-place-asks")).toBeNull();
  });

  test("refuses an ask dated after today", async ({ page }) => {
    await chooseLibrary(page);
    await page.getByLabel("Day you asked").fill("2099-01-01");
    await page.getByRole("button", { name: "Note that I asked" }).click();
    await expect(page.locator("#ask-asked-problem")).toHaveText("The day is after today.");
    await expect(page.getByLabel("Day you asked")).toHaveAttribute("aria-invalid", "true");
  });

  test("saves what the place said apart from the measures and sets the two side by side", async ({ page }) => {
    await chooseLibrary(page);
    const before = await stored(page, "the-app-place-measures");
    await page.getByLabel("Day the place answered").fill("2026-11-16");
    await page.getByLabel("Steps at the entrance").fill("2");
    await page.getByLabel("Clear width of the entrance door").fill("90");
    await page.getByLabel("Ramp", { exact: true }).selectOption("yes");
    await page.getByRole("button", { name: "Save what the place said" }).click();
    await expect(page.locator(".places-notice")).toHaveText("Saved what Sample Library said.");
    const table = page.getByTestId("ask-compare-table");
    await expect(table.getByRole("row", { name: /^Number of steps/ })).toContainText("The same");
    await expect(table.getByRole("row", { name: /^Width of the entrance door/ })).toContainText("82.5 cm (32.5 in)");
    await expect(table.getByRole("row", { name: /^Width of the entrance door/ })).toContainText("Differs. The place said 7.5 cm more than you measured.");
    await expect(table.getByRole("row", { name: /^Ramp/ })).toContainText("Only the place said it");
    await expect(table.getByRole("row", { name: /^Wheelchair toilet/ })).toContainText("UNKNOWN from both");
    await expect(page.getByTestId("ask-compare-summary")).toContainText("The same: 1. Different: 1. Only you: 1. Only the place: 1. UNKNOWN from both: 3.");
    expect(await stored(page, "the-app-place-measures")).toBe(before);
    expect(JSON.parse((await stored(page, "the-app-place-told")) ?? "{}").entries[0]).toMatchObject({ recordId: "a1", doorWidthCm: 90, ramp: "yes", toilet: null });
    await expect(page.getByTestId("ask-told-note")).toContainText("never among the tags for OpenStreetMap");
    await expect(page.locator("textarea")).not.toHaveValue(/wheelchair:description|toilets:wheelchair/);
  });

  test("refuses an answer it cannot read and removes a saved one", async ({ page }) => {
    await chooseLibrary(page);
    await page.getByLabel("Clear width of the entrance door").fill("wide");
    await page.getByRole("button", { name: "Save what the place said" }).click();
    await expect(page.locator("#ask-doorWidth-error")).toHaveText("Write a length, such as 82, 82.5 cm or 32 in.");
    expect(await stored(page, "the-app-place-told")).toBeNull();
    await page.getByLabel("Clear width of the entrance door").fill("90");
    await page.getByRole("button", { name: "Save what the place said" }).click();
    await expect(page.getByRole("button", { name: "Remove what the place said" })).toBeVisible();
    await page.getByRole("button", { name: "Remove what the place said" }).click();
    await expect(page.locator(".places-notice")).toHaveText("Removed what Sample Library said.");
    expect(await stored(page, "the-app-place-told")).toBeNull();
  });

  test("downloads the draft, the sheet and the CSV", async ({ page }) => {
    await chooseLibrary(page);
    const [draft] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download the draft (.txt)" }).click()]);
    expect(draft.suggestedFilename()).toMatch(/^ask-email-\d{4}-\d{2}-\d{2}\.txt$/);
    await page.getByRole("button", { name: "Note that I asked" }).click();
    const [sheet] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download this sheet (.txt)" }).click()]);
    expect(sheet.suggestedFilename()).toBe("asked-a1.txt");
    const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download all my asks (.csv)" }).click()]);
    expect(csv.suggestedFilename()).toMatch(/^asks-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  test("makes no request to another host while drafting and noting an ask", async ({ page }) => {
    const other: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (!["localhost", "127.0.0.1"].includes(url.hostname) && url.protocol !== "data:" && url.protocol !== "blob:") other.push(request.url());
    });
    await chooseLibrary(page);
    await page.getByRole("radio", { name: "Phone call" }).check();
    await page.getByRole("button", { name: "Note that I asked" }).click();
    await expect(page.getByTestId("ask-list")).toBeVisible();
    expect(other).toEqual([]);
  });

  test("has no serious accessibility violations with an ask, an error and an answer shown", async ({ page }) => {
    await chooseLibrary(page);
    await page.getByRole("button", { name: "Note that I asked" }).click();
    await page.getByLabel("Steps at the entrance").fill("x");
    await page.getByRole("button", { name: "Save what the place said" }).click();
    await expect(page.locator("#ask-steps-error")).toBeVisible();
    const withError = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(withError.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
    await page.getByLabel("Steps at the entrance").fill("2");
    await page.getByRole("button", { name: "Save what the place said" }).click();
    await expect(page.locator(".places-notice")).toHaveText("Saved what Sample Library said.");
    const saved = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(saved.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  });

  test("shows French with French spacing and drafts in French by default", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Français" }).click();
    await page.evaluate(
      ([items, measures]) => {
        window.localStorage.removeItem("the-app-place-asks");
        window.localStorage.removeItem("the-app-place-told");
        window.localStorage.setItem("the-app-place-drafts", JSON.stringify(items));
        window.localStorage.setItem("the-app-place-measures", JSON.stringify(measures));
      },
      [NOTES, MEASURES] as const,
    );
    await page.goto("/places/ask");
    await expect(page.getByRole("heading", { level: 1, name: "Demander à un lieu" })).toBeVisible();
    await page.getByLabel("Observation", { exact: true }).selectOption("a1");
    await expect(page.getByRole("radio", { name: "Français", exact: true })).toBeChecked();
    await expect(page.getByLabel("Objet")).toHaveValue("Quelques questions sur l’entrée de Sample Library");
    await expect(page.getByLabel("Mots à copier")).toHaveValue(/^Bonjour,/);
    await page.getByRole("button", { name: "Noter que j’ai demandé" }).click();
    await expect(page.getByTestId("ask-counts")).toHaveText("Demandes faites : 1. En attente : 1. Avec réponse : 0. Sans réponse : 0.");
    await expect(page.getByTestId("ask-compare-table").getByRole("row", { name: /^Largeur de la porte d’entrée/ })).toContainText("82,5 cm (32,5 po)");
  });
});
