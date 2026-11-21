import type { Locale } from "../../switch-first/src/index";
import { t } from "./copy";
import { exportHref, type ImportError } from "./exchange";
import { OPEN_LICENCES, type FactKey } from "./facts";
import {
  FILE_ROUND_COPY as C,
  addressText,
  answerText,
  changeText,
  changesByPlace,
  factName,
  inFileLine,
  problemText,
  resultSummary,
  roundErrorText,
  roundFilename,
  roundReport,
  roundSummary,
} from "./fileround-copy";
import type { StreetFile } from "./filestreets";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import { csvHref } from "./notes-csv";
import { textExportHref } from "./textexport";
import { ANSWERS, SOURCE_MAX, roundCsv, roundOnlyFile, roundWithFile, type Answer, type AskFor, type Entries, type PlaceEntry, type Round, type RoundPlace, type RoundProblem, type RoundResult, type RoundSettings } from "./visitrecord";

export interface FileRoundContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  readonly file: StreetFile | undefined;
  readonly round: Round | undefined;
  readonly askFor: AskFor;
  readonly entries: Entries;
  readonly settings: RoundSettings;
  readonly problems: readonly RoundProblem[];
  readonly result: RoundResult | undefined;
  /** True when an answer changed after the notes file was made. */
  readonly edited: boolean;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const ROUND_TEXT_ID = "frd-text";
export const ROUND_OPEN_ID = "frd-open";
export const VISITED_ID = "frd-visited";
export const SOURCE_ID = "frd-source";
export const LICENCE_ID = "frd-licence";

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

export function askId(a: AskFor): string {
  return `frd-ask-${a}`;
}

export function answerId(index: number, key: FactKey, a: Answer): string {
  return `frd-${index}-${key}-${a}`;
}

export function noteId(index: number): string {
  return `frd-note-${index}`;
}

/** Where a problem's link in the error summary sends focus. */
export function problemTarget(p: RoundProblem, round: Round | undefined): string {
  if (p.kind === "settings") return p.code === "licence" ? LICENCE_ID : p.code === "source" ? SOURCE_ID : VISITED_ID;
  const places = round?.places ?? [];
  if (p.kind === "note") return noteId(Math.max(0, places.findIndex((rp) => rp.place.id === p.placeId)));
  const first = places.findIndex((rp) => rp.ask.length > 0);
  const firstPlace = places[first];
  return firstPlace ? answerId(first, firstPlace.ask[0] as FactKey, "yes") : noteId(0);
}

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

function settingsCodes(ctx: FileRoundContext, ...codes: string[]): string[] {
  return ctx.problems.flatMap((p) => (p.kind === "settings" && codes.includes(p.code) ? [p.code] : []));
}

function described(id: string, hint: boolean, codes: readonly string[], l: Locale): { attrs: string; text: string } {
  const ids = [hint ? `h-${id}` : undefined, codes.length > 0 ? `e-${id}` : undefined].filter((x): x is string => x !== undefined);
  const attrs = (ids.length > 0 ? ` aria-describedby="${ids.join(" ")}"` : "") + (codes.length > 0 ? ' aria-invalid="true"' : "");
  const text = codes.length > 0 ? `<p id="e-${id}" class="error">${codes.map((c) => esc(problemText(c as "date", l))).join(" ")}</p>` : "";
  return { attrs, text };
}

export function renderSettings(ctx: FileRoundContext): string {
  const l = ctx.locale;
  const s = ctx.settings;
  const day = described(VISITED_ID, true, settingsCodes(ctx, "date", "future"), l);
  const source = described(SOURCE_ID, true, settingsCodes(ctx, "source"), l);
  const licence = described(LICENCE_ID, true, settingsCodes(ctx, "licence"), l);
  const options = OPEN_LICENCES.map((x) => `<option value="${esc(x)}"${x === s.licence ? " selected" : ""}>${esc(x)}</option>`).join("");
  return (
    `<h3 id="frd-settings">${esc(t(C.settingsTitle, l))}</h3>` +
    `<label for="${VISITED_ID}">${esc(t(C.visitedOnLabel, l))}</label><p id="h-${VISITED_ID}" class="hint">${esc(t(C.visitedOnHint, l))}</p>${day.text}` +
    `<input id="${VISITED_ID}" name="visited" type="text" inputmode="numeric" autocomplete="off" maxlength="10" value="${esc(s.visitedOn)}"${day.attrs} ${FIELD_STYLE}>` +
    `<label for="${SOURCE_ID}">${esc(t(C.sourceLabel, l))}</label><p id="h-${SOURCE_ID}" class="hint">${esc(t(C.sourceHint, l))}</p>${source.text}` +
    `<input id="${SOURCE_ID}" name="source" type="text" autocomplete="off" maxlength="${SOURCE_MAX}" value="${esc(s.source)}"${source.attrs} ${FIELD_STYLE}>` +
    `<label for="${LICENCE_ID}">${esc(t(C.licenceLabel, l))}</label><p id="h-${LICENCE_ID}" class="hint">${esc(t(C.licenceHint, l))}</p>${licence.text}` +
    `<select id="${LICENCE_ID}" name="licence"${licence.attrs} ${FIELD_STYLE}>${options}</select>`
  );
}

