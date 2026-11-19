import { fixFrench } from './frTypography';
import type { Place } from './places';
import { TERMS, type Lang } from './plainTerms';
import { isOpenLicence } from './provenance';
import { effectiveStatus } from './status';
import { escapeHtml } from './text';

/**
 * The records held, grouped by licence. Only a record under an open licence that is accepted can
 * be reported; a record under any other licence is held but shown as unknown. The table makes
 * that visible, licence by licence. It is about the data and says nothing about any place.
 */
export interface LicenceGroup {
  /** The licence as written in the records, or '' when a record names none. */
  readonly licence: string;
  /** true for an open licence that is accepted. */
  readonly open: boolean;
  /** Records held that say available or not available. */
  readonly records: number;
  /** Records among them that can be reported. */
  readonly usable: number;
  readonly places: number;
  readonly sources: number;
}

export interface LicenceTotals {
  readonly groups: readonly LicenceGroup[];
  /** Records that say available or not available but have no source at all. */
  readonly noSource: number;
  /** Every record that says available or not available. */
  readonly records: number;
}

const KNOWN: ReadonlySet<string> = new Set(TERMS.map((t) => t.id));

/** One group for each licence in use: accepted licences first, then the others, each in name order. */
export function licenceGroups(places: readonly Place[]): LicenceTotals {
  const map = new Map<string, { records: number; usable: number; places: Set<string>; sources: Set<string> }>();
  let noSource = 0;
  let records = 0;
  for (const place of places) {
    for (const claim of place.claims) {
      if (claim.status === 'unknown' || !KNOWN.has(claim.termId)) continue;
      records += 1;
      if (claim.provenance === undefined) {
        noSource += 1;
        continue;
      }
      const licence = claim.provenance.licence.trim();
      const group = map.get(licence) ?? { records: 0, usable: 0, places: new Set<string>(), sources: new Set<string>() };
      group.records += 1;
      if (effectiveStatus(claim) !== 'unknown') group.usable += 1;
      group.places.add(place.id);
      const source = claim.provenance.source.trim();
      if (source !== '') group.sources.add(source);
      map.set(licence, group);
    }
  }
  const groups = [...map.entries()]
    .map(([licence, g]): LicenceGroup => ({ licence, open: isOpenLicence(licence), records: g.records, usable: g.usable, places: g.places.size, sources: g.sources.size }))
    .sort((x, y) => Number(y.open) - Number(x.open) || x.licence.localeCompare(y.licence));
  return { groups, noSource, records };
}

