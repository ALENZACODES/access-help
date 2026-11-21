import type { Locale } from "../../switch-first/src/index";
import { addedCsv, addedFile, applyAdds, sourceOf, type AddOptions, type AddProblem, type PlannedAdd } from "./bulkadd";
import { COPY, t } from "./copy";
import { exportHref, type ImportError } from "./exchange";
import { FACT_KEYS, OPEN_LICENCES, type FactKey } from "./facts";
import {
  FILE_ADD_COPY as C,
  addErrorText,
  addFilename,
  addProblemText,
  copySummary,
  listSummary,
  plannedText,
  recordText,
} from "./fileadd-copy";
import type { StreetFile } from "./filestreets";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import { csvHref } from "./notes-csv";

export interface FileAddContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  readonly file: StreetFile | undefined;
  /** The record as on the form, kept as typed even with a problem. */
  readonly form: AddOptions;
  readonly search: string;
  readonly onlyUnknown: boolean;
  readonly problems: readonly AddProblem[];
  /** The places shown for the last record without a problem; undefined before any are shown. */
  readonly plan: readonly PlannedAdd[] | undefined;
  /** The record the places were shown for. */
  readonly options: AddOptions | undefined;
  /** Places ticked, by place id. */
  readonly ticked: ReadonlySet<string>;
  /** The places the copy on screen was made for; undefined before one is made. */
  readonly made: ReadonlySet<string> | undefined;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const ADD_TEXT_ID = "fbd-text";
export const ADD_OPEN_ID = "fbd-open";
export const SOURCE_ID = "fbd-source";
export const LICENCE_ID = "fbd-licence";
export const DATE_ID = "fbd-date";
export const SEARCH_ID = "fbd-search";
export const ONLY_ID = "fbd-only";
export const WHO_ME_HINT_ID = "fbd-who-me-hint";

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

export const keyId = (k: FactKey): string => `fbd-key-${k}`;
export const valueId = (v: "yes" | "no"): string => `fbd-val-${v}`;
export const whoId = (w: "me" | "source"): string => `fbd-who-${w}`;
export const placeBoxId = (i: number): string => `fbd-place-${i}`;

/** The field a problem is about. */
export function problemTarget(p: AddProblem): string {
  if (p === "no-key") return keyId(FACT_KEYS[0] ?? "step-free-entry");
  if (p === "no-value") return valueId("yes");
  if (p === "no-who") return whoId("me");
  if (p.startsWith("source")) return SOURCE_ID;
  if (p === "no-licence") return LICENCE_ID;
  if (p.startsWith("date")) return DATE_ID;
  return placeBoxId(0);
}

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

function choice(type: "radio" | "checkbox", id: string, name: string, value: string, checked: boolean, label: string, user = false, describedBy = ""): string {
  const text = user ? `<span data-user-content>${esc(label)}</span>` : esc(label);
  const d = describedBy === "" ? "" : ` aria-describedby="${describedBy}"`;
  return `<label class="choice" for="${id}" ${CHOICE_STYLE}><input type="${type}" id="${id}" name="${name}" value="${esc(value)}"${checked ? " checked" : ""}${d}>${text}</label>`;
}

function errorFor(ctx: FileAddContext, ps: readonly AddProblem[], id: string): { html: string; ids: string[] } {
  const mine = ctx.problems.filter((p) => ps.includes(p));
  return {
    html: mine.map((p) => `<p id="e-${id}-${p}" class="error">${esc(addProblemText(p, ctx.locale))}</p>`).join(""),
    ids: mine.map((p) => `e-${id}-${p}`),
  };
}

function group(ctx: FileAddContext, legend: string, ps: readonly AddProblem[], id: string, inner: string): string {
  const e = errorFor(ctx, ps, id);
  return `<fieldset${e.ids.length > 0 ? ` aria-describedby="${e.ids.join(" ")}"` : ""}><legend>${esc(legend)}</legend>${e.html}${inner}</fieldset>`;
}

function field(ctx: FileAddContext, id: string, label: string, hint: string, ps: readonly AddProblem[], control: (describedBy: string, invalid: string) => string): string {
  const e = errorFor(ctx, ps, id);
  const invalid = e.ids.length > 0 ? ' aria-invalid="true"' : "";
  return `<label for="${id}">${esc(label)}</label><p id="h-${id}" class="hint">${esc(hint)}</p>${e.html}${control([`h-${id}`, ...e.ids].join(" "), invalid)}`;
}