/** One place: its details, each a group of Yes, No and Not checked with what the file says now, and a note. */
export function renderRoundPlace(rp: RoundPlace, index: number, entry: PlaceEntry | undefined, ctx: FileRoundContext): string {
  const l = ctx.locale;
  const p = rp.place;
  const details = rp.ask
    .map((key) => {
      const chosen = entry?.answers[key] ?? "skip";
      const hintId = `frd-${index}-${key}-now`;
      const radios = ANSWERS.map(
        (a) =>
          `<label class="choice" for="${answerId(index, key, a)}" ${CHOICE_STYLE}><input type="radio" id="${answerId(index, key, a)}" name="frd-${index}-${key}" value="${a}"${chosen === a ? " checked" : ""} aria-describedby="${hintId}">${esc(answerText(a, l))}</label>`,
      ).join("");
      return `<fieldset><legend>${esc(factName(key, l))}</legend><p id="${hintId}" class="hint">${esc(inFileLine(p.resolutions[key], l))}</p>${radios}</fieldset>`;
    })
    .join("");
  const noteProblems = ctx.problems.flatMap((x) => (x.kind === "note" && x.placeId === p.id ? [x.code] : []));
  const nid = noteId(index);
  const noteErr = noteProblems.length > 0 ? `<p id="e-${nid}" class="error">${noteProblems.map((c) => esc(problemText(c, l))).join(" ")}</p>` : "";
  return (
    `<li data-place="${esc(p.id)}"><h4 id="frd-place-${index}"><span data-user-content>${esc(p.name)}</span></h4>` +
    `<p><span data-user-content>${esc(addressText(p.address, l))}</span></p>` +
    (rp.ask.length === 0 ? `<p class="hint">${esc(t(C.nothingToAsk, l))}</p>` : details) +
    `<label for="${nid}">${esc(t(C.noteLabel, l))}</label>${noteErr}` +
    `<textarea id="${nid}" name="note-${index}" rows="2" maxlength="${LIMITS.note + 100}"${noteProblems.length > 0 ? ` aria-describedby="e-${nid}" aria-invalid="true"` : ""} ${FIELD_STYLE}>${esc(entry?.note ?? "")}</textarea></li>`
  );
}

export function renderResult(ctx: FileRoundContext, file: StreetFile, result: RoundResult): string {
  const l = ctx.locale;
  const groups = changesByPlace(result)
    .map(
      (g) =>
        `<li><span data-user-content>${esc(g.name)}</span>, <span data-user-content>${esc(addressText(g.address, l))}</span><ul>${g.changes.map((c) => `<li>${esc(changeText(c, l))}</li>`).join("")}</ul></li>`,
    )
    .join("");
  return (
    `<h3 id="frd-result" tabindex="-1">${esc(t(C.resultTitle, l))}</h3>` +
    `<p id="frd-result-summary">${esc(resultSummary(result, l))}</p>` +
    (ctx.edited ? `<p class="notice" id="frd-edited">${esc(t(C.edited, l))}</p>` : "") +
    `<p>${link(exportHref(roundOnlyFile(result, ctx.today)), roundFilename("only", ctx.today, l), t(C.downloadOnly, l))}</p>` +
    `<p>${link(exportHref(roundWithFile(file, result, ctx.today)), roundFilename("with", ctx.today, l), t(C.downloadWith, l))}</p>` +
    `<p class="hint">${esc(t(C.keptHint, l))}</p>` +
    `<p>${link(csvHref(roundCsv(result, ctx.settings)), roundFilename("csv", ctx.today, l), t(C.downloadCsv, l))}</p>` +
    `<p>${link(textExportHref(roundReport(result, ctx.settings, l, ctx.today)), roundFilename("report", ctx.today, l), t(C.downloadReport, l))}</p>` +
    (groups === "" ? "" : `<h4 id="frd-changes">${esc(t(C.changesTitle, l))}</h4><ul class="frd-changes">${groups}</ul>`)
  );
}

