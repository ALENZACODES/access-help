import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { DEFAULT_GRID, GRID_ORDERS, SHOWN, gridRows, pageOf } from "./answergrid";
import { exportNotes } from "./exchange";
import { readStreetFile } from "./filestreets";
import { testNote } from "./testnotes";
import { auditCopy } from "./audit";
import {
  FILE_GRID_COPY as C,
  badPageText,
  breakdownText,
  captionText,
  cellText,
  fileGridStrings,
  gridErrorText,
  gridFilename,
  gridText,
  matchText,
  orderText,
  tickLabel,
  tickedDownloadText,
  pageText,
  shownText,
} from "./filegrid-copy";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 21));

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileGridStrings())).toEqual([]);
  });

  it("has French typography, the token UNKNOWN and no banned words in every string", () => {
    for (const [path, pair] of fileGridStrings()) {
      expect(frenchTypographyIssues(pair.fr), path).toEqual([]);
      expect(findBanned(pair.en), path).toBeUndefined();
      expect(findBanned(pair.fr), path).toBeUndefined();
      expect(pair.fr, path).not.toMatch(/inconnu/i);
    }
    expect(C.rule.fr).toContain("UNKNOWN");
  });

  it("says it never ranks, and that the control that takes the file off removes it", () => {
    expect(C.rule.en).toContain("nothing here says a place is better or worse");
    expect(C.clear.en).toMatch(/^Remove/);
    expect(C.clear.fr).toMatch(/^Retirer/);
  });

  it("has words for every answer, order and file error", () => {
    for (const l of ["en", "fr"] as const) {
      for (const s of SHOWN) expect(shownText(s, l).length).toBeGreaterThan(0);
      for (const o of GRID_ORDERS) expect(orderText(o, l).length).toBeGreaterThan(0);
      for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(gridErrorText(e, l).length).toBeGreaterThan(0);
    }
  });
});

describe("cells", () => {
  it("gives the answer, the newest day and the sources, or the Unknown word alone", () => {
    expect(cellText({ shown: "yes", newest: "2026-10-01", sources: 2 }, "en")).toBe("Yes, 2026-10-01, 2 sources");
    expect(cellText({ shown: "differ", newest: "2026-10-01", sources: 1 }, "en")).toBe("Reports differ, 2026-10-01, 1 source");
    expect(cellText({ shown: "no", newest: "2026-03-01", sources: 1 }, "fr")).toBe("Non, 2026-03-01, 1 source");
    expect(cellText({ shown: "unknown", newest: "", sources: 0 }, "en")).toBe("Unknown");
    expect(cellText({ shown: "unknown", newest: "", sources: 0 }, "fr")).toBe("UNKNOWN");
  });
});

describe("pages and summaries", () => {
  const p = (total: number, page: number) => pageOf(Array.from({ length: total }, () => ({}) as never), page);

  it("captions the table with the places shown", () => {
    expect(captionText(p(60, 2), "en")).toBe("Places 26 to 50 of 60");
    expect(captionText(p(60, 3), "fr")).toBe("Lieux 51 à 60 sur 60");
    expect(captionText(p(0, 1), "en")).toBe(C.noRows.en);
  });

  it("says which page is shown", () => {
    expect(pageText(p(60, 2), "en")).toBe("Page 2 of 3");
    expect(pageText(p(60, 2), "fr")).toBe("Page 2 sur 3");
  });

  it("says how many places match", () => {
    expect(matchText(1, "en")).toBe("1 place matches.");
    expect(matchText(12, "en")).toBe("12 places match.");
    expect(matchText(1, "fr")).toBe("1 lieu correspond.");
    expect(matchText(3, "fr")).toBe("3 lieux correspondent.");
    expect(matchText(0, "fr")).toBe(C.noRows.fr);
  });

  it("counts each answer for a detail", () => {
    expect(breakdownText("elevator", { yes: 3, no: 1, unknown: 5, differ: 0 }, "en")).toBe("Elevator: 3 Yes, 1 No, 5 Unknown, 0 where reports differ.");
    const fr = breakdownText("elevator", { yes: 3, no: 1, unknown: 5, differ: 2 }, "fr");
    expect(fr).toBe("Ascenseur\u00A0: 3 Oui, 1 Non, 5 UNKNOWN, 2 aux rapports divergents.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });
});

describe("ticking places", () => {
  it("names the place in each tick box, and counts the places in the download", () => {
    expect(tickLabel("Café", "1 A St", "en")).toBe("Choose Café, 1 A St");
    expect(tickLabel("Kiosk", undefined, "fr")).toBe("Choisir Kiosk, Aucune adresse");
    expect(tickedDownloadText(1, "en")).toBe("Download the notes of the place ticked");
    expect(tickedDownloadText(3, "en")).toBe("Download the notes of the 3 places ticked");
    expect(tickedDownloadText(1, "fr")).toBe("Télécharger les notes du lieu coché");
    expect(tickedDownloadText(2, "fr")).toBe("Télécharger les notes des 2 lieux cochés");
  });
});

describe("badPageText", () => {
  it("says which page numbers there are", () => {
    expect(badPageText(3, "en")).toBe("Write a page number from 1 to 3.");
    expect(badPageText(1, "fr")).toBe("Écrivez un numéro de page de 1 à 1.");
  });
});

describe("gridText", () => {
  const rows = (l: "en" | "fr") => {
    const r = readStreetFile(exportNotes([testNote("a", "Café", [{ key: "elevator", value: "yes" }], "1 A St"), testNote("k", "Kiosk", [], null)], "2026-11-01"), TODAY, l);
    if (!r.ok) throw new Error(r.error);
    return gridRows(r.file, DEFAULT_GRID, l);
  };

  it("prints each place with each detail shown and its details with no record", () => {
    expect(gridText(rows("en"), ["automatic-door", "elevator"], TODAY, "en")).toBe(
      `Answers by place, in a table\n2026-11-21\n\n${C.rule.en}\n2 places match.\n\nCafé, 1 A St\n    Automatic door: Unknown\n    Elevator: Yes, 2026-10-01, 1 source\n    Details with no record: 1\n\nKiosk, No address\n    Automatic door: Unknown\n    Elevator: Unknown\n    Details with no record: 2\n`,
    );
  });

  it("prints French with its spacing and the token UNKNOWN", () => {
    const text = gridText(rows("fr"), ["elevator"], TODAY, "fr");
    expect(text).toContain("Kiosk, Aucune adresse\n    Ascenseur\u00A0: UNKNOWN\n");
    for (const line of text.split("\n")) expect(frenchTypographyIssues(line), line).toEqual([]);
  });
});

describe("gridFilename", () => {
  it("names the table and the notes by the number of places and the day", () => {
    expect(gridFilename("csv", 12, TODAY, "en")).toBe("table-12-places-2026-11-21.csv");
    expect(gridFilename("csv", 1, TODAY, "fr")).toBe("tableau-1-lieu-2026-11-21.csv");
    expect(gridFilename("notes", 1, TODAY, "en")).toBe("notes-1-place-2026-11-21.json");
    expect(gridFilename("notes", 3, TODAY, "fr")).toBe("notes-3-lieux-2026-11-21.json");
    expect(gridFilename("text", 3, TODAY, "en")).toBe("places-3-2026-11-21.txt");
    expect(gridFilename("text", 1, TODAY, "fr")).toBe("lieux-1-2026-11-21.txt");
  });
});
