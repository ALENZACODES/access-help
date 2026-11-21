import type { Locale } from "../../switch-first/src/index";
import { AGE_BANDS, ageRange, agesToText, bandLabel } from "./ages";
import { COPY, NB, t } from "./copy";
import { COVERAGE_COPY, coverageLabel, placesWord } from "./coverage";
import type { ImportError } from "./exchange";
import { FACT_KEYS } from "./facts";
import type { FileSummary } from "./filesummary";
import { FILE_SUMMARY_COPY as C, summaryErrorText, summaryFilename } from "./filesummary-copy";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import { rangeText, sourceName, sourcesToText } from "./sources";
import { downloadLink } from "./views-sources";

export interface FileSummaryContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  readonly summary: FileSummary | undefined;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const SUMMARY_TEXT_ID = "fy-text";
export const SUMMARY_OPEN_ID = "fy-open";

const FIELD_STYLE = 'style="min-height:44px"';

const colon = (l: Locale): string => (l === "fr" ? `${NB}:` : ":");
const th = (text: string): string => `<th scope="col">${esc(text)}</th>`;
const region = (captionId: string, table: string): string => `<div class="table-wrap" role="region" aria-labelledby="${captionId}" tabindex="0">${table}</div>`;

/** The rows of the "file in numbers" table, as [label, count]. */
export function numberRows(s: FileSummary, l: Locale): Array<[string, number]> {
  return [
    [t(C.rows.notes, l), s.notes],
    [t(C.rows.places, l), s.places],
    [t(C.rows.leftOut, l), s.leftOut],
    [t(C.rows.noAddress, l), s.placesWithoutAddress],
    [t(C.rows.severalNotes, l), s.placesWithSeveralNotes],
  ];
}

/** The whole summary as text: the App's own record-ages and sources texts, after the file's numbers, coverage and answers. */
export function summaryText(s: FileSummary, l: Locale, today: Date): string {
  const k = colon(l);
  const lines: string[] = [t(C.textHeading, l), `${t(C.textMade, l)} ${today.toISOString().slice(0, 10)}`, t(C.notScored, l), ""];
  if (s.exportedOn) lines.push(`${t(C.exported, l)} ${s.exportedOn}.`, "");
  for (const [name, n] of numberRows(s, l)) lines.push(`${name}${k} ${n}`);
  lines.push("", t(COVERAGE_COPY.title, l), t(COVERAGE_COPY.notRank, l));
  for (let n = s.coverage.length - 1; n >= 0; n--) lines.push(`- ${coverageLabel(n, FACT_KEYS.length, l)}${k} ${placesWord(s.coverage[n] ?? 0, l)}`);
  lines.push("", t(C.answersTitle, l));
  for (const d of s.details) {
    lines.push(
      `- ${t(COPY.facts[d.key], l)}${k} ${t(C.answersYes, l)} ${d.yes}, ${t(C.answersNo, l)} ${d.no}, ${t(C.answersDiffer, l)} ${d.differ}, ${t(C.answersUnknown, l)} ${d.unknown}`,
    );
  }
  lines.push("", t(C.differTitle, l));
  if (s.differing.length === 0) lines.push(`- ${t(C.noneDiffer, l)}`);
  for (const d of s.differing) lines.push(`- ${t(COPY.facts[d.key], l)}${k} ${d.places.map((p) => p.name).join(", ")}`);
  lines.push("", agesToText(s.ages, l, today).trimEnd(), "", sourcesToText(s.sources, l).trimEnd());
  return `${lines.join("\n")}\n`;
}

export function renderNumbers(s: FileSummary, l: Locale): string {
  const rows = numberRows(s, l)
    .map(([name, n], i) => `<tr data-row="${i}"><th scope="row">${esc(name)}</th><td>${n}</td></tr>`)
    .join("");
  return region(
    "fy-numbers-caption",
    `<table class="fy-numbers"><caption id="fy-numbers-caption">${esc(t(C.numbersCaption, l))}</caption><thead><tr>${th(t(C.numbersWhat, l))}${th(t(C.numbersCount, l))}</tr></thead><tbody>${rows}</tbody></table>`,
  );
}

