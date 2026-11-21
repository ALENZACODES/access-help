import type { Locale } from "../../switch-first/src/index";
import { NB, t } from "./copy";
import {
  ISSUE_KINDS,
  addressCsv,
  applyFixes,
  checkAddresses,
  fixedFile,
  type AddressIssue,
  type AddressReport,
  type Fixes,
  type IssueKind,
  type NameGroup,
  type StreetSpellings,
} from "./addresscheck";
import { exportHref, type ImportError } from "./exchange";
import { FILE_ADDRESS_COPY as C, addressErrorText, addressFilename, addressText, copySummary, formsText, kindHint, kindTitle, reportSummary, suggestionText } from "./fileaddress-copy";
import type { StreetFile } from "./filestreets";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import { csvHref } from "./notes-csv";
import { textExportHref } from "./textexport";

export interface FileAddressContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  readonly file: StreetFile | undefined;
  /** The fixes ticked or picked on the page. */
  readonly picked: Fixes;
  /** The fixes the copy on screen has. */
  readonly applied: Fixes;
  readonly copyMade: boolean;
  /** True when the person asked for a copy with no fix chosen. */
  readonly noneError: boolean;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const ADDRESS_TEXT_ID = "fad-text";
export const ADDRESS_OPEN_ID = "fad-open";

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

export function postalId(index: number): string {
  return `fad-postal-${index}`;
}

export function nameId(group: number, choice: number): string {
  return `fad-name-${group}-${choice}`;
}

export function streetId(index: number): string {
  return `fad-street-${index}`;
}

/** Where the "choose a fix" problem sends focus: the first fix offered. */
export function firstFixId(r: AddressReport): string | undefined {
  const i = r.issues.findIndex((x) => x.suggestion !== undefined);
  if (i >= 0) return postalId(i);
  if (r.streets.length > 0) return streetId(0);
  return r.names.length > 0 ? nameId(0, 0) : undefined;
}

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

function placeText(i: AddressIssue, l: Locale): string {
  return `<span data-user-content>${esc(i.place.name)}</span>, <span data-user-content>${esc(i.place.address ?? t(C.noAddress, l))}</span>`;
}

/** One issue: the place, what was found and, when there is one, the fix to tick. */
export function renderIssue(i: AddressIssue, index: number, ctx: FileAddressContext): string {
  const l = ctx.locale;
  if (i.suggestion === undefined) {
    const found = i.found === undefined ? "" : `<br><span class="hint">${esc(t(C.kinds[i.kind].title, l))}${l === "fr" ? NB : ""}: <span data-user-content>${esc(i.found)}</span></span>`;
    return `<li>${placeText(i, l)}${found}</li>`;
  }
  const id = postalId(index);
  const checked = ctx.picked.postal.includes(i.place.id);
  return (
    `<li>${placeText(i, l)}<br>` +
    `<label class="choice" for="${id}" ${CHOICE_STYLE}><input type="checkbox" id="${id}" name="postal" value="${esc(i.place.id)}"${checked ? " checked" : ""}>` +
    `${esc(t(C.fixPostal, l))} <span data-user-content>${esc(suggestionText(i))}</span></label></li>`
  );
}

function renderKind(k: IssueKind, r: AddressReport, ctx: FileAddressContext): string {
  const l = ctx.locale;
  const items = r.issues.map((i, index) => ({ i, index })).filter((x) => x.i.kind === k);
  if (items.length === 0) return "";
  return (
    `<h3 id="fad-${k}">${esc(`${kindTitle(k, l)} (${items.length})`)}</h3><p class="hint">${esc(kindHint(k, l))}</p>` +
    `<ul class="fad-${k}">${items.map((x) => renderIssue(x.i, x.index, ctx)).join("")}</ul>`
  );
}

/** Each street written more than one way, with a choice of how to write it in the copy. */
export function renderStreets(streets: readonly StreetSpellings[], picks: Readonly<Record<string, string>>, l: Locale): string {
  if (streets.length === 0) return "";
  const groups = streets
    .map((s, i) => {
      const id = streetId(i);
      const options =
        `<option value=""${picks[s.key] === undefined ? " selected" : ""}>${esc(t(C.leaveStreet, l))}</option>` +
        s.forms.map((f) => `<option value="${esc(f.text)}"${picks[s.key] === f.text ? " selected" : ""}>${esc(f.text)}</option>`).join("");
      return (
        `<li><label for="${id}">${esc(t(C.writeStreetAs, l))}${l === "fr" ? NB : ""}: <span data-user-content>${esc(formsText(s, l))}</span></label>` +
        `<select id="${id}" name="street" data-key="${esc(s.key)}" ${FIELD_STYLE}>${options}</select></li>`
      );
    })
    .join("");
  return `<h3 id="fad-streets">${esc(`${t(C.streetsTitle, l)} (${streets.length})`)}</h3><p class="hint">${esc(t(C.streetsHint, l))}</p><ul class="fad-streets">${groups}</ul>`;
}

/**
 * Each address with several names, with a choice: keep every name (the
 * default), or keep one name so the places are joined as one in the copy.
 */
