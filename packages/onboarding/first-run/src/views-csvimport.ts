import type { Locale } from "../../switch-first/src/index";
import { t } from "./copy";
import { OPEN_LICENCES } from "./facts";
import { placeId, type Place } from "./places";
import { button, esc } from "./html";
import { CSV_COLUMNS, csvHref } from "./notes-csv";
import {
  CSV_IMPORT_COPY,
  REQUIRED_COLUMNS,
  ROW_PROBLEMS,
  csvAddLabel,
  chosenNotes,
  disagreementText,
  disagreements,
  noteDetailsText,
  csvPreviewLines,
  problemsCsv,
  templateCsv,
  type CsvPreview,
} from "./csvimport";

/** How many rows not used are listed on the page; the download has them all. */
export const PROBLEMS_SHOWN = 50;

const CHOICE_STYLE = "min-height:44px;min-width:44px";
const LINK_STYLE = "display:inline-flex;align-items:center;min-width:44px;min-height:44px";

export interface CsvImportContext {
  readonly text: string;
  readonly preview: CsvPreview | undefined;
  /** A problem with the whole file, or a note about the file being read. */
  readonly message: string | undefined;
  readonly locale: Locale;
  /** Ids of the notes in the preview the person left out. */
  readonly leftOut?: ReadonlySet<string>;
  /** The places already in the notes. */
  readonly places?: readonly Place[];
}

/** The counts, the rows not used (first ones), and the buttons to add or close. */
/** Each note the file would add, with a box to leave it out, and a word when the place is already in the notes. */
export function renderCsvNotes(p: CsvPreview, l: Locale, leftOut: ReadonlySet<string>, places: readonly Place[]): string {
  if (p.notes.length === 0) return "";
  const items = p.notes
    .map((n, i) => {
      const id = `csv-note-${i}`;
      const differ = disagreements(n, places);
      const same = places.some((p) => p.id === placeId(n))
        ? `<span class="hint" id="${id}-same"> ${esc(t(CSV_IMPORT_COPY.samePlace, l))}${differ.map((d) => ` ${esc(disagreementText(d, l))}`).join("")}</span>`
        : "";
      return (
        `<li><label class="choice" style="${CHOICE_STYLE}"><input type="checkbox" id="${id}" data-action="csv-choose" data-value="${esc(n.id)}"${leftOut.has(n.id) ? "" : " checked"}${same ? ` aria-describedby="${id}-same"` : ""}>` +
        `<span data-user-content>${esc(n.address ? `${n.placeName}, ${n.address}` : n.placeName)}</span></label>` +
        ` <span>${esc(noteDetailsText(n, l))}</span>${same}</li>`
      );
    })
    .join("");
  return (
    `<fieldset class="csv-notes"><legend>${esc(t(CSV_IMPORT_COPY.notesTitle, l))}</legend>` +
    `<p class="hint">${esc(t(CSV_IMPORT_COPY.notesHint, l))}</p><ul class="plain">${items}</ul></fieldset>`
  );
}

