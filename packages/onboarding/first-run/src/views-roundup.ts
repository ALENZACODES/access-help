import type { Locale } from "../../switch-first/src/index";
import type { Checklist } from "./checklist";
import { COPY, NB, t } from "./copy";
import type { Requirement } from "./filter";
import { button, esc } from "./html";
import { hasNeeds } from "./needs";
import type { Place } from "./places";
import { itemDetail, statusLabel } from "./plan";
import { askedText, buildRoundup, onlyQuestionsLeft, roundupFilename, roundupToText, statusCountsLine, type RoundupPlace } from "./roundup";
import { downloadLink } from "./views-sources";
import { renderCallScript } from "./callscript";

export interface RoundupContext {
  readonly places: readonly Place[];
  readonly shortlist: readonly string[];
  readonly needs: Requirement;
  readonly checklist: Checklist;
  readonly locale: Locale;
  readonly today: Date;
  /** Show only places that still have a question nobody ticked. */
  readonly onlyLeft?: boolean;
}

function leftFilter(only: boolean, l: Locale): string {
  const one = (value: "all" | "left", label: string, pressed: boolean): string =>
    button(label, { "data-action": "roundup-left", "data-value": value, "aria-pressed": String(pressed), class: "secondary" });
  return (
    `<div role="group" aria-labelledby="roundup-filter-label" class="roundup-filter">` +
    `<p id="roundup-filter-label">${esc(t(COPY.roundup.filterLabel, l))}</p>` +
    one("all", t(COPY.roundup.allPlaces, l), !only) +
    one("left", t(COPY.roundup.onlyLeft, l), only) +
    `</div>`
  );
}

function placeCard(p: RoundupPlace, index: number, l: Locale, today: Date): string {
  const titleId = `roundup-place-${index}`;
  const colon = l === "fr" ? `${NB}:` : ":";
  // dl.plan carries the same status-and-source rules the App's audit applies to the visit plan.
  const items = p.plan.items
    .map((item) => `<dt>${esc(t(COPY.facts[item.key], l))}</dt><dd data-status="${item.status}"><strong>${esc(statusLabel(item.status, l))}</strong>. ${esc(itemDetail(item, l, today))}</dd>`)
    .join("");
  const counts = statusCountsLine(p.plan.counts, l);
  const questions =
    p.questions.length === 0
      ? `<p data-roundup-noquestions>${esc(t(COPY.roundup.noQuestions, l))}</p>`
      : `<h4 id="${titleId}-q">${esc(t(COPY.plan.questionsTitle, l))}</h4>` +
        `<p data-roundup-asked="${p.asked}" data-roundup-total="${p.questions.length}">${esc(askedText(p.asked, p.questions.length, l))}</p>` +
        `<ol aria-labelledby="${titleId}-q">${p.questions
          .map((q) => {
            const textId = `${titleId}-${q.key}`;
            // The same checkbox as on the visit plan, so a tick here is the same saved tick there.
            return (
              `<li data-key="${q.key}" data-asked="${q.asked}"><p id="${textId}">${esc(q.text)}</p>` +
              `<label class="choice" style="min-height:44px;min-width:44px"><input type="checkbox" data-action="asked" data-key="${q.key}" data-value="${esc(p.place.id)}" aria-describedby="${textId}"${q.asked ? " checked" : ""}>${esc(t(COPY.checklist.asked, l))}</label>` +
              (q.answer.trim() !== "" ? `<p>${esc(t(COPY.checklist.saidLabel, l))}${colon} <span data-user-content>${esc(q.answer)}</span></p>` : "") +
              `</li>`
            );
          })
          .join("")}</ol>`;
  return (
    `<article class="card roundup-place" data-place="${esc(p.place.id)}" aria-labelledby="${titleId}">` +
    `<h3 id="${titleId}">${index + 1}. <span data-user-content>${esc(p.place.name)}</span></h3>` +
    (p.place.address ? `<p class="muted"><span data-user-content>${esc(p.place.address)}</span></p>` : "") +
    (counts !== "" ? `<p data-roundup-counts>${esc(counts)}.</p>` : "") +
    `<dl class="plan">${items}</dl>` +
    questions +
    renderCallScript(p, index, l, today) +
    `<p>${button(t(COPY.roundup.openPlan, l), { "data-action": "open-plan", "data-value": p.place.id, "aria-describedby": titleId, class: "secondary" })}</p>` +
    `</article>`
  );
}

/** The shortlist round-up page. It lists and counts; it never ranks or picks a place. */
export function renderRoundup(ctx: RoundupContext): string {
  const l = ctx.locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const back = button(t(COPY.places.back, l), { "data-action": "view", "data-value": "places", class: "secondary" });
  const head =
    `<h2 id="view-title">${esc(t(COPY.roundup.title, l))}</h2><p>${esc(t(COPY.roundup.intro, l))}</p>` +
    `<p class="notice" role="note">${esc(t(COPY.shortlist.intro, l))} ${esc(t(COPY.checklist.notReports, l))}</p>`;
  const full = buildRoundup(ctx.places, ctx.shortlist, ctx.needs, ctx.checklist, l, ctx.today);
  const only = ctx.onlyLeft === true;
  const r = only ? onlyQuestionsLeft(full) : full;
  const missing = r.missing > 0 ? `<p data-roundup-missing>${esc(t(COPY.roundup.missing, l))}</p>` : "";
  if (full.places.length === 0) {
    return `<section lang="${l}" aria-labelledby="view-title">${head}<p data-roundup-empty>${esc(t(COPY.roundup.empty, l))}</p>${missing}<p>${back}</p></section>`;
  }
  if (!hasNeeds(ctx.needs)) {
    const toNeeds = button(t(COPY.places.viewMustHaves, l), { "data-action": "view", "data-value": "musthaves" });
    return `<section lang="${l}" aria-labelledby="view-title">${head}<p data-roundup-noneeds>${esc(t(COPY.roundup.noNeeds, l))}</p>${missing}<p>${toNeeds}${back}</p></section>`;
  }
  const filter =
    leftFilter(only, l) +
    (only ? `<p data-roundup-showing-left>${esc(t(COPY.roundup.showingLeft, l))}</p>` : "") +
    (only && r.places.length === 0 ? `<p data-roundup-none-left>${esc(t(COPY.roundup.noneLeft, l))}</p>` : "");
  const totals =
    filter +
    `<ul class="totals"><li>${esc(t(COPY.roundup.placesLabel, l))}${colon} <strong data-roundup-places>${r.totals.places}</strong></li>` +
    `<li>${esc(t(COPY.roundup.questionsLabel, l))}${colon} <strong data-roundup-progress>${esc(askedText(r.totals.asked, r.totals.questions, l))}</strong></li>` +
    (only ? "" : `<li>${esc(t(COPY.roundup.allAskedLabel, l))}${colon} <strong data-roundup-allasked>${r.totals.allAsked}</strong></li>`) +
    `</ul>`;
  return (
    `<section lang="${l}" aria-labelledby="view-title">${head}${totals}${missing}` +
    r.places.map((p, i) => placeCard(p, i, l, ctx.today)).join("") +
    `<p class="hint">${esc(t(COPY.textExport.keepNote, l))}</p>` +
    `<p>${downloadLink(roundupToText(r, true, l, ctx.today, only), roundupFilename(ctx.today, l), l, COPY.roundup.download)}${back}</p></section>`
  );
}
