import type { Locale } from "../../switch-first/src/index";
import { COPY, groupHeading, t } from "./copy";
import { exportFilename, exportHref } from "./exchange";
import { FACT_KEYS, type FactKey } from "./facts";
import { groupNotes, hasRequirement, type Grouped, type Requirement } from "./filter";
import { button, esc } from "./html";
import type { Note } from "./model";
import { renderFactList } from "./views";

export interface NotesContext {
  readonly notes: readonly Note[];
  readonly req: Requirement;
  readonly query: string;
  readonly locale: Locale;
  readonly today: Date;
  readonly pendingRemove: string | undefined;
  readonly exportText: string | undefined;
  readonly importText: string;
  readonly importMessage: string | undefined;
  readonly statusMessage: string | undefined;
}

const CHOICES: ReadonlyArray<"any" | "yes" | "no"> = ["any", "yes", "no"];

function choiceLabel(c: "any" | "yes" | "no", locale: Locale): string {
  return c === "any" ? t(COPY.notes.any, locale) : t(COPY.values[c], locale);
}

export function renderFilter(req: Requirement, query: string, locale: Locale): string {
  const rows = FACT_KEYS.map((k: FactKey) => {
    const id = `filter-${k}`;
    const current = req[k] ?? "any";
    const buttons = CHOICES.map((c) =>
      button(choiceLabel(c, locale), {
        "data-action": "filter",
        "data-key": k,
        "data-value": c,
        "aria-pressed": String(current === c),
      }),
    ).join("");
    return `<div role="group" aria-labelledby="${id}"><span id="${id}"><strong>${esc(t(COPY.facts[k], locale))}</strong></span> ${buttons}</div>`;
  }).join("");
  return (
    `<fieldset><legend>${esc(t(COPY.notes.filterTitle, locale))}</legend>${rows}</fieldset>` +
    `<label for="q">${esc(t(COPY.notes.searchLabel, locale))}</label>` +
    `<input id="q" name="q" type="search" autocomplete="off" value="${esc(query)}" style="min-height:44px">`
  );
}

function renderCard(n: Note, ctx: NotesContext): string {
  const titleId = `note-title-${n.id}`;
  const confirming = ctx.pendingRemove === n.id;
  const actions = confirming
    ? button(t(COPY.notes.confirmRemove, ctx.locale), { "data-action": "confirm-remove", "data-value": n.id, "aria-describedby": titleId }) +
      button(t(COPY.notes.cancel, ctx.locale), { "data-action": "cancel-remove", "data-value": n.id, class: "secondary" })
    : button(t(COPY.notes.remove, ctx.locale), { "data-action": "remove-note", "data-value": n.id, "aria-describedby": titleId, class: "secondary" });
  return (
    `<article class="card"><h4 id="${esc(titleId)}"><span data-user-content>${esc(n.placeName)}</span></h4>` +
    (n.address ? `<p class="muted"><span data-user-content>${esc(n.address)}</span></p>` : "") +
    renderFactList(n.facts, ctx.locale, ctx.today) +
    (n.note ? `<p><span data-user-content>${esc(n.note)}</span></p>` : "") +
    `<p>${actions}</p></article>`
  );
}

function renderGroup(title: string, list: readonly Note[], ctx: NotesContext, explain?: string): string {
  const body = list.length === 0 ? `<p class="muted">${esc(t(COPY.notes.noResults, ctx.locale))}</p>` : list.map((n) => renderCard(n, ctx)).join("");
  return `<h3>${esc(groupHeading(title, list.length))}</h3>${explain ? `<p class="muted">${esc(explain)}</p>` : ""}${body}`;
}

/** The results area: replaced on its own when the filter or search changes. */
export function renderResults(ctx: NotesContext): string {
  if (ctx.notes.length === 0) return `<p>${esc(t(COPY.notes.empty, ctx.locale))}</p>`;
  const g: Grouped = groupNotes(ctx.notes, ctx.req, ctx.query, ctx.locale);
  if (!hasRequirement(ctx.req)) {
    return renderGroup(t(COPY.notes.all, ctx.locale), g.matches, ctx);
  }
  return (
    renderGroup(t(COPY.notes.matches, ctx.locale), g.matches, ctx) +
    renderGroup(t(COPY.notes.unknown, ctx.locale), g.unknown, ctx, t(COPY.notes.unknownExplain, ctx.locale)) +
    renderGroup(t(COPY.notes.excluded, ctx.locale), g.excluded, ctx)
  );
}

function renderExport(ctx: NotesContext): string {
  const l = ctx.locale;
  if (ctx.exportText === undefined) {
    return button(t(COPY.notes.export, l), { "data-action": "export-open", class: "secondary" });
  }
  const name = exportFilename(ctx.today.toISOString().slice(0, 10));
  return (
    `<p>${esc(t(COPY.notes.exportHint, l))}</p>` +
    `<label for="export-text">${esc(t(COPY.notes.exportLabel, l))}</label>` +
    `<textarea id="export-text" readonly rows="8" data-audit-skip style="min-height:44px">${esc(ctx.exportText)}</textarea>` +
    `<p><a class="linkbtn" download="${esc(name)}" href="${esc(exportHref(ctx.exportText))}" style="display:inline-flex;align-items:center;min-width:44px;min-height:44px">${esc(t(COPY.notes.download, l))}</a></p>`
  );
}

function renderImport(ctx: NotesContext): string {
  const l = ctx.locale;
  return (
    `<label for="import-text">${esc(t(COPY.notes.importLabel, l))}</label>` +
    `<textarea id="import-text" rows="4" data-audit-skip style="min-height:44px">${esc(ctx.importText)}</textarea>` +
    `<p>${button(t(COPY.notes.importButton, l), { "data-action": "import-run", class: "secondary" })}</p>` +
    (ctx.importMessage ? `<p id="import-message" class="notice" role="status">${esc(ctx.importMessage)}</p>` : "")
  );
}

export function renderNotes(ctx: NotesContext): string {
  const l = ctx.locale;
  return (
    `<section lang="${l}" aria-labelledby="view-title">` +
    `<h2 id="view-title">${esc(t(COPY.notes.title, l))}</h2>` +
    `<p>${esc(t(COPY.notes.intro, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" role="status">${esc(ctx.statusMessage)}</p>` : "") +
    `<p>${button(t(COPY.notes.add, l), { "data-action": "add-note" })}</p>` +
    renderFilter(ctx.req, ctx.query, l) +
    `<div id="results">${renderResults(ctx)}</div>` +
    `<h3>${esc(t(COPY.notes.export, l))}</h3>${renderExport(ctx)}` +
    `<h3>${esc(t(COPY.notes.import, l))}</h3>${renderImport(ctx)}` +
    `</section>`
  );
}
