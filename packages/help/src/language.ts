import type { Language } from "./types.js";

export const LANGUAGE_STORAGE_KEY = "the-app-language";

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LanguagePreference {
  get(): Language;
  set(language: Language): void;
}

/**
 * Language choice stays on the device. This module does not call the network.
 * An unknown stored value falls back to English rather than guessing a third language.
 */
export function createLanguagePreference(store: KeyValueStore): LanguagePreference {
  return {
    get() {
      const value = store.getItem(LANGUAGE_STORAGE_KEY);
      return value === "fr" ? "fr" : "en";
    },
    set(language: Language) {
      store.setItem(LANGUAGE_STORAGE_KEY, language);
    },
  };
}

export function memoryKeyValue(initial?: Record<string, string>): KeyValueStore & { snapshot(): Record<string, string> } {
  const data = { ...initial };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key]! : null;
    },
    setItem(key, value) {
      data[key] = value;
    },
    snapshot() {
      return { ...data };
    },
  };
}

/** Document language for the html element. */
export function htmlLang(language: Language): "en-CA" | "fr-CA" {
  return language === "fr" ? "fr-CA" : "en-CA";
}
