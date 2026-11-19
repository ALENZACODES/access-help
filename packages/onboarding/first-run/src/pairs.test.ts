import { describe, expect, it } from "vitest";
import { COPY, FACT_KEYS, auditCopy, findBanned, findSimilar, groupPlaces, type Note, type Place } from "./index";
import {
  PAIR_COPY,
  PAIR_DETAIL_KINDS,
  answersOf,
  answersText,
  countsLine,
  kindLabel,
  pairCounts,
  pairDetailLine,
  pairDetails,
  pairKind,
  pairStrings,
  pairsFilename,
  pairsToText,
} from "./pairs";
import { makeRng, randomNotes } from "./testkit";
import { testNote } from "./testnotes";

// Library and Libary may be one place saved under two spellings.
const NOTES = (): Note[] => [
  testNote("l1", "Library", [
    { key: "step-free-entry", value: "yes" },
    { key: "accessible-washroom", value: "yes" },
    { key: "elevator", value: "no" },
  ]),
  testNote("l2", "Libary", [
    { key: "step-free-entry", value: "yes" },
    { key: "automatic-door", value: "yes" },
    { key: "elevator", value: "yes" },
  ], null),
];

const placesOf = (notes: readonly Note[]): Place[] => groupPlaces(notes, "en");
const byName = (list: readonly Place[], name: string): Place => {
  const p = list.find((x) => x.name === name);
  if (!p) throw new Error(name);
  return p;
};

describe("pairKind", () => {
  it("covers every case", () => {
    expect(pairKind([], [])).toBe("neither");
    expect(pairKind(["yes"], [])).toBe("only-a");
    expect(pairKind([], ["no"])).toBe("only-b");
    expect(pairKind(["yes"], ["yes"])).toBe("agree");
    expect(pairKind(["no"], ["no"])).toBe("agree");
    expect(pairKind(["yes"], ["no"])).toBe("disagree");
  });

  it("never calls it the same answer when one place already holds two answers", () => {
    expect(pairKind(["yes", "no"], ["yes"])).toBe("disagree");
    expect(pairKind(["yes", "no"], ["yes", "no"])).toBe("disagree");
  });

  it("is symmetric apart from which place has the only record", () => {
    const values: Array<("yes" | "no")[]> = [[], ["yes"], ["no"], ["yes", "no"]];
    const swap = { "only-a": "only-b", "only-b": "only-a" } as const;
    for (const a of values) {
      for (const b of values) {
        const k = pairKind(a, b);
        expect(pairKind(b, a), `${a}|${b}`).toBe(k === "only-a" || k === "only-b" ? swap[k] : k);
      }
    }
  });
});

describe("answersOf", () => {
  it("gives no answer for no record, and each answer once, Yes before No", () => {
    const notes = [testNote("a", "Hall", [{ key: "elevator", value: "no", on: "2026-01-01" }]), testNote("b", "Hall", [{ key: "elevator", value: "yes" }]), testNote("c", "Hall", [{ key: "elevator", value: "no" }])];
    const hall = placesOf(notes)[0] as Place;
    expect(answersOf(hall.resolutions.elevator)).toEqual(["yes", "no"]);
    expect(answersOf(hall.resolutions["automatic-door"])).toEqual([]);
  });
});

describe("pairDetails", () => {
  const list = placesOf(NOTES());
  const details = pairDetails(byName(list, "Library"), byName(list, "Libary"));

  it("gives one line per detail in the App's detail order", () => {
    expect(details.map((d) => d.key)).toEqual([...FACT_KEYS]);
  });

  it("says what each place holds", () => {
    expect(Object.fromEntries(details.map((d) => [d.key, d.kind]))).toEqual({
      "step-free-entry": "agree",
      "accessible-washroom": "only-a",
      "automatic-door": "only-b",
      elevator: "disagree",
    });
  });

  it("counts every kind and adds up to the number of details", () => {
    const c = pairCounts(details);
    expect(c).toEqual({ agree: 1, disagree: 1, "only-a": 1, "only-b": 1, neither: 0 });
    expect(PAIR_DETAIL_KINDS.reduce((n, k) => n + c[k], 0)).toBe(FACT_KEYS.length);
  });

  it("adds up on random notes, for every suggested pair", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const places = placesOf(randomNotes(makeRng(seed), 12));
      for (const s of findSimilar(places)) {
        const c = pairCounts(pairDetails(s.a, s.b));
        expect(PAIR_DETAIL_KINDS.reduce((n, k) => n + c[k], 0), String(seed)).toBe(FACT_KEYS.length);
      }
    }
  });
});

