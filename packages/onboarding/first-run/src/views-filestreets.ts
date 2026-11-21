import type { Locale } from "../../switch-first/src/index";
import { NB, t, type Pair } from "./copy";
import { exportHref, type ImportError } from "./exchange";
import { GROUP_BYS, batchPlaces, groupFile, listsCsv, placesExport, shareGroups, type Batch, type GroupBy, type ListGroup, type ListOptions, type StreetFile } from "./filestreets";
import {
  FILE_STREETS_COPY as C,
  allSheets,
  batchHeading,
  batchName,
  batchSections,
  groupHeading,
  groupLinkText,
  groupsTitle,
  leftOutDoneText,
  sortedText,
  streetsErrorText,
  streetsFilename,
  ungroupedTitle,
  visitSheet,
} from "./filestreets-copy";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import { csvHref } from "./notes-csv";
import type { Place } from "./places";
import { textExportHref } from "./textexport";

export interface FileStreetsContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  readonly file: StreetFile | undefined;
  readonly options: ListOptions;
  /** The number of people as typed, kept when it is not valid. */
  readonly peopleText: string;
  readonly peopleError: boolean;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const STREETS_TEXT_ID = "fst-text";
export const STREETS_OPEN_ID = "fst-open";
export const PEOPLE_ID = "fst-people";
export const BOTH_SIDES_ID = "fst-both-sides";
export const ONLY_OPEN_ID = "fst-only-open";

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

export function byRadioId(by: GroupBy): string {
  return `fst-by-${by}`;
}

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

/** The two downloads for one group or list: its notes and its visit sheet, each named for it. */
function groupLinks(groupName: string, index: number, places: readonly Place[], sheet: string, ctx: FileStreetsContext): string {
  const l = ctx.locale;
  return (
    `<p>${link(exportHref(placesExport(places, ctx.today)), streetsFilename("notes", index, ctx.today, l), groupLinkText(C.downloadNotes as Pair, groupName, l))}` +
    `${link(textExportHref(sheet), streetsFilename("sheet", index, ctx.today, l), groupLinkText(C.downloadSheet as Pair, groupName, l))}</p>`
  );
}

function placeItems(places: readonly Place[], l: Locale): string {
  return places
    .map((p) => `<li data-place="${esc(p.id)}"><span data-user-content>${esc(p.name)}</span>, <span data-user-content>${esc(p.address ?? t(C.noAddress, l))}</span></li>`)
    .join("");
}

export function renderGroup(g: ListGroup, index: number, ctx: FileStreetsContext): string {
  const l = ctx.locale;
  const heading = groupHeading(g, l);
  return (
    `<li data-group="${esc(g.key)}"><h4 id="fst-group-${index}"><span data-user-content>${esc(heading)}</span></h4>` +
    `<ol>${placeItems(g.places, l)}</ol>` +
    groupLinks(g.name, index, g.places, visitSheet(heading, [{ name: g.name, places: g.places }], l, ctx.today), ctx) +
    `</li>`
  );
}

export function renderUngrouped(places: readonly Place[], by: GroupBy, index: number, ctx: FileStreetsContext): string {
  const l = ctx.locale;
  if (places.length === 0) return "";
  const title = ungroupedTitle(by, l);
  return (
    `<h3 id="fst-ungrouped">${esc(`${title} (${places.length})`)}</h3><p class="hint">${esc(t(C.ungroupedHint[by], l))}</p>` +
    `<ul class="fst-ungrouped">${placeItems(places, l)}</ul>` +
    groupLinks(title, index, places, visitSheet(title, [{ name: title, places }], l, ctx.today), ctx)
  );
}

export function renderBatch(b: Batch, by: GroupBy, ctx: FileStreetsContext): string {
  const l = ctx.locale;
  const heading = batchHeading(b, l);
  const places = batchPlaces(b);
  const sections = batchSections(b, by, l).filter((s) => s.places.length > 0);
  const body =
    places.length === 0
      ? ""
      : sections.map((s) => `<p><strong><span data-user-content>${esc(s.name)}</span></strong></p><ol>${placeItems(s.places, l)}</ol>`).join("") +
        groupLinks(batchName(b, l), b.index, places, visitSheet(heading, sections, l, ctx.today), ctx);
  return `<li data-batch="${b.index}"><h4 id="fst-batch-${b.index}">${esc(heading)}</h4>${body}</li>`;
}