export function renderRecordForm(ctx: FileAddContext): string {
  const l = ctx.locale;
  const f = ctx.form;
  return (
    `<form id="fbd-options-form" novalidate><h3 id="fbd-record" tabindex="-1">${esc(t(C.recordTitle, l))}</h3>` +
    group(ctx, t(C.keyLegend, l), ["no-key"], "fbd-keys", FACT_KEYS.map((k) => choice("radio", keyId(k), "key", k, f.key === k, t(COPY.facts[k], l))).join("")) +
    group(ctx, t(C.valueLegend, l), ["no-value"], "fbd-values", (["yes", "no"] as const).map((v) => choice("radio", valueId(v), "value", v, f.value === v, t(COPY.values[v], l))).join("")) +
    group(
      ctx,
      t(C.whoLegend, l),
      ["no-who"],
      "fbd-who",
      choice("radio", whoId("me"), "who", "me", f.who === "me", t(C.whoMe, l), false, WHO_ME_HINT_ID) +
        `<p id="${WHO_ME_HINT_ID}" class="hint">${esc(t(C.whoMeHint, l))}</p>` +
        choice("radio", whoId("source"), "who", "source", f.who === "source", t(C.whoSource, l)),
    ) +
    field(ctx, SOURCE_ID, t(C.sourceLabel, l), t(C.sourceHint, l), ["source-empty", "source-long", "source-control", "source-contributor"], (d, inv) =>
      `<input id="${SOURCE_ID}" type="text" autocomplete="off" maxlength="${LIMITS.placeName + 40}" value="${esc(f.source)}" aria-describedby="${d}"${inv} ${FIELD_STYLE}>`,
    ) +
    field(ctx, LICENCE_ID, t(C.licenceLabel, l), t(C.licenceHint, l), ["no-licence"], (d, inv) =>
      `<select id="${LICENCE_ID}" aria-describedby="${d}"${inv} ${FIELD_STYLE}><option value=""${f.licence === "" ? " selected" : ""}>${esc(t(C.licenceNone, l))}</option>` +
      OPEN_LICENCES.map((x) => `<option value="${esc(x)}"${f.licence === x ? " selected" : ""}>${esc(x)}</option>`).join("") +
      `</select>`,
    ) +
    field(ctx, DATE_ID, t(C.dateLabel, l), t(C.dateHint, l), ["date-empty", "date-bad", "date-future"], (d, inv) =>
      `<input id="${DATE_ID}" type="text" inputmode="numeric" autocomplete="off" maxlength="20" value="${esc(f.recordedOn)}" aria-describedby="${d}"${inv} ${FIELD_STYLE}>`,
    ) +
    `<h4 id="fbd-filter">${esc(t(C.placesTitle, l))}</h4>` +
    `<label for="${SEARCH_ID}">${esc(t(C.searchLabel, l))}</label><input id="${SEARCH_ID}" type="text" autocomplete="off" maxlength="${LIMITS.placeName}" value="${esc(ctx.search)}" ${FIELD_STYLE}>` +
    `<label class="choice" for="${ONLY_ID}" ${CHOICE_STYLE}><input type="checkbox" id="${ONLY_ID}"${ctx.onlyUnknown ? " checked" : ""}>${esc(t(C.onlyUnknown, l))}</label>` +
    `<p>${button(t(C.show, l), { type: "submit", "data-action": "fbd-show" })}</p></form>`
  );
}

export function renderCopy(ctx: FileAddContext, file: StreetFile, plan: readonly PlannedAdd[], o: AddOptions, made: ReadonlySet<string>): string {
  const l = ctx.locale;
  const chosen = plan.filter((a) => made.has(a.place.id));
  const copy = applyAdds(file, chosen.map((a) => a.place), o, ctx.today);
  const differ = chosen.filter((a) => a.outcome === "differs").length;
  return (
    `<h3 id="fbd-copy" tabindex="-1">${esc(t(C.copyTitle, l))}</h3><p id="fbd-copy-summary">${esc(copySummary(copy, differ, l))}</p>` +
    `<p>${link(exportHref(addedFile(copy, ctx.today)), addFilename("copy", ctx.today, l), t(C.downloadCopy, l))} ` +
    `${link(csvHref(addedCsv(copy, chosen)), addFilename("csv", ctx.today, l), t(C.downloadCsv, l))}</p>` +
    `<p class="hint">${esc(t(C.copyHint, l))}</p>`
  );
}

