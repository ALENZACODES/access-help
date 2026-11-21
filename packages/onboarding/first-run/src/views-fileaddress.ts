import type { Locale } from "../../switch-first/src/index";
import {
  addressChanges,
  addressProblem,
  addressedFile,
  addressesCsv,
  applyAddresses,
  copyPlaces,
  readsStreet,
  type AddressProblem,
  type AddressReport,
  type AddressRow,
} from "./addressfill";
import { t } from "./copy";
import { exportHref, type ImportError } from "./exchange";
import {
  FILE_ADDRESS_COPY as C,
  addressErrorText,
  addressFilename,
  addressProblemText,
  addressSummary,
  addressesText,
  changeText,
  copySummary,
  placesLine,
  rowText,
  suggestionLabel,
} from "./fileaddress-copy";
import type { StreetFile } from "./filestreets";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import { csvHref } from "./notes-csv";
import { textExportHref } from "./textexport";

/** What a place's radio group holds: leave it, an offered address by its index ("s:0"), or the typed address. */
export type AddressPick = "keep" | "typed" | `s:${number}`;

export interface FileAddressContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  readonly file: StreetFile | undefined;
  readonly report: AddressReport | undefined;
  /** By row id; a row not here is left as it is. */
  readonly picks: ReadonlyMap<string, AddressPick>;
  /** Addresses typed, by row id, as typed. */
  readonly typed: ReadonlyMap<string, string>;
  /** Problems with typed addresses, by row id, shown when the copy is asked for. */
  readonly problems: ReadonlyMap<string, AddressProblem>;
  /** No place is given an address when the copy is asked for. */
  readonly noneError: boolean;
  /** The addresses the copy on screen was made with, by row id; undefined before one is made. */
  readonly made: ReadonlyMap<string, string> | undefined;
  /** Places with no postal code are listed too. */
  readonly postal: boolean;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const ADDRESS_TEXT_ID = "fad-text";
export const ADDRESS_OPEN_ID = "fad-open";
export const POSTAL_ID = "fad-postal";

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

export const groupName = (i: number): string => `fad-pick-${i}`;
export const keepId = (i: number): string => `fad-keep-${i}`;
export const suggestionId = (i: number, j: number): string => `fad-suggest-${i}-${j}`;
export const typedId = (i: number): string => `fad-typed-${i}`;
export const fieldId = (i: number): string => `fad-address-${i}`;

export function isAddressPick(s: string | undefined): s is AddressPick {
  return s === "keep" || s === "typed" || (s !== undefined && /^s:\d+$/.test(s));
}

/**
 * The address a pick gives a place: undefined to leave it, a problem when the
 * typed address has one. An offered address is only taken by its index among
 * the ones the App offered for this place.
 */
export function addressOf(row: AddressRow, pick: AddressPick | undefined, typed: string | undefined): { to: string } | { problem: AddressProblem } | undefined {
  if (pick === undefined || pick === "keep") return undefined;
  if (pick === "typed") {
    const p = addressProblem(typed ?? "");
    return p ? { problem: p } : { to: (typed ?? "").trim() };
  }
  const to = row.suggestions[Number(pick.slice(2))];
  return to === undefined ? undefined : { to };
}

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

function radio(id: string, name: string, value: string, checked: boolean, label: string, user = false): string {
  const text = user ? `<span data-user-content>${esc(label)}</span>` : esc(label);
  return `<label class="choice" for="${id}" ${CHOICE_STYLE}><input type="radio" id="${id}" name="${name}" value="${esc(value)}"${checked ? " checked" : ""}>${text}</label>`;
}

/** One place: what is missing, and what to do about it. */
export function renderRow(row: AddressRow, i: number, ctx: FileAddressContext): string {
  const l = ctx.locale;
  const pick = ctx.picks.get(row.id) ?? "keep";
  const problem = ctx.problems.get(row.id);
  const field = fieldId(i);
  const typed = ctx.typed.get(row.id) ?? "";
  // Warn while typing is still open: the address is allowed, but it will not place the place on a street.
  const warn = pick === "typed" && problem === undefined && typed.trim() !== "" && !readsStreet(typed);
  const describedBy = [`h-${field}`, ...(problem ? [`e-${field}`] : []), ...(warn ? [`w-${field}`] : [])].join(" ");
  const options =
    radio(keepId(i), groupName(i), "keep", pick === "keep", t(C.keep, l)) +
    row.suggestions.map((a, j) => radio(suggestionId(i, j), groupName(i), `s:${j}`, pick === `s:${j}`, suggestionLabel(a, row, l), true)).join("") +
    (row.suggestions.length === 0 ? `<p class="hint">${esc(t(C.noSuggestion, l))}</p>` : "") +
    radio(typedId(i), groupName(i), "typed", pick === "typed", t(C.typed, l)) +
    `<label for="${field}">${esc(`${t(C.typedLabel, l)} ${i + 1}`)}</label><p id="h-${field}" class="hint">${esc(t(C.typedHint, l))}</p>` +
    (problem ? `<p id="e-${field}" class="error">${esc(addressProblemText(problem, l))}</p>` : "") +
    (warn ? `<p id="w-${field}" class="hint">${esc(t(C.noStreetWarning, l))}</p>` : "") +
    `<input id="${field}" type="text" autocomplete="off" maxlength="${LIMITS.address + 40}" value="${esc(typed)}"` +
    ` aria-describedby="${describedBy}"${problem ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>`;
  return (
    `<li><h4 id="fad-place-${i}"><span data-user-content>${esc(rowText(row, l))}</span></h4>` +
    `<fieldset><legend>${esc(`${t(C.rowLegend, l)} ${i + 1}`)}</legend>${options}</fieldset></li>`
  );
}

