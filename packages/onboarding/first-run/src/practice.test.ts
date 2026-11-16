import { describe, expect, it } from "vitest";
import {
  EMPTY_PRACTICE,
  MAX_LOG,
  PRACTICE_BUTTONS,
  buttonName,
  clearLog,
  describeKey,
  describePress,
  parseButton,
  pushLog,
  recordPress,
  totalPresses,
} from "./practice";
import { findBanned, findScannerClaim } from "./wording";

describe("parseButton", () => {
  it("accepts only the buttons that exist", () => {
    for (let n = 1; n <= PRACTICE_BUTTONS; n++) expect(parseButton(String(n))).toBe(n);
    for (const bad of [undefined, "", "0", "5", "9", "10", "01", "a", "1 ", "-1", "1.5"]) expect(parseButton(bad), String(bad)).toBeUndefined();
  });
});

describe("buttonName", () => {
  it("is numbered in both languages and is different for each button", () => {
    const en = Array.from({ length: PRACTICE_BUTTONS }, (_, i) => buttonName(i + 1, "en"));
    const fr = Array.from({ length: PRACTICE_BUTTONS }, (_, i) => buttonName(i + 1, "fr"));
    expect(new Set(en).size).toBe(PRACTICE_BUTTONS);
    expect(new Set(fr).size).toBe(PRACTICE_BUTTONS);
    expect(en[0]).toBe("Practice button 1");
    expect(fr[0]).toBe("Bouton d’essai 1");
  });
});

describe("describeKey", () => {
  it("explains the keys that move around and press", () => {
    expect(describeKey("Tab", false, undefined, "en")).toContain("next control");
    expect(describeKey("Tab", true, undefined, "en")).toContain("previous control");
    expect(describeKey("Enter", false, "Practice button 1", "en")).toContain("presses the button");
    expect(describeKey(" ", false, "Practice button 1", "en")).toMatch(/^Space: /);
    expect(describeKey("Escape", false, undefined, "en")).toContain("nothing happens");
  });

  it("says where focus is after an arrow key, Home or End", () => {
    for (const k of ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"]) {
      expect(describeKey(k, false, "Practice button 3", "en"), k).toContain("focus is on Practice button 3");
    }
    expect(describeKey("ArrowRight", false, undefined, "en")).toContain("focus moved");
  });

  it("ignores letters, numbers and shortcuts, so typing elsewhere is never logged", () => {
    for (const k of ["a", "Z", "1", "Shift", "Control", "F5", "Backspace", "Meta", ""]) expect(describeKey(k, false, undefined, "en"), k).toBeUndefined();
  });

  it("uses French typography: a no-break space before the colon and a typographic apostrophe", () => {
    for (const k of ["Tab", "ArrowLeft", "Home", "End", "Enter", " ", "Escape"]) {
      const line = describeKey(k, false, "Bouton d’essai 2", "fr") ?? "";
      expect(line, k).toContain("\u00A0:");
      expect(line, k).not.toContain("'");
      expect(line, k).not.toMatch(/[^\u00A0] :/);
    }
    expect(describeKey(" ", false, undefined, "fr")).toMatch(/^Espace\u00A0:/);
  });

  it("names every arrow in French", () => {
    expect(describeKey("ArrowRight", false, undefined, "fr")).toMatch(/^Flèche droite/);
    expect(describeKey("ArrowDown", false, undefined, "fr")).toMatch(/^Flèche bas/);
    expect(describeKey("ArrowLeft", false, undefined, "fr")).toMatch(/^Flèche gauche/);
    expect(describeKey("ArrowUp", false, undefined, "fr")).toMatch(/^Flèche haut/);
  });

  it("never claims to detect a device or to scan", () => {
    for (const locale of ["en", "fr"] as const) {
      for (const k of ["Tab", "ArrowRight", "Home", "End", "Enter", " ", "Escape"]) {
        const line = describeKey(k, false, buttonName(1, locale), locale) ?? "";
        expect(findBanned(line), line).toBeUndefined();
        expect(findScannerClaim(line), line).toBeUndefined();
      }
    }
  });
});

describe("log and counts", () => {
  it("counts each button on its own and numbers the presses", () => {
    let s = recordPress(EMPTY_PRACTICE, 2, "en");
    s = recordPress(s, 2, "en");
    s = recordPress(s, 4, "en");
    expect(s.presses).toEqual({ 2: 2, 4: 1 });
    expect(totalPresses(s)).toBe(3);
    expect(s.log).toEqual([describePress(2, 1, "en"), describePress(2, 2, "en"), describePress(4, 1, "en")]);
  });

  it("keeps only the newest lines, oldest first", () => {
    let s = EMPTY_PRACTICE;
    for (let i = 1; i <= MAX_LOG + 4; i++) s = pushLog(s, `line ${i}`);
    expect(s.log.length).toBe(MAX_LOG);
    expect(s.log[0]).toBe("line 5");
    expect(s.log.at(-1)).toBe(`line ${MAX_LOG + 4}`);
  });

  it("clears the log but keeps the press counts", () => {
    const s = clearLog(recordPress(EMPTY_PRACTICE, 1, "en"));
    expect(s.log).toEqual([]);
    expect(totalPresses(s)).toBe(1);
  });

  it("does not change the state it was given", () => {
    const before = recordPress(EMPTY_PRACTICE, 1, "en");
    const snapshot = JSON.stringify(before);
    recordPress(before, 1, "en");
    pushLog(before, "x");
    clearLog(before);
    expect(JSON.stringify(before)).toBe(snapshot);
    expect(EMPTY_PRACTICE.log).toEqual([]);
    expect(EMPTY_PRACTICE.presses).toEqual({});
  });

  it("describes a press in both languages", () => {
    expect(describePress(1, 3, "en")).toBe("Practice button 1 pressed. This is press 3.");
    expect(describePress(1, 3, "fr")).toBe("Bouton d’essai 1 activé. C’est l’activation numéro 3.");
  });
});