describe("wording", () => {
  it("names each kind in both languages", () => {
    expect(PAIR_DETAIL_KINDS.map((k) => kindLabel(k, "en"))).toEqual(["Same answer", "Different answers", "Only the first has a record", "Only the second has a record", "Neither has a record"]);
    for (const k of PAIR_DETAIL_KINDS) expect(kindLabel(k, "fr")).not.toBe(kindLabel(k, "en"));
  });

  it("writes the answers, and the App's own word when there is no record", () => {
    expect(answersText(["yes", "no"], "en")).toBe("Yes and No");
    expect(answersText(["yes", "no"], "fr")).toBe("Oui et Non");
    expect(answersText([], "en")).toBe(COPY.values.unknown.en);
    expect(answersText([], "fr")).toBe(COPY.values.unknown.fr);
  });

  it("writes one line for a detail", () => {
    const d = { key: "elevator" as const, kind: "disagree" as const, a: ["no"] as const, b: ["yes"] as const };
    expect(pairDetailLine(d, "en")).toBe("Elevator: No / Yes. Different answers.");
    expect(pairDetailLine(d, "fr")).toBe("Ascenseur\u00A0: Non / Oui. Réponses différentes.");
  });

  it("counts only the kinds that occur, in a fixed order", () => {
    expect(countsLine({ agree: 2, disagree: 0, "only-a": 1, "only-b": 0, neither: 1 }, "en")).toBe("Same answer 2; Only the first has a record 1; Neither has a record 1");
    expect(countsLine({ agree: 1, disagree: 1, "only-a": 0, "only-b": 0, neither: 0 }, "fr")).toBe("Même réponse 1\u202F; Réponses différentes 1");
  });

  it("pass the App's copy audit", () => {
    expect(auditCopy(pairStrings()).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
    expect(pairStrings().length).toBe(Object.keys(PAIR_COPY).length);
  });
});

describe("pairsToText", () => {
  it("writes each pair with names, addresses, counts and detail lines", () => {
    const text = pairsToText(findSimilar(placesOf(NOTES())), "en");
    expect(text.startsWith(`${PAIR_COPY.textTitle.en}\n`)).toBe(true);
    expect(text).toContain(`Pair 1\n------\n${COPY.similar.reasonSimilar.en}\n`);
    expect(text).toMatch(/First: Libr?a?ry(, 1 Main St)?\nSecond: /);
    expect(text).toContain("- Elevator: ");
    expect(text).toContain(PAIR_COPY.hint.en);
  });

  it("says there is nothing to look at when there is no pair", () => {
    expect(pairsToText([], "en")).toContain(COPY.similar.none.en);
  });

  it("keeps French typography and never decides for the person", () => {
    const fr = pairsToText(findSimilar(placesOf(NOTES())), "fr");
    expect(fr).toContain("Premier\u00A0: ");
    expect(fr).toContain("Deuxième\u00A0: ");
    expect(fr).not.toMatch(/[^\u00A0\u202F](?=[:;?!])/u);
    for (const l of ["en", "fr"] as const) {
      const text = pairsToText(findSimilar(placesOf(NOTES())), l).replace(COPY.similar.intro[l], "");
      expect(findBanned(text), l).toBeUndefined();
      expect(text, l).not.toMatch(/\b(same place|merged|duplicate|même lieu|fusionné|doublon)\b/i);
    }
  });

  it("names the file by language", () => {
    expect(pairsFilename("en")).toBe("possible-matches-en.txt");
    expect(pairsFilename("fr")).toBe("lieux-peut-etre-identiques-fr.txt");
  });
});