export function renderCopy(file: StreetFile, r: AddressReport, made: ReadonlyMap<string, string>, ctx: FileAddressContext): string {
  const l = ctx.locale;
  const copy = applyAddresses(file, r, made);
  const changes = addressChanges(r, copy, file);
  return (
    `<h3 id="fad-copy" tabindex="-1">${esc(t(C.copyTitle, l))}</h3><p id="fad-copy-summary">${esc(copySummary(copy, l))}</p>` +
    `<p id="fad-copy-places">${esc(placesLine(file.places.length, copyPlaces(copy, l), l))}</p>` +
    (changes.length > 0
      ? `<h4 id="fad-changes">${esc(t(C.changesTitle, l))}</h4><ul class="fad-changes">${changes.map((c) => `<li><span data-user-content>${esc(changeText(c, l))}</span></li>`).join("")}</ul>`
      : "") +
    `<p>${link(exportHref(addressedFile(copy, ctx.today)), addressFilename("copy", ctx.today, l), t(C.downloadCopy, l))}</p>` +
    `<p class="hint">${esc(t(C.copyHint, l))}</p>`
  );
}

export function renderRows(ctx: FileAddressContext, file: StreetFile, r: AddressReport): string {
  const l = ctx.locale;
  const head = `<h3 id="fad-results" tabindex="-1">${esc(`${t(C.resultsTitle, l)} (${r.rows.length})`)}</h3><p id="fad-summary">${esc(addressSummary(r, l, ctx.postal))}</p>`;
  if (r.rows.length === 0) return `${head}<p id="fad-none">${esc(t(C.none, l))}</p>`;
  return (
    head +
    `<p>${link(csvHref(addressesCsv(r)), addressFilename("csv", ctx.today, l), t(C.downloadCsv, l))} ` +
    `${link(textExportHref(addressesText(r, ctx.today, l, ctx.postal)), addressFilename("text", ctx.today, l), t(C.downloadText, l))}</p>` +
    `<form id="fad-fix-form" novalidate><ol class="fad-rows">${r.rows.map((row, i) => renderRow(row, i, ctx)).join("")}</ol>` +
    `<p>${button(t(C.make, l), { type: "submit", "data-action": "fad-make" })}</p></form>` +
    (ctx.made === undefined ? "" : renderCopy(file, r, ctx.made, ctx))
  );
}

export function renderFileAddress(ctx: FileAddressContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  const rows = ctx.report?.rows ?? [];
  const errors = [
    ...(err ? [`<li><a href="#${ADDRESS_TEXT_ID}">${esc(addressErrorText(err, l))}</a></li>`] : []),
    ...(ctx.noneError ? [`<li><a href="#${keepId(0)}">${esc(t(C.noneChanged, l))}</a></li>`] : []),
    ...rows.flatMap((row, i) => {
      const p = ctx.problems.get(row.id);
      return p ? [`<li><a href="#${fieldId(i)}">${esc(`${t(C.typedLabel, l)} ${i + 1} — ${addressProblemText(p, l)}`)}</a></li>`] : [];
    }),
  ];
  return (
    `<div class="app fileaddress-app" lang="${l}"><section lang="${l}" aria-labelledby="fad-title" class="fileaddress">` +
    `<h2 id="fad-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.rule, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fad-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="fad-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="fad-file-form" novalidate>` +
    `<label for="${ADDRESS_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${ADDRESS_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${ADDRESS_TEXT_ID}" class="error">${esc(addressErrorText(err, l))}</p>` : "") +
    `<textarea id="${ADDRESS_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${ADDRESS_TEXT_ID}${err ? ` e-${ADDRESS_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${ADDRESS_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${ADDRESS_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<label class="choice" for="${POSTAL_ID}" ${CHOICE_STYLE}><input type="checkbox" id="${POSTAL_ID}" aria-describedby="h-${POSTAL_ID}"${ctx.postal ? " checked" : ""}>${esc(t(C.postalLabel, l))}</label>` +
    `<p id="h-${POSTAL_ID}" class="hint">${esc(t(C.postalHint, l))}</p>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "fad-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fad-clear", class: "secondary" })}</p>` +
    (ctx.file && ctx.report ? renderRows(ctx, ctx.file, ctx.report) : "") +
    `</section></div>`
  );
}

/** The pick and typed address of each place, as on the page. */
export function readAddressPicks(root: ParentNode, r: AddressReport): { picks: Map<string, AddressPick>; typed: Map<string, string> } {
  const picks = new Map<string, AddressPick>();
  const typed = new Map<string, string>();
  r.rows.forEach((row, i) => {
    const v = root.querySelector<HTMLInputElement>(`input[name="${groupName(i)}"]:checked`)?.value;
    if (isAddressPick(v) && v !== "keep") picks.set(row.id, v);
    const a = root.querySelector<HTMLInputElement>(`#${fieldId(i)}`)?.value ?? "";
    if (a !== "") typed.set(row.id, a);
  });
  return { picks, typed };
}
