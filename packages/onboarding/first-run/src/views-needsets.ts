import type { Locale } from "../../switch-first/src/index";
import { t } from "./copy";
import type { Requirement } from "./filter";
import { button, esc, namedButton } from "./html";
import { SETS_COPY, SET_NAME_ERRORS, setInUse, setLabel, setSummary, type NeedSet, type SetNameError } from "./needsets";

export interface NeedSetsContext {
  readonly sets: readonly NeedSet[];
  readonly needs: Requirement;
  readonly locale: Locale;
  /** The set waiting for "Yes, remove the set". */
  readonly pendingRemove: string | undefined;
  /** The set being renamed. */
  readonly renaming: string | undefined;
  /** Problems with the name typed, for the new set or the one being renamed. */
  readonly errors: readonly SetNameError[];
  /** What was typed, kept when there is a problem. */
  readonly draft: string;
}

const FIELD_STYLE = "min-height:44px";

function errorBlock(errors: readonly SetNameError[], id: string, l: Locale): string {
  if (errors.length === 0) return "";
  return `<p id="${id}" class="error" role="alert">${errors.map((e) => esc(t(SET_NAME_ERRORS[e], l))).join(" ")}</p>`;
}

function setItem(s: NeedSet, i: number, ctx: NeedSetsContext, inUse: boolean): string {
  const l = ctx.locale;
  const id = `set-${i}`;
  const name = `<p id="${id}"><strong data-user-content>${esc(s.name)}</strong>${inUse ? ` <span class="badge" data-in-use>${esc(t(SETS_COPY.inUse, l))}</span>` : ""}</p>`;
  const summary = `<p class="muted">${esc(setSummary(s, l))}</p>`;
  if (ctx.pendingRemove === s.id) {
    return (
      `<li aria-labelledby="${id}">${name}${summary}<p role="group" aria-labelledby="${id}">` +
      button(t(SETS_COPY.confirmRemove, l), { "data-action": "set-remove-confirm", "data-value": s.id, "aria-describedby": id }) +
      button(t(SETS_COPY.keep, l), { "data-action": "set-remove-cancel", "data-value": s.id, "aria-describedby": id, class: "secondary" }) +
      `</p></li>`
    );
  }
  if (ctx.renaming === s.id) {
    const bad = ctx.errors.length > 0;
    return (
      `<li aria-labelledby="${id}">${name}${summary}` +
      `<form id="set-rename-form" novalidate><label for="set-rename">${esc(t(SETS_COPY.renameLabel, l))}</label>` +
      errorBlock(ctx.errors, "e-set-rename", l) +
      `<input id="set-rename" type="text" maxlength="60" autocomplete="off" value="${esc(ctx.draft)}"${bad ? ' aria-invalid="true" aria-describedby="e-set-rename"' : ""} style="${FIELD_STYLE}">` +
      `<p>${button(t(SETS_COPY.renameSave, l), { type: "submit", "data-action": "set-rename-save", "data-value": s.id })}` +
      `${button(t(SETS_COPY.renameCancel, l), { "data-action": "set-rename-cancel", "data-value": s.id, class: "secondary" })}</p></form></li>`
    );
  }
  return (
    `<li aria-labelledby="${id}">${name}${summary}<p>` +
    (inUse ? "" : namedButton(setLabel("use", s, l), s.name, { "data-action": "set-use", "data-value": s.id })) +
    (inUse ? "" : namedButton(setLabel("update", s, l), s.name, { "data-action": "set-update", "data-value": s.id, class: "secondary" })) +
    namedButton(setLabel("rename", s, l), s.name, { "data-action": "set-rename", "data-value": s.id, class: "secondary" }) +
    namedButton(setLabel("remove", s, l), s.name, { "data-action": "set-remove", "data-value": s.id, class: "secondary" }) +
    `</p></li>`
  );
}

/** The saved sets on the must-haves page, and the form to save the must-haves in use as one more. */
export function renderNeedSets(ctx: NeedSetsContext): string {
  const l = ctx.locale;
  const inUse = setInUse(ctx.sets, ctx.needs);
  const list =
    ctx.sets.length === 0
      ? `<p>${esc(t(SETS_COPY.none, l))}</p>`
      : `<ul class="plain need-sets">${ctx.sets.map((s, i) => setItem(s, i, ctx, s.id === inUse?.id)).join("")}</ul>`;
  const adding = ctx.renaming === undefined;
  const bad = adding && ctx.errors.length > 0;
  const form =
    `<form id="set-new-form" novalidate><label for="set-name">${esc(t(SETS_COPY.nameLabel, l))}</label>` +
    `<p id="set-name-hint" class="hint">${esc(t(SETS_COPY.nameHint, l))}</p>` +
    (adding ? errorBlock(ctx.errors, "e-set-name", l) : "") +
    `<input id="set-name" type="text" maxlength="60" autocomplete="off" value="${esc(adding ? ctx.draft : "")}" aria-describedby="set-name-hint${bad ? " e-set-name" : ""}"${bad ? ' aria-invalid="true"' : ""} style="${FIELD_STYLE}">` +
    `<p>${button(t(SETS_COPY.save, l), { type: "submit", "data-action": "set-save" })}</p></form>`;
  return (
    `<section class="need-sets-section" aria-labelledby="need-sets-title">` +
    `<h3 id="need-sets-title">${esc(t(SETS_COPY.title, l))}</h3>` +
    `<p>${esc(t(SETS_COPY.intro, l))}</p>` +
    list +
    form +
    `</section>`
  );
}
