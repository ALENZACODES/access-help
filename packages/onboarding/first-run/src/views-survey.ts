import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";
import { CONTRIBUTOR_SOURCE, FACT_KEYS, OPEN_LICENCES, describeFact, type Fact, type Tri } from "./facts";
import { button, esc } from "./html";
import { fieldLabelText } from "./form";
import { LIMITS } from "./model";
import type { Place } from "./places";
import { QUESTIONS } from "./plan";
import {
  MAX_STOPS,
  currentQuestion,
  hasAnswer,
  openKeys,
  surveyProgress,
  savedValue,
  stopId,
  type StartError,
  type StopError,
  type Survey,
  type SurveyStop,
} from "./survey";
import {
  SURVEY_COPY,
  addPlaceLabel,
  surveyChangeLabel,
  downLabel,
  overallText,
  placeLabel,
  questionOf,
  questionsCount,
  removeLabel,
  saveLabel,
  stopError,
  stopHeading,
  upLabel,
} from "./survey-copy";

export interface SurveyContext {
  readonly survey: Survey;
  readonly locale: Locale;
  readonly today: Date;
  /** Places from the person's notes, to add with only their open questions. */
  readonly places: readonly Place[];
  readonly addErrors: readonly StopError[];
  readonly startErrors: readonly StartError[];
  /** What was typed in the add-a-place fields, kept when there is an error. */
  readonly draftName: string;
  readonly draftAddress: string;
  readonly confirmDiscard: boolean;
  readonly statusMessage: string | undefined;
  /** How many more notes fit on this device. */
  readonly notesRoom: number;
}

const INPUT_STYLE = 'style="min-height:44px"';
const ANSWERS: readonly Tri[] = ["yes", "no", "unknown"];

function answerLabel(v: Tri, l: Locale): string {
  return v === "unknown" ? t(SURVEY_COPY.notSure, l) : t(COPY.values[v], l);
}

