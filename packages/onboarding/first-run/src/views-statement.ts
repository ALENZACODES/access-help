import type { Locale } from "../../switch-first/src/index";
import { COPY, t } from "./copy";
import { OPEN_LICENCES, type FactKey, type Tri } from "./facts";
import { fieldLabelText } from "./form";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import { MAX_TEXT, mixed, type Finding, type Mention, type StatementError, type StatementField, type StatementForm } from "./statement";
import { CUE_COPY, STATEMENT_COPY, findingHeading, moreSentencesText, quote, statementError } from "./statement-copy";
import { CHECK_COPY, renderKnown, renderNotesSay, statementFilename, statementText } from "./statement-check";
import type { Place } from "./places";
import { downloadLink } from "./views-sources";

export interface StatementContext {
  readonly form: StatementForm;
  /** Undefined until the person asks the App to read the text. */
  readonly findings: readonly Finding[] | undefined;
  readonly errors: readonly StatementError[];
  readonly locale: Locale;
  readonly statusMessage: string | undefined;
  /** The same place in the person's notes, if it is there. */
  readonly known?: Place | undefined;
}

const INPUT_STYLE = 'style="min-height:44px"';
const TRI: readonly Tri[] = ["yes", "no", "unknown"];

/** The id of the field each error points at. */
export const FIELD_ID: Readonly<Record<StatementField, string>> = {
  placeName: "st-name",
  address: "st-address",
  text: "st-text",
  pageUrl: "st-url",
  details: "st-findings",
  observedOn: "st-date",
  licence: "st-licence",
  note: "st-url",
};

function errorsFor(errors: readonly StatementError[], field: StatementField): StatementError[] {
  return errors.filter((e) => e.field === field);
}

function errorText(field: StatementField, errors: readonly StatementError[], l: Locale): string {
  const list = errorsFor(errors, field);
  return list.length === 0 ? "" : `<p id="e-${FIELD_ID[field]}" class="error">${list.map((e) => esc(statementError(e.code, l))).join(" ")}</p>`;
}

function described(field: StatementField, hint: boolean, errors: readonly StatementError[]): string {
  const id = FIELD_ID[field];
  const has = errorsFor(errors, field).length > 0;
  const ids = [hint ? `h-${id}` : undefined, has ? `e-${id}` : undefined].filter((x): x is string => x !== undefined);
  return (ids.length > 0 ? ` aria-describedby="${ids.join(" ")}"` : "") + (has ? ' aria-invalid="true"' : "");
}

function textInput(field: "placeName" | "address" | "pageUrl" | "observedOn", label: string, value: string, max: number, ctx: StatementContext, hint?: string): string {
  const id = FIELD_ID[field];
  return (
    `<label for="${id}">${esc(label)}</label>` +
    (hint ? `<p id="h-${id}" class="hint">${esc(hint)}</p>` : "") +
    errorText(field, ctx.errors, ctx.locale) +
    `<input id="${id}" name="${field}" type="text" autocomplete="off" maxlength="${max}" value="${esc(value)}"${field === "placeName" ? " required" : ""}${described(field, hint !== undefined, ctx.errors)} ${INPUT_STYLE}>`
  );
}

export function renderStatementErrors(errors: readonly StatementError[], l: Locale): string {
  if (errors.length === 0) return "";
  const items = errors.map((e) => `<li><a href="#${FIELD_ID[e.field]}">${esc(statementError(e.code, l))}</a></li>`).join("");
  return `<div id="error-summary" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(STATEMENT_COPY.errorsTitle, l))}</h3><ul>${items}</ul></div>`;
}

/** One sentence, quoted, with the matched words marked. The sentence is the place's own text. */
export function renderMention(m: Mention, l: Locale): string {
  const marked = `${esc(m.sentence.slice(0, m.start))}<mark>${esc(m.sentence.slice(m.start, m.end))}</mark>${esc(m.sentence.slice(m.end))}`;
  const q = quote("\u0000", l).split("\u0000");
  return (
    `<li data-cue="${m.cue}"><span class="cue">${esc(t(CUE_COPY[m.cue], l))}</span>${l === "fr" ? "\u00A0" : ""}: ` +
    `${esc(q[0] ?? "")}<span data-user-content lang="">${marked}</span>${esc(q[1] ?? "")}</li>`
  );
}

function answerGroup(key: FactKey, value: Tri, l: Locale): string {
  const detail = t(COPY.facts[key], l);
  const radios = TRI.map(
    (v) =>
      `<label class="choice" style="min-height:44px;min-width:44px"><input type="radio" name="answer-${key}" value="${v}"${value === v ? " checked" : ""}>` +
      `${esc(v === "unknown" ? t(STATEMENT_COPY.unknownChoice, l) : t(COPY.values[v], l))}</label>`,
  ).join("");
  return `<fieldset data-answer="${key}"><legend>${esc(t(STATEMENT_COPY.yourAnswer, l))}${l === "fr" ? "\u00A0" : ""}: ${esc(detail)}</legend>${radios}</fieldset>`;
}

