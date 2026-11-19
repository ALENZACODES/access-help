import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t, type Pair } from "./copy";
import { OPEN_LICENCES } from "./facts";
import { esc } from "./html";
import type { Note } from "./model";
import { rangeText, sourceName } from "./sources";
import { downloadLink } from "./views-sources";

/**
 * The records in the notes, counted by open licence. Every Yes or No is saved
 * with one licence, so each record is counted under exactly one row. This
 * says which licence each record was saved under and which sources used it.
 * It does not explain what a licence allows, it does not give legal advice,
 * and it does not say any record is right.
 */
export interface LicenceRow {
  readonly licence: string;
  readonly records: number;
  readonly yes: number;
  readonly no: number;
  /** Source names as saved, sorted. */
  readonly sources: readonly string[];
  /** Notes holding at least one record under this licence. */
  readonly notes: number;
  readonly oldest: string;
  readonly newest: string;
}

/** Strings for the licence section. Kept here so the section can be added without editing the main string table. */
export const LICENCE_COPY = {
  title: { en: "Records by licence", fr: "Données par licence" },
  intro: {
    en: "Each Yes or No is saved under one open licence. This table counts them by licence.",
    fr: "Chaque Oui ou Non est enregistré sous une licence ouverte. Ce tableau les compte par licence.",
  },
  noAdvice: {
    en: "The App only shows the licence each record was saved with. It does not explain what a licence allows. Read the licence itself before you share.",
    fr: "L’App montre seulement la licence de chaque donnée. Elle n’explique pas ce qu’une licence permet. Lisez la licence elle-même avant de partager.",
  },
  caption: {
    en: "One row for each licence in your notes. Yes and No add up to the records.",
    fr: "Une ligne par licence présente dans vos notes. Oui et Non totalisent les données.",
  },
  licence: { en: "Licence", fr: "Licence" },
  records: { en: "Records", fr: "Données" },
  sources: { en: "Sources used", fr: "Sources utilisées" },
  notes: { en: "Notes", fr: "Notes" },
  range: { en: "Dates recorded", fr: "Dates de saisie" },
  download: { en: "Download the licence counts as text", fr: "Télécharger les chiffres par licence en texte" },
  none: { en: "No records yet, so no licence is used.", fr: "Aucune donnée pour le moment, donc aucune licence n’est utilisée." },
} as const satisfies Record<string, Pair>;

const order = (licence: string): number => {
  const i = OPEN_LICENCES.indexOf(licence);
  return i === -1 ? OPEN_LICENCES.length : i;
};

interface Acc {
  yes: number;
  no: number;
  sources: Set<string>;
  notes: Set<string>;
  oldest: string;
  newest: string;
}

/** Rows in the App's licence order, so the same licence is always in the same place. Licences with no record are left out. */
export function collectLicences(notes: readonly Note[]): LicenceRow[] {
  const by = new Map<string, Acc>();
  for (const n of notes) {
    for (const f of n.facts) {
      if (f.value === "unknown" || !f.provenance) continue;
      const p = f.provenance;
      const a = by.get(p.licence) ?? { yes: 0, no: 0, sources: new Set<string>(), notes: new Set<string>(), oldest: p.recordedOn, newest: p.recordedOn };
      if (f.value === "yes") a.yes++;
      else a.no++;
      a.sources.add(p.source);
      a.notes.add(n.id);
      if (p.recordedOn < a.oldest) a.oldest = p.recordedOn;
      if (p.recordedOn > a.newest) a.newest = p.recordedOn;
      by.set(p.licence, a);
    }
  }
  return Array.from(by, ([licence, a]) => ({
    licence,
    records: a.yes + a.no,
    yes: a.yes,
    no: a.no,
    sources: [...a.sources].sort((x, y) => x.localeCompare(y)),
    notes: a.notes.size,
    oldest: a.oldest,
    newest: a.newest,
  })).sort((a, b) => order(a.licence) - order(b.licence) || a.licence.localeCompare(b.licence));
}

/** Records across all rows. Equal to the number of recorded details in the notes. */
export function licenceRecords(rows: readonly LicenceRow[]): number {
  return rows.reduce((n, r) => n + r.records, 0);
}

