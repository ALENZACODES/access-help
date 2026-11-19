import { describe, expect, it } from "vitest";
import { CONTRIBUTOR_SOURCE, auditCopy, findBanned, groupPlaces, hasAllParts, historyToText, placeHistory, type Note, type Place } from "./index";
import { CHANGE_COPY, answerChanges, changeHeadline, changeStrings, changesToText } from "./changes";
import { makeRng, randomNotes } from "./testkit";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));

const onePlace = (notes: readonly Note[]): Place => {
  const p = groupPlaces(notes, "en")[0];
  if (!p) throw new Error("no place");
  return p;
};

// Elevator: Yes (2024), No (2025), No (2026). Door: Yes, then No on the same day.
const LIBRARY = (): Note[] => [
  testNote("n1", "Library", [{ key: "elevator", value: "yes", on: "2024-01-10" }]),
  testNote("n2", "Library", [{ key: "elevator", value: "no", on: "2025-06-01", source: CONTRIBUTOR_SOURCE }]),
  testNote("n3", "Library", [
    { key: "elevator", value: "no", on: "2026-09-09" },
    { key: "automatic-door", value: "yes", on: "2026-03-03", source: "Town open data", licence: "OGL-Canada-2.0" },
  ]),
  testNote("n4", "Library", [{ key: "automatic-door", value: "no", on: "2026-03-03" }]),
];

describe("answerChanges", () => {
  it("lists each record that gave a different answer from the one before, oldest first", () => {
    const changes = answerChanges(placeHistory(onePlace(LIBRARY())));
    expect(changes.map((c) => [c.key, c.from.value, c.to.value, c.to.provenance.recordedOn])).toEqual([
      ["elevator", "yes", "no", "2025-06-01"],
      ["automatic-door", "yes", "no", "2026-03-03"],
    ]);
  });

  it("keeps both records whole", () => {
    const [first] = answerChanges(placeHistory(onePlace(LIBRARY())));
    expect(first?.from.provenance).toEqual({ source: "City survey", licence: "CC0-1.0", recordedOn: "2024-01-10" });
    expect(first?.to.provenance).toEqual({ source: CONTRIBUTOR_SOURCE, licence: "CC0-1.0", recordedOn: "2025-06-01" });
  });

  it("marks a change between two records of the same day", () => {
    const changes = answerChanges(placeHistory(onePlace(LIBRARY())));
    expect(changes.map((c) => c.sameDay)).toEqual([false, true]);
  });

  it("finds nothing when answers never change, or nothing is recorded", () => {
    const steady = onePlace([testNote("a", "Hall", [{ key: "elevator", value: "yes", on: "2025-01-01" }]), testNote("b", "Hall", [{ key: "elevator", value: "yes" }])]);
    expect(answerChanges(placeHistory(steady))).toEqual([]);
    expect(answerChanges(placeHistory(onePlace([testNote("e", "Empty", [])])))).toEqual([]);
  });

  it("matches the history's own count of changes on random notes", () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const place of groupPlaces(randomNotes(makeRng(seed), 10), "en")) {
        const h = placeHistory(place);
        const changes = answerChanges(h);
        expect(changes.length, String(seed)).toBe(h.details.reduce((n, d) => n + d.changes, 0));
        for (const c of changes) {
          expect(c.from.value, String(seed)).not.toBe(c.to.value);
          expect(c.from.provenance.recordedOn <= c.to.provenance.recordedOn, String(seed)).toBe(true);
        }
        const dates = changes.map((c) => c.to.provenance.recordedOn);
        expect(dates, String(seed)).toEqual([...dates].sort());
      }
    }
  });
});

describe("wording", () => {
  it("writes a headline in both languages", () => {
    const [c] = answerChanges(placeHistory(onePlace(LIBRARY())));
    expect(c && changeHeadline(c, "en")).toBe("Elevator: Yes, then No.");
    expect(c && changeHeadline(c, "fr")).toBe("Ascenseur\u00A0: Oui, puis Non.");
  });

  it("passes the App's copy audit and never calls a record right or wrong", () => {
    expect(auditCopy(changeStrings()).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
    for (const [, p] of changeStrings()) {
      for (const text of [p.en, p.fr]) {
        expect(findBanned(text), text).toBeUndefined();
        expect(text).not.toMatch(/\b(correct(ed)?|wrong|fixed|faux|fausse|corrigé|trusted|fiable)\b/i);
      }
    }
  });
});

describe("changes in the history text", () => {
  it("adds every change with both records in full", () => {
    const place = onePlace(LIBRARY());
    const h = placeHistory(place);
    const lines = changesToText(h, "en");
    expect(lines[0]).toBe(CHANGE_COPY.title.en);
    expect(lines).toContain("* Elevator: Yes, then No.");
    const changes = answerChanges(h);
    const befores = lines.filter((x) => x.startsWith("  Before: "));
    const afters = lines.filter((x) => x.startsWith("  After: "));
    expect(befores).toHaveLength(changes.length);
    changes.forEach((c, i) => {
      expect(hasAllParts(befores[i] ?? "", c.from.provenance, "en"), befores[i]).toBe(true);
      expect(hasAllParts(afters[i] ?? "", c.to.provenance, "en"), afters[i]).toBe(true);
    });
    expect(lines).toContain(`  ${CHANGE_COPY.sameDay.en}`);
  });

  it("is part of the history file, before the day it was made, in both languages", () => {
    const place = onePlace(LIBRARY());
    for (const l of ["en", "fr"] as const) {
      const text = historyToText(place, placeHistory(place), l, TODAY);
      const at = text.indexOf(`${CHANGE_COPY.title[l]}\n`);
      expect(at, l).toBeGreaterThan(0);
      expect(text.indexOf(CHANGE_COPY.notCorrection[l]), l).toBeGreaterThan(at);
      expect(text.endsWith(l === "fr" ? "Créé le 2026-11-19.\n" : "Made on 2026-11-19.\n"), l).toBe(true);
    }
  });

  it("says when no answer changed", () => {
    const place = onePlace([testNote("a", "Hall", [{ key: "elevator", value: "yes" }])]);
    expect(changesToText(placeHistory(place), "fr")).toContain(CHANGE_COPY.none.fr);
  });
});
