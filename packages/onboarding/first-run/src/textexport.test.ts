import { describe, expect, it } from "vitest";
import {
  COPY,
  FACT_KEYS,
  compareToText,
  compareFilename,
  decodeTextExportHref,
  findBanned,
  groupPlaces,
  parseNote,
  placeFilename,
  placeToText,
  shortlistFilename,
  shortlistToText,
  textExportHref,
  type FactKey,
  type Note,
  type Place,
} from "./index";

const TODAY = new Date(Date.UTC(2026, 10, 15));

interface Rec {
  readonly key: FactKey;
  readonly value: "yes" | "no";
  readonly on?: string;
}

function note(id: string, name: string, recs: readonly Rec[] = [], text?: string, address?: string): Note {
  const facts = FACT_KEYS.map((key) => {
    const r = recs.find((x) => x.key === key);
    return r
      ? { key, value: r.value, provenance: { source: "City survey", licence: "CC0-1.0", recordedOn: r.on ?? "2026-10-01" } }
      : { key, value: "unknown" };
  });
  const n = parseNote({ id, placeName: name, address, note: text, createdOn: "2026-10-01", licence: "CC0-1.0", facts });
  if (!n) throw new Error(`bad test note ${id}`);
  return n;
}

const group = (notes: Note[]): Place[] => groupPlaces(notes, "en");

describe("placeToText", () => {
  const place = group([
    note("a", "Archive", [{ key: "elevator", value: "yes", on: "2024-02-02" }], "Ask at the desk", "1 Main St"),
    note("b", "Archive", [{ key: "automatic-door", value: "yes" }], undefined, "1 Main St"),
    note("c", "Archive", [{ key: "automatic-door", value: "no", on: "2026-11-01" }], undefined, "1 Main St"),
  ])[0] as Place;

  it("starts with the name, an underline and the address", () => {
    const lines = placeToText(place, "en", TODAY).split("\n");
    expect(lines[0]).toBe("Archive");
    expect(lines[1]).toBe("=======");
    expect(lines[2]).toBe("1 Main St");
  });

  it("has a line for every detail, with its source, licence and date when recorded", () => {
    const text = placeToText(place, "en", TODAY);
    // One line (or block) for each detail the App tracks.
    for (const k of FACT_KEYS) expect(text, k).toContain(COPY.facts[k].en);
    expect(text).toMatch(/Elevator: Yes\. Source: City survey\. Licence: CC0-1\.0\. Recorded on 2024-02-02 \(\d+ months ago\)\. May be out of date\./);
  });

  it("says Unknown with no source for a detail that has no record", () => {
    const text = placeToText(place, "en", TODAY);
    const unknownLines = text.split("\n").filter((l) => l.includes(": Unknown."));
    expect(unknownLines.length).toBe(FACT_KEYS.filter((k) => place.resolutions[k].kind === "unknown").length);
    for (const l of unknownLines) {
      expect(l).toContain("No record.");
      expect(l).not.toContain("Source");
    }
  });

  it("lists every report when reports differ and picks none", () => {
    const text = placeToText(place, "en", TODAY);
    const at = text.indexOf("Reports differ");
    expect(at).toBeGreaterThan(-1);
    const block = text.slice(at, text.indexOf("\n\n", at) === -1 ? undefined : text.indexOf("\n\n", at));
    expect(block.match(/^ {2}- /gm)).toHaveLength(2);
    expect(block).toContain("Yes.");
    expect(block).toContain("No.");
  });

  it("includes the note text with its date and licence", () => {
    expect(placeToText(place, "en", TODAY)).toContain("- 2026-10-01 · CC0-1.0: Ask at the desk");
  });

  it("ends with the date it was made, and a final newline", () => {
    const text = placeToText(place, "en", TODAY);
    expect(text.trimEnd().endsWith("Made on 2026-11-15.")).toBe(true);
    expect(text.endsWith("\n")).toBe(true);
  });

  it("is in French with a no-break space before colons", () => {
    const text = placeToText(place, "fr", TODAY);
    expect(text).toContain("Ascenseur\u00A0: Oui. Source\u00A0: City survey.");
    expect(text).toContain("Créé le 2026-11-15.");
    expect(text).toContain("Rapports divergents");
    expect(text).toContain("Aucune donnée enregistrée.");
  });

  it("uses no wording that vouches for the details", () => {
    for (const l of ["en", "fr"] as const) expect(findBanned(placeToText(place, l, TODAY))).toBeUndefined();
  });

  it("leaves out the notes heading when no note has text", () => {
    const bare = group([note("a", "Bare")])[0] as Place;
    expect(placeToText(bare, "en", TODAY)).not.toContain("Notes about this place");
  });

  it("does not change the place", () => {
    const before = JSON.stringify(place);
    placeToText(place, "en", TODAY);
    expect(JSON.stringify(place)).toBe(before);
  });
});

