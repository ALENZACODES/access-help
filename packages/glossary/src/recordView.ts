import { fixFrench } from './frTypography';
import type { Place, PlaceContact, PlaceInfo } from './places';
import type { Lang } from './plainTerms';
import { effectiveTier } from './sourceTier';
import { effectiveStatus, type FeatureClaim } from './status';
import { escapeHtml } from './text';

/**
 * Which records to count. A person can leave out a source, or count only records that carry a
 * tier, to see what the remaining records report. Nothing is deleted: records that are left out
 * stay on the device and come back when the choice is undone. Leaving records out can only
 * change what is reported to what the remaining sources say; it never fills in an unknown.
 */
export const TIER_CHOICES = ['all', 'shown', 'tier-1'] as const;
export type TierChoice = (typeof TIER_CHOICES)[number];

export interface RecordView {
  readonly tier: TierChoice;
  /** Names of the sources that are left out. */
  readonly hiddenSources: readonly string[];
}

export const DEFAULT_RECORD_VIEW: RecordView = { tier: 'all', hiddenSources: [] };
export const RECORD_VIEW_KEY = 'glossary-record-view';
export const MAX_HIDDEN_SOURCES = 50;
const MAX_NAME = 200;

export function isTierChoice(value: unknown): value is TierChoice {
  return typeof value === 'string' && (TIER_CHOICES as readonly string[]).includes(value);
}

export function isDefaultRecordView(view: RecordView): boolean {
  return view.tier === 'all' && view.hiddenSources.length === 0;
}

/** A view with a known tier choice and a clean list of names: trimmed, once each, in name order, within the limits. */
export function normaliseRecordView(view: { readonly tier?: unknown; readonly hiddenSources?: unknown }): RecordView {
  const raw = Array.isArray(view.hiddenSources) ? view.hiddenSources : [];
  const names = raw
    .filter((n): n is string => typeof n === 'string')
    .map((n) => n.trim())
    .filter((n) => n !== '' && n.length <= MAX_NAME);
  const hiddenSources = [...new Set(names)].sort((a, b) => a.localeCompare(b)).slice(0, MAX_HIDDEN_SOURCES);
  return { tier: isTierChoice(view.tier) ? view.tier : 'all', hiddenSources };
}

export function setTierChoice(view: RecordView, tier: string): RecordView {
  return isTierChoice(tier) && tier !== view.tier ? { ...view, tier } : view;
}

/** Counts a source (counted = true) or leaves it out. The same view when nothing changes. */
export function setSourceCounted(view: RecordView, source: string, counted: boolean): RecordView {
  const name = source.trim();
  if (name === '') return view;
  const hidden = view.hiddenSources.includes(name);
  if (hidden === !counted) return view;
  const next = counted ? view.hiddenSources.filter((n) => n !== name) : [...view.hiddenSources, name];
  return normaliseRecordView({ tier: view.tier, hiddenSources: next });
}

export function serialiseRecordView(view: RecordView): string {
  return JSON.stringify(view);
}

/** Null unless the text is a JSON object. Anything odd inside it falls back to counting every record. */
export function parseRecordView(json: string): RecordView | null {
  try {
    const raw: unknown = JSON.parse(json);
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
    return normaliseRecordView(raw as { tier?: unknown; hiddenSources?: unknown });
  } catch {
    return null;
  }
}

/** true when the record is counted under this view. */
export function countsRecord(claim: FeatureClaim, view: RecordView): boolean {
  const source = claim.provenance?.source.trim() ?? '';
  if (source !== '' && view.hiddenSources.includes(source)) return false;
  if (view.tier === 'all') return true;
  const tier = effectiveTier(claim.provenance);
  return view.tier === 'shown' ? tier !== null : tier === 'tier-1';
}

/** true when the kind and area of a place are counted under this view. The same rules as for a record. */
export function countsInfo(info: PlaceInfo | PlaceContact, view: RecordView): boolean {
  const source = info.provenance?.source.trim() ?? '';
  if (source !== '' && view.hiddenSources.includes(source)) return false;
  if (view.tier === 'all') return true;
  const tier = effectiveTier(info.provenance);
  return view.tier === 'shown' ? tier !== null : tier === 'tier-1';
}

/**
 * The places with only the records that are counted. Every place stays, in the same order, so a
 * place whose records are all left out is shown with every feature unknown. The same list is
 * returned when every record is counted, and a place that loses nothing is the same object.
 */
export function applyRecordView(places: readonly Place[], view: RecordView): readonly Place[] {
  if (isDefaultRecordView(view)) return places;
  let changed = false;
  const next = places.map((place) => {
    const claims = place.claims.filter((c) => countsRecord(c, view));
    // The kind and area follow the same choices as the records: left out when their source or tier is.
    const keepInfo = place.info === undefined || countsInfo(place.info, view);
    // So do the contact details.
    const keepContact = place.contact === undefined || countsInfo(place.contact, view);
    if (claims.length === place.claims.length && keepInfo && keepContact) return place;
    changed = true;
    const { info, contact, ...rest } = place;
    return { ...rest, claims, ...(keepInfo && info !== undefined ? { info } : {}), ...(keepContact && contact !== undefined ? { contact } : {}) };
  });
  return changed ? next : places;
}

/** How many records that could be reported are left out. Records that say nothing are not counted. */
export function leftOutCount(places: readonly Place[], view: RecordView): number {
  if (isDefaultRecordView(view)) return 0;
  let n = 0;
  for (const place of places) for (const c of place.claims) if (effectiveStatus(c) !== 'unknown' && !countsRecord(c, view)) n += 1;
  return n;
}