export function renderOptions(ctx: FileStreetsContext): string {
  const l = ctx.locale;
  const o = ctx.options;
  const radios = GROUP_BYS.map(
    (by) =>
      `<label class="choice" for="${byRadioId(by)}" ${CHOICE_STYLE}><input type="radio" id="${byRadioId(by)}" name="by" value="${by}"${o.by === by ? " checked" : ""}>${esc(t(C.byOptions[by], l))}</label>`,
  ).join("");
  const peopleErr = ctx.peopleError ? `<p id="e-${PEOPLE_ID}" class="error">${esc(t(C.badPeople, l))}</p>` : "";
  return (
    `<h3 id="fst-options">${esc(t(C.optionsTitle, l))}</h3>` +
    `<form id="fst-options-form" novalidate>` +
    `<fieldset><legend>${esc(t(C.byLegend, l))}</legend>${radios}</fieldset>` +
    `<p><label class="choice" for="${BOTH_SIDES_ID}" ${CHOICE_STYLE}><input type="checkbox" id="${BOTH_SIDES_ID}" name="both-sides"${o.bothSides ? " checked" : ""}>${esc(t(C.bothSides, l))}</label></p>` +
    `<p><label class="choice" for="${ONLY_OPEN_ID}" ${CHOICE_STYLE}><input type="checkbox" id="${ONLY_OPEN_ID}" name="only-open"${o.onlyOpen ? " checked" : ""}>${esc(t(C.onlyOpen, l))}</label></p>` +
    `<label for="${PEOPLE_ID}">${esc(t(C.peopleLabel, l))}</label><p id="h-${PEOPLE_ID}" class="hint">${esc(t(C.peopleHint, l))}</p>${peopleErr}` +
    `<input id="${PEOPLE_ID}" name="people" type="text" inputmode="numeric" autocomplete="off" maxlength="2" value="${esc(ctx.peopleText)}" aria-describedby="h-${PEOPLE_ID}${ctx.peopleError ? ` e-${PEOPLE_ID}` : ""}"${ctx.peopleError ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>` +
    `<p>${button(t(C.share, l), { type: "submit", "data-action": "fst-share" })}</p></form>`
  );
}

export function renderStreetsResults(ctx: FileStreetsContext, file: StreetFile): string {
  const l = ctx.locale;
  const o = ctx.options;
  const grouped = groupFile(file, o, l);
  const batches = shareGroups(grouped, o.people);
  const downloads =
    `<p>${link(textExportHref(allSheets(batches, o.by, l, ctx.today)), streetsFilename("all", 0, ctx.today, l), t(C.downloadAll, l))}</p>` +
    `<p>${link(csvHref(listsCsv(batches, ungroupedTitle(o.by, l))), streetsFilename("csv", 0, ctx.today, l), t(C.downloadCsv, l))}</p>`;
  const lists =
    o.people <= 1
      ? `<h3 id="fst-lists" tabindex="-1">${esc(`${groupsTitle(o.by, l)} (${grouped.groups.length})`)}</h3>` +
        (grouped.groups.length === 0 ? "" : `<ul class="fst-groups">${grouped.groups.map((g, i) => renderGroup(g, i, ctx)).join("")}</ul>`) +
        renderUngrouped(grouped.ungrouped, o.by, grouped.groups.length, ctx)
      : `<h3 id="fst-lists" tabindex="-1">${esc(`${t(C.batchesTitle, l)} (${batches.length})`)}</h3><ul class="fst-batches">${batches.map((b) => renderBatch(b, o.by, ctx)).join("")}</ul>`;
  const shown = file.places.length - grouped.leftOutDone;
  return (
    `<p id="fst-summary" tabindex="-1">${esc(sortedText(shown, grouped.groups.length, grouped.ungrouped.length, l, o.by))}` +
    (grouped.leftOutDone > 0 ? ` ${esc(leftOutDoneText(grouped.leftOutDone, l))}` : "") +
    `</p>` +
    renderOptions(ctx) +
    downloads +
    lists
  );
}

export function renderFileStreets(ctx: FileStreetsContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  const errors = [
    ...(err ? [`<li><a href="#${STREETS_TEXT_ID}">${esc(streetsErrorText(err, l))}</a></li>`] : []),
    ...(ctx.peopleError ? [`<li><a href="#${PEOPLE_ID}">${esc(t(C.badPeople, l))}</a></li>`] : []),
  ];
  return (
    `<div class="app filestreets-app" lang="${l}"><section lang="${l}" aria-labelledby="fst-title" class="filestreets">` +
    `<h2 id="fst-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fst-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="fst-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="fst-file-form" novalidate>` +
    `<label for="${STREETS_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${STREETS_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${STREETS_TEXT_ID}" class="error">${esc(streetsErrorText(err, l))}</p>` : "") +
    `<textarea id="${STREETS_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${STREETS_TEXT_ID}${err ? ` e-${STREETS_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${STREETS_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${STREETS_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "fst-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fst-clear", class: "secondary" })}</p>` +
    (ctx.file ? renderStreetsResults(ctx, ctx.file) : "") +
    `</section></div>`
  );
}

/** Reads the number of people as typed: a whole number from 1 to 20, or undefined. */
export function peopleFrom(text: string): number | undefined {
  const s = text.trim();
  if (!/^\d{1,2}$/.test(s)) return undefined;
  const n = Number(s);
  return n >= 1 && n <= 20 ? n : undefined;
}

/** "Person 1: 3, Person 2: 2" for the status message: places in each list. */
export function sharedText(batches: readonly Batch[], l: Locale): string {
  const k = l === "fr" ? `${NB}:` : ":";
  return batches.map((b) => `${batchName(b, l)}${k} ${b.size}`).join(", ");
}

export function isGroupBy(s: string | undefined | null): s is GroupBy {
  return s === "street" || s === "postal";
}
