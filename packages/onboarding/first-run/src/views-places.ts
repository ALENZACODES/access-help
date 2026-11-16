import type { Locale } from "../../switch-first/src/index";
import { COPY, groupHeading, t } from "./copy";
import { FACT_KEYS, describeFact, type Fact, type FactKey } from "./facts";
import { hasRequirement, type Requirement } from "./filter";
import { button, esc } from "./html";
import { buildPlan, itemDetail, planToText, questionsFor, statusLabel, type Plan } from "./plan";
import { groupPlacesByVerdict, reportCount, type Observation, type Place, type Resolution } from "./places";
import { renderFilter } from "./views-notes";

export interface PlacesContext {
  readonly places: readonly Place[];
  readonly req: Requirement;
  readonly query: string;
  readonly locale: Locale;
  readonly today: Date;
  readonly hasSavedNeeds: boolean;
  readonly statusMessage: string | undefined;
}

function agreeText(n: number, locale: Locale): string {
  if (n < 2) return "";
  return locale === "fr" ? ` ${n} rapports concordent.` : ` ${n} reports agree.`;
}

function differText(n: number, locale: Locale): string {
  return locale === "fr" ? `${n} rapports divergent.` : `${n} reports disagree.`;
}

function asFact(key: FactKey, o: Observation): Fact {
  return { key, value: o.value, provenance: o.provenance };
}

/** One row per detail. Unknown shows no source; every yes or no shows where it came from. */
export function renderResolution(key: FactKey, r: Resolution, locale: Locale, today: Date): string {
  const label = esc(t(COPY.facts[key], locale));
  if (r.kind === "unknown") {
    const v = describeFact({ key, value: "unknown", provenance: undefined }, locale, today);
    return `<dt>${label}</dt><dd><strong>${esc(v.value)}</strong>. ${esc(v.detail)}</dd>`;
  }
  if (r.kind === "agree") {
    const newest = r.observations[0] as Observation;
    const v = describeFact(asFact(key, newest), locale, today);
    return `<dt>${label}</dt><dd><strong>${esc(v.value)}</strong>. ${esc(v.detail)}${esc(agreeText(r.observations.length, locale))}</dd>`;
  }
  const items = r.observations
    .map((o) => {
      const v = describeFact(asFact(key, o), locale, today);
      return `<li>${esc(v.value)}. ${esc(v.detail)}</li>`;
    })
    .join("");
  return (
    `<dt>${label}</dt><dd><strong>${esc(t(COPY.places.differ, locale))}</strong>. ${esc(differText(reportCount(r), locale))}` +
    `<ul>${items}</ul></dd>`
  );
}

export function renderResolutionList(place: Place, locale: Locale, today: Date): string {
  const rows = FACT_KEYS.map((k) => renderResolution(k, place.resolutions[k], locale, today)).join("");
  return `<dl class="facts">${rows}</dl>`;
}

export function renderNeedsBar(hasReq: boolean, hasSaved: boolean, locale: Locale): string {
  if (!hasReq && !hasSaved) return "";
  const buttons: string[] = [];
  if (hasReq) buttons.push(button(t(COPY.needs.save, locale), { "data-action": "save-needs", class: "secondary" }));
  if (hasSaved) {
    buttons.push(button(t(COPY.needs.use, locale), { "data-action": "use-needs", class: "secondary" }));
    buttons.push(button(t(COPY.needs.clear, locale), { "data-action": "clear-needs", class: "secondary" }));
  }
  return `<p class="hint">${esc(t(COPY.needs.intro, locale))}</p><p>${buttons.join("")}</p>`;
}

function renderPlaceCard(p: Place, ctx: PlacesContext): string {
  const titleId = `place-title-${p.id}`;
  const l = ctx.locale;
  return (
    `<article class="card"><h4 id="${esc(titleId)}"><span data-user-content>${esc(p.name)}</span></h4>` +
    (p.address ? `<p class="muted"><span data-user-content>${esc(p.address)}</span></p>` : "") +
    renderResolutionList(p, l, ctx.today) +
    `<p>${button(t(COPY.places.open, l), { "data-action": "open-place", "data-value": p.id, "aria-describedby": titleId })}` +
    `${button(t(COPY.places.plan, l), { "data-action": "open-plan", "data-value": p.id, "aria-describedby": titleId, class: "secondary" })}</p></article>`
  );
}

function renderGroup(title: string, list: readonly Place[], ctx: PlacesContext, explain?: string): string {
  const body = list.length === 0 ? `<p class="muted">${esc(t(COPY.notes.noResults, ctx.locale))}</p>` : list.map((p) => renderPlaceCard(p, ctx)).join("");
  return `<h3>${esc(groupHeading(title, list.length))}</h3>${explain ? `<p class="muted">${esc(explain)}</p>` : ""}${body}`;
}

export function renderPlaceResults(ctx: PlacesContext): string {
  if (ctx.places.length === 0) return `<p>${esc(t(COPY.places.empty, ctx.locale))}</p>`;
  const g = groupPlacesByVerdict(ctx.places, ctx.req, ctx.query);
  if (!hasRequirement(ctx.req)) return renderGroup(t(COPY.notes.all, ctx.locale), g.matches, ctx);
  return (
    renderGroup(t(COPY.notes.matches, ctx.locale), g.matches, ctx) +
    renderGroup(t(COPY.notes.unknown, ctx.locale), g.unknown, ctx, t(COPY.notes.unknownExplain, ctx.locale)) +
    renderGroup(t(COPY.notes.excluded, ctx.locale), g.excluded, ctx)
  );
}

