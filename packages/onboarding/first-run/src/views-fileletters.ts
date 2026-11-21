import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";
import { exportHref, type ImportError } from "./exchange";
import {
  FILE_LETTERS_COPY as C,
  allLetters,
  asksText,
  languageText,
  letterText,
  lettersErrorText,
  lettersFilename,
  problemText,
  lineText,
  setSummary,
  trackErrorText,
  trackProblemText,
  trackSummary,
  waitingText,
} from "./fileletters-copy";
import type { StreetFile } from "./filestreets";
import { button, esc } from "./html";
import { CONTACT_MAX, LETTER_LANGUAGES, SENDER_MAX, isLetterLanguage, lettersCsv, lettersNotesFile, makeLetters, type Letter, type LetterOptions, type LetterProblem } from "./letters";
import { FOLLOW_UP_DAYS, dueForFollowUp, type TrackFileError, type TrackRow, type Tracking } from "./lettertrack";
import { LIMITS } from "./model";
import { csvHref } from "./notes-csv";
import { textExportHref } from "./textexport";

export interface FileLettersContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  readonly file: StreetFile | undefined;
  /** The form as typed. */
  readonly form: LetterOptions;
  /** The options of the letters on screen; undefined before the first letters are written. */
  readonly applied: LetterOptions | undefined;
  readonly problems: readonly LetterProblem[];
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
  /** The tracking list, read on its own. */
  readonly track: TrackContext;
}

export interface TrackContext {
  readonly text: string;
  readonly error: TrackFileError | undefined;
  readonly missing: readonly string[] | undefined;
  readonly tracking: Tracking | undefined;
  readonly statusMessage: string | undefined;
}

export const EMPTY_TRACK: TrackContext = { text: "", error: undefined, missing: undefined, tracking: undefined, statusMessage: undefined };

export const LETTERS_TEXT_ID = "flt-text";
export const LETTERS_OPEN_ID = "flt-open";
export const SENDER_ID = "flt-sender";
export const CONTACT_ID = "flt-contact";
export const OLD_ID = "flt-old";
export const TRACK_TEXT_ID = "flt-track-text";
export const TRACK_OPEN_ID = "flt-track-open";

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

export function languageId(x: string): string {
  return `flt-lang-${x}`;
}

