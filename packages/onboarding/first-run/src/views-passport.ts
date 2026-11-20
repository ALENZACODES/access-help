import type { Locale } from "../../switch-first/src/index";
import { setLabel, type NeedSet } from "./needsets";
import { COPY, t } from "./copy";
import { FACT_KEYS } from "./facts";
import { button, esc, namedButton } from "./html";
import {
  DEVICE_COPY,
  DEVICE_KINDS,
  MAX_HELPS,
  PASSPORT_COPY,
  PASSPORT_ERRORS,
  SIZE_COPY,
  SIZE_KEYS,
  SIZE_RANGE,
  passportFilename,
  passportHtml,
  passportText,
  type Passport,
  type PassportError,
  type SizeKey,
} from "./passport";
import { SHOW_COPY } from "./showcard";
import { textExportHref } from "./textexport";

export interface PassportContext {
  /** What is in the form now. */
  readonly draft: Passport;
  /** True once a card has been saved on this device. */
  readonly saved: boolean;
  readonly errors: readonly PassportError[];
  readonly locale: Locale;
  /** True when the person has must-haves to copy from. */
  readonly hasMustHaves: boolean;
  readonly statusMessage: string | undefined;
  /** Saved sets of must-haves, each offered as the needs to copy. */
  readonly sets?: readonly NeedSet[];
}

const LINK_STYLE = "display:inline-flex;align-items:center;min-width:44px;min-height:44px";
const FIELD_ID: Readonly<Record<PassportError["field"], string>> = { width: "pp-width", length: "pp-length", seatHeight: "pp-seatHeight", helps: "pp-helps", card: "pp-device" };

function errorsFor(errors: readonly PassportError[], field: PassportError["field"], l: Locale): string {
  const list = errors.filter((e) => e.field === field);
  return list.length === 0 ? "" : `<p id="e-${FIELD_ID[field]}" class="error">${list.map((e) => esc(t(PASSPORT_ERRORS[e.code], l))).join(" ")}</p>`;
}

function sizeInput(k: SizeKey, ctx: PassportContext): string {
  const l = ctx.locale;
  const id = FIELD_ID[k];
  const bad = ctx.errors.some((e) => e.field === k);
  const [lo, hi] = SIZE_RANGE[k];
  const range = l === "fr" ? `de ${lo} à ${hi}` : `${lo} to ${hi}`;
  return (
    `<label for="${id}">${esc(`${t(SIZE_COPY[k], l)} (${range})`)}</label>${errorsFor(ctx.errors, k, l)}` +
    `<input id="${id}" name="${k}" type="text" inputmode="numeric" autocomplete="off" maxlength="3" value="${esc(ctx.draft.sizes[k])}"` +
    ` aria-describedby="pp-sizes-hint${bad ? ` e-${id}` : ""}"${bad ? ' aria-invalid="true"' : ""} style="min-height:44px">`
  );
}

export function renderPassportErrors(errors: readonly PassportError[], l: Locale): string {
  if (errors.length === 0) return "";
  const items = errors.map((e) => `<li><a href="#${FIELD_ID[e.field]}">${esc(t(PASSPORT_ERRORS[e.code], l))}</a></li>`).join("");
  return `<div id="error-summary" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(PASSPORT_COPY.errorsTitle, l))}</h3><ul>${items}</ul></div>`;
}

