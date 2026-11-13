import { describe, expect, it } from "vitest";
import { HELP_ARTICLES, bundledHelpPack, reviewNotes } from "./index.js";
import { auditArticles } from "./content-rules.js";
import { createLanguagePreference, memoryKeyValue } from "./language.js";
import { memoryHelpCache } from "./offline.js";
import { emptySearchMessage, fold, searchArticles } from "./search.js";
import { SIGNPOSTS } from "./signposts.js";

describe("help articles", () => {
  it("passes the content audit", () => {
    expect(auditArticles(HELP_ARTICLES)).toEqual([]);
  });

  it("covers emergency, privacy, peer tips, events, and French", () => {
    const ids = HELP_ARTICLES.map((article) => article.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "get-help-now",
        "crisis-support",
        "privacy",
        "indigenous-data",
        "peer-tips",
        "events",
        "languages",
        "labels",
        "offline",
        "programmes",
      ]),
    );
  });

  it("gives every French article the same structure and safety notes as English", () => {
    const safety = ["get-help-now", "crisis-support", "health-concerns", "reporting", "clinical-boundaries"];
    expect(HELP_ARTICLES.filter((article) => article.safetyCritical).map((article) => article.id).sort()).toEqual(
      [...safety].sort(),
    );
    for (const article of HELP_ARTICLES) {
      expect(article.fr.sections, article.id).toHaveLength(article.en.sections.length);
      article.en.sections.forEach((section, index) => {
        expect(article.fr.sections[index]?.paragraphs, `${article.id} section ${index}`).toHaveLength(section.paragraphs.length);
      });
      expect(article.does.fr, article.id).toHaveLength(article.does.en.length);
      expect(article.doesNot.fr, article.id).toHaveLength(article.doesNot.en.length);
      expect(article.dataUses.fr, article.id).toHaveLength(article.dataUses.en.length);
      const frenchLists = [...article.does.fr, ...article.doesNot.fr, ...article.dataUses.fr].join(" ");
      expect(frenchLists, article.id).not.toBe([...article.does.en, ...article.doesNot.en, ...article.dataUses.en].join(" "));
      expect(frenchLists, article.id).toMatch(/l'application|pas |ne |pour |les |une /);
      for (const source of article.sources) {
        expect(source.title.fr.trim().length, article.id).toBeGreaterThan(0);
        expect(source.limit.fr, article.id).not.toBe(source.limit.en);
      }
      const englishNotes = reviewNotes(article, "en").join(" ");
      const frenchNotes = reviewNotes(article, "fr").join(" ");
      if (article.safetyCritical) {
        expect(englishNotes).toMatch(/general information, not personal advice/);
        expect(frenchNotes).toMatch(/information générale, pas un conseil personnel/);
        expect(frenchNotes).toMatch(/révision clinique/);
      } else {
        expect(englishNotes).toMatch(/Lived-experience review is not recorded yet/);
        expect(frenchNotes).toMatch(/personnes concernées/);
      }
    }
    const crisis = HELP_ARTICLES.find((article) => article.id === "crisis-support");
    expect(crisis?.doesNot.fr.join(" ")).toMatch(/idées suicidaires/);
    expect(crisis?.doesNot.fr.join(" ")).not.toMatch(/Ask you to type/);
  });

  it("does not claim a designated-area count", () => {
    const languages = HELP_ARTICLES.find((article) => article.id === "languages");
    expect(languages?.en.sections.flatMap((section) => section.paragraphs).join(" ")).toMatch(/does not say 25/);
    expect(languages?.fr.sections.flatMap((section) => section.paragraphs).join(" ")).toMatch(/ne dit pas 25/);
  });

  it("cites SCIRE and the Health811 calling page without an unsourced 911 symptom list", () => {
    const article = HELP_ARTICLES.find((item) => item.id === "get-help-now");
    const english = article?.en.sections.flatMap((section) => section.paragraphs).join(" ") ?? "";
    const french = article?.fr.sections.flatMap((section) => section.paragraphs).join(" ") ?? "";
    expect(article?.translation.en.state).toBe("draft_awaiting_clinical_review");
    expect(english).not.toMatch(/Call 911 for a fall/);
    expect(english).toMatch(/awaiting clinical review|still outstanding/);
    expect(english).toContain("https://scireproject.com/primary-care/autonomic-dysreflexia/");
    expect(english).toMatch(/1-866-797-0000[\s\S]{0,180}calling-health811-help-centre/);
    expect(french).toMatch(/1-866-797-0000[\s\S]{0,180}calling-health811-help-centre/);
    const urls = article?.sources.map((source) => source.url);
    expect(urls).toContain("https://scireproject.com/primary-care/autonomic-dysreflexia/");
    expect(urls).toContain("https://health811.ontario.ca/static/guest/help-centre/calling-health811-help-centre");
    const health = SIGNPOSTS.find((item) => item.id === "health811");
    expect(health?.url).toBe("https://health811.ontario.ca/static/guest/help-centre/calling-health811-help-centre");
    expect(health?.how.en).toMatch(/1-866-797-0000/);
  });
});

describe("search", () => {
  it("folds accents", () => {
    expect(fold("Événement")).toBe("evenement");
  });

  it("finds a French washroom word from the English interface via synonyms", () => {
    const hits = searchArticles(HELP_ARTICLES, "toilette", "en");
    expect(hits.map((hit) => hit.article.id)).toContain("labels");
  });

  it("finds the elevator article in French", () => {
    const hits = searchArticles(HELP_ARTICLES, "ascenseur", "fr");
    expect(hits[0]?.article.id).toBe("labels");
  });

  it("names the missed term in the empty state", () => {
    expect(searchArticles(HELP_ARTICLES, "zzzz-not-a-topic", "en")).toHaveLength(0);
    expect(emptySearchMessage("en", "zzzz-not-a-topic")).toMatch(/zzzz-not-a-topic/);
    expect(emptySearchMessage("fr", "zzzz-not-a-topic")).toMatch(/zzzz-not-a-topic/);
  });

  it("ignores a blank query", () => {
    expect(searchArticles(HELP_ARTICLES, "   ", "fr")).toHaveLength(0);
  });
});

describe("language preference", () => {
  it("persists French on the device and falls back to English", () => {
    const store = memoryKeyValue();
    const preference = createLanguagePreference(store);
    expect(preference.get()).toBe("en");
    preference.set("fr");
    expect(createLanguagePreference(store).get()).toBe("fr");
    store.setItem("the-app-language", "es");
    expect(createLanguagePreference(store).get()).toBe("en");
  });
});

describe("offline pack", () => {
  it("round-trips the bundled articles without a network", async () => {
    const cache = memoryHelpCache();
    const pack = bundledHelpPack("2026-11-13T12:00:00.000Z");
    await cache.save(pack);
    const loaded = await cache.load();
    expect(loaded?.id).toBe(pack.id);
    expect(loaded?.articles).toHaveLength(HELP_ARTICLES.length);
    await cache.clear();
    expect(await cache.load()).toBeNull();
  });
});

describe("signposts", () => {
  it("includes 911, 988, and 811 with retrieval dates", () => {
    const contacts = SIGNPOSTS.map((item) => item.contact);
    expect(contacts).toEqual(expect.arrayContaining(["911", "9-8-8", "811"]));
    for (const item of SIGNPOSTS) {
      expect(item.retrieved).toBe("2026-11-13");
      expect(item.how.en.length).toBeGreaterThan(20);
      expect(item.how.fr.length).toBeGreaterThan(20);
    }
  });
});
