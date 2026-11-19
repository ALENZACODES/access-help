import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";
import { FACT_KEYS } from "./facts";
import { changeLabel, historyFilename, historyToText, placeHistory, recordCount, type DetailHistory, type HistoryEntry } from "./history";
import { button, esc } from "./html";
import type { Place } from "./places";
import { distinctRecords } from "./repeats";
import { recordParts } from "./tier";
import { downloadLink } from "./views-sources";

function entryRow(e: HistoryEntry, l: Locale): string {
  const r = recordParts(e.provenance, l);
  return (
    `<tr data-change="${e.change}"><th scope="row">${esc(r.date)}</th>` +
    `<td data-col="answer">${esc(t(COPY.values[e.value], l))}</td>` +
    `<td data-col="source"><span data-user-content>${esc(r.source)}</span></td>` +
    `<td data-col="licence">${esc(r.licence)}</td>` +
    `<td data-col="tier">${esc(r.tier)}</td>` +
    `<td data-col="kind">${esc(r.kind)}</td>` +
    `<td data-col="change">${esc(changeLabel(e.change, l))}</td></tr>`
  );
}

function detailBlock(d: DetailHistory, l: Locale): string {
  const label = t(COPY.facts[d.key], l);
  const head = `<h3 id="history-${d.key}">${esc(label)}</h3>`;
  if (d.entries.length === 0) {
    return `${head}<p data-history-unknown="${d.key}"><strong>${esc(t(COPY.values.unknown, l))}</strong>. ${esc(t(COPY.history.none, l))}</p>`;
  }
  const th = (text: string): string => `<th scope="col">${esc(text)}</th>`;
  const captionId = `history-caption-${d.key}`;
  const caption = `${t(COPY.history.caption, l)}${l === "fr" ? NB : ""}: ${label} (${recordCount(d.entries.length, l)})`;
  return (
    head +
    `<div class="table-wrap" role="region" aria-labelledby="${captionId}" tabindex="0">` +
    `<table class="data history" data-kind="history" data-key="${d.key}"><caption id="${captionId}">${esc(caption)}</caption>` +
    `<thead><tr>${th(t(COPY.history.date, l))}${th(t(COPY.history.answer, l))}${th(t(COPY.sources.source, l))}${th(t(COPY.sources.licences, l))}` +
    `${th(t(COPY.tier.column, l))}${th(t(COPY.tier.kind, l))}${th(t(COPY.history.change, l))}</tr></thead>` +
    `<tbody>${d.entries.map((e) => entryRow(e, l)).join("")}</tbody></table></div>`
  );
}

/** The record history of one place. Every row is one record with its source, licence, date and tier. */
export function renderHistory(place: Place | undefined, locale: Locale, today: Date): string {
  const l = locale;
  const back = button(t(COPY.places.back, l), { "data-action": "view", "data-value": "places", class: "secondary" });
  if (!place) {
    return (
      `<section lang="${l}" aria-labelledby="view-title"><h2 id="view-title">${esc(t(COPY.history.title, l))}</h2>` +
      `<p class="notice" role="note">${esc(t(COPY.places.notFound, l))}</p><p>${back}</p></section>`
    );
  }
  const history = placeHistory(place);
  const colon = l === "fr" ? `${NB}:` : ":";
  const distinct = FACT_KEYS.reduce((n, k) => n + distinctRecords(place, k), 0);
  // A record held by several notes is counted once here, and the person is told where to look.
  const repeated =
    distinct < history.records
      ? `<p data-history-repeated>${esc(t(COPY.history.repeated, l))} ${button(t(COPY.places.viewRepeats, l), { "data-action": "view", "data-value": "repeats", class: "secondary" })}</p>`
      : "";
  const toPlace = button(t(COPY.history.backToPlace, l), { "data-action": "open-place", "data-value": place.id });
  return (
    `<section lang="${l}" aria-labelledby="view-title">` +
    `<h2 id="view-title">${esc(t(COPY.history.title, l))}${colon} <span data-user-content>${esc(place.name)}</span></h2>` +
    (place.address ? `<p class="muted"><span data-user-content>${esc(place.address)}</span></p>` : "") +
    `<p>${esc(t(COPY.history.intro, l))}</p>` +
    `<p class="notice" role="note">${esc(t(COPY.history.noPick, l))}</p>` +
    `<p class="hint">${esc(t(COPY.tier.explain, l))}</p>` +
    `<ul class="totals"><li>${esc(t(COPY.history.records, l))}${colon} <strong data-history-records>${history.records}</strong></li>` +
    `<li>${esc(t(COPY.history.distinct, l))}${colon} <strong data-history-distinct>${distinct}</strong></li></ul>` +
    repeated +
    (history.records === 0 ? `<p>${esc(t(COPY.history.noRecords, l))}</p>` : "") +
    history.details.map((d) => detailBlock(d, l)).join("") +
    `<p class="hint">${esc(t(COPY.textExport.keepNote, l))}</p>` +
    `<p>${toPlace}${downloadLink(historyToText(place, history, l, today), historyFilename(place, l), l, COPY.history.download)}${back}</p></section>`
  );
}
