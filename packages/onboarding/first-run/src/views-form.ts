import type { Locale } from "../../switch-first/src/index";
import { COPY, t } from "./copy";
import { FACT_KEYS, OPEN_LICENCES, type Tri } from "./facts";
import {
  errorMessage,
  fieldLabelText,
  type FieldError,
  type FieldId,
  type FormValues,
} from "./form";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import { SURVEY_COPY } from "./survey-copy";
import { STATEMENT_COPY } from "./statement-copy";

const TRI: readonly Tri[] = ["yes", "no", "unknown"];
const INPUT_STYLE = 'style="min-height:44px"';

function errorsFor(errors: readonly FieldError[], field: FieldId): FieldError[] {
  return errors.filter((e) => e.field === field);
}

function describedBy(field: FieldId, hint: boolean, errors: readonly FieldError[]): string {
  const ids: string[] = [];
  if (hint) ids.push(`h-${field}`);
  if (errorsFor(errors, field).length > 0) ids.push(`e-${field}`);
  return ids.length ? ` aria-describedby="${ids.join(" ")}"` : "";
}

function errorBlock(field: FieldId, errors: readonly FieldError[], locale: Locale): string {
  const list = errorsFor(errors, field);
  if (list.length === 0) return "";
  return `<p id="e-${field}" class="error">${list.map((e) => esc(errorMessage(e, locale))).join(" ")}</p>`;
}

function invalid(field: FieldId, errors: readonly FieldError[]): string {
  return errorsFor(errors, field).length > 0 ? ' aria-invalid="true"' : "";
}

function textField(
  field: "placeName" | "address" | "observedOn",
  v: FormValues,
  errors: readonly FieldError[],
  locale: Locale,
  extra = "",
): string {
  const max = field === "placeName" ? LIMITS.placeName : field === "address" ? LIMITS.address : 10;
  return (
    `<label for="f-${field}">${esc(fieldLabelText(field, locale))}</label>` +
    errorBlock(field, errors, locale) +
    `<input id="f-${field}" name="${field}" type="text" autocomplete="off" maxlength="${max}" value="${esc(v[field])}"${invalid(field, errors)}${describedBy(field, false, errors)}${extra} ${INPUT_STYLE}>`
  );
}

export function renderErrorSummary(errors: readonly FieldError[], locale: Locale): string {
  if (errors.length === 0) return "";
  const items = errors
    .map((e) => `<li><a href="#${e.field === "details" ? "f-details" : `f-${e.field}`}">${esc(errorMessage(e, locale))}</a></li>`)
    .join("");
  return (
    `<div id="error-summary" class="error-summary" role="alert" tabindex="-1">` +
    `<h3>${esc(t(COPY.form.summaryTitle, locale))}</h3><ul>${items}</ul></div>`
  );
}

export function renderForm(
  v: FormValues,
  errors: readonly FieldError[],
  locale: Locale,
  restored: boolean,
): string {
  const l = locale;
  const detailGroups = FACT_KEYS.map((k) => {
    const radios = TRI.map(
      (tri) =>
        `<label class="choice" style="min-height:44px;min-width:44px"><input type="radio" name="detail-${k}" value="${tri}"${v.details[k] === tri ? " checked" : ""}>${esc(t(COPY.values[tri], l))}</label>`,
    ).join("");
    return `<fieldset><legend>${esc(t(COPY.facts[k], l))}</legend>${radios}</fieldset>`;
  }).join("");

  const licenceOptions =
    `<option value=""${v.licence === "" ? " selected" : ""}>${esc(t(COPY.form.choose, l))}</option>` +
    OPEN_LICENCES.map((id) => `<option value="${esc(id)}"${v.licence === id ? " selected" : ""}>${esc(id)}</option>`).join("");

  return (
    `<section lang="${l}" aria-labelledby="view-title">` +
    `<h2 id="view-title">${esc(t(COPY.form.title, l))}</h2>` +
    `<p>${esc(t(COPY.form.intro, l))}</p>` +
    `<p class="hint">${esc(t(SURVEY_COPY.formHint, l))} ${button(t(SURVEY_COPY.open, l), { "data-action": "survey-open", class: "secondary" })}</p>` +
    `<p class="hint">${esc(t(STATEMENT_COPY.formHint, l))} ${button(t(STATEMENT_COPY.open, l), { "data-action": "open-statement", class: "secondary" })}</p>` +
    (restored ? `<p class="notice" role="status">${esc(t(COPY.form.restored, l))}</p>` : "") +
    renderErrorSummary(errors, l) +
    `<form id="note-form" novalidate>` +
    textField("placeName", v, errors, l, " required") +
    textField("address", v, errors, l) +
    `<fieldset id="f-details" tabindex="-1"${describedBy("details", true, errors)}>` +
    `<legend>${esc(fieldLabelText("details", l))}</legend>` +
    `<p id="h-details" class="hint">${esc(t(COPY.form.sourceNote, l))}</p>${errorBlock("details", errors, l)}${detailGroups}</fieldset>` +
    textField("observedOn", v, errors, l) +
    `<label for="f-licence">${esc(fieldLabelText("licence", l))}</label>` +
    `<p id="h-licence" class="hint">${esc(t(COPY.form.licenceHint, l))}</p>${errorBlock("licence", errors, l)}` +
    `<select id="f-licence" name="licence" required${invalid("licence", errors)}${describedBy("licence", true, errors)} ${INPUT_STYLE}>${licenceOptions}</select>` +
    `<label for="f-note">${esc(fieldLabelText("note", l))}</label>` +
    `<p id="h-note" class="hint">${esc(t(COPY.form.noteHint, l))}</p>${errorBlock("note", errors, l)}` +
    `<textarea id="f-note" name="note" rows="4" maxlength="${LIMITS.note}"${invalid("note", errors)}${describedBy("note", true, errors)} ${INPUT_STYLE}>${esc(v.note)}</textarea>` +
    `<p>${button(t(COPY.form.submit, l), { type: "submit", "data-action": "submit-form" })}` +
    `${button(t(COPY.form.cancel, l), { "data-action": "cancel-form", class: "secondary" })}</p>` +
    `</form></section>`
  );
}
