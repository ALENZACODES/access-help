import { ONBOARDING_PATHS, localizePath, type OnboardingPath } from "../../src/paths";
import type { Locale } from "../../switch-first/src/index";
import { COPY, t } from "./copy";
import { button, esc } from "./html";
import { doneCount, isDone, nextStepIndex, progressText, type PathProgress } from "./pathprogress";

/**
 * Every short path on one page, with the person's own ticks. Ticks are read
 * here, not changed, except by the two-step "Clear every tick". Buttons carry
 * the path's title so no two buttons on the page share a name.
 */
export interface PathsIndexContext {
  readonly locale: Locale;
  readonly progress: PathProgress;
  readonly confirmClear: boolean;
  readonly statusMessage: string | undefined;
}

function pathCard(p: OnboardingPath, progress: PathProgress, l: Locale): string {
  const lp = localizePath(p, l);
  const titleId = `paths-${p.id}`;
  const done = doneCount(progress, p.id);
  const next = nextStepIndex(progress, p);
  const colon = l === "fr" ? "\u00A0:" : ":";
  const steps = lp.steps
    .map((s, i) => {
      const ticked = isDone(progress, p.id, s.id);
      return `<li data-step="${esc(s.id)}" data-done="${ticked}">${esc(s.title)} <span class="muted">(${esc(t(ticked ? COPY.pathsIndex.stepDone : COPY.pathsIndex.stepNotDone, l))})</span>${i === next && done > 0 ? ` <strong>${esc(t(COPY.pathsIndex.next, l))}</strong>` : ""}</li>`;
    })
    .join("");
  // Start opens step 1; Continue opens the first step not ticked; a finished path opens step 1 to read again.
  const action = done === 0 ? COPY.pathsIndex.start : next === undefined ? COPY.pathsIndex.readAgain : COPY.pathText.continue;
  const open = button(`${t(action, l)}${colon} ${lp.title}`, { "data-action": done > 0 && next !== undefined ? "path-continue" : "open-path", "data-value": p.id });
  return (
    `<section class="card" data-path="${esc(p.id)}" aria-labelledby="${titleId}">` +
    `<h3 id="${titleId}">${esc(lp.title)}</h3><p>${esc(lp.summary)}</p>` +
    `<p class="muted" data-paths-progress>${esc(progressText(done, p.steps.length, l))}</p>` +
    `<ol aria-labelledby="${titleId}">${steps}</ol><p>${open}</p></section>`
  );
}

export function renderPathsIndex(ctx: PathsIndexContext): string {
  const l = ctx.locale;
  const any = ONBOARDING_PATHS.some((p) => doneCount(ctx.progress, p.id) > 0);
  const clear = !any
    ? ""
    : ctx.confirmClear
      ? `<p class="notice" role="note">${esc(t(COPY.pathsIndex.clearAsk, l))}</p><p>` +
        button(t(COPY.pathsIndex.clearYes, l), { "data-action": "paths-clear-confirm" }) +
        button(t(COPY.pathsIndex.clearNo, l), { "data-action": "paths-clear-cancel", class: "secondary" }) +
        `</p>`
      : `<p>${button(t(COPY.pathsIndex.clear, l), { "data-action": "paths-clear", class: "secondary" })}</p>`;
  return (
    `<section lang="${l}" aria-labelledby="view-title" data-names-unique>` +
    `<h2 id="view-title">${esc(t(COPY.pathsIndex.title, l))}</h2><p>${esc(t(COPY.pathsIndex.intro, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" role="status">${esc(ctx.statusMessage)}</p>` : "") +
    ONBOARDING_PATHS.map((p) => pathCard(p, ctx.progress, l)).join("") +
    clear +
    `<p>${button(t(COPY.help.backToList, l), { "data-action": "view", "data-value": "help", class: "secondary" })}</p></section>`
  );
}
