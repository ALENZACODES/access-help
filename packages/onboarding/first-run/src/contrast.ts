/** WCAG 2.x contrast maths and the colour palette the shell uses. */

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export function parseHex(hex: string): Rgb {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  const digits = m?.[1];
  if (!digits) throw new Error(`Invalid colour: ${hex}`);
  const n = parseInt(digits, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(c: Rgb): number {
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(parseHex(a));
  const lb = relativeLuminance(parseHex(b));
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG 2.2 AA minimums. */
export const AA_TEXT = 4.5;
export const AA_UI = 3;

export interface Theme {
  readonly bg: string;
  readonly text: string;
  readonly muted: string;
  readonly buttonBg: string;
  readonly buttonText: string;
  readonly focus: string;
  readonly border: string;
  readonly notice: string;
  readonly noticeText: string;
  readonly error: string;
}

export const PALETTE: { readonly light: Theme; readonly dark: Theme; readonly high: Theme } = {
  light: {
    bg: "#ffffff",
    text: "#1a1a1a",
    muted: "#4d4d4d",
    buttonBg: "#0b3d91",
    buttonText: "#ffffff",
    focus: "#0b3d91",
    border: "#767676",
    notice: "#fff4d6",
    noticeText: "#1a1a1a",
    error: "#b00020",
  },
  dark: {
    bg: "#121212",
    text: "#f2f2f2",
    muted: "#c4c4c4",
    buttonBg: "#8ab4f8",
    buttonText: "#0b0b0b",
    focus: "#8ab4f8",
    border: "#8a8a8a",
    notice: "#3a3320",
    noticeText: "#f2f2f2",
    error: "#ff8a80",
  },
  high: {
    bg: "#000000",
    text: "#ffffff",
    muted: "#ffffff",
    buttonBg: "#ffff00",
    buttonText: "#000000",
    focus: "#00ffff",
    border: "#ffffff",
    notice: "#000000",
    noticeText: "#ffffff",
    error: "#ff9a9a",
  },
};

export interface ContrastCheck {
  readonly theme: "light" | "dark" | "high";
  readonly pair: string;
  readonly ratio: number;
  readonly min: number;
  readonly ok: boolean;
}

/** Every foreground/background pair the stylesheet uses, with its ratio. */
export function paletteReport(): ContrastCheck[] {
  const out: ContrastCheck[] = [];
  for (const name of ["light", "dark", "high"] as const) {
    const t = PALETTE[name];
    const pairs: Array<[string, string, string, number]> = [
      ["text on bg", t.text, t.bg, AA_TEXT],
      ["muted on bg", t.muted, t.bg, AA_TEXT],
      ["button text on button", t.buttonText, t.buttonBg, AA_TEXT],
      ["notice text on notice", t.noticeText, t.notice, AA_TEXT],
      ["error text on bg", t.error, t.bg, AA_TEXT],
      ["focus ring on bg", t.focus, t.bg, AA_UI],
      ["control border on bg", t.border, t.bg, AA_UI],
      ["button on bg", t.buttonBg, t.bg, AA_UI],
    ];
    for (const [pair, fg, bg, min] of pairs) {
      const ratio = contrastRatio(fg, bg);
      out.push({ theme: name, pair, ratio, min, ok: ratio >= min });
    }
  }
  return out;
}
