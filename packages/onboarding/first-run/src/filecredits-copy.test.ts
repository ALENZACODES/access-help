import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { collectCredits, excludeLicences, makeCopy } from "./credits";
import { CONTRIBUTOR_SOURCE, OPEN_LICENCES } from "./facts";
import {
  FILE_CREDITS_COPY,
  LICENCE_INFO,
  creditsErrorText,
  creditsFilename,
  creditsMarkdown,
  creditsSummary,
  creditsText,
  excludedSummary,
  fileCreditsStrings,
  leftOutText,
  licenceSummary,
  licenceTitle,
  outsideAreaText,
  mdEscape,
  sourceCountText,
  sourceLine,
} from "./filecredits-copy";
import { testNote } from "./testnotes";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 21));

const notes = () => [
  testNote("a", "Library", [
    { key: "elevator", value: "yes", on: "2026-01-05", source: CONTRIBUTOR_SOURCE },
    { key: "accessible-washroom", value: "no", on: "2025-03-01", source: "Open data", licence: "CC-BY-4.0" },
    { key: "automatic-door", value: "no", on: "2025-09-01", source: "Open data", licence: "CC-BY-4.0" },
  ]),
];

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileCreditsStrings())).toEqual([]);
  });

  it("names, summarizes and links every licence the App accepts, without banned words", () => {
    for (const lic of OPEN_LICENCES) {
      expect(LICENCE_INFO[lic]?.url).toMatch(/^https:\/\//);
      for (const l of ["en", "fr"] as const) {
        const s = licenceSummary(lic, l);
        expect(s, lic).toBeDefined();
        expect(findBanned(s ?? "")).toBeUndefined();
        if (l === "fr") expect(frenchTypographyIssues(s ?? ""), lic).toEqual([]);
      }
    }
  });

  it("says nothing it does not know about a licence it does not know", () => {
    expect(licenceSummary("Custom-1.0", "en")).toBeUndefined();
    expect(licenceTitle("Custom-1.0")).toBe("Custom-1.0");
    expect(licenceTitle("CC-BY-4.0")).toBe("CC-BY-4.0 (Creative Commons Attribution 4.0)");
  });

  it("says the summaries are not legal advice", () => {
    expect(FILE_CREDITS_COPY.notAdvice.en).toContain("not legal advice");
    expect(FILE_CREDITS_COPY.notAdvice.fr).toContain("pas un avis juridique");
  });

  it("has a message for every file error", () => {
    for (const l of ["en", "fr"] as const)
      for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(creditsErrorText(e, l).length).toBeGreaterThan(0);
  });
});

describe("lines and summaries", () => {
  const c = collectCredits(notes());

  it("gives each source its records and dates, naming the contributor source in French", () => {
    const open = c.licences[0]?.sources[0];
    const contributor = c.licences[1]?.sources[0];
    if (!open || !contributor) throw new Error("bad fixture");
    expect(sourceLine(open, "en")).toBe("Open data: 2 records, 2025-03-01 to 2025-09-01");
    expect(sourceLine(open, "fr")).toBe("Open data\u00A0: 2 données, du 2025-03-01 au 2025-09-01");
    expect(sourceCountText(contributor, "en")).toBe("1 record, 2026-01-05");
    expect(sourceLine(contributor, "fr")).toBe("Rapport d’un contributeur\u00A0: 1 donnée, 2026-01-05");
  });

  it("sums up the credits and a copy", () => {
    expect(creditsSummary(c, "en")).toBe("3 records from 2 sources under 2 licences, in 1 note.");
    expect(creditsSummary(c, "fr")).toBe("3 données de 2 sources sous 2 licences, dans 1 note.");
    const e = excludeLicences(notes(), ["CC-BY-4.0"]);
    expect(excludedSummary(e, "en")).toBe("The copy has 1 record in 1 note. 2 records and 0 notes are left out.");
    expect(excludedSummary(e, "fr")).toBe("La copie compte 1 donnée dans 1 note. 2 données et 0 note sont laissées de côté.");
    const renamed = { ...makeCopy(notes(), [], {}), renamed: 2 };
    expect(excludedSummary(renamed, "en")).toBe("The copy has 3 records in 1 note. 0 records and 0 notes are left out. 2 records have their source written the way you chose.");
    expect(excludedSummary({ ...renamed, renamed: 1 }, "fr")).toBe("La copie compte 3 données dans 1 note. 0 donnée et 0 note sont laissées de côté. 1 donnée a sa source écrite de la façon choisie.");
    expect(excludedSummary({ ...renamed, renamed: 3 }, "fr")).toContain("3 données ont leur source écrite de la façon choisie.");
  });
});

