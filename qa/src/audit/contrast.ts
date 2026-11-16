/**
 * Static colour audit for the stylesheets. CI- and test-only.
 *
 * It reads every rule that declares a text colour and a background, or a focus outline,
 * with literal hex colours, and checks the WCAG contrast ratio. It also requires that every
 * rule with a literal colour has a matching override in the high contrast theme.
 *
 * Limits, stated so nobody reads more into a pass: it sees only literal #rgb and #rrggbb
 * values in the files it is given. It cannot see colours set in script, images, or
 * the real background behind a rule that sets only a text colour (it uses the page
 * colour for that theme). The browser checks with axe in qa/tests still run.
 */

export interface Rule {
  selector: string;
  decls: Record<string, string>;
}

export interface ContrastFinding {
  file: string;
  selector: string;
  kind: "text" | "focus" | "no-high-contrast-override";
  fg?: string;
  bg?: string;
  ratio?: number;
  required?: number;
}

export const HIGH_PREFIX = ':root[data-contrast="high"]';

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Flat list of style rules. Rules inside @media and @supports are included, other at-rules are skipped. */
export function parseCss(css: string): Rule[] {
  const rules: Rule[] = [];
  const text = stripComments(css);
  function walk(start: number, end: number) {
    let i = start;
    while (i < end) {
      const open = text.indexOf("{", i);
      if (open === -1 || open >= end) return;
      const head = text.slice(i, open).trim();
      let depth = 1;
      let j = open + 1;
      while (j < end && depth > 0) {
        if (text[j] === "{") depth += 1;
        else if (text[j] === "}") depth -= 1;
        j += 1;
      }
      const body = text.slice(open + 1, j - 1);
      if (head.startsWith("@")) {
        if (/^@(media|supports|layer)\b/.test(head)) walk(open + 1, j - 1);
      } else if (head !== "") {
        const decls: Record<string, string> = {};
        for (const part of body.split(";")) {
          const colon = part.indexOf(":");
          if (colon > 0) decls[part.slice(0, colon).trim().toLowerCase()] = part.slice(colon + 1).trim();
        }
        rules.push({ selector: head.replace(/\s+/g, " "), decls });
      }
      i = j;
    }
  }
  walk(0, text.length);
  return rules;
}

export function parseHex(value: string | undefined): [number, number, number] | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((value ?? "").trim());
  if (!match) return null;
  let hex = match[1]!;
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join("");
  return [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]): number {
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const first = parseHex(a);
  const second = parseHex(b);
  if (!first || !second) return Number.NaN;
  const [hi, lo] = [luminance(first), luminance(second)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** First literal hex colour in a declaration value, such as "3px solid #0b3d91". */
function firstHex(value: string | undefined): string | undefined {
  return /#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/i.exec(value ?? "")?.[0];
}

export interface Theme {
  background: string;
  text: string;
}

export const STANDARD_THEME: Theme = { background: "#ffffff", text: "#1a1a1a" };
export const HIGH_THEME: Theme = { background: "#000000", text: "#ffffff" };

export const TEXT_MIN = 4.5;
export const FOCUS_MIN = 3;

export function auditContrast(css: string, file: string): { findings: ContrastFinding[]; checked: number } {
  const findings: ContrastFinding[] = [];
  let checked = 0;
  for (const rule of parseCss(css)) {
    const high = rule.selector.includes('[data-contrast="high"]');
    const theme = high ? HIGH_THEME : STANDARD_THEME;
    const fg = firstHex(rule.decls.color);
    const bg = firstHex(rule.decls["background-color"] ?? (rule.decls.background && !/gradient|url\(/.test(rule.decls.background) ? rule.decls.background : undefined));
    const textFg = fg ?? (bg ? theme.text : undefined);
    const textBg = bg ?? (fg ? theme.background : undefined);
    if (textFg && textBg) {
      checked += 1;
      const ratio = contrastRatio(textFg, textBg);
      if (!(ratio >= TEXT_MIN)) findings.push({ file, selector: rule.selector, kind: "text", fg: textFg, bg: textBg, ratio: Math.round(ratio * 100) / 100, required: TEXT_MIN });
    }
    const outline = firstHex(rule.decls["outline-color"] ?? rule.decls.outline);
    if (outline && /focus/.test(rule.selector)) {
      checked += 1;
      const ratio = contrastRatio(outline, theme.background);
      if (!(ratio >= FOCUS_MIN)) findings.push({ file, selector: rule.selector, kind: "focus", fg: outline, bg: theme.background, ratio: Math.round(ratio * 100) / 100, required: FOCUS_MIN });
    }
  }
  return { findings, checked };
}

const COLOUR_PROPS = /^(color|background(-color)?|border(-(top|right|bottom|left))?(-color)?|outline(-color)?|fill|stroke)$/;

/** Selectors (one per comma part) of rules that set a literal colour. */
function coloured(rules: readonly Rule[]): string[] {
  const out: string[] = [];
  for (const rule of rules) {
    const sets = Object.entries(rule.decls).some(([prop, value]) => COLOUR_PROPS.test(prop) && firstHex(value) !== undefined);
    if (!sets) continue;
    for (const part of rule.selector.split(",")) out.push(part.trim());
  }
  return out;
}

/** Selector a high contrast rule overrides, without the theme prefix. "" and "body" both mean the page. */
function overridden(rules: readonly Rule[]): Set<string> {
  const set = new Set<string>();
  for (const rule of rules) {
    for (const part of rule.selector.split(",")) {
      const trimmed = part.trim();
      if (trimmed.startsWith(HIGH_PREFIX)) set.add(trimmed.slice(HIGH_PREFIX.length).trim() || ":root");
    }
  }
  if (set.has("body")) set.add(":root");
  return set;
}

/** Every literal-colour rule in `standard` must have an override in `highSheet`. */
export function auditHighContrastCoverage(standardCss: string, highCss: string, file: string): ContrastFinding[] {
  const have = overridden(parseCss(highCss));
  const missing = new Set<string>();
  for (const selector of coloured(parseCss(standardCss))) {
    if (selector.includes("[data-contrast")) continue;
    if (!have.has(selector)) missing.add(selector);
  }
  return [...missing].sort().map((selector) => ({ file, selector, kind: "no-high-contrast-override" as const }));
}