export function renderPlaces(ctx: PlacesContext): string {
  const l = ctx.locale;
  return (
    `<section lang="${l}" aria-labelledby="view-title">` +
    `<h2 id="view-title">${esc(t(COPY.places.title, l))}</h2>` +
    `<p>${esc(t(COPY.places.intro, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" role="status">${esc(ctx.statusMessage)}</p>` : "") +
    `<p>${button(t(COPY.places.viewNotes, l), { "data-action": "view", "data-value": "notes", class: "secondary" })}` +
    `${button(t(COPY.notes.add, l), { "data-action": "add-note" })}</p>` +
    renderFilter(ctx.req, ctx.query, l) +
    renderNeedsBar(hasRequirement(ctx.req), ctx.hasSavedNeeds, l) +
    `<div id="results">${renderPlaceResults(ctx)}</div></section>`
  );
}

export function renderPlaceDetail(place: Place | undefined, locale: Locale, today: Date): string {
  const l = locale;
  const back = button(t(COPY.places.back, l), { "data-action": "view", "data-value": "places", class: "secondary" });
  if (!place) {
    return (
      `<section lang="${l}" aria-labelledby="view-title"><h2 id="view-title">${esc(t(COPY.places.title, l))}</h2>` +
      `<p class="notice" role="note">${esc(t(COPY.places.notFound, l))}</p><p>${back}</p></section>`
    );
  }
  const notes = place.notes
    .map(
      (n) =>
        `<li>${esc(n.createdOn)} · ${esc(n.licence)}` +
        (n.note ? `<br><span data-user-content>${esc(n.note)}</span>` : "") +
        `</li>`,
    )
    .join("");
  return (
    `<section lang="${l}" aria-labelledby="view-title">` +
    `<h2 id="view-title"><span data-user-content>${esc(place.name)}</span></h2>` +
    (place.address ? `<p class="muted"><span data-user-content>${esc(place.address)}</span></p>` : "") +
    renderResolutionList(place, l, today) +
    `<h3>${esc(t(COPY.places.notesTitle, l))}</h3><ul>${notes}</ul>` +
    `<p>${button(t(COPY.places.plan, l), { "data-action": "open-plan", "data-value": place.id })}${back}</p></section>`
  );
}

function renderPlanItems(plan: Plan, locale: Locale, today: Date): string {
  const rows = plan.items
    .map((i) => {
      const reports =
        i.resolution.kind === "differ"
          ? `<ul>${i.resolution.observations
              .map((o) => {
                const v = describeFact(asFact(i.key, o), locale, today);
                return `<li>${esc(v.value)}. ${esc(v.detail)}</li>`;
              })
              .join("")}</ul>`
          : "";
      return `<dt>${esc(t(COPY.facts[i.key], locale))}</dt><dd><strong>${esc(statusLabel(i.status, locale))}</strong>. ${esc(itemDetail(i, locale, today))}${reports}</dd>`;
    })
    .join("");
  return `<dl class="plan">${rows}</dl>`;
}

export function renderPlan(
  place: Place | undefined,
  req: Requirement,
  usingSaved: boolean,
  locale: Locale,
  today: Date,
): string {
  const l = locale;
  const back = button(t(COPY.places.back, l), { "data-action": "view", "data-value": "places", class: "secondary" });
  if (!place) return renderPlaceDetail(undefined, locale, today);
  const head = `<section lang="${l}" aria-labelledby="view-title"><h2 id="view-title">${esc(t(COPY.plan.title, l))}</h2>` +
    `<p><strong><span data-user-content>${esc(place.name)}</span></strong></p>`;
  if (!hasRequirement(req)) {
    return head + `<p>${esc(t(COPY.plan.none, l))}</p><p>${button(t(COPY.plan.goFilter, l), { "data-action": "view", "data-value": "places" })}</p></section>`;
  }
  const plan = buildPlan(place, req);
  const questions = questionsFor(plan, l);
  const text = planToText(place, plan, l, today);
  return (
    head +
    `<p class="muted">${esc(t(usingSaved ? COPY.plan.usingNeeds : COPY.plan.usingFilter, l))}</p>` +
    `<h3>${esc(t(COPY.plan.whatMatters, l))}</h3>` +
    renderPlanItems(plan, l, today) +
    `<h3>${esc(t(COPY.plan.questionsTitle, l))}</h3>` +
    (questions.length > 0 ? `<ol>${questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ol>` : `<p>${esc(t(COPY.plan.noQuestions, l))}</p>`) +
    `<h3>${esc(t(COPY.plan.shareTitle, l))}</h3>` +
    `<label for="plan-text">${esc(t(COPY.plan.shareTitle, l))}</label>` +
    `<textarea id="plan-text" readonly rows="10" data-audit-skip style="min-height:44px">${esc(text)}</textarea>` +
    `<p>${button(t(COPY.plan.select, l), { "data-action": "select-text", class: "secondary" })}</p>` +
    `<p class="muted">${esc(t(COPY.plan.footer, l))}</p>` +
    `<p>${button(t(COPY.places.open, l), { "data-action": "open-place", "data-value": place.id, class: "secondary" })}${back}</p></section>`
  );
}
