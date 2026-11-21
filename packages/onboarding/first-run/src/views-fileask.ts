import type { Locale } from "../../switch-first/src/index";
import { COPY, groupHeading, t } from "./copy";
import type { ImportError } from "./exchange";
import { FACT_KEYS, type FactKey } from "./facts";
import { ASK_ORDERS, ASK_REASONS, askCsv, byDetail, chosenKeys, type AskFile, type AskList, type AskOptions } from "./fileask";
import { FILE_ASK_COPY as C, askErrorText, askFilename, askSummaryText, detailHeading, questionHead, reasonText } from "./fileask-copy";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import { csvHref } from "./notes-csv";
import { downloadLink } from "./views-sources";

export interface FileAskContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  readonly file: AskFile | undefined;
  readonly options: AskOptions;
  readonly list: AskList | undefined;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const ASK_TEXT_ID = "fa-text";
export const ASK_OPEN_ID = "fa-open";
export const ASK_SEARCH_ID = "fa-search";
export const ASK_OLD_ID = "fa-old";

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

export function keyBoxId(key: FactKey): string {
  return `fa-key-${key}`;
}

export function orderRadioId(order: string): string {
  return `fa-order-${order}`;
}

/** The list as text to print, in the chosen order, with a line to write each answer. */
export function askText(list: AskList, l: Locale, today: Date, order: AskOptions["order"] = "place"): string {
  const lines: string[] = [t(C.textHeading, l), `${t(C.textMade, l)} ${today.toISOString().slice(0, 10)}`, t(C.privacy, l), ""];
  const questions = list.places.reduce((n, p) => n + p.questions.length, 0);
  lines.push(askSummaryText(list.places.length, questions, l), "");
  if (order === "detail") {
    for (const d of byDetail(list)) {
      lines.push(detailHeading(d.key, d.items.length, l));
      for (const { place, question } of d.items) {
        lines.push(`- ${place.name}${place.address ? `, ${place.address}` : ""} (${reasonText(question.reason, l)})`, `  ${question.text}`, `  ${t(C.answerLine, l)}`);
      }
      lines.push("");
    }
  } else {
    for (const p of list.places) {
      lines.push(p.place.name);
      if (p.place.address) lines.push(p.place.address);
      for (const q of p.questions) lines.push(`- ${questionHead(q.key, q.reason, l)}`, `  ${q.text}`, `  ${t(C.answerLine, l)}`);
      lines.push("");
    }
  }
  if (list.places.length === 0) lines.push(t(C.nothing, l), "");
  return `${lines.join("\n")}`;
}

export function renderAskOptions(ctx: FileAskContext): string {
  const l = ctx.locale;
  const keys = chosenKeys(ctx.options);
  const boxes = FACT_KEYS.map(
    (k) =>
      `<label class="choice" for="${keyBoxId(k)}" ${CHOICE_STYLE}><input type="checkbox" id="${keyBoxId(k)}" name="key" value="${k}"${keys.includes(k) ? " checked" : ""}>${esc(t(COPY.facts[k], l))}</label>`,
  ).join("");
  return (
    `<h3 id="fa-options">${esc(t(C.optionsTitle, l))}</h3>` +
    `<form id="fa-options-form" novalidate>` +
    `<fieldset><legend>${esc(t(C.detailsLegend, l))}</legend><p class="hint">${esc(t(C.detailsHint, l))}</p>${boxes}</fieldset>` +
    `<fieldset><legend>${esc(t(C.orderLegend, l))}</legend>` +
    ASK_ORDERS.map(
      (o) =>
        `<label class="choice" for="${orderRadioId(o)}" ${CHOICE_STYLE}><input type="radio" id="${orderRadioId(o)}" name="order" value="${o}"${ctx.options.order === o ? " checked" : ""}>${esc(t(C.orders[o], l))}</label>`,
    ).join("") +
    `</fieldset>` +
    `<p><label class="choice" for="${ASK_OLD_ID}" ${CHOICE_STYLE}><input type="checkbox" id="${ASK_OLD_ID}" name="old"${ctx.options.includeOld ? " checked" : ""}>${esc(t(C.includeOld, l))}</label></p>` +
    `<label for="${ASK_SEARCH_ID}">${esc(t(C.searchLabel, l))}</label>` +
    `<input id="${ASK_SEARCH_ID}" name="query" type="search" autocomplete="off" maxlength="120" value="${esc(ctx.options.query)}" ${FIELD_STYLE}>` +
    `<p>${button(t(C.update, l), { type: "submit", "data-action": "fa-update" })}</p>` +
    `</form>`
  );
}

