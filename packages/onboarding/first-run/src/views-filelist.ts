import type { Locale } from "../../switch-first/src/index";
import { NB, t } from "./copy";
import { exportHref, type ImportError } from "./exchange";
import { FACT_KEYS, OPEN_LICENCES } from "./facts";
import {
  FILE_LIST_COPY as C,
  checkSummary,
  checkText,
  columnLabel,
  columnsProblemText,
  decidedText,
  decisionText,
  listErrorText,
  listFilename,
  notesErrorText,
  recordedText,
  rowText,
  setAsideText,
  statusTitle,
  type ListError,
} from "./filelist-copy";
import type { Sheet } from "./filesheet";
import type { StreetFile } from "./filestreets";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import { csvHref } from "./notes-csv";
import { textExportHref } from "./textexport";
import type { Place } from "./places";
import {
  DECISIONS,
  applyDecisions,
  checkList,
  foundFile,
  listCheckCsv,
  notInListFile,
  readEntries,
  recordedDetails,
  starterFile,
  starterNotes,
  type ColumnsProblem,
  type Decision,
  type Decisions,
  type EntryMatch,
  type ListCheck,
  type ListColumns,
  type ListRead,
  type ListStatus,
} from "./placelist";

export interface FileListContext {
  readonly notesText: string;
  readonly listText: string;
  readonly notesError: ImportError | "no-notes" | undefined;
  readonly listError: ListError | undefined;
  readonly file: StreetFile | undefined;
  readonly sheet: Sheet | undefined;
  readonly columns: ListColumns;
  readonly licence: string;
  readonly problems: readonly ColumnsProblem[];
  /** The person's answers for places at the same address, by row. */
  readonly decisions: Decisions;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const NOTES_TEXT_ID = "fpl-notes";
export const NOTES_OPEN_ID = "fpl-notes-open";
export const LIST_TEXT_ID = "fpl-list";
export const LIST_OPEN_ID = "fpl-list-open";
export const NAME_COL_ID = "fpl-name-col";
export const ADDRESS_COL_ID = "fpl-address-col";
export const LICENCE_ID = "fpl-licence";

const FIELD_STYLE = 'style="min-height:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

/** Where a columns problem's link sends focus. */
export function problemTarget(p: ColumnsProblem): string {
  return p === "licence" ? LICENCE_ID : p === "same" ? ADDRESS_COL_ID : NAME_COL_ID;
}

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

export function decisionId(row: number, d: Decision): string {
  return `fpl-decide-${row}-${d}`;
}

/**
 * The results, when both the notes and the list are read and the columns are
 * usable: the match by names and addresses, and the same with the person's
 * answers applied.
 */
export function listResults(ctx: FileListContext): { read: ListRead; raw: ListCheck; check: ListCheck } | undefined {
  if (!ctx.file || !ctx.sheet || ctx.problems.length > 0) return undefined;
  const read = readEntries(ctx.sheet, ctx.columns);
  if (read.entries.length === 0) return undefined;
  const raw = checkList(read, ctx.file);
  return { read, raw, check: applyDecisions(raw, ctx.file, ctx.decisions) };
}

function described(ctx: FileListContext, id: string, codes: readonly ColumnsProblem[], hint: boolean): { attrs: string; text: string } {
  const mine = ctx.problems.filter((p) => codes.includes(p));
  const ids = [hint ? `h-${id}` : undefined, mine.length > 0 ? `e-${id}` : undefined].filter((x): x is string => x !== undefined);
  return {
    attrs: (ids.length > 0 ? ` aria-describedby="${ids.join(" ")}"` : "") + (mine.length > 0 ? ' aria-invalid="true"' : ""),
    text: mine.length > 0 ? `<p id="e-${id}" class="error">${mine.map((p) => esc(columnsProblemText(p, ctx.locale))).join(" ")}</p>` : "",
  };
}

export function renderColumns(ctx: FileListContext, sheet: Sheet): string {
  const l = ctx.locale;
  const options = (selected: number, withNone: boolean): string =>
    (withNone ? `<option value="-1"${selected === -1 ? " selected" : ""}>${esc(t(C.noColumn, l))}</option>` : "") +
    sheet.header.map((h, i) => `<option value="${i}"${selected === i ? " selected" : ""}>${esc(columnLabel(i, h, l))}</option>`).join("");
  const name = described(ctx, NAME_COL_ID, ["name"], false);
  const address = described(ctx, ADDRESS_COL_ID, ["same"], false);
  const licence = described(ctx, LICENCE_ID, ["licence"], true);
  return (
    `<h3 id="fpl-columns">${esc(t(C.columnsTitle, l))}</h3>` +
    `<form id="fpl-columns-form" novalidate>` +
    `<label for="${NAME_COL_ID}">${esc(t(C.nameColumn, l))}</label>${name.text}` +
    `<select id="${NAME_COL_ID}" name="name-col"${name.attrs} ${FIELD_STYLE}>${options(ctx.columns.name, false)}</select>` +
    `<label for="${ADDRESS_COL_ID}">${esc(t(C.addressColumn, l))}</label>${address.text}` +
    `<select id="${ADDRESS_COL_ID}" name="address-col"${address.attrs} ${FIELD_STYLE}>${options(ctx.columns.address, true)}</select>` +
    `<label for="${LICENCE_ID}">${esc(t(C.licenceLabel, l))}</label><p id="h-${LICENCE_ID}" class="hint">${esc(t(C.licenceHint, l))}</p>${licence.text}` +
    `<select id="${LICENCE_ID}" name="licence"${licence.attrs} ${FIELD_STYLE}>${OPEN_LICENCES.map((x) => `<option value="${esc(x)}"${x === ctx.licence ? " selected" : ""}>${esc(x)}</option>`).join("")}</select>` +
    `<p>${button(t(C.update, l), { type: "submit", "data-action": "fpl-update" })}</p></form>`
  );
}

function placeText(p: Place, l: Locale): string {
  return `<span data-user-content>${esc(p.name)}</span>, <span data-user-content>${esc(p.address ?? t(C.noAddress, l))}</span>`;
}

export function renderMatch(m: EntryMatch, l: Locale): string {
  const k = l === "fr" ? `${NB}:` : ":";
  const entry =
    `<span class="fpl-row">${esc(rowText(m.entry.row, l))}</span> ` +
    `<span data-user-content>${esc(m.entry.name)}</span>, <span data-user-content>${esc(m.entry.address ?? t(C.noAddress, l))}</span>`;
  const decided = m.decided ? `<br><span class="hint">${esc(decidedText(m.decided, l))}</span>` : "";
  if (m.status === "found") {
    const p = m.places[0];
    return `<li data-row="${m.entry.row}">${entry}<br><span class="hint">${esc(p ? recordedText(recordedDetails(p), FACT_KEYS.length, l) : "")}</span>${decided}</li>`;
  }
  if (m.status === "same-address") {
    const others = m.places.map((p) => `<li>${esc(t(C.inFile, l))}${esc(k)} ${placeText(p, l)}</li>`).join("");
    return `<li data-row="${m.entry.row}">${entry}<ul>${others}</ul></li>`;
  }
  return `<li data-row="${m.entry.row}">${entry}${decided}</li>`;
}

/** The places at the same address under another name, each with the person's three answers. */
export function renderDecide(raw: ListCheck, decisions: Decisions, l: Locale): string {
  const pairs = raw.matches.filter((m) => m.status === "same-address");
  if (pairs.length === 0) return "";
  const k = l === "fr" ? `${NB}:` : ":";
  const items = pairs
    .map((m) => {
      const chosen = decisions[m.entry.row] ?? "unsure";
      const radios = DECISIONS.map(
        (d) =>
          `<label class="choice" for="${decisionId(m.entry.row, d)}" style="min-height:44px;min-width:44px"><input type="radio" id="${decisionId(m.entry.row, d)}" name="fpl-decide-${m.entry.row}" value="${d}"${chosen === d ? " checked" : ""}>${esc(decisionText(d, l))}</label>`,
      ).join("");
      const others = m.places.map((p) => `<li>${esc(t(C.inFile, l))}${esc(k)} ${placeText(p, l)}</li>`).join("");
      return (
        `<li data-row="${m.entry.row}"><span class="fpl-row">${esc(rowText(m.entry.row, l))}</span> ` +
        `<span data-user-content>${esc(m.entry.name)}</span>, <span data-user-content>${esc(m.entry.address ?? t(C.noAddress, l))}</span>` +
        `<ul>${others}</ul><fieldset><legend>${esc(t(C.decideLegend, l))}</legend>${radios}</fieldset></li>`
      );
    })
    .join("");
  return (
    `<h3 id="fpl-same-address">${esc(`${statusTitle("same-address", l)} (${pairs.length})`)}</h3>` +
    `<p class="hint">${esc(t(C.statusHint["same-address"], l))}</p><p class="hint">${esc(t(C.decideHint, l))}</p>` +
    `<form id="fpl-decide-form" novalidate><ul class="fpl-same-address">${items}</ul>` +
    `<p>${button(t(C.decide, l), { type: "submit", "data-action": "fpl-decide" })}</p></form>`
  );
}

function statusSection(s: ListStatus, matches: readonly EntryMatch[], l: Locale): string {
  const mine = matches.filter((m) => m.status === s);
  if (mine.length === 0) return "";
  return (
    `<h3 id="fpl-${s}">${esc(`${statusTitle(s, l)} (${mine.length})`)}</h3><p class="hint">${esc(t(C.statusHint[s], l))}</p>` +
    `<ul class="fpl-${s}">${mine.map((m) => renderMatch(m, l)).join("")}</ul>`
  );
}

export function renderResults(ctx: FileListContext, file: StreetFile, read: ListRead, raw: ListCheck, check: ListCheck): string {
  const l = ctx.locale;
  const starter = starterNotes(check, file, ctx.licence, ctx.today);
  const found = check.matches.some((m) => m.status === "found");
  const aside = setAsideText(read, l);
  return (
    (aside === "" ? "" : `<p id="fpl-aside">${esc(aside)}</p>`) +
    (starter.length === 0
      ? ""
      : `<p>${link(exportHref(starterFile(starter, ctx.today)), listFilename("starter", ctx.today, l), t(C.downloadStarter, l))}</p><p class="hint">${esc(t(C.starterHint, l))}</p>`) +
    (found ? `<p>${link(exportHref(foundFile(check, ctx.today)), listFilename("found", ctx.today, l), t(C.downloadFound, l))}</p>` : "") +
    `<p>${link(csvHref(listCheckCsv(check)), listFilename("csv", ctx.today, l), t(C.downloadCsv, l))}</p>` +
    `<p>${link(textExportHref(checkText(check, l, ctx.today)), listFilename("text", ctx.today, l), t(C.downloadText, l))}</p>` +
    statusSection("found", check.matches, l) +
    renderDecide(raw, ctx.decisions, l) +
    statusSection("missing", check.matches, l) +
    (check.notInList.length === 0
      ? ""
      : `<h3 id="fpl-not-in-list">${esc(`${t(C.notInListTitle, l)} (${check.notInList.length})`)}</h3>` +
        `<p>${link(exportHref(notInListFile(check, ctx.today)), listFilename("not-in-list", ctx.today, l), t(C.downloadNotInList, l))}</p>` +
        `<ul class="fpl-not-in-list">${check.notInList.map((p) => `<li>${placeText(p, l)}</li>`).join("")}</ul>`)
  );
}

export function renderFileList(ctx: FileListContext): string {
  const l = ctx.locale;
  const errors = [
    ...(ctx.notesError ? [`<li><a href="#${NOTES_TEXT_ID}">${esc(notesErrorText(ctx.notesError, l))}</a></li>`] : []),
    ...(ctx.listError ? [`<li><a href="#${LIST_TEXT_ID}">${esc(listErrorText(ctx.listError, l))}</a></li>`] : []),
    ...ctx.problems.map((p) => `<li><a href="#${problemTarget(p)}">${esc(columnsProblemText(p, l))}</a></li>`),
  ];
  const box = (id: string, label: string, hint: string, err: string | undefined, value: string, openId: string, openLabel: string, accept: string): string =>
    `<label for="${id}">${esc(label)}</label><p id="h-${id}" class="hint">${esc(hint)}</p>` +
    (err ? `<p id="e-${id}" class="error">${esc(err)}</p>` : "") +
    `<textarea id="${id}" name="${id}" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${id}${err ? ` e-${id}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(value)}</textarea>` +
    `<label for="${openId}">${esc(openLabel)}</label><input id="${openId}" type="file" accept="${accept}" ${FIELD_STYLE}>`;
  const results = listResults(ctx);
  return (
    `<div class="app filelist-app" lang="${l}"><section lang="${l}" aria-labelledby="fpl-title" class="filelist">` +
    `<h2 id="fpl-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fpl-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="fpl-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="fpl-file-form" novalidate>` +
    box(NOTES_TEXT_ID, t(C.notesLabel, l), t(C.notesHint, l), ctx.notesError ? notesErrorText(ctx.notesError, l) : undefined, ctx.notesText, NOTES_OPEN_ID, t(C.notesOpen, l), ".json,application/json,text/plain") +
    box(LIST_TEXT_ID, t(C.listLabel, l), t(C.listHint, l), ctx.listError ? listErrorText(ctx.listError, l) : undefined, ctx.listText, LIST_OPEN_ID, t(C.listOpen, l), ".csv,.tsv,.txt,text/csv,text/plain") +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "fpl-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fpl-clear", class: "secondary" })}</p>` +
    (ctx.file && ctx.sheet
      ? (results ? `<p id="fpl-summary" tabindex="-1">${esc(checkSummary(results.check, l))}</p>` : "") +
        renderColumns(ctx, ctx.sheet) +
        (results ? renderResults(ctx, ctx.file, results.read, results.raw, results.check) : "")
      : "") +
    `</section></div>`
  );
}

/** Reads the chosen columns and licence from the page. */
export function readColumns(root: ParentNode, fallback: ListColumns, fallbackLicence: string): { columns: ListColumns; licence: string } {
  const num = (id: string, f: number): number => {
    const v = root.querySelector<HTMLSelectElement>(`#${id}`)?.value;
    const n = v === undefined ? NaN : Number(v);
    return Number.isInteger(n) ? n : f;
  };
  return {
    columns: { name: num(NAME_COL_ID, fallback.name), address: num(ADDRESS_COL_ID, fallback.address) },
    licence: root.querySelector<HTMLSelectElement>(`#${LICENCE_ID}`)?.value ?? fallbackLicence,
  };
}

/** Reads the person's answers from the page, by row; rows not on the page keep their answer. */
export function readDecisions(root: ParentNode, previous: Decisions): Decisions {
  const out: Record<number, Decision> = { ...previous };
  for (const input of Array.from(root.querySelectorAll<HTMLInputElement>('input[name^="fpl-decide-"]:checked'))) {
    const row = Number(input.name.slice("fpl-decide-".length));
    const v = input.value;
    if (Number.isInteger(row) && (v === "same" || v === "different" || v === "unsure")) out[row] = v;
  }
  return out;
}
