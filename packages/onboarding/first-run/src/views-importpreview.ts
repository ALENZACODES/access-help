import type { Locale } from "../../switch-first/src/index";
import { COPY, t } from "./copy";
import { button, esc } from "./html";
import type { NotesPreview } from "./importpreview";

/** Most place names listed before "and N more". */
export const PREVIEW_PLACES_SHOWN = 8;

/** "Add 1 note", "Add 3 notes", "Ajouter 1 note", "Ajouter 3 notes". */
export function addLabel(n: number, locale: Locale): string {
  if (locale === "fr") return `Ajouter ${n} ${n > 1 ? "notes" : "note"}`;
  return `Add ${n} ${n === 1 ? "note" : "notes"}`;
}

export function moreText(n: number, locale: Locale): string {
  return locale === "fr" ? `et ${n} autre${n > 1 ? "s" : ""}` : `and ${n} more`;
}

function row(label: string, value: string): string {
  return `<dt>${esc(label)}</dt><dd>${value}</dd>`;
}

function placeList(names: readonly string[], l: Locale): string {
  if (names.length === 0) return "0";
  const shown = names.slice(0, PREVIEW_PLACES_SHOWN).map((n) => `<li data-user-content>${esc(n)}</li>`).join("");
  const more = names.length > PREVIEW_PLACES_SHOWN ? `<li>${esc(moreText(names.length - PREVIEW_PLACES_SHOWN, l))}</li>` : "";
  return `${names.length}<ul class="preview-places">${shown}${more}</ul>`;
}

/** What an import would do. Counts only; nothing has been added until the person says so. */
export function renderImportPreview(p: NotesPreview, locale: Locale): string {
  const l = locale;
  const c = COPY.preview;
  const rows =
    row(t(c.inText, l), String(p.inText)) +
    row(t(c.added, l), `<strong>${p.added}</strong>`) +
    row(t(c.alreadyHere, l), String(p.alreadyHere)) +
    (p.overLimit > 0 ? row(t(c.overLimit, l), String(p.overLimit)) : "") +
    row(t(c.rejected, l), String(p.rejected)) +
    row(t(c.newPlaces, l), placeList(p.newPlaces, l)) +
    row(t(c.morePlaces, l), String(p.morePlaces)) +
    (p.sources.length > 0 ? row(t(c.sources, l), `<span data-user-content>${esc(p.sources.join(", "))}</span>`) : "");
  const actions =
    p.added === 0
      ? `<p class="notice" role="note">${esc(t(c.nothing, l))}</p><p>${button(t(c.close, l), { "data-action": "import-cancel", class: "secondary" })}</p>`
      : `<p>${button(addLabel(p.added, l), { "data-action": "import-confirm" })}${button(t(c.cancel, l), { "data-action": "import-cancel", class: "secondary" })}</p>`;
  return (
    `<div id="import-preview" class="card" role="region" aria-labelledby="import-preview-title" tabindex="-1">` +
    `<h3 id="import-preview-title">${esc(t(c.title, l))}</h3><p>${esc(t(c.intro, l))}</p>` +
    `<dl class="preview">${rows}</dl>${actions}</div>`
  );
}
