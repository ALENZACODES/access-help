import { describe, expect, it } from "vitest";
import {
  COPY,
  FACT_KEYS,
  compareToText,
  findBanned,
  frenchTypographyIssues,
  groupPlaces,
  placeToText,
  shortlistToText,
  sourcesToText,
  collectSources,
  summarisePlaces,
  summaryToText,
  type Locale,
} from "./index";
import { makeRng, randomNotes, randomRequirement } from "./testkit";

const TODAY = new Date(Date.UTC(2026, 10, 15));
const LOCALES: Locale[] = ["en", "fr"];
const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);

/** The line a detail starts with, in either language, with the colon the language uses. */
const detailLine = (l: Locale, key: (typeof FACT_KEYS)[number]): string => COPY.facts[key][l] + (l === "fr" ? "\u00A0: " : ": ");

describe("text files for random notes", () => {
  it("never print a missing value, in any file or language", () => {
    for (const seed of SEEDS) {
      const places = groupPlaces(randomNotes(makeRng(seed), 8), "en");
      for (const l of LOCALES) {
        const texts = [
          ...places.map((p) => placeToText(p, l, TODAY)),
          compareToText(places.slice(0, 3), randomRequirement(makeRng(seed)), l, TODAY),
          shortlistToText(places, l, TODAY),
          summaryToText(summarisePlaces(places, TODAY), l),
          sourcesToText(collectSources(randomNotes(makeRng(seed), 8), TODAY), l),
        ];
        for (const text of texts) expect(text, `${seed} ${l}`).not.toMatch(/undefined|NaN|\[object|null/);
      }
    }
  });

  it("give every Yes or No a source, a licence and a date, and no Unknown any of them", () => {
    for (const seed of SEEDS) {
      for (const p of groupPlaces(randomNotes(makeRng(seed + 40), 8), "en")) {
        for (const l of LOCALES) {
          const lines = placeToText(p, l, TODAY).split("\n");
          for (const k of FACT_KEYS) {
            const own = lines.filter((x) => x.startsWith(detailLine(l, k)));
            expect(own.length, `${p.name} ${k}`).toBeGreaterThanOrEqual(1);
            const first = own[0] as string;
            const kind = p.resolutions[k].kind;
            if (kind === "unknown") {
              expect(first).toContain(l === "fr" ? "UNKNOWN" : "Unknown");
              expect(first).not.toMatch(/Source|Licen[cs]e/);
            } else if (kind === "agree") {
              expect(first, `${p.name} ${k}`).toMatch(/Source/);
              expect(first).toMatch(/\d{4}-\d{2}-\d{2}/);
              expect(first).toMatch(/Licen[cs]e/);
            } else {
              expect(first).toContain(COPY.places.differ[l]);
              const reports = lines.filter((x) => x.startsWith("  - "));
              expect(reports.length).toBeGreaterThanOrEqual(2);
            }
          }
        }
      }
    }
  });

  it("do not vouch for anything and keep to the App's French typography", () => {
    for (const seed of SEEDS) {
      const places = groupPlaces(randomNotes(makeRng(seed + 80), 6), "en");
      for (const l of LOCALES) {
        const all = [placeToText(places[0]!, l, TODAY), shortlistToText(places, l, TODAY), summaryToText(summarisePlaces(places, TODAY), l)];
        for (const text of all) {
          expect(findBanned(text), `${seed} ${l}`).toBeUndefined();
          if (l === "fr") {
            // The notes' own names and sources are English test data; only the App's lines are checked.
            for (const line of text.split("\n").filter((x) => /^[A-Za-zÀ-ÿ’ ]+\u00A0: /.test(x))) expect(frenchTypographyIssues(line), line).toEqual([]);
          }
        }
      }
    }
  });

  it("make the same file for the same notes, whatever order they were saved in", () => {
    for (const seed of SEEDS) {
      const notes = randomNotes(makeRng(seed + 120), 8);
      const a = groupPlaces(notes, "en");
      const b = groupPlaces([...notes].reverse(), "en");
      expect(shortlistToText(b, "en", TODAY), `${seed}`).toBe(shortlistToText(a, "en", TODAY));
      expect(summaryToText(summarisePlaces(b, TODAY), "en")).toBe(summaryToText(summarisePlaces(a, TODAY), "en"));
    }
  });

  it("have a line for every detail in every comparison, and only the asked-for ones when asked", () => {
    for (const seed of SEEDS) {
      const places = groupPlaces(randomNotes(makeRng(seed + 160), 6), "en").slice(0, 3);
      if (places.length < 2) continue;
      const req = randomRequirement(makeRng(seed + 161));
      const asked = FACT_KEYS.filter((k) => req[k] !== undefined);
      const text = compareToText(places, req, "en", TODAY);
      const headings = text.split("\n").filter((x) => /^-+$/.test(x)).length;
      expect(headings, `${seed}`).toBe(asked.length > 0 ? asked.length : FACT_KEYS.length);
      for (const p of places) expect(text).toContain(p.name);
    }
  });
});
