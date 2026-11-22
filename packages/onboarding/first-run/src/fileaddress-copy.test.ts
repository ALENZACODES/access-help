import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { ADDRESS_ISSUES, addressRows, type AddressedCopy, type AddressReport } from "./addressfill";
import { auditCopy } from "./audit";
import { exportNotes } from "./exchange";
import {
  FILE_ADDRESS_COPY as C,
  addressErrorText,
  addressFilename,
  addressProblemText,
  addressSummary,
  addressesText,
  changeText,
  copySummary,
  fileAddressStrings,
  issueText,
  placesLine,
  rowText,
  suggestionLabel,
} from "./fileaddress-copy";
import { readStreetFile } from "./filestreets";
import { testNote } from "./testnotes";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function report(): AddressReport {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("a", "Café", [], null),
        testNote("b", "Café", [], null),
        testNote("c", "Café", [], "12 King St W"),
        testNote("d", "Kiosk", [], "Main Street"),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return addressRows(r.file);
}

const copy = (places: number, changed: number, readable: number): AddressedCopy => ({ notes: [], places, changed, readable });

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileAddressStrings())).toEqual([]);
  });

  it("holds no banned word or “inconnu”", () => {
    for (const [path, p] of fileAddressStrings()) {
      expect(findBanned(p.en), path).toBeUndefined();
      expect(findBanned(p.fr), path).toBeUndefined();
      expect(p.fr.toLowerCase(), path).not.toContain("inconnu");
    }
  });

  it("names its remove control as one, and says the App never makes an address up", () => {
    expect(C.clear.en.startsWith("Remove")).toBe(true);
    expect(C.clear.fr.startsWith("Retirer")).toBe(true);
    expect(C.rule.en).toContain("never makes an address up");
    expect(C.rule.fr).toContain("n’invente jamais");
  });

  it("has words for every issue, problem and file error", () => {
    for (const l of ["en", "fr"] as const) {
      for (const i of ADDRESS_ISSUES) expect(issueText(i, l).length).toBeGreaterThan(0);
      for (const p of ["empty", "too-long", "control"] as const) expect(addressProblemText(p, l).length).toBeGreaterThan(0);
      for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(addressErrorText(e, l).length).toBeGreaterThan(0);
    }
  });
});

describe("row lines", () => {
  it("names the place, what is missing and how many notes", () => {
    const [cafe, kiosk] = report().rows;
    expect(cafe && rowText(cafe, "en")).toBe("Café — No address — 2 notes");
    expect(kiosk && rowText(kiosk, "en")).toBe("Kiosk, Main Street — No house number and street the App can read — 1 note");
    expect(cafe && rowText(cafe, "fr")).toBe("Café — Aucune adresse — 2 notes");
  });

  it("says where an offered address comes from", () => {
    const cafe = report().rows[0]!;
    expect(suggestionLabel("12 King St W", cafe, "en")).toBe("Use 12 King St W (another place named Café has it)");
    expect(suggestionLabel("12 King St W", cafe, "fr")).toBe("Utiliser 12 King St W (un autre lieu nommé Café l’a)");
    const spot = { ...cafe, issue: "no-postal" as const };
    expect(suggestionLabel("12 King St W, Toronto ON M5H 2N2", spot, "en")).toBe("Use 12 King St W, Toronto ON M5H 2N2 (another place at this street address has it)");
    expect(suggestionLabel("12 King St W", spot, "fr")).toBe("Utiliser 12 King St W (un autre lieu à ce numéro de rue l’a)");
  });
});

