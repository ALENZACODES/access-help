import { describe, expect, it } from "vitest";
import {
  EMPTY_PREFS,
  PREFS_KEY,
  clearPrefs,
  loadPrefs,
  memoryStore,
  parsePrefs,
  safeLocalStorage,
  savePrefs,
  serializePrefs,
  type KeyValueStore,
} from "./index";

describe("preferences", () => {
  it("round-trips valid choices", () => {
    const store = memoryStore();
    expect(savePrefs(store, { locale: "fr", mode: "switch", scanMs: 3000 })).toBe("saved");
    expect(loadPrefs(store)).toEqual({ locale: "fr", mode: "switch", scanMs: 3000 });
  });

  it("keeps unset fields unknown, never defaulting them", () => {
    expect(parsePrefs(null)).toEqual(EMPTY_PREFS);
    expect(parsePrefs("{}")).toEqual(EMPTY_PREFS);
    expect(serializePrefs(EMPTY_PREFS)).toBe("{}");
  });

  it("drops invalid values field by field", () => {
    expect(parsePrefs('{"locale":"de","mode":"voice","scanMs":1234}')).toEqual(EMPTY_PREFS);
    expect(parsePrefs('{"locale":"en","mode":"x"}')).toEqual({ locale: "en", mode: undefined, scanMs: undefined });
  });

  it("only keeps a highlight interval for single-switch", () => {
    expect(parsePrefs('{"mode":"keyboard","scanMs":2000}').scanMs).toBeUndefined();
    expect(serializePrefs({ locale: undefined, mode: "keyboard", scanMs: 2000 })).toBe('{"mode":"keyboard"}');
  });

  it("survives corrupt data", () => {
    expect(parsePrefs("not json")).toEqual(EMPTY_PREFS);
    expect(parsePrefs("[1,2]")).toEqual(EMPTY_PREFS);
    expect(parsePrefs("42")).toEqual(EMPTY_PREFS);
  });

  it("reports unavailable storage instead of throwing", () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("full");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    expect(savePrefs(broken, EMPTY_PREFS)).toBe("unavailable");
    expect(savePrefs(undefined, EMPTY_PREFS)).toBe("unavailable");
    expect(loadPrefs(broken)).toEqual(EMPTY_PREFS);
    expect(() => clearPrefs(broken)).not.toThrow();
  });

  it("clears and tolerates blocked localStorage", () => {
    const store = memoryStore();
    savePrefs(store, { locale: "en", mode: "pointer", scanMs: undefined });
    clearPrefs(store);
    expect(store.getItem(PREFS_KEY)).toBeNull();
    const blocked = {
      get localStorage(): KeyValueStore {
        throw new Error("SecurityError");
      },
    };
    expect(safeLocalStorage(blocked)).toBeUndefined();
  });
});
