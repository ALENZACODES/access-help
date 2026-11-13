import { describe, expect, it } from "vitest";
import { HELP_ARTICLES, bundledHelpPack } from "./index.js";
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

  it("does not claim a designated-area count", () => {
    const languages = HELP_ARTICLES.find((article) => article.id === "languages");
    expect(languages?.en.sections.flatMap((section) => section.paragraphs).join(" ")).toMatch(/does not say 25/);
    expect(languages?.fr.sections.flatMap((section) => section.paragraphs).join(" ")).toMatch(/ne dit pas 25/);
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