export function renderAskList(list: AskList, ctx: FileAskContext): string {
  const l = ctx.locale;
  const questions = list.places.reduce((n, p) => n + p.questions.length, 0);
  const counts = ASK_REASONS.map((r) => `<tr data-reason="${r}"><th scope="row">${esc(reasonText(r, l))}</th><td>${list.counts[r]}</td></tr>`).join("");
  const table =
    `<div class="table-wrap" role="region" aria-labelledby="fa-counts-caption" tabindex="0"><table class="fa-counts">` +
    `<caption id="fa-counts-caption">${esc(t(C.countsCaption, l))}</caption>` +
    `<thead><tr><th scope="col">${esc(t(C.countsReason, l))}</th><th scope="col">${esc(t(C.countsNumber, l))}</th></tr></thead>` +
    `<tbody>${counts}<tr data-reason="none"><th scope="row">${esc(t(C.nothingCount, l))}</th><td>${list.nothingToAsk}</td></tr></tbody></table></div>`;
  const details = byDetail(list)
    .map(
      (d, i) =>
        `<li data-key="${d.key}"><h4 id="fa-detail-${i}">${esc(detailHeading(d.key, d.items.length, l))}</h4><p>${esc(d.items[0]?.question.text ?? "")}</p>` +
        `<ul>${d.items.map(({ place, question }) => `<li data-place="${esc(place.id)}" data-reason="${question.reason}"><span data-user-content>${esc(place.name)}</span>, <span data-user-content>${esc(place.address ?? t(COPY.similar.noAddress, l))}</span> (${esc(reasonText(question.reason, l))})</li>`).join("")}</ul></li>`,
    )
    .join("");
  const places = list.places
    .map(
      (p, i) =>
        `<li data-place="${esc(p.place.id)}"><h4 id="fa-place-${i}"><span data-user-content>${esc(p.place.name)}</span></h4>` +
        `<p><span data-user-content>${esc(p.place.address ?? t(COPY.similar.noAddress, l))}</span></p>` +
        `<ul>${p.questions.map((q) => `<li data-key="${q.key}" data-reason="${q.reason}"><strong>${esc(questionHead(q.key, q.reason, l))}</strong><br>${esc(q.text)}</li>`).join("")}</ul></li>`,
    )
    .join("");
  const downloads =
    list.places.length === 0
      ? ""
      : `<p>${downloadLink(askText(list, l, ctx.today, ctx.options.order), askFilename("text", ctx.today, l), l, C.downloadText)}</p>` +
        `<p><a class="linkbtn" download="${esc(askFilename("csv", ctx.today, l))}" href="${esc(csvHref(askCsv(list)))}" style="${LINK_STYLE}">${esc(t(C.downloadCsv, l))}</a></p>`;
  return (
    `<h3 id="fa-list" tabindex="-1">${esc(groupHeading(t(C.listTitle, l), list.places.length))}</h3>` +
    `<p id="fa-summary">${esc(askSummaryText(list.places.length, questions, l))}</p>` +
    table +
    downloads +
    (list.places.length === 0
      ? `<p>${esc(t(C.nothing, l))}</p>`
      : ctx.options.order === "detail"
        ? `<ul class="fa-details">${details}</ul>`
        : `<ul class="fa-places">${places}</ul>`)
  );
}

export function renderFileAsk(ctx: FileAskContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  return (
    `<div class="app fileask-app" lang="${l}"><section lang="${l}" aria-labelledby="fa-title" class="fileask">` +
    `<h2 id="fa-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fa-status">${esc(ctx.statusMessage)}</p>` : "") +
    (err
      ? `<div id="fa-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul><li><a href="#${ASK_TEXT_ID}">${esc(askErrorText(err, l))}</a></li></ul></div>`
      : "") +
    `<form id="fa-file-form" novalidate>` +
    `<label for="${ASK_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${ASK_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${ASK_TEXT_ID}" class="error">${esc(askErrorText(err, l))}</p>` : "") +
    `<textarea id="${ASK_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${ASK_TEXT_ID}${err ? ` e-${ASK_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${ASK_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${ASK_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "fa-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fa-clear", class: "secondary" })}</p>` +
    (ctx.file && ctx.list ? renderAskOptions(ctx) + renderAskList(ctx.list, ctx) : "") +
    `</section></div>`
  );
}