/** Places worth adding: they have open questions and are not in the survey yet. Most open questions first, then by name. */
export function candidates(places: readonly Place[], s: Survey): Place[] {
  const inSurvey = new Set(s.stops.map((x) => x.id));
  return places
    .filter((p) => openKeys(p).length > 0 && !inSurvey.has(stopId(p.name, p.address ?? "")))
    .sort((a, b) => openKeys(b).length - openKeys(a).length || a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
    .slice(0, 10);
}

function status(ctx: SurveyContext): string {
  return ctx.statusMessage ? `<p class="notice" role="status">${esc(ctx.statusMessage)}</p>` : "";
}

function startErrorSummary(errors: readonly StartError[], l: Locale): string {
  if (errors.length === 0) return "";
  const target = (e: StartError): string => (e.field === "stops" ? "#survey-stops" : e.field === "observedOn" ? "#s-date" : "#s-licence");
  const items = errors.map((e) => `<li><a href="${target(e)}">${esc(stopError(e.code, l))}</a></li>`).join("");
  return `<div id="error-summary" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(SURVEY_COPY.errorsTitle, l))}</h3><ul>${items}</ul></div>`;
}

function fieldError(id: string, list: readonly string[]): string {
  return list.length === 0 ? "" : `<p id="${id}" class="error">${list.map(esc).join(" ")}</p>`;
}

function stopRow(st: SurveyStop, i: number, n: number, l: Locale): string {
  const label = placeLabel(st.placeName, st.address);
  const nameId = `survey-stop-name-${i}`;
  const buttons =
    (i > 0 ? button(upLabel(label, l), { "data-action": "survey-up", "data-value": String(i), class: "secondary" }) : "") +
    (i < n - 1 ? button(downLabel(label, l), { "data-action": "survey-down", "data-value": String(i), class: "secondary" }) : "") +
    button(removeLabel(label, l), { "data-action": "survey-remove", "data-value": String(i), class: "secondary" });
  const answered = st.keys.filter((k) => st.answers[k] !== undefined).length;
  return (
    `<li data-stop="${esc(st.id)}"><span id="${nameId}" data-user-content>${esc(label)}</span> · ${esc(questionsCount(st.keys.length, l))}` +
    (answered > 0 ? ` · ${esc(overallText(answered, st.keys.length, l))}` : "") +
    `<p>${buttons}</p></li>`
  );
}

function renderPlan(ctx: SurveyContext): string {
  const l = ctx.locale;
  const s = ctx.survey;
  const nameErrors = ctx.addErrors.filter((e) => e.field === "placeName" || e.field === "stops").map((e) => stopError(e.code, l));
  const addressErrors = ctx.addErrors.filter((e) => e.field === "address").map((e) => stopError(e.code, l));
  const dateErrors = ctx.startErrors.filter((e) => e.field === "observedOn").map((e) => stopError(e.code, l));
  const licenceErrors = ctx.startErrors.filter((e) => e.field === "licence").map((e) => stopError(e.code, l));
  const stopsErrors = ctx.startErrors.filter((e) => e.field === "stops").map((e) => stopError(e.code, l));
  const described = (hint: string | undefined, err: string, has: boolean): string => {
    const ids = [hint, has ? err : undefined].filter((x): x is string => x !== undefined);
    return (ids.length ? ` aria-describedby="${ids.join(" ")}"` : "") + (has ? ' aria-invalid="true"' : "");
  };

  const list =
    s.stops.length === 0
      ? `<p>${esc(t(SURVEY_COPY.noStops, l))}</p>`
      : `<ol class="survey-stops">${s.stops.map((st, i) => stopRow(st, i, s.stops.length, l)).join("")}</ol>`;

  const full = s.stops.length >= MAX_STOPS;
  const addForm =
    `<h3 id="survey-add-title">${esc(t(SURVEY_COPY.addTitle, l))}</h3>` +
    `<form id="survey-stop-form" novalidate aria-labelledby="survey-add-title">` +
    `<label for="s-name">${esc(fieldLabelText("placeName", l))}</label>${fieldError("e-s-name", nameErrors)}` +
    `<input id="s-name" name="placeName" type="text" autocomplete="off" maxlength="${LIMITS.placeName}" value="${esc(ctx.draftName)}" required${described(undefined, "e-s-name", nameErrors.length > 0)} ${INPUT_STYLE}>` +
    `<label for="s-address">${esc(fieldLabelText("address", l))}</label>${fieldError("e-s-address", addressErrors)}` +
    `<input id="s-address" name="address" type="text" autocomplete="off" maxlength="${LIMITS.address}" value="${esc(ctx.draftAddress)}"${described(undefined, "e-s-address", addressErrors.length > 0)} ${INPUT_STYLE}>` +
    `<p>${button(t(SURVEY_COPY.addButton, l), { type: "submit", "data-action": "survey-add" })}</p></form>`;

  const cands = full ? [] : candidates(ctx.places, s);
  const fromNotes =
    cands.length === 0
      ? ""
      : `<h3>${esc(t(SURVEY_COPY.fromNotesTitle, l))}</h3><p class="hint">${esc(t(SURVEY_COPY.fromNotesHint, l))}</p><ul class="survey-candidates">` +
        cands
          .map((p) => `<li>${button(addPlaceLabel(placeLabel(p.name, p.address ?? ""), openKeys(p).length, l), { "data-action": "survey-add-place", "data-value": p.id, class: "secondary" })}</li>`)
          .join("") +
        `</ul>`;

  const licenceOptions =
    `<option value=""${s.licence === "" ? " selected" : ""}>${esc(t(SURVEY_COPY.choose, l))}</option>` +
    OPEN_LICENCES.map((id) => `<option value="${esc(id)}"${s.licence === id ? " selected" : ""}>${esc(id)}</option>`).join("");
  const details =
    `<fieldset><legend>${esc(t(SURVEY_COPY.detailsLabel, l))}</legend>` +
    `<label for="s-date">${esc(t(SURVEY_COPY.dateLabel, l))}</label><p id="h-s-date" class="hint">${esc(t(SURVEY_COPY.dateHint, l))}</p>${fieldError("e-s-date", dateErrors)}` +
    `<input id="s-date" name="observedOn" type="text" inputmode="numeric" autocomplete="off" maxlength="10" value="${esc(s.observedOn)}" data-survey-field="observedOn"${described("h-s-date", "e-s-date", dateErrors.length > 0)} ${INPUT_STYLE}>` +
    `<label for="s-licence">${esc(t(SURVEY_COPY.licenceLabel, l))}</label><p id="h-s-licence" class="hint">${esc(t(SURVEY_COPY.licenceHint, l))}</p>${fieldError("e-s-licence", licenceErrors)}` +
    `<select id="s-licence" name="licence" data-survey-field="licence"${described("h-s-licence", "e-s-licence", licenceErrors.length > 0)} ${INPUT_STYLE}>${licenceOptions}</select>` +
    `</fieldset>`;

  const started = surveyProgress(s).done > 0;
  const actions =
    `<p>${button(t(started ? SURVEY_COPY.resume : SURVEY_COPY.start, l), { "data-action": "survey-start" })}` +
    `${button(t(SURVEY_COPY.toNotes, l), { "data-action": "view", "data-value": "notes", class: "secondary" })}</p>` +
    discardBlock(ctx);

  return (
    `<section lang="${l}" aria-labelledby="view-title" class="survey" data-phase="plan">` +
    `<h2 id="view-title">${esc(t(SURVEY_COPY.title, l))}</h2>` +
    `<p>${esc(t(SURVEY_COPY.intro, l))}</p><p class="notice">${esc(t(SURVEY_COPY.unknownNote, l))}</p><p class="hint">${esc(t(SURVEY_COPY.deviceNote, l))}</p>` +
    status(ctx) +
    startErrorSummary(ctx.startErrors, l) +
    `<h3 id="survey-stops" tabindex="-1">${esc(t(SURVEY_COPY.stopsTitle, l))}</h3>${fieldError("e-survey-stops", stopsErrors)}${list}` +
    (full ? `<p class="notice">${esc(stopError("full", l))}</p>` : addForm) +
    fromNotes +
    details +
    actions +
    `</section>`
  );
}

function discardBlock(ctx: SurveyContext): string {
  const l = ctx.locale;
  if (ctx.survey.stops.length === 0 && ctx.survey.licence === "") return "";
  if (!ctx.confirmDiscard) return `<p>${button(t(SURVEY_COPY.discard, l), { "data-action": "survey-discard", class: "secondary" })}</p>`;
  return (
    `<div role="group" aria-labelledby="survey-discard-q"><p id="survey-discard-q">${esc(t(SURVEY_COPY.confirmDiscard, l))}</p><p>` +
    button(t(SURVEY_COPY.yesDiscard, l), { "data-action": "survey-discard-confirm" }) +
    button(t(SURVEY_COPY.noDiscard, l), { "data-action": "survey-discard-cancel", class: "secondary" }) +
    `</p></div>`
  );
}

function renderAsk(ctx: SurveyContext): string {
  const l = ctx.locale;
  const s = ctx.survey;
  const c = currentQuestion(s);
  if (!c) return renderPlan(ctx);
  const prefix = stopHeading(c.stopIndex, s.stops.length, "", l).trimEnd();
  const so = c.stop.answers[c.key];
  const p = surveyProgress(s);
  const answers = ANSWERS.map((v) =>
    button(answerLabel(v, l), { "data-action": "survey-answer", "data-value": v, "aria-pressed": so === v ? "true" : "false", class: v === "unknown" ? "secondary" : "" }),
  ).join("");
  const nav = s.fromReview
    ? button(t(SURVEY_COPY.toReview, l), { "data-action": "survey-back", class: "secondary" })
    : button(t(SURVEY_COPY.previous, l), { "data-action": "survey-back", class: "secondary" }) +
      button(t(SURVEY_COPY.leave, l), { "data-action": "survey-leave", "aria-describedby": "survey-leave-hint", class: "secondary" });
  return (
    `<section lang="${l}" aria-labelledby="view-title" class="survey" data-phase="ask">` +
    `<h2 id="view-title">${esc(prefix)} <span data-user-content>${esc(c.stop.placeName)}</span></h2>` +
    (c.stop.address === "" ? "" : `<p data-user-content>${esc(c.stop.address)}</p>`) +
    `<p data-survey-count>${esc(questionOf(c.q, c.stop.keys.length, l))} · ${esc(overallText(p.done, p.total, l))}</p>` +
    `<progress max="${p.total}" value="${p.done}" aria-label="${esc(overallText(p.done, p.total, l))}"></progress>` +
    status(ctx) +
    `<h3 id="survey-question" data-key="${c.key}">${esc(t(COPY.facts[c.key], l))}</h3>` +
    `<p id="survey-question-text">${esc(t(QUESTIONS[c.key], l))}</p>` +
    (so === undefined ? "" : `<p data-survey-so-far>${esc(t(SURVEY_COPY.answerSoFar, l))}${l === "fr" ? NB : ""}: <strong>${esc(answerLabel(so, l))}</strong></p>`) +
    `<div role="group" class="survey-answers" aria-labelledby="survey-question" aria-describedby="survey-question-text">${answers}</div>` +
    `<p>${nav}</p>` +
    (s.fromReview ? "" : `<p id="survey-leave-hint" class="hint">${esc(t(SURVEY_COPY.leaveHint, l))}</p>`) +
    `<p>${button(t(SURVEY_COPY.toPlaces, l), { "data-action": "survey-plan", class: "secondary" })}</p>` +
    `</section>`
  );
}

/** A detail as it will be saved, with the provenance every Yes or No carries. */
export function surveyFact(s: Survey, st: SurveyStop, key: (typeof FACT_KEYS)[number]): Fact {
  const value = savedValue(st, key);
  return value === "unknown"
    ? { key, value, provenance: undefined }
    : { key, value, provenance: { source: CONTRIBUTOR_SOURCE, licence: s.licence, recordedOn: s.observedOn } };
}

function renderReview(ctx: SurveyContext): string {
  const l = ctx.locale;
  const s = ctx.survey;
  const savable = s.stops.filter(hasAnswer).length;
  const cards = s.stops
    .map((st, i) => {
      const label = placeLabel(st.placeName, st.address);
      const rows = FACT_KEYS.map((k) => {
        const f = describeFact(surveyFact(s, st, k), l, ctx.today);
        return `<dt>${esc(f.label)}</dt><dd><strong>${esc(f.value)}</strong> ${esc(f.detail)}</dd>`;
      }).join("");
      const changes = st.keys
        .map((k) => `<li>${button(surveyChangeLabel(t(COPY.facts[k], l), label, l), { "data-action": "survey-edit", "data-value": String(i), "data-key": k, class: "secondary" })}</li>`)
        .join("");
      return (
        `<li class="card" data-stop="${esc(st.id)}"><h3 id="survey-review-${i}" data-user-content>${esc(label)}</h3>` +
        `<p data-survey-will="${hasAnswer(st) ? "save" : "skip"}">${esc(t(hasAnswer(st) ? SURVEY_COPY.willSave : SURVEY_COPY.wontSave, l))}</p>` +
        `<dl class="facts">${rows}</dl><ul class="survey-changes">${changes}</ul></li>`
      );
    })
    .join("");
  const room = savable <= ctx.notesRoom;
  const save =
    savable === 0
      ? `<p class="notice">${esc(t(SURVEY_COPY.nothingToSave, l))}</p>`
      : !room
        ? `<p class="notice">${esc(t(SURVEY_COPY.notesFull, l))}</p>`
        : `<p>${button(saveLabel(savable, l), { "data-action": "survey-save" })}</p>`;
  return (
    `<section lang="${l}" aria-labelledby="view-title" class="survey" data-phase="review">` +
    `<h2 id="view-title">${esc(t(SURVEY_COPY.reviewTitle, l))}</h2><p>${esc(t(SURVEY_COPY.reviewIntro, l))}</p>` +
    status(ctx) +
    `<ul class="survey-review">${cards}</ul>` +
    save +
    `<p>${button(t(SURVEY_COPY.lastQuestion, l), { "data-action": "survey-back", class: "secondary" })}` +
    `${button(t(SURVEY_COPY.toPlaces, l), { "data-action": "survey-plan", class: "secondary" })}</p>` +
    discardBlock(ctx) +
    `</section>`
  );
}

export function renderSurvey(ctx: SurveyContext): string {
  switch (ctx.survey.phase) {
    case "ask":
      return renderAsk(ctx);
    case "review":
      return renderReview(ctx);
    case "plan":
      return renderPlan(ctx);
  }
}
