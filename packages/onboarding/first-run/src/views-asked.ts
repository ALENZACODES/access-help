import type { Locale } from "../../switch-first/src/index";
import { ASKED_COPY, ASK_WAYS, WAY_COPY, aboutLine, askedFilename, askedLine, askedToText, closedLine, splitAsked, type AskRecord, type AskWay } from "./asked";
import { COPY, t } from "./copy";
import { downloadLink } from "./views-sources";
import { placeLine } from "./askplace";
import { button, esc } from "./html";

export interface AskedContext {
  readonly list: readonly AskRecord[];
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
  /** Ids of places still in the notes: "Read their reply" and "Ask again" need the place. */
  readonly knownIds: ReadonlySet<string>;
}

/** "Remove Library (1 Main St) from this list" — the remove button says what it removes. */
export function removeAskedLabel(r: AskRecord, l: Locale): string {
  const name = placeLine({ name: r.placeName, address: r.address === "" ? undefined : r.address });
  return l === "fr" ? `Retirer ${name} de cette liste` : `Remove ${name} from this list`;
}

function item(r: AskRecord, i: number, ctx: AskedContext): string {
  const l = ctx.locale;
  const nameId = `asked-name-${i}`;
  const d = { "aria-describedby": nameId };
  const known = ctx.knownIds.has(r.id);
  const actions =
    r.state === "waiting"
      ? (known ? button(t(ASKED_COPY.readReply, l), { "data-action": "read-reply", "data-value": r.id, ...d }) : "") +
        button(t(ASKED_COPY.replied, l), { "data-action": "asked-replied", "data-value": r.id, class: "secondary", ...d }) +
        button(t(ASKED_COPY.noReply, l), { "data-action": "asked-noreply", "data-value": r.id, class: "secondary", ...d })
      : (known ? button(t(ASKED_COPY.askAgain, l), { "data-action": "open-ask", "data-value": r.id, class: "secondary", ...d }) : "") +
        button(t(ASKED_COPY.waitAgain, l), { "data-action": "asked-waiting", "data-value": r.id, class: "secondary", ...d });
  return (
    `<li class="card" data-asked="${esc(r.id)}" data-state="${r.state}">` +
    `<h4 id="${nameId}"><span data-user-content>${esc(r.placeName)}</span></h4>` +
    (r.address === "" ? "" : `<p class="muted"><span data-user-content>${esc(r.address)}</span></p>`) +
    `<p>${esc(askedLine(r, l, ctx.today))}</p>` +
    (r.state === "waiting" ? "" : `<p data-closed>${esc(closedLine(r, l))}</p>`) +
    `<p>${esc(aboutLine(r, l))}</p>` +
    `<p>${actions}${button(removeAskedLabel(r, l), { "data-action": "asked-remove", "data-value": r.id, class: "secondary" })}</p>` +
    `</li>`
  );
}

export function renderAsked(ctx: AskedContext): string {
  const l = ctx.locale;
  const { waiting, closed } = splitAsked(ctx.list);
  const status = ctx.statusMessage ? `<p class="notice" role="status">${esc(ctx.statusMessage)}</p>` : "";
  const back = button(t(ASKED_COPY.back, l), { "data-action": "view", "data-value": "notes", class: "secondary" });
  const head = `<h2 id="view-title">${esc(t(ASKED_COPY.title, l))}</h2><p>${esc(t(ASKED_COPY.intro, l))}</p>${status}`;
  if (ctx.list.length === 0) return `<section lang="${l}" aria-labelledby="view-title">${head}<p>${esc(t(ASKED_COPY.none, l))}</p><p>${back}</p></section>`;
  let n = 0;
  const list = (rs: readonly AskRecord[]): string => `<ul class="asked-list">${rs.map((r) => item(r, n++, ctx)).join("")}</ul>`;
  return (
    `<section lang="${l}" aria-labelledby="view-title">${head}` +
    `<h3 id="asked-waiting" tabindex="-1">${esc(t(ASKED_COPY.waitingTitle, l))} (${waiting.length})</h3>` +
    (waiting.length === 0 ? `<p>${esc(t(ASKED_COPY.noneWaiting, l))}</p>` : list(waiting)) +
    (closed.length === 0 ? "" : `<h3 id="asked-closed">${esc(t(ASKED_COPY.closedTitle, l))} (${closed.length})</h3>${list(closed)}`) +
    `<p class="hint">${esc(t(COPY.textExport.keepNote, l))}</p>` +
    `<p>${downloadLink(askedToText(ctx.list, l, ctx.today), askedFilename(ctx.today, l), l, ASKED_COPY.download)}${back}</p></section>`
  );
}

/** The block on the ask page: how the person asked, and a button to add the place to the list. */
export function renderSentBlock(placeId: string, way: AskWay | undefined, wayError: boolean, current: AskRecord | undefined, l: Locale, today: Date): string {
  const radios = ASK_WAYS.map(
    (w) =>
      `<label class="choice" style="min-height:44px;min-width:44px"><input type="radio" name="asked-way" value="${w}" data-action="asked-way" data-value="${w}"${way === w ? " checked" : ""}>${esc(t(WAY_COPY[w], l))}</label>`,
  ).join("");
  const err = wayError ? `<p id="asked-way-error" class="error">${esc(t(ASKED_COPY.chooseWay, l))}</p>` : "";
  return (
    `<h3 id="asked-sent-title">${esc(t(ASKED_COPY.sentTitle, l))}</h3><p id="asked-sent-hint" class="hint">${esc(t(ASKED_COPY.sentHint, l))}</p>` +
    (current && current.state === "waiting" ? `<p data-asked-current>${esc(askedLine(current, l, today))}</p>` : "") +
    `<fieldset id="asked-way"${wayError ? ' aria-describedby="asked-way-error" aria-invalid="true"' : ""}><legend>${esc(t(ASKED_COPY.wayLegend, l))}</legend>${err}${radios}</fieldset>` +
    `<p>${button(t(ASKED_COPY.add, l), { "data-action": "asked-add", "data-value": placeId, "aria-describedby": "asked-sent-hint" })}` +
    `${button(t(ASKED_COPY.open, l), { "data-action": "view", "data-value": "asked", class: "secondary" })}</p>`
  );
}