export function renderPassport(ctx: PassportContext): string {
  const l = ctx.locale;
  const d = ctx.draft;
  const status = ctx.statusMessage ? `<p class="notice" role="status">${esc(ctx.statusMessage)}</p>` : "";
  const radio = (value: string, label: string): string =>
    `<label class="choice" style="min-height:44px;min-width:44px"><input type="radio" name="device" value="${value}"${d.device === value ? " checked" : ""}${value === "" ? ' id="pp-device"' : ""}>${esc(label)}</label>`;
  const devices = radio("", t(PASSPORT_COPY.deviceNone, l)) + DEVICE_KINDS.map((k) => radio(k, t(DEVICE_COPY[k], l))).join("");
  const needs = FACT_KEYS.map(
    (k) =>
      `<label class="choice" style="min-height:44px;min-width:44px"><input type="checkbox" name="need" value="${k}"${d.needs.includes(k) ? " checked" : ""}>${esc(t(COPY.facts[k], l))}</label>`,
  ).join("");
  const helpsBad = ctx.errors.some((e) => e.field === "helps");
  const form =
    `<form id="passport-form" novalidate class="no-print">` +
    errorsFor(ctx.errors, "card", l) +
    `<fieldset><legend>${esc(t(PASSPORT_COPY.deviceLegend, l))}</legend>${devices}</fieldset>` +
    `<fieldset><legend>${esc(t(PASSPORT_COPY.sizesLegend, l))}</legend><p id="pp-sizes-hint" class="hint">${esc(t(PASSPORT_COPY.sizesHint, l))}</p>` +
    SIZE_KEYS.map((k) => sizeInput(k, ctx)).join("") +
    `</fieldset>` +
    `<fieldset><legend>${esc(t(PASSPORT_COPY.needsLegend, l))}</legend>${needs}` +
    (ctx.hasMustHaves ? `<p>${button(t(PASSPORT_COPY.fromMustHaves, l), { "data-action": "passport-musthaves", class: "secondary" })}</p>` : "") +
    ((ctx.sets ?? []).length > 0
      ? `<p>${(ctx.sets ?? []).map((s) => namedButton(setLabel("card", s, l), s.name, { "data-action": "passport-set", "data-value": s.id, class: "secondary" })).join("")}</p>`
      : "") +
    `</fieldset>` +
    `<label for="pp-helps">${esc(t(PASSPORT_COPY.helpsLabel, l))}</label><p id="pp-helps-hint" class="hint">${esc(t(PASSPORT_COPY.helpsHint, l))}</p>${errorsFor(ctx.errors, "helps", l)}` +
    `<textarea id="pp-helps" name="helps" rows="3" maxlength="${MAX_HELPS + 50}" aria-describedby="pp-helps-hint${helpsBad ? " e-pp-helps" : ""}"${helpsBad ? ' aria-invalid="true"' : ""} style="min-height:44px">${esc(d.helps)}</textarea>` +
    `<p>${button(t(PASSPORT_COPY.save, l), { type: "submit", "data-action": "passport-save" })}</p>` +
    `</form>`;
  const keep = ctx.saved
    ? `<p class="no-print">${button(t(PASSPORT_COPY.print, l), { "data-action": "card-print", class: "secondary" })}` +
      button(t(SHOW_COPY.open, l), { "data-action": "view", "data-value": "showcard" }) +
      `<a class="linkbtn" data-passport-download download="${esc(passportFilename(l))}" href="${esc(textExportHref(passportText(d, l)))}" style="${LINK_STYLE}">${esc(t(PASSPORT_COPY.download, l))}</a></p>`
    : "";
  return (
    `<section lang="${l}" aria-labelledby="view-title" class="passport">` +
    `<h2 id="view-title">${esc(t(PASSPORT_COPY.title, l))}</h2>` +
    `<div class="no-print"><p>${esc(t(PASSPORT_COPY.intro, l))}</p><p class="hint">${esc(t(PASSPORT_COPY.privacy, l))}</p>${status}${renderPassportErrors(ctx.errors, l)}</div>` +
    form +
    `<h3 id="pp-preview" class="no-print">${esc(t(PASSPORT_COPY.previewTitle, l))}</h3>` +
    passportHtml(d, l, 4) +
    keep +
    `<p class="no-print">${button(t(PASSPORT_COPY.back, l), { "data-action": "view", "data-value": "notes", class: "secondary" })}</p>` +
    `</section>`
  );
}
