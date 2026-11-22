import type { Locale } from "../../switch-first/src/index";
import {
  MAX_SOURCE,
  applyContacts,
  canClear,
  canRemove,
  cleanedFile,
  contactChanges,
  contactsCsv,
  hasContact,
  textProblem,
  type ContactChoice,
  type ContactProblem,
  type ContactsReport,
  type Finding,
} from "./contactdetails";
import { NB, t } from "./copy";
import { exportHref, type ImportError } from "./exchange";
import {
  FILE_CONTACTS_COPY as C,
  changeText,
  contactProblemText,
  contactsErrorText,
  contactsFilename,
  contactsSummary,
  copySummary,
  findingHeading,
} from "./filecontacts-copy";
import type { StreetFile } from "./filestreets";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import { csvHref } from "./notes-csv";

/** What an item's radio group holds. */
export type ContactPick = "keep" | "remove" | "clear" | "text";
export const CONTACT_PICKS: readonly ContactPick[] = ["keep", "remove", "clear", "text"];

export interface FileContactsContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  readonly file: StreetFile | undefined;
  readonly report: ContactsReport | undefined;
  /** By finding id; an item not here is kept. */
  readonly picks: ReadonlyMap<string, ContactPick>;
  /** Text written again, by finding id, when it differs from the text in the file. */
  readonly typed: ReadonlyMap<string, string>;
  /** Problems with written text, by finding id, shown when the copy is asked for. */
  readonly problems: ReadonlyMap<string, ContactProblem>;
  /** Every item is kept when the copy is asked for. */
  readonly noneError: boolean;
  /** The choices the copy on screen was made with; undefined before one is made. */
  readonly made: ReadonlyMap<string, ContactChoice> | undefined;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const CONTACTS_TEXT_ID = "fct-text";
export const CONTACTS_OPEN_ID = "fct-open";

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

export const groupName = (i: number): string => `fct-pick-${i}`;
export const pickId = (i: number, p: ContactPick): string => `fct-${p}-${i}`;
export const fieldId = (i: number): string => `fct-write-${i}`;

export function isContactPick(s: string | undefined): s is ContactPick {
  return s !== undefined && (CONTACT_PICKS as readonly string[]).includes(s);
}

/** The picks a finding offers, in order. */
export function picksFor(f: Finding): ContactPick[] {
  return CONTACT_PICKS.filter((p) => (p === "remove" ? canRemove(f) : p === "clear" ? canClear(f) : true));
}

/**
 * The choice a pick makes for a finding, or the problem with written text.
 * A pick the finding does not offer keeps the text.
 */
export function choiceOf(f: Finding, pick: ContactPick | undefined, typed: string | undefined): ContactChoice | { problem: ContactProblem } {
  if (pick === undefined || !picksFor(f).includes(pick) || pick === "keep") return { kind: "keep" };
  if (pick === "remove") return { kind: "remove" };
  if (pick === "clear") return { kind: "clear" };
  const text = typed ?? f.text;
  const p = textProblem(f, text);
  return p ? { problem: p } : { kind: "text", text };
}

/** The text with each email and phone number marked, everything escaped. */
export function markedText(f: Finding): string {
  let out = "";
  let at = 0;
  for (const c of f.contacts) {
    out += esc(f.text.slice(at, c.start)) + `<mark>${esc(f.text.slice(c.start, c.end))}</mark>`;
    at = c.end;
  }
  return out + esc(f.text.slice(at));
}

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

function radio(i: number, p: ContactPick, checked: boolean, label: string): string {
  const id = pickId(i, p);
  return `<label class="choice" for="${id}" ${CHOICE_STYLE}><input type="radio" id="${id}" name="${groupName(i)}" value="${p}"${checked ? " checked" : ""}>${esc(label)}</label>`;
}

const PICK_LABEL = { keep: C.keep, remove: C.remove, clear: C.removeAll, text: C.rewrite } as const;

/** One item: where it is, its text with the details marked, what removing them leaves, and the choices. */
export function renderFinding(f: Finding, i: number, ctx: FileContactsContext): string {
  const l = ctx.locale;
  const offered = picksFor(f);
  const chosen = ctx.picks.get(f.id);
  const pick = chosen !== undefined && offered.includes(chosen) ? chosen : "keep";
  const problem = ctx.problems.get(f.id);
  const field = fieldId(i);
  const typed = ctx.typed.get(f.id) ?? f.text;
  const warn = pick === "text" && problem === undefined && hasContact(typed);
  const describedBy = [`h-${field}`, ...(problem ? [`e-${field}`] : []), ...(warn ? [`w-${field}`] : [])].join(" ");
  const multiline = f.field === "note";
  const max = f.field === "note" ? LIMITS.note : f.field === "name" ? LIMITS.placeName : MAX_SOURCE;
  const box = multiline
    ? `<textarea id="${field}" rows="4" maxlength="${max + 40}" aria-describedby="${describedBy}"${problem ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(typed)}</textarea>`
    : `<input id="${field}" type="text" autocomplete="off" maxlength="${max + 40}" value="${esc(typed)}" aria-describedby="${describedBy}"${problem ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>`;
  const preview = canRemove(f)
    ? `<p class="hint">${esc(`${t(C.withoutLabel, l)}${l === "fr" ? `${NB}:` : ":"} `)}<span data-user-content style="white-space:pre-wrap">${esc(f.without === "" ? t(C.removedText, l) : f.without)}</span></p>`
    : `<p class="hint">${esc(t(C.nothingLeft, l))}</p>`;
  return (
    `<li><h4 id="fct-item-${i}"><span data-user-content>${esc(findingHeading(f, l))}</span></h4>` +
    `<p class="fct-found"><span data-user-content style="white-space:pre-wrap">${markedText(f)}</span></p>${preview}` +
    `<fieldset><legend>${esc(`${t(C.itemLegend, l)} ${i + 1}`)}</legend>` +
    offered.map((p) => radio(i, p, pick === p, t(PICK_LABEL[p], l))).join("") +
    `<label for="${field}">${esc(`${t(C.textLabel, l)} ${i + 1}`)}</label><p id="h-${field}" class="hint">${esc(t(C.textHint[f.field], l))}</p>` +
    (problem ? `<p id="e-${field}" class="error">${esc(contactProblemText(problem, l))}</p>` : "") +
    (warn ? `<p id="w-${field}" class="hint">${esc(t(C.stillWarning, l))}</p>` : "") +
    box +
    `</fieldset></li>`
  );
}

