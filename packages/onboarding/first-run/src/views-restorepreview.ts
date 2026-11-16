import type { Locale } from "../../switch-first/src/index";
import { COPY, t } from "./copy";
import { button, esc } from "./html";
import { changesNothing, type RestorePreview } from "./restorepreview";

function row(label: string, value: number): string {
  return `<dt>${esc(label)}</dt><dd>${value}</dd>`;
}

/** What a restore would do. Counts only; nothing is restored until the person says so. */
export function renderRestorePreview(p: RestorePreview, locale: Locale): string {
  const l = locale;
  const c = COPY.restorePreview;
  const rows =
    row(t(c.needsInFile, l), p.needsInFile) +
    row(t(c.needsTaken, l), p.needsTaken) +
    row(t(c.shortlistInFile, l), p.shortlistInFile) +
    row(t(c.shortlistAdded, l), p.shortlistAdded) +
    (p.shortlistNoPlace > 0 ? row(t(c.shortlistNoPlace, l), p.shortlistNoPlace) : "") +
    row(t(c.notesInFile, l), p.notesInFile) +
    row(t(c.notesAdded, l), p.notesAdded) +
    (p.notesNoPlace > 0 ? row(t(c.notesNoPlace, l), p.notesNoPlace) : "");
  const none = changesNothing(p);
  const actions = none
    ? `<p class="notice" role="note">${esc(t(c.nothing, l))}</p><p>${button(t(c.close, l), { "data-action": "restore-cancel", class: "secondary" })}</p>`
    : `<p>${button(t(c.restore, l), { "data-action": "restore-confirm" })}${button(t(c.cancel, l), { "data-action": "restore-cancel", class: "secondary" })}</p>`;
  const kept = p.deviceHasNeeds && p.needsInFile > 0 ? `<p class="hint">${esc(t(c.needsKept, l))}</p>` : "";
  return (
    `<div id="restore-preview" class="card" role="region" aria-labelledby="restore-preview-title" tabindex="-1">` +
    `<h4 id="restore-preview-title">${esc(t(c.title, l))}</h4><p>${esc(t(c.intro, l))}</p>${kept}` +
    `<dl class="preview">${rows}</dl>${actions}</div>`
  );
}