function renderFinding(f: Finding, value: Tri, l: Locale, known: Place | undefined): string {
  const detail = t(COPY.facts[f.key], l);
  const list =
    f.mentions.length === 0
      ? `<p>${esc(t(STATEMENT_COPY.noneFound, l))}</p>`
      : (mixed(f) ? `<p class="notice">${esc(t(STATEMENT_COPY.mixed, l))}</p>` : "") +
        `<ul class="mentions">${f.mentions.map((m) => renderMention(m, l)).join("")}</ul>` +
        (f.more > 0 ? `<p class="hint">${esc(moreSentencesText(f.more, l))}</p>` : "");
  const notes = renderNotesSay(known, f, l);
  return (
    `<div class="finding" data-finding="${f.key}"><h4 id="st-finding-${f.key}">${esc(findingHeading(detail, f.mentions.length + f.more, l))}</h4>` +
    list +
    notes +
    answerGroup(f.key, value, l) +
    `</div>`
  );
}

export function renderStatement(ctx: StatementContext): string {
  const l = ctx.locale;
  const f = ctx.form;
  const status = ctx.statusMessage ? `<p class="notice" role="status">${esc(ctx.statusMessage)}</p>` : "";
  const textErrors = errorText("text", ctx.errors, l);
  const reply = f.from === "reply";
  const reading =
    `<label for="st-text">${esc(t(reply ? STATEMENT_COPY.replyTextLabel : STATEMENT_COPY.textLabel, l))}</label><p id="h-st-text" class="hint">${esc(t(STATEMENT_COPY.textHint, l))}</p>${textErrors}` +
    `<textarea id="st-text" name="text" rows="10" maxlength="${MAX_TEXT}"${described("text", true, ctx.errors)} ${INPUT_STYLE}>${esc(f.text)}</textarea>` +
    `<p>${button(t(STATEMENT_COPY.read, l), { "data-action": "statement-read" })}</p>`;

  const findings =
    ctx.findings === undefined
      ? ""
      : `<h3 id="st-findings" tabindex="-1">${esc(t(STATEMENT_COPY.findingsTitle, l))}</h3>` +
        renderKnown(ctx.known, l) +
        errorText("details", ctx.errors, l) +
        ctx.findings.map((x) => renderFinding(x, f.answers[x.key], l, ctx.known)).join("") +
        `<p>${downloadLink(statementText(f, ctx.findings, l), statementFilename(f.observedOn, l), l, CHECK_COPY.download)}</p>` +
        `<fieldset><legend>${esc(t(STATEMENT_COPY.detailsTitle, l))}</legend>` +
        textInput("observedOn", t(STATEMENT_COPY.dateLabel, l), f.observedOn, 10, ctx) +
        `<label for="st-licence">${esc(t(STATEMENT_COPY.licenceLabel, l))}</label><p id="h-st-licence" class="hint">${esc(t(STATEMENT_COPY.licenceHint, l))}</p>` +
        errorText("licence", ctx.errors, l) +
        `<select id="st-licence" name="licence"${described("licence", true, ctx.errors)} ${INPUT_STYLE}>` +
        `<option value=""${f.licence === "" ? " selected" : ""}>${esc(t(STATEMENT_COPY.choose, l))}</option>` +
        OPEN_LICENCES.map((id) => `<option value="${esc(id)}"${f.licence === id ? " selected" : ""}>${esc(id)}</option>`).join("") +
        `</select></fieldset>` +
        `<p>${button(t(STATEMENT_COPY.save, l), { type: "submit", "data-action": "statement-save" })}</p>`;

  return (
    `<div class="app statement-app" lang="${l}"><section lang="${l}" aria-labelledby="st-title" class="statement">` +
    `<h2 id="st-title" tabindex="-1">${esc(t(reply ? STATEMENT_COPY.replyTitle : STATEMENT_COPY.title, l))}</h2>` +
    `<p>${esc(t(reply ? STATEMENT_COPY.replyIntro : STATEMENT_COPY.intro, l))}</p><p class="notice">${esc(t(STATEMENT_COPY.honest, l))}</p><p class="hint">${esc(t(STATEMENT_COPY.privacy, l))}</p>` +
    status +
    renderStatementErrors(ctx.errors, l) +
    `<form id="statement-form" novalidate>` +
    textInput("placeName", fieldLabelText("placeName", l), f.placeName, LIMITS.placeName, ctx) +
    textInput("address", fieldLabelText("address", l), f.address, LIMITS.address, ctx) +
    // A reply has no web address of its own.
    (reply ? "" : textInput("pageUrl", t(STATEMENT_COPY.urlLabel, l), f.pageUrl, 300, ctx, t(STATEMENT_COPY.urlHint, l))) +
    reading +
    findings +
    `</form>` +
    `<p>${button(t(STATEMENT_COPY.startOver, l), { "data-action": "statement-clear", class: "secondary" })}</p>` +
    `</section></div>`
  );
}
