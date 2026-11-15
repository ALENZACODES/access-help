import { describe, expect, it } from "vitest";
import { screenRequestText } from "./screen.js";

describe("screenRequestText", () => {
  it("allows a practical request", () => {
    expect(screenRequestText("Looking for tips on getting around by bus in winter.").decision).toBe("allow");
    expect(screenRequestText("").decision).toBe("allow");
  });

  it.each([
    "What is the best treatment for this?",
    "Can someone diagnose what is going on?",
    "How often should I use a catheter?",
    "Advice about a wound that will not heal",
    "My bowel routine is hard",
    "bladder question",
    "Should I increase my medication to 20 mg?",
    "Any pressure sore tips",
    "Quel traitement pour moi?",
    "Une question sur le sondage",
    "J'ai une plaie de pression",
    "Mon médicament change",
    "des spasmes la nuit",
    "Ma vessie me pose problème",
  ])("holds clinical wording: %s", (text) => {
    const result = screenRequestText(text);
    expect(result).toEqual({ decision: "hold", codes: expect.arrayContaining(["medical_advice"]) });
  });

  it("holds contact details", () => {
    for (const text of ["write me at a.b@example.org", "call 416-555-0100", "see https://example.org"]) {
      expect(screenRequestText(text)).toEqual({ decision: "hold", codes: ["personal_data"] });
    }
  });

  it("treats crisis wording as crisis, ahead of every other rule", () => {
    expect(screenRequestText("I want to die").decision).toBe("crisis");
    expect(screenRequestText("medication and suicide").decision).toBe("crisis");
    expect(screenRequestText("J'ai envie de mourir").decision).toBe("crisis");
    expect(screenRequestText("pensées suicidaires").decision).toBe("crisis");
  });
});