/** Where a problem's link in the error summary sends focus. */
export function problemTarget(p: LetterProblem): string {
  return p.startsWith("sender") ? SENDER_ID : CONTACT_ID;
}

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${label}</a>`;
}

function field(ctx: FileLettersContext, id: string, name: "sender" | "contact", label: string, hint: string, max: number): string {
  const l = ctx.locale;
  const mine = ctx.problems.filter((p) => problemTarget(p) === id);
  const err = mine.length > 0 ? `<p id="e-${id}" class="error">${mine.map((p) => esc(problemText(p, l))).join(" ")}</p>` : "";
  return (
    `<label for="${id}">${esc(label)}</label><p id="h-${id}" class="hint">${esc(hint)}</p>${err}` +
    `<input id="${id}" name="${name}" type="text" autocomplete="off" maxlength="${max + 20}" value="${esc(ctx.form[name])}"` +
    ` aria-describedby="h-${id}${mine.length > 0 ? ` e-${id}` : ""}"${mine.length > 0 ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>`
  );
}

export function renderLetterForm(ctx: FileLettersContext): string {
  const l = ctx.locale;
  const f = ctx.form;
  const langs = LETTER_LANGUAGES.map(
    (x) =>
      `<label class="choice" for="${languageId(x)}" ${CHOICE_STYLE}><input type="radio" id="${languageId(x)}" name="language" value="${x}"${f.language === x ? " checked" : ""}>${esc(languageText(x, l))}</label>`,
  ).join("");
  return (
    `<h3 id="flt-form" tabindex="-1">${esc(t(C.formTitle, l))}</h3>` +
    `<form id="flt-letter-form" novalidate>` +
    field(ctx, SENDER_ID, "sender", t(C.senderLabel, l), t(C.senderHint, l), SENDER_MAX) +
    field(ctx, CONTACT_ID, "contact", t(C.contactLabel, l), t(C.contactHint, l), CONTACT_MAX) +
    `<fieldset><legend>${esc(t(C.languageLegend, l))}</legend>${langs}</fieldset>` +
    `<p><label class="choice" for="${OLD_ID}" ${CHOICE_STYLE}><input type="checkbox" id="${OLD_ID}" name="old"${f.includeOld ? " checked" : ""}>${esc(t(C.includeOld, l))}</label></p>` +
    `<p>${button(t(C.make, l), { type: "submit", "data-action": "flt-make" })}</p></form>`
  );
}

/** One place's letter: who it goes to, what it asks, the letter itself behind a disclosure, and its download. */
export function renderLetter(letter: Letter, index: number, o: LetterOptions, ctx: FileLettersContext): string {
  const l = ctx.locale;
  const p = letter.place;
  const text = letterText(letter, o);
  return (
    `<li data-place="${esc(p.id)}"><h4 id="flt-letter-${index}"><span data-user-content>${esc(p.name)}</span></h4>` +
    `<p><span data-user-content>${esc(p.address ?? t(C.noAddress, l))}</span></p>` +
    `<p>${esc(asksText(letter.asks, (k) => t(COPY.facts[k], l), l))}</p>` +
    `<details><summary style="min-height:44px">${esc(t(C.showLetter, l))}</summary><pre class="flt-letter" data-user-content>${esc(text)}</pre></details>` +
    `<p>${link(textExportHref(text), lettersFilename("one", index, ctx.today, l), `${esc(t(C.downloadOne, l))}${l === "fr" ? NB : ""}: <span data-user-content>${esc(p.name)}</span>`)}</p></li>`
  );
}

export function renderLetters(ctx: FileLettersContext, file: StreetFile, o: LetterOptions): string {
  const l = ctx.locale;
  const set = makeLetters(file, o.includeOld, ctx.today, l);
  const downloads =
    set.letters.length === 0
      ? ""
      : `<p>${link(textExportHref(allLetters(set, o)), lettersFilename("all", 0, ctx.today, l), esc(t(C.downloadAll, l)))}</p>` +
        `<p>${link(csvHref(lettersCsv(set)), lettersFilename("csv", 0, ctx.today, l), esc(t(C.downloadCsv, l)))}</p>` +
        `<p>${link(exportHref(lettersNotesFile(set, ctx.today)), lettersFilename("notes", 0, ctx.today, l), esc(t(C.downloadNotes, l)))}</p>`;
  return (
    `<h3 id="flt-results" tabindex="-1">${esc(`${t(C.resultsTitle, l)} (${set.letters.length})`)}</h3>` +
    `<p id="flt-summary">${esc(setSummary(set, l))}</p>` +
    `<p class="hint">${esc(t(C.recordsNothing, l))}</p>` +
    downloads +
    (set.letters.length === 0 ? "" : `<ol class="flt-letters">${set.letters.map((x, i) => renderLetter(x, i, o, ctx)).join("")}</ol>`)
  );
}

function placeLine(r: TrackRow, extra: string): string {
  const where = r.address === "" ? "" : `, <span data-user-content>${esc(r.address)}</span>`;
  return `<li><span data-user-content>${esc(r.name)}</span>${where}${extra}</li>`;
}

function trackList(id: string, title: string, items: string[]): string {
  if (items.length === 0) return "";
  return `<h4 id="${id}">${esc(`${title} (${items.length})`)}</h4><ul aria-labelledby="${id}">${items.join("")}</ul>`;
}

/** Where the tracking list's letters stand, under the section's heading: rows to fix first, then the longest waits, then the rest. */
export function renderTracking(tr: Tracking, l: Locale): string {
  const T = C.track;
  const due = dueForFollowUp(tr);
  const sep = l === "fr" ? `${NB}: ` : ": ";
  return (
    `<p id="flt-track-summary" tabindex="-1">${esc(trackSummary(tr, due.length, l))}</p>` +
    trackList(
      "flt-track-unusable",
      t(T.unusable, l),
      tr.unusable.map((r) => `<li>${esc(lineText(r.line, l))}${esc(sep)}${r.name === "" ? "" : `<span data-user-content>${esc(r.name)}</span> — `}${esc(trackProblemText(r.problem, l))}</li>`),
    ) +
    (due.length > 0 ? `<p class="notice" id="flt-track-due">${esc(t(T.followUp, l))}</p>` : "") +
    trackList(
      "flt-track-waiting",
      t(T.waiting, l),
      tr.waiting.map((w) => placeLine(w, ` — ${w.days >= FOLLOW_UP_DAYS ? `<strong>${esc(waitingText(w, l))}</strong>` : esc(waitingText(w, l))}`)),
    ) +
    trackList("flt-track-not-sent", t(T.notSent, l), tr.notSent.map((r) => placeLine(r, ""))) +
    trackList("flt-track-replied", t(T.replied, l), tr.replied.map((r) => placeLine(r, ` — ${esc(r.replyOn)}`))) +
    (tr.replied.length > 0 ? `<p class="hint">${esc(t(T.afterReply, l))}</p>` : "")
  );
}

export function renderTrackSection(track: TrackContext, l: Locale): string {
  const T = C.track;
  const err = track.error;
  const msg = err ? trackErrorText(err, track.missing, l) : "";
  return (
    `<section aria-labelledby="flt-track-title" class="flt-track"><h3 id="flt-track-title">${esc(t(T.title, l))}</h3>` +
    `<p>${esc(t(T.intro, l))}</p>` +
    (track.statusMessage ? `<p class="notice" id="flt-track-status">${esc(track.statusMessage)}</p>` : "") +
    (err ? `<div id="flt-track-errors" class="error-summary" role="alert" tabindex="-1"><h4>${esc(t(C.errorsTitle, l))}</h4><ul><li><a href="#${TRACK_TEXT_ID}">${esc(msg)}</a></li></ul></div>` : "") +
    `<form id="flt-track-form" novalidate>` +
    `<label for="${TRACK_TEXT_ID}">${esc(t(T.pasteLabel, l))}</label>` +
    (err ? `<p id="e-${TRACK_TEXT_ID}" class="error">${esc(msg)}</p>` : "") +
    `<textarea id="${TRACK_TEXT_ID}" name="track" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false"${err ? ` aria-describedby="e-${TRACK_TEXT_ID}" aria-invalid="true"` : ""} ${FIELD_STYLE}>${esc(track.text)}</textarea>` +
    `<label for="${TRACK_OPEN_ID}">${esc(t(T.openLabel, l))}</label>` +
    `<input id="${TRACK_OPEN_ID}" type="file" accept=".csv,text/csv,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(T.read, l), { type: "submit", "data-action": "flt-track-read" })}</p></form>` +
    (track.tracking || track.text !== "" ? `<p>${button(t(T.clear, l), { "data-action": "flt-track-clear", class: "secondary" })}</p>` : "") +
    (track.tracking ? renderTracking(track.tracking, l) : "") +
    `</section>`
  );
}

