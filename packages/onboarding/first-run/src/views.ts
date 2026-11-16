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
  if (id === "add-a-detail" && i === lp.steps.length - 1) {
    nav.push(button(t(COPY.help.openForm, locale), { "data-action": "open-form" }));
  }
  nav.push(button(t(COPY.help.backToList, locale), { "data-action": "view", "data-value": "help" }));
  return (
    `<section lang="${locale}" aria-labelledby="view-title" data-names-unique>` +
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
    `<section lang="${locale}" aria-labelledby="view-title" data-names-unique>` +
    `<h2 id="view-title">${esc(t(COPY.card.title, locale))}</h2>` +
    `<p class="notice" role="note">${esc(t(COPY.card.notice, locale))}</p>` +
    `<p>${esc(t(COPY.card.explain, locale))}</p>` +
    renderFactList(exampleFacts(), locale, today) +
    `<nav aria-label="${esc(t(COPY.card.title, locale))}">${button(t(COPY.help.backToList, locale), { "data-action": "view", "data-value": "help" })}</nav>` +
    `</section>`
  );
}
