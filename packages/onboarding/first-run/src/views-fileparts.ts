import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, NN, t } from "./copy";
import { exportHref, type ImportError } from "./exchange";
import { FACT_KEYS } from "./facts";
import {
  FILE_PARTS_COPY as C,
  detailLine,
  partFacts,
  partLabel,
  partProblemText,
  partsErrorText,
  partsFilename,
  partsText,
  placeRecorded,
  postalLine,
  streetsLine,
  reportSummary,
  countsText,
  moreText,
  topSources,
} from "./fileparts-copy";
import { placesExport, type StreetFile } from "./filestreets";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import { csvHref } from "./notes-csv";
import { MAX_PARTS, PART_TEXT_MAX, openPlaces, partNotesFile, partsCsv, partsReport, postalAreasIn, streetsIn, type PartProblem, type PartSummary } from "./partsummary";
import type { Place } from "./places";
import { sourceName } from "./sources";
import { textExportHref } from "./textexport";

export interface FilePartsContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  readonly file: StreetFile | undefined;
  /** The four boxes as typed. */
  readonly boxes: readonly string[];
  /** The texts of the comparison on screen; empty before the first comparison. */
  readonly applied: readonly string[];
  readonly problems: Readonly<Record<number, PartProblem>>;
  /** Show the comparison part by part, or detail by detail. */
  readonly view: PartsView;
  /** True when the person compared with every box empty. */
  readonly emptyError: boolean;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export type PartsView = "part" | "detail";
export const PARTS_VIEWS: readonly PartsView[] = ["part", "detail"];

export function isPartsView(s: string | null | undefined): s is PartsView {
  return s === "part" || s === "detail";
}

export function viewId(v: PartsView): string {
  return `fpt-view-${v}`;
}

export const PARTS_TEXT_ID = "fpt-text";
export const PARTS_OPEN_ID = "fpt-open";

const FIELD_STYLE = 'style="min-height:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

export function boxId(index: number): string {
  return `fpt-part-${index}`;
}

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

/** A part's heading: the text typed is the person's own words, so it is marked as such. */
function heading(s: PartSummary, l: Locale): string {
  const n = s.places.length;
  const count = l === "fr" ? `${n} ${n > 1 ? "lieux" : "lieu"}` : `${n} ${n === 1 ? "place" : "places"}`;
  if (s.text === undefined) return `${esc(t(C.restTitle, l))} (${esc(count)})`;
  const [open, close] = l === "fr" ? [`«${NN}`, `${NN}»`] : ["“", "”"];
  return `${open}<span data-user-content>${esc(s.text)}</span>${close} (${esc(count)})`;
}

function recordedAt(p: Place): number {
  return FACT_KEYS.filter((k) => p.resolutions[k].kind !== "unknown").length;
}

/** Who recorded the part's Yes and No; the sources' names are their own words. */
export function renderSources(s: PartSummary, l: Locale): string {
  if (s.sources.length === 0) return "";
  const { top, more } = topSources(s);
  const names = top.map((x) => `<span data-user-content>${esc(sourceName(x.source, l))}</span> (${x.records})`).join(", ");
  return `<p class="fpt-sources">${esc(t(C.recordedBy, l))}${l === "fr" ? NB : ""}: ${names}${esc(moreText(more, l))}</p>`;
}

/** The places of a part, each with how many details are recorded, behind a disclosure so a long part stays short. */
export function renderPlaces(s: PartSummary, l: Locale): string {
  const items = s.places
    .map(
      (p) =>
        `<li><span data-user-content>${esc(p.name)}</span>, <span data-user-content>${esc(p.address ?? "")}</span>${l === "fr" ? NB : ""}: ${esc(placeRecorded(recordedAt(p), FACT_KEYS.length, l))}</li>`,
    )
    .join("");
  return `<details><summary style="min-height:44px">${esc(`${t(C.placesTitle, l)} (${s.places.length})`)}</summary><ul class="fpt-places">${items}</ul></details>`;
}

