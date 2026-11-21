import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { removePlaces, type Removal } from "./dropplaces";
import { exportNotes } from "./exchange";
import {
  FILE_DROP_COPY as C,
  chosenTitle,
  dropErrorText,
  dropFilename,
  fileDropStrings,
  foundText,
  keepLabel,
  listResultText,
  placeLine,
  problemText,
  readBackText,
  removalSummary,
  removalText,
  removeLabel,
} from "./filedrop-copy";
import { readStreetFile } from "./filestreets";
import { testNote } from "./testnotes";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function file() {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("a1", "Café A", [], "10 King St W"),
        testNote("a2", "Café A", [], "10 King St W"),
        testNote("k", "Kiosk", [], null),
        testNote("b", "Bakery", [], "20 King St W"),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const removal = (...names: string[]): Removal => {
  const f = file();
  return removePlaces(f, f.places.filter((p) => names.includes(p.name)).map((p) => p.id));
};

const place = (name: string) => {
  const p = file().places.find((x) => x.name === name);
  if (!p) throw new Error("no place");
  return p;
};

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileDropStrings())).toEqual([]);
  });

  it("has French typography and no banned words in every string", () => {
    for (const [path, pair] of fileDropStrings()) {
      expect(frenchTypographyIssues(pair.fr), path).toEqual([]);
      expect(findBanned(pair.en), path).toBeUndefined();
      expect(findBanned(pair.fr), path).toBeUndefined();
    }
  });

  it("says that the controls that take things out remove them", () => {
    expect(C.clear.en).toMatch(/^Remove/);
    expect(C.clear.fr).toMatch(/^Retirer/);
    expect(C.title.en).toMatch(/^Remove/);
    expect(C.title.fr).toMatch(/^Retirer/);
    for (const n of [0, 1, 3]) {
      expect(removeLabel(n, "en")).toMatch(/^Remove/);
      expect(removeLabel(n, "fr")).toMatch(/^Retirer/);
    }
  });

  it("has words for every problem and file error", () => {
    for (const l of ["en", "fr"] as const) {
      for (const p of ["none", "too-long", "control", "list-empty", "list-long"] as const) expect(problemText(p, l).length).toBeGreaterThan(0);
      for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(dropErrorText(e, l).length).toBeGreaterThan(0);
    }
  });
});

