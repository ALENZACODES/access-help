import { describe, expect, it } from "vitest";
import { FACT_KEYS, findBanned, type FactKey, type Locale } from "./index";
import { buildLetter, letterText, mailtoHref, parseMailto } from "./askplace";
import { makeRng, type Rng } from "./testkit";

/** Place names people really type, and some that try to break things. */
const NAMES = ["Library", "Café Bleu", "L’Arène", "Tom & Jerry's", "A?B=C&D", "#1 Pizza", "100% Fun", "Ünïcödé", "Line\tTab", "<b>Bold</b>", "Ça va ; oui !"];
const ADDRESSES = [undefined, "1 Main St", "12, rue Principale", "Apt 3 & 4", "5 King St W."];

const pick = <T>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length)] as T;

function keysFrom(rng: Rng): FactKey[] {
  return FACT_KEYS.filter(() => rng() < 0.5);
}

describe("letters for random places", () => {
  it("always read back from the email link exactly, and only for chosen details", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rng = makeRng(seed);
      const place = { name: pick(rng, NAMES), address: pick(rng, ADDRESSES) };
      const keys = keysFrom(rng);
      const l: Locale = rng() < 0.5 ? "en" : "fr";
      const letter = buildLetter(place, keys, l);
      if (keys.length === 0) {
        expect(letter).toBeUndefined();
        continue;
      }
      if (!letter) throw new Error("no letter");
      const href = mailtoHref(letter);
      // Exactly one & separates subject and body: anything in the place's name is encoded.
      expect(href.split("&")).toHaveLength(2);
      expect(href).not.toMatch(/[\s#<>]/);
      expect(parseMailto(href)).toEqual({ subject: letter.subject, body: letter.body });
      const numbered = letter.body.split("\n").filter((x) => /^\d+\. /.test(x));
      expect(numbered).toHaveLength(keys.length);
      expect(letterText(letter).endsWith("\n")).toBe(true);
    }
  });

  it("keep the App's own French typography and wording, whatever the place is called", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const rng = makeRng(seed * 17);
      const place = { name: "Lieu", address: undefined };
      const letter = buildLetter(place, FACT_KEYS.filter(() => rng() < 0.7).concat(["elevator"]), "fr");
      if (!letter) throw new Error("no letter");
      // The App's own text: every ? : ; ! has the right no-break space before it.
      expect(letterText(letter)).not.toMatch(/[^\u00A0\u202F](?=[:;?!])/);
      expect(letterText(letter)).toMatch(/’/);
      expect(letterText(letter)).not.toMatch(/'/);
      expect(findBanned(letterText(letter))).toBeUndefined();
    }
  });

  it("never ask about the person, in either language", () => {
    for (const l of ["en", "fr"] as const) {
      const text = letterText(buildLetter({ name: "X", address: undefined }, FACT_KEYS, l) ?? { locale: l, subject: "", body: "" });
      expect(text).not.toMatch(/\b(?:my|mon|ma|mes) (?:wheelchair|fauteuil|condition|état|disability|handicap|injury|blessure)/i);
      expect(text).not.toMatch(/@|\d{3}[\s.-]\d{3}[\s.-]\d{4}/);
    }
  });
});
