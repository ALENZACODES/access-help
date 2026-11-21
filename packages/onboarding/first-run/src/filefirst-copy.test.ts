import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { exportNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import {
  fileFirstStrings,
  firstErrorText,
  firstFilename,
  newestText,
  orderText,
  problemText,
  rankedSummary,
  rankingText,
  reasonLines,
  streetLine,
  streetsSummary,
  streetsText,
  viewText,
} from "./filefirst-copy";
import { readStreetFile } from "./filestreets";
import { DEFAULT_FIRST, FIRST_ORDERS, FIRST_VIEWS, placeNeeds, rankPlaces, type Ranked, type StreetNeeds } from "./lookfirst";
import { testNote } from "./testnotes";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function needs() {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("a", "Mixed", [{ key: "elevator", value: "yes", on: "2025-01-10" }, { key: "automatic-door", value: "yes" }], "1 Main St"),
        testNote("b", "Mixed", [{ key: "automatic-door", value: "no" }], "1 Main St"),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  const p = r.file.places[0];
  if (!p) throw new Error("no place");
  return placeNeeds(p, FACT_KEYS, true, TODAY);
}

const ranked = (n: number, nothingOpen = 0, outsideArea = 0): Ranked => ({ ranked: Array.from({ length: n }, () => needs()), nothingOpen, outsideArea });

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileFirstStrings())).toEqual([]);
  });

  it("has words for every order, problem and file error, without banned words", () => {
    for (const l of ["en", "fr"] as const) {
      for (const o of FIRST_ORDERS) expect(findBanned(orderText(o, l)), o).toBeUndefined();
      for (const c of ["keys", "area", "count"] as const) expect(problemText(c, l).length).toBeGreaterThan(0);
      for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(firstErrorText(e, l).length).toBeGreaterThan(0);
    }
  });
});

describe("reasons", () => {
  it("gives one line for each kind of reason, naming the details", () => {
    expect(reasonLines(needs(), "en")).toEqual([
      "No record (Unknown): Step-free entrance, Accessible washroom",
      "Reports differ: Automatic door",
      "A year old or more: Elevator",
    ]);
  });

  it("uses the token UNKNOWN and French spacing", () => {
    const lines = reasonLines(needs(), "fr");
    expect(lines[0]).toBe("Aucune donnée (UNKNOWN)\u00A0: Entrée sans marche, Toilettes accessibles");
    for (const line of lines) expect(frenchTypographyIssues(line), line).toEqual([]);
    expect(lines.join(" ")).not.toMatch(/inconnu/i);
  });

  it("names the newest record, or says nothing is recorded", () => {
    expect(newestText(needs(), "en")).toBe("Newest record: 2026-10-01");
    expect(newestText(needs(), "fr")).toBe("Donnée la plus récente\u00A0: 2026-10-01");
    expect(newestText({ ...needs(), newest: undefined }, "fr")).toBe("Rien de noté pour l’instant");
  });
});

describe("rankedSummary", () => {
  it("says how many places have something to look at and how many are listed", () => {
    expect(rankedSummary(ranked(14), 10, "", "en")).toBe("14 places have something to look at; the first 10 are listed.");
    expect(rankedSummary(ranked(3), 3, "", "en")).toBe("3 places have something to look at; all are listed.");
    expect(rankedSummary(ranked(1), 1, "", "en")).toBe("1 place has something to look at; it is listed.");
    expect(rankedSummary(ranked(0), 0, "", "en")).toBe("No place has anything to look at.");
    expect(rankedSummary(ranked(5), 1, "", "en")).toBe("5 places have something to look at; the first is listed.");
    expect(rankedSummary(ranked(5), 1, "", "fr")).toBe("5 lieux ont quelque chose à regarder\u202F; le premier est listé.");
  });

  it("says what was left out, quoting the area text", () => {
    expect(rankedSummary(ranked(2, 1, 3), 2, "King", "en")).toBe("2 places have something to look at; all are listed. 1 place with nothing to look at. 3 places whose address does not hold “King”.");
    const fr = rankedSummary(ranked(14, 2, 1), 10, "King", "fr");
    expect(fr).toBe("14 lieux ont quelque chose à regarder\u202F; les 10 premiers sont listés. 2 lieux sans rien à regarder. 1 lieu dont l’adresse ne contient pas «\u202FKing\u202F».");
    expect(frenchTypographyIssues(fr)).toEqual([]);
    expect(rankedSummary(ranked(1), 1, "", "fr")).toBe("1 lieu a quelque chose à regarder\u202F; il est listé.");
    expect(rankedSummary(ranked(0), 0, "", "fr")).toBe("Aucun lieu n’a quelque chose à regarder.");
  });

  it("matches what the ranking finds", () => {
    const r = readStreetFile(exportNotes([testNote("x", "X", [], "1 A St")], "2026-11-01"), TODAY, "en");
    if (!r.ok) throw new Error(r.error);
    const rk = rankPlaces(r.file, DEFAULT_FIRST, TODAY, "en");
    expect(rankedSummary(rk, 1, "", "en")).toBe("1 place has something to look at; it is listed.");
  });
});

