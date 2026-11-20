import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, groupHeading, t } from "./copy";
import { coverageLabel } from "./coverage";
import { FACT_KEYS } from "./facts";
import {
  DETAIL_STATUSES,
  SIDES,
  filesAgree,
  placesToShow,
  type DetailComparison,
  type FileComparison,
  type FileError,
  type OnePlace,
  type PlaceComparison,
  type Side,
} from "./filecompare";
import {
  FILE_COMPARE_COPY as C,
  compareFilename,
  fileErrorText,
  otherAddressText,
  otherNameText,
  placeCaption,
  sharedText,
  sideName,
  statusText,
} from "./filecompare-copy";
import { comparisonText } from "./filecompare-text";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import type { Place, Resolution } from "./places";
import { tierLabel } from "./tier";
import { reasonText } from "./views-similar";
import { downloadLink } from "./views-sources";
import { resolutionBody } from "./views-places";

export interface FileCompareContext {
  readonly textA: string;
  readonly textB: string;
  readonly errors: readonly FileError[];
  /** Undefined until the two files have been compared. */
  readonly comparison: FileComparison | undefined;
  readonly onlyDiffering: boolean;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

/** Field ids, one pair per file. */
export const TEXT_ID: Readonly<Record<Side, string>> = { a: "fc-text-a", b: "fc-text-b" };
export const OPEN_ID: Readonly<Record<Side, string>> = { a: "fc-open-a", b: "fc-open-b" };
export const FILTER_ID = "fc-only-differing";

const INPUT_STYLE = 'style="min-height:44px"';

function errorsFor(errors: readonly FileError[], side: Side): FileError[] {
  return errors.filter((e) => e.side === side);
}

export function renderFileErrors(errors: readonly FileError[], l: Locale): string {
  if (errors.length === 0) return "";
  const items = errors.map((e) => `<li><a href="#${TEXT_ID[e.side]}">${esc(fileErrorText(e.side, e.code, l))}</a></li>`).join("");
  return `<div id="fc-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${items}</ul></div>`;
}

function fileFields(side: Side, value: string, ctx: FileCompareContext): string {
  const l = ctx.locale;
  const id = TEXT_ID[side];
  const errs = errorsFor(ctx.errors, side);
  const errorText = errs.length === 0 ? "" : `<p id="e-${id}" class="error">${errs.map((e) => esc(fileErrorText(e.side, e.code, l))).join(" ")}</p>`;
  const describedBy = [`h-${id}`, errs.length > 0 ? `e-${id}` : undefined].filter((x): x is string => x !== undefined).join(" ");
  return (
    `<fieldset data-file="${side}"><legend>${esc(sideName(side, l))}</legend>` +
    `<label for="${id}">${esc(t(side === "a" ? C.pasteA : C.pasteB, l))}</label>` +
    `<p id="h-${id}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    errorText +
    `<textarea id="${id}" name="text-${side}" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="${describedBy}"${errs.length > 0 ? ' aria-invalid="true"' : ""} ${INPUT_STYLE}>${esc(value)}</textarea>` +
    `<label for="${OPEN_ID[side]}">${esc(t(side === "a" ? C.openA : C.openB, l))}</label>` +
    `<input id="${OPEN_ID[side]}" type="file" accept=".json,application/json,text/plain" data-side="${side}" ${INPUT_STYLE}>` +
    `</fieldset>`
  );
}

function region(captionId: string, table: string): string {
  return `<div class="table-wrap" role="region" aria-labelledby="${captionId}" tabindex="0">${table}</div>`;
}

export function renderGlance(c: FileComparison, l: Locale): string {
  const rows: Array<[string, number, number]> = [
    [t(C.notesRow, l), c.summaryA.notes, c.summaryB.notes],
    [t(C.placesRow, l), c.summaryA.places, c.summaryB.places],
    [t(C.recordsRow, l), c.summaryA.records, c.summaryB.records],
    [t(C.rejectedRow, l), c.summaryA.rejected, c.summaryB.rejected],
  ];
  const body = rows.map(([label, a, b]) => `<tr><th scope="row">${esc(label)}</th><td data-col="a">${a}</td><td data-col="b">${b}</td></tr>`).join("");
  return region(
    "fc-glance-caption",
    `<table class="fc-glance"><caption id="fc-glance-caption">${esc(t(C.glanceCaption, l))}</caption>` +
      `<thead><tr><th scope="col">${esc(t(C.glanceWhat, l))}</th><th scope="col">${esc(sideName("a", l))}</th><th scope="col">${esc(sideName("b", l))}</th></tr></thead>` +
      `<tbody>${body}</tbody></table>`,
  );
}

export function renderTotals(c: FileComparison, l: Locale): string {
  const body = DETAIL_STATUSES.map((s) => `<tr data-status="${s}"><th scope="row">${esc(statusText(s, l))}</th><td data-col="count">${c.totals[s]}</td></tr>`).join("");
  return region(
    "fc-totals-caption",
    `<table class="fc-totals"><caption id="fc-totals-caption">${esc(t(C.totalsCaption, l))}</caption>` +
      `<thead><tr><th scope="col">${esc(t(C.totalsWhat, l))}</th><th scope="col">${esc(t(C.totalsCount, l))}</th></tr></thead>` +
      `<tbody>${body}</tbody></table>`,
  );
}

/** One file's cell: the App's own detail text (value, source, licence, date), then the record tier. */
export function sideCell(d: DetailComparison, side: Side, p: Place, l: Locale, today: Date): string {
  const r: Resolution = p.resolutions[d.key];
  const tier = r.kind === "unknown" ? "" : ` <span class="tier">${esc(tierLabel(l))}.</span>`;
  return `<td data-side="${side}">${resolutionBody(d.key, r, l, today)}${tier}</td>`;
}

function detailRow(d: DetailComparison, a: Place, b: Place, l: Locale, today: Date): string {
  const shared = d.shared > 0 ? `<br><span class="hint">${esc(sharedText(d.shared, l))}</span>` : "";
  return (
    `<tr data-key="${d.key}" data-status="${d.status}">` +
    `<th scope="row">${esc(t(COPY.facts[d.key], l))}<br><span class="fc-status">${esc(statusText(d.status, l))}</span>${shared}</th>` +
    sideCell(d, "a", a, l, today) +
    sideCell(d, "b", b, l, today) +
    `</tr>`
  );
}

export function renderPlaceComparison(p: PlaceComparison, index: number, l: Locale, today: Date): string {
  const cap = `fc-cap-${index}`;
  const notes: string[] = [];
  if (p.nameB !== p.nameA) notes.push(`<p data-user-content>${esc(otherNameText("b", p.nameB, l))}</p>`);
  if (p.addressB !== p.addressA) notes.push(`<p data-user-content>${esc(otherAddressText("b", p.addressB, l))}</p>`);
  const address = p.addressA ?? t(COPY.similar.noAddress, l);
  return (
    `<div class="fc-place" data-place="${esc(p.id)}" data-differs="${p.differs}">` +
    `<h4 id="fc-place-${index}"><span data-user-content>${esc(p.nameA)}</span></h4>` +
    `<p><span data-user-content>${esc(address)}</span>. <strong>${esc(t(p.differs ? C.differsMark : C.sameMark, l))}</strong></p>` +
    notes.join("") +
    region(
      cap,
      `<table class="compare"><caption id="${cap}"><span data-user-content>${esc(placeCaption(p.nameA, l))}</span></caption>` +
        `<thead><tr><th scope="col">${esc(t(C.detailColumn, l))}</th><th scope="col">${esc(sideName("a", l))}</th><th scope="col">${esc(sideName("b", l))}</th></tr></thead>` +
        `<tbody>${p.details.map((d) => detailRow(d, p.a, p.b, l, today)).join("")}</tbody></table>`,
    ) +
    `</div>`
  );
}

function renderOnly(list: readonly OnePlace[], side: Side, l: Locale): string {
  const id = `fc-only-${side}`;
  const title = groupHeading(t(side === "a" ? C.onlyATitle : C.onlyBTitle, l), list.length);
  if (list.length === 0) return `<h3 id="${id}">${esc(title)}</h3><p>${esc(t(C.noneOnly, l))}</p>`;
  const items = list
    .map(
      (o) =>
        `<li data-place="${esc(o.place.id)}"><span data-user-content>${esc(o.place.name)}</span>, <span data-user-content>${esc(o.place.address ?? t(COPY.similar.noAddress, l))}</span>. ` +
        `${esc(coverageLabel(o.recorded, FACT_KEYS.length, l))}</li>`,
    )
    .join("");
  return `<h3 id="${id}">${esc(title)}</h3><ul class="fc-only" data-side="${side}">${items}</ul>`;
}

function renderMaybeSame(c: FileComparison, l: Locale): string {
  if (c.maybeSame.length === 0) return "";
  const colon = l === "fr" ? `${NB}:` : ":";
  const items = c.maybeSame
    .map(
      (m) =>
        `<li data-reason="${m.reason}">${esc(sideName("a", l))}${colon} <span data-user-content>${esc(m.a.name)}</span>. ` +
        `${esc(sideName("b", l))}${colon} <span data-user-content>${esc(m.b.name)}</span>. ${esc(reasonText(m.reason, l))}</li>`,
    )
    .join("");
  return `<h3 id="fc-maybe-same">${esc(groupHeading(t(C.maybeSameTitle, l), c.maybeSame.length))}</h3><p class="hint">${esc(t(C.maybeSameIntro, l))}</p><ul class="fc-maybe">${items}</ul>`;
}

function renderBoth(c: FileComparison, ctx: FileCompareContext): string {
  const l = ctx.locale;
  const shown = placesToShow(c, ctx.onlyDiffering);
  const filter =
    c.both.length === 0
      ? ""
      : `<p><label class="choice" style="min-height:44px;min-width:44px"><input type="checkbox" id="${FILTER_ID}" data-action="fc-filter"${ctx.onlyDiffering ? " checked" : ""}>${esc(t(C.onlyDiffering, l))}</label></p>`;
  const empty = c.both.length === 0 ? t(C.noneInBoth, l) : shown.length === 0 ? t(C.noneDiffer, l) : undefined;
  const list = shown.map((p, i) => renderPlaceComparison(p, i, l, ctx.today)).join("");
  return (
    `<h3 id="fc-both">${esc(groupHeading(t(C.bothTitle, l), c.both.length))}</h3>` +
    filter +
    (empty === undefined ? `<div id="fc-both-list">${list}</div>` : `<p id="fc-both-list">${esc(empty)}</p>`)
  );
}

/** The results part of the page. */
export function renderResults(c: FileComparison, ctx: FileCompareContext): string {
  const l = ctx.locale;
  return (
    `<h3 id="fc-results" tabindex="-1">${esc(t(C.resultsTitle, l))}</h3>` +
    renderGlance(c, l) +
    renderTotals(c, l) +
    (filesAgree(c) ? `<p class="notice">${esc(t(C.agree, l))}</p>` : "") +
    `<p class="hint">${esc(t(C.notRanked, l))}</p>` +
    `<p>${downloadLink(comparisonText(c, l, ctx.today), compareFilename(ctx.today, l), l, C.download)}</p>` +
    renderBoth(c, ctx) +
    renderOnly(c.onlyA, "a", l) +
    renderOnly(c.onlyB, "b", l) +
    renderMaybeSame(c, l)
  );
}

export function renderFileCompare(ctx: FileCompareContext): string {
  const l = ctx.locale;
  const status = ctx.statusMessage ? `<p class="notice" id="fc-status">${esc(ctx.statusMessage)}</p>` : "";
  return (
    `<div class="app filecompare-app" lang="${l}"><section lang="${l}" aria-labelledby="fc-title" class="filecompare">` +
    `<h2 id="fc-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    status +
    renderFileErrors(ctx.errors, l) +
    `<form id="fc-form" novalidate>` +
    SIDES.map((s) => fileFields(s, s === "a" ? ctx.textA : ctx.textB, ctx)).join("") +
    `<p>${button(t(C.compare, l), { type: "submit", "data-action": "fc-compare" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fc-clear", class: "secondary" })}</p>` +
    (ctx.comparison ? renderResults(ctx.comparison, ctx) : "") +
    `</section></div>`
  );
}