export function renderCopy(file: StreetFile, r: ContactsReport, made: ReadonlyMap<string, ContactChoice>, ctx: FileContactsContext): string {
  const l = ctx.locale;
  const copy = applyContacts(file, r, made);
  const changes = contactChanges(r, copy);
  return (
    `<h3 id="fct-copy" tabindex="-1">${esc(t(C.copyTitle, l))}</h3><p id="fct-copy-summary">${esc(copySummary(copy, l))}</p>` +
    (changes.length > 0
      ? `<h4 id="fct-changes">${esc(t(C.changesTitle, l))}</h4><ul class="fct-changes">${changes.map((c) => `<li><span data-user-content style="white-space:pre-wrap">${esc(changeText(c, l))}</span></li>`).join("")}</ul>`
      : "") +
    `<p>${link(exportHref(cleanedFile(copy, ctx.today)), contactsFilename("copy", ctx.today, l), t(C.downloadCopy, l))}</p>` +
    `<p class="hint">${esc(t(C.copyHint, l))}</p>`
  );
}

export function renderFindings(ctx: FileContactsContext, file: StreetFile, r: ContactsReport): string {
  const l = ctx.locale;
  const head = `<h3 id="fct-results" tabindex="-1">${esc(`${t(C.resultsTitle, l)} (${r.findings.length})`)}</h3><p id="fct-summary">${esc(contactsSummary(r, l))}</p>`;
  if (r.findings.length === 0) return `${head}<p id="fct-none">${esc(t(C.none, l))}</p>`;
  return (
    head +
    `<p>${link(csvHref(contactsCsv(r)), contactsFilename("csv", ctx.today, l), t(C.downloadCsv, l))}</p>` +
    `<form id="fct-fix-form" novalidate><ol class="fct-items">${r.findings.map((f, i) => renderFinding(f, i, ctx)).join("")}</ol>` +
    `<p>${button(t(C.make, l), { type: "submit", "data-action": "fct-make" })}</p></form>` +
    (ctx.made === undefined ? "" : renderCopy(file, r, ctx.made, ctx))
  );
}

export function renderFileContacts(ctx: FileContactsContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  const findings = ctx.report?.findings ?? [];
  const errors = [
    ...(err ? [`<li><a href="#${CONTACTS_TEXT_ID}">${esc(contactsErrorText(err, l))}</a></li>`] : []),
    ...(ctx.noneError ? [`<li><a href="#${pickId(0, "keep")}">${esc(t(C.noneChanged, l))}</a></li>`] : []),
    ...findings.flatMap((f, i) => {
      const p = ctx.problems.get(f.id);
      return p ? [`<li><a href="#${fieldId(i)}">${esc(`${t(C.textLabel, l)} ${i + 1} — ${contactProblemText(p, l)}`)}</a></li>`] : [];
    }),
  ];
  return (
    `<div class="app filecontacts-app" lang="${l}"><section lang="${l}" aria-labelledby="fct-title" class="filecontacts">` +
    `<h2 id="fct-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.rule, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fct-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="fct-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="fct-file-form" novalidate>` +
    `<label for="${CONTACTS_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${CONTACTS_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${CONTACTS_TEXT_ID}" class="error">${esc(contactsErrorText(err, l))}</p>` : "") +
    `<textarea id="${CONTACTS_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${CONTACTS_TEXT_ID}${err ? ` e-${CONTACTS_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${CONTACTS_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${CONTACTS_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "fct-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fct-clear", class: "secondary" })}</p>` +
    (ctx.file && ctx.report ? renderFindings(ctx, ctx.file, ctx.report) : "") +
    `</section></div>`
  );
}

/** The pick and written text of each item, as on the page. Text equal to the file's is not kept as written. */
export function readContactPicks(root: ParentNode, r: ContactsReport): { picks: Map<string, ContactPick>; typed: Map<string, string> } {
  const picks = new Map<string, ContactPick>();
  const typed = new Map<string, string>();
  r.findings.forEach((f, i) => {
    const v = root.querySelector<HTMLInputElement>(`input[name="${groupName(i)}"]:checked`)?.value;
    if (isContactPick(v) && v !== "keep") picks.set(f.id, v);
    const box = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${fieldId(i)}`);
    if (box && box.value !== f.text) typed.set(f.id, box.value);
  });
  return { picks, typed };
}