describe("compareToText", () => {
  const places = group([
    note("a", "Archive", [{ key: "elevator", value: "yes" }]),
    note("b", "Bakery", [{ key: "elevator", value: "no" }]),
  ]);

  it("names the places and has a block for every detail when nothing was asked for", () => {
    const text = compareToText(places, {}, "en", TODAY);
    expect(text.split("\n")[0]).toBe("Compare places");
    expect(text).toContain("Archive | Bakery");
    const headings = text.split("\n").filter((l) => /^-+$/.test(l));
    expect(headings).toHaveLength(FACT_KEYS.length);
    for (const k of FACT_KEYS) expect(text.split("\n")).toContain(COPY.facts[k].en);
    expect(text).not.toContain("You asked for");
  });

  it("shows only what was asked for, with whether each place matches", () => {
    const text = compareToText(places, { elevator: "yes" }, "en", TODAY);
    expect(text).toContain("Elevator (You asked for: Yes)");
    expect(text).toContain("  Matches");
    expect(text).toContain("  Does not match");
    expect(text).not.toContain("Automatic door");
  });

  it("repeats each place's own source and date", () => {
    const text = compareToText(places, { elevator: "yes" }, "en", TODAY);
    expect(text.match(/Source: City survey\./g)).toHaveLength(2);
    expect(text.match(/Recorded on 2026-10-01/g)).toHaveLength(2);
  });

  it("does not score or rank", () => {
    for (const l of ["en", "fr"] as const) {
      const text = compareToText(places, { elevator: "yes" }, l, TODAY);
      expect(findBanned(text)).toBeUndefined();
      // The intro may say nothing is scored; no row or status may.
      expect(text.split("\n").slice(6).join("\n")).not.toMatch(/\b(best|worst|score|rank|meilleur|pire|classement)/i);
    }
  });

  it("puts a no-break space before the colon after the French words for what was asked", () => {
    const text = compareToText(places, { elevator: "yes" }, "fr", TODAY);
    expect(text).toContain("(Vous avez demandé\u00A0: Oui)");
  });
});

describe("filenames", () => {
  it("are plain ASCII and carry the place id and language", () => {
    const p = group([note("a", "Éclair Café", [], undefined, "1 Rue")])[0] as Place;
    expect(placeFilename(p, "fr")).toBe(`place-${p.id}-fr.txt`);
    expect(placeFilename(p, "fr")).toMatch(/^[a-z0-9.-]+$/);
    expect(compareFilename([p, p, p], "en")).toBe("compare-3-places-en.txt");
  });
});

describe("text links", () => {
  it("round-trips any text, including accents, new lines and percent signs", () => {
    for (const s of ["", "plain", "Éclair Café\nLigne 2", "100% sure & <b>bold</b>", "a\u00A0: b", "emoji ♿ ok"]) {
      expect(decodeTextExportHref(textExportHref(s)), s).toBe(s);
    }
  });

  it("is a text data link and nothing else", () => {
    expect(textExportHref("x").startsWith("data:text/plain;charset=utf-8,")).toBe(true);
    expect(textExportHref("<script>")).not.toContain("<");
  });

  it("refuses a link that is not one of its own, or is damaged", () => {
    expect(decodeTextExportHref("https://example.org/a")).toBeUndefined();
    expect(decodeTextExportHref("data:application/json;charset=utf-8,%7B%7D")).toBeUndefined();
    expect(decodeTextExportHref("data:text/plain;charset=utf-8,%E0%A4%A")).toBeUndefined();
  });
});

describe("shortlistToText", () => {
  const all = group([
    note("a", "Archive", [{ key: "elevator", value: "yes" }], "Ask at the desk", "1 Main St"),
    note("b", "Bakery", [{ key: "elevator", value: "no" }], undefined, "2 Side Rd"),
    note("c", "Cinema", [], undefined, "3 High St"),
  ]);

  it("starts with the title, what a shortlist is, and does not rank", () => {
    const text = shortlistToText(all, "en", TODAY);
    const lines = text.split("\n");
    expect(lines[0]).toBe("Shortlist");
    expect(lines[1]).toBe("=========");
    expect(text).toContain("It does not rank them.");
  });

  it("writes every place in the order given, each with all its details", () => {
    const text = shortlistToText([all[2] as Place, all[0] as Place], "en", TODAY);
    expect(text.indexOf("Cinema")).toBeGreaterThan(-1);
    expect(text.indexOf("Cinema")).toBeLessThan(text.indexOf("Archive"));
    expect(text).not.toContain("Bakery");
    for (const k of FACT_KEYS) expect(text.split("\n").filter((l) => l.startsWith(COPY.facts[k].en + ":"))).toHaveLength(2);
  });

  it("keeps each place's source, licence and date, and says Unknown with none", () => {
    const text = shortlistToText(all, "en", TODAY);
    expect(text.match(/Source: City survey\./g)).toHaveLength(2);
    expect(text).toContain("Ask at the desk");
    expect(text.split("\n").filter((l) => l.includes(": Unknown.")).every((l) => l.includes("No record."))).toBe(true);
  });

  it("separates places and ends with the date and a final newline", () => {
    const text = shortlistToText(all, "en", TODAY);
    expect(text.match(/^\* \* \*$/gm)).toHaveLength(3);
    expect(text.trimEnd().endsWith("Made on 2026-11-15.")).toBe(true);
    expect(text.endsWith("\n")).toBe(true);
  });

  it("is in French with the French title and a no-break space before colons", () => {
    const text = shortlistToText(all, "fr", TODAY);
    expect(text.startsWith("Liste courte\n============")).toBe(true);
    expect(text).toContain("Ascenseur\u00A0: Oui.");
    expect(text).toContain("ne les classe pas");
    for (const l of ["en", "fr"] as const) expect(findBanned(shortlistToText(all, l, TODAY))).toBeUndefined();
  });

  it("writes a short list for no places, and a plain name for the file", () => {
    expect(shortlistToText([], "en", TODAY)).toContain("Made on 2026-11-15.");
    expect(shortlistFilename(2, "en")).toBe("shortlist-2-places-en.txt");
    expect(shortlistFilename(1, "fr")).toBe("shortlist-1-places-fr.txt");
  });
});