export function renderNames(groups: readonly NameGroup[], picks: Readonly<Record<string, string>>, l: Locale): string {
  if (groups.length === 0) return "";
  const k = l === "fr" ? `${NB}:` : ":";
  const items = groups
    .map((g, gi) => {
      const radio = (ci: number, value: string, label: string, checked: boolean): string =>
        `<label class="choice" for="${nameId(gi, ci)}" ${CHOICE_STYLE}><input type="radio" id="${nameId(gi, ci)}" name="name-${gi}" data-key="${esc(g.key)}" value="${esc(value)}"${checked ? " checked" : ""}>${label}</label>`;
      const choices =
        radio(0, "", esc(t(C.keepAll, l)), picks[g.key] === undefined) +
        g.places.map((p, i) => radio(i + 1, p.id, `${esc(t(C.keepName, l))} <span data-user-content>${esc(p.name)}</span>`, picks[g.key] === p.id)).join("");
      return `<li><fieldset><legend>${esc(t(C.namesLegend, l))}${esc(k)} <span data-user-content>${esc(g.places[0]?.address ?? "")}</span></legend>${choices}</fieldset></li>`;
    })
    .join("");
  return `<h3 id="fad-names">${esc(`${t(C.namesTitle, l)} (${groups.length})`)}</h3><p class="hint">${esc(t(C.namesHint, l))}</p><ul class="fad-names">${items}</ul>`;
}

/** True when at least one fix is ticked or picked. */
export function hasFix(f: Fixes): boolean {
  return f.postal.length > 0 || Object.keys(f.streets).length > 0 || Object.keys(f.names).length > 0;
}

export function renderCopy(ctx: FileAddressContext, file: StreetFile, r: AddressReport): string {
  if (!ctx.copyMade || !hasFix(ctx.applied)) return "";
  const l = ctx.locale;
  const c = applyFixes(file, r, ctx.applied);
  return (
    `<h3 id="fad-copy" tabindex="-1">${esc(t(C.copyTitle, l))}</h3>` +
    `<p id="fad-copy-summary">${esc(copySummary(c, l))}</p>` +
    `<p>${link(exportHref(fixedFile(c, ctx.today)), addressFilename("copy", ctx.today, l), t(C.downloadCopy, l))}</p>`
  );
}

export function renderReport(ctx: FileAddressContext, file: StreetFile): string {
  const l = ctx.locale;
  const r = checkAddresses(file, l);
  const fixable = firstFixId(r) !== undefined;
  const body = ISSUE_KINDS.map((k) => renderKind(k, r, ctx)).join("") + renderStreets(r.streets, ctx.picked.streets, l) + renderNames(r.names, ctx.picked.names, l);
  return (
    `<p id="fad-summary" tabindex="-1">${esc(reportSummary(r, l))}</p>` +
    (r.issues.length + r.streets.length + r.names.length === 0
      ? ""
      : `<p>${link(csvHref(addressCsv(r)), addressFilename("csv", ctx.today, l), t(C.downloadCsv, l))}</p>` +
        `<p>${link(textExportHref(addressText(r, l, ctx.today)), addressFilename("text", ctx.today, l), t(C.downloadText, l))}</p>`) +
    (fixable
      ? `<form id="fad-fix-form" novalidate>` +
        (r.issues.some((i) => i.suggestion !== undefined) ? `<p>${button(t(C.tickAll, l), { "data-action": "fad-tick-all", class: "secondary" })}</p>` : "") +
        body +
        `<p class="hint">${esc(t(C.copyHint, l))}</p>` +
        (ctx.noneError ? `<p id="e-fad-fix" class="error">${esc(t(C.noneChosen, l))}</p>` : "") +
        `<p>${button(t(C.makeCopy, l), { type: "submit", "data-action": "fad-copy" })}</p></form>`
      : body) +
    renderCopy(ctx, file, r)
  );
}

export function renderFileAddress(ctx: FileAddressContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  const fixId = ctx.file && ctx.noneError ? firstFixId(checkAddresses(ctx.file, l)) : undefined;
  const errors = [
    ...(err ? [`<li><a href="#${ADDRESS_TEXT_ID}">${esc(addressErrorText(err, l))}</a></li>`] : []),
    ...(fixId ? [`<li><a href="#${fixId}">${esc(t(C.noneChosen, l))}</a></li>`] : []),
  ];
  return (
    `<div class="app fileaddress-app" lang="${l}"><section lang="${l}" aria-labelledby="fad-title" class="fileaddress">` +
    `<h2 id="fad-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fad-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="fad-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="fad-file-form" novalidate>` +
    `<label for="${ADDRESS_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${ADDRESS_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${ADDRESS_TEXT_ID}" class="error">${esc(addressErrorText(err, l))}</p>` : "") +
    `<textarea id="${ADDRESS_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${ADDRESS_TEXT_ID}${err ? ` e-${ADDRESS_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${ADDRESS_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${ADDRESS_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "fad-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fad-clear", class: "secondary" })}</p>` +
    (ctx.file ? renderReport(ctx, ctx.file) : "") +
    `</section></div>`
  );
}

/** The fixes ticked and picked on the page. */
export function readFixes(root: ParentNode): Fixes {
  const postal = Array.from(root.querySelectorAll<HTMLInputElement>('input[name="postal"]:checked')).map((b) => b.value);
  const streets: Record<string, string> = {};
  for (const sel of Array.from(root.querySelectorAll<HTMLSelectElement>('select[name="street"]'))) {
    const key = sel.dataset["key"];
    if (key !== undefined && sel.value !== "") streets[key] = sel.value;
  }
  const names: Record<string, string> = {};
  for (const r of Array.from(root.querySelectorAll<HTMLInputElement>('input[name^="name-"]:checked'))) {
    const key = r.dataset["key"];
    if (key !== undefined && r.value !== "") names[key] = r.value;
  }
  return { postal, streets, names };
}