describe("streets", () => {
  const street = (over: Partial<StreetNeeds> = {}): StreetNeeds => ({ key: "k", name: "King Street West", places: [needs(), needs(), needs()], open: 7, unknown: 4, differ: 1, old: 2, neverRecorded: 1, ...over });

  it("says what is open along a street", () => {
    expect(streetLine(street(), "en")).toBe("3 places, 7 details to look at: 4 with no record, 1 where reports differ, 2 a year old or more. 1 place never recorded.");
    expect(streetLine(street({ places: [needs()], open: 1, unknown: 1, differ: 0, old: 0, neverRecorded: 0 }), "en")).toBe("1 place, 1 detail to look at: 1 with no record.");
    const fr = streetLine(street({ neverRecorded: 2 }), "fr");
    expect(fr).toBe("3 lieux, 7 détails à regarder\u00A0: 4 sans donnée, 1 aux rapports divergents, 2 datant d’un an ou plus. 2 lieux jamais notés.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("says how many streets are listed and how many places have no street", () => {
    expect(streetsSummary({ streets: [street(), street(), street()], noStreet: [needs()] }, 2, "en")).toBe("3 streets have something to look at; the first 2 are listed. 1 place with no street in the address.");
    expect(streetsSummary({ streets: [street()], noStreet: [] }, 1, "en")).toBe("1 street has something to look at; it is listed.");
    expect(streetsSummary({ streets: [], noStreet: [] }, 0, "en")).toBe("No street has anything to look at.");
    expect(streetsSummary({ streets: [street(), street()], noStreet: [] }, 1, "en")).toBe("2 streets have something to look at; the first is listed.");
    const fr = streetsSummary({ streets: [street(), street()], noStreet: [needs(), needs()] }, 2, "fr");
    expect(fr).toBe("2 rues ont quelque chose à regarder\u202F; toutes sont listées. 2 lieux sans rue dans l’adresse.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
    expect(streetsSummary({ streets: [street(), street(), street()], noStreet: [] }, 1, "fr")).toBe("3 rues ont quelque chose à regarder\u202F; la première est listée.");
  });

  it("has words for both views", () => {
    for (const l of ["en", "fr"] as const) for (const v of FIRST_VIEWS) expect(findBanned(viewText(v, l))).toBeUndefined();
  });
});

describe("lists to print", () => {
  it("prints each place with its rank, address, reasons and newest record", () => {
    const text = rankingText([needs()], "1 place has something to look at; it is listed.", "en", TODAY);
    expect(text).toBe(
      [
        "First places",
        "Made on 2026-11-21",
        "1 place has something to look at; it is listed.",
        "",
        "1. Mixed",
        "    1 Main St",
        "    No record (Unknown): Step-free entrance, Accessible washroom",
        "    Reports differ: Automatic door",
        "    A year old or more: Elevator",
        "    Newest record: 2026-10-01",
        "",
        "",
      ].join("\n"),
    );
  });

  it("prints each street with what is open and a box for each place, then places with no street", () => {
    const street: StreetNeeds = { key: "k", name: "Main Street", places: [needs()], open: 4, unknown: 2, differ: 1, old: 1, neverRecorded: 0 };
    const text = streetsText({ streets: [street], noStreet: [{ ...needs(), place: { ...needs().place, name: "Kiosk", address: undefined } }] }, [street], "summary", "fr", TODAY);
    expect(text).toContain("Premières rues\nCréée le 2026-11-21\nsummary\n");
    expect(text).toContain("1. Main Street\n    1 lieu, 4 détails à regarder\u00A0: 2 sans donnée, 1 aux rapports divergents, 1 datant d’un an ou plus.\n    [ ] Mixed, 1 Main St\n");
    expect(text).toContain("Lieux sans rue dans l’adresse\n    [ ] Kiosk, Aucune adresse\n");
  });
});

describe("firstFilename", () => {
  it("names the downloads by kind, count, day and language", () => {
    expect(firstFilename("notes", 10, TODAY, "en")).toBe("notes-first-10-places-2026-11-21.json");
    expect(firstFilename("csv", 3, TODAY, "fr")).toBe("classement-3-lieux-2026-11-21.csv");
    expect(firstFilename("street-notes", 2, TODAY, "en")).toBe("notes-first-2-streets-2026-11-21.json");
    expect(firstFilename("streets-csv", 2, TODAY, "fr")).toBe("classement-2-rues-2026-11-21.csv");
    expect(firstFilename("text", 4, TODAY, "en")).toBe("list-4-places-2026-11-21.txt");
    expect(firstFilename("streets-text", 2, TODAY, "fr")).toBe("liste-2-rues-2026-11-21.txt");
  });
});
