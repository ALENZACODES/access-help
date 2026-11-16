import { PALETTE, type Theme } from "./contrast";

export const STYLE_ID = "app-first-run-styles";

function vars(t: Theme): string {
  return [
    `--bg:${t.bg}`,
    `--text:${t.text}`,
    `--muted:${t.muted}`,
    `--button-bg:${t.buttonBg}`,
    `--button-text:${t.buttonText}`,
    `--focus:${t.focus}`,
    `--border:${t.border}`,
    `--notice:${t.notice}`,
    `--notice-text:${t.noticeText}`,
  ].join(";");
}

/**
 * Stylesheet for the shell. Design rules that matter for WCAG 2.2 AA:
 * 44px targets, a 3px focus ring with 3:1 contrast, scroll padding so focused
 * items are not hidden (2.4.11), no fixed heights or clipped overflow so text
 * spacing changes and 320px reflow work, forced-colours and reduced-motion
 * support. Contrast of the palette is checked in contrast.test.ts.
 */
export function buildCss(): string {
  return `
:root{${vars(PALETTE.light)};color-scheme:light dark}
@media (prefers-color-scheme: dark){:root{${vars(PALETTE.dark)}}}
html{scroll-padding-top:4rem;scroll-padding-bottom:4rem}
body{margin:0;background:var(--bg);color:var(--text);font:1rem/1.5 system-ui,sans-serif;overflow-wrap:anywhere}
.app{max-width:40rem;margin:0 auto;padding:1rem}
.app header,.app nav,.app footer{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;justify-content:space-between}
.app h1{font-size:1.25rem;margin:0}
.app h2{font-size:1.5rem;margin:1rem 0 .5rem}
.app h2:focus{outline:none}
.app p,.app li,.app dd{max-width:65ch}
.muted{color:var(--muted)}
button{min-width:44px;min-height:44px;padding:.5rem 1rem;margin:.25rem .25rem .25rem 0;font:inherit;color:var(--button-text);background:var(--button-bg);border:2px solid var(--button-bg);border-radius:.375rem;cursor:pointer}
button[aria-pressed="true"],button[aria-current="page"]{border-color:var(--text);box-shadow:inset 0 0 0 2px var(--button-text)}
button.secondary{color:var(--text);background:var(--bg);border-color:var(--border)}
a:focus-visible,button:focus-visible,[tabindex="-1"]:focus-visible{outline:3px solid var(--focus);outline-offset:2px}
.skip-link{position:absolute;left:.5rem;top:-10rem;min-height:44px;min-width:44px;padding:.75rem 1rem;background:var(--bg);color:var(--text);border:2px solid var(--focus)}
.skip-link:focus{top:.5rem}
.notice{background:var(--notice);color:var(--notice-text);border:2px solid var(--border);padding:.5rem 1rem;border-radius:.375rem}
.sr-only{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
dl.facts{margin:1rem 0}
dl.facts dt{font-weight:600;margin-top:.75rem}
dl.facts dd{margin:0}
@media (forced-colors: active){button{border:2px solid ButtonText}button:focus-visible,a:focus-visible{outline:3px solid Highlight}}
@media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`.trim();
}

/** Adds the stylesheet once. Returns the style element. */
export function injectStyles(doc: Document): HTMLStyleElement {
  const existing = doc.getElementById(STYLE_ID);
  if (existing instanceof doc.defaultView!.HTMLStyleElement) return existing;
  const el = doc.createElement("style");
  el.id = STYLE_ID;
  el.textContent = buildCss();
  doc.head.appendChild(el);
  return el;
}
