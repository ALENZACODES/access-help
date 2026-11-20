import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Correcting a note and undoing a removal, in a real browser and by keyboard
 * only: the note opens in the form with its own values, the correction is saved
 * in place and its changes are listed on the note, a removed note can be put
 * back with "Undo" at once, and the notes can be downloaded as a spreadsheet.
 * One test per language.
 */
const NOTES_KEY = "app.onboarding.notes.v1";
const CORRECTIONS_KEY = "app.onboarding.corrections.v1";
const BIN_KEY = "app.onboarding.bin.v1";
const NOTE = {
  id: "own1",
  placeName: "Library",
  address: "1 Main St",
  createdOn: "2026-11-01",
  licence: "CC0-1.0",
  facts: [{ key: "elevator", value: "yes", provenance: { source: "Contributor report", licence: "CC0-1.0", recordedOn: "2026-11-01" } }],
};

const COPY = {
  en: {
    switchTo: "English",
    notes: "Notes",
    correct: "Correct this note",
    title: "Correct a note",
    elevatorNo: "No",
    submit: "Save the correction",
    corrected: "The note was corrected.",
    history: /^Changes to this note \(1\)$/,
    change: "Elevator: Yes → No",
    undo: "Undo: put the note back",
    csv: "Download my notes as a spreadsheet (CSV)",
  },
  fr: {
    switchTo: "Français",
    notes: "Notes",
    correct: "Corriger cette note",
    title: "Corriger une note",
    elevatorNo: "Non",
    submit: "Enregistrer la correction",
    corrected: "La note a été corrigée.",
    history: /^Modifications de cette note \(1\)$/,
    change: "Ascenseur\u00A0: Oui → Non",
    undo: "Annuler\u00A0: remettre la note",
    csv: "Télécharger mes notes en tableur (CSV)",
  },
} as const;

async function axeClean(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).include(".app").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

async function press(control: Locator): Promise<void> {
  await control.focus();
  await control.press("Enter");
}

const stored = async (page: Page, key: string): Promise<unknown[]> => JSON.parse((await page.evaluate((k) => window.localStorage.getItem(k), key)) ?? "[]") as unknown[];

for (const language of ["en", "fr"] as const) {
  test(`correcting a note and undoing a removal work by keyboard in ${language === "en" ? "English" : "Français"}`, async ({ page }) => {
    test.setTimeout(120_000);
    const c = COPY[language];
    await page.goto("/");
    if (!(await page.evaluate(() => document.documentElement.lang)).startsWith(language)) {
      await page.getByRole("group", { name: /^(Language|Langue)$/ }).getByRole("button", { name: c.switchTo, exact: true }).click();
      await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toMatch(new RegExp(`^${language}`));
    }
    await page.evaluate(([key, note]) => window.localStorage.setItem(key as string, JSON.stringify([note])), [NOTES_KEY, NOTE] as const);
    await page.goto("/onboarding/first-run");
    const shell = page.locator(".app").first();
    await press(shell.getByRole("navigation").getByRole("button", { name: c.notes, exact: true }));

    // Correct: the form opens with the note's own values.
    await press(shell.getByRole("button", { name: c.correct, exact: true }));
    await expect(shell.getByRole("heading", { level: 2 })).toHaveText(c.title);
    await expect(shell.locator("#f-placeName")).toHaveValue("Library");
    await axeClean(page);
    await shell.locator('input[name="detail-elevator"][value="no"]').check();
    await press(shell.getByRole("button", { name: c.submit, exact: true }));
    await expect(shell.getByText(c.corrected, { exact: true }).first()).toBeAttached();
    const corrections = (await stored(page, CORRECTIONS_KEY)) as Array<{ noteId: string; parts: string[] }>;
    expect(corrections.map((x) => [x.noteId, x.parts])).toEqual([["own1", ["elevator"]]]);

    // The change is listed on the note.
    const history = shell.locator("[data-note-history]");
    await press(history.locator("summary"));
    await expect(history.locator("summary")).toHaveText(c.history);
    await expect(history.locator("li li")).toHaveText([c.change]);
    const summaryBox = await history.locator("summary").boundingBox();
    expect(summaryBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    await axeClean(page);

    // Remove, then Undo straight away.
    await press(shell.locator('[data-action="remove-note"][data-value="own1"]'));
    await press(shell.locator('[data-action="confirm-remove"][data-value="own1"]'));
    const undo = shell.getByRole("button", { name: c.undo, exact: true });
    await expect(undo).toBeFocused();
    expect((await stored(page, NOTES_KEY)).length).toBe(0);
    expect((await stored(page, BIN_KEY)).length).toBe(1);
    await page.keyboard.press("Enter");
    await expect.poll(async () => (await stored(page, NOTES_KEY)).length).toBe(1);
    expect(await page.evaluate((k) => window.localStorage.getItem(k), BIN_KEY)).toBeNull();

    // The spreadsheet link is there and is a CSV file.
    const csv = shell.getByRole("link", { name: c.csv, exact: true });
    expect(await csv.getAttribute("href")).toMatch(/^data:text\/csv;charset=utf-8,/);
    expect(await csv.getAttribute("download")).toMatch(/^notes-\d{4}-\d{2}-\d{2}(-fr)?\.csv$/);
  });
}
