import type { Locale } from "../../switch-first/src/index";
import { COPY, t } from "./copy";
import { ASK_COPY, askStatus, buildLetter, letterFilename, letterText, mailtoHref } from "./askplace";
import { FACT_KEYS, type FactKey } from "./facts";
import { button, esc } from "./html";
import { nativeName } from "./locale";
import type { Place } from "./places";
import { downloadLink } from "./views-sources";
import type { AskRecord, AskWay } from "./asked";
import { renderSentBlock } from "./views-asked";

export interface AskContext {
  readonly place: Place | undefined;
  readonly keys: readonly FactKey[];
  /** The language the message is written in, which may differ from the App's. */
  readonly letterLocale: Locale;
  readonly locale: Locale;
  readonly statusMessage: string | undefined;
  readonly today: Date;
  /** How the person asked, once chosen, and whether "add" was pressed without choosing. */
  readonly way: AskWay | undefined;
  readonly wayError: boolean;
  /** This place's entry in "Questions you sent", if it has one. */
  readonly sent: AskRecord | undefined;
}

const LINK_STYLE = "display:inline-flex;align-items:center;min-height:44px;min-width:44px";

function choices(place: Place, keys: readonly FactKey[], l: Locale): string {
  const boxes = FACT_KEYS.map((k) => {
    const id = `ask-key-${k}`;
    return (
      `<label class="choice" for="${id}" style="min-height:44px;min-width:44px">` +
      `<input type="checkbox" id="${id}" data-action="ask-key" data-key="${k}"${keys.includes(k) ? " checked" : ""}>` +
      `${esc(t(COPY.facts[k], l))} <span class="muted">(${esc(askStatus(place, k, l))})</span></label>`
    );
  }).join("");
  return `<fieldset aria-describedby="ask-what-hint"><legend>${esc(t(ASK_COPY.whatTitle, l))}</legend><p id="ask-what-hint" class="hint">${esc(t(ASK_COPY.whatHint, l))}</p>${boxes}</fieldset>`;
}

function languages(letterLocale: Locale, l: Locale): string {
  const radios = (["en", "fr"] as const)
    .map(
      (x) =>
        `<label class="choice" lang="${x}" style="min-height:44px;min-width:44px"><input type="radio" name="ask-lang" value="${x}" data-action="ask-lang" data-value="${x}"${letterLocale === x ? " checked" : ""}>${esc(nativeName(x))}</label>`,
    )
    .join("");
  return `<fieldset><legend>${esc(t(ASK_COPY.languageTitle, l))}</legend>${radios}</fieldset>`;
}

export function renderAskPlace(ctx: AskContext): string {
  const l = ctx.locale;
  const back = button(t(COPY.places.back, l), { "data-action": "view", "data-value": "places", class: "secondary" });
  const p = ctx.place;
  if (!p) {
    return (
      `<section lang="${l}" aria-labelledby="view-title"><h2 id="view-title">${esc(t(ASK_COPY.title, l))}</h2>` +
      `<p class="notice" role="note">${esc(t(COPY.places.notFound, l))}</p><p>${back}</p></section>`
    );
  }
  const letter = buildLetter(p, ctx.keys, ctx.letterLocale);
  const status = ctx.statusMessage ? `<p class="notice" role="status">${esc(ctx.statusMessage)}</p>` : "";
  const message =
    letter === undefined
      ? `<p class="notice" data-ask-none>${esc(t(ASK_COPY.noneChosen, l))}</p>`
      : `<p><strong>${esc(t(ASK_COPY.subjectLabel, l))}</strong>${l === "fr" ? "\u00A0" : ""}: <span data-ask-subject lang="${letter.locale}">${esc(letter.subject)}</span></p>` +
        `<label for="ask-text">${esc(t(ASK_COPY.textLabel, l))}</label>` +
        `<textarea id="ask-text" readonly rows="12" lang="${letter.locale}" style="min-height:44px">${esc(letter.body)}</textarea>` +
        `<p><a class="linkbtn" data-ask-email href="${esc(mailtoHref(letter))}" style="${LINK_STYLE}">${esc(t(ASK_COPY.email, l))}</a> ` +
        `${downloadLink(letterText(letter), letterFilename(p, letter.locale), l, ASK_COPY.download)} ` +
        `${button(t(ASK_COPY.select, l), { "data-action": "select-text", "data-value": "ask-text", class: "secondary" })}</p>`;
  return (
    `<section lang="${l}" aria-labelledby="view-title" class="ask-place">` +
    `<h2 id="view-title">${esc(t(ASK_COPY.title, l))}${l === "fr" ? "\u00A0" : ""}: <span data-user-content>${esc(p.name)}</span></h2>` +
    (p.address ? `<p class="muted"><span data-user-content>${esc(p.address)}</span></p>` : "") +
    `<p>${esc(t(ASK_COPY.intro, l))}</p><p class="hint">${esc(t(ASK_COPY.sendsNothing, l))}</p>` +
    status +
    choices(p, ctx.keys, l) +
    languages(ctx.letterLocale, l) +
    `<h3 id="ask-message-title">${esc(t(ASK_COPY.messageTitle, l))}</h3>` +
    message +
    renderSentBlock(p.id, ctx.way, ctx.wayError, ctx.sent, l, ctx.today) +
    `<h3>${esc(t(ASK_COPY.replyTitle, l))}</h3><p>${esc(t(ASK_COPY.replyIntro, l))}</p>` +
    `<p>${button(t(ASK_COPY.readReply, l), { "data-action": "read-reply", "data-value": p.id })}` +
    `${button(t(ASK_COPY.back, l), { "data-action": "open-place", "data-value": p.id, class: "secondary" })}</p>` +
    `</section>`
  );
}