/** "City survey, Town open data", with the App's own source name in the person's language. */
export function sourceList(row: LicenceRow, locale: Locale): string {
  return row.sources.map((s) => sourceName(s, locale)).join(", ");
}

/** The section as a plain text file of its own. */
export function licencesToText(rows: readonly LicenceRow[], locale: Locale, today: Date): string {
  const l = locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const title = t(LICENCE_COPY.title, l);
  const lines = [title, "=".repeat(Math.min(title.length, 72)), "", t(LICENCE_COPY.intro, l), t(LICENCE_COPY.noAdvice, l), ""];
  if (rows.length === 0) lines.push(t(LICENCE_COPY.none, l), "");
  for (const r of rows) {
    lines.push(r.licence);
    lines.push(`  ${t(LICENCE_COPY.records, l)}${colon} ${r.records} (${t(COPY.values.yes, l)} ${r.yes}, ${t(COPY.values.no, l)} ${r.no})`);
    lines.push(`  ${t(LICENCE_COPY.sources, l)}${colon} ${sourceList(r, l)}`);
    lines.push(`  ${t(LICENCE_COPY.notes, l)}${colon} ${r.notes}`);
    lines.push(`  ${t(LICENCE_COPY.range, l)}${colon} ${rangeText(r.oldest, r.newest)}`);
    lines.push("");
  }
  lines.push(`${t(COPY.textExport.madeOn, l)} ${today.toISOString().slice(0, 10)}.`);
  return lines.join("\n") + "\n";
}

export function licencesFilename(today: Date, locale: Locale): string {
  return `${locale === "fr" ? "donnees-par-licence" : "records-by-licence"}-${today.toISOString().slice(0, 10)}-${locale}.txt`;
}

function row(r: LicenceRow, l: Locale): string {
  return (
    `<tr data-licence="${esc(r.licence)}"><th scope="row">${esc(r.licence)}</th>` +
    `<td data-col="records">${r.records}</td><td data-col="yes">${r.yes}</td><td data-col="no">${r.no}</td>` +
    `<td data-col="sources"><span data-user-content>${esc(sourceList(r, l))}</span></td>` +
    `<td data-col="notes">${r.notes}</td><td data-col="range">${esc(rangeText(r.oldest, r.newest))}</td></tr>`
  );
}

/**
 * The licence section of the sources page. The table sits in a focusable,
 * labelled scroll region so it can be read with a keyboard on a narrow screen.
 */
export function renderLicences(notes: readonly Note[], locale: Locale, today: Date): string {
  const l = locale;
  const rows = collectLicences(notes);
  const head =
    `<h3 id="licences-title">${esc(t(LICENCE_COPY.title, l))}</h3><p>${esc(t(LICENCE_COPY.intro, l))}</p>` +
    `<p class="notice" data-licence-note>${esc(t(LICENCE_COPY.noAdvice, l))}</p>`;
  if (rows.length === 0) return `<section class="licences" aria-labelledby="licences-title">${head}<p data-licences-none>${esc(t(LICENCE_COPY.none, l))}</p></section>`;
  const th = (p: Pair): string => `<th scope="col">${esc(t(p, l))}</th>`;
  const C = LICENCE_COPY;
  return (
    `<section class="licences" aria-labelledby="licences-title">${head}` +
    `<div class="table-wrap" role="region" aria-labelledby="licences-caption" tabindex="0">` +
    `<table class="licence-table" data-kind="licences" data-records="${licenceRecords(rows)}"><caption id="licences-caption">${esc(t(C.caption, l))}</caption>` +
    `<thead><tr>${th(C.licence)}${th(C.records)}${th(COPY.values.yes)}${th(COPY.values.no)}${th(C.sources)}${th(C.notes)}${th(C.range)}</tr></thead>` +
    `<tbody>${rows.map((r) => row(r, l)).join("")}</tbody></table></div>` +
    `<p>${downloadLink(licencesToText(rows, l, today), licencesFilename(today, l), l, C.download)}</p></section>`
  );
}

/** Every string pair in this module, for the copy audit. */
export function licenceStrings(): Array<[string, Pair]> {
  return Object.entries(LICENCE_COPY).map(([k, p]): [string, Pair] => [`LICENCE_COPY.${k}`, p]);
}
