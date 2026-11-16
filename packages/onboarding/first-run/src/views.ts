import { ONBOARDING_PATHS, localizePath } from "../../src/paths";
import { renderStep, type FirstRunState, type Locale } from "../../switch-first/src/index";
import { COPY, stepOf, t } from "./copy";
import { describeFact, exampleFacts, type Fact } from "./facts";
import { button, esc } from "./html";

export const CARD_ID = "reading-a-place-card";

/** The setup view reuses the switch/keyboard-first first-run flow. */
export function renderSetup(state: FirstRunState, locale: Locale): string {
  return renderStep(state, locale);
}

export function renderHelpIndex(locale: Locale): string {
  const items: string[] = [];
  for (const p of ONBOARDING_PATHS) {
    const lp = localizePath(p, locale);
    items.push(
      `<li>${button(lp.title, { "data-action": "open-path", "data-value": p.id })}` +
        `<span class="muted"> ${esc(lp.summary)}</span></li>`,
    );
  }
  items.push(
    `<li>${button(t(COPY.card.title, locale), { "data-action": "open-card" })}` +
      `<span class="muted"> ${esc(t(COPY.card.summary, locale))}</span></li>`,
  );
  return (
    `<section lang="${locale}" aria-labelledby="view-title">` +
    `<h2 id="view-title">${esc(t(COPY.help.title, locale))}</h2>` +
    `<p>${esc(t(COPY.help.intro, locale))}</p>` +
    `<ul>${items.join("")}</ul></section>`
  );
}

/** One step of a help path. Returns undefined for an unknown path id. */
export function renderPathStep(id: string, step: number, locale: Locale): string | undefined {
  const path = ONBOARDING_PATHS.find((p) => p.id === id);
  if (!path) return undefined;
  const lp = localizePath(path, locale);
  const i = Math.min(Math.max(step, 0), lp.steps.length - 1);
  const s = lp.steps[i];
  if (!s) return undefined;
  const nav: string[] = [];
  if (i > 0) nav.push(button(t(COPY.help.prev, locale), { "data-action": "path-step", "data-value": String(i - 1) }));
  if (i < lp.steps.length - 1) {
    nav.push(button(t(COPY.help.next, locale), { "data-action": "path-step", "data-value": String(i + 1) }));
  }
  nav.push(button(t(COPY.help.backToList, locale), { "data-action": "view", "data-value": "help" }));
  return (
    `<section lang="${locale}" aria-labelledby="view-title">` +
    `<p class="muted">${esc(lp.title)} · ${esc(stepOf(i + 1, lp.steps.length, locale))}</p>` +
    `<h2 id="view-title">${esc(s.title)}</h2>` +
    `<p>${esc(s.body)}</p><nav aria-label="${esc(lp.title)}">${nav.join("")}</nav></section>`
  );
}

export function renderFactList(facts: readonly Fact[], locale: Locale, today: Date): string {
  const rows = facts.map((f) => {
    const v = describeFact(f, locale, today);
    return `<dt>${esc(v.label)}</dt><dd><strong>${esc(v.value)}</strong>. ${esc(v.detail)}</dd>`;
  });
  return `<dl class="facts">${rows.join("")}</dl>`;
}

export function renderCardGuide(locale: Locale, today: Date): string {
  return (
    `<section lang="${locale}" aria-labelledby="view-title">` +
    `<h2 id="view-title">${esc(t(COPY.card.title, locale))}</h2>` +
    `<p class="notice" role="note">${esc(t(COPY.card.notice, locale))}</p>` +
    `<p>${esc(t(COPY.card.explain, locale))}</p>` +
    renderFactList(exampleFacts(), locale, today) +
    `<nav>${button(t(COPY.help.backToList, locale), { "data-action": "view", "data-value": "help" })}</nav>` +
    `</section>`
  );
}
