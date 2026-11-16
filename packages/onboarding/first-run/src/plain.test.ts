import { describe, expect, it } from "vitest";
import { MAX_WORDS_PER_SENTENCE, longestSentence, plainIssues, sentences, words } from "./index";

describe("words and sentences", () => {
  it("counts words and ignores punctuation-only pieces", () => {
    expect(words("Press Tab, then Enter.")).toEqual(["Press", "Tab,", "then", "Enter."]);
    expect(words(" - … ")).toEqual([]);
  });

  it("treats no-break spaces as spaces", () => {
    expect(words("Où\u00A0est\u202Fle lieu")).toHaveLength(4);
  });

  it("splits on full stops, question marks, exclamation marks and line ends", () => {
    expect(sentences("One two. Three four? Five! Six\nSeven")).toEqual(["One two", "Three four", "Five", "Six", "Seven"]);
  });

  it("does not split inside a number", () => {
    expect(sentences("Wait 2.5 seconds. Then press.")).toEqual(["Wait 2.5 seconds", "Then press"]);
  });

  it("splits French sentences with a narrow no-break space before the mark", () => {
    expect(sentences("Où est-il\u202F? Ici.")).toEqual(["Où est-il", "Ici"]);
  });

  it("reports the longest sentence", () => {
    expect(longestSentence("Go. Press the big button now.")).toBe(5);
    expect(longestSentence("")).toBe(0);
  });
});

describe("plainIssues", () => {
  const sentence = (n: number): string => Array.from({ length: n }, (_, i) => `word${i}`).join(" ") + ".";

  it("accepts a sentence at the limit and rejects one over it, per language", () => {
    expect(plainIssues(sentence(MAX_WORDS_PER_SENTENCE.en), "en")).toEqual([]);
    expect(plainIssues(sentence(MAX_WORDS_PER_SENTENCE.en + 1), "en").map((i) => i.rule)).toEqual(["long-sentence"]);
    expect(plainIssues(sentence(MAX_WORDS_PER_SENTENCE.fr), "fr")).toEqual([]);
    expect(plainIssues(sentence(MAX_WORDS_PER_SENTENCE.fr + 1), "fr").map((i) => i.rule)).toEqual(["long-sentence"]);
  });

  it("is fine with many short sentences", () => {
    expect(plainIssues(Array.from({ length: 30 }, () => "Press Tab.").join(" "), "en")).toEqual([]);
  });

  it("flags shouting and empty text", () => {
    expect(plainIssues("PRESS THE BUTTON NOW", "en").map((i) => i.rule)).toEqual(["all-caps"]);
    expect(plainIssues("Use Tab", "en")).toEqual([]);
    expect(plainIssues("   ", "en").map((i) => i.rule)).toEqual(["no-text"]);
  });
});
