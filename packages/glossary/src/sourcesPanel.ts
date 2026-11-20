import { effectiveContact } from './placeContact';
import { infoIsUsable } from './placeInfo';
import { fixFrench } from './frTypography';
import { creditLine, licenceLabel, needsCredit, renderLicenceDuties, licenceDuties, LICENCE_UI } from './licenceInfo';
import type { Place } from './places';
import type { Lang } from './plainTerms';
import { validateProvenance, type Provenance } from './provenance';
import { effectiveStatus } from './status';
import { EMITTED_TIERS, effectiveTier, renderTierLegend, tierCounts, tierName, type SourceTier } from './sourceTier';
import { escapeHtml } from './text';

/**
 * Where the loaded information comes from: one entry for each source and licence, with how many
 * records it gave, their dates and their tiers. It works offline, from the records themselves.
 * The credits can be saved as text, so a person who shares the information can say where it is from.
 */
export interface SourceGroup {
  readonly source: string;
  readonly licence: string;
  /** Records that say something (available or not available) from this source. */
  readonly records: number;
  /** Places with at least one such record. */
  readonly places: number;
  /** Oldest and newest record dates (YYYY-MM-DD). */
  readonly oldest: string;
  readonly newest: string;
  /** The tiers that may be shown, in order. */
  readonly tiers: readonly SourceTier[];
  /** Records whose tier is missing or cannot be shown. */
  readonly unknownTier: number;
  /** true when this is the source of the place list itself. */
  readonly ofList: boolean;
}

const keyOf = (p: Pick<Provenance, 'source' | 'licence'>): string => JSON.stringify([p.source.trim(), p.licence.trim()]);

interface Building {
  source: string;
  licence: string;
  records: number;
  placeIds: Set<string>;
  oldest: string;
  newest: string;
  tiers: Set<SourceTier>;
  unknownTier: number;
  ofList: boolean;
}

/**
 * The sources behind the loaded records, most records first, then by name. Only records that may
 * be reported are counted. `listSource` is the source of the place list; it is always included.
 */
export function sourceGroups(places: readonly Place[], listSource?: Provenance | null): readonly SourceGroup[] {
  const groups = new Map<string, Building>();
  const start = (p: Provenance, ofList: boolean): Building => {
    const key = keyOf(p);
    let g = groups.get(key);
    if (g === undefined) {
      g = { source: p.source.trim(), licence: p.licence.trim(), records: 0, placeIds: new Set(), oldest: p.date, newest: p.date, tiers: new Set(), unknownTier: 0, ofList };
      groups.set(key, g);
    }
    if (ofList) g.ofList = true;
    if (p.date < g.oldest) g.oldest = p.date;
    if (p.date > g.newest) g.newest = p.date;
    return g;
  };
  if (listSource !== undefined && listSource !== null && validateProvenance(listSource).length === 0) start(listSource, true);
  for (const place of places) {
    // The source of a place's kind and area is credited too, even when it gave no record about a feature.
    if (place.info?.provenance !== undefined && infoIsUsable(place.info)) start(place.info.provenance, false).placeIds.add(place.id);
    // And so is the source of the contact details that are shown.
    const reach = effectiveContact(place).provenance;
    if (reach !== null) start(reach, false).placeIds.add(place.id);
    for (const claim of place.claims) {
      if (claim.provenance === undefined || effectiveStatus(claim) === 'unknown') continue;
      const g = start(claim.provenance, false);
      g.records += 1;
      g.placeIds.add(place.id);
      const tier = effectiveTier(claim.provenance);
      if (tier === null) g.unknownTier += 1;
      else g.tiers.add(tier);
    }
  }
  return [...groups.values()]
    .map((g) => ({
      source: g.source,
      licence: g.licence,
      records: g.records,
      places: g.placeIds.size,
      oldest: g.oldest,
      newest: g.newest,
      tiers: EMITTED_TIERS.filter((t) => g.tiers.has(t)),
      unknownTier: g.unknownTier,
      ofList: g.ofList,
    }))
    .sort((a, b) => b.records - a.records || a.source.localeCompare(b.source) || a.licence.localeCompare(b.licence));
}

