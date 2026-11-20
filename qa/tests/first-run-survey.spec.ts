import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The survey walk in the first-run shell, in a real browser and by keyboard
 * only: add places, choose the licence, answer one question per screen, skip
 * the rest of a place, then save from the review. Every answer button is at
 * least 44 by 44 pixels, focus stays where the person is working, and each
 * screen passes axe. One test per language.
 */
const COPY = {
  en: {
    switchTo: "English",
    notes: "Notes",
    addNote: "Add a note",
    survey: "Survey several places, one question at a time",
    name: "Place name",
    address: "Address (optional)",
    licence: "Licence for your answers",
    date: "Date of your visit",
    start: "Start asking",
    first: "Place 1 of 2: Library",
    yes: "Yes",
    no: "No",
    notSure: "Not sure (stays Unknown)",
    leave: "Skip the rest of this place",
    review: "Look over your answers before saving",
    save: "Save 1 note",
    saved: "Saved 1 note. 1 place had no Yes or No answer and was not saved.",
    myNotes: "My notes",
  },
  fr: {
    switchTo: "Français",
    notes: "Notes",
    addNote: "Ajouter une note",
    survey: "Faire un relevé de plusieurs lieux, une question à la fois",
    name: "Nom du lieu",
    address: "Adresse (facultatif)",
    licence: "Licence de vos réponses",
    date: "Date de votre visite",
    start: "Commencer les questions",
    first: "Lieu 1 sur 2 : Library",
    yes: "Oui",
    no: "Non",
    notSure: "Je ne sais pas (reste UNKNOWN)",
    leave: "Passer le reste de ce lieu",
    review: "Relisez vos réponses avant d’enregistrer",
    save: "Enregistrer 1 note",
    saved: "1 note enregistrée. 1 lieu n’avait aucune réponse Oui ou Non et n’a pas été enregistré.",
    myNotes: "Mes notes",
  },
} as const;

async function axeClean(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).include(".app").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

/** Moves focus to a control and presses Enter: what a keyboard or switch user does. */
async function press(control: Locator): Promise<void> {
  await control.focus();
  await control.press("Enter");
}

async function bigEnough(control: Locator): Promise<void> {
  const box = await control.boundingBox();
  expect(box, "control is on screen").not.toBeNull();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
}

for (const language of ["en", "fr"] as const) {
  test(`a survey walk works by keyboard in ${language === "en" ? "English" : "Français"}`, async ({ page }) => {
    test.setTimeout(120_000);
    const c = COPY[language];
    await page.goto("/");
    if (!(await page.evaluate(() => document.documentElement.lang)).startsWith(language)) {
      await page.getByRole("group", { name: /^(Language|Langue)$/ }).getByRole("button", { name: c.switchTo, exact: true }).click();
      await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toMatch(new RegExp(`^${language}`));
    }
    await page.goto("/onboarding/first-run");
    const shell = page.locator(".app");
    await press(shell.getByRole("navigation").getByRole("button", { name: c.notes, exact: true }));
    await press(shell.getByRole("button", { name: c.addNote, exact: true }).first());
    await press(shell.getByRole("button", { name: c.survey, exact: true }));
    await expect(shell.getByRole("heading", { level: 2 })).toBeVisible();

    // Two places typed in; Enter in the field adds each one and focus comes back to the name.
    const name = shell.getByLabel(c.name, { exact: true });
    await name.fill("Library");
    await shell.getByLabel(c.address, { exact: true }).fill("1 Main St");
    await name.press("Enter");
    await expect(name).toBeFocused();
    await expect(name).toHaveValue("");
    await name.fill("Bakery");
    await name.press("Enter");
    await expect(shell.locator(".survey-stops li")).toHaveCount(2);

    await shell.getByLabel(c.licence, { exact: true }).selectOption("CC0-1.0");
    await shell.getByLabel(c.date, { exact: true }).fill("2026-11-18");
    await shell.getByLabel(c.date, { exact: true }).press("Tab");
    await axeClean(page);
    await press(shell.getByRole("button", { name: c.start, exact: true }));

    // One question per screen, three large answers.
    await expect(shell.getByRole("heading", { level: 2 })).toHaveText(c.first);
    const answers = shell.getByRole("group").filter({ has: page.getByRole("button", { name: c.yes, exact: true }) });
    for (const label of [c.yes, c.no, c.notSure]) await bigEnough(answers.getByRole("button", { name: label, exact: true }));
    await axeClean(page);
    const firstQuestion = await shell.locator("#survey-question-text").textContent();
    await press(answers.getByRole("button", { name: c.yes, exact: true }));
    // Focus stays on the answers and the question changes.
    await expect(shell.getByRole("button", { name: c.yes, exact: true })).toBeFocused();
    await expect(shell.locator("#survey-question-text")).not.toHaveText(firstQuestion ?? "");

    await press(shell.getByRole("button", { name: c.leave, exact: true }));
    await expect(shell.getByRole("heading", { level: 2 })).toBeFocused();
    await press(shell.getByRole("button", { name: c.leave, exact: true }));

    // The review shows every detail with where it came from, then saves.
    await expect(shell.getByRole("heading", { level: 2 })).toHaveText(c.review);
    await axeClean(page);
    await press(shell.getByRole("button", { name: c.save, exact: true }));
    await expect(shell.getByRole("heading", { level: 2 })).toHaveText(c.myNotes);
    await expect(shell.getByText(c.saved, { exact: true }).first()).toBeAttached();
    const stored = await page.evaluate(() => window.localStorage.getItem("app.onboarding.notes.v1") ?? "[]");
    const notes = JSON.parse(stored) as Array<{ placeName: string; licence: string }>;
    expect(notes.map((n) => [n.placeName, n.licence])).toEqual([["Library", "CC0-1.0"]]);
    expect(await page.evaluate(() => window.localStorage.getItem("app.onboarding.survey.v1"))).toBeNull();
  });
}
