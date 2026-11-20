import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function violations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

const noOverflow = (page: Page): Promise<boolean> => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

for (const width of [1280, 320]) {
  test(`wording: the check opens from the page's own link and is clean at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await page.getByRole("link", { name: "Wording" }).click();
    await expect(page).toHaveURL(/#wording$/);
    await expect(page.getByRole("heading", { level: 1, name: "Check my wording" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Wording" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByLabel("Text to check")).toBeVisible();
    expect(await violations(page)).toEqual([]);
    expect(await noOverflow(page)).toBe(true);
  });
}

test("wording: words the App does not use are listed with a reason and what to write", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/#wording");
  const box = page.getByLabel("Text to check");
  await box.fill("Verified by a partner. This place is safe to enter.");
  await page.getByRole("button", { name: "Check the wording" }).click();
  await expect(page.locator("[data-gl-wc-msg]")).toHaveText("There are 3 things to look at.");
  await expect(box).toBeFocused();
  await expect(box).toHaveValue("Verified by a partner. This place is safe to enter.");
  await expect(page.getByRole("heading", { level: 2, name: "What the check found" })).toBeVisible();
  await expect(page.locator('ul[data-kind="word"] > li')).toHaveCount(2);
  await expect(page.locator('ul[data-kind="claim"] > li')).toHaveCount(1);
  await expect(page.locator('li[data-rule="no-partnership-claim"]')).toContainText("Name the source of the information.");
  await expect(page.locator(".gl-wc")).toContainText("It cannot tell whether the text is true.");
  expect(await violations(page)).toEqual([]);
  expect(await noOverflow(page)).toBe(true);
});

test("wording: honest text gets no advice, and the tool does not say the text passed", async ({ page }) => {
  await page.goto("/#wording");
  await page.getByLabel("Text to check").fill("One source reports a ramp. The record is dated 2026-06-01.");
  await page.getByRole("button", { name: "Check the wording" }).click();
  await expect(page.locator("[data-gl-wc-msg]")).toHaveText("Nothing to change was found.");
  await expect(page.locator("ul.gl-wc-list")).toHaveCount(0);
  await expect(page.locator(".gl-wc")).not.toContainText(/passed|approved|correct/i);
  await page.getByRole("button", { name: "Check the wording" }).click();
  await expect(page.getByLabel("Text to check")).toHaveValue("One source reports a ramp. The record is dated 2026-06-01.");
});

test("wording: an empty box asks for text, and Clear empties the box and the results", async ({ page }) => {
  await page.goto("/#wording");
  await page.getByRole("button", { name: "Check the wording" }).click();
  await expect(page.locator("[data-gl-wc-msg]")).toHaveText("Type some text first.");
  await page.getByLabel("Text to check").fill("Verified.");
  await page.getByRole("button", { name: "Check the wording" }).click();
  await expect(page.locator("ul.gl-wc-list")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear the text" }).click();
  await expect(page.getByLabel("Text to check")).toHaveValue("");
  await expect(page.getByLabel("Text to check")).toBeFocused();
  await expect(page.locator("ul.gl-wc-list")).toHaveCount(0);
  await expect(page.locator("[data-gl-wc-msg]")).toHaveText("The text was cleared.");
});

test("wording: in French the spacing can be fixed in the box, and English words of the list are named", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/#wording");
  await page.getByLabel("French", { exact: true }).check();
  await expect(page.getByRole("heading", { level: 1, name: "Contrôler ma formulation" })).toBeVisible();
  const box = page.getByLabel("Texte à contrôler");
  await box.fill("Le washroom: ouvert! L'entrée est ici.");
  await page.getByRole("button", { name: "Contrôler la formulation" }).click();
  await expect(page.locator('ul[data-kind="spacing"] > li')).toHaveCount(3);
  await expect(page.locator('ul[data-kind="language"] > li')).toContainText("Toilettes");
  await page.getByRole("button", { name: "Corriger les espaces du français" }).click();
  await expect(box).toHaveValue("Le washroom\u00a0: ouvert\u202f! L\u2019entrée est ici.");
  await expect(page.locator('ul[data-kind="spacing"]')).toHaveCount(0);
  await expect(page.locator('ul[data-kind="language"] > li')).toHaveCount(1);
  expect(await violations(page)).toEqual([]);
  expect(await noOverflow(page)).toBe(true);
});

test("wording: the text and the advice follow a change of language", async ({ page }) => {
  await page.goto("/#wording");
  await page.getByLabel("Text to check").fill("Vérifié par la ville.");
  await page.getByRole("button", { name: "Check the wording" }).click();
  await expect(page.locator('li[data-rule="no-verification-claim"]')).toContainText("Say what the source reports");
  await page.getByLabel("French", { exact: true }).check();
  await expect(page.getByLabel("Texte à contrôler")).toHaveValue("Vérifié par la ville.");
  await expect(page.locator('li[data-rule="no-verification-claim"]')).toContainText("Dites ce que la source signale");
  await expect(page.locator(".gl-wc")).toHaveAttribute("lang", "fr-CA");
});

test("wording: the advice can be saved as a text file, and nothing is kept after a reload", async ({ page }) => {
  await page.goto("/#wording");
  await expect(page.getByRole("button", { name: "Save this advice as text" })).toHaveCount(0);
  await page.getByLabel("Text to check").fill("Verified by the city.");
  await page.getByRole("button", { name: "Check the wording" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save this advice as text" }).click();
  expect((await download).suggestedFilename()).toBe("wording-advice-en.txt");
  const stored = await page.evaluate(() => JSON.stringify({ ...window.localStorage }) + JSON.stringify({ ...window.sessionStorage }));
  expect(stored).not.toContain("Verified by the city");
  await page.reload();
  await expect(page.getByLabel("Text to check")).toHaveValue("");
  await expect(page.locator("ul.gl-wc-list")).toHaveCount(0);
});

test("wording: the terms page shows the tier of a source and the data labels as they are", async ({ page }) => {
  await page.goto("/#terms");
  await expect(page.getByRole("heading", { level: 3, name: "Source tier" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "PROTOTYPE-UNVERIFIED" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/verification tier/i);
  await page.getByLabel("French", { exact: true }).check();
  await expect(page.getByRole("heading", { level: 3, name: "Niveau de la source" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/niveau de vérification/i);
  await expect(page.getByRole("heading", { level: 3, name: "Dernier contrôle" })).toBeVisible();
});
