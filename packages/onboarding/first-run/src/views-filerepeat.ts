import type { Locale } from "../../switch-first/src/index";
import { t } from "./copy";
import { exportHref, type ImportError } from "./exchange";
import {
  FILE_REPEAT_COPY as C,
  checkText,
  foundSummary,
  groupDetail,
  groupLabel,
  noteHeading,
  recordLines,
  removalSummary,
  removeLabel,
  repeatErrorText,
  repeatFilename,
  repeatsText,
  showNotesLabel,
} from "./filerepeat-copy";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import { groupId, repeatsCsv, type RepeatCheck, type RepeatGroup, type RepeatOptions, type RepeatRemoval } from "./repeatnotes";
import { csvHref } from "./notes-csv";
import { textExportHref } from "./textexport";

export interface RepeatOutcome {
  readonly removal: RepeatRemoval;
  readonly check: RepeatCheck;
  readonly copy: string;
  readonly removed: string;
}

export interface FileRepeatContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  /** True once a file has been read. */
  readonly loaded: boolean;
  /** The options as on the form. */
  readonly options: RepeatOptions;
  /** The groups found with the options last asked for, in order; undefined before. */
  readonly groups: readonly RepeatGroup[] | undefined;
  /** Ids of the groups ticked. */
  readonly ticked: readonly string[];
  /** No group was ticked when the repeats were to be removed. */
  readonly noneTicked: boolean;
  readonly outcome: RepeatOutcome | undefined;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const REPEAT_TEXT_ID = "frp-text";
export const REPEAT_OPEN_ID = "frp-open";
export const ANY_DAY_ID = "frp-any-day";
export const WITHIN_ID = "frp-within";

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

/** The tick box of a group. */
export const tickId = (g: RepeatGroup): string => `frp-group-${groupId(g)}`;

/** Every note of a group, the one kept first, with its records, behind a disclosure so the list stays short. */
export function renderGroupNotes(g: RepeatGroup, l: Locale): string {
  const item = (n: RepeatGroup["kept"], kept: boolean): string =>
    `<li><p>${esc(noteHeading(n, kept, l))}</p><ul>${recordLines(n, l)
      .map((line) => `<li>${esc(line)}</li>`)
      .join("")}</ul></li>`;
  return (
    `<details class="frp-notes"><summary style="min-height:44px;display:flex;align-items:center"><span data-user-content>${esc(showNotesLabel(g, l))}</span></summary>` +
    `<ul>${item(g.kept, true)}${g.repeats.map((n) => item(n, false)).join("")}</ul></details>`
  );
}

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

export function renderOptions(ctx: FileRepeatContext): string {
  const l = ctx.locale;
  return (
    `<form id="frp-options-form" novalidate><h3 id="frp-options">${esc(t(C.optionsTitle, l))}</h3>` +
    `<p id="h-${ANY_DAY_ID}" class="hint">${esc(t(C.anyDayHint, l))}</p>` +
    `<p><label class="choice" for="${ANY_DAY_ID}" ${CHOICE_STYLE}><input type="checkbox" id="${ANY_DAY_ID}" name="anyDay" value="yes" aria-describedby="h-${ANY_DAY_ID}"${ctx.options.anyDay ? " checked" : ""}>${esc(t(C.anyDayLabel, l))}</label></p>` +
    `<p id="h-${WITHIN_ID}" class="hint">${esc(t(C.withinHint, l))}</p>` +
    `<p><label class="choice" for="${WITHIN_ID}" ${CHOICE_STYLE}><input type="checkbox" id="${WITHIN_ID}" name="within" value="yes" aria-describedby="h-${WITHIN_ID}"${ctx.options.within ? " checked" : ""}>${esc(t(C.withinLabel, l))}</label></p>` +
    `<p>${button(t(C.find, l), { type: "submit", "data-action": "frp-find" })}</p></form>`
  );
}

