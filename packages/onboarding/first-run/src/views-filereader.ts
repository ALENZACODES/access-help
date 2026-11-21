import type { Locale } from "../../switch-first/src/index";
import { COPY, t } from "./copy";
import type { ImportError } from "./exchange";
import { FACT_KEYS, type FactKey } from "./facts";
import { PAGE_SIZE, hasMustHaves, shownPlaces, viewPages, type GroupPage, type ReaderFile, type ReaderView } from "./filereader";
import {
  FILE_READER_COPY as C,
  detailsButtonText,
  fileSummaryText,
  groupTitle,
  pageButtonText,
  pageText,
  readerErrorText,
  readerFilename,
} from "./filereader-copy";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import type { Place } from "./places";
import { shortlistToText } from "./textexport";
import { tierLabel } from "./tier";
import { downloadLink } from "./views-sources";
import { renderResolutionList } from "./views-places";

export interface FileReaderContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  readonly file: ReaderFile | undefined;
  readonly view: ReaderView;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const READER_TEXT_ID = "fr-text";
export const READER_OPEN_ID = "fr-open";
export const SEARCH_ID = "fr-search";

const FIELD_STYLE = 'style="min-height:44px"';

export function mustHaveId(key: FactKey): string {
  return `fr-must-${key}`;
}

export function placeDetailsId(index: number): string {
  return `fr-place-details-${index}`;
}

export function renderFind(ctx: FileReaderContext): string {
  const l = ctx.locale;
  const selects = FACT_KEYS.map((k) => {
    const v = ctx.view.req[k] ?? "";
    const opt = (value: string, label: string): string => `<option value="${value}"${v === value ? " selected" : ""}>${esc(label)}</option>`;
    return (
      `<label for="${mustHaveId(k)}">${esc(t(COPY.facts[k], l))}</label>` +
      `<select id="${mustHaveId(k)}" name="must-${k}" ${FIELD_STYLE}>${opt("", t(C.noMustHave, l))}${opt("yes", t(C.mustYes, l))}${opt("no", t(C.mustNo, l))}</select>`
    );
  }).join("");
  return (
    `<h3 id="fr-find">${esc(t(C.findTitle, l))}</h3>` +
    `<form id="fr-find-form" novalidate>` +
    `<label for="${SEARCH_ID}">${esc(t(C.searchLabel, l))}</label><p id="h-${SEARCH_ID}" class="hint">${esc(t(C.searchHint, l))}</p>` +
    `<input id="${SEARCH_ID}" name="query" type="search" autocomplete="off" maxlength="120" aria-describedby="h-${SEARCH_ID}" value="${esc(ctx.view.query)}" ${FIELD_STYLE}>` +
    `<fieldset><legend>${esc(t(C.findTitle, l))}</legend><p class="hint">${esc(t(C.mustHaveHint, l))}</p>${selects}</fieldset>` +
    `<p>${button(t(C.show, l), { type: "submit", "data-action": "fr-show" })}${button(t(C.resetFind, l), { "data-action": "fr-reset", class: "secondary" })}</p>` +
    `</form>`
  );
}

/** One place: name, address, and a button that shows its details in the App's own wording (value, source, licence, date). */
export function renderPlace(p: Place, index: number, open: boolean, l: Locale, today: Date): string {
  const details = placeDetailsId(index);
  return (
    `<li data-place="${esc(p.id)}"><h4 id="fr-place-${index}"><span data-user-content>${esc(p.name)}</span></h4>` +
    `<p><span data-user-content>${esc(p.address ?? t(COPY.similar.noAddress, l))}</span></p>` +
    `<p>${button(detailsButtonText(open, p.name, l), { "data-action": "fr-toggle", "data-value": p.id, "aria-expanded": String(open), "aria-controls": details })}</p>` +
    `<div id="${details}"${open ? "" : " hidden"}>${open ? `${renderResolutionList(p, l, today)}<p class="hint">${esc(tierLabel(l))}.</p>` : ""}</div>` +
    `</li>`
  );
}

export function renderGroup(g: GroupPage, ctx: FileReaderContext, offset: number): string {
  const l = ctx.locale;
  const title = groupTitle(g.group, hasMustHaves(ctx.view.req), l);
  const head = `<h3 id="fr-group-${g.group}" tabindex="-1">${esc(`${title} (${g.total})`)}</h3>`;
  if (g.total === 0) return `${head}<p>${esc(t(C.noPlaces, l))}</p>`;
  const from = g.page * PAGE_SIZE + 1;
  const to = from + g.places.length - 1;
  const open = new Set(ctx.view.open);
  const items = g.places.map((p, i) => renderPlace(p, offset + i, open.has(p.id), l, ctx.today)).join("");
  const paging =
    g.pageCount <= 1
      ? ""
      : `<p>${g.page > 0 ? button(pageButtonText("previous", title, l), { "data-action": "fr-page", "data-group": g.group, "data-value": String(g.page - 1), class: "secondary" }) : ""}` +
        `${g.page < g.pageCount - 1 ? button(pageButtonText("next", title, l), { "data-action": "fr-page", "data-group": g.group, "data-value": String(g.page + 1), class: "secondary" }) : ""}</p>`;
  return `${head}<p>${esc(pageText(g.page, g.pageCount, from, to, g.total, l))}</p><ul class="fr-places" data-group="${g.group}">${items}</ul>${paging}`;
}

export function renderReaderResults(ctx: FileReaderContext, file: ReaderFile): string {
  const l = ctx.locale;
  const pages = viewPages(file, ctx.view);
  const shown = hasMustHaves(ctx.view.req) ? pages : pages.slice(0, 1);
  let offset = 0;
  const groups = shown
    .map((g) => {
      const html = renderGroup(g, ctx, offset);
      offset += g.places.length;
      return html;
    })
    .join("");
  const places = shownPlaces(file, ctx.view);
  return (
    `<p id="fr-summary" tabindex="-1">${esc(fileSummaryText(file.places.length, file.notes.length, file.leftOut, l))}` +
    (file.exportedOn ? ` ${esc(`${t(C.exported, l)} ${file.exportedOn}.`)}` : "") +
    `</p>` +
    renderFind(ctx) +
    `<p class="hint">${esc(t(C.notRanked, l))}</p>` +
    (places.length > 0 ? `<p>${downloadLink(shortlistToText(places, l, ctx.today), readerFilename(ctx.today, l), l, C.download)}</p>` : "") +
    groups
  );
}

export function renderFileReader(ctx: FileReaderContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  return (
    `<div class="app filereader-app" lang="${l}"><section lang="${l}" aria-labelledby="fr-title" class="filereader">` +
    `<h2 id="fr-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fr-status">${esc(ctx.statusMessage)}</p>` : "") +
    (err
      ? `<div id="fr-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul><li><a href="#${READER_TEXT_ID}">${esc(readerErrorText(err, l))}</a></li></ul></div>`
      : "") +
    `<form id="fr-file-form" novalidate>` +
    `<label for="${READER_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${READER_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${READER_TEXT_ID}" class="error">${esc(readerErrorText(err, l))}</p>` : "") +
    `<textarea id="${READER_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${READER_TEXT_ID}${err ? ` e-${READER_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${READER_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${READER_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "fr-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fr-clear", class: "secondary" })}</p>` +
    (ctx.file ? renderReaderResults(ctx, ctx.file) : "") +
    `</section></div>`
  );
}
