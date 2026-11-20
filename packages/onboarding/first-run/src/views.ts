import { ONBOARDING_PATHS, localizePath } from "../../src/paths";
import { renderStep, type FirstRunState, type Locale } from "../../switch-first/src/index";
import { COPY, stepOf, t } from "./copy";
import { describeFact, exampleFacts, type Fact } from "./facts";
import { button, esc } from "./html";
import { doneCount, isDone, progressText, type PathProgress } from "./pathprogress";
import { pathFilename, pathToText } from "./pathtext";
import type { StepStatus } from "./stepstatus";
import { downloadLink } from "./views-sources";

export const CARD_ID = "reading-a-place-card";

/** The setup view reuses the switch/keyboard-first first-run flow. */
export function renderSetup(state: FirstRunState, locale: Locale): string {
  return renderStep(state, locale);
}

/** One step of a help path. Returns undefined for an unknown path id. */
export function renderPathStep(id: string, step: number, locale: Locale, progress: PathProgress = {}, today?: Date, status?: StepStatus): string | undefined {
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
  const done = doneCount(progress, id);
  const ticked = isDone(progress, id, s.id);
  // The person's own tick, saved on this device. The App never ticks a step for them.
  const tick =
    `<p><label class="choice" style="min-height:44px;min-width:44px"><input type="checkbox" data-action="path-done" data-key="${esc(id)}" data-value="${esc(s.id)}"${ticked ? " checked" : ""}>` +
    `${esc(t(COPY.pathProgress.done, locale))}</label></p>`;
  const now = status
    ? `<p data-step-status="${status.kind}"><strong>${esc(t(COPY.stepStatus.label, locale))}${locale === "fr" ? "\u00A0:" : ":"}</strong> ${esc(status.text)}</p>`
    : "";
  const open = (s.appRoute ? `<p>${button(t(COPY.pathProgress.openPage, locale), { "data-action": "path-open", "data-value": s.appRoute })}</p>` : "") + now;
  const all = done === lp.steps.length ? `<p class="notice" data-path-all>${esc(t(COPY.pathProgress.allDone, locale))}</p>` : "";
  // Steps not yet ticked, other than this one, so a switch or voice user can jump straight to them.
  const left = lp.steps
    .map((st, n) => ({ st, n }))
    .filter(({ st, n }) => n !== i && !isDone(progress, id, st.id));
  const leftList =
    done > 0 && left.length > 0
      ? `<h3 id="path-left">${esc(t(COPY.pathProgress.leftTitle, locale))}</h3><ul aria-labelledby="path-left">${left
          .map(({ st, n }) => `<li>${button(`${stepOf(n + 1, lp.steps.length, locale)}${locale === "fr" ? "\u00A0:" : ":"} ${st.title}`, { "data-action": "path-step", "data-value": String(n), class: "secondary" })}</li>`)
          .join("")}</ul>`
      : "";
  const reset = done > 0 ? button(t(COPY.pathProgress.reset, locale), { "data-action": "path-reset", "data-value": id, class: "secondary" }) : "";
  return (
    `<section lang="${locale}" aria-labelledby="view-title" data-names-unique>` +
    `<p class="muted">${esc(lp.title)} · ${esc(stepOf(i + 1, lp.steps.length, locale))}</p>` +
    `<h2 id="view-title">${esc(s.title)}</h2>` +
    `<p>${esc(s.body)}</p>${open}${tick}` +
    `<p class="muted" data-path-progress>${esc(progressText(done, lp.steps.length, locale))}</p>${all}${leftList}` +
    (today ? `<p>${downloadLink(pathToText(path, progress, locale, today), pathFilename(path, today, locale), locale, COPY.pathText.download)}</p>` : "") +
    `<nav aria-label="${esc(lp.title)}">${nav.join("")}${reset}</nav></section>`
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
