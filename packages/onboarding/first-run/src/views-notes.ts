import type { NotesPreview } from "./importpreview";
import { VISIT_COPY } from "./visits";
import { JOURNAL_COPY } from "./journal";
import { CSV_IMPORT_COPY, csvTakeBackLabel } from "./csvimport";
import { ASKED_COPY } from "./asked";
import { BIN_COPY } from "./bin";
import { SHARE_COPY } from "./share";
import { PASSPORT_COPY } from "./passport";
import { CSV_COPY, csvFilename, csvHref, notesToCsv, notesToWideCsv, wideCsvFilename } from "./notes-csv";
import { EDIT_COPY, correctionDetails, correctionLine, correctionsOf, editable, lastCorrection, type Correction } from "./noteedit";
import { renderImportPreview } from "./views-importpreview";
import type { Locale } from "../../switch-first/src/index";
import { COPY, groupHeading, t } from "./copy";
import { exportFilename, exportHref } from "./exchange";
import { FACT_KEYS, type FactKey } from "./facts";
import { groupNotes, hasRequirement, type Grouped, type Requirement } from "./filter";
import { button, esc } from "./html";
import { checkNotes, flagLabel, noteFlags } from "./notecheck";
import type { Note } from "./model";
import { renderFactList } from "./views";
import { renderNeedsBar } from "./views-places";

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
  readonly importPreview?: NotesPreview | undefined;
  readonly statusMessage: string | undefined;
  readonly hasSavedNeeds: boolean;
  /** How many places in "Questions you sent" are waiting for an answer. */
  readonly askedWaiting?: number;
  /** Corrections made on this device, newest first, to show on each note. */
  readonly corrections?: readonly Correction[];
  /** How many notes are in "Recently removed". */
  readonly binCount?: number;
  /** The note just removed, offered back right away with an "Undo" button. */
  readonly undoId?: string | undefined;
  /** How many notes were just added from a spreadsheet, offered to be taken back right away. */
  readonly csvJustAdded?: number;
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
        // The name starts with the visible words and adds the detail, so "Yes" is not four buttons with one name.
        "aria-label": `${choiceLabel(c, locale)}, ${t(COPY.facts[k], locale)}`,
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

/**
 * The same plain facts the notes-to-check page lists, shown on the note
 * itself: no Yes or No, only old records, no address. Nothing when none apply.
 */
function noteFlagLine(n: Note, l: Locale, today: Date): string {
  const flags = noteFlags(n, today);
  if (flags.length === 0) return "";
  return `<p class="muted" data-note-flags="${flags.join(" ")}">${esc(flags.map((f) => flagLabel(f, l)).join(" · "))}</p>`;
}

/** How many notes the notes-to-check page lists. Nothing when there are none. */
function flaggedLine(notes: readonly Note[], l: Locale, today: Date): string {
  const n = checkNotes(notes, today).flagged.length;
  if (n === 0) return "";
  return `<p class="hint" data-notes-flagged="${n}">${esc(t(COPY.noteCheck.title, l))}${l === "fr" ? "\u00A0:" : ":"} ${n}</p>`;
}

