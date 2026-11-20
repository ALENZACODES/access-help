import type { Locale } from "../../switch-first/src/index";
import { COPY, t } from "./copy";
import { FACT_KEYS } from "./facts";
import { button, esc } from "./html";
import type { Place } from "./places";
import { textExportHref } from "./textexport";
import { visitsCsvFilename, visitsToCsv } from "./visits-csv";
import { csvHref } from "./notes-csv";
import {
  FOUND_COPY,
  MAX_WORDS,
  VISIT_COPY,
  VISIT_ERRORS,
  canStartNote,
  compareVisit,
  comparisonLine,
  visitEditLabel,
  visitAskLabel,
  visitNoteLabel,
  followUps,
  filterVisits,
  visitsShownText,
  visitedPlaces,
  NO_FILTER,
  type VisitFilter,
  foundLines,
  visitRemoveLabel,
  visitCountText,
  visitHeading,
  visitsFilename,
  visitsText,
  type FoundChoice,
  type Visit,
  type VisitDraft,
  type VisitError,
} from "./visits";

const LINK_STYLE = "display:inline-flex;align-items:center;min-width:44px;min-height:44px";
const CHOICE_STYLE = "min-height:44px;min-width:44px";

export interface VisitsContext {
  readonly visits: readonly Visit[];
  readonly places: readonly Place[];
  readonly locale: Locale;
  /** The visit waiting for "Yes, remove it". */
  readonly pendingRemove: string | undefined;
  readonly statusMessage: string | undefined;
  /** Which visits to show; every one when left out. */
  readonly filter?: VisitFilter;
  readonly today?: Date;
}

/** One visit: what was found, compared with the notes, the person's words, and its buttons. */
export function renderVisit(v: Visit, ctx: VisitsContext, level: 3 | 4 = 3): string {
  const l = ctx.locale;
  const place = ctx.places.find((p) => p.id === v.placeId);
  const h = `h${level}`;
  const compared = compareVisit(v, place);
  const found =
    compared.length === 0
      ? `<p>${esc(t(VISIT_COPY.notLooked, l))}</p>`
      : `<p id="cmp-${v.id}">${esc(t(VISIT_COPY.compareTitle, l))}</p><ul aria-labelledby="cmp-${v.id}">${compared.map((c) => `<li>${esc(comparisonLine(c, l))}</li>`).join("")}</ul>`;
  const words = v.words ? `<p>${esc(t(VISIT_COPY.ownWords, l))}${l === "fr" ? "\u00A0:" : ":"} <span data-user-content>${esc(v.words)}</span></p>` : "";
  const gone = place ? "" : `<p class="hint">${esc(t(VISIT_COPY.gone, l))}</p>`;
  const confirming = ctx.pendingRemove === v.id;
  const actions = confirming
    ? `<p role="group" aria-labelledby="visit-${v.id}">` +
      button(t(VISIT_COPY.confirmRemove, l), { "data-action": "visit-remove-confirm", "data-value": v.id, "aria-describedby": `visit-${v.id}` }) +
      button(t(VISIT_COPY.keep, l), { "data-action": "visit-remove-cancel", "data-value": v.id, class: "secondary", "aria-describedby": `visit-${v.id}` }) +
      `</p>`
    : `<p>` +
      button(visitEditLabel(v, l), { "data-action": "visit-edit", "data-value": v.id, class: "secondary" }) +
      (canStartNote(v) ? button(visitNoteLabel(v, l), { "data-action": "visit-note", "data-value": v.id, "aria-describedby": "visit-note-hint" }) : "") +
      button(visitRemoveLabel(v, l), { "data-action": "visit-remove", "data-value": v.id, class: "secondary" }) +
      `</p>`;
  return (
    `<article class="visit" aria-labelledby="visit-${v.id}">` +
    `<${h} id="visit-${v.id}">${esc(visitHeading(v))}</${h}>` +
    gone +
    found +
    words +
    actions +
    `</article>`
  );
}

