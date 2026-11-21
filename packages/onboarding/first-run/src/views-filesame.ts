import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";
import { exportHref, type ImportError } from "./exchange";
import {
  FILE_SAME_COPY as C,
  copySummary,
  groupHeading,
  joinedLine,
  linkText,
  matchSummary,
  placeLabel,
  sameErrorText,
  sameFilename,
  sameText,
  stateText,
  typedProblemText,
} from "./filesame-copy";
import type { StreetFile } from "./filestreets";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import { csvHref } from "./notes-csv";
import { FACT_KEYS } from "./facts";
import { TYPED, joinedCopy, joinedFile, matchCsv, newestRecord, recordedCount, type JoinChoices, type LeftOut, type MatchGroup, type MatchReport, type TypedName, type TypedNames, type TypedProblem } from "./placematch";
import { textExportHref } from "./textexport";

export interface FileSameContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  readonly file: StreetFile | undefined;
  /** The groups found in the file, once read. */
  readonly report: MatchReport | undefined;
  /** The choices on the form. */
  readonly choices: JoinChoices;
  /** No group was set to be joined when the copy was asked for. */
  readonly noneError: boolean;
  /** The choices the copy on screen was made with; undefined before one is made. */
  readonly made: JoinChoices | undefined;
  /** Names and addresses typed for groups, as typed. */
  readonly typed: TypedNames;
  /** Problems with typed names, by group, shown when the copy is asked for. */
  readonly typedErrors: ReadonlyMap<string, readonly TypedProblem[]>;
  /** For each group, the places left out of the join. */
  readonly left: LeftOut;
  /** Groups set to be joined with fewer than two places ticked. */
  readonly tooFew: ReadonlySet<string>;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const SAME_TEXT_ID = "fsa-text";
export const SAME_OPEN_ID = "fsa-open";

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

/** The radio group of the group at `index`. */
export function groupName(index: number): string {
  return `fsa-join-${index}`;
}

/** The "keep apart" choice of a group: also where the error summary sends focus. */
export function keepId(index: number): string {
  return `fsa-keep-${index}`;
}

export function typedId(index: number): string {
  return `fsa-typed-${index}`;
}

export function nameId(index: number): string {
  return `fsa-name-${index}`;
}

export function addressId(index: number): string {
  return `fsa-address-${index}`;
}

/** Where a typed-name problem's link sends focus. */
export function problemField(index: number, p: TypedProblem): string {
  return p.startsWith("address") ? addressId(index) : nameId(index);
}

export function includeId(index: number, place: number): string {
  return `fsa-include-${index}-${place}`;
}

export function joinId(index: number, place: number): string {
  return `fsa-join-${index}-${place}`;
}

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

/** One group: why its places may be one, each place with its notes and records, and the choice to keep or join them. */
/** Each place's answer for every detail, side by side, to help decide whether they are one place. */
export function renderRecords(g: MatchGroup, index: number, l: Locale): string {
  const caption = `${t(C.recordsCaption, l)} ${index + 1}`;
  const head = FACT_KEYS.map((k) => `<th scope="col">${esc(t(COPY.facts[k], l))}</th>`).join("");
  const rows = g.places
    .map((p) => `<tr><th scope="row"><span data-user-content>${esc(placeLabel(p, l))}</span></th>${FACT_KEYS.map((k) => `<td>${esc(stateText(p, k, l))}</td>`).join("")}</tr>`)
    .join("");
  return (
    `<div class="table-wrap" tabindex="0" role="region" aria-labelledby="fsa-records-${index}"><table><caption id="fsa-records-${index}">${esc(caption)}</caption>` +
    `<thead><tr><th scope="col">${esc(t(C.columns.place, l))}</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>`
  );
}

/** The fields for a typed name and address, with any problems. */
function typedFields(index: number, typed: TypedName | undefined, problems: readonly TypedProblem[], l: Locale): string {
  const field = (id: string, label: string, value: string, max: number, mine: readonly TypedProblem[]): string =>
    `<label for="${id}">${esc(label)}</label>` +
    (mine.length > 0 ? `<p id="e-${id}" class="error">${mine.map((p) => esc(typedProblemText(p, l))).join(" ")}</p>` : "") +
    `<input id="${id}" type="text" autocomplete="off" maxlength="${max + 20}" value="${esc(value)}" aria-describedby="fsa-typed-hint-${index}${mine.length > 0 ? ` e-${id}` : ""}"${mine.length > 0 ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>`;
  return (
    `<p id="fsa-typed-hint-${index}" class="hint">${esc(t(C.typedHint, l))}</p>` +
    field(nameId(index), `${t(C.typedName, l)} ${index + 1}`, typed?.name ?? "", LIMITS.placeName, problems.filter((p) => problemField(index, p) === nameId(index))) +
    field(addressId(index), `${t(C.typedAddress, l)} ${index + 1}`, typed?.address ?? "", LIMITS.address, problems.filter((p) => problemField(index, p) === addressId(index)))
  );
}

