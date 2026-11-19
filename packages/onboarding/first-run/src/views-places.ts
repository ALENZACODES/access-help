import { placeFilename, placeToText, shortlistFilename, shortlistToText } from "./textexport";
import { downloadLink, renderPlaceSources } from "./views-sources";
import type { RestorePreview } from "./restorepreview";
import { renderRestorePreview } from "./views-restorepreview";
import type { Locale } from "../../switch-first/src/index";
import { entryFor, type AnswerError, type Checklist, hasChecklist } from "./checklist";
import { canCompare } from "./compare";
import { COPY, groupHeading, t } from "./copy";
import { FACT_KEYS, describeFact, type Fact, type FactKey } from "./facts";
import { hasRequirement, type Requirement } from "./filter";
import { button, esc } from "./html";
import { buildPlan, itemDetail, plannedQuestions, planToText, statusLabel, type Plan, type PlannedQuestion } from "./plan";
import { groupPlacesByVerdict, reportCount, type Observation, type Place, type Resolution } from "./places";
import { SORT_KEYS, sortPlaces, type SortKey } from "./sort";
import { onlyShortlisted } from "./shortlist";
import { renderFilter } from "./views-notes";
import { exportHref } from "./exchange";

export interface PlacesContext {
  readonly places: readonly Place[];
  readonly req: Requirement;
  readonly query: string;
  readonly locale: Locale;
  readonly today: Date;
  readonly hasSavedNeeds: boolean;
  readonly statusMessage: string | undefined;
  readonly shortlist: readonly string[];
  readonly shortlistOnly: boolean;
  readonly sort: SortKey;
  readonly compareIds: readonly string[];
  /** Backup text for the lists, when shown. */
  readonly backupText: string | undefined;
  readonly restoreText: string;
  readonly restoreMessage: string | undefined;
  readonly restorePreview?: RestorePreview | undefined;
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

/** The inside of one detail: value, then where it came from. Used in lists and in the comparison table. */
export function resolutionBody(key: FactKey, r: Resolution, locale: Locale, today: Date): string {
  if (r.kind === "unknown") {
    const v = describeFact({ key, value: "unknown", provenance: undefined }, locale, today);
    return `<strong>${esc(v.value)}</strong>. ${esc(v.detail)}`;
  }
  if (r.kind === "agree") {
    const newest = r.observations[0] as Observation;
    const v = describeFact(asFact(key, newest), locale, today);
    return `<strong>${esc(v.value)}</strong>. ${esc(v.detail)}${esc(agreeText(r.observations.length, locale))}`;
  }
  const items = r.observations
    .map((o) => {
      const v = describeFact(asFact(key, o), locale, today);
      return `<li>${esc(v.value)}. ${esc(v.detail)}</li>`;
    })
    .join("");
  return `<strong>${esc(t(COPY.places.differ, locale))}</strong>. ${esc(differText(reportCount(r), locale))}<ul>${items}</ul>`;
}

/** One row per detail. Unknown shows no source; every yes or no shows where it came from. */
export function renderResolution(key: FactKey, r: Resolution, locale: Locale, today: Date): string {
  return `<dt>${esc(t(COPY.facts[key], locale))}</dt><dd>${resolutionBody(key, r, locale, today)}</dd>`;
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

export function shortlistButton(id: string, on: boolean, l: Locale, describedBy?: string): string {
  return button(t(on ? COPY.shortlist.remove : COPY.shortlist.add, l), {
    "data-action": "toggle-shortlist",
    "data-value": id,
    class: "secondary",
    ...(describedBy ? { "aria-describedby": describedBy } : {}),
  });
}

function renderPlaceCard(p: Place, ctx: PlacesContext): string {
  const titleId = `place-title-${p.id}`;
  const l = ctx.locale;
  return (
    `<article class="card"><h4 id="${esc(titleId)}"><span data-user-content>${esc(p.name)}</span></h4>` +
    (p.address ? `<p class="muted"><span data-user-content>${esc(p.address)}</span></p>` : "") +
    renderResolutionList(p, l, ctx.today) +
    `<p>${button(t(COPY.places.open, l), { "data-action": "open-place", "data-value": p.id, "aria-describedby": titleId })}` +
    `${button(t(COPY.places.plan, l), { "data-action": "open-plan", "data-value": p.id, "aria-describedby": titleId, class: "secondary" })}` +
    shortlistButton(p.id, ctx.shortlist.includes(p.id), l, titleId) +
    `${button(t(COPY.compare.add, l), { "data-action": "toggle-compare", "data-value": p.id, "aria-describedby": titleId, "aria-pressed": String(ctx.compareIds.includes(p.id)), class: "secondary" })}</p></article>`
  );
}

function renderGroup(title: string, list: readonly Place[], ctx: PlacesContext, explain?: string): string {
  const body = list.length === 0 ? `<p class="muted">${esc(t(COPY.notes.noResults, ctx.locale))}</p>` : list.map((p) => renderPlaceCard(p, ctx)).join("");
  return `<h3>${esc(groupHeading(title, list.length))}</h3>${explain ? `<p class="muted">${esc(explain)}</p>` : ""}${body}`;
}

export function visiblePlaces(ctx: PlacesContext): Place[] {
  const base = ctx.shortlistOnly ? onlyShortlisted(ctx.places, ctx.shortlist) : ctx.places;
  return sortPlaces(base, ctx.sort, ctx.locale);
}

export function renderPlaceResults(ctx: PlacesContext): string {
  if (ctx.places.length === 0) return `<p>${esc(t(COPY.places.empty, ctx.locale))}</p>`;
  if (ctx.shortlistOnly && onlyShortlisted(ctx.places, ctx.shortlist).length === 0) return `<p>${esc(t(COPY.shortlist.empty, ctx.locale))}</p>`;
  const g = groupPlacesByVerdict(visiblePlaces(ctx), ctx.req, ctx.query);
  if (!hasRequirement(ctx.req)) return renderGroup(t(COPY.notes.all, ctx.locale), g.matches, ctx);
  return (
    renderGroup(t(COPY.notes.matches, ctx.locale), g.matches, ctx) +
    renderGroup(t(COPY.notes.unknown, ctx.locale), g.unknown, ctx, t(COPY.notes.unknownExplain, ctx.locale)) +
    renderGroup(t(COPY.notes.excluded, ctx.locale), g.excluded, ctx)
  );
}

export function renderSortControls(ctx: PlacesContext): string {
  const l = ctx.locale;
  const opts = SORT_KEYS.map((k) => `<option value="${k}"${ctx.sort === k ? " selected" : ""}>${esc(t(COPY.sort[k], l))}</option>`).join("");
  const kept = onlyShortlisted(ctx.places, ctx.shortlist);
  const keep =
    kept.length === 0
      ? ""
      : `<p>${downloadLink(shortlistToText(kept, l, ctx.today), shortlistFilename(kept.length, l), l, COPY.textExport.downloadShortlist)}</p>`;
  return (
    `<p><label for="sort">${esc(t(COPY.sort.label, l))}</label>` +
    `<select id="sort" aria-describedby="sort-hint" style="min-height:44px">${opts}</select></p>` +
    `<p id="sort-hint" class="hint">${esc(t(COPY.sort.hint, l))}</p>` +
    `<p class="hint">${esc(t(COPY.shortlist.intro, l))}</p>` +
    `<p>${button(t(COPY.shortlist.only, l), { "data-action": "shortlist-only", "aria-pressed": String(ctx.shortlistOnly), class: "secondary" })}</p>` +
    keep
  );
}

export function renderCompareBar(ids: readonly string[], places: readonly Place[], l: Locale): string {
  if (ids.length === 0) return "";
  const names = ids
    .map((id) => places.find((p) => p.id === id)?.name)
    .filter((n): n is string => n !== undefined)
    .map((n) => `<span data-user-content>${esc(n)}</span>`)
    .join(", ");
  return (
    `<div class="card" role="group" aria-labelledby="compare-bar-title"><h3 id="compare-bar-title">${esc(t(COPY.compare.selected, l))}</h3>` +
    `<p>${names}</p>` +
    (canCompare(ids)
      ? `<p>${button(t(COPY.compare.open, l), { "data-action": "open-compare" })}`
      : `<p class="hint">${esc(t(COPY.compare.choose, l))}</p><p>`) +
    `${button(t(COPY.compare.clear, l), { "data-action": "compare-clear", class: "secondary" })}</p></div>`
  );
}

export function renderListsBackup(ctx: PlacesContext, filename: string): string {
  const l = ctx.locale;
  const shown = ctx.backupText !== undefined;
  return (
    `<h3>${esc(t(COPY.lists.title, l))}</h3><p class="hint">${esc(t(COPY.lists.intro, l))}</p>` +
    (shown
      ? `<label for="backup-text">${esc(t(COPY.lists.exportLabel, l))}</label>` +
        `<textarea id="backup-text" readonly rows="6" data-audit-skip style="min-height:44px">${esc(ctx.backupText ?? "")}</textarea>` +
        `<p><a class="linkbtn" download="${esc(filename)}" href="${esc(exportHref(ctx.backupText ?? ""))}" style="display:inline-flex;align-items:center;min-width:44px;min-height:44px">${esc(t(COPY.notes.download, l))}</a>` +
        `${button(t(COPY.lists.hide, l), { "data-action": "backup-hide", class: "secondary" })}</p>`
      : `<p>${button(t(COPY.lists.export, l), { "data-action": "backup-open", class: "secondary" })}</p>`) +
    `<label for="restore-text">${esc(t(COPY.lists.importLabel, l))}</label>` +
    `<textarea id="restore-text" rows="4" data-audit-skip style="min-height:44px">${esc(ctx.restoreText)}</textarea>` +
    `<p class="hint">${esc(t(COPY.lists.keepNote, l))}</p>` +
    (ctx.restoreMessage ? `<p id="restore-message" class="notice" role="status">${esc(ctx.restoreMessage)}</p>` : "") +
    (ctx.restorePreview ? renderRestorePreview(ctx.restorePreview, l) : "") +
    `<p>${button(t(COPY.lists.restore, l), { "data-action": "backup-restore", class: "secondary" })}` +
    `${button(t(COPY.restorePreview.button, l), { "data-action": "restore-preview", class: "secondary" })}</p>`
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
    `${button(t(COPY.notes.add, l), { "data-action": "add-note" })}` +
    `${button(t(COPY.places.viewSimilar, l), { "data-action": "view", "data-value": "similar", class: "secondary" })}` +
    `${button(t(COPY.places.viewReview, l), { "data-action": "view", "data-value": "review", class: "secondary" })}</p>` +
    `<p>${button(t(COPY.places.viewLatest, l), { "data-action": "view", "data-value": "latest", class: "secondary" })}` +
    `${button(t(COPY.places.viewAges, l), { "data-action": "view", "data-value": "ages", class: "secondary" })}` +
    `${button(t(COPY.places.viewRepeats, l), { "data-action": "view", "data-value": "repeats", class: "secondary" })}` +
    `${button(t(COPY.places.viewGaps, l), { "data-action": "view", "data-value": "gaps", class: "secondary" })}</p>` +
    `<p>${button(t(COPY.places.viewSummary, l), { "data-action": "view", "data-value": "summary", class: "secondary" })}` +
    `${button(t(COPY.places.viewSources, l), { "data-action": "view", "data-value": "sources", class: "secondary" })}</p>` +
    renderFilter(ctx.req, ctx.query, l) +
    renderNeedsBar(hasRequirement(ctx.req), ctx.hasSavedNeeds, l) +
    renderSortControls(ctx) +
    renderCompareBar(ctx.compareIds, ctx.places, l) +
    `<div id="results">${renderPlaceResults(ctx)}</div>` +
    renderListsBackup(ctx, `lists-${ctx.today.toISOString().slice(0, 10)}.json`) +
    `</section>`
  );
}

export function renderPlaceDetail(place: Place | undefined, locale: Locale, today: Date, shortlisted = false): string {
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
    renderPlaceSources(place, l, today) +
    `<h3>${esc(t(COPY.places.notesTitle, l))}</h3><ul>${notes}</ul>` +
    `<p>${button(t(COPY.places.plan, l), { "data-action": "open-plan", "data-value": place.id })}` +
    `${button(t(COPY.checklist.addReport, l), { "data-action": "report-place", "data-value": place.id, class: "secondary" })}` +
    `${button(t(COPY.places.viewHistory, l), { "data-action": "open-history", "data-value": place.id, class: "secondary" })}` +
    `${shortlistButton(place.id, shortlisted, l)}${back}</p>` +
    `<p>${downloadLink(placeToText(place, l, today), placeFilename(place, l), l)}</p></section>`
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

export interface PlanContext {
  readonly place: Place | undefined;
  readonly req: Requirement;
  readonly usingSaved: boolean;
  readonly locale: Locale;
  readonly today: Date;
  readonly checklist: Checklist;
  readonly answerError: { readonly key: string; readonly code: AnswerError } | undefined;
  readonly confirmClear: boolean;
  readonly statusMessage: string | undefined;
}

const REASON = { unknown: "reasonUnknown", differ: "reasonDiffer", old: "reasonOld" } as const;

function renderQuestion(q: PlannedQuestion, ctx: PlanContext, placeId: string): string {
  const l = ctx.locale;
  const entry = entryFor(ctx.checklist, placeId, q.key);
  const id = `said-${q.key}-${q.reason}`;
  const err = ctx.answerError && ctx.answerError.key === q.key ? ctx.answerError.code : undefined;
  const data = { "data-key": q.key, "data-value": placeId };
  return (
    `<li><p>${esc(q.text)} <span class="muted">(${esc(t(COPY.checklist[REASON[q.reason]], l))})</span></p>` +
    `<label class="choice" style="min-height:44px;min-width:44px"><input type="checkbox" data-action="asked" data-key="${q.key}" data-value="${esc(placeId)}"${entry.asked ? " checked" : ""}>${esc(t(COPY.checklist.asked, l))}</label>` +
    `<label for="${id}">${esc(t(COPY.checklist.said, l))}</label>` +
    (err ? `<p id="e-${id}" class="error">${esc(t(COPY.checklist.error[err], l))}</p>` : "") +
    `<input id="${id}" type="text" autocomplete="off" maxlength="300" data-action="answer" data-key="${q.key}" data-value="${esc(placeId)}" value="${esc(entry.answer)}"` +
    `${err ? ` aria-invalid="true" aria-describedby="e-${id}"` : ""} style="min-height:44px">` +
    `<p>${button(t(COPY.checklist.addReport, l), { "data-action": "report-place", ...data, class: "secondary" })}</p></li>`
  );
}

/** The "clear my notes" control. It is redrawn on its own when a note is added, so focus stays where it is. */
export function renderClearArea(checklist: Checklist, placeId: string, confirm: boolean, l: Locale): string {
  if (!hasChecklist(checklist, placeId)) return "";
  if (!confirm) return `<p>${button(t(COPY.checklist.clear, l), { "data-action": "clear-checklist", "data-value": placeId, class: "secondary" })}</p>`;
  return (
    `<div class="card" role="group" aria-labelledby="clear-title"><h3 id="clear-title">${esc(t(COPY.checklist.clear, l))}</h3><p>${esc(t(COPY.checklist.confirmText, l))}</p>` +
    `<p>${button(t(COPY.checklist.confirmClear, l), { "data-action": "confirm-clear-checklist", "data-value": placeId })}` +
    `${button(t(COPY.checklist.cancelClear, l), { "data-action": "cancel-clear-checklist", "data-value": placeId, class: "secondary" })}</p></div>`
  );
}

export function renderPlan(ctx: PlanContext): string {
  const l = ctx.locale;
  const { place, req, today } = ctx;
  const back = button(t(COPY.places.back, l), { "data-action": "view", "data-value": "places", class: "secondary" });
  if (!place) return renderPlaceDetail(undefined, l, today);
  const head = `<section lang="${l}" aria-labelledby="view-title"><h2 id="view-title">${esc(t(COPY.plan.title, l))}</h2>` +
    `<p><strong><span data-user-content>${esc(place.name)}</span></strong></p>` +
    (ctx.statusMessage ? `<p class="notice" role="status">${esc(ctx.statusMessage)}</p>` : "");
  if (!hasRequirement(req)) {
    return head + `<p>${esc(t(COPY.plan.none, l))}</p><p>${button(t(COPY.plan.goFilter, l), { "data-action": "view", "data-value": "places" })}</p></section>`;
  }
  const plan = buildPlan(place, req);
  const questions = plannedQuestions(plan, l, today);
  const text = planToText(place, plan, l, today, ctx.checklist);
  return (
    head +
    `<p class="muted">${esc(t(ctx.usingSaved ? COPY.plan.usingNeeds : COPY.plan.usingFilter, l))}</p>` +
    `<h3>${esc(t(COPY.plan.whatMatters, l))}</h3>` +
    renderPlanItems(plan, l, today) +
    `<h3>${esc(t(COPY.plan.questionsTitle, l))}</h3>` +
    (questions.length > 0
      ? `<p class="hint">${esc(t(COPY.checklist.notReports, l))}</p><ol>${questions.map((q) => renderQuestion(q, ctx, place.id)).join("")}</ol>`
      : `<p>${esc(t(COPY.plan.noQuestions, l))}</p>`) +
    `<div id="clear-area">${renderClearArea(ctx.checklist, place.id, ctx.confirmClear, l)}</div>` +
    `<h3>${esc(t(COPY.plan.shareTitle, l))}</h3>` +
    `<label for="plan-text">${esc(t(COPY.plan.shareTitle, l))}</label>` +
    `<textarea id="plan-text" readonly rows="10" data-audit-skip style="min-height:44px">${esc(text)}</textarea>` +
    `<p>${button(t(COPY.copy.button, l), { "data-action": "copy-plan" })}` +
    `${button(t(COPY.plan.select, l), { "data-action": "select-text", class: "secondary" })}</p>` +
    `<p class="muted">${esc(t(COPY.plan.footer, l))}</p>` +
    `<p>${button(t(COPY.places.open, l), { "data-action": "open-place", "data-value": place.id, class: "secondary" })}${back}</p></section>`
  );
}