function renderCard(n: Note, ctx: NotesContext): string {
  const titleId = `note-title-${n.id}`;
  const confirming = ctx.pendingRemove === n.id;
  const actions = confirming
    ? button(t(COPY.notes.confirmRemove, ctx.locale), { "data-action": "confirm-remove", "data-value": n.id, "aria-describedby": titleId }) +
      button(t(COPY.notes.cancel, ctx.locale), { "data-action": "cancel-remove", "data-value": n.id, class: "secondary" })
    : (editable(n) === "editable"
        ? button(t(EDIT_COPY.correct, ctx.locale), { "data-action": "edit-note", "data-value": n.id, "aria-describedby": titleId, class: "secondary" })
        : "") +
      button(t(COPY.notes.remove, ctx.locale), { "data-action": "remove-note", "data-value": n.id, "aria-describedby": titleId, class: "secondary" });
  const fix = lastCorrection(ctx.corrections ?? [], n.id);
  const all = correctionsOf(ctx.corrections ?? [], n.id);
  const correctedLine = fix
    ? `<p class="muted" data-corrected="${esc(fix.on)}">${esc(correctionLine(fix, ctx.locale))}</p>` +
      `<details data-note-history><summary style="min-height:44px;display:flex;align-items:center">${esc(t(EDIT_COPY.history, ctx.locale))} (${all.length})</summary><ul>` +
      all
        .map((c) => `<li><span>${esc(c.on)}</span><ul>${correctionDetails(c, ctx.locale).map((x) => `<li><span data-user-content>${esc(x)}</span></li>`).join("")}</ul></li>`)
        .join("") +
      `</ul></details>`
    : "";
  // Why a note has no "Correct" button: another source's words, or details with different dates or licences.
  const why = editable(n);
  const notOwn =
    why === "not-own"
      ? `<p class="hint" data-not-own>${esc(t(EDIT_COPY.notOwn, ctx.locale))}</p>`
      : why === "mixed"
        ? `<p class="hint" data-mixed>${esc(t(EDIT_COPY.mixed, ctx.locale))}</p>`
        : "";
  return (
    `<article class="card"><h4 id="${esc(titleId)}"><span data-user-content>${esc(n.placeName)}</span></h4>` +
    (n.address ? `<p class="muted"><span data-user-content>${esc(n.address)}</span></p>` : "") +
    noteFlagLine(n, ctx.locale, ctx.today) +
    renderFactList(n.facts, ctx.locale, ctx.today) +
    (n.note ? `<p><span data-user-content>${esc(n.note)}</span></p>` : "") +
    correctedLine +
    notOwn +
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

/** The spreadsheet download, when there are notes to put in it. */
function renderCsv(ctx: NotesContext): string {
  const l = ctx.locale;
  if (ctx.notes.length === 0) return "";
  return (
    `<p class="hint" id="csv-hint">${esc(t(CSV_COPY.hint, l))}</p>` +
    `<p><a class="linkbtn" data-notes-csv download="${esc(csvFilename(ctx.today, l))}" href="${esc(csvHref(notesToCsv(ctx.notes)))}" aria-describedby="csv-hint" ` +
    `style="display:inline-flex;align-items:center;min-width:44px;min-height:44px">${esc(t(CSV_COPY.download, l))}</a>` +
    `<a class="linkbtn" data-notes-wide-csv download="${esc(wideCsvFilename(ctx.today))}" href="${esc(csvHref(notesToWideCsv(ctx.notes)))}" ` +
    `style="display:inline-flex;align-items:center;min-width:44px;min-height:44px">${esc(t(CSV_COPY.wide, l))}</a></p>`
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
    `<p>${button(t(COPY.notes.importButton, l), { "data-action": "import-run", class: "secondary" })}` +
    `${button(t(COPY.preview.button, l), { "data-action": "import-preview", class: "secondary" })}</p>` +
    (ctx.importPreview ? renderImportPreview(ctx.importPreview, l) : "") +
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
    (ctx.undoId ? `<p>${button(t(BIN_COPY.undo, l), { "data-action": "bin-restore", "data-value": ctx.undoId })}</p>` : "") +
    (ctx.csvJustAdded ? `<p>${button(csvTakeBackLabel(ctx.csvJustAdded, l), { "data-action": "csv-undo" })}</p>` : "") +
    `<p>${button(t(COPY.notes.add, l), { "data-action": "add-note" })}` +
    `${button(t(COPY.places.viewPlaces, l), { "data-action": "view", "data-value": "places", class: "secondary" })}` +
    `${button(t(COPY.noteCheck.open, l), { "data-action": "view", "data-value": "notecheck", class: "secondary" })}` +
    `${button(`${t(ASKED_COPY.open, l)} (${ctx.askedWaiting ?? 0} ${t(ASKED_COPY.waitingCount, l)})`, { "data-action": "view", "data-value": "asked", class: "secondary" })}` +
    `${button(`${t(BIN_COPY.open, l)} (${ctx.binCount ?? 0})`, { "data-action": "view", "data-value": "removed", class: "secondary" })}` +
    (ctx.notes.length > 0 ? button(t(SHARE_COPY.open, l), { "data-action": "view", "data-value": "share", class: "secondary" }) : "") +
    button(t(PASSPORT_COPY.open, l), { "data-action": "view", "data-value": "passport", class: "secondary" }) +
    button(t(VISIT_COPY.open, l), { "data-action": "view", "data-value": "visits", class: "secondary" }) +
    button(t(JOURNAL_COPY.open, l), { "data-action": "view", "data-value": "journal", class: "secondary" }) +
    `</p>` +
    flaggedLine(ctx.notes, l, ctx.today) +
    renderFilter(ctx.req, ctx.query, l) +
    renderNeedsBar(hasRequirement(ctx.req), ctx.hasSavedNeeds, l) +
    `<div id="results">${renderResults(ctx)}</div>` +
    `<h3>${esc(t(COPY.notes.export, l))}</h3>${renderExport(ctx)}` +
    renderCsv(ctx) +
    `<p>${button(t(CSV_IMPORT_COPY.open, l), { "data-action": "view", "data-value": "csvimport", class: "secondary" })}</p>` +
    `<h3>${esc(t(COPY.notes.import, l))}</h3>${renderImport(ctx)}` +
    `</section>`
  );
}
