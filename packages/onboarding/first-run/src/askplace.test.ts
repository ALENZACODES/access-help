import { describe, expect, it } from "vitest";
import { FACT_KEYS, QUESTIONS, auditCopy, findBanned, groupPlaces, type Place } from "./index";
import {
  ASK_COPY,
  LETTER,
  askStatus,
  askStrings,
  buildLetter,
  defaultAskKeys,
  letterFilename,
  letterText,
  mailtoHref,
  parseMailto,
  placeLine,
  toggleAskKey,
} from "./askplace";
import { testNote } from "./testnotes";

const places = (): Place[] =>
  groupPlaces(
    [
      testNote("a", "Library", [{ key: "elevator", value: "yes" }, { key: "step-free-entry", value: "yes" }]),
      testNote("b", "Library", [{ key: "step-free-entry", value: "no" }]),
      testNote("c", "Done", FACT_KEYS.map((key) => ({ key, value: "no" as const })), "9 King St"),
    ],
    "en",
  );
const library = (): Place => places().find((p) => p.name === "Library") as Place;
const done = (): Place => places().find((p) => p.name === "Done") as Place;

describe("what to ask about", () => {
  it("starts with the details that have no record or reports that differ", () => {
    expect(defaultAskKeys(library())).toEqual(["step-free-entry", "accessible-washroom", "automatic-door"]);
  });

  it("starts with every detail when all are agreed, so there is still something to ask", () => {
    expect(defaultAskKeys(done())).toEqual(FACT_KEYS);
  });

  it("adds and removes details in the App's order, each once", () => {
    expect(toggleAskKey(["elevator"], "step-free-entry", true)).toEqual(["step-free-entry", "elevator"]);
    expect(toggleAskKey(["elevator", "step-free-entry"], "elevator", false)).toEqual(["step-free-entry"]);
    expect(toggleAskKey(["elevator"], "elevator", true)).toEqual(["elevator"]);
    expect(toggleAskKey([], "elevator", false)).toEqual([]);
  });

  it("says how each detail stands in the notes", () => {
    expect(askStatus(library(), "step-free-entry", "en")).toBe("Reports differ");
    expect(askStatus(library(), "accessible-washroom", "fr")).toBe("UNKNOWN, aucune donnée");
    expect(askStatus(library(), "elevator", "en")).toBe("Reports agree");
  });
});

describe("the message", () => {
  it("is written in English with one numbered question per detail", () => {
    const letter = buildLetter(library(), ["elevator", "step-free-entry"], "en");
    expect(letter?.subject).toBe("Accessibility questions about Library");
    expect(letter?.body.split("\n")).toEqual([
      "Hello,",
      "",
      "I am planning a visit to Library (1 Main St) and would like to know about access before I come.",
      "",
      `1. ${QUESTIONS["step-free-entry"].en}`,
      `2. ${QUESTIONS.elevator.en}`,
      "",
      LETTER.en.dontKnow,
      "",
      "Thank you,",
    ]);
  });

  it("is written in French with French typography, whatever the App's language", () => {
    const letter = buildLetter(library(), ["accessible-washroom"], "fr");
    expect(letter?.locale).toBe("fr");
    expect(letter?.subject).toBe("Questions sur l’accessibilité\u00A0: Library");
    expect(letter?.body).toContain("Je prévois une visite à Library (1 Main St)");
    expect(letter?.body).toContain(`1. ${QUESTIONS["accessible-washroom"].fr}`);
    expect(letter?.body).toContain("\u202F?");
    expect(letter?.body).not.toMatch(/[^\u00A0\u202F](?=[:;?!])/);
  });

  it("asks only about the place, never about the person, and says not knowing is fine", () => {
    for (const l of ["en", "fr"] as const) {
      const body = buildLetter(library(), FACT_KEYS, l)?.body ?? "";
      expect(body).not.toMatch(/\b(?:I use|j’utilise|my wheelchair|mon fauteuil|disability|handicap|diagnos)/i);
      expect(body).toContain(LETTER[l].dontKnow);
      expect(findBanned(body)).toBeUndefined();
    }
  });

  it("is nothing when no detail is chosen", () => {
    expect(buildLetter(library(), [], "en")).toBeUndefined();
  });

  it("names the place with its address only when there is one", () => {
    expect(placeLine({ name: "Library", address: "1 Main St" })).toBe("Library (1 Main St)");
    expect(placeLine({ name: "Kiosk", address: undefined })).toBe("Kiosk");
  });
});

describe("sending and keeping it", () => {
  it("opens the person's own email app with no recipient and CRLF line breaks", () => {
    const letter = buildLetter(library(), ["elevator"], "en");
    if (!letter) throw new Error("no letter");
    const href = mailtoHref(letter);
    expect(href.startsWith("mailto:?subject=")).toBe(true);
    expect(href).toContain("%0D%0A");
    expect(href).not.toMatch(/mailto:[^?]/);
    expect(parseMailto(href)).toEqual({ subject: letter.subject, body: letter.body });
  });

  it("encodes place names that would break the address", () => {
    const letter = buildLetter({ name: "Tom & Jerry's? #1", address: "5 A&B Rd" }, ["elevator"], "fr");
    if (!letter) throw new Error("no letter");
    const href = mailtoHref(letter);
    expect(href.split("&")).toHaveLength(2);
    expect(href).not.toContain("#");
    expect(parseMailto(href)?.subject).toBe("Questions sur l’accessibilité\u00A0: Tom & Jerry's? #1");
  });

  it("reads back only its own mailto addresses", () => {
    expect(parseMailto("mailto:someone@example.org")).toBeUndefined();
    expect(parseMailto("https://example.org")).toBeUndefined();
    expect(parseMailto("mailto:?subject=%E0%A4&body=x")).toBeUndefined();
  });

  it("puts the subject on top of the file, in the message's language", () => {
    const en = buildLetter(library(), ["elevator"], "en");
    const fr = buildLetter(library(), ["elevator"], "fr");
    if (!en || !fr) throw new Error("no letter");
    expect(letterText(en).split("\n").slice(0, 3)).toEqual(["Subject: Accessibility questions about Library", "", "Hello,"]);
    expect(letterText(fr).startsWith("Objet\u00A0: Questions sur l’accessibilité\u00A0: Library\n\nBonjour,")).toBe(true);
    expect(letterText(fr).endsWith("Merci,\n")).toBe(true);
    expect(letterFilename(library(), "fr")).toBe(`message-${library().id}-fr.txt`);
  });
});

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(askStrings())).toEqual([]);
    expect(ASK_COPY.statusUnknown.fr).toContain("UNKNOWN");
  });
});