/** A box for each place: ticked to be joined, unticked to stay as it is. */
function includeBoxes(g: MatchGroup, index: number, left: ReadonlySet<string>, tooFew: boolean, l: Locale): string {
  const err = tooFew ? `<p id="e-fsa-include-${index}" class="error">${esc(t(C.tooFew, l))}</p>` : "";
  const boxes = g.places
    .map(
      (p, j) =>
        `<label class="choice" for="${includeId(index, j)}" ${CHOICE_STYLE}><input type="checkbox" id="${includeId(index, j)}" name="fsa-include-${index}" value="${esc(p.id)}"${left.has(p.id) ? "" : " checked"}` +
        ` aria-describedby="fsa-include-hint-${index}${tooFew ? ` e-fsa-include-${index}` : ""}"><span data-user-content>${esc(placeLabel(p, l))}</span></label>`,
    )
    .join("");
  return `<fieldset><legend>${esc(`${t(C.includeLegend, l)} ${index + 1}`)}</legend><p id="fsa-include-hint-${index}" class="hint">${esc(t(C.includeHint, l))}</p>${err}${boxes}</fieldset>`;
}

export function renderGroup(
  g: MatchGroup,
  index: number,
  chosen: string | undefined,
  l: Locale,
  typed?: TypedName,
  problems: readonly TypedProblem[] = [],
  left: ReadonlySet<string> = new Set(),
  tooFew = false,
): string {
  const cols = C.columns;
  const rows = g.places
    .map(
      (p) =>
        `<tr><th scope="row"><span data-user-content>${esc(placeLabel(p, l))}</span></th><td class="num">${p.notes.length}</td>` +
        `<td class="num">${recordedCount(p)}</td><td>${esc(newestRecord(p) ?? t(C.noRecord, l))}</td></tr>`,
    )
    .join("");
  const heading = groupHeading(index, g.places.length, l);
  const caption = `${t(C.placesCaption, l)} ${index + 1}`;
  const legend = `${t(C.choiceLegend, l)} ${index + 1}`;
  const options =
    `<label class="choice" for="${keepId(index)}" ${CHOICE_STYLE}><input type="radio" id="${keepId(index)}" name="${groupName(index)}" value=""${chosen === undefined ? " checked" : ""}>${esc(t(C.keepApart, l))}</label>` +
    g.places
      .map(
        (p, j) =>
          `<label class="choice" for="${joinId(index, j)}" ${CHOICE_STYLE}><input type="radio" id="${joinId(index, j)}" name="${groupName(index)}" value="${esc(p.id)}"${chosen === p.id ? " checked" : ""}>` +
          `${esc(t(C.joinAs, l))} <span data-user-content>${esc(placeLabel(p, l))}</span></label>`,
      )
      .join("") +
    `<label class="choice" for="${typedId(index)}" ${CHOICE_STYLE}><input type="radio" id="${typedId(index)}" name="${groupName(index)}" value="${TYPED}"${chosen === TYPED ? " checked" : ""}>${esc(t(C.joinTyped, l))}</label>` +
    typedFields(index, typed, problems, l);
  return (
    `<li><h4 id="fsa-group-${index}">${esc(heading)}</h4>` +
    `<div class="table-wrap" tabindex="0" role="region" aria-labelledby="fsa-caption-${index}"><table><caption id="fsa-caption-${index}">${esc(caption)}</caption>` +
    `<thead><tr><th scope="col">${esc(t(cols.place, l))}</th><th scope="col" class="num">${esc(t(cols.notes, l))}</th><th scope="col" class="num">${esc(t(cols.recorded, l))}</th><th scope="col">${esc(t(cols.newest, l))}</th></tr></thead>` +
    `<tbody>${rows}</tbody></table></div>` +
    renderRecords(g, index, l) +
    `<p>${esc(t(C.why, l))}${l === "fr" ? NB : ""}:</p><ul>${g.links.map((x) => `<li><span data-user-content>${esc(linkText(x, l))}</span></li>`).join("")}</ul>` +
    `<fieldset><legend>${esc(legend)}</legend>${options}</fieldset>` +
    includeBoxes(g, index, left, tooFew, l) +
    `</li>`
  );
}