export function renderFileLetters(ctx: FileLettersContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  const errors = [
    ...(err ? [`<li><a href="#${LETTERS_TEXT_ID}">${esc(lettersErrorText(err, l))}</a></li>`] : []),
    ...ctx.problems.map((p) => `<li><a href="#${problemTarget(p)}">${esc(problemText(p, l))}</a></li>`),
  ];
  return (
    `<div class="app fileletters-app" lang="${l}"><section lang="${l}" aria-labelledby="flt-title" class="fileletters">` +
    `<h2 id="flt-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="flt-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="flt-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="flt-file-form" novalidate>` +
    `<label for="${LETTERS_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${LETTERS_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${LETTERS_TEXT_ID}" class="error">${esc(lettersErrorText(err, l))}</p>` : "") +
    `<textarea id="${LETTERS_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${LETTERS_TEXT_ID}${err ? ` e-${LETTERS_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${LETTERS_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${LETTERS_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "flt-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "flt-clear", class: "secondary" })}</p>` +
    (ctx.file ? renderLetterForm(ctx) + (ctx.applied ? renderLetters(ctx, ctx.file, ctx.applied) : "") : "") +
    renderTrackSection(ctx.track, l) +
    `</section></div>`
  );
}

/** The form's values on the page, or the fallback. */
export function readLetterForm(root: ParentNode, fallback: LetterOptions): LetterOptions {
  const lang = root.querySelector<HTMLInputElement>('input[name="language"]:checked')?.value;
  return {
    sender: root.querySelector<HTMLInputElement>(`#${SENDER_ID}`)?.value ?? fallback.sender,
    contact: root.querySelector<HTMLInputElement>(`#${CONTACT_ID}`)?.value ?? fallback.contact,
    language: isLetterLanguage(lang) ? lang : fallback.language,
    includeOld: root.querySelector<HTMLInputElement>(`#${OLD_ID}`)?.checked ?? fallback.includeOld,
  };
}