export function renderPart(s: PartSummary, index: number, ctx: FilePartsContext): string {
  const l = ctx.locale;
  const id = s.text === undefined ? "fpt-rest" : `fpt-part-h-${index}`;
  if (s.places.length === 0) return `<li data-part="${index}"><h4 id="${id}">${heading(s, l)}</h4><p class="hint">${esc(t(C.restEmpty, l))}</p></li>`;
  const label = s.text === undefined ? t(C.restTitle, l) : partLabel(index, l);
  const open = openPlaces(s);
  return (
    `<li data-part="${index}"><h4 id="${id}">${heading(s, l)}</h4>` +
    `<p>${esc(partFacts(s, l))}</p>` +
    renderSources(s, l) +
    `<ul class="fpt-details">${FACT_KEYS.map((k) => `<li>${esc(detailLine(k, s.perDetail[k], l))}</li>`).join("")}</ul>` +
    renderPlaces(s, l) +
    `<p>${link(exportHref(partNotesFile(s, ctx.today)), partsFilename("notes", index, ctx.today, l), `${t(C.downloadNotes, l)} (${label})`)}</p>` +
    (open.length === 0 ? "" : `<p>${link(exportHref(placesExport(open, ctx.today)), partsFilename("open", index, ctx.today, l), `${t(C.downloadOpen, l)} (${label})`)}</p>`) +
    `</li>`
  );
}

export function renderPartsForm(ctx: FilePartsContext, file: StreetFile): string {
  const l = ctx.locale;
  const areas = postalAreasIn(file, l);
  const streets = streetsIn(file, l);
  const boxes = Array.from({ length: MAX_PARTS }, (_, i) => {
    const id = boxId(i);
    const p = ctx.problems[i];
    const err = p ? `<p id="e-${id}" class="error">${esc(partProblemText(p, l))}</p>` : "";
    return (
      `<label for="${id}">${esc(partLabel(i, l))}</label>${err}` +
      `<input id="${id}" name="part" type="text" autocomplete="off" maxlength="${PART_TEXT_MAX + 20}" value="${esc(ctx.boxes[i] ?? "")}"` +
      `${p ? ` aria-describedby="e-${id}" aria-invalid="true"` : ""} ${FIELD_STYLE}>`
    );
  }).join("");
  return (
    `<h3 id="fpt-parts">${esc(t(C.partsTitle, l))}</h3>` +
    `<p class="hint">${esc(t(C.postalTitle, l))}${l === "fr" ? NB : ""}: ${esc(areas.length === 0 ? t(C.postalNone, l) : postalLine(areas, l))}</p>` +
    (areas.length === 0 ? "" : `<p>${button(t(C.usePostal, l), { "data-action": "fpt-postal", class: "secondary" })}</p>`) +
    `<p class="hint">${esc(t(C.streetsTitle, l))}${l === "fr" ? NB : ""}: <span data-user-content>${esc(streets.length === 0 ? t(C.streetsNone, l) : streetsLine(streets, l))}</span></p>` +
    (streets.length === 0 ? "" : `<p>${button(t(C.useStreets, l), { "data-action": "fpt-streets", class: "secondary" })}</p>`) +
    `<form id="fpt-parts-form" novalidate><fieldset><legend>${esc(t(C.partsTitle, l))}</legend>` +
    `<p class="hint">${esc(t(C.partsHint, l))}</p>` +
    (ctx.emptyError ? `<p id="e-fpt-parts" class="error">${esc(partProblemText("empty", l))}</p>` : "") +
    `${boxes}</fieldset>` +
    `<fieldset><legend>${esc(t(C.viewLegend, l))}</legend>${PARTS_VIEWS.map(
      (v) =>
        `<label class="choice" for="${viewId(v)}" style="min-height:44px;min-width:44px"><input type="radio" id="${viewId(v)}" name="view" value="${v}"${ctx.view === v ? " checked" : ""}>${esc(t(C.views[v], l))}</label>`,
    ).join("")}</fieldset>` +
    `<p>${button(t(C.compare, l), { type: "submit", "data-action": "fpt-compare" })}</p></form>`
  );
}

