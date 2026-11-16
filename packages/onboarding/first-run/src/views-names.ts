import type { Locale } from "../../switch-first/src/index";
import { COPY, t } from "./copy";
import { textHref } from "./helptext";
import { button, esc } from "./html";
import { NAME_SECTIONS, namesFilename, namesToText, summarise, type ControlInfo, type NameSection } from "./names";

/**
 * The "Names on this screen" page. The picker buttons are named "Names on …"
 * so they never repeat the menu names at the top of the page; the audit fails
 * if two controls here share a name.
 */
export interface NamesContext {
  readonly section: NameSection;
  readonly controls: readonly ControlInfo[];
  readonly locale: Locale;
}

const colon = (l: Locale): string => (l === "fr" ? "\u00A0: " : ": ");

export function sectionLabel(section: NameSection, l: Locale): string {
  return t(COPY.names.sections[section], l);
}

/** The picker button label, for example "Names on Help". */
export function pickerLabel(section: NameSection, l: Locale): string {
  return (l === "fr" ? "Noms sur " : "Names on ") + sectionLabel(section, l);
}

function noteFor(c: ControlInfo, l: Locale): string {
  const notes: string[] = [];
  if (c.duplicate) notes.push(t(COPY.names.sameName, l));
  if (c.mismatch) notes.push(t(COPY.names.differs, l));
  if (c.long) notes.push(t(COPY.names.longName, l));
  return notes.length ? notes.join(" ") : t(COPY.names.fine, l);
}

function countLine(n: number, l: Locale): string {
  return n === 1 ? t(COPY.names.countOne, l) : `${n} ${t(COPY.names.countMany, l)}`;
}

export function renderNames(ctx: NamesContext): string {
  const l = ctx.locale;
  const sum = summarise(ctx.controls);
  const picker = NAME_SECTIONS.map((s) =>
    button(pickerLabel(s, l), {
      "data-action": "names-open",
      "data-value": s,
      class: "secondary",
      ...(s === ctx.section ? { "aria-current": "true" } : {}),
    }),
  ).join(" ");
  const rows = ctx.controls
    .map(
      (c) =>
        `<tr><th scope="row">${esc(c.name)}</th><td>${esc(t(COPY.names.kinds[c.kind], l))}</td><td>${esc(noteFor(c, l))}</td></tr>`,
    )
    .join("");
  const title = `${t(COPY.names.title, l)}${colon(l)}${sectionLabel(ctx.section, l)}`;
  const text = namesToText(title, ctx.controls, l, t(COPY.names.intro, l));
  const save = `<p><a href="${esc(textHref(text))}" download="${esc(namesFilename(ctx.section, l))}" style="display:inline-flex;align-items:center;min-height:44px;min-width:44px">${esc(t(COPY.names.save, l))}</a> <span class="muted">${esc(t(COPY.names.saveHint, l))}</span></p>`;
  return (
    `<section lang="${l}" aria-labelledby="view-title" data-names-unique data-names>` +
    `<h2 id="view-title">${esc(t(COPY.names.title, l))}</h2>` +
    `<p>${esc(t(COPY.names.intro, l))}</p>` +
    `<h3 id="names-pick">${esc(t(COPY.names.pick, l))}</h3>` +
    `<div role="group" aria-labelledby="names-pick">${picker}</div>` +
    `<p class="hint">${esc(t(COPY.names.pickHint, l))}</p>` +
    `<h3 id="names-list-title" tabindex="-1">${esc(sectionLabel(ctx.section, l))}</h3>` +
    `<p id="names-summary" role="status">${esc(countLine(sum.total, l))} ${esc(sum.clean ? t(COPY.names.allClear, l) : t(COPY.names.needCheck, l))}</p>` +
    `<table class="names"><caption>${esc(t(COPY.names.caption, l))}</caption>` +
    `<thead><tr><th scope="col">${esc(t(COPY.names.nameHeader, l))}</th><th scope="col">${esc(t(COPY.names.kindHeader, l))}</th><th scope="col">${esc(t(COPY.names.noteHeader, l))}</th></tr></thead>` +
    `<tbody>${rows}</tbody></table>` +
    save +
    `<p>${button(t(COPY.help.backToList, l), { "data-action": "view", "data-value": "help", class: "secondary" })}</p></section>`
  );
}