/** The places where the newest visit found something the notes do not show, with a way to record it or ask. */
export function renderFollowUps(ctx: VisitsContext): string {
  const l = ctx.locale;
  const list = followUps(ctx.visits, ctx.places);
  if (list.length === 0) return "";
  const items = list
    .map(
      (f) =>
        `<li><p id="fu-${f.visit.id}"><strong>${esc(visitHeading(f.visit))}</strong></p>` +
        `<ul aria-labelledby="fu-${f.visit.id}">${f.items.map((c) => `<li>${esc(comparisonLine(c, l))}</li>`).join("")}</ul>` +
        `<p>${button(visitNoteLabel(f.visit, l), { "data-action": "visit-note", "data-value": f.visit.id, class: "secondary" })}` +
        `${button(visitAskLabel(f.visit, l), { "data-action": "visit-ask", "data-value": f.visit.id, class: "secondary" })}</p></li>`,
    )
    .join("");
  return (
    `<section class="follow-ups" aria-labelledby="follow-title">` +
    `<h3 id="follow-title">${esc(t(VISIT_COPY.followTitle, l))}</h3>` +
    `<p>${esc(t(VISIT_COPY.followIntro, l))}</p><ul class="plain">${items}</ul></section>`
  );
}

export function renderVisits(ctx: VisitsContext): string {
  const l = ctx.locale;
  const status = ctx.statusMessage ? `<p class="notice" role="status">${esc(ctx.statusMessage)}</p>` : "";
  const add =
    ctx.places.length === 0
      ? `<p>${esc(t(VISIT_COPY.noPlaces, l))}</p>`
      : `<p>${button(t(VISIT_COPY.add, l), { "data-action": "visit-new", "data-value": "" })}</p>`;
  const list =
    ctx.visits.length === 0
      ? `<p>${esc(t(VISIT_COPY.none, l))}</p>`
      : `<p id="visit-count">${esc(visitCountText(ctx.visits.length, l))}</p>` +
        `<p id="visit-note-hint" class="hint">${esc(t(VISIT_COPY.startNoteHint, l))}</p>` +
        renderFollowUps(ctx) +
        `<h3 id="all-visits">${esc(t(VISIT_COPY.allTitle, l))}</h3>` +
        renderVisitFilter(ctx) +
        renderShown(ctx) +
        `<p><a class="linkbtn" data-visits-download download="${esc(visitsFilename(l))}" href="${esc(textExportHref(visitsText(ctx.visits, l)))}" style="${LINK_STYLE}">${esc(t(VISIT_COPY.download, l))}</a>` +
        `<a class="linkbtn" data-visits-csv download="${esc(visitsCsvFilename(ctx.today ?? new Date()))}" href="${esc(csvHref(visitsToCsv(ctx.visits, ctx.places)))}" style="${LINK_STYLE}">${esc(t(VISIT_COPY.csv, l))}</a></p>`;
  return (
    `<section lang="${l}" aria-labelledby="view-title" class="visits">` +
    `<h2 id="view-title">${esc(t(VISIT_COPY.title, l))}</h2>` +
    `<p>${esc(t(VISIT_COPY.intro, l))}</p><p class="hint">${esc(t(VISIT_COPY.privacy, l))}</p>` +
    status +
    add +
    list +
    `<p>${button(t(VISIT_COPY.back, l), { "data-action": "view", "data-value": "notes", class: "secondary" })}</p>` +
    `</section>`
  );
}

