import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t, type Pair } from "./copy";
import { button, esc } from "./html";
import { renderLicences } from "./licences";
import { collectSources, rangeText, sourceName, sourcesToText, type SourceRow, type SourcesReport } from "./sources";
import type { Note } from "./model";
import type { Place } from "./places";
import { textExportHref } from "./textexport";

const LINK_STYLE = "display:inline-flex;align-items:center;min-width:44px;min-height:44px";

/** A download link for plain text. Built here so every page makes it the same way. */
export function downloadLink(text: string, filename: string, locale: Locale, label: Pair = COPY.textExport.download): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(textExportHref(text))}" style="${LINK_STYLE}">${esc(t(label, locale))}</a>`;
}

function row(r: SourceRow, locale: Locale): string {
  const l = locale;
  return (
    `<tr><th scope="row"><span data-user-content>${esc(sourceName(r.source, l))}</span></th>` +
    `<td data-col="details">${r.details}</td>` +
    `<td data-col="yes">${r.yes}</td>` +
    `<td data-col="no">${r.no}</td>` +
    `<td data-col="licences">${esc(r.licences.join(", "))}</td>` +
    `<td data-col="range">${esc(rangeText(r.oldest, r.newest))}</td>` +
    `<td data-col="old">${r.old}</td></tr>`
  );
}

function totals(report: SourcesReport, l: Locale): string {
  const items = [
    `<li>${esc(t(COPY.sources.recorded, l))}${l === "fr" ? NB : ""}: <strong>${report.recorded}</strong></li>`,
    `<li>${esc(t(COPY.sources.unknown, l))}${l === "fr" ? NB : ""}: <strong>${report.unknown}</strong></li>`,
  ];
  return `<ul class="totals">${items.join("")}</ul>`;
}

/** The "where details come from" page. It records origin; it never judges a source. */
export function renderSources(notes: readonly Note[], locale: Locale, today: Date): string {
  const l = locale;
  const report = collectSources(notes, today);
  const back = button(t(COPY.places.back, l), { "data-action": "view", "data-value": "places", class: "secondary" });
  const head = `<h2 id="view-title">${esc(t(COPY.sources.title, l))}</h2><p>${esc(t(COPY.sources.intro, l))}</p><p class="notice" role="note">${esc(t(COPY.sources.notACheck, l))}</p>`;
  if (report.rows.length === 0) {
    return `<section lang="${l}" aria-labelledby="view-title">${head}${totals(report, l)}<p>${esc(t(COPY.sources.empty, l))}</p><p>${back}</p></section>`;
  }
  const th = (label: string): string => `<th scope="col">${esc(label)}</th>`;
  const table =
    `<div class="table-wrap" role="region" aria-labelledby="sources-caption" tabindex="0">` +
    `<table class="data sources" data-kind="sources"><caption id="sources-caption">${esc(t(COPY.sources.caption, l))}</caption>` +
    `<thead><tr>${th(t(COPY.sources.source, l))}${th(t(COPY.sources.details, l))}${th(t(COPY.values.yes, l))}${th(t(COPY.values.no, l))}${th(t(COPY.sources.licences, l))}${th(t(COPY.sources.range, l))}${th(t(COPY.sources.old, l))}</tr></thead>` +
    `<tbody>${report.rows.map((r) => row(r, l)).join("")}</tbody></table></div>`;
  const text = sourcesToText(report, l);
  return (
    `<section lang="${l}" aria-labelledby="view-title">${head}${totals(report, l)}${table}` +
    `<p class="hint">${esc(t(COPY.textExport.keepNote, l))}</p>` +
    `<p>${downloadLink(text, `sources-${today.toISOString().slice(0, 10)}-${l}.txt`, l)}${back}</p>` +
    `${renderLicences(notes, l, today)}</section>`
  );
}

/** "1 detail", "3 details", "1 détail", "3 détails". */
export function detailCount(n: number, locale: Locale): string {
  if (locale === "fr") return n > 1 ? `${n} détails` : `${n} détail`;
  return n === 1 ? "1 detail" : `${n} details`;
}

/** On one place's page: which sources its recorded details came from. Unknown details are not listed. */
export function renderPlaceSources(place: Place, locale: Locale, today: Date): string {
  const l = locale;
  const report = collectSources(place.notes, today);
  const body =
    report.rows.length === 0
      ? `<p>${esc(t(COPY.sources.placeNone, l))}</p>`
      : `<ul class="place-sources">${report.rows
          .map(
            (r) =>
              `<li><span data-user-content>${esc(sourceName(r.source, l))}</span>${l === "fr" ? NB : ""}: ${esc(detailCount(r.details, l))}, ${esc(rangeText(r.oldest, r.newest))}</li>`,
          )
          .join("")}</ul>`;
  return `<h3>${esc(t(COPY.sources.placeTitle, l))}</h3>${body}`;
}
