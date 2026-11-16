import type { Locale } from "../../switch-first/src/index";
import { COPY, t } from "./copy";
import { button, esc } from "./html";
import { ITEMS, formatKb, hasAnything, totalBytes, type ItemId, type ItemReport } from "./inventory";

/**
 * The "What is saved on this device" page. Each item has its own Clear button,
 * named with the item so no two controls share a name. Clearing asks first,
 * in place, and says plainly that it cannot be undone.
 */
export interface DeviceContext {
  readonly locale: Locale;
  readonly reports: readonly ItemReport[];
  /** The item waiting for a yes or a no, or "all" for everything. */
  readonly confirm: ItemId | "all" | undefined;
  readonly status: string | undefined;
}

const colon = (l: Locale): string => (l === "fr" ? "\u00A0: " : ": ");

function statusLine(r: ItemReport, l: Locale): string {
  switch (r.state) {
    case "empty":
      return t(COPY.device.empty, l);
    case "unreadable":
      return `${t(COPY.device.unreadable, l)} ${formatKb(r.bytes, l)} ${t(COPY.device.size, l)}.`;
    case "unavailable":
      return t(COPY.device.unavailable, l);
    case "saved": {
      const n = r.count === undefined ? "" : ` ${r.count === 1 ? t(COPY.device.entryOne, l) : `${r.count} ${t(COPY.device.entries, l)}`}.`;
      return `${t(COPY.device.saved, l)}${n} ${formatKb(r.bytes, l)} ${t(COPY.device.size, l)}.`;
    }
  }
}

function hint(id: ItemId, l: Locale): string {
  if (id === "notes") return `<p class="hint">${esc(t(COPY.device.notesHint, l))}</p>`;
  if (id === "prefs") return `<p class="hint">${esc(t(COPY.device.prefsHint, l))}</p>`;
  return "";
}

export function renderDevice(ctx: DeviceContext): string {
  const l = ctx.locale;
  const rows = ITEMS.map((item) => {
    const r = ctx.reports.find((x) => x.id === item.id) as ItemReport;
    const title = item.title[l];
    const canClear = r.state === "saved" || r.state === "unreadable";
    const asking = ctx.confirm === item.id;
    const actions = !canClear
      ? ""
      : asking
        ? `<p role="group" aria-label="${esc(title)}"><span id="ask-${item.id}">${esc(t(COPY.device.confirmQuestion, l))}</span> ` +
          button(`${t(COPY.device.yes, l)} ${title}`, { "data-action": "device-confirm", "data-value": item.id, "aria-describedby": `ask-${item.id}` }) +
          button(`${t(COPY.device.no, l)} ${title}`, { "data-action": "device-cancel", "data-value": item.id, class: "secondary" }) +
          `</p>`
        : `<p>${button(`${t(COPY.device.clearVerb, l)} ${title}`, { "data-action": "device-clear", "data-value": item.id, class: "secondary" })}</p>`;
    return (
      `<li class="card"><h3 id="item-${item.id}">${esc(title)}</h3>` +
      `<p>${esc(item.what[l])}</p>` +
      `<p id="state-${item.id}" role="status">${esc(statusLine(r, l))}</p>` +
      hint(item.id, l) +
      actions +
      `</li>`
    );
  }).join("");
  const bytes = totalBytes(ctx.reports);
  const anything = hasAnything(ctx.reports);
  const all =
    ctx.confirm === "all"
      ? `<p role="group" aria-label="${esc(t(COPY.device.clearAll, l))}"><span id="ask-all">${esc(t(COPY.device.clearAllQuestion, l))}</span> ` +
        button(t(COPY.device.yesAll, l), { "data-action": "device-confirm", "data-value": "all", "aria-describedby": "ask-all" }) +
        button(t(COPY.device.noAll, l), { "data-action": "device-cancel", "data-value": "all", class: "secondary" }) +
        `</p>`
      : anything
        ? `<p>${button(t(COPY.device.clearAll, l), { "data-action": "device-clear", "data-value": "all", class: "secondary" })}</p>`
        : `<p class="muted">${esc(t(COPY.device.nothingToClear, l))}</p>`;
  return (
    `<section lang="${l}" aria-labelledby="view-title" data-names-unique data-device>` +
    `<h2 id="view-title">${esc(t(COPY.device.title, l))}</h2>` +
    `<p>${esc(t(COPY.device.intro, l))}</p>` +
    (ctx.status ? `<p class="notice" role="status" id="device-status">${esc(ctx.status)}</p>` : "") +
    `<ul class="plain">${rows}</ul>` +
    `<p class="muted">${esc(t(COPY.device.total, l) + colon(l) + formatKb(bytes, l) + " " + t(COPY.device.size, l))}</p>` +
    all +
    `<p>${button(t(COPY.help.backToList, l), { "data-action": "view", "data-value": "help", class: "secondary" })}</p></section>`
  );
}
