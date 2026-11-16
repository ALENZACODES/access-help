import { COPY, secondsLabel, t } from "./copy";
import {
  SCAN_INTERVALS_MS,
  type FirstRunState,
  type Locale,
  type MoveMode,
  visibleSteps,
} from "./flow";

/** Minimum width and height of every interactive control (px). */
export const MIN_TOUCH_TARGET_PX = 44;
const CONTROL_STYLE = `min-width:${MIN_TOUCH_TARGET_PX}px;min-height:${MIN_TOUCH_TARGET_PX}px`;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function button(
  label: string,
  attrs: Record<string, string>,
): string {
  const a = Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${esc(v)}"`)
    .join("");
  return `<button type="button"${a} style="${CONTROL_STYLE}">${esc(label)}</button>`;
}

const MODES: readonly MoveMode[] = ["keyboard", "switch", "pointer"];

/**
 * Renders the current first-run step as an HTML string. Controls are native
 * buttons in a logical DOM order, no positive tabindex, each at least 44px.
 */
export function renderStep(state: FirstRunState, locale: Locale): string {
  const steps = visibleSteps(state);
  const idx = steps.indexOf(state.step);
  const parts: string[] = [];
  parts.push(`<section lang="${locale}" aria-labelledby="fr-title">`);

  if (state.step === "mode") {
    parts.push(`<h2 id="fr-title">${esc(t(COPY.mode.title, locale))}</h2>`);
    parts.push(`<p>${esc(t(COPY.mode.body, locale))}</p>`);
    parts.push(`<p>${esc(t(COPY.hint, locale))}</p>`);
    parts.push(`<div role="group" aria-labelledby="fr-title">`);
    for (const m of MODES) {
      parts.push(
        button(t(COPY.modeOptions[m], locale), {
          "data-action": "choose-mode",
          "data-value": m,
          "aria-pressed": String(state.mode === m),
        }),
      );
    }
    parts.push(`</div>`);
  } else if (state.step === "scan") {
    parts.push(`<h2 id="fr-title">${esc(t(COPY.scan.title, locale))}</h2>`);
    parts.push(`<p>${esc(t(COPY.scan.body, locale))}</p>`);
    parts.push(`<div role="group" aria-labelledby="fr-title">`);
    for (const ms of SCAN_INTERVALS_MS) {
      parts.push(
        button(secondsLabel(ms, locale), {
          "data-action": "set-scan",
          "data-value": String(ms),
          "aria-pressed": String(state.scanMs === ms),
        }),
      );
    }
    parts.push(`</div>`);
  } else {
    const f = COPY.finish;
    const colon = locale === "fr" ? "\u00A0: " : ": ";
    const mode = state.mode ? t(COPY.modeOptions[state.mode], locale) : t(f.unknown, locale);
    parts.push(`<h2 id="fr-title">${esc(t(f.title, locale))}</h2>`);
    parts.push(`<p>${esc(t(f.body, locale))}</p>`);
    parts.push(`<ul>`);
    parts.push(`<li>${esc(t(f.modeLabel, locale) + colon + mode)}</li>`);
    if (state.mode === "switch") {
      const scan = state.scanMs ? secondsLabel(state.scanMs, locale) : t(f.off, locale);
      parts.push(`<li>${esc(t(f.scanLabel, locale) + colon + scan)}</li>`);
    }
    parts.push(`</ul>`);
  }

  const nav: string[] = [];
  if (idx > 0) nav.push(button(t(COPY.buttons.back, locale), { "data-action": "back" }));
  if (state.step !== "finish") {
    nav.push(button(t(COPY.buttons.next, locale), { "data-action": "next" }));
    nav.push(button(t(COPY.buttons.skip, locale), { "data-action": "skip" }));
  } else {
    nav.push(button(t(COPY.buttons.done, locale), { "data-action": "done" }));
  }
  parts.push(`<nav aria-label="${esc(t(COPY.navLabel, locale))}">${nav.join("")}</nav>`);
  parts.push(`</section>`);
  return parts.join("");
}
