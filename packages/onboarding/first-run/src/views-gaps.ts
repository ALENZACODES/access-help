import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";
import { detailGaps, gapQuestion, gapsFilename, gapsToText, placeCount, placesWithGaps, type DetailGaps } from "./gaps";
import { button, esc } from "./html";
import type { Place } from "./places";
import { downloadLink } from "./views-sources";

function placeItem(p: Place, key: string, index: number, l: Locale): string {
  const nameId = `gap-${key}-${index}`;
  return (
    `<li data-place="${esc(p.id)}"><span id="${nameId}" data-user-content>${esc(p.name)}</span>` +
    (p.address ? ` <span class="muted" data-user-content>${esc(p.address)}</span>` : "") +
    ` ${button(t(COPY.gaps.openPlace, l), { "data-action": "open-place", "data-value": p.id, "aria-describedby": nameId, class: "secondary" })}</li>`
  );
}

function detailBlock(g: DetailGaps, l: Locale): string {
  const colon = l === "fr" ? `${NB}:` : ":";
  const titleId = `gap-title-${g.key}`;
  const head =
    `<h3 id="${titleId}">${esc(t(COPY.facts[g.key], l))} ` +
    `<span class="muted" data-gap-count="${g.places.length}">(${esc(placeCount(g.places.length, l))})</span></h3>`;
  if (g.places.length === 0) {
    return `<section class="card gap-detail" data-key="${g.key}" aria-labelledby="${titleId}">${head}<p data-gap-none>${esc(t(COPY.gaps.allRecorded, l))}</p></section>`;
  }
  return (
    `<section class="card gap-detail" data-key="${g.key}" aria-labelledby="${titleId}">${head}` +
    `<p><strong>${esc(t(COPY.gaps.ask, l))}</strong>${colon} ${esc(gapQuestion(g.key, l))}</p>` +
    `<ul>${g.places.map((p, i) => placeItem(p, g.key, i, l)).join("")}</ul></section>`
  );
}

/** The "details with no record" page: what to ask, detail by detail. It guesses nothing and changes nothing. */
export function renderGaps(places: readonly Place[], locale: Locale, today: Date): string {
  const l = locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const back = button(t(COPY.places.back, l), { "data-action": "view", "data-value": "places", class: "secondary" });
  const head =
    `<h2 id="view-title">${esc(t(COPY.gaps.title, l))}</h2><p>${esc(t(COPY.gaps.intro, l))}</p>` +
    `<p class="notice" role="note">${esc(t(COPY.gaps.notNo, l))}</p>`;
  if (places.length === 0) {
    return `<section lang="${l}" aria-labelledby="view-title">${head}<p data-gaps-empty>${esc(t(COPY.gaps.noPlaces, l))}</p><p>${back}</p></section>`;
  }
  const list = detailGaps(places);
  const missing = placesWithGaps(list);
  const totals =
    `<ul class="totals"><li>${esc(t(COPY.gaps.placesMissing, l))}${colon} <strong data-gaps-places>${missing}</strong> / <span data-gaps-of>${places.length}</span></li></ul>` +
    (missing === 0 ? `<p data-gaps-none>${esc(t(COPY.gaps.none, l))}</p>` : "");
  return (
    `<section lang="${l}" aria-labelledby="view-title">${head}${totals}${list.map((g) => detailBlock(g, l)).join("")}` +
    `<p class="hint">${esc(t(COPY.textExport.keepNote, l))}</p>` +
    `<p>${downloadLink(gapsToText(list, places.length, l, today), gapsFilename(today, l), l, COPY.gaps.download)}${back}</p></section>`
  );
}