export const SOURCES_UI = {
  en: {
    heading: 'Where this information comes from',
    intro: 'Each record keeps its source, licence, date and tier. This list works offline.',
    none: 'No sources are loaded.',
    count: (n: number): string => (n === 1 ? '1 source' : `${n} sources`),
    records: (n: number): string => (n === 1 ? '1 record' : `${n} records`),
    places: (n: number): string => (n === 1 ? 'for 1 place' : `for ${n} places`),
    licence: (licence: string): string => `Licence: ${licence}.`,
    oneDate: (date: string): string => `Dated ${date}.`,
    dates: (oldest: string, newest: string): string => `Dated from ${oldest} to ${newest}.`,
    tiers: (tiers: string): string => `Tiers: ${tiers}.`,
    ofList: 'The list of places comes from this source.',
    exportCredits: 'Save the credits as text',
    title: 'Credits for the information',
    made: (date: string): string => `Made on ${date}.`,
    mustCredit: 'Say where the data came from when you share it.',
  },
  fr: {
    heading: 'D’où vient cette information',
    intro: 'Chaque fiche garde sa provenance, sa licence, sa date et son niveau. Cette liste fonctionne hors ligne.',
    none: 'Aucune provenance n’est chargée.',
    count: (n: number): string => (n === 1 ? '1 provenance' : `${n} provenances`),
    records: (n: number): string => (n === 1 ? '1 fiche' : `${n} fiches`),
    places: (n: number): string => (n === 1 ? 'pour 1 lieu' : `pour ${n} lieux`),
    licence: (licence: string): string => `Licence\u00a0: ${licence}.`,
    oneDate: (date: string): string => `Datée du ${date}.`,
    dates: (oldest: string, newest: string): string => `Datées du ${oldest} au ${newest}.`,
    tiers: (tiers: string): string => `Niveaux\u00a0: ${tiers}.`,
    ofList: 'La liste des lieux vient de cette provenance.',
    exportCredits: 'Enregistrer les mentions en texte',
    title: 'Mentions pour l’information',
    made: (date: string): string => `Fait le ${date}.`,
    mustCredit: 'Dites d’où viennent les données quand vous les partagez.',
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

/** "Tier 0, Tier 1, Tier unknown" for a source: the tiers that may be shown, then unknown if any record has none. */
export function groupTiersText(g: Pick<SourceGroup, 'tiers' | 'unknownTier' | 'records'>, lang: Lang): string {
  const names = g.tiers.map((t) => tierName(t, lang));
  if (g.unknownTier > 0 || names.length === 0) names.push(tierName(null, lang));
  return names.join(', ');
}

/** The date or the date range of a source's records. */
export function groupDatesText(g: Pick<SourceGroup, 'oldest' | 'newest'>, lang: Lang): string {
  const ui = SOURCES_UI[lang];
  return g.oldest === g.newest ? ui.oneDate(g.newest) : ui.dates(g.oldest, g.newest);
}

/** The lines that describe one source, without its name. */
export function groupLines(g: SourceGroup, lang: Lang): readonly string[] {
  const ui = SOURCES_UI[lang];
  const lines = [`${ui.records(g.records)}, ${ui.places(g.places)}.`, ui.licence(licenceLabel(g.licence)), groupDatesText(g, lang), ui.tiers(groupTiersText(g, lang))];
  if (g.ofList) lines.push(ui.ofList);
  return lines.map((l) => fr(lang, l));
}

export const CREDITS_EXPORT_ID = 'gl-credits-export';
export const CREDITS_MIME = 'text/plain;charset=utf-8';

export function creditsFilename(lang: Lang): string {
  return `data-credits-${lang}.txt`;
}

/** The credits as plain text: one block for each source, then the note that this is not legal advice. */
export function creditsText(groups: readonly SourceGroup[], lang: Lang, today: string): string {
  const ui = SOURCES_UI[lang];
  const head = `${ui.title}\n${ui.made(today)}\n`;
  if (groups.length === 0) return `${head}\n${ui.none}\n`;
  const blocks = groups.map((g) => {
    const lines = [creditLine({ source: g.source, licence: g.licence, date: g.newest }, lang), ...licenceDuties(g.licence, lang).map((d) => `- ${d}`)];
    return lines.join('\n');
  });
  return `${head}\n${blocks.join('\n\n')}\n\n${LICENCE_UI[lang].note}\n`;
}

/** true when at least one loaded source asks for credit. */
export function anyNeedsCredit(groups: readonly SourceGroup[]): boolean {
  return groups.some((g) => needsCredit(g.licence));
}

/** The panel: each source with its counts, licence, dates and tiers; what the licences ask; the tier legend. */
export function renderSources(places: readonly Place[], listSource: Provenance | null | undefined, lang: Lang, canExport: boolean): string {
  const ui = SOURCES_UI[lang];
  const groups = sourceGroups(places, listSource);
  const intro = `<p>${escapeHtml(ui.intro)}</p>`;
  if (groups.length === 0) return `${intro}<p class="gl-note">${escapeHtml(ui.none)}</p>`;
  const items = groups
    .map((g) => `<li><strong>${escapeHtml(g.source)}</strong><ul>${groupLines(g, lang).map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul></li>`)
    .join('');
  const credit = anyNeedsCredit(groups) ? `<p class="gl-note">${escapeHtml(ui.mustCredit)}</p>` : '';
  const button = canExport ? `<div class="gl-actions"><button type="button" class="gl-btn" id="${CREDITS_EXPORT_ID}">${escapeHtml(ui.exportCredits)}</button></div>` : '';
  return (
    `${intro}<p role="status">${escapeHtml(ui.count(groups.length))}</p><ul class="gl-sources">${items}</ul>${credit}` +
    `${renderLicenceDuties(groups.map((g) => g.licence), lang)}${renderTierLegend(tierCounts(places), lang)}${button}`
  );
}
