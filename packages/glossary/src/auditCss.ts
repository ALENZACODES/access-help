import { finding, type Finding } from './auditTypes';

/** Length in CSS px for px / rem / em (16px base). Null for anything else (auto, %, calc, var). */
export function toPx(value: string): number | null {
  const m = /^(-?\d*\.?\d+)(px|rem|em)$/.exec(value.trim());
  if (m === null) return null;
  const n = Number(m[1]);
  return m[2] === 'px' ? n : n * 16;
}

interface Decl {
  readonly value: string;
  readonly important: boolean;
}

interface Rule {
  readonly selector: string;
  readonly decls: ReadonlyMap<string, Decl>;
}

/** Flat rule list. At-rule wrappers (@media) are skipped; their inner rules are kept. */
export function parseRules(css: string): readonly Rule[] {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: Rule[] = [];
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = (m[1] ?? '').trim();
    if (selector === '' || selector.startsWith('@')) continue;
    const decls = new Map<string, Decl>();
    for (const part of (m[2] ?? '').split(';')) {
      const i = part.indexOf(':');
      if (i === -1) continue;
      const name = part.slice(0, i).trim().toLowerCase();
      let value = part.slice(i + 1).trim();
      const important = /!\s*important$/i.test(value);
      value = value.replace(/!\s*important$/i, '').trim();
      if (name !== '') decls.set(name, { value, important });
    }
    rules.push({ selector, decls });
  }
  return rules;
}

const CONTROL =
  /(?:^|[\s,>+~])(?:input|button|select|textarea|summary)(?![\w-])|\[role=["']?(?:button|link|checkbox|radio|switch|tab)["']?\]|\.[\w-]*(?:btn|button|input|check|chip|select)[\w-]*/i;
const CONTROL_GLOBAL = new RegExp(CONTROL.source, 'gi');
const STATE = /:(?:focus|focus-visible|focus-within|hover|active|disabled|checked|target|visited)(?![\w-])/;
const SPACING = ['line-height', 'letter-spacing', 'word-spacing'];

/**
 * Static checks on a stylesheet: 44px targets, a visible focus style, no removed outlines,
 * text not smaller than 14px, motion respecting the user's setting, and text-spacing values
 * left overridable (WCAG 2.2 SC 1.4.12). Returns error findings; empty means clean.
 */
export function auditCss(css: string, name = 'css'): readonly Finding[] {
  const out: Finding[] = [];
  const rules = parseRules(css);

  if (!css.includes(':focus-visible')) {
    out.push(finding('focus-visible-missing', name, 'No :focus-visible style: keyboard focus would not be shown.'));
  }

  let usesMotion = false;
  /** control key -> tallest size any rule gives it (null: none measurable). */
  const targets = new Map<string, number | null>();
  for (const rule of rules) {
    const sel = rule.selector;

    if (CONTROL.test(sel) && !STATE.test(sel) && !/\[type=["']?(?:hidden|checkbox|radio)["']?\]/.test(sel)) {
      const size = rule.decls.get('min-height') ?? rule.decls.get('height');
      const px = size === undefined ? null : toPx(size.value);
      for (const m of sel.matchAll(CONTROL_GLOBAL)) {
        const key = m[0].replace(/^[\s,>+~]+/, '').trim();
        const best = targets.get(key);
        targets.set(key, px === null ? (best ?? null) : Math.max(best ?? 0, px));
      }
    }

    const outline = rule.decls.get('outline');
    const outlineWidth = rule.decls.get('outline-width');
    const removed =
      (outline !== undefined && /^(?:none|0|0px)$/i.test(outline.value)) ||
      (outlineWidth !== undefined && /^0(?:px)?$/i.test(outlineWidth.value));
    if (removed && !/:focus:not\(:focus-visible\)/.test(sel)) {
      out.push(finding('outline-removed', sel, 'Outline removed without a replacement focus style.'));
    }

    const size = rule.decls.get('font-size');
    if (size !== undefined) {
      const px = toPx(size.value);
      if (px !== null && px < 14) out.push(finding('small-text', sel, `Text is ${px}px; the minimum is 14px.`));
    }

    for (const prop of SPACING) {
      if (rule.decls.get(prop)?.important === true) {
        out.push(finding('text-spacing-locked', sel, `${prop} uses !important, so users cannot override it.`));
      }
    }

    for (const [prop, decl] of rule.decls) {
      if ((prop.startsWith('transition') || prop.startsWith('animation')) && !/^none$/i.test(decl.value)) {
        usesMotion = true;
      }
    }
  }

  for (const [key, best] of targets) {
    if (best === null) out.push(finding('target-size', key, 'Control has no min-height of at least 44px.'));
    else if (best < 44) out.push(finding('target-size', key, `Control is ${best}px tall; the minimum is 44px.`));
  }

  if (usesMotion && !css.includes('prefers-reduced-motion')) {
    out.push(finding('motion-not-reducible', name, 'Uses transitions or animation with no prefers-reduced-motion rule.'));
  }
  return out;
}