describe("summaries", () => {
  it("counts the places and what is missing", () => {
    expect(addressSummary(report(), "en")).toBe("3 places: 1 with no address, 1 with no street the App can read, 1 with an address offered.");
    const fr = addressSummary(report(), "fr");
    expect(fr).toBe("3 lieux\u00A0: 1 sans adresse, 1 sans rue lisible, dont 1 avec une adresse proposée.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("tells what the copy changed, with singular and plural", () => {
    expect(copySummary(copy(2, 3, 1), "en")).toBe("2 places were given an address, on 3 notes; the App can read the street of 1.");
    expect(copySummary(copy(1, 1, 1), "en")).toBe("1 place was given an address, on 1 note; the App can read the street of 1.");
    const fr = copySummary(copy(2, 3, 1), "fr");
    expect(fr).toBe("2 lieux ont reçu une adresse, sur 3 notes\u202F; l’App peut lire la rue de 1.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
    expect(copySummary(copy(1, 1, 0), "fr")).toBe("1 lieu a reçu une adresse, sur 1 note\u202F; l’App peut lire la rue de 0.");
  });

  it("shows each change, noting an address with no readable street", () => {
    const row = report().rows[0]!;
    expect(changeText({ row, to: "12 King St W", readable: true, postal: false, joins: false }, "en")).toBe("Café: 12 King St W");
    expect(changeText({ row, to: "By the gate", readable: false, postal: false, joins: false }, "en")).toBe("Café: By the gate (no street the App can read)");
    const fr = changeText({ row, to: "By the gate", readable: false, postal: false, joins: false }, "fr");
    expect(fr).toBe("Café\u00A0: By the gate (aucune rue lisible par l’App)");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });
});

describe("postal codes", () => {
  it("adds the count of places with no postal code when they are listed", () => {
    expect(addressSummary(report(), "en", true)).toBe(
      "3 places: 1 with no address, 1 with no street the App can read, 0 with no postal code the App can read, 1 with an address offered.",
    );
    const fr = addressSummary(report(), "fr", true);
    expect(fr).toContain(", 0 sans code postal lisible,");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("notes a place given an address still with no postal code", () => {
    const row = { ...report().rows[0]!, issue: "no-postal" as const };
    expect(changeText({ row, to: "12 King St W", readable: true, postal: false, joins: false }, "en")).toBe("Café: 12 King St W (no postal code the App can read)");
    expect(changeText({ row, to: "12 King St W M5H 2N2", readable: true, postal: true, joins: false }, "en")).toBe("Café: 12 King St W M5H 2N2");
    expect(changeText({ row, to: "12 King St W", readable: true, postal: false, joins: false }, "fr")).toBe("Café\u00A0: 12 King St W (aucun code postal lisible par l’App)");
  });
});

describe("joining a place", () => {
  it("says when the place now joins one already at that address", () => {
    const row = report().rows[0]!;
    expect(changeText({ row, to: "12 King St W", readable: true, postal: false, joins: true }, "en")).toBe(
      "Café: 12 King St W (joins the place with this name already at this address; their records go together)",
    );
    const fr = changeText({ row, to: "12 King St W", readable: true, postal: false, joins: true }, "fr");
    expect(fr).toBe("Café\u00A0: 12 King St W (rejoint le lieu du même nom déjà à cette adresse\u202F; leurs données sont réunies)");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });
});

describe("the places line", () => {
  it("gives the count before and after, and how many joined another", () => {
    expect(placesLine(6, 5, "en")).toBe("The file had 6 places; the copy has 5, as 1 joined another.");
    expect(placesLine(1, 1, "en")).toBe("The file had 1 place; the copy has 1.");
    const fr = placesLine(6, 4, "fr");
    expect(fr).toBe("Le fichier comptait 6 lieux\u202F; la copie en compte 4, car 2 lieux en ont rejoint un autre.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
    expect(placesLine(2, 1, "fr")).toBe("Le fichier comptait 2 lieux\u202F; la copie en compte 1, car 1 lieu en a rejoint un autre.");
  });
});

describe("the text list", () => {
  it("lists each place with the addresses in the file, ending with one newline", () => {
    expect(addressesText(report(), TODAY, "en")).toBe(
      [
        "Places to add an address to",
        "2026-11-21",
        "",
        C.textIntro.en,
        "3 places: 1 with no address, 1 with no street the App can read, 1 with an address offered.",
        "",
        "1. Café — No address — 2 notes",
        "    In the file: 12 King St W",
        "",
        "2. Kiosk, Main Street — No house number and street the App can read — 1 note",
        "",
      ].join("\n"),
    );
  });

  it("is in French with French spacing", () => {
    const text = addressesText(report(), TODAY, "fr");
    expect(text).toContain("    Dans le fichier\u00A0: 12 King St W\n");
    for (const line of text.split("\n")) expect(frenchTypographyIssues(line), line).toEqual([]);
  });

  it("names the text file", () => {
    expect(addressFilename("text", TODAY, "en")).toBe("places-without-address-2026-11-21.txt");
    expect(addressFilename("text", TODAY, "fr")).toBe("lieux-sans-adresse-2026-11-21.txt");
  });
});

describe("file names", () => {
  it("dates the copy and the list, in each language, without accents", () => {
    expect(addressFilename("copy", TODAY, "en")).toBe("notes-addresses-added-2026-11-21.json");
    expect(addressFilename("csv", TODAY, "en")).toBe("places-without-address-2026-11-21.csv");
    expect(addressFilename("copy", TODAY, "fr")).toBe("notes-adresses-ajoutees-2026-11-21.json");
    expect(addressFilename("csv", TODAY, "fr")).toBe("lieux-sans-adresse-2026-11-21.csv");
    for (const k of ["copy", "csv"] as const) for (const l of ["en", "fr"] as const) expect(addressFilename(k, TODAY, l)).toMatch(/^[a-z0-9.-]+$/);
  });
});