/** Which visits to show: one place or all, and only those with something to follow up. */
export function renderVisitFilter(ctx: VisitsContext): string {
  const l = ctx.locale;
  const f = ctx.filter ?? NO_FILTER;
  const places = visitedPlaces(ctx.visits);
  const options =
    `<option value=""${f.placeId === "" ? " selected" : ""}>${esc(t(VISIT_COPY.filterAll, l))}</option>` +
    places.map((p) => `<option value="${esc(p.id)}"${p.id === f.placeId ? " selected" : ""}>${esc(p.name)}</option>`).join("");
  return (
    `<fieldset class="visit-filter"><legend>${esc(t(VISIT_COPY.filterLegend, l))}</legend>` +
    `<label for="visit-filter-place">${esc(t(VISIT_COPY.filterPlace, l))}</label>` +
    `<select id="visit-filter-place" data-action="visit-filter-place" style="min-height:44px">${options}</select>` +
    `<label class="choice" style="${CHOICE_STYLE}"><input type="checkbox" data-action="visit-only-follow"${f.onlyFollow ? " checked" : ""}>${esc(t(VISIT_COPY.filterFollow, l))}</label>` +
    `</fieldset>`
  );
}

/** The visits the filter lets through, with how many that is. Replaced on its own when the filter changes. */
export function renderShown(ctx: VisitsContext): string {
  const l = ctx.locale;
  const shown = filterVisits(ctx.visits, ctx.places, ctx.filter ?? NO_FILTER);
  return (
    `<div id="visit-results">` +
    `<p id="visit-shown">${esc(visitsShownText(shown.length, ctx.visits.length, l))}</p>` +
    (shown.length === 0 ? `<p>${esc(t(VISIT_COPY.noneShown, l))}</p>` : shown.map((v) => renderVisit(v, ctx, 4)).join("")) +
    `</div>`
  );
}

/** A place's own visits, for its page: a short list and a way to write another. */
export function renderPlaceVisits(place: Place, visits: readonly Visit[], l: Locale): string {
  const mine = visits.filter((v) => v.placeId === place.id);
  const items = mine.map((v) => `<li>${esc(`${v.visitedOn} \u2014 ${foundLines(v, l).join(" ") || t(VISIT_COPY.notLooked, l)}`)}</li>`);
  return (
    `<section class="place-visits" aria-labelledby="place-visits-title">` +
    `<h3 id="place-visits-title">${esc(t(VISIT_COPY.placeVisits, l))}</h3>` +
    (mine.length === 0 ? "" : `<ul>${items.join("")}</ul>`) +
    `<p>${button(t(VISIT_COPY.addHere, l), { "data-action": "visit-new", "data-value": place.id, class: "secondary" })}` +
    (mine.length === 0 ? "" : button(t(VISIT_COPY.open, l), { "data-action": "view", "data-value": "visits", class: "secondary" })) +
    `</p></section>`
  );
}

// ---- The form ----

export interface VisitFormContext {
  readonly draft: VisitDraft;
  readonly errors: readonly VisitError[];
  readonly places: readonly Place[];
  /** The visit being changed, when changing one. */
  readonly editing: Visit | undefined;
  readonly locale: Locale;
}

const FIELD_ID: Readonly<Record<VisitError["field"], string>> = { place: "vs-place", date: "vs-date", words: "vs-words", found: "vs-found" };

function errorsFor(errors: readonly VisitError[], field: VisitError["field"], l: Locale): string {
  const list = errors.filter((e) => e.field === field);
  return list.length === 0 ? "" : `<p id="e-${FIELD_ID[field]}" class="error">${list.map((e) => esc(t(VISIT_ERRORS[e.code], l))).join(" ")}</p>`;
}

const invalid = (errors: readonly VisitError[], field: VisitError["field"], hint: string): string => {
  const bad = errors.some((e) => e.field === field);
  return ` aria-describedby="${hint}${bad ? ` e-${FIELD_ID[field]}` : ""}"${bad ? ' aria-invalid="true"' : ""}`;
};

export function renderVisitErrors(errors: readonly VisitError[], l: Locale): string {
  if (errors.length === 0) return "";
  const items = errors.map((e) => `<li><a href="#${FIELD_ID[e.field]}">${esc(t(VISIT_ERRORS[e.code], l))}</a></li>`).join("");
  return `<div id="error-summary" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(VISIT_COPY.errorsTitle, l))}</h3><ul>${items}</ul></div>`;
}

