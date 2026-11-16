import type { Locale } from "../../switch-first/src/index";
import { COPY, t } from "./copy";
import { button, esc } from "./html";
import { STEPS, summariseSteps, type StepReport } from "./steps";

/**
 * The "Next steps" page. Each step is a button named with the step's own
 * words, followed by what is saved for it. The suggested next step is marked
 * in words, not only by position or colour.
 */
export interface StepsContext {
  readonly locale: Locale;
  readonly reports: readonly StepReport[];
}

const STATE_COPY = { saved: COPY.steps.saved, "not-yet": COPY.steps.notYet, unknown: COPY.steps.unknown } as const;

export function renderSteps(ctx: StepsContext): string {
  const l = ctx.locale;
  const sum = summariseSteps(ctx.reports);
  const rows = STEPS.map((s) => {
    const r = ctx.reports.find((x) => x.id === s.id);
    const state = r?.state ?? "unknown";
    const suggested = sum.next === s.id;
    return (
      `<li class="card"><p>${button(s.title[l], { "data-action": "step-go", "data-value": s.id, "aria-describedby": `step-state-${s.id}` })}</p>` +
      `<p>${esc(s.why[l])}</p>` +
      `<p id="step-state-${s.id}">${esc(t(STATE_COPY[state], l))}${suggested ? ` <strong>${esc(t(COPY.steps.suggested, l))}</strong>` : ""}</p></li>`
    );
  }).join("");
  const line = `${sum.saved} ${t(COPY.steps.of, l)} ${sum.total} ${t(COPY.steps.haveSaved, l)}`;
  return (
    `<section lang="${l}" aria-labelledby="view-title" data-names-unique data-steps>` +
    `<h2 id="view-title">${esc(t(COPY.steps.title, l))}</h2>` +
    `<p>${esc(t(COPY.steps.intro, l))}</p>` +
    `<p id="steps-summary" role="status">${esc(line)}${sum.unknown > 0 ? ` ${esc(t(COPY.steps.someUnknown, l))}` : ""}</p>` +
    `<ol class="plain">${rows}</ol>` +
    `<p>${button(t(COPY.help.backToList, l), { "data-action": "view", "data-value": "help", class: "secondary" })}</p></section>`
  );
}
