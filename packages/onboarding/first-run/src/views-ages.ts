import type { Locale } from "../../switch-first/src/index";
import { AGE_BANDS, ageRange, agesFilename, agesReport, agesToText, bandLabel, type AgeRow } from "./ages";
import { COPY, NB, t } from "./copy";
import { button, esc } from "./html";
import type { Place } from "./places";
import { downloadLink } from "./views-sources";

function row(r: AgeRow, l: Locale): string {
  return (
    `<tr><th scope="row">${esc(t(COPY.facts[r.key], l))}</th>` +
    AGE_BANDS.map((b) => `<td data-col="${b}">${r.bands[b]}</td>`).join("") +
    `<td data-col="records">${r.records}</td>` +
    `<td data-col="unknown">${r.unknownPlaces}</td>` +
    `<td data-col="range">${esc(ageRange(r, l))}</td></tr>`
  );
}

/** The "how old the records are" page: counts of records by age for each detail. It counts and does not judge. */
export function renderAges(places: readonly Place[], locale: Locale, today: Date): string {
  const l = locale;
  const report = agesReport(places, today);
  const colon = l === "fr" ? `${NB}:` : ":";
  const back = button(t(COPY.places.back, l), { "data-action": "view", "data-value": "places", class: "secondary" });
  const head =
    `<h2 id="view-title">${esc(t(COPY.ages.title, l))}</h2><p>${esc(t(COPY.ages.intro, l))}</p>` +
    `<p class="notice" role="note">${esc(t(COPY.ages.notWrong, l))}</p>`;
  const totals =
    `<ul class="totals"><li>${esc(t(COPY.ages.records, l))}${colon} <strong data-ages-records>${report.records}</strong></li>` +
    `<li>${esc(t(COPY.ages.oldRecords, l))}${colon} <strong data-ages-old>${report.old}</strong></li></ul>`;
  if (report.records === 0) {
    return `<section lang="${l}" aria-labelledby="view-title">${head}${totals}<p>${esc(t(COPY.ages.empty, l))}</p><p>${back}</p></section>`;
  }
  const th = (text: string): string => `<th scope="col">${esc(text)}</th>`;
  const table =
    `<div class="table-wrap" role="region" aria-labelledby="ages-caption" tabindex="0">` +
    `<table class="data ages" data-kind="ages" data-places="${report.places}"><caption id="ages-caption">${esc(t(COPY.ages.caption, l))}</caption>` +
    `<thead><tr>${th(t(COPY.ages.detail, l))}${AGE_BANDS.map((b) => th(bandLabel(b, l))).join("")}${th(t(COPY.ages.total, l))}${th(t(COPY.ages.noRecord, l))}${th(t(COPY.ages.range, l))}</tr></thead>` +
    `<tbody>${report.rows.map((r) => row(r, l)).join("")}</tbody></table></div>`;
  const review = button(t(COPY.places.viewReview, l), { "data-action": "view", "data-value": "review", class: "secondary" });
  return (
    `<section lang="${l}" aria-labelledby="view-title">${head}${totals}${table}` +
    `<p class="hint">${esc(t(COPY.textExport.keepNote, l))}</p>` +
    `<p>${downloadLink(agesToText(report, l, today), agesFilename(today, l), l, COPY.ages.download)}${review}${back}</p></section>`
  );
}
