/**
 * Display settings: text size, colour contrast, text spacing.
 * Kept on this device only. A stored value that is not one of the known
 * choices is ignored and the default is used, field by field.
 */
export type TextSize = "standard" | "large" | "larger";
export type Contrast = "standard" | "high";
export type Spacing = "standard" | "wide";

export interface Prefs {
  textSize: TextSize;
  contrast: Contrast;
  spacing: Spacing;
}

export const PREFS_KEY = "the-app-display-prefs";
export const TEXT_SIZES: readonly TextSize[] = ["standard", "large", "larger"];
export const CONTRASTS: readonly Contrast[] = ["standard", "high"];
export const SPACINGS: readonly Spacing[] = ["standard", "wide"];

export type PrefsStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** The person's browser or system may already ask for more contrast. Honour it until they choose. */
export function defaultPrefs(systemWantsMoreContrast = false): Prefs {
  return { textSize: "standard", contrast: systemWantsMoreContrast ? "high" : "standard", spacing: "standard" };
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function loadPrefs(storage: PrefsStorage, systemWantsMoreContrast = false): Prefs {
  const fallback = defaultPrefs(systemWantsMoreContrast);
  try {
    const raw = storage.getItem(PREFS_KEY);
    if (raw === null) return fallback;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return fallback;
    const record = value as Record<string, unknown>;
    return {
      textSize: pick(record.textSize, TEXT_SIZES, fallback.textSize),
      contrast: pick(record.contrast, CONTRASTS, fallback.contrast),
      spacing: pick(record.spacing, SPACINGS, fallback.spacing),
    };
  } catch {
    return fallback;
  }
}

/** Returns false when the device could not keep the settings. They still apply for this visit. */
export function savePrefs(storage: PrefsStorage, prefs: Prefs): boolean {
  try {
    storage.setItem(PREFS_KEY, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}

export function resetPrefs(storage: PrefsStorage): void {
  try {
    storage.removeItem(PREFS_KEY);
  } catch {
    /* nothing to remove */
  }
}

export interface DatasetTarget {
  dataset: DOMStringMap;
}

export function applyPrefs(prefs: Prefs, root: DatasetTarget): void {
  root.dataset.textSize = prefs.textSize;
  root.dataset.contrast = prefs.contrast;
  root.dataset.spacing = prefs.spacing;
}

export function systemWantsMoreContrast(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-contrast: more)").matches;
}
