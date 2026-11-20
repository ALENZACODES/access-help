import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";
import { FACT_KEYS } from "./facts";
import type { Requirement } from "./filter";
import { button, esc } from "./html";
import { NEED_CHOICES, STAND_GROUPS, choiceOf, needsFilename, needsStanding, needsToText, standLabel, type NeedChoice, type StandGroup } from "./musthaves";
import { hasNeeds } from "./needs";
import { whyLines, whyOf } from "./standing-why";
import type { Place } from "./places";
import { downloadLink } from "./views-sources";

function choiceLabel(c: NeedChoice, l: Locale): string {
  return t(COPY.mustHaves.choices[c], l);
}

/** One fieldset per detail, three radios each. A change is saved at once. */
function choices(needs: Requirement, l: Locale): string {
  return FACT_KEYS.map((k) => {
    const now = choiceOf(needs, k);
    const radios = NEED_CHOICES.map(
      (c) =>
        `<label class="choice" style="min-height:44px;min-width:44px"><input type="radio" name="need-${k}" value="${c}" data-action="need-choice" data-key="${k}" data-value="${c}"${now === c ? " checked" : ""}>${esc(choiceLabel(c, l))}</label>`,
    ).join("");
    return `<fieldset data-key="${k}"><legend>${esc(t(COPY.facts[k], l))}</legend>${radios}</fieldset>`;
  }).join("");
}

function groupBlock(g: StandGroup, list: readonly Place[], l: Locale, needs: Requirement): string {
  const id = `musthaves-${g}`;
  const head = `<h4 id="${id}">${esc(standLabel(g, l))} <span class="muted" data-stand-count="${g}">(${list.length})</span></h4>`;
  if (list.length === 0) return `<section class="stand-group" data-group="${g}" aria-labelledby="${id}">${head}<p>${esc(t(COPY.mustHaves.emptyGroup, l))}</p></section>`;
  const items = list
    .map((p, i) => {
      const nameId = `${id}-${i}`;
      return (
        `<li><span id="${nameId}" data-user-content>${esc(p.name)}</span>` +
        (p.address ? ` <span class="muted" data-user-content>${esc(p.address)}</span>` : "") +
        ` ${button(t(COPY.places.plan, l), { "data-action": "open-plan", "data-value": p.id, "aria-describedby": nameId, class: "secondary" })}` +
        whyLines(whyOf(p, needs), l)
          .map((line) => `<br><span class="muted" data-why>${esc(line)}</span>`)
          .join("") +
        `</li>`
      );
    })
    .join("");
  return `<section class="stand-group" data-group="${g}" aria-labelledby="${id}">${head}<ul>${items}</ul></section>`;
}

/** Where the places stand. Shown only when a must-have is saved and there are places. */
function standing(places: readonly Place[], needs: Requirement, l: Locale): string {
  const head = `<h3 id="musthaves-standing">${esc(t(COPY.mustHaves.standingTitle, l))}</h3>`;
  if (!hasNeeds(needs)) return `<section aria-labelledby="musthaves-standing" data-standing>${head}<p data-musthaves-none>${esc(t(COPY.mustHaves.none, l))}</p></section>`;
  if (places.length === 0) return `<section aria-labelledby="musthaves-standing" data-standing>${head}<p data-musthaves-noplaces>${esc(t(COPY.mustHaves.noPlaces, l))}</p></section>`;
  const s = needsStanding(places, needs);
  const colon = l === "fr" ? `${NB}:` : ":";
  return (
    `<section aria-labelledby="musthaves-standing" data-standing>${head}` +
    `<p>${esc(t(COPY.mustHaves.standingIntro, l))}</p>` +
    `<ul class="totals">${STAND_GROUPS.map((g) => `<li>${esc(standLabel(g, l))}${colon} <strong data-stand-total="${g}">${s.groups[g].length}</strong></li>`).join("")}</ul>` +
    STAND_GROUPS.map((g) => groupBlock(g, s.groups[g], l, needs)).join("") +
    `</section>`
  );
}

export interface MustHavesContext {
  readonly places: readonly Place[];
  readonly needs: Requirement;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
  /** The saved sets of must-haves, shown under the choices. */
  readonly setsHtml?: string;
}

/** The must-haves page: choose, see where places stand, and clear. Nothing leaves the device. */
export function renderMustHaves(ctx: MustHavesContext): string {
  const l = ctx.locale;
  const back = button(t(COPY.places.back, l), { "data-action": "view", "data-value": "places", class: "secondary" });
  const clear = hasNeeds(ctx.needs) ? button(t(COPY.needs.clear, l), { "data-action": "clear-needs", class: "secondary" }) : "";
  const more = hasNeeds(ctx.needs)
    ? `<p>${button(t(COPY.places.viewRoundup, l), { "data-action": "view", "data-value": "roundup", class: "secondary" })}` +
      `${button(t(COPY.places.viewGaps, l), { "data-action": "view", "data-value": "gaps", class: "secondary" })}</p>`
    : "";
  return (
    `<section lang="${l}" aria-labelledby="view-title">` +
    `<h2 id="view-title">${esc(t(COPY.mustHaves.title, l))}</h2>` +
    `<p>${esc(t(COPY.needs.intro, l))}</p>` +
    `<p class="notice" role="note">${esc(t(COPY.mustHaves.notPeople, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" role="status">${esc(ctx.statusMessage)}</p>` : "") +
    `<h3>${esc(t(COPY.mustHaves.chooseTitle, l))}</h3><p class="hint">${esc(t(COPY.mustHaves.savedAtOnce, l))}</p>` +
    choices(ctx.needs, l) +
    (ctx.setsHtml ?? "") +
    standing(ctx.places, ctx.needs, l) +
    more +
    `<p class="hint">${esc(t(COPY.textExport.keepNote, l))}</p>` +
    `<p>${downloadLink(needsToText(ctx.places, ctx.needs, l, ctx.today), needsFilename(ctx.today, l), l, COPY.mustHaves.download)}${clear}${back}</p></section>`
  );
}
