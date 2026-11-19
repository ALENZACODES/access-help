import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";
import { button, esc } from "./html";
import type { Place } from "./places";
import { extraCopies, findRepeats, repeatGroups, repeatsFilename, repeatsToText, timesSaved, type PlaceRepeats, type RepeatGroup } from "./repeats";
import { recordParts } from "./tier";
import { downloadLink } from "./views-sources";

function groupItem(g: RepeatGroup, l: Locale): string {
  const colon = l === "fr" ? `${NB}:` : ":";
  const r = recordParts(g.provenance, l);
  return (
    `<li data-key="${g.key}" data-copies="${g.noteIds.length}"><strong>${esc(t(COPY.facts[g.key], l))}</strong>${colon} ${esc(t(COPY.values[g.value], l))}. ` +
    `<span data-user-content>${esc(r.source)}</span> · ${esc(r.licence)} · ${esc(r.date)} · ${esc(r.tier)}. ` +
    `<span class="repeat-count">${esc(timesSaved(g.noteIds.length, l))}.</span></li>`
  );
}

function placeBlock(p: PlaceRepeats, index: number, l: Locale): string {
  const titleId = `repeat-place-${index}`;
  return (
    `<article class="card repeat-place" data-place="${esc(p.place.id)}">` +
    `<h3 id="${titleId}"><span data-user-content>${esc(p.place.name)}</span></h3>` +
    (p.place.address ? `<p class="muted"><span data-user-content>${esc(p.place.address)}</span></p>` : "") +
    `<ul>${p.groups.map((g) => groupItem(g, l)).join("")}</ul>` +
    `<p>${button(t(COPY.repeats.openHistory, l), { "data-action": "open-history", "data-value": p.place.id, "aria-describedby": titleId, class: "secondary" })}` +
    `${button(t(COPY.repeats.openPlace, l), { "data-action": "open-place", "data-value": p.place.id, "aria-describedby": titleId, class: "secondary" })}</p>` +
    `</article>`
  );
}

/** The "records saved more than once" page. It points them out and removes nothing. */
export function renderRepeats(places: readonly Place[], locale: Locale, today: Date): string {
  const l = locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const back = button(t(COPY.places.back, l), { "data-action": "view", "data-value": "places", class: "secondary" });
  const head =
    `<h2 id="view-title">${esc(t(COPY.repeats.title, l))}</h2><p>${esc(t(COPY.repeats.intro, l))}</p>` +
    `<p class="notice" role="note">${esc(t(COPY.repeats.oneRecord, l))}</p>`;
  if (places.length === 0) {
    return `<section lang="${l}" aria-labelledby="view-title">${head}<p>${esc(t(COPY.repeats.noPlaces, l))}</p><p>${back}</p></section>`;
  }
  const list = findRepeats(places);
  if (list.length === 0) {
    return `<section lang="${l}" aria-labelledby="view-title">${head}<p data-repeats-none>${esc(t(COPY.repeats.none, l))}</p><p>${back}</p></section>`;
  }
  const totals =
    `<ul class="totals"><li>${esc(t(COPY.repeats.groups, l))}${colon} <strong data-repeats-groups>${repeatGroups(list)}</strong></li>` +
    `<li>${esc(t(COPY.repeats.extra, l))}${colon} <strong data-repeats-extra>${extraCopies(list)}</strong></li></ul>`;
  return (
    `<section lang="${l}" aria-labelledby="view-title">${head}${totals}${list.map((p, i) => placeBlock(p, i, l)).join("")}` +
    `<p class="hint">${esc(t(COPY.textExport.keepNote, l))}</p>` +
    `<p>${downloadLink(repeatsToText(list, l, today), repeatsFilename(today, l), l, COPY.repeats.download)}${back}</p></section>`
  );
}
