import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { ISSUE_KINDS, checkAddresses, type AddressReport } from "./addresscheck";
import { auditCopy } from "./audit";
import { exportNotes } from "./exchange";
import {
  FILE_ADDRESS_COPY,
  addressErrorText,
  addressFilename,
  addressText,
  copySummary,
  fileAddressStrings,
  formsText,
  kindHint,
  kindTitle,
  reportSummary,
  suggestionText,
} from "./fileaddress-copy";
import { readStreetFile } from "./filestreets";
import { testNote } from "./testnotes";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function report(notes = [testNote("d", "Deli", [], "7 Queen St E, M5C 2NO"), testNote("k", "Kiosk", [], "Market Square")]): AddressReport {
  const r = readStreetFile(exportNotes(notes, "2026-11-01"), TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return checkAddresses(r.file, "en");
}

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileAddressStrings())).toEqual([]);
  });

  it("has a title and a hint for every kind of issue, and a message for every file error, without banned words", () => {
    for (const l of ["en", "fr"] as const) {
      for (const k of ISSUE_KINDS) {
        expect(findBanned(kindTitle(k, l)), k).toBeUndefined();
        expect(findBanned(kindHint(k, l)), k).toBeUndefined();
      }
      for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(addressErrorText(e, l).length).toBeGreaterThan(0);
    }
  });

  it("says a corner is a real place and a street may cross postal areas", () => {
    expect(kindHint("intersection", "en")).toContain("That is a real place");
    expect(kindHint("postal-other-area", "en")).toContain("A street can cross areas, so this may be right");
    expect(kindHint("postal-other-area", "fr")).toContain("L’App ne devine pas de code.");
  });

  it("says the App does not guess a code it cannot read, and that the file does not change", () => {
    expect(FILE_ADDRESS_COPY.kinds["postal-invalid"].hint.en).toContain("The App does not guess what was meant.");
    expect(FILE_ADDRESS_COPY.privacy.en).toContain("Your file does not change.");
  });
});

describe("reportSummary", () => {
  it("counts every kind of issue and the streets written more than one way", () => {
    const r = report();
    expect(reportSummary(r, "en")).toBe(
      "2 places: 0 with no address, 0 at a crossing of streets, 1 with no house number and street, 1 postal code that may be mistyped, 0 texts that cannot be a postal code, 0 postal areas unlike the rest of the street, 0 postal codes written another way; 0 streets written more than one way; 0 addresses with several names.",
    );
    const fr = reportSummary(r, "fr");
    expect(fr).toBe(
      "2 lieux\u00A0: 0 sans adresse, 0 à un croisement, 1 sans numéro ni rue, 1 code postal peut-être mal tapé, 0 texte qui ne peut pas être un code postal, 0 zone postale différente du reste de la rue, 0 code postal écrit autrement\u202F; 0 rue écrite de plusieurs façons\u202F; 0 adresse avec plusieurs noms.",
    );
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("uses the plural in French past one", () => {
    const fr = reportSummary(report([testNote("a", "A", [], "1 Oak St, M5C 2NO"), testNote("b", "B", [], "2 Oak St, M5C 2NI"), testNote("c", "C", [], "3 Oak St, m5h2n2"), testNote("d", "D", [], "4 Oak St, m5h2n3")]), "fr");
    expect(fr).toContain("2 codes postaux peut-être mal tapés");
    expect(fr).toContain("2 codes postaux écrits autrement");
  });

  it("says when nothing keeps the App from reading the addresses", () => {
    expect(reportSummary(report([testNote("a", "A", [], "1 Oak St, M5H 2N2")]), "en")).toBe("1 place. Nothing in these addresses keeps the App from reading them.");
  });
});

describe("addressText", () => {
  it("prints each kind of issue with its places, then the streets and names", () => {
    const text = addressText(
      report([
        testNote("d", "Deli", [], "7 Queen St E, M5C 2NO"),
        testNote("k", "Kiosk", [], "Market Square"),
        testNote("a", "A", [], "1 King St W"),
        testNote("b", "B", [], "1 King Street West"),
      ]),
      "en",
      TODAY,
    );
    expect(text.split("\n").slice(0, 2)).toEqual(["Check the addresses in a file", "Made on 2026-11-21"]);
    expect(text).toContain("Addresses with no house number and street (1)\n  Kiosk, Market Square\n");
    expect(text).toContain("Postal codes that may be mistyped (1)\n  Deli, 7 Queen St E, M5C 2NO [M5C 2NO → M5C 2N0]\n");
    expect(text).toContain("Streets written more than one way (1)\n  King St W (1 place), King Street West (1 place)\n");
    expect(text).toContain("One address, several names (1)\n  1 King St W: A / B\n");
  });

  it("keeps French typography outside the file's own words", () => {
    const text = addressText(report(), "fr", TODAY);
    for (const line of text.split("\n")) if (!line.startsWith("  ")) expect(frenchTypographyIssues(line), line).toEqual([]);
  });
});

describe("small texts", () => {
  it("shows a code and its suggestion", () => {
    const r = report();
    const deli = r.issues.find((i) => i.kind === "postal-mistyped");
    if (!deli) throw new Error("no issue");
    expect(suggestionText(deli)).toBe("M5C 2NO → M5C 2N0");
  });

  it("lists a street's ways of writing", () => {
    expect(formsText({ key: "k", forms: [{ text: "King St W", places: 2 }, { text: "King Street West", places: 1 }] }, "fr")).toBe("King St W (2 lieux), King Street West (1 lieu)");
  });

  it("says what a copy changes and which places it joins", () => {
    expect(copySummary({ notes: [], changedNotes: 3, changedPlaces: 2, joined: 0 }, "en")).toBe("The copy changes the address of 2 places (3 notes).");
    expect(copySummary({ notes: [], changedNotes: 1, changedPlaces: 1, joined: 1 }, "en")).toBe(
      "The copy changes the address of 1 place (1 note). 1 place now has the same name and address as another and is shown as one with it.",
    );
    const fr = copySummary({ notes: [], changedNotes: 4, changedPlaces: 3, joined: 2 }, "fr");
    expect(fr).toBe("La copie change l’adresse de 3 lieux (4 notes). 2 lieux ont maintenant le même nom et la même adresse qu’un autre lieu et sont présentés avec lui comme un seul.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("names the downloads", () => {
    expect(addressFilename("csv", TODAY, "en")).toBe("addresses-2026-11-21.csv");
    expect(addressFilename("copy", TODAY, "fr")).toBe("notes-adresses-corrigees-2026-11-21.json");
    expect(addressFilename("text", TODAY, "en")).toBe("addresses-2026-11-21.txt");
  });
});
