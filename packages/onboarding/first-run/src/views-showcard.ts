import type { Locale } from "../../switch-first/src/index";
import { t } from "./copy";
import { button, esc } from "./html";
import type { Passport } from "./passport";
import { SHOW_COPY, SHOW_SIZES, SIZE_LABEL, bilingualFilename, bilingualText, showHtml, type ShowOptions } from "./showcard";
import { textExportHref } from "./textexport";

export interface ShowCardContext {
  /** The saved card, or undefined when there is none yet. */
  readonly passport: Passport | undefined;
  readonly options: ShowOptions;
  readonly locale: Locale;
}

const LINK_STYLE = "display:inline-flex;align-items:center;min-width:44px;min-height:44px";
const CHOICE_STYLE = "min-height:44px;min-width:44px";

export function renderShowCard(ctx: ShowCardContext): string {
  const l = ctx.locale;
  const o = ctx.options;
  const back = `<p>${button(t(SHOW_COPY.done, l), { "data-action": "view", "data-value": "passport", class: "secondary" })}</p>`;
  if (!ctx.passport) {
    return (
      `<section lang="${l}" aria-labelledby="view-title" class="showcard">` +
      `<h2 id="view-title">${esc(t(SHOW_COPY.title, l))}</h2>` +
      `<p>${esc(t(SHOW_COPY.nothing, l))}</p>` +
      back +
      `</section>`
    );
  }
  const sizes = SHOW_SIZES.map(
    (s) =>
      `<label class="choice" style="${CHOICE_STYLE}"><input type="radio" name="show-size" value="${s}" data-action="show-size" data-value="${s}"${o.size === s ? " checked" : ""}>${esc(t(SIZE_LABEL[s], l))}</label>`,
  ).join("");
  const toggle = (action: string, label: string, on: boolean): string =>
    `<label class="choice" style="${CHOICE_STYLE}"><input type="checkbox" data-action="${action}"${on ? " checked" : ""}>${esc(label)}</label>`;
  const controls =
    `<div class="no-print show-controls">` +
    `<p>${esc(t(SHOW_COPY.intro, l))}</p>` +
    `<fieldset><legend>${esc(t(SHOW_COPY.sizeLegend, l))}</legend>${sizes}</fieldset>` +
    `<p>${toggle("show-both", t(SHOW_COPY.both, l), o.both)}</p>` +
    `<p>${toggle("show-questions", t(SHOW_COPY.questions, l), o.questions)}</p>` +
    `</div>`;
  const download =
    `<p class="no-print"><a class="linkbtn" data-show-download download="${esc(bilingualFilename(l))}" href="${esc(textExportHref(bilingualText(ctx.passport, l)))}" style="${LINK_STYLE}">` +
    `${esc(t(SHOW_COPY.bilingualDownload, l))}</a></p>`;
  return (
    `<section lang="${l}" aria-labelledby="view-title" class="showcard">` +
    `<h2 id="view-title">${esc(t(SHOW_COPY.title, l))}</h2>` +
    controls +
    showHtml(ctx.passport, l, o) +
    download +
    back +
    `</section>`
  );
}
