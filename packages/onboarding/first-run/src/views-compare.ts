import type { Locale } from "../../switch-first/src/index";
import { compareRows, type CompareCell } from "./compare";
import { COPY, NB, t } from "./copy";
import type { FactKey } from "./facts";
import type { Requirement } from "./filter";
import { button, esc } from "./html";
import { statusLabel } from "./plan";
import type { Place } from "./places";
import { resolutionBody } from "./views-places";

/** Table of two or three places, one row per detail. Nothing is scored. */
export function renderCompare(places: readonly Place[], req: Requirement, locale: Locale, today: Date, missing: boolean): string {
  const l = locale;
  const back = button(t(COPY.places.back, l), { "data-action": "view", "data-value": "places", class: "secondary" });
  if (missing || places.length < 2) {
    return (
      `<section lang="${l}" aria-labelledby="view-title"><h2 id="view-title">${esc(t(COPY.compare.title, l))}</h2>` +
      `<p class="notice" role="note">${esc(t(COPY.compare.missing, l))}</p><p>${back}</p></section>`
    );
  }
  const rows = compareRows(places, req);
  const head =
    `<tr><th scope="col">${esc(t(COPY.compare.detail, l))}</th>` +
    places.map((p) => `<th scope="col" id="cmp-${esc(p.id)}"><span data-user-content>${esc(p.name)}</span></th>`).join("") +
    `</tr>`;
  const cell = (c: CompareCell, key: FactKey): string => {
    const status = c.status ? `<br><span class="status">${esc(statusLabel(c.status, l))}</span>` : "";
    return `<td>${resolutionBody(key, c.resolution, l, today)}${status}</td>`;
  };
  const body = rows
    .map((r) => {
      const wanted = r.wanted ? ` <span class="muted">(${esc(t(COPY.compare.wanted, l))}${l === "fr" ? NB : ""}: ${esc(t(COPY.values[r.wanted], l))})</span>` : "";
      return `<tr><th scope="row">${esc(t(COPY.facts[r.key], l))}${wanted}</th>${r.cells.map((c) => cell(c, r.key)).join("")}</tr>`;
    })
    .join("");
  return (
    `<section lang="${l}" aria-labelledby="view-title"><h2 id="view-title">${esc(t(COPY.compare.title, l))}</h2>` +
    `<div class="table-wrap" role="region" aria-labelledby="compare-caption" tabindex="0">` +
    `<table class="compare"><caption id="compare-caption">${esc(t(COPY.compare.caption, l))}</caption><thead>${head}</thead><tbody>${body}</tbody></table></div>` +
    `<p>${places.map((p) => button(t(COPY.places.plan, l), { "data-action": "open-plan", "data-value": p.id, "aria-describedby": `cmp-${p.id}`, class: "secondary" })).join("")}${back}</p></section>`
  );
}