/** The names of the sources behind records that can be reported, in name order. */
export function sourceNames(places: readonly Place[]): readonly string[] {
  const names = new Set<string>();
  for (const place of places) {
    for (const c of place.claims) {
      const name = c.provenance?.source.trim() ?? '';
      if (name !== '' && effectiveStatus(c) !== 'unknown') names.add(name);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export const RECORDVIEW_UI = {
  en: {
    heading: 'Which records to count',
    intro: 'Leave out records to see what the rest report. Nothing is deleted.',
    tierLabel: 'Tiers to count',
    tiers: { all: 'Every record', shown: 'Only records with a tier', 'tier-1': 'Only Tier 1 records' },
    sources: 'Sources to count',
    noSources: 'No sources are loaded.',
    leftOut: (n: number): string => (n === 1 ? '1 record is left out. It is still on this device.' : `${n} records are left out. They are still on this device.`),
    allCounted: 'Every record is counted.',
    reset: 'Count every record',
    note: (n: number): string => (n === 1 ? '1 record is left out of this list.' : `${n} records are left out of this list.`),
    saidTier: (choice: string): string => `Now counting: ${choice}.`,
    saidOn: (source: string): string => `Counting records from ${source}.`,
    saidOff: (source: string): string => `Leaving out records from ${source}.`,
    saidReset: 'Counting every record again.',
  },
  fr: {
    heading: 'Quelles fiches compter',
    intro: 'Laissez des fiches de côté pour voir ce que les autres signalent. Rien n’est supprimé.',
    tierLabel: 'Niveaux à compter',
    tiers: { all: 'Toutes les fiches', shown: 'Seulement les fiches avec un niveau', 'tier-1': 'Seulement les fiches de niveau 1' },
    sources: 'Provenances à compter',
    noSources: 'Aucune provenance n’est chargée.',
    leftOut: (n: number): string => (n === 1 ? '1 fiche est laissée de côté. Elle est toujours sur cet appareil.' : `${n} fiches sont laissées de côté. Elles sont toujours sur cet appareil.`),
    allCounted: 'Toutes les fiches sont comptées.',
    reset: 'Compter toutes les fiches',
    note: (n: number): string => (n === 1 ? '1 fiche est laissée de côté dans cette liste.' : `${n} fiches sont laissées de côté dans cette liste.`),
    saidTier: (choice: string): string => `Fiches comptées\u00a0: ${choice}.`,
    saidOn: (source: string): string => `Les fiches de ${source} sont comptées.`,
    saidOff: (source: string): string => `Les fiches de ${source} sont laissées de côté.`,
    saidReset: 'Toutes les fiches sont de nouveau comptées.',
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

export const RECORDVIEW_IDS = { tier: 'gl-rv-tier', reset: 'gl-rv-reset' } as const;

export function sourceBoxId(index: number): string {
  return `gl-rv-src-${index}`;
}
export function parseSourceBoxId(id: string): number | null {
  const m = /^gl-rv-src-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}

/** What to say after a change. */
export function viewChangeText(change: { readonly kind: 'tier'; readonly tier: TierChoice } | { readonly kind: 'source'; readonly source: string; readonly counted: boolean } | { readonly kind: 'reset' }, lang: Lang): string {
  const ui = RECORDVIEW_UI[lang];
  if (change.kind === 'reset') return ui.saidReset;
  if (change.kind === 'tier') return fr(lang, ui.saidTier(ui.tiers[change.tier]));
  return fr(lang, change.counted ? ui.saidOn(change.source) : ui.saidOff(change.source));
}

/** The line shown above the list of places when records are left out. '' when every record is counted. */
export function renderViewNote(places: readonly Place[], view: RecordView, lang: Lang): string {
  if (isDefaultRecordView(view)) return '';
  return `<p class="gl-note" data-gl-rv-note>${escapeHtml(RECORDVIEW_UI[lang].note(leftOutCount(places, view)))}</p>`;
}

/**
 * The panel: a list to choose the tiers to count, a check box for each source (checked means
 * counted), how many records are left out, and a button to count every record again.
 * `places` is every place held, before anything is left out.
 */
export function renderRecordView(places: readonly Place[], view: RecordView, lang: Lang): string {
  const ui = RECORDVIEW_UI[lang];
  const options = TIER_CHOICES.map((t) => `<option value="${t}"${t === view.tier ? ' selected' : ''}>${escapeHtml(ui.tiers[t])}</option>`).join('');
  const names = sourceNames(places);
  const boxes =
    names.length === 0
      ? `<p class="gl-note">${escapeHtml(ui.noSources)}</p>`
      : `<fieldset class="gl-fieldset"><legend>${escapeHtml(ui.sources)}</legend><ul class="gl-checks">` +
        names
          .map(
            (name, i) =>
              `<li><input type="checkbox" class="gl-box" id="${sourceBoxId(i)}"${view.hiddenSources.includes(name) ? '' : ' checked'}> <label for="${sourceBoxId(i)}">${escapeHtml(name)}</label></li>`,
          )
          .join('') +
        '</ul></fieldset>';
  const left = leftOutCount(places, view);
  const status = isDefaultRecordView(view) ? ui.allCounted : ui.leftOut(left);
  const reset = isDefaultRecordView(view) ? '' : `<div class="gl-actions"><button type="button" class="gl-btn" id="${RECORDVIEW_IDS.reset}">${escapeHtml(ui.reset)}</button></div>`;
  return (
    `<p>${escapeHtml(ui.intro)}</p><label for="${RECORDVIEW_IDS.tier}">${escapeHtml(ui.tierLabel)}</label>` +
    `<select id="${RECORDVIEW_IDS.tier}" class="gl-select">${options}</select>${boxes}<p role="status">${escapeHtml(status)}</p>${reset}`
  );
}
