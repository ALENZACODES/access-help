import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Asking a place in writing, then reading its reply, in a real browser and
 * by keyboard only: the message is drafted from the place's open details,
 * written in the other language when asked, opened in the person's own
 * email app (no recipient), noted in "Questions you sent", and the reply is
 * read and saved as a note that says where it came from. One test per language.
 */
const NOTES_KEY = "app.onboarding.notes.v1";
const ASKED_KEY = "app.onboarding.asked.v1";
const NOTE = {
  id: "seed1",
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
    ask: "Ask this place in writing",
    otherLanguage: "Français",
    otherHello: "Bonjour,",
    email: "Open in your email app",
    phone: "By email",
    add: "Add to my questions sent",
    readReply: "Read the place’s reply",
    find: "Find the sentences",
    yes: "Yes",
    licence: "Licence for your note",
    save: "Save this as a note",
    saved: "Saved a note for Library.",
    noteText: "Read from the place’s written reply.",
  },
  fr: {
    switchTo: "Français",
    notes: "Notes",
    ask: "Écrire à ce lieu pour poser des questions",
    otherLanguage: "English",
    otherHello: "Hello,",
    email: "Ouvrir dans votre application de courriel",
    phone: "Par courriel",
    add: "Ajouter à mes questions envoyées",
    readReply: "Lire la réponse du lieu",
    find: "Trouver les phrases",
    yes: "Oui",
    licence: "Licence de votre note",
    save: "Enregistrer comme note",
    saved: "Note enregistrée pour Library.",
    noteText: "Lu dans la réponse écrite du lieu.",
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

for (const language of ["en", "fr"] as const) {
  test(`asking a place in writing and reading its reply works by keyboard in ${language === "en" ? "English" : "Français"}`, async ({ page }) => {
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
    await press(shell.locator('main [data-action="view"][data-value="places"]').first());
    await press(shell.locator('[data-action="open-place"]').first());
    await expect(shell.getByRole("heading", { level: 2 })).toHaveText("Library");
    await press(shell.getByRole("button", { name: c.ask, exact: true }));

    // The message, written in the other language while the App stays in this one.
    await shell.getByRole("radio", { name: c.otherLanguage, exact: true }).check();
    await expect(shell.locator("#ask-text")).toHaveValue(new RegExp(`^${c.otherHello}`));
    const mail = await shell.getByRole("link", { name: c.email, exact: true }).getAttribute("href");
    expect(mail?.startsWith("mailto:?subject=")).toBe(true);
    const box = await shell.getByRole("link", { name: c.email, exact: true }).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    await axeClean(page);

    // Noted in "Questions you sent".
    await shell.getByRole("radio", { name: c.phone, exact: true }).check();
    await press(shell.getByRole("button", { name: c.add, exact: true }));
    const asked = JSON.parse((await page.evaluate((k) => window.localStorage.getItem(k), ASKED_KEY)) ?? "[]") as Array<{ way: string; state: string }>;
    expect(asked.map((r) => [r.way, r.state])).toEqual([["email", "waiting"]]);

    // The reply is read and saved; the place is then marked as replied.
    await press(shell.getByRole("button", { name: c.readReply, exact: true }));
    await shell.locator("#st-text").fill("Yes, our washroom on the main floor is accessible.");
    await press(shell.getByRole("button", { name: c.find, exact: true }));
    await expect(shell.locator("#st-findings")).toBeFocused();
    await shell.locator('[data-answer="accessible-washroom"]').getByRole("radio", { name: c.yes, exact: true }).check();
    await shell.getByLabel(c.licence, { exact: true }).selectOption("CC0-1.0");
    await axeClean(page);
    await press(shell.getByRole("button", { name: c.save, exact: true }));
    await expect(shell.getByText(c.saved, { exact: true }).first()).toBeAttached();
    const notes = JSON.parse((await page.evaluate((k) => window.localStorage.getItem(k), NOTES_KEY)) ?? "[]") as Array<{ note?: string }>;
    expect(notes[0]?.note).toBe(c.noteText);
    const after = JSON.parse((await page.evaluate((k) => window.localStorage.getItem(k), ASKED_KEY)) ?? "[]") as Array<{ state: string }>;
    expect(after[0]?.state).toBe("replied");
  });
}
