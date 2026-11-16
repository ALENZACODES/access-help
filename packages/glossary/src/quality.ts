import { fixFrench } from './frTypography';
import { htmlLang } from './locale';
import { claimFreshness, type Place } from './places';
import { effectiveStatus, mergeClaims } from './status';
import { TERMS, type Lang } from './plainTerms';
import { escapeHtml } from './text';

/**
 * Where the data itself needs a second look. This lists problems in the sources;
 * it never says a place is or is not accessible.
 */
export interface PlaceReview {
  readonly id: string;
  readonly name: string;
  /** Features where two sources disagree. */
  readonly conflicts: number;
  /** Present/absent claims with no valid source, open licence and date (shown as Unknown). */
  readonly unsourced: number;
  /** Features whose newest source is more than two years old. */
  readonly old: number;
  readonly total: number;
}

const IDS = TERMS.map((t) => t.id);

export function reviewPlace(place: Place, today: string): PlaceReview {
  const merged = mergeClaims(IDS, place.claims);
  const conflicts = merged.filter((c) => c.conflict).length;
  const unsourced = place.claims.filter((c) => c.status !== 'unknown' && effectiveStatus(c) === 'unknown').length;
  const old = merged.filter((c) => claimFreshness(c, today) === 'old').length;
  return { id: place.id, name: place.name, conflicts, unsourced, old, total: conflicts + unsourced + old };
}

/** Places with at least one flag, most flags first, then by name. */
export function reviewPlaces(places: readonly Place[], today: string): readonly PlaceReview[] {
  return places
    .map((p) => reviewPlace(p, today))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

export interface ReviewTotals {
  readonly places: number;
  readonly flagged: number;
  readonly conflicts: number;
  readonly unsourced: number;
  readonly old: number;
}

export function reviewTotals(places: readonly Place[], today: string): ReviewTotals {
  const rows = reviewPlaces(places, today);
  return {
    places: places.length,
    flagged: rows.length,
    conflicts: rows.reduce((n, r) => n + r.conflicts, 0),
    unsourced: rows.reduce((n, r) => n + r.unsourced, 0),
    old: rows.reduce((n, r) => n + r.old, 0),
  };
}

export const QUALITY_UI = {
  en: {
    summary: 'Data notes',
    caption: 'Places whose sources need a second look',
    place: 'Place',
    conflicts: 'Sources disagree',
    unsourced: 'No valid source',
    old: 'Old information',
    none: 'These checks flagged nothing.',
    lead: (flagged: number, places: number): string =>
      `${flagged} of ${places} places have a source problem. These notes are about the data, not the places.`,
    more: (n: number): string => `And ${n} more places.`,
  },
  fr: {
    summary: 'Notes sur les données',
    caption: 'Lieux dont les sources méritent un second regard',
    place: 'Lieu',
    conflicts: 'Les sources ne concordent pas',
    unsourced: 'Aucune source valide',
    old: 'Information ancienne',
    none: 'Ces contrôles n’ont rien signalé.',
    lead: (flagged: number, places: number): string =>
      `${flagged} lieux sur ${places} ont un problème de source. Ces notes portent sur les données, pas sur les lieux.`,
    more: (n: number): string => `Et ${n} autres lieux.`,
  },
} as const;

export const MAX_REVIEW_ROWS = 10;

/** Collapsed section. Empty string when there are no places. */
export function renderQuality(places: readonly Place[], lang: Lang, today: string, limit = MAX_REVIEW_ROWS): string {
  if (places.length === 0) return '';
  const ui = QUALITY_UI[lang];
  const rows = reviewPlaces(places, today);
  const fix = (s: string): string => (lang === 'fr' ? fixFrench(s) : s);
  let body: string;
  if (rows.length === 0) {
    body = `<p>${escapeHtml(fix(ui.none))}</p>`;
  } else {
    const shown = rows.slice(0, Math.max(0, limit));
    const trs = shown
      .map(
        (r) =>
          `<tr><th scope="row">${escapeHtml(r.name)}</th><td>${r.conflicts}</td><td>${r.unsourced}</td><td>${r.old}</td></tr>`,
      )
      .join('');
    const rest = rows.length - shown.length;
    body =
      `<p>${escapeHtml(fix(ui.lead(rows.length, places.length)))}</p>` +
      `<div class="gl-compare-wrap" role="region" aria-label="${escapeHtml(ui.caption)}" tabindex="0">` +
      `<table class="gl-compare"><caption>${escapeHtml(ui.caption)}</caption><thead><tr>` +
      `<th scope="col">${escapeHtml(ui.place)}</th><th scope="col">${escapeHtml(ui.conflicts)}</th>` +
      `<th scope="col">${escapeHtml(ui.unsourced)}</th><th scope="col">${escapeHtml(ui.old)}</th>` +
      `</tr></thead><tbody>${trs}</tbody></table></div>` +
      (rest > 0 ? `<p class="gl-note">${escapeHtml(fix(ui.more(rest)))}</p>` : '');
  }
  return `<details class="gl-quality" lang="${htmlLang(lang)}"><summary>${escapeHtml(ui.summary)}</summary>${body}</details>`;
}
