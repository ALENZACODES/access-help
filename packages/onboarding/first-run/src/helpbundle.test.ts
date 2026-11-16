// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ARTICLES, COPY, GLOSSARY, bundleFilename, bundleToText, decodeTextHref, kilobytes, memoryStore, mountShell, type ShellHandle } from "./index";

describe("bundleToText", () => {
  it("lists every article and the words in a contents list, in order", () => {
    const text = bundleToText("en");
    expect(text).toContain("Contents");
    ARTICLES.forEach((a, i) => expect(text).toContain(`${i + 1}. ${a.title.en}`));
    expect(text).toContain(`${ARTICLES.length + 1}. What words mean`);
  });

  it("contains every article's title and every word's meaning", () => {
    for (const l of ["en", "fr"] as const) {
      const text = bundleToText(l);
      for (const a of ARTICLES) {
        expect(text, `${l} ${a.id}`).toContain(a.title[l]);
        for (const s of a.sections) expect(text, `${l} ${a.id} ${s.id}`).toContain(s.heading[l]);
      }
      for (const w of GLOSSARY) expect(text, `${l} ${w.id}`).toContain(w.meaning[l]);
    }
  });

  it("is in one language only", () => {
    expect(bundleToText("en")).not.toContain(ARTICLES[0]?.title.fr ?? "?");
    expect(bundleToText("fr")).not.toContain(COPY.bundle.contents.en);
  });

  it("keeps French typography: no-break space before a colon, typographic apostrophes", () => {
    const fr = bundleToText("fr");
    expect(fr).not.toMatch(/[^\u00A0\n ]:(?= )/);
    expect(fr).not.toContain("l'");
  });

  it("does not stack blank lines and ends with a newline", () => {
    const text = bundleToText("en");
    expect(text).not.toMatch(/\n{4,}/);
    expect(text.endsWith("\n")).toBe(true);
  });

  it("names the file by language, and is the same every time it is built", () => {
    expect(bundleFilename("fr")).toBe("help-all-fr.txt");
    expect(bundleToText("en")).toBe(bundleToText("en"));
  });

  it("rounds the size up to a whole kilobyte and never says zero", () => {
    expect(kilobytes("")).toBe(1);
    expect(kilobytes("a".repeat(1024))).toBe(1);
    expect(kilobytes("a".repeat(1025))).toBe(2);
    expect(kilobytes("é".repeat(600))).toBe(2);
  });
});

describe("the help list offers the bundle", () => {
  let root: HTMLElement;
  let shell: ShellHandle | undefined;
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById("app") as HTMLElement;
    window.location.hash = "";
  });
  afterEach(() => shell?.destroy());

  it("has a download link that decodes to the same text as the function", () => {
    for (const lang of ["en", "fr"] as const) {
      shell?.destroy();
      document.body.innerHTML = '<div id="app"></div>';
      root = document.getElementById("app") as HTMLElement;
      shell = mountShell(root, { requestedLocales: [lang], store: memoryStore(), today: new Date(Date.UTC(2026, 10, 15)) });
      root.querySelector<HTMLElement>('nav [data-value="help"]')?.click();
      const link = root.querySelector<HTMLAnchorElement>('a[download^="help-all-"]');
      expect(link?.getAttribute("download")).toBe(bundleFilename(lang));
      expect(decodeTextHref(link?.getAttribute("href") ?? "")).toBe(bundleToText(lang));
      expect(link?.textContent).toBe(COPY.bundle.save[lang]);
      expect(link?.getAttribute("style")).toMatch(/min-height:\s*44px/);
    }
  });
});
