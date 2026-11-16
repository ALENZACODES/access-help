import { describe, expect, it } from "vitest";
import { checkFrTypography, checkHelpEntries, type HelpEntry } from "@access/help-fr-polish";
import { ALL_HELP_ARTICLES } from "./integrated-articles.js";

function frenchHelpEntries(): HelpEntry[] {
  const entries: HelpEntry[] = [];
  for (const article of ALL_HELP_ARTICLES) {
    entries.push({ id: `${article.id}:title`, fr: article.fr.title });
    entries.push({ id: `${article.id}:summary`, fr: article.fr.summary });
    for (const [index, section] of article.fr.sections.entries()) {
      entries.push({ id: `${article.id}:heading:${index}`, fr: section.heading });
      for (const [paragraphIndex, paragraph] of section.paragraphs.entries()) {
        entries.push({ id: `${article.id}:p:${index}:${paragraphIndex}`, fr: paragraph });
      }
    }
    for (const [index, line] of article.does.fr.entries()) {
      entries.push({ id: `${article.id}:does:${index}`, fr: line });
    }
    for (const [index, line] of article.doesNot.fr.entries()) {
      entries.push({ id: `${article.id}:doesNot:${index}`, fr: line });
    }
  }
  return entries;
}

describe("bundled French help copy is checked", () => {
  it("runs the typography checker on every bundled French help string", () => {
    const entries = frenchHelpEntries();
    expect(entries.length).toBeGreaterThan(0);
    const reports = checkHelpEntries(entries);
    expect(Array.isArray(reports)).toBe(true);
    for (const report of reports) {
      expect(report.id.length).toBeGreaterThan(0);
      expect(report.issues.length).toBeGreaterThan(0);
    }
  });

  it("accepts typographically correct French", () => {
    expect(checkFrTypography("l’App")).toEqual([]);
  });
});