describe("foundText", () => {
  it("says how many places were found and how many are listed", () => {
    expect(foundText(3, 3, "en")).toBe("3 places found.");
    expect(foundText(1, 1, "en")).toBe("1 place found.");
    expect(foundText(30, 41, "en")).toBe("41 places found; the first 30 are listed. Add words to narrow the search.");
    expect(foundText(0, 0, "en")).toBe(C.noneFound.en);
    expect(foundText(1, 1, "fr")).toBe("1 lieu trouvé.");
    const fr = foundText(30, 41, "fr");
    expect(fr).toBe("41 lieux trouvés\u202F; les 30 premiers sont listés. Ajoutez des mots pour préciser la recherche.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });
});

describe("listResultText", () => {
  it("says what the list ticked, quoting the lines as written", () => {
    expect(listResultText({ ids: [], matched: 2, unmatched: [], ambiguous: [] }, "en")).toBe("2 lines ticked a place.");
    expect(listResultText({ ids: [], matched: 0, unmatched: ["Pizza"], ambiguous: [{ line: "Café", places: 3 }] }, "en")).toBe(
      "No line ticked a place. 1 line names no place in the file: “Pizza”. 1 line names more than one place: “Café” (3 places). Find those by address.",
    );
    expect(listResultText({ ids: [], matched: 1, unmatched: ["A", "B"], ambiguous: [] }, "en")).toBe("1 line ticked a place. 2 lines name no place in the file: “A”, “B”.");
  });

  it("says it in French with its spacing", () => {
    const fr = listResultText({ ids: [], matched: 1, unmatched: ["Pizza", "Bar"], ambiguous: [{ line: "Café", places: 2 }] }, "fr");
    expect(fr).toBe(
      "1 ligne a coché un lieu. 2 lignes ne nomment aucun lieu du fichier\u00A0: «\u202FPizza\u202F», «\u202FBar\u202F». 1 ligne nomme plus d’un lieu\u00A0: «\u202FCafé\u202F» (2 lieux). Trouvez-les par adresse.",
    );
    expect(frenchTypographyIssues(fr)).toEqual([]);
    expect(listResultText({ ids: [], matched: 0, unmatched: [], ambiguous: [] }, "fr")).toBe("Aucune ligne n’a coché de lieu.");
    expect(listResultText({ ids: [], matched: 3, unmatched: [], ambiguous: [] }, "fr")).toBe("3 lignes ont coché un lieu.");
  });
});

describe("labels", () => {
  it("names the place in each button and line", () => {
    expect(keepLabel(place("Café A"), "en")).toBe("Do not remove Café A");
    expect(keepLabel(place("Café A"), "fr")).toBe("Ne pas retirer Café A");
    expect(placeLine(place("Café A"), "en")).toBe("Café A, 10 King St W");
    expect(placeLine(place("Kiosk"), "fr")).toBe("Kiosk, Aucune adresse");
    expect(chosenTitle(2, "en")).toBe("Places to remove (2)");
    expect(chosenTitle(0, "fr")).toBe("Lieux à retirer (0)");
  });

  it("counts the places in the remove button", () => {
    expect(removeLabel(0, "en")).toBe("Remove the ticked places from the copy");
    expect(removeLabel(1, "en")).toBe("Remove 1 place from the copy");
    expect(removeLabel(3, "fr")).toBe("Retirer 3 lieux de la copie");
  });
});

describe("removalSummary", () => {
  it("counts places and notes taken out and kept", () => {
    expect(removalSummary(removal("Café A"), "en")).toBe("1 place and 2 notes taken out; 2 places and 2 notes kept.");
    expect(removalSummary(removal("Kiosk"), "en")).toBe("1 place and 1 note taken out; 2 places and 3 notes kept.");
    const fr = removalSummary(removal("Café A", "Kiosk"), "fr");
    expect(fr).toBe("2 lieux et 3 notes retirées\u202F; 1 lieu et 1 note gardée.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("says whether the copy read back", () => {
    expect(readBackText({ ok: true, notes: 1, places: 1 }, "en")).toBe(C.readBackOk.en);
    expect(readBackText({ ok: false, reason: "count" }, "fr")).toBe(C.readBackFailed.fr);
  });
});

describe("removalText", () => {
  it("lists each place taken out with its notes, and the reason", () => {
    const text = removalText(removal("Café A", "Kiosk"), "  Closed in October ", TODAY, "en");
    expect(text).toBe(
      "Places taken out\n2026-11-21\n\n2 places and 3 notes taken out; 1 place and 1 note kept.\nWhy: Closed in October\n\n- Café A, 10 King St W (2 notes)\n- Kiosk, No address (1 note)\n",
    );
  });

  it("leaves out an empty reason and uses French spacing", () => {
    const text = removalText(removal("Kiosk"), "", TODAY, "fr");
    expect(text).not.toContain("Pourquoi");
    expect(text).toContain("- Kiosk, Aucune adresse (1 note)\n");
    const why = removalText(removal("Kiosk"), "fermé", TODAY, "fr");
    expect(why).toContain("Pourquoi\u00A0: fermé\n");
    for (const line of why.split("\n")) expect(frenchTypographyIssues(line), line).toEqual([]);
  });
});

describe("dropFilename", () => {
  it("names each file by kind, count and day", () => {
    expect(dropFilename("copy", 3, TODAY, "en")).toBe("notes-without-3-places-2026-11-21.json");
    expect(dropFilename("removed", 1, TODAY, "en")).toBe("notes-taken-out-1-place-2026-11-21.json");
    expect(dropFilename("list", 2, TODAY, "en")).toBe("places-taken-out-2-places-2026-11-21.txt");
    expect(dropFilename("copy", 1, TODAY, "fr")).toBe("notes-sans-1-lieu-2026-11-21.json");
    expect(dropFilename("removed", 2, TODAY, "fr")).toBe("notes-retirees-2-lieux-2026-11-21.json");
    expect(dropFilename("list", 2, TODAY, "fr")).toBe("lieux-retires-2-lieux-2026-11-21.txt");
  });
});
