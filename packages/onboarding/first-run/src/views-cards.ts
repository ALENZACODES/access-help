import type { Locale } from "../../switch-first/src/index";
import { t } from "./copy";
import type { Requirement } from "./filter";
import { button, esc } from "./html";
import type { Place } from "./places";
import { CARD_COPY, cardsDocument, cardsFilename, cardsHref, cardsHtml } from "./placecard";
import { PASSPORT_COPY, passportHtml, type Passport } from "./passport";

export interface CardsContext {
  readonly places: readonly Place[];
  readonly needs: Requirement;
  readonly locale: Locale;
  readonly today: Date;
  readonly large: boolean;
  /** The person's access card, when saved, and whether to print it before the place cards. */
  readonly passport?: Passport | undefined;
  readonly withPassport?: boolean;
  /** Where "Back" goes: the place's page, or the shortlist. */
  readonly back: { readonly action: string; readonly value?: string };
}

const LINK_STYLE = "display:inline-flex;align-items:center;min-width:44px;min-height:44px";

export function renderCards(ctx: CardsContext): string {
  const l = ctx.locale;
  const o = { needs: ctx.needs, locale: l, today: ctx.today };
  const withCard = ctx.passport && ctx.withPassport ? ctx.passport : undefined;
  const back = button(t(CARD_COPY.back, l), { "data-action": ctx.back.action, ...(ctx.back.value !== undefined ? { "data-value": ctx.back.value } : {}), class: "secondary" });
  const controls =
    ctx.places.length === 0
      ? `<p class="no-print">${back}</p>`
      : `<div class="no-print">` +
        `<p><label class="choice" style="min-height:44px;min-width:44px"><input type="checkbox" data-action="card-large"${ctx.large ? " checked" : ""}>${esc(t(CARD_COPY.larger, l))}</label></p>` +
        (ctx.passport
          ? `<p><label class="choice" style="min-height:44px;min-width:44px"><input type="checkbox" data-action="card-passport"${ctx.withPassport ? " checked" : ""}>${esc(t(PASSPORT_COPY.include, l))}</label></p>`
          : "") +
        `<p>${button(t(CARD_COPY.print, l), { "data-action": "card-print" })}` +
        `<a class="linkbtn" data-cards-download download="${esc(cardsFilename(ctx.places, ctx.today))}" href="${esc(cardsHref(cardsDocument(ctx.places, o, ctx.large, withCard)))}" style="${LINK_STYLE}">${esc(t(CARD_COPY.download, l))}</a>` +
        `${back}</p></div>`;
  return (
    `<section lang="${l}" aria-labelledby="view-title" class="cards${ctx.large ? " cards-large" : ""}">` +
    `<h2 id="view-title">${esc(t(CARD_COPY.title, l))}</h2>` +
    `<p class="no-print">${esc(t(CARD_COPY.intro, l))}</p>` +
    controls +
    (ctx.places.length === 0 ? `<p>${esc(t(CARD_COPY.none, l))}</p>` : (withCard ? passportHtml(withCard, l, 3) : "") + cardsHtml(ctx.places, o)) +
    `</section>`
  );
}