/** The groups found, each with a tick box that names it and what its notes hold. */
export function renderGroups(groups: readonly RepeatGroup[], ctx: FileRepeatContext): string {
  const l = ctx.locale;
  const head = `<h3 id="frp-results" tabindex="-1">${esc(t(C.resultsTitle, l))}</h3><p id="frp-found">${esc(foundSummary(groups, l))}</p>`;
  if (groups.length === 0) return head;
  const ticked = new Set(ctx.ticked);
  const n = groups.filter((g) => ticked.has(groupId(g))).reduce((s, g) => s + g.repeats.length, 0);
  const none = ctx.noneTicked;
  const items = groups
    .map((g) => {
      const id = tickId(g);
      return (
        `<li><label class="choice" for="${id}" ${CHOICE_STYLE}><input type="checkbox" id="${id}" name="group" value="${esc(groupId(g))}" data-action="frp-tick" aria-describedby="d-${id}"${ticked.has(groupId(g)) ? " checked" : ""}>` +
        `<span data-user-content>${esc(groupLabel(g, l))}</span></label><p id="d-${id}" class="hint"><span data-user-content>${esc(groupDetail(g, l))}</span></p>${renderGroupNotes(g, l)}</li>`
      );
    })
    .join("");
  return (
    head +
    `<form id="frp-remove-form" novalidate><fieldset${none ? ' aria-describedby="e-frp-groups"' : ""}><legend>${esc(t(C.groupsLegend, l))}</legend>` +
    (none ? `<p id="e-frp-groups" class="error">${esc(t(C.problems.none, l))}</p>` : "") +
    `<ul class="frp-groups">${items}</ul></fieldset>` +
    (groups.length > 1
      ? `<p>${button(t(C.tickAll, l), { "data-action": "frp-tick-all", class: "secondary" })} ${button(t(C.untickAll, l), { "data-action": "frp-untick-all", class: "secondary" })}</p>`
      : "") +
    `<p>${button(removeLabel(n, l), { type: "submit", "data-action": "frp-remove" })}</p></form>`
  );
}

/** What was taken out, the read-back, and the downloads when the copy read back as expected. */
export function renderOutcome(o: RepeatOutcome, ctx: FileRepeatContext): string {
  const l = ctx.locale;
  const n = o.removal.removed.length;
  const head = `<h3 id="frp-copy" tabindex="-1">${esc(t(C.copyTitle, l))}</h3><p id="frp-summary">${esc(removalSummary(o.removal, l))}</p>`;
  if (!o.check.ok) return `<section aria-labelledby="frp-copy">${head}<p id="frp-check" class="error">${esc(checkText(o.check, l))}</p></section>`;
  return (
    `<section aria-labelledby="frp-copy">${head}<p id="frp-check">${esc(checkText(o.check, l))}</p>` +
    `<p>${link(exportHref(o.copy), repeatFilename("copy", n, ctx.today, l), t(C.downloadCopy, l))} ` +
    `${link(exportHref(o.removed), repeatFilename("removed", n, ctx.today, l), t(C.downloadRemoved, l))} ` +
    `${link(textExportHref(repeatsText(o.removal, ctx.today, l)), repeatFilename("list", n, ctx.today, l), t(C.downloadList, l))} ` +
    `${link(csvHref(repeatsCsv(o.removal)), repeatFilename("csv", n, ctx.today, l), t(C.downloadCsv, l))}</p></section>`
  );
}

export function renderFileRepeat(ctx: FileRepeatContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  const first = ctx.groups?.[0];
  const errors = [
    ...(err ? [`<li><a href="#${REPEAT_TEXT_ID}">${esc(repeatErrorText(err, l))}</a></li>`] : []),
    ...(ctx.noneTicked && first ? [`<li><a href="#${tickId(first)}">${esc(t(C.problems.none, l))}</a></li>`] : []),
  ];
  return (
    `<div class="app filerepeat-app" lang="${l}"><section lang="${l}" aria-labelledby="frp-title" class="filerepeat">` +
    `<h2 id="frp-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.rule, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="frp-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="frp-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="frp-file-form" novalidate>` +
    `<label for="${REPEAT_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${REPEAT_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${REPEAT_TEXT_ID}" class="error">${esc(repeatErrorText(err, l))}</p>` : "") +
    `<textarea id="${REPEAT_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${REPEAT_TEXT_ID}${err ? ` e-${REPEAT_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${REPEAT_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${REPEAT_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "frp-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "frp-clear", class: "secondary" })}</p>` +
    (ctx.loaded ? renderOptions(ctx) + (ctx.groups ? renderGroups(ctx.groups, ctx) : "") : "") +
    (ctx.loaded && ctx.outcome ? renderOutcome(ctx.outcome, ctx) : "") +
    `</section></div>`
  );
}