export function renderVisitForm(ctx: VisitFormContext): string {
  const l = ctx.locale;
  const d = ctx.draft;
  const places = [...ctx.places].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  // A visit to a place that has left the notes keeps its place while being changed.
  const keep = ctx.editing && !places.some((p) => p.id === ctx.editing?.placeId) ? `<option value="${esc(ctx.editing.placeId)}" selected>${esc(ctx.editing.placeName)}</option>` : "";
  const options =
    `<option value=""${d.placeId === "" ? " selected" : ""}>${esc(t(VISIT_COPY.placeChoose, l))}</option>` +
    keep +
    places.map((p) => `<option value="${esc(p.id)}"${p.id === d.placeId ? " selected" : ""}>${esc(p.address ? `${p.name}, ${p.address}` : p.name)}</option>`).join("");
  const radios = (k: (typeof FACT_KEYS)[number]): string =>
    (["", "yes", "no"] as const)
      .map(
        (c: FoundChoice) =>
          `<label class="choice" style="${CHOICE_STYLE}"><input type="radio" name="found-${k}" value="${c}"${d.found[k] === c ? " checked" : ""}${c === "" ? ` id="vs-${k}"` : ""}>${esc(t(FOUND_COPY[c], l))}</label>`,
      )
      .join("");
  const found = FACT_KEYS.map((k) => `<fieldset><legend>${esc(t(COPY.facts[k], l))}</legend>${radios(k)}</fieldset>`).join("");
  const title = t(ctx.editing ? VISIT_COPY.editTitle : VISIT_COPY.newTitle, l);
  return (
    `<section lang="${l}" aria-labelledby="view-title" class="visit-form">` +
    `<h2 id="view-title">${esc(title)}</h2>` +
    `<p class="hint">${esc(t(VISIT_COPY.privacy, l))}</p>` +
    renderVisitErrors(ctx.errors, l) +
    `<form id="visit-form" novalidate>` +
    `<label for="vs-place">${esc(t(VISIT_COPY.placeLabel, l))}</label><p id="vs-place-hint" class="hint">${esc(t(VISIT_COPY.placeHint, l))}</p>${errorsFor(ctx.errors, "place", l)}` +
    `<select id="vs-place" name="place"${invalid(ctx.errors, "place", "vs-place-hint")} style="min-height:44px">${options}</select>` +
    `<label for="vs-date">${esc(t(VISIT_COPY.dateLabel, l))}</label><p id="vs-date-hint" class="hint">${esc(t(VISIT_COPY.dateHint, l))}</p>${errorsFor(ctx.errors, "date", l)}` +
    `<input id="vs-date" name="visitedOn" type="text" inputmode="numeric" autocomplete="off" maxlength="10" value="${esc(d.visitedOn)}"${invalid(ctx.errors, "date", "vs-date-hint")} style="min-height:44px">` +
    `<fieldset id="vs-found" tabindex="-1"${invalid(ctx.errors, "found", "vs-found-hint")}><legend>${esc(t(VISIT_COPY.foundLegend, l))}</legend>` +
    `<p id="vs-found-hint" class="hint">${esc(t(VISIT_COPY.foundHint, l))}</p>${errorsFor(ctx.errors, "found", l)}${found}</fieldset>` +
    `<label for="vs-words">${esc(t(VISIT_COPY.wordsLabel, l))}</label><p id="vs-words-hint" class="hint">${esc(t(VISIT_COPY.wordsHint, l))}</p>${errorsFor(ctx.errors, "words", l)}` +
    `<textarea id="vs-words" name="words" rows="4" maxlength="${MAX_WORDS + 100}"${invalid(ctx.errors, "words", "vs-words-hint")} style="min-height:44px">${esc(d.words)}</textarea>` +
    `<p>${button(t(VISIT_COPY.save, l), { type: "submit", "data-action": "visit-save" })}</p>` +
    `</form>` +
    `<p>${button(t(VISIT_COPY.cancel, l), { "data-action": "view", "data-value": "visits", class: "secondary" })}</p>` +
    `</section>`
  );
}
