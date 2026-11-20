import type { Locale } from "../../switch-first/src/index";
import { t } from "./copy";
import { button, esc, markTyped, namedButton } from "./html";
import type { Place } from "./places";
import { renderResolutionList } from "./views-places";
import { placeLabel } from "./survey-copy";
import { COMBINE_COPY, addressOptions, combinePlaces, combineWithLabel, nameOptions, summaryLines, type CombineChoice, type CombineData } from "./combine";

export interface CombineContext {
  readonly a: Place | undefined;
  readonly b: Place | undefined;
  readonly choice: CombineChoice | undefined;
  readonly data: CombineData;
  readonly locale: Locale;
  readonly today: Date;
}

const CHOICE_STYLE = "min-height:44px;min-width:44px";

function side(p: Place, title: string, id: string, l: Locale, today: Date): string {
  return (
    `<section class="combine-side" aria-labelledby="${id}">` +
    `<h3 id="${id}">${esc(title)}${l === "fr" ? "\u00A0:" : ":"} <span data-user-content>${esc(placeLabel(p.name, p.address ?? ""))}</span></h3>` +
    renderResolutionList(p, l, today) +
    `</section>`
  );
}

/** A group of radio buttons for one choice; nothing when there is only one value to keep. */
function choiceGroup(name: string, legend: string, values: readonly string[], chosen: string, label: (v: string) => string): string {
  if (values.length < 2) return "";
  const radios = values
    .map(
      (v, i) =>
        `<label class="choice" style="${CHOICE_STYLE}"><input type="radio" name="${name}" id="${name}-${i}" value="${i}" data-action="${name}" data-value="${i}"${v === chosen ? " checked" : ""}>` +
        `<span data-user-content>${esc(label(v))}</span></label>`,
    )
    .join("");
  return `<fieldset><legend>${esc(legend)}</legend>${radios}</fieldset>`;
}

/** On a place's page: the places that may be the same one, each with a button to combine them. Nothing when there are none. */
export function renderMaybeSame(others: ReadonlyArray<{ readonly other: Place; readonly key: string }>, l: Locale): string {
  if (others.length === 0) return "";
  const items = others
    .map(({ other, key }) => `<li>${namedButton(combineWithLabel(other, l), placeLabel(other.name, other.address ?? ""), { "data-action": "similar-combine", "data-value": key, class: "secondary" })}</li>`)
    .join("");
  return `<section class="maybe-same" aria-labelledby="maybe-same-title"><h3 id="maybe-same-title">${esc(t(COMBINE_COPY.maybeTitle, l))}</h3><ul class="plain">${items}</ul></section>`;
}

export function renderCombine(ctx: CombineContext): string {
  const l = ctx.locale;
  const back = `<p>${button(t(COMBINE_COPY.back, l), { "data-action": "view", "data-value": "similar", class: "secondary" })}</p>`;
  const head = `<h2 id="view-title">${esc(t(COMBINE_COPY.title, l))}</h2>`;
  if (!ctx.a || !ctx.b || !ctx.choice || ctx.a.id === ctx.b.id) {
    return `<section lang="${l}" aria-labelledby="view-title" class="combine">${head}<p>${esc(t(COMBINE_COPY.gone, l))}</p>${back}</section>`;
  }
  const { a, b, choice } = ctx;
  const result = combinePlaces(a, b, choice, ctx.data);
  // The name the notes will take is the person's own words inside the App's sentence.
  const typed = placeLabel(result.summary.target.placeName, result.summary.target.address ?? "");
  const lines = summaryLines(result.summary, l)
    .map((x) => `<li>${markTyped(x, typed)}</li>`)
    .join("");
  const noAddress = t(COMBINE_COPY.noAddress, l);
  return (
    `<section lang="${l}" aria-labelledby="view-title" class="combine">` +
    head +
    `<p>${esc(t(COMBINE_COPY.intro, l))}</p>` +
    side(a, t(COMBINE_COPY.first, l), "combine-a", l, ctx.today) +
    side(b, t(COMBINE_COPY.second, l), "combine-b", l, ctx.today) +
    `<form id="combine-form" novalidate>` +
    choiceGroup("combine-name", t(COMBINE_COPY.nameLegend, l), nameOptions(a, b), choice.name, (v) => v) +
    choiceGroup("combine-address", t(COMBINE_COPY.addressLegend, l), addressOptions(a, b), choice.address, (v) => (v === "" ? noAddress : v)) +
    `<section id="combine-preview" aria-labelledby="combine-preview-title" tabindex="-1">` +
    `<h3 id="combine-preview-title">${esc(t(COMBINE_COPY.previewTitle, l))}</h3><ul>${lines}</ul></section>` +
    `<p>${button(t(COMBINE_COPY.combine, l), { "data-action": "combine-run" })}</p>` +
    `</form>` +
    back +
    `</section>`
  );
}
