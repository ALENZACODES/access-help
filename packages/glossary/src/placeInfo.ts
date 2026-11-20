import { fixFrench } from './frTypography';
import type { Place, PlaceInfo } from './places';
import { UNKNOWN_TOKEN } from './plainLanguage';
import type { Lang } from './plainTerms';
import { validateProvenance, type Provenance } from './provenance';
import { escapeHtml } from './text';

/**
 * The kind of a place and the area it is in. A person looking for a place usually starts with
 * "a library" or "something in my part of town", so the finder can narrow its list by both.
 * A kind or an area is reported only when it comes with a source, an open licence and a real
 * date, exactly like a record about a feature. Without them it is unknown, and the place stays
 * in the list under "unknown" so that it is never hidden by a gap in the data.
 */
export const PLACE_KINDS = [
  'library',
  'community-centre',
  'cafe',
  'restaurant',
  'shop',
  'grocery',
  'pharmacy',
  'bank',
  'park',
  'recreation',
  'school',
  'government',
  'health-centre',
  'transit',
  'theatre',
  'hotel',
  'worship',
  'other',
] as const;
export type PlaceKind = (typeof PLACE_KINDS)[number];

export const MAX_AREA_LENGTH = 60;

export function isPlaceKind(value: unknown): value is PlaceKind {
  return typeof value === 'string' && (PLACE_KINDS as readonly string[]).includes(value);
}

/** The area tidied for keeping: spaces collapsed, cut to the limit. */
export function cleanArea(area: string): string {
  return Array.from(area.replace(/\s+/g, ' ').trim()).slice(0, MAX_AREA_LENGTH).join('').trim();
}

/** true when the info has a source, an open licence and a real date, so it may be reported. */
export function infoIsUsable(info: PlaceInfo | undefined): boolean {
  return info !== undefined && info.provenance !== undefined && validateProvenance(info.provenance).length === 0;
}

export interface EffectiveInfo {
  /** The kind that may be reported, or null when it is unknown. */
  readonly kind: PlaceKind | null;
  /** The area that may be reported, or '' when it is unknown. */
  readonly area: string;
  /** The source behind what is reported, or null when nothing is. */
  readonly provenance: Provenance | null;
}

const NOTHING: EffectiveInfo = { kind: null, area: '', provenance: null };

/**
 * What may be reported about the kind and area of a place. Info without a usable source gives
 * nothing. A kind that is not in the list of kinds is unknown; it is never mapped to a near one.
 */
export function effectiveInfo(place: Pick<Place, 'info'>): EffectiveInfo {
  const info = place.info;
  if (info === undefined || info.provenance === undefined || !infoIsUsable(info)) return NOTHING;
  const kind = isPlaceKind(info.kind) ? info.kind : null;
  const area = cleanArea(info.area ?? '');
  if (kind === null && area === '') return NOTHING;
  return { kind, area, provenance: info.provenance };
}

/** true when at least one place holds something about its kind or area, usable or not. */
export function anyInfo(places: readonly Place[]): boolean {
  return places.some((p) => p.info !== undefined);
}

/** The info as it is kept: an empty kind or area is left out, and so is info that holds nothing at all. */
export function tidyInfo(info: PlaceInfo | undefined): PlaceInfo | undefined {
  if (info === undefined) return undefined;
  const kind = (info.kind ?? '').trim();
  const area = cleanArea(info.area ?? '');
  if (kind === '' && area === '') return undefined;
  return { ...(kind === '' ? {} : { kind }), ...(area === '' ? {} : { area }), ...(info.provenance === undefined ? {} : { provenance: info.provenance }) };
}

/** Everything the info holds, as one text. Two infos with the same text are the same. */
export function infoKey(info: PlaceInfo | undefined): string {
  const t = tidyInfo(info);
  if (t === undefined) return '';
  const p = t.provenance;
  return JSON.stringify([t.kind ?? null, t.area ?? null, p === undefined ? null : [p.source.trim(), p.licence.trim(), p.date.trim(), p.tier ?? null, p.url ?? null]]);
}

