import type { KeyValueStore } from "./store";

/**
 * Reader display settings (WCAG 1.4.4 resize, 1.4.12 text spacing, 1.4.3 and
 * 1.4.11 contrast, 2.3.3 motion). Stored on this device only.
 */
export const TEXT_SCALES = ["100", "125", "150", "200"] as const;
export const SPACINGS = ["normal", "wide"] as const;
export const CONTRASTS = ["auto", "more"] as const;
export const MOTIONS = ["auto", "reduce"] as const;

export type TextScale = (typeof TEXT_SCALES)[number];
export type Spacing = (typeof SPACINGS)[number];
export type Contrast = (typeof CONTRASTS)[number];
export type Motion = (typeof MOTIONS)[number];

export interface Display {
  readonly scale: TextScale;
  readonly spacing: Spacing;
  readonly contrast: Contrast;
  readonly motion: Motion;
}

export const DEFAULT_DISPLAY: Display = { scale: "100", spacing: "normal", contrast: "auto", motion: "auto" };
export const DISPLAY_KEY = "app.onboarding.display.v1";

function pick<T extends string>(list: readonly T[], v: unknown, fallback: T): T {
  return list.find((x) => x === v) ?? fallback;
}

export function parseDisplay(raw: string | null | undefined): Display {
  if (!raw) return DEFAULT_DISPLAY;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return DEFAULT_DISPLAY;
  }
  if (!data || typeof data !== "object") return DEFAULT_DISPLAY;
  const o = data as Record<string, unknown>;
  return {
    scale: pick(TEXT_SCALES, o["scale"], DEFAULT_DISPLAY.scale),
    spacing: pick(SPACINGS, o["spacing"], DEFAULT_DISPLAY.spacing),
    contrast: pick(CONTRASTS, o["contrast"], DEFAULT_DISPLAY.contrast),
    motion: pick(MOTIONS, o["motion"], DEFAULT_DISPLAY.motion),
  };
}

export function loadDisplay(store: KeyValueStore | undefined): Display {
  try {
    return parseDisplay(store?.getItem(DISPLAY_KEY));
  } catch {
    return DEFAULT_DISPLAY;
  }
}

export function saveDisplay(store: KeyValueStore | undefined, d: Display): "saved" | "unavailable" {
  if (!store) return "unavailable";
  try {
    store.setItem(DISPLAY_KEY, JSON.stringify(d));
    return "saved";
  } catch {
    return "unavailable";
  }
}

/** Sets data attributes on <html>; styles.ts turns them into CSS. */
export function applyDisplay(doc: Document, d: Display): void {
  const ds = doc.documentElement.dataset;
  ds["textScale"] = d.scale;
  ds["spacing"] = d.spacing;
  ds["contrast"] = d.contrast;
  ds["motion"] = d.motion;
}

export function updateDisplay(d: Display, key: keyof Display, value: string): Display {
  switch (key) {
    case "scale":
      return { ...d, scale: pick(TEXT_SCALES, value, d.scale) };
    case "spacing":
      return { ...d, spacing: pick(SPACINGS, value, d.spacing) };
    case "contrast":
      return { ...d, contrast: pick(CONTRASTS, value, d.contrast) };
    case "motion":
      return { ...d, motion: pick(MOTIONS, value, d.motion) };
  }
}