export function renderPlaces(ctx: FileAddContext, file: StreetFile, plan: readonly PlannedAdd[], o: AddOptions): string {
  const l = ctx.locale;
  const record = o.key !== "" && o.value !== "" ? recordText(o.key, o.value, sourceOf(o), o.licence, o.recordedOn.trim(), l) : "";
  const head =
    `<h3 id="fbd-list" tabindex="-1">${esc(`${t(C.listTitle, l)} (${plan.length})`)}</h3>` +
    `<p id="fbd-the-record"><span data-user-content>${esc(record)}</span></p><p id="fbd-summary">${esc(listSummary(plan, l))}</p>`;
  if (plan.length === 0 || plan.every((a) => a.outcome === "repeat"))
    return `${head}${plan.length === 0 ? "" : `<ul class="fbd-places">${plan.map((a, i) => `<li><p class="hint" id="fbd-repeat-${i}"><span data-user-content>${esc(plannedText(a, l))}</span></p></li>`).join("")}</ul>`}<p id="fbd-none">${esc(t(plan.length === 0 ? C.none : C.allRepeat, l))}</p>`;
  const noPlaces = ctx.problems.includes("no-places");
  return (
    head +
    `<p>${button(t(C.tickAll, l), { "data-action": "fbd-tick-all", class: "secondary" })} ${button(t(C.untickAll, l), { "data-action": "fbd-untick-all", class: "secondary" })}</p>` +
    `<form id="fbd-places-form" novalidate><fieldset${noPlaces ? ' aria-describedby="e-fbd-places"' : ""}><legend>${esc(t(C.listTitle, l))}</legend>` +
    (noPlaces ? `<p id="e-fbd-places" class="error">${esc(addProblemText("no-places", l))}</p>` : "") +
    `<ul class="fbd-places">${plan
      .map((a, i) =>
        a.outcome === "repeat"
          ? `<li><p class="hint" id="fbd-repeat-${i}"><span data-user-content>${esc(plannedText(a, l))}</span></p></li>`
          : `<li>${choice("checkbox", placeBoxId(i), "place", a.place.id, ctx.ticked.has(a.place.id), plannedText(a, l), true)}</li>`,
      )
      .join("")}</ul></fieldset>` +
    `<p>${button(t(C.make, l), { type: "submit", "data-action": "fbd-make" })}</p></form>` +
    (ctx.made ? renderCopy(ctx, file, plan, o, ctx.made) : "")
  );
}

export function renderFileAdd(ctx: FileAddContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  const errors = [
    ...(err ? [`<li><a href="#${ADD_TEXT_ID}">${esc(addErrorText(err, l))}</a></li>`] : []),
    ...ctx.problems.map((p) => {
      // A place that already holds the record has no tick box, so the link goes to the first one that does.
      const target = p === "no-places" ? placeBoxId(Math.max(0, (ctx.plan ?? []).findIndex((a) => a.outcome !== "repeat"))) : problemTarget(p);
      return `<li><a href="#${target}">${esc(addProblemText(p, l))}</a></li>`;
    }),
  ];
  return (
    `<div class="app fileadd-app" lang="${l}"><section lang="${l}" aria-labelledby="fbd-title" class="fileadd">` +
    `<h2 id="fbd-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.rule, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fbd-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="fbd-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="fbd-file-form" novalidate>` +
    `<label for="${ADD_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${ADD_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${ADD_TEXT_ID}" class="error">${esc(addErrorText(err, l))}</p>` : "") +
    `<textarea id="${ADD_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${ADD_TEXT_ID}${err ? ` e-${ADD_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${ADD_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${ADD_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "fbd-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fbd-clear", class: "secondary" })}</p>` +
    (ctx.file ? renderRecordForm(ctx) : "") +
    (ctx.file && ctx.plan && ctx.options ? renderPlaces(ctx, ctx.file, ctx.plan, ctx.options) : "") +
    `</section></div>`
  );
}

/** The record and the place filters as on the form. */
export function readRecord(root: ParentNode): { form: AddOptions; search: string; onlyUnknown: boolean } {
  const checked = (name: string): string => root.querySelector<HTMLInputElement>(`#fbd-options-form input[name="${name}"]:checked`)?.value ?? "";
  const value = (id: string): string => root.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)?.value ?? "";
  const key = checked("key");
  const v = checked("value");
  const who = checked("who");
  return {
    form: {
      key: (FACT_KEYS as readonly string[]).includes(key) ? (key as FactKey) : "",
      value: v === "yes" || v === "no" ? v : "",
      who: who === "me" || who === "source" ? who : "",
      source: value(SOURCE_ID),
      licence: value(LICENCE_ID),
      recordedOn: value(DATE_ID),
    },
    search: value(SEARCH_ID),
    onlyUnknown: root.querySelector<HTMLInputElement>(`#${ONLY_ID}`)?.checked ?? false,
  };
}

/** The places ticked on the page, by place id. */
export function readTicked(root: ParentNode, plan: readonly PlannedAdd[]): Set<string> {
  const out = new Set<string>();
  plan.forEach((a, i) => {
    if (root.querySelector<HTMLInputElement>(`#${placeBoxId(i)}`)?.checked) out.add(a.place.id);
  });
  return out;
}
