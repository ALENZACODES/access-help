import { describe, expect, it } from "vitest";
import { PREFS_KEY, applyPrefs, defaultPrefs, loadPrefs, resetPrefs, savePrefs, type Prefs } from "./prefs.js";

class Memory {
  data = new Map<string, string>();
  fail = false;
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { if (this.fail) throw new Error("full"); this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

describe("display settings", () => {
  it("starts standard, or high contrast when the system asks for more contrast", () => {
    expect(defaultPrefs()).toEqual({ textSize: "standard", contrast: "standard", spacing: "standard" });
    expect(defaultPrefs(true).contrast).toBe("high");
  });

  it("saves, loads, and resets", () => {
    const storage = new Memory();
    const prefs: Prefs = { textSize: "larger", contrast: "high", spacing: "wide" };
    expect(savePrefs(storage, prefs)).toBe(true);
    expect(loadPrefs(storage)).toEqual(prefs);
    resetPrefs(storage);
    expect(loadPrefs(storage)).toEqual(defaultPrefs());
  });

  it("a saved choice beats the system default, including a saved standard", () => {
    const storage = new Memory();
    savePrefs(storage, { textSize: "standard", contrast: "standard", spacing: "standard" });
    expect(loadPrefs(storage, true).contrast).toBe("standard");
  });

  it("ignores unknown values field by field and survives damaged storage", () => {
    const storage = new Memory();
    storage.setItem(PREFS_KEY, JSON.stringify({ textSize: "huge", contrast: "high", spacing: 3 }));
    expect(loadPrefs(storage)).toEqual({ textSize: "standard", contrast: "high", spacing: "standard" });
    for (const bad of ["{broken", "null", "7", '"high"', "[]"]) {
      storage.setItem(PREFS_KEY, bad);
      expect(loadPrefs(storage)).toEqual(defaultPrefs());
    }
  });

  it("says when the device could not keep the settings", () => {
    const storage = new Memory();
    storage.fail = true;
    expect(savePrefs(storage, defaultPrefs())).toBe(false);
  });

  it("writes the three data attributes the stylesheet reads", () => {
    const root = { dataset: {} as DOMStringMap };
    applyPrefs({ textSize: "large", contrast: "high", spacing: "wide" }, root);
    expect(root.dataset).toEqual({ textSize: "large", contrast: "high", spacing: "wide" });
  });
});
