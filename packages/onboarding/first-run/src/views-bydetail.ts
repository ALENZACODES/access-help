import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";
import { DETAIL_GROUPS, bucketCounts, byDetailFilename, byDetailToText, detailBuckets, groupLabel, reportCountText, type DetailEntry, type DetailGroup } from "./bydetail";
import { FACT_KEYS, type FactKey } from "./facts";
import { button, esc } from "./html";
import type { Place } from "./places";
import { QUESTIONS } from "./plan";
import { recordParts } from "./tier";
import { downloadLink } from "./views-sources";
import { renderCallListLink } from "./calllist";

function entryItem(e: DetailEntry, group: DetailGroup, index: number, l: Locale): string {
  const nameId = `bydetail-${group}-${index}`;
  const colon = l === "fr" ? `${NB}:` : ":";
  let record = "";
  if ((group === "yes" || group === "no") && e.newest) {
    const r = recordParts(e.newest, l);
    record =
      ` ${esc(reportCountText(e.reports, l))}. ${esc(t(COPY.byDetail.newest, l))}${colon} ` +
      `<span data-user-content>${esc(r.source)}</span> · ${esc(r.licence)} · ${esc(r.date)} · ${esc(r.tier)}.`;
  } else if (group === "differ") {
    record = ` ${esc(reportCountText(e.reports, l))}.`;
  }
  // Reports that differ are read on the record history page, where every report is listed with its source.
  const open =
    group === "differ"
      ? button(t(COPY.byDetail.openHistory, l), { "data-action": "open-history", "data-value": e.place.id, "aria-describedby": nameId, class: "secondary" })
      : button(t(COPY.byDetail.openPlace, l), { "data-action": "open-place", "data-value": e.place.id, "aria-describedby": nameId, class: "secondary" });
  return (
    `<li data-place="${esc(e.place.id)}"><strong id="${nameId}" data-user-content>${esc(e.place.name)}</strong>` +
    (e.place.address ? ` <span class="muted" data-user-content>${esc(e.place.address)}</span>` : "") +
    `.${record} ${open}</li>`
  );
}

function groupBlock(key: FactKey, group: DetailGroup, entries: readonly DetailEntry[], l: Locale): string {
  const id = `bydetail-title-${group}`;
  const colon = l === "fr" ? `${NB}:` : ":";
  const head = `<h3 id="${id}">${esc(groupLabel(group, l))} <span class="muted" data-group-count="${entries.length}">(${entries.length})</span></h3>`;
  if (entries.length === 0) return `<section class="card bydetail-group" data-group="${group}" aria-labelledby="${id}">${head}<p>${esc(t(COPY.byDetail.emptyGroup, l))}</p></section>`;
  const extra =
    group === "unknown"
      ? `<p><strong>${esc(t(COPY.gaps.ask, l))}</strong>${colon} ${esc(QUESTIONS[key][l])}</p>`
      : group === "differ"
        ? `<p>${esc(t(COPY.byDetail.differNote, l))}</p>`
        : "";
  return (
    `<section class="card bydetail-group" data-group="${group}" aria-labelledby="${id}">${head}${extra}` +
    `<ul>${entries.map((e, i) => entryItem(e, group, i, l)).join("")}</ul></section>`
  );
}

function chooser(l: Locale): string {
  return (
    `<div role="group" aria-labelledby="bydetail-choose" class="bydetail-choose">` +
    `<p id="bydetail-choose">${esc(t(COPY.byDetail.choose, l))}</p>` +
    FACT_KEYS.map((k) => button(t(COPY.facts[k], l), { "data-action": "view-detail", "data-value": k, class: "secondary" })).join("") +
    `</div>`
  );
}

/** One detail across every place. Without a detail, the page asks which detail to show. */
export function renderByDetail(places: readonly Place[], key: FactKey | undefined, locale: Locale, today: Date): string {
  const l = locale;
  const back = button(t(COPY.places.back, l), { "data-action": "view", "data-value": "places", class: "secondary" });
  const intro = `<p>${esc(t(COPY.byDetail.intro, l))}</p><p class="notice" role="note">${esc(t(COPY.byDetail.noRank, l))}</p>`;
  if (key === undefined) {
    return `<section lang="${l}" aria-labelledby="view-title"><h2 id="view-title">${esc(t(COPY.byDetail.title, l))}</h2>${intro}${chooser(l)}<p>${back}</p></section>`;
  }
  const colon = l === "fr" ? `${NB}:` : ":";
  const head = `<h2 id="view-title">${esc(t(COPY.byDetail.title, l))}${colon} ${esc(t(COPY.facts[key], l))}</h2>${intro}`;
  const other = button(t(COPY.byDetail.another, l), { "data-action": "view", "data-value": "bydetail", class: "secondary" });
  if (places.length === 0) {
    return `<section lang="${l}" aria-labelledby="view-title">${head}<p data-bydetail-empty>${esc(t(COPY.byDetail.noPlaces, l))}</p><p>${other}${back}</p></section>`;
  }
  const b = detailBuckets(places, key);
  const counts = bucketCounts(b);
  const totals = `<ul class="totals">${DETAIL_GROUPS.map((g) => `<li>${esc(groupLabel(g, l))}${colon} <strong data-count="${g}">${counts[g]}</strong></li>`).join("")}</ul>`;
  return (
    `<section lang="${l}" aria-labelledby="view-title">${head}${totals}` +
    DETAIL_GROUPS.map((g) => groupBlock(key, g, b[g], l)).join("") +
    // One call list for the places worth asking: no record, or reports that differ.
    renderCallListLink(key, [...b.unknown, ...b.differ].map((e) => e.place), l, today) +
    `<p class="hint">${esc(t(COPY.textExport.keepNote, l))}</p>` +
    `<p>${downloadLink(byDetailToText(places, key, l, today), byDetailFilename(key, today, l), l, COPY.byDetail.download)}${other}${back}</p></section>`
  );
}