export const LICENCEVIEW_UI = {
  en: {
    heading: 'Records by licence',
    intro: 'Only a record under an open licence we accept can be reported. Any other record is held but shown as Unknown.',
    none: 'No records are held.',
    caption: 'How many records are held under each licence',
    licence: 'Licence',
    accepted: 'Open licence we accept',
    records: 'Records held',
    usable: 'Records that can be reported',
    places: 'Places',
    sources: 'Sources',
    yes: 'Yes',
    no: 'No',
    noLicence: 'No licence given',
    noSource: (n: number): string => (n === 1 ? '1 more record has no source at all.' : `${n} more records have no source at all.`),
    exportList: 'Save this table as text',
    title: 'Records by licence',
    made: (date: string): string => `Made on ${date}.`,
    line: (licence: string, records: number, usable: number): string => `${licence}: records held ${records}, records that can be reported ${usable}.`,
    acceptedLine: 'It is an open licence we accept.',
    refusedLine: 'It is not an open licence we accept.',
  },
  fr: {
    heading: 'Fiches par licence',
    intro: 'Seule une fiche sous une licence ouverte que nous acceptons peut être signalée. Toute autre fiche est conservée, mais affichée comme UNKNOWN.',
    none: 'Aucune fiche n’est conservée.',
    caption: 'Nombre de fiches conservées sous chaque licence',
    licence: 'Licence d’utilisation',
    accepted: 'Licence ouverte que nous acceptons',
    records: 'Fiches conservées',
    usable: 'Fiches qui peuvent être signalées',
    places: 'Lieux',
    sources: 'Provenances',
    yes: 'Oui',
    no: 'Non',
    noLicence: 'Aucune licence donnée',
    noSource: (n: number): string => (n === 1 ? '1 autre fiche n’a aucune provenance.' : `${n} autres fiches n’ont aucune provenance.`),
    exportList: 'Enregistrer ce tableau en texte',
    title: 'Fiches par licence',
    made: (date: string): string => `Fait le ${date}.`,
    line: (licence: string, records: number, usable: number): string => `${licence}\u00a0: fiches conservées ${records}, fiches qui peuvent être signalées ${usable}.`,
    acceptedLine: 'C’est une licence ouverte que nous acceptons.',
    refusedLine: 'Ce n’est pas une licence ouverte que nous acceptons.',
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

export const LICENCEVIEW_EXPORT_ID = 'gl-licences-export';
export const LICENCEVIEW_MIME = 'text/plain;charset=utf-8';

export function licenceViewFilename(lang: Lang): string {
  return `records-by-licence-${lang}.txt`;
}

/** "CC0-1.0: records held 3, records that can be reported 3. It is an open licence we accept." */
export function licenceGroupText(group: LicenceGroup, lang: Lang): string {
  const ui = LICENCEVIEW_UI[lang];
  const name = group.licence === '' ? ui.noLicence : group.licence;
  return fr(lang, `${ui.line(name, group.records, group.usable)} ${group.open ? ui.acceptedLine : ui.refusedLine}`);
}

/** The table as plain text. */
export function licenceViewText(places: readonly Place[], lang: Lang, today: string): string {
  const ui = LICENCEVIEW_UI[lang];
  const totals = licenceGroups(places);
  const head = `${ui.title}\n${ui.made(today)}\n`;
  if (totals.records === 0) return `${head}\n${ui.none}\n`;
  const lines = totals.groups.map((g) => `- ${licenceGroupText(g, lang)}`);
  const tail = totals.noSource > 0 ? `\n${ui.noSource(totals.noSource)}` : '';
  return `${head}\n${ui.intro}\n${lines.length === 0 ? '' : `\n${lines.join('\n')}\n`}${tail === '' ? '' : `${tail}\n`}`;
}

/** The panel: a table with one row for each licence, then the records with no source. */
export function renderLicenceView(places: readonly Place[], lang: Lang, canExport: boolean): string {
  const ui = LICENCEVIEW_UI[lang];
  const totals = licenceGroups(places);
  if (totals.records === 0) return `<p class="gl-note">${escapeHtml(ui.none)}</p>`;
  const intro = `<p>${escapeHtml(ui.intro)}</p>`;
  const noSource = totals.noSource > 0 ? `<p class="gl-note">${escapeHtml(ui.noSource(totals.noSource))}</p>` : '';
  const button = canExport ? `<div class="gl-actions"><button type="button" class="gl-btn" id="${LICENCEVIEW_EXPORT_ID}">${escapeHtml(ui.exportList)}</button></div>` : '';
  if (totals.groups.length === 0) return `${intro}${noSource}${button}`;
  const body = totals.groups
    .map(
      (g) =>
        `<tr data-open="${g.open ? 'yes' : 'no'}"><th scope="row">${escapeHtml(g.licence === '' ? ui.noLicence : g.licence)}</th><td>${escapeHtml(g.open ? ui.yes : ui.no)}</td>` +
        `<td>${g.records}</td><td>${g.usable}</td><td>${g.places}</td><td>${g.sources}</td></tr>`,
    )
    .join('');
  const heads = [ui.licence, ui.accepted, ui.records, ui.usable, ui.places, ui.sources].map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join('');
  return (
    `${intro}<div class="gl-compare-wrap" role="region" aria-label="${escapeHtml(ui.caption)}" tabindex="0">` +
    `<table class="gl-compare"><caption>${escapeHtml(ui.caption)}</caption><thead><tr>${heads}</tr></thead><tbody>${body}</tbody></table></div>${noSource}${button}`
  );
}
