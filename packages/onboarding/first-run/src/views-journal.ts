import type { Locale } from "../../switch-first/src/index";
import { t } from "./copy";
import { button, esc } from "./html";
import { monthLabel } from "./latest";
import { placeLabel } from "./survey-copy";
import { textExportHref } from "./textexport";
import {
  JOURNAL_COPY,
  JOURNAL_KINDS,
  KIND_FILTER_COPY,
  byMonth,
  entryCountText,
  entryHeading,
  filterJournal,
  journalFilename,
  journalPlaces,
  journalText,
  journalKindCounts,
  type JournalEntry,
  type JournalFilter,
} from "./journal";

export interface JournalContext {
  readonly entries: readonly JournalEntry[];
  readonly filter: JournalFilter;
  /** What was typed in the "since" box when it is not a day; the filter keeps its last good day. */
  readonly sinceTyped?: string | undefined;
  readonly locale: Locale;
  readonly today: Date;
}

const LINK_STYLE = "display:inline-flex;align-items:center;min-width:44px;min-height:44px";
const CHOICE_STYLE = "min-height:44px;min-width:44px";

function entryHtml(e: JournalEntry, i: number, l: Locale): string {
  const id = `journal-${i}`;
  const lines = e.lines.length === 0 ? "" : `<ul>${e.lines.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  const own = e.own ? `<p>${esc(t(JOURNAL_COPY.ownWords, l))}${l === "fr" ? "\u00A0:" : ":"} <span data-user-content>${esc(e.own)}</span></p>` : "";
  // The place's name is the person's own words, marked so; the rest of the heading is the App's.
  const where = placeLabel(e.placeName, e.address ?? "");
  const heading = e.placeId === "" ? esc(entryHeading(e, l)) : `${esc(entryHeading(e, l).slice(0, -where.length))}<span data-user-content>${esc(where)}</span>`;
  return `<li class="journal-entry" data-kind="${e.kind}" aria-labelledby="${id}"><p id="${id}"><strong>${heading}</strong></p>${lines}${own}</li>`;
}

/** The boxes and the place list that choose what is shown. */
export function renderJournalFilter(ctx: JournalContext): string {
  const l = ctx.locale;
  const places = journalPlaces(ctx.entries);
  const boxes = JOURNAL_KINDS.map(
    (k) =>
      `<label class="choice" style="${CHOICE_STYLE}"><input type="checkbox" data-action="journal-kind" data-value="${k}"${ctx.filter.kinds.includes(k) ? " checked" : ""}>${esc(t(KIND_FILTER_COPY[k], l))}</label>`,
  ).join("");
  const options =
    `<option value=""${ctx.filter.placeId === "" ? " selected" : ""}>${esc(t(JOURNAL_COPY.everyPlace, l))}</option>` +
    places.map((p) => `<option value="${esc(p.id)}"${p.id === ctx.filter.placeId ? " selected" : ""} data-user-content>${esc(p.name)}</option>`).join("");
  return (
    `<fieldset class="journal-kinds"><legend>${esc(t(JOURNAL_COPY.kindsLegend, l))}</legend>${boxes}</fieldset>` +
    `<label for="journal-place">${esc(t(JOURNAL_COPY.placeLabel, l))}</label>` +
    `<select id="journal-place" data-action="journal-place" style="min-height:44px">${options}</select>` +
    sinceField(ctx)
  );
}

function sinceField(ctx: JournalContext): string {
  const l = ctx.locale;
  const bad = ctx.sinceTyped !== undefined;
  return (
    `<label for="journal-since">${esc(t(JOURNAL_COPY.sinceLabel, l))}</label>` +
    `<p id="journal-since-hint" class="hint">${esc(t(JOURNAL_COPY.sinceHint, l))}</p>` +
    (bad ? `<p id="journal-since-error" class="error">${esc(t(JOURNAL_COPY.sinceError, l))}</p>` : "") +
    `<input id="journal-since" type="text" inputmode="numeric" maxlength="10" autocomplete="off" value="${esc(bad ? (ctx.sinceTyped ?? "") : (ctx.filter.since ?? ""))}" ` +
    `aria-describedby="journal-since-hint${bad ? " journal-since-error" : ""}"${bad ? ' aria-invalid="true"' : ""} style="min-height:44px">`
  );
}

export function renderJournal(ctx: JournalContext): string {
  const l = ctx.locale;
  const shown = filterJournal(ctx.entries, ctx.filter);
  const months = byMonth(shown)
    .map(({ month, entries }, m) => {
      const id = `journal-month-${m}`;
      const start = shown.indexOf(entries[0] as JournalEntry);
      return `<section aria-labelledby="${id}"><h3 id="${id}">${esc(monthLabel(month, l))}</h3><ul class="plain journal">${entries.map((e, i) => entryHtml(e, start + i, l)).join("")}</ul></section>`;
    })
    .join("");
  const body =
    ctx.entries.length === 0
      ? `<p>${esc(t(JOURNAL_COPY.none, l))}</p>`
      : renderJournalFilter(ctx) +
        `<p id="journal-count">${esc(entryCountText(shown.length, ctx.entries.length, l))}</p>` +
        (shown.length === 0 ? "" : `<ul class="journal-counts" aria-labelledby="journal-count">${journalKindCounts(shown, l).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`) +
        (shown.length === 0 ? `<p>${esc(t(JOURNAL_COPY.noneShown, l))}</p>` : months) +
        `<p><a class="linkbtn" data-journal-download download="${esc(journalFilename(ctx.today, l))}" href="${esc(textExportHref(journalText(shown, l)))}" style="${LINK_STYLE}">${esc(t(JOURNAL_COPY.download, l))}</a></p>`;
  return (
    `<section lang="${l}" aria-labelledby="view-title" class="journal-page">` +
    `<h2 id="view-title">${esc(t(JOURNAL_COPY.title, l))}</h2>` +
    `<p>${esc(t(JOURNAL_COPY.intro, l))}</p>` +
    body +
    `<p>${button(t(JOURNAL_COPY.back, l), { "data-action": "view", "data-value": "notes", class: "secondary" })}</p>` +
    `</section>`
  );
}