/** Detail by detail: under each detail, every part's counts one after another, the rest of the file last. */
export function renderByDetail(parts: readonly PartSummary[], l: Locale): string {
  const items = FACT_KEYS.map((k, i) => {
    const lines = parts.map((s) => `<li>${heading(s, l)}${l === "fr" ? NB : ""}: ${esc(countsText(s.perDetail[k], l))}</li>`);
    return `<li><h4 id="fpt-detail-${i}">${esc(t(COPY.facts[k], l))}</h4><ul>${lines.join("")}</ul></li>`;
  }).join("");
  return `<ul class="fpt-by-detail">${items}</ul>`;
}

export function renderResults(ctx: FilePartsContext, file: StreetFile): string {
  if (ctx.applied.length === 0) return "";
  const l = ctx.locale;
  const r = partsReport(file, ctx.applied, ctx.today);
  return (
    `<h3 id="fpt-results" tabindex="-1">${esc(t(C.resultsTitle, l))}</h3>` +
    `<p id="fpt-summary">${esc(reportSummary(r, l))}</p><p class="hint">${esc(t(C.notRank, l))}</p>` +
    `<p>${link(csvHref(partsCsv(r, ctx.today)), partsFilename("csv", 0, ctx.today, l), t(C.downloadCsv, l))}</p>` +
    `<p>${link(textExportHref(partsText(r, l, ctx.today)), partsFilename("text", 0, ctx.today, l), t(C.downloadText, l))}</p>` +
    (ctx.view === "detail"
      ? renderByDetail([...r.parts, r.rest], l)
      : `<ul class="fpt-parts">${r.parts.map((s, i) => renderPart(s, i, ctx)).join("")}${renderPart(r.rest, r.parts.length, ctx)}</ul>`)
  );
}

export function renderFileParts(ctx: FilePartsContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  const errors = [
    ...(err ? [`<li><a href="#${PARTS_TEXT_ID}">${esc(partsErrorText(err, l))}</a></li>`] : []),
    ...(ctx.emptyError ? [`<li><a href="#${boxId(0)}">${esc(partProblemText("empty", l))}</a></li>`] : []),
    ...Object.entries(ctx.problems).map(([i, p]) => `<li><a href="#${boxId(Number(i))}">${esc(`${partLabel(Number(i), l)}${l === "fr" ? NB : ""}: ${partProblemText(p, l)}`)}</a></li>`),
  ];
  return (
    `<div class="app fileparts-app" lang="${l}"><section lang="${l}" aria-labelledby="fpt-title" class="fileparts">` +
    `<h2 id="fpt-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fpt-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="fpt-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="fpt-file-form" novalidate>` +
    `<label for="${PARTS_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${PARTS_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${PARTS_TEXT_ID}" class="error">${esc(partsErrorText(err, l))}</p>` : "") +
    `<textarea id="${PARTS_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${PARTS_TEXT_ID}${err ? ` e-${PARTS_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${PARTS_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${PARTS_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "fpt-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fpt-clear", class: "secondary" })}</p>` +
    (ctx.file ? renderPartsForm(ctx, ctx.file) + renderResults(ctx, ctx.file) : "") +
    `</section></div>`
  );
}

/** The four boxes on the page, or the fallback when the page has none. */
export function readBoxes(root: ParentNode, fallback: readonly string[]): string[] {
  const inputs = Array.from(root.querySelectorAll<HTMLInputElement>('input[name="part"]'));
  if (inputs.length === 0) return [...fallback];
  return Array.from({ length: MAX_PARTS }, (_, i) => inputs[i]?.value ?? "");
}

/** The view chosen on the page, or the fallback. */
export function readView(root: ParentNode, fallback: PartsView): PartsView {
  const v = root.querySelector<HTMLInputElement>('input[name="view"]:checked')?.value;
  return isPartsView(v) ? v : fallback;
}
