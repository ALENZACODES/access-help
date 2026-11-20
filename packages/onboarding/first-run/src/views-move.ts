import type { Locale } from "../../switch-first/src/index";
import { t } from "./copy";
import { MOVE_COPY, MOVE_ERRORS, PARTS, PART_NAMES, deviceFilename, exportDevice, fileAgeText, partCount, type DeviceData, type DeviceError, type Part, type PartPlan } from "./devicefile";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import { textExportHref } from "./textexport";

export interface MoveContext {
  readonly current: DeviceData;
  readonly locale: Locale;
  readonly today: Date;
  readonly pasteText: string;
  readonly error: DeviceError | undefined;
  /** What the pasted file would add, once looked at. */
  readonly plans: readonly PartPlan[] | undefined;
  readonly chosen: ReadonlySet<Part>;
  /** The day the pasted file was made, when it says. */
  readonly madeOn?: string | undefined;
  /** Shown when "bring in" was pressed with nothing chosen. */
  readonly noneChosen: boolean;
  readonly statusMessage: string | undefined;
}

const LINK_STYLE = "display:inline-flex;align-items:center;min-width:44px;min-height:44px";

function takeSection(ctx: MoveContext): string {
  const l = ctx.locale;
  const rows = PARTS.map((p) => `<li data-part-count="${p}">${esc(t(PART_NAMES[p], l))}${l === "fr" ? "\u00A0" : ""}: ${partCount(ctx.current, p)}</li>`).join("");
  const text = exportDevice(ctx.current, ctx.today.toISOString().slice(0, 10));
  return (
    `<h3 id="move-take">${esc(t(MOVE_COPY.takeTitle, l))}</h3>` +
    `<p id="move-in-file">${esc(t(MOVE_COPY.inFile, l))}</p><ul aria-labelledby="move-in-file">${rows}</ul>` +
    `<p><a class="linkbtn" data-move-download download="${esc(deviceFilename(ctx.today))}" href="${esc(textExportHref(text))}" style="${LINK_STYLE}">${esc(t(MOVE_COPY.download, l))}</a></p>`
  );
}

function previewTable(plans: readonly PartPlan[], chosen: ReadonlySet<Part>, l: Locale): string {
  const head =
    `<tr><th scope="col">${esc(t(MOVE_COPY.colPart, l))}</th><th scope="col">${esc(t(MOVE_COPY.colFile, l))}</th>` +
    `<th scope="col">${esc(t(MOVE_COPY.colAdd, l))}</th><th scope="col">${esc(t(MOVE_COPY.colKept, l))}</th><th scope="col">${esc(t(MOVE_COPY.colRoom, l))}</th>` +
    `<th scope="col">${esc(t(MOVE_COPY.choose, l))}</th></tr>`;
  const body = plans
    .map((p) => {
      const name = t(PART_NAMES[p.part], l);
      const box =
        p.add > 0
          ? `<label class="choice" style="min-height:44px;min-width:44px"><input type="checkbox" data-action="move-part" data-key="${p.part}"${chosen.has(p.part) ? " checked" : ""}>` +
            `<span class="sr-only">${esc(`${t(MOVE_COPY.choose, l)} ${name}`)}</span></label>`
          : "—";
      return `<tr data-plan="${p.part}"><th scope="row">${esc(name)}</th><td>${p.inFile}</td><td>${p.add}</td><td>${p.kept}</td><td>${p.noRoom}</td><td>${box}</td></tr>`;
    })
    .join("");
  return `<table class="move-plan"><caption>${esc(t(MOVE_COPY.previewTitle, l))}</caption><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

function bringSection(ctx: MoveContext): string {
  const l = ctx.locale;
  const go =
    ctx.error === "is-notes"
      ? button(t(MOVE_COPY.goNotes, l), { "data-action": "view", "data-value": "notes", class: "secondary" })
      : ctx.error === "is-lists"
        ? button(t(MOVE_COPY.goLists, l), { "data-action": "view", "data-value": "places", class: "secondary" })
        : "";
  const err = ctx.error ? `<p id="e-move-text" class="error">${esc(t(MOVE_ERRORS[ctx.error], l))}</p>${go ? `<p>${go}</p>` : ""}` : "";
  const described = `h-move-text${ctx.error ? " e-move-text" : ""}`;
  let preview = "";
  if (ctx.plans) {
    const useful = ctx.plans.some((p) => p.add > 0);
    preview =
      `<h4 id="move-preview" tabindex="-1">${esc(t(MOVE_COPY.previewTitle, l))}</h4>` +
      (ctx.madeOn ? `<p data-move-made>${esc(fileAgeText(ctx.madeOn, ctx.today, l))}</p>` : "") +
      `<p class="hint">${esc(t(MOVE_COPY.previewHint, l))}</p>` +
      previewTable(ctx.plans, ctx.chosen, l) +
      (useful
        ? (ctx.noneChosen ? `<p class="error" role="alert">${esc(t(MOVE_COPY.noneChosen, l))}</p>` : "") +
          `<p>${button(t(MOVE_COPY.apply, l), { "data-action": "move-apply" })}${button(t(MOVE_COPY.cancel, l), { "data-action": "move-cancel", class: "secondary" })}</p>`
        : `<p class="notice">${esc(t(MOVE_COPY.nothing, l))}</p><p>${button(t(MOVE_COPY.cancel, l), { "data-action": "move-cancel", class: "secondary" })}</p>`);
  }
  return (
    `<h3 id="move-bring">${esc(t(MOVE_COPY.bringTitle, l))}</h3>` +
    `<label for="move-text">${esc(t(MOVE_COPY.pasteLabel, l))}</label><p id="h-move-text" class="hint">${esc(t(MOVE_COPY.pasteHint, l))}</p>${err}` +
    `<textarea id="move-text" rows="6" maxlength="${LIMITS.importChars}" aria-describedby="${described}"${ctx.error ? ' aria-invalid="true"' : ""} style="min-height:44px">${esc(ctx.pasteText)}</textarea>` +
    `<p>${button(t(MOVE_COPY.look, l), { "data-action": "move-look" })}</p>` +
    preview
  );
}

export function renderMove(ctx: MoveContext): string {
  const l = ctx.locale;
  const status = ctx.statusMessage ? `<p class="notice" role="status">${esc(ctx.statusMessage)}</p>` : "";
  return (
    `<section lang="${l}" aria-labelledby="view-title" class="move">` +
    `<h2 id="view-title">${esc(t(MOVE_COPY.title, l))}</h2><p>${esc(t(MOVE_COPY.intro, l))}</p><p class="notice">${esc(t(MOVE_COPY.private, l))}</p>` +
    status +
    takeSection(ctx) +
    bringSection(ctx) +
    `<p>${button(t(MOVE_COPY.back, l), { "data-action": "open-device", class: "secondary" })}</p>` +
    `</section>`
  );
}
