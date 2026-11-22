import type { Locale } from "../../switch-first/src/index";
import { COPY, t } from "./copy";
import { exportHref, type ImportError } from "./exchange";
import { FACT_KEYS, type FactKey } from "./facts";
import {
  FILE_GAPS_COPY as C,
  addLabel,
  boxErrorText,
  checkText,
  filledSummary,
  filledText,
  gapsErrorText,
  gapsFilename,
  leftOutText,
  noteHeading,
  placeDetail,
  placeLabel,
  planSummary,
  recordLines,
  showNotesLabel,
  type Box,
} from "./filegaps-copy";
import { filledCsv, type FillCheck, type FillOptions, type FillPlace, type FillPlan, type Filled } from "./fillgaps";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import { csvHref } from "./notes-csv";
import { textExportHref } from "./textexport";

export interface GapsOutcome {
  readonly filled: Filled;
  readonly check: FillCheck;
  readonly copy: string;
}

export interface FileGapsContext {
  readonly mineText: string;
  readonly otherText: string;
  readonly mineError: ImportError | "no-notes" | undefined;
  readonly otherError: ImportError | "no-notes" | undefined;
  /** True once both files have been read. */
  readonly loaded: boolean;
  /** The options as on the form. */
  readonly form: FillOptions;
  readonly noKeys: boolean;
  /** The day to bring records in from is not a real date. */
  readonly badSince: boolean;
  /** What the other file can bring in, for the last options without a problem. */
  readonly plan: FillPlan | undefined;
  /** Ids of the places ticked. */
  readonly ticked: readonly string[];
  readonly noneTicked: boolean;
  readonly outcome: GapsOutcome | undefined;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const TEXT_IDS: Readonly<Record<Box, string>> = { mine: "fgp-mine", other: "fgp-other" };
export const OPEN_IDS: Readonly<Record<Box, string>> = { mine: "fgp-mine-open", other: "fgp-other-open" };
export const ONLY_GAPS_ID = "fgp-only-gaps";
export const SINCE_ID = "fgp-since";

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

export const keyBoxId = (k: FactKey): string => `fgp-key-${k}`;
/** The tick box of a place; place ids are already URL-safe. */
export const tickId = (placeId: string): string => `fgp-place-${placeId}`;

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

function box(which: Box, text: string, err: ImportError | "no-notes" | undefined, l: Locale): string {
  const id = TEXT_IDS[which];
  return (
    `<label for="${id}">${esc(t(which === "mine" ? C.mineLabel : C.otherLabel, l))}</label>` +
    `<p id="h-${id}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${id}" class="error">${esc(gapsErrorText(err, l))}</p>` : "") +
    `<textarea id="${id}" name="${which}" rows="5" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${id}${err ? ` e-${id}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(text)}</textarea>` +
    `<label for="${OPEN_IDS[which]}">${esc(t(which === "mine" ? C.mineOpen : C.otherOpen, l))}</label>` +
    `<input id="${OPEN_IDS[which]}" type="file" accept=".json,application/json,text/plain" data-box="${which}" ${FIELD_STYLE}>`
  );
}

export function renderOptions(ctx: FileGapsContext): string {
  const l = ctx.locale;
  const f = ctx.form;
  const choice = (id: string, name: string, value: string, checked: boolean, label: string, described = ""): string =>
    `<label class="choice" for="${id}" ${CHOICE_STYLE}><input type="checkbox" id="${id}" name="${name}" value="${esc(value)}"${described ? ` aria-describedby="${described}"` : ""}${checked ? " checked" : ""}>${esc(label)}</label>`;
  return (
    `<form id="fgp-options-form" novalidate><h3 id="fgp-options">${esc(t(C.optionsTitle, l))}</h3>` +
    `<fieldset${ctx.noKeys ? ' aria-describedby="e-fgp-keys"' : ""}><legend>${esc(t(C.keysLegend, l))}</legend>` +
    (ctx.noKeys ? `<p id="e-fgp-keys" class="error">${esc(t(C.noKeys, l))}</p>` : "") +
    FACT_KEYS.map((k) => choice(keyBoxId(k), "key", k, f.keys.includes(k), t(COPY.facts[k], l))).join("") +
    `</fieldset>` +
    `<p id="h-${ONLY_GAPS_ID}" class="hint">${esc(t(C.onlyGapsHint, l))}</p>` +
    `<p>${choice(ONLY_GAPS_ID, "onlyGaps", "yes", f.onlyGaps, t(C.onlyGapsLabel, l), `h-${ONLY_GAPS_ID}`)}</p>` +
    `<label for="${SINCE_ID}">${esc(t(C.sinceLabel, l))}</label>` +
    `<p id="h-${SINCE_ID}" class="hint">${esc(t(C.sinceHint, l))}</p>` +
    (ctx.badSince ? `<p id="e-${SINCE_ID}" class="error">${esc(t(C.badSince, l))}</p>` : "") +
    `<input id="${SINCE_ID}" type="text" name="since" inputmode="numeric" autocomplete="off" maxlength="10" value="${esc(f.since)}" aria-describedby="h-${SINCE_ID}${ctx.badSince ? ` e-${SINCE_ID}` : ""}"${ctx.badSince ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>` +
    `<p>${button(t(C.find, l), { type: "submit", "data-action": "fgp-find" })}</p></form>`
  );
}

/** Every note a place would gain, with its records, behind a disclosure so the list stays short. */
export function renderPlaceNotes(p: FillPlace, l: Locale): string {
  return (
    `<details class="fgp-notes"><summary style="min-height:44px;display:flex;align-items:center"><span data-user-content>${esc(showNotesLabel(p, l))}</span></summary><ul>` +
    p.notes
      .map((x) => `<li><p><span data-user-content>${esc(noteHeading(x.note, l))}</span></p><ul>${recordLines(x.note, l).map((line) => `<li><span data-user-content>${esc(line)}</span></li>`).join("")}</ul></li>`)
      .join("") +
    `</ul></details>`
  );
}

/** The places that can gain answers, each with a tick box that names it and what its notes fill. */
export function renderPlan(plan: FillPlan, ctx: FileGapsContext): string {
  const l = ctx.locale;
  const left = leftOutText(plan, l);
  const head =
    `<h3 id="fgp-results" tabindex="-1">${esc(t(C.resultsTitle, l))}</h3><p id="fgp-summary">${esc(planSummary(plan, l))}</p>` +
    (left ? `<p class="hint" id="fgp-left-out">${esc(left)}</p>` : "");
  if (plan.places.length === 0) return head;
  const ticked = new Set(ctx.ticked);
  const n = plan.places.filter((p) => ticked.has(p.place.id)).reduce((s, p) => s + p.notes.length, 0);
  const items = plan.places
    .map((p) => {
      const id = tickId(p.place.id);
      return (
        `<li><label class="choice" for="${id}" ${CHOICE_STYLE}><input type="checkbox" id="${id}" name="place" value="${esc(p.place.id)}" data-action="fgp-tick" aria-describedby="d-${id}"${ticked.has(p.place.id) ? " checked" : ""}>` +
        `<span data-user-content>${esc(placeLabel(p, l))}</span></label><p id="d-${id}" class="hint">${esc(placeDetail(p, l))}</p>${renderPlaceNotes(p, l)}</li>`
      );
    })
    .join("");
  return (
    head +
    `<form id="fgp-add-form" novalidate><fieldset${ctx.noneTicked ? ' aria-describedby="e-fgp-places"' : ""}><legend>${esc(t(C.placesLegend, l))}</legend>` +
    (ctx.noneTicked ? `<p id="e-fgp-places" class="error">${esc(t(C.noneTicked, l))}</p>` : "") +
    `<ul class="fgp-places">${items}</ul></fieldset>` +
    (plan.places.length > 1
      ? `<p>${button(t(C.tickAll, l), { "data-action": "fgp-tick-all", class: "secondary" })} ${button(t(C.untickAll, l), { "data-action": "fgp-untick-all", class: "secondary" })}</p>`
      : "") +
    `<p>${button(addLabel(n, l), { type: "submit", "data-action": "fgp-add" })}</p></form>`
  );
}

/** The copy: what reading it back found, and its downloads when it read back as expected. */
export function renderOutcome(o: GapsOutcome, ctx: FileGapsContext): string {
  const l = ctx.locale;
  const head = `<h3 id="fgp-copy" tabindex="-1">${esc(t(C.copyTitle, l))}</h3>`;
  if (!o.check.ok) return `<section aria-labelledby="fgp-copy">${head}<p id="fgp-check" class="error">${esc(checkText(o.check, l))}</p></section>`;
  const n = o.filled.added.length;
  return (
    `<section aria-labelledby="fgp-copy">${head}<p id="fgp-copy-summary">${esc(filledSummary(o.filled, o.check, l))}</p><p id="fgp-check">${esc(checkText(o.check, l))}</p>` +
    `<p>${link(exportHref(o.copy), gapsFilename("copy", n, ctx.today, l), t(C.downloadCopy, l))} ` +
    `${link(textExportHref(filledText(o.filled, ctx.today, l)), gapsFilename("list", n, ctx.today, l), t(C.downloadList, l))} ` +
    `${link(csvHref(filledCsv(o.filled)), gapsFilename("csv", n, ctx.today, l), t(C.downloadCsv, l))}</p></section>`
  );
}

export function renderFileGaps(ctx: FileGapsContext): string {
  const l = ctx.locale;
  const first = ctx.plan?.places[0];
  const errors = [
    ...(ctx.mineError ? [`<li><a href="#${TEXT_IDS.mine}">${esc(boxErrorText("mine", ctx.mineError, l))}</a></li>`] : []),
    ...(ctx.otherError ? [`<li><a href="#${TEXT_IDS.other}">${esc(boxErrorText("other", ctx.otherError, l))}</a></li>`] : []),
    ...(ctx.noKeys ? [`<li><a href="#${keyBoxId(FACT_KEYS[0] ?? "step-free-entry")}">${esc(t(C.noKeys, l))}</a></li>`] : []),
    ...(ctx.badSince ? [`<li><a href="#${SINCE_ID}">${esc(t(C.badSince, l))}</a></li>`] : []),
    ...(ctx.noneTicked && first ? [`<li><a href="#${tickId(first.place.id)}">${esc(t(C.noneTicked, l))}</a></li>`] : []),
  ];
  return (
    `<div class="app filegaps-app" lang="${l}"><section lang="${l}" aria-labelledby="fgp-title" class="filegaps">` +
    `<h2 id="fgp-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.rule, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fgp-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="fgp-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="fgp-file-form" novalidate>` +
    box("mine", ctx.mineText, ctx.mineError, l) +
    box("other", ctx.otherText, ctx.otherError, l) +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "fgp-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fgp-clear", class: "secondary" })}</p>` +
    (ctx.loaded ? renderOptions(ctx) + (ctx.plan ? renderPlan(ctx.plan, ctx) : "") : "") +
    (ctx.loaded && ctx.outcome ? renderOutcome(ctx.outcome, ctx) : "") +
    `</section></div>`
  );
}

/** The options as on the form. */
export function readOptions(root: ParentNode): FillOptions {
  return {
    keys: FACT_KEYS.filter((k) => root.querySelector<HTMLInputElement>(`#${keyBoxId(k)}`)?.checked),
    onlyGaps: root.querySelector<HTMLInputElement>(`#${ONLY_GAPS_ID}`)?.checked ?? true,
    since: (root.querySelector<HTMLInputElement>(`#${SINCE_ID}`)?.value ?? "").trim(),
  };
}