/** The place with its info set, or without any when `info` holds nothing. The place given is not changed. */
export function withInfo(place: Place, info: PlaceInfo | undefined): Place {
  const tidy = tidyInfo(info);
  const { info: _old, ...rest } = place;
  return tidy === undefined ? rest : { ...rest, info: tidy };
}

export const PLACEINFO_UI = {
  en: {
    kinds: {
      library: 'Library',
      'community-centre': 'Community centre',
      cafe: 'Coffee shop',
      restaurant: 'Place to eat',
      shop: 'Shop',
      grocery: 'Grocery store',
      pharmacy: 'Pharmacy',
      bank: 'Bank',
      park: 'Park',
      recreation: 'Pool or arena',
      school: 'School',
      government: 'Government office',
      'health-centre': 'Health centre',
      transit: 'Transit station',
      theatre: 'Theatre or cinema',
      hotel: 'Hotel',
      worship: 'Place of worship',
      other: 'Another kind of place',
    },
    line: (kind: string, area: string): string => `Kind of place: ${kind}. Area: ${area}.`,
    from: (source: string, date: string): string => `Source: ${source}, dated ${date}.`,
    notUsable: 'A kind or an area is held for this place, but it has no usable source. It is shown as Unknown.',
  },
  fr: {
    kinds: {
      library: 'Bibliothèque',
      'community-centre': 'Centre communautaire',
      cafe: 'Café',
      restaurant: 'Restaurant',
      shop: 'Magasin',
      grocery: 'Épicerie',
      pharmacy: 'Pharmacie',
      bank: 'Banque',
      park: 'Parc',
      recreation: 'Piscine ou aréna',
      school: 'École',
      government: 'Bureau du gouvernement',
      'health-centre': 'Centre de santé',
      transit: 'Station de transport en commun',
      theatre: 'Théâtre ou cinéma',
      hotel: 'Hôtel',
      worship: 'Lieu de culte',
      other: 'Autre type de lieu',
    },
    line: (kind: string, area: string): string => `Type de lieu\u00a0: ${kind}. Secteur\u00a0: ${area}.`,
    from: (source: string, date: string): string => `Source\u00a0: ${source}, date du ${date}.`,
    notUsable: `Un type ou un secteur est conservé pour ce lieu, mais sans source utilisable. Il est affiché comme ${UNKNOWN_TOKEN}.`,
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

/** The word for what is not known: the token in French, as everywhere else in French copy. */
export function unknownWord(lang: Lang): string {
  return lang === 'fr' ? UNKNOWN_TOKEN : 'Unknown';
}

/** The name of a kind in the language asked for, or the word for unknown. */
export function kindLabel(kind: PlaceKind | null, lang: Lang): string {
  return kind === null ? unknownWord(lang) : PLACEINFO_UI[lang].kinds[kind];
}

/** The area as written by its source, or the word for unknown. */
export function areaLabel(area: string, lang: Lang): string {
  return area === '' ? unknownWord(lang) : area;
}

/** "Kind of place: Library. Area: Riverside. Source: City open data, dated 2026-10-01." */
export function infoText(place: Pick<Place, 'info'>, lang: Lang): string {
  const ui = PLACEINFO_UI[lang];
  const info = effectiveInfo(place);
  const line = ui.line(kindLabel(info.kind, lang), areaLabel(info.area, lang));
  if (info.provenance !== null) return fr(lang, `${line} ${ui.from(info.provenance.source.trim(), info.provenance.date)}`);
  return fr(lang, place.info === undefined ? line : `${line} ${ui.notUsable}`);
}

/** One line under the name of a place: its kind and area, with the source, or unknown. */
export function renderInfoLine(place: Pick<Place, 'info'>, lang: Lang): string {
  const info = effectiveInfo(place);
  return `<p class="gl-note gl-placeinfo" data-kind="${info.kind ?? 'unknown'}" data-area="${info.area === '' ? 'unknown' : 'known'}">${escapeHtml(infoText(place, lang))}</p>`;
}

/* ---------- narrowing the list ---------- */

/** '' means any. "unknown" means only places whose kind (or area) is unknown. Otherwise a kind id, or an area as written. */
export interface InfoFilter {
  readonly kind: string;
  readonly area: string;
}

export const NO_INFO_FILTER: InfoFilter = { kind: '', area: '' };
export const UNKNOWN_CHOICE = 'unknown';

export function isNoInfoFilter(filter: InfoFilter): boolean {
  return filter.kind === '' && filter.area === '';
}

const sameArea = (a: string, b: string): boolean => a.localeCompare(b, undefined, { sensitivity: 'base' }) === 0;

/** true when the place is of the kind and in the area asked for. Only what may be reported counts. */
export function matchesInfoFilter(place: Pick<Place, 'info'>, filter: InfoFilter): boolean {
  if (isNoInfoFilter(filter)) return true;
  const info = effectiveInfo(place);
  if (filter.kind !== '') {
    if (filter.kind === UNKNOWN_CHOICE ? info.kind !== null : info.kind !== filter.kind) return false;
  }
  if (filter.area !== '') {
    if (filter.area === UNKNOWN_CHOICE ? info.area !== '' : info.area === '' || !sameArea(info.area, filter.area)) return false;
  }
  return true;
}

export interface KindCount {
  /** null for places whose kind is unknown. */
  readonly kind: PlaceKind | null;
  readonly places: number;
}

export interface AreaCount {
  /** '' for places whose area is unknown. */
  readonly area: string;
  readonly places: number;
}

/** How many places there are of each kind that may be reported, in the order of the list of kinds, then the unknown ones. */
export function kindCounts(places: readonly Place[]): readonly KindCount[] {
  const counts = new Map<PlaceKind | null, number>();
  for (const place of places) {
    const kind = effectiveInfo(place).kind;
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  const known = PLACE_KINDS.filter((k) => counts.has(k)).map((kind): KindCount => ({ kind, places: counts.get(kind) ?? 0 }));
  const unknown = counts.get(null) ?? 0;
  return unknown > 0 ? [...known, { kind: null, places: unknown }] : known;
}

/** How many places there are in each area that may be reported, in name order, then the unknown ones. Case and accents do not make two areas. */
export function areaCounts(places: readonly Place[]): readonly AreaCount[] {
  const known: { area: string; places: number }[] = [];
  let unknown = 0;
  for (const place of places) {
    const area = effectiveInfo(place).area;
    if (area === '') {
      unknown += 1;
      continue;
    }
    const held = known.find((k) => sameArea(k.area, area));
    if (held === undefined) known.push({ area, places: 1 });
    else held.places += 1;
  }
  known.sort((a, b) => a.area.localeCompare(b.area));
  return unknown > 0 ? [...known, { area: '', places: unknown }] : known;
}

/** The filter with choices that no place can match any more set back to "any". */
export function pruneInfoFilter(filter: InfoFilter, places: readonly Place[]): InfoFilter {
  const kinds = kindCounts(places);
  const areas = areaCounts(places);
  const kindOk = filter.kind === '' || (filter.kind === UNKNOWN_CHOICE ? kinds.some((k) => k.kind === null) : kinds.some((k) => k.kind === filter.kind));
  const areaOk = filter.area === '' || (filter.area === UNKNOWN_CHOICE ? areas.some((a) => a.area === '') : areas.some((a) => a.area !== '' && sameArea(a.area, filter.area)));
  if (kindOk && areaOk) return filter;
  return { kind: kindOk ? filter.kind : '', area: areaOk ? filter.area : '' };
}

export const INFOFILTER_UI = {
  en: {
    legend: 'Narrow the list by kind and area',
    kind: 'Kind of place to show',
    area: 'Area to show',
    anyKind: 'Any kind of place',
    anyArea: 'Any area',
    unknownKind: 'Kind unknown',
    unknownArea: 'Area unknown',
    option: (label: string, places: number): string => `${label} (${places})`,
    showing: (shown: number, all: number): string => `${shown} of ${all} places are of this kind and in this area.`,
    clear: 'Show every kind and area',
    cleared: 'Every kind and area is shown.',
    note: 'A place with no usable source for its kind or area is listed under Unknown. It is never left out.',
  },
  fr: {
    legend: 'Réduire la liste par type et par secteur',
    kind: 'Type de lieu à afficher',
    area: 'Secteur à afficher',
    anyKind: 'Tout type de lieu',
    anyArea: 'Tout secteur',
    unknownKind: `Type ${UNKNOWN_TOKEN}`,
    unknownArea: `Secteur ${UNKNOWN_TOKEN}`,
    option: (label: string, places: number): string => `${label} (${places})`,
    showing: (shown: number, all: number): string => `${shown} lieux sur ${all} sont de ce type et dans ce secteur.`,
    clear: 'Afficher tous les types et secteurs',
    cleared: 'Tous les types et secteurs sont affichés.',
    note: `Un lieu sans source utilisable pour son type ou son secteur est classé sous ${UNKNOWN_TOKEN}. Il n’est jamais retiré.`,
  },
} as const;

export const INFOFILTER_IDS = { kind: 'gl-if-kind', area: 'gl-if-area', clear: 'gl-if-clear' } as const;

/** The value of the area list for an area: its position among the known areas, so a name never has to fit in an attribute. */
export function areaChoiceValue(area: string, places: readonly Place[]): string {
  if (area === '') return '';
  if (area === UNKNOWN_CHOICE) return UNKNOWN_CHOICE;
  const at = areaCounts(places).filter((a) => a.area !== '').findIndex((a) => sameArea(a.area, area));
  return at === -1 ? '' : String(at);
}

/** The area a value of the area list stands for. '' for anything that is not in the list. */
export function areaFromChoice(value: string, places: readonly Place[]): string {
  if (value === UNKNOWN_CHOICE) return areaCounts(places).some((a) => a.area === '') ? UNKNOWN_CHOICE : '';
  if (!/^\d{1,4}$/.test(value)) return '';
  return areaCounts(places).filter((a) => a.area !== '')[Number(value)]?.area ?? '';
}

/** The kind a value of the kind list stands for. '' for anything that is not in the list. */
export function kindFromChoice(value: string, places: readonly Place[]): string {
  const kinds = kindCounts(places);
  if (value === UNKNOWN_CHOICE) return kinds.some((k) => k.kind === null) ? UNKNOWN_CHOICE : '';
  return isPlaceKind(value) && kinds.some((k) => k.kind === value) ? value : '';
}

/**
 * The two lists that narrow the results, each option with its number of places, and a button to
 * show everything again. Nothing is drawn when no place holds a kind or an area: there would be
 * nothing to choose from.
 */
export function renderInfoFilter(places: readonly Place[], filter: InfoFilter, lang: Lang): string {
  if (!anyInfo(places)) return '';
  const ui = INFOFILTER_UI[lang];
  const option = (value: string, label: string, chosen: boolean): string => `<option value="${escapeHtml(value)}"${chosen ? ' selected' : ''}>${escapeHtml(label)}</option>`;
  const kinds =
    option('', ui.anyKind, filter.kind === '') +
    kindCounts(places)
      .map((k) => (k.kind === null ? option(UNKNOWN_CHOICE, ui.option(ui.unknownKind, k.places), filter.kind === UNKNOWN_CHOICE) : option(k.kind, ui.option(kindLabel(k.kind, lang), k.places), filter.kind === k.kind)))
      .join('');
  const chosenArea = areaChoiceValue(filter.area, places);
  let position = -1;
  const areas =
    option('', ui.anyArea, chosenArea === '') +
    areaCounts(places)
      .map((a) => {
        if (a.area === '') return option(UNKNOWN_CHOICE, ui.option(ui.unknownArea, a.places), chosenArea === UNKNOWN_CHOICE);
        position += 1;
        return option(String(position), ui.option(a.area, a.places), chosenArea === String(position));
      })
      .join('');
  const shown = places.filter((p) => matchesInfoFilter(p, filter)).length;
  const status = isNoInfoFilter(filter) ? '' : escapeHtml(ui.showing(shown, places.length));
  const clear = isNoInfoFilter(filter) ? '' : `<button type="button" class="gl-btn" id="${INFOFILTER_IDS.clear}">${escapeHtml(ui.clear)}</button>`;
  return (
    `<fieldset class="gl-fieldset gl-infofilter"><legend>${escapeHtml(ui.legend)}</legend>` +
    `<label for="${INFOFILTER_IDS.kind}">${escapeHtml(ui.kind)}</label><select id="${INFOFILTER_IDS.kind}" class="gl-select">${kinds}</select>` +
    `<label for="${INFOFILTER_IDS.area}">${escapeHtml(ui.area)}</label><select id="${INFOFILTER_IDS.area}" class="gl-select">${areas}</select>` +
    `<p role="status" data-gl-if-status>${status}</p>${clear}<p class="gl-note">${escapeHtml(ui.note)}</p></fieldset>`
  );
}

/* ---------- the panel of counts ---------- */

export const INFOPANEL_UI = {
  en: {
    heading: 'Places by kind and area',
    intro: 'A kind or an area is shown only when it has a usable source. Otherwise it is Unknown.',
    none: 'No place has a kind or an area yet. You can set them below, or load a table that has them.',
    noPlaces: 'There are no places in the list.',
    kindCaption: 'How many places there are of each kind',
    areaCaption: 'How many places there are in each area',
    kind: 'Kind of place',
    area: 'Area',
    places: 'Places',
    summary: (known: number, all: number): string => `${known} of ${all} places have a kind or an area that can be reported.`,
  },
  fr: {
    heading: 'Lieux par type et par secteur',
    intro: `Un type ou un secteur est affiché seulement s’il a une source utilisable. Sinon, il est ${UNKNOWN_TOKEN}.`,
    none: 'Aucun lieu n’a encore de type ni de secteur. Vous pouvez les indiquer plus bas, ou charger un tableau qui les contient.',
    noPlaces: 'Il n’y a aucun lieu dans la liste.',
    kindCaption: 'Nombre de lieux de chaque type',
    areaCaption: 'Nombre de lieux dans chaque secteur',
    kind: 'Type de lieu',
    area: 'Secteur',
    places: 'Lieux',
    summary: (known: number, all: number): string => `${known} lieux sur ${all} ont un type ou un secteur qui peut être signalé.`,
  },
} as const;

/** How many places have a kind or an area that may be reported. */
export function placesWithInfo(places: readonly Place[]): number {
  return places.filter((p) => effectiveInfo(p).provenance !== null).length;
}

/** The panel: how many places have a kind or an area, then one table by kind and one by area. */
export function renderInfoPanel(places: readonly Place[], lang: Lang): string {
  const ui = INFOPANEL_UI[lang];
  if (places.length === 0) return `<p class="gl-note">${escapeHtml(ui.noPlaces)}</p>`;
  const intro = `<p>${escapeHtml(ui.intro)}</p>`;
  if (!anyInfo(places)) return `${intro}<p class="gl-note">${escapeHtml(ui.none)}</p>`;
  const table = (caption: string, head: string, rows: readonly (readonly [string, number, string])[]): string =>
    `<div class="gl-compare-wrap" role="region" aria-label="${escapeHtml(caption)}" tabindex="0"><table class="gl-compare"><caption>${escapeHtml(caption)}</caption>` +
    `<thead><tr><th scope="col">${escapeHtml(head)}</th><th scope="col">${escapeHtml(ui.places)}</th></tr></thead><tbody>` +
    rows.map(([label, n, key]) => `<tr data-row="${escapeHtml(key)}"><th scope="row">${escapeHtml(label)}</th><td>${n}</td></tr>`).join('') +
    `</tbody></table></div>`;
  const kinds = kindCounts(places).map((k) => [kindLabel(k.kind, lang), k.places, k.kind ?? UNKNOWN_CHOICE] as const);
  const areas = areaCounts(places).map((a) => [areaLabel(a.area, lang), a.places, a.area === '' ? UNKNOWN_CHOICE : 'known'] as const);
  return (
    `${intro}<p role="status">${escapeHtml(ui.summary(placesWithInfo(places), places.length))}</p>` +
    table(ui.kindCaption, ui.kind, kinds) +
    table(ui.areaCaption, ui.area, areas)
  );
}
