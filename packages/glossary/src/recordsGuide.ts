import { lookupTerm } from './glossary';
import { TERMS, type Lang } from './plainTerms';
import { OPEN_LICENCES } from './provenance';
import { RECORD_COLUMNS, REQUIRED_COLUMNS, type RecordColumn } from './recordsCsv';
import { EMITTED_TIERS } from './sourceTier';
import { escapeHtml } from './text';

/**
 * How to fill in a table of records: what each column is for and which values are read.
 * It is built from the same lists the reader uses, so the guide cannot drift from the code.
 * The column names and the values are a file format: they are the same in both languages.
 */
export const STATUS_VALUES = ['present', 'absent', 'unknown'] as const;

export function isRequiredColumn(column: RecordColumn): boolean {
  return REQUIRED_COLUMNS.includes(column);
}

/** The feature ids a table may use, in glossary order. */
export function featureIds(): readonly string[] {
  return TERMS.map((t) => t.id);
}

/** An empty table: the header row only. */
export function templateCsv(): string {
  return `${RECORD_COLUMNS.join(',')}\r\n`;
}

export const TEMPLATE_FILENAME = 'records-template.csv';
export const TEMPLATE_EXPORT_ID = 'gl-records-template';

export const GUIDE_UI = {
  en: {
    heading: 'How to fill in a table of records',
    intro: 'Use one row for each record. Keep the first row as it is.',
    needed: 'needed',
    optional: 'optional',
    columns: {
      place_id: 'A short id for the place. Use the same id on every row for that place.',
      place_name: 'The name of the place.',
      feature: 'The id of a feature from the list below.',
      status: 'What the source reports: present, absent or unknown.',
      source: 'The name of the source.',
      licence: 'The id of an open licence from the list below.',
      date: 'The date of the source, as year, month and day: 2026-01-31.',
      tier: 'The tier label, if the record has one.',
      url: 'A secure web address for the source, if there is one.',
    },
    features: 'Feature ids',
    licences: 'Licence ids',
    tiers: 'Tier values',
    rule: 'A record with no source, no open licence or no real date is shown as unknown.',
    exportTemplate: 'Save an empty table',
    title: 'How to fill in a table of records',
  },
  fr: {
    heading: 'Comment remplir un tableau de fiches',
    intro: 'Utilisez une ligne par fiche. Gardez la première ligne telle quelle.',
    needed: 'requis',
    optional: 'facultatif',
    columns: {
      place_id: 'Un court identifiant pour le lieu. Utilisez le même sur chaque ligne de ce lieu.',
      place_name: 'Le nom du lieu.',
      feature: 'L’identifiant d’une caractéristique de la liste ci-dessous.',
      status: 'Ce que la source signale. Écrivez present, absent ou unknown.',
      source: 'Le nom de la provenance.',
      licence: 'L’identifiant d’une licence ouverte de la liste ci-dessous.',
      date: 'La date de la provenance, en année, mois et jour, comme 2026-01-31.',
      tier: 'L’étiquette de niveau, si la fiche en a une.',
      url: 'Une adresse Web sécurisée pour la provenance, s’il y en a une.',
    },
    features: 'Identifiants des caractéristiques',
    licences: 'Identifiants des licences',
    tiers: 'Valeurs de niveau',
    rule: 'Une fiche sans provenance, sans licence ouverte ou sans vraie date est affichée comme inconnue.',
    exportTemplate: 'Enregistrer un tableau vide',
    title: 'Comment remplir un tableau de fiches',
  },
} as const;

/** "ramp (Ramp)": the id to type, then the name in the language asked for. */
export function featureLine(id: string, lang: Lang): string {
  return `${id} (${lookupTerm(id, lang).term})`;
}

/** The guide as plain text, to keep beside the table. */
export function guideText(lang: Lang): string {
  const ui = GUIDE_UI[lang];
  const colon = lang === 'fr' ? '\u00a0:' : ':';
  const columns = RECORD_COLUMNS.map((c) => `- ${c} (${isRequiredColumn(c) ? ui.needed : ui.optional})${colon} ${ui.columns[c]}`);
  return [
    ui.title,
    '',
    ui.intro,
    '',
    ...columns,
    '',
    ui.rule,
    '',
    `${ui.features}${colon}`,
    ...featureIds().map((id) => `- ${featureLine(id, lang)}`),
    '',
    `${ui.licences}${colon}`,
    ...OPEN_LICENCES.map((id) => `- ${id}`),
    '',
    `${ui.tiers}${colon}`,
    ...EMITTED_TIERS.map((t) => `- ${t}`),
    '',
  ].join('\n');
}

/** The guide on the page: each column, then the values that are read, then the button for an empty table. */
export function renderRecordsGuide(lang: Lang, canExport: boolean): string {
  const ui = GUIDE_UI[lang];
  const columns = RECORD_COLUMNS.map(
    (c) => `<dt><code>${c}</code> <span class="gl-note">(${escapeHtml(isRequiredColumn(c) ? ui.needed : ui.optional)})</span></dt><dd>${escapeHtml(ui.columns[c])}</dd>`,
  ).join('');
  const list = (title: string, items: readonly string[]): string =>
    `<h4>${escapeHtml(title)}</h4><ul class="gl-codes">${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
  const button = canExport ? `<div class="gl-actions"><button type="button" class="gl-btn" id="${TEMPLATE_EXPORT_ID}">${escapeHtml(ui.exportTemplate)}</button></div>` : '';
  return (
    `<details class="gl-guide"><summary>${escapeHtml(ui.heading)}</summary><p>${escapeHtml(ui.intro)}</p><dl>${columns}</dl><p class="gl-note">${escapeHtml(ui.rule)}</p>` +
    list(ui.features, featureIds().map((id) => featureLine(id, lang))) +
    `${list(ui.licences, OPEN_LICENCES)}${list(ui.tiers, EMITTED_TIERS)}${button}</details>`
  );
}