export function renderCsvPreview(p: CsvPreview, l: Locale, leftOut: ReadonlySet<string> = new Set(), places: readonly Place[] = []): string {
  const chosen = chosenNotes(p, leftOut).length;
  const lines = csvPreviewLines(p, l).map((x) => `<li>${esc(x)}</li>`).join("");
  const shown = p.problems.slice(0, PROBLEMS_SHOWN);
  const more = p.problems.length - shown.length;
  const table =
    p.problems.length === 0
      ? ""
      : `<table><caption>${esc(t(CSV_IMPORT_COPY.problemsTitle, l))}</caption><thead><tr><th scope="col">${esc(t(CSV_IMPORT_COPY.rowColumn, l))}</th><th scope="col">${esc(t(CSV_IMPORT_COPY.columnColumn, l))}</th><th scope="col">${esc(t(CSV_IMPORT_COPY.reasonColumn, l))}</th></tr></thead><tbody>` +
        shown.map((x) => `<tr><td>${x.row}</td><td>${x.column ? `<code data-user-content>${esc(x.column)}</code>` : ""}</td><td>${esc(t(ROW_PROBLEMS[x.code], l))}</td></tr>`).join("") +
        `</tbody></table>` +
        (more > 0 ? `<p>${esc(l === "fr" ? `Et ${more} de plus dans le téléchargement.` : `And ${more} more in the download.`)}</p>` : "") +
        `<p><a class="linkbtn" data-csv-fix download="${l === "fr" ? "lignes-a-corriger.csv" : "rows-to-fix.csv"}" href="${esc(csvHref(problemsCsv(p, l)))}" style="${LINK_STYLE}">${esc(t(CSV_IMPORT_COPY.fixDownload, l))}</a></p>`;
  const add =
    p.notes.length === 0
      ? `<p>${esc(t(CSV_IMPORT_COPY.nothingToAdd, l))}</p>`
      : chosen === 0
        ? `<p>${esc(t(CSV_IMPORT_COPY.noneChosen, l))}</p>`
        : `<p>${button(csvAddLabel(chosen, l), { "data-action": "csv-add" })}</p>`;
  return (
    `<section id="csv-preview" class="preview" aria-labelledby="csv-preview-title" tabindex="-1">` +
    `<h3 id="csv-preview-title">${esc(t(CSV_IMPORT_COPY.previewTitle, l))}</h3>` +
    `<ul>${lines}</ul>` +
    renderCsvNotes(p, l, leftOut, places) +
    table +
    add +
    `<p>${button(t(CSV_IMPORT_COPY.cancel, l), { "data-action": "csv-cancel", class: "secondary" })}</p>` +
    `</section>`
  );
}

export function renderCsvImport(ctx: CsvImportContext): string {
  const l = ctx.locale;
  const columns = CSV_COLUMNS.map((c) => `<li><code>${c}</code>${(REQUIRED_COLUMNS as readonly string[]).includes(c) ? ` (${esc(t(CSV_IMPORT_COPY.required, l))})` : ""}</li>`).join("");
  const message = ctx.message ? `<p id="csv-message" class="notice" tabindex="-1">${esc(ctx.message)}</p>` : "";
  return (
    `<section lang="${l}" aria-labelledby="view-title" class="csv-import">` +
    `<h2 id="view-title">${esc(t(CSV_IMPORT_COPY.title, l))}</h2>` +
    `<p>${esc(t(CSV_IMPORT_COPY.intro, l))}</p>` +
    `<h3 id="csv-columns-title">${esc(t(CSV_IMPORT_COPY.columns, l))}</h3><ul aria-labelledby="csv-columns-title">${columns}</ul>` +
    `<h3 id="csv-licences-title">${esc(t(CSV_IMPORT_COPY.licences, l))}</h3><ul aria-labelledby="csv-licences-title">${OPEN_LICENCES.map((x) => `<li><code>${esc(x)}</code></li>`).join("")}</ul>` +
    `<p><a class="linkbtn" data-csv-template download="${l === "fr" ? "modele-notes.csv" : "notes-template.csv"}" href="${esc(csvHref(templateCsv()))}" style="${LINK_STYLE}">${esc(t(CSV_IMPORT_COPY.template, l))}</a></p>` +
    `<label for="csv-file">${esc(t(CSV_IMPORT_COPY.fileLabel, l))}</label>` +
    `<input id="csv-file" type="file" accept=".csv,text/csv" style="min-height:44px">` +
    `<label for="csv-text">${esc(t(CSV_IMPORT_COPY.pasteLabel, l))}</label>` +
    `<p id="csv-text-hint" class="hint">${esc(t(CSV_IMPORT_COPY.pasteHint, l))}</p>` +
    `<textarea id="csv-text" rows="8" spellcheck="false" aria-describedby="csv-text-hint" style="min-height:44px">${esc(ctx.text)}</textarea>` +
    `<p>${button(t(CSV_IMPORT_COPY.preview, l), { "data-action": "csv-preview" })}</p>` +
    message +
    (ctx.preview ? renderCsvPreview(ctx.preview, l, ctx.leftOut, ctx.places) : "") +
    `<p>${button(t(CSV_IMPORT_COPY.back, l), { "data-action": "view", "data-value": "notes", class: "secondary" })}</p>` +
    `</section>`
  );
}