describe("creditsText", () => {
  it("lists each licence with its name, the page of its text and its sources", () => {
    expect(creditsText(collectCredits(notes()), "en", TODAY)).toBe(
      [
        "Credits for sharing a notes file",
        "Made on 2026-11-21",
        "3 records from 2 sources under 2 licences, in 1 note.",
        "",
        "CC-BY-4.0 (Creative Commons Attribution 4.0)",
        "  https://creativecommons.org/licenses/by/4.0/",
        "  - Open data: 2 records, 2025-03-01 to 2025-09-01",
        "",
        "CC0-1.0 (Creative Commons CC0 1.0)",
        "  https://creativecommons.org/publicdomain/zero/1.0/",
        "  - Contributor report: 1 record, 2026-01-05",
        "",
        "",
      ].join("\n"),
    );
  });

  it("says when a licence is carried only by notes, and keeps French typography", () => {
    const text = creditsText(collectCredits([{ ...testNote("k", "Kiosk", []), licence: "ODbL-1.0" }]), "fr", TODAY);
    expect(text).toContain("ODbL-1.0 (Open Database License 1.0)\n  https://opendatacommons.org/licenses/odbl/1-0/\n  Aucune donnée ne porte cette licence, seules des notes la portent.\n");
    // A licence's web address is not French text: its "https:" keeps no space.
    for (const line of text.split("\n")) if (!line.trim().startsWith("https://")) expect(frenchTypographyIssues(line), line).toEqual([]);
  });
});

describe("what is not in the credits", () => {
  it("says how many notes the App cannot read are left out", () => {
    expect(leftOutText(1, "en")).toBe("1 note the App cannot read is not in the credits.");
    expect(leftOutText(3, "fr")).toBe("3 notes que l’App ne peut pas lire ne sont pas dans les mentions.");
  });

  it("says how many places are outside the address text, quoting it", () => {
    expect(outsideAreaText(5, "King", "en")).toBe("5 places whose address does not hold “King” are not in the credits.");
    const fr = outsideAreaText(1, "King", "fr");
    expect(fr).toBe("1 lieu dont l’adresse ne contient pas «\u202FKing\u202F» n’est pas dans les mentions.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });
});

describe("Markdown", () => {
  it("escapes what would be read as formatting, code, links or HTML, and leaves dates and full stops alone", () => {
    expect(mdEscape("*Big* [city](http://x) `code` <b> #1 | ~x~ !img")).toBe("\\*Big\\* \\[city\\](http://x) \\`code\\` \\<b\\> \\#1 \\| \\~x\\~ \\!img");
    expect(mdEscape("2025-03-01 to 2026-02-01.")).toBe("2025-03-01 to 2026-02-01.");
  });

  it("gives each licence a linked heading and its sources as a list", () => {
    expect(creditsMarkdown(collectCredits(notes()), "en", TODAY)).toBe(
      [
        "## Credits for sharing a notes file",
        "",
        "3 records from 2 sources under 2 licences, in 1 note.",
        "",
        "### [CC-BY-4.0 (Creative Commons Attribution 4.0)](https://creativecommons.org/licenses/by/4.0/)",
        "",
        "- Open data: 2 records, 2025-03-01 to 2025-09-01",
        "",
        "### [CC0-1.0 (Creative Commons CC0 1.0)](https://creativecommons.org/publicdomain/zero/1.0/)",
        "",
        "- Contributor report: 1 record, 2026-01-05",
        "",
        "_Made on 2026-11-21_",
        "",
      ].join("\n"),
    );
  });

  it("escapes a source's name and keeps French spacing", () => {
    const md = creditsMarkdown(collectCredits([testNote("x", "X", [{ key: "elevator", value: "yes", source: "[Click](http://evil)", on: "2026-01-05" }])]), "fr", TODAY);
    expect(md).toContain("- \\[Click\\](http://evil)\u00A0: 1 donnée, 2026-01-05\n");
    expect(md).toContain("_Créé le 2026-11-21_");
  });
});

describe("creditsFilename", () => {
  it("names the downloads by kind, day and language", () => {
    expect(creditsFilename("text", TODAY, "en")).toBe("credits-2026-11-21.txt");
    expect(creditsFilename("csv", TODAY, "fr")).toBe("mentions-2026-11-21.csv");
    expect(creditsFilename("copy", TODAY, "en")).toBe("notes-copy-2026-11-21.json");
    expect(creditsFilename("markdown", TODAY, "fr")).toBe("mentions-2026-11-21.md");
    expect(creditsFilename("records", TODAY, "en")).toBe("records-and-sources-2026-11-21.csv");
  });
});