export function renderCoverageList(s: FileSummary, l: Locale): string {
  const items: string[] = [];
  for (let n = s.coverage.length - 1; n >= 0; n--) {
    items.push(`<li data-recorded="${n}">${esc(coverageLabel(n, FACT_KEYS.length, l))}${colon(l)} <strong>${s.coverage[n] ?? 0}</strong></li>`);
  }
  return (
    `<h3 id="fy-coverage">${esc(t(COVERAGE_COPY.title, l))}</h3><p>${esc(t(COVERAGE_COPY.intro, l))}</p>` +
    `<p class="hint">${esc(t(COVERAGE_COPY.notRank, l))}</p><ul class="totals">${items.join("")}</ul>`
  );
}

export function renderAnswers(s: FileSummary, l: Locale): string {
  const rows = s.details
    .map(
      (d) =>
        `<tr data-key="${d.key}"><th scope="row">${esc(t(COPY.facts[d.key], l))}</th><td data-col="yes">${d.yes}</td><td data-col="no">${d.no}</td><td data-col="differ">${d.differ}</td><td data-col="unknown">${d.unknown}</td></tr>`,
    )
    .join("");
  return (
    `<h3 id="fy-answers">${esc(t(C.answersTitle, l))}</h3>` +
    region(
      "fy-answers-caption",
      `<table class="fy-answers"><caption id="fy-answers-caption">${esc(t(C.answersCaption, l))}</caption>` +
        `<thead><tr>${th(t(C.answersDetail, l))}${th(t(C.answersYes, l))}${th(t(C.answersNo, l))}${th(t(C.answersDiffer, l))}${th(t(C.answersUnknown, l))}</tr></thead><tbody>${rows}</tbody></table>`,
    )
  );
}

export function renderDiffering(s: FileSummary, l: Locale): string {
  const head = `<h3 id="fy-differ">${esc(t(C.differTitle, l))}</h3><p class="hint">${esc(t(C.differIntro, l))}</p>`;
  if (s.differing.length === 0) return `${head}<p>${esc(t(C.noneDiffer, l))}</p>`;
  const items = s.differing
    .map(
      (d, i) =>
        `<li data-key="${d.key}"><h4 id="fy-differ-${i}">${esc(`${t(COPY.facts[d.key], l)} (${d.places.length})`)}</h4>` +
        `<ul>${d.places.map((p) => `<li data-place="${esc(p.id)}"><span data-user-content>${esc(p.name)}</span>, <span data-user-content>${esc(p.address ?? t(COPY.similar.noAddress, l))}</span></li>`).join("")}</ul></li>`,
    )
    .join("");
  return `${head}<ul class="fy-differ">${items}</ul>`;
}

/** Record ages, in the same table form as the App's own ages page, so the App's audit checks that the bands add up. */
export function renderAgesTable(s: FileSummary, l: Locale): string {
  const r = s.ages;
  const head = `<h3 id="fy-ages">${esc(t(COPY.ages.title, l))}</h3><p>${esc(t(COPY.ages.intro, l))}</p><p class="hint">${esc(t(COPY.ages.notWrong, l))}</p>`;
  if (r.records === 0) return `${head}<p>${esc(t(COPY.ages.empty, l))}</p>`;
  const rows = r.rows
    .map(
      (row) =>
        `<tr><th scope="row">${esc(t(COPY.facts[row.key], l))}</th>${AGE_BANDS.map((b) => `<td data-col="${b}">${row.bands[b]}</td>`).join("")}` +
        `<td data-col="records">${row.records}</td><td data-col="unknown">${row.unknownPlaces}</td><td data-col="range">${esc(ageRange(row, l))}</td></tr>`,
    )
    .join("");
  return (
    head +
    region(
      "fy-ages-caption",
      `<table class="data ages" data-kind="ages" data-places="${r.places}"><caption id="fy-ages-caption">${esc(t(COPY.ages.caption, l))}</caption>` +
        `<thead><tr>${th(t(COPY.ages.detail, l))}${AGE_BANDS.map((b) => th(bandLabel(b, l))).join("")}${th(t(COPY.ages.total, l))}${th(t(COPY.ages.noRecord, l))}${th(t(COPY.ages.range, l))}</tr></thead>` +
        `<tbody>${rows}</tbody></table>`,
    )
  );
}