export function renderMatches(ctx: FileSameContext, file: StreetFile, r: MatchReport): string {
  const l = ctx.locale;
  const head = `<h3 id="fsa-results" tabindex="-1">${esc(t(C.resultsTitle, l))}</h3><p id="fsa-summary">${esc(matchSummary(r, l))}</p>`;
  if (r.groups.length === 0) return `${head}<p id="fsa-none">${esc(t(C.none, l))}</p>`;
  const made = ctx.made;
  const copy = made === undefined ? undefined : joinedCopy(file, r, made, ctx.typed, ctx.left);
  return (
    head +
    `<p>${link(csvHref(matchCsv(r)), sameFilename("csv", ctx.today, l), t(C.downloadCsv, l))}</p>` +
    `<p>${link(textExportHref(sameText(r, ctx.today, l)), sameFilename("text", ctx.today, l), t(C.downloadText, l))}</p>` +
    `<form id="fsa-join-form" novalidate><ol class="fsa-groups">${r.groups.map((g, i) => renderGroup(g, i, ctx.choices.get(g.id), l, ctx.typed.get(g.id), ctx.typedErrors.get(g.id), ctx.left.get(g.id), ctx.tooFew.has(g.id))).join("")}</ol>` +
    `<p class="hint">${esc(t(C.joinNote, l))}</p>` +
    `<p>${button(t(C.make, l), { type: "submit", "data-action": "fsa-make" })}</p></form>` +
    (copy === undefined
      ? ""
      : `<h3 id="fsa-copy" tabindex="-1">${esc(t(C.copyTitle, l))}</h3><p id="fsa-copy-summary">${esc(copySummary(copy, l))}</p>` +
        `<ul id="fsa-joined">${copy.joined.map((j) => `<li><span data-user-content>${esc(joinedLine(j, l))}</span></li>`).join("")}</ul>` +
        `<p>${link(exportHref(joinedFile(copy, ctx.today)), sameFilename("copy", ctx.today, l), t(C.downloadCopy, l))}</p>` +
        `<p class="hint">${esc(t(C.copyHint, l))}</p>`)
  );
}

export function renderFileSame(ctx: FileSameContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  const errors = [
    ...(err ? [`<li><a href="#${SAME_TEXT_ID}">${esc(sameErrorText(err, l))}</a></li>`] : []),
    ...(ctx.noneError ? [`<li><a href="#${keepId(0)}">${esc(t(C.noneChosen, l))}</a></li>`] : []),
    ...(ctx.report?.groups ?? []).flatMap((g, i) =>
      (ctx.typedErrors.get(g.id) ?? []).map((p) => `<li><a href="#${problemField(i, p)}">${esc(`${groupHeading(i, g.places.length, l)} — ${typedProblemText(p, l)}`)}</a></li>`),
    ),
    ...(ctx.report?.groups ?? []).flatMap((g, i) =>
      ctx.tooFew.has(g.id) ? [`<li><a href="#${includeId(i, 0)}">${esc(`${groupHeading(i, g.places.length, l)} — ${t(C.tooFew, l)}`)}</a></li>`] : [],
    ),
  ];
  return (
    `<div class="app filesame-app" lang="${l}"><section lang="${l}" aria-labelledby="fsa-title" class="filesame">` +
    `<h2 id="fsa-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.rule, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fsa-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="fsa-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="fsa-file-form" novalidate>` +
    `<label for="${SAME_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${SAME_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${SAME_TEXT_ID}" class="error">${esc(sameErrorText(err, l))}</p>` : "") +
    `<textarea id="${SAME_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${SAME_TEXT_ID}${err ? ` e-${SAME_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${SAME_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${SAME_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "fsa-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fsa-clear", class: "secondary" })}</p>` +
    (ctx.file && ctx.report ? renderMatches(ctx, ctx.file, ctx.report) : "") +
    `</section></div>`
  );
}

/** The choices on the page, group by group; a group whose choice is not one of its places is kept apart. */
export function readChoices(root: ParentNode, r: MatchReport): Map<string, string | undefined> {
  const out = new Map<string, string | undefined>();
  r.groups.forEach((g, i) => {
    const v = root.querySelector<HTMLInputElement>(`input[name="${groupName(i)}"]:checked`)?.value;
    out.set(g.id, v === TYPED || g.places.some((p) => p.id === v) ? v : undefined);
  });
  return out;
}

/** The places left out of each group's join on the page: the boxes not ticked. */
export function readLeft(root: ParentNode, r: MatchReport): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  r.groups.forEach((g, i) => {
    const off = new Set<string>();
    g.places.forEach((p, j) => {
      const box = root.querySelector<HTMLInputElement>(`#${includeId(i, j)}`);
      if (box && !box.checked) off.add(p.id);
    });
    if (off.size > 0) out.set(g.id, off);
  });
  return out;
}

/** The names and addresses typed on the page, group by group, kept as typed. */
export function readTyped(root: ParentNode, r: MatchReport, fallback: TypedNames): Map<string, TypedName> {
  const out = new Map<string, TypedName>();
  r.groups.forEach((g, i) => {
    const name = root.querySelector<HTMLInputElement>(`#${nameId(i)}`)?.value;
    const address = root.querySelector<HTMLInputElement>(`#${addressId(i)}`)?.value;
    const before = fallback.get(g.id);
    const next = { name: name ?? before?.name ?? "", address: address ?? before?.address ?? "" };
    if (next.name !== "" || next.address !== "") out.set(g.id, next);
  });
  return out;
}