function renderRound(ctx: FileRoundContext, file: StreetFile, round: Round): string {
  const l = ctx.locale;
  const askRadios = (["open", "all"] as const)
    .map(
      (a) =>
        `<label class="choice" for="${askId(a)}" ${CHOICE_STYLE}><input type="radio" id="${askId(a)}" name="ask" value="${a}"${ctx.askFor === a ? " checked" : ""}>${esc(t(C.askFor[a], l))}</label>`,
    )
    .join("");
  return (
    `<p id="frd-summary" tabindex="-1">${esc(roundSummary(round, l))}</p>` +
    `<form id="frd-ask-form" novalidate><fieldset><legend>${esc(t(C.askLegend, l))}</legend>${askRadios}</fieldset>` +
    `<p>${button(t(C.askUpdate, l), { type: "submit", "data-action": "frd-ask" })}</p></form>` +
    `<form id="frd-round-form" novalidate>` +
    renderSettings(ctx) +
    `<h3 id="frd-places">${esc(t(C.placesTitle, l))}</h3>` +
    `<p class="hint">${esc(t(C.rule, l))}</p>` +
    (round.places.length === 0 ? "" : `<ol class="frd-places">${round.places.map((rp, i) => renderRoundPlace(rp, i, ctx.entries[rp.place.id], ctx)).join("")}</ol>`) +
    `<p>${button(t(C.make, l), { type: "submit", "data-action": "frd-make" })}</p></form>` +
    (ctx.result ? renderResult(ctx, file, ctx.result) : "")
  );
}

function problemLinkText(p: RoundProblem, ctx: FileRoundContext): string {
  const l = ctx.locale;
  if (p.kind === "settings") return esc(problemText(p.code, l));
  if (p.kind === "empty") return esc(problemText("empty", l));
  const place = ctx.round?.places.find((rp) => rp.place.id === p.placeId)?.place;
  return `<span data-user-content>${esc(place?.name ?? "")}</span> ${esc(problemText(p.code, l))}`;
}

export function renderFileRound(ctx: FileRoundContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  const errors = [
    ...(err ? [`<li><a href="#${ROUND_TEXT_ID}">${esc(roundErrorText(err, l))}</a></li>`] : []),
    ...ctx.problems.map((p) => `<li><a href="#${problemTarget(p, ctx.round)}">${problemLinkText(p, ctx)}</a></li>`),
  ];
  return (
    `<div class="app fileround-app" lang="${l}"><section lang="${l}" aria-labelledby="frd-title" class="fileround">` +
    `<h2 id="frd-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="frd-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="frd-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="frd-file-form" novalidate>` +
    `<label for="${ROUND_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${ROUND_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${ROUND_TEXT_ID}" class="error">${esc(roundErrorText(err, l))}</p>` : "") +
    `<textarea id="${ROUND_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${ROUND_TEXT_ID}${err ? ` e-${ROUND_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${ROUND_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${ROUND_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "frd-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "frd-clear", class: "secondary" })}</p>` +
    (ctx.file && ctx.round ? renderRound(ctx, ctx.file, ctx.round) : "") +
    `</section></div>`
  );
}

function isAnswer(s: string | undefined): s is Answer {
  return s === "yes" || s === "no" || s === "skip";
}

/**
 * Reads what is entered on the page into the entries, keyed by place. Places
 * not on the page keep what they had, so changing the details asked about
 * does not lose answers.
 */
export function readEntries(root: ParentNode, round: Round, previous: Entries): Entries {
  const out: Record<string, PlaceEntry> = { ...previous };
  round.places.forEach((rp, i) => {
    const box = root.querySelector<HTMLTextAreaElement>(`#${noteId(i)}`);
    if (!box) return;
    const answers: Partial<Record<FactKey, Answer>> = { ...(previous[rp.place.id]?.answers ?? {}) };
    for (const key of rp.ask) {
      const v = root.querySelector<HTMLInputElement>(`input[name="frd-${i}-${key}"]:checked`)?.value;
      if (isAnswer(v)) answers[key] = v;
    }
    out[rp.place.id] = { answers, note: box.value };
  });
  return out;
}

export function readSettings(root: ParentNode, fallback: RoundSettings): RoundSettings {
  return {
    visitedOn: root.querySelector<HTMLInputElement>(`#${VISITED_ID}`)?.value ?? fallback.visitedOn,
    source: root.querySelector<HTMLInputElement>(`#${SOURCE_ID}`)?.value ?? fallback.source,
    licence: root.querySelector<HTMLSelectElement>(`#${LICENCE_ID}`)?.value ?? fallback.licence,
  };
}