/** Sources, in the same table form as the App's own sources page, so the App's audit checks each row. */
export function renderSourcesTable(s: FileSummary, l: Locale): string {
  const r = s.sources;
  const head = `<h3 id="fy-sources">${esc(t(COPY.sources.title, l))}</h3><p class="hint">${esc(t(COPY.sources.notACheck, l))}</p>`;
  if (r.rows.length === 0) return `${head}<p>${esc(t(COPY.sources.empty, l))}</p>`;
  const rows = r.rows
    .map(
      (row) =>
        `<tr><th scope="row"><span data-user-content>${esc(sourceName(row.source, l))}</span></th><td data-col="details">${row.details}</td>` +
        `<td data-col="yes">${row.yes}</td><td data-col="no">${row.no}</td><td data-col="licences">${esc(row.licences.join(", "))}</td>` +
        `<td data-col="range">${esc(rangeText(row.oldest, row.newest))}</td><td data-col="old">${row.old}</td></tr>`,
    )
    .join("");
  return (
    head +
    region(
      "fy-sources-caption",
      `<table class="data sources" data-kind="sources"><caption id="fy-sources-caption">${esc(t(COPY.sources.caption, l))}</caption>` +
        `<thead><tr>${th(t(COPY.sources.source, l))}${th(t(COPY.sources.details, l))}${th(t(COPY.values.yes, l))}${th(t(COPY.values.no, l))}${th(t(COPY.sources.licences, l))}${th(t(COPY.sources.range, l))}${th(t(COPY.sources.old, l))}</tr></thead>` +
        `<tbody>${rows}</tbody></table>`,
    )
  );
}

export function renderSummaryResults(s: FileSummary, l: Locale, today: Date): string {
  return (
    `<h3 id="fy-results" tabindex="-1">${esc(t(C.resultsTitle, l))}</h3>` +
    (s.exportedOn ? `<p>${esc(`${t(C.exported, l)} ${s.exportedOn}.`)}</p>` : "") +
    `<p class="notice">${esc(t(C.notScored, l))}</p>` +
    renderNumbers(s, l) +
    `<p>${downloadLink(summaryText(s, l, today), summaryFilename(today, l), l, C.download)}</p>` +
    renderCoverageList(s, l) +
    renderAnswers(s, l) +
    renderDiffering(s, l) +
    renderAgesTable(s, l) +
    renderSourcesTable(s, l)
  );
}

export function renderFileSummary(ctx: FileSummaryContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  return (
    `<div class="app filesummary-app" lang="${l}"><section lang="${l}" aria-labelledby="fy-title" class="filesummary">` +
    `<h2 id="fy-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fy-status">${esc(ctx.statusMessage)}</p>` : "") +
    (err
      ? `<div id="fy-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul><li><a href="#${SUMMARY_TEXT_ID}">${esc(summaryErrorText(err, l))}</a></li></ul></div>`
      : "") +
    `<form id="fy-file-form" novalidate>` +
    `<label for="${SUMMARY_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${SUMMARY_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${SUMMARY_TEXT_ID}" class="error">${esc(summaryErrorText(err, l))}</p>` : "") +
    `<textarea id="${SUMMARY_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${SUMMARY_TEXT_ID}${err ? ` e-${SUMMARY_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${SUMMARY_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${SUMMARY_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "fy-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fy-clear", class: "secondary" })}</p>` +
    (ctx.summary ? renderSummaryResults(ctx.summary, l, ctx.today) : "") +
    `</section></div>`
  );
}
