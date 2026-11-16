import { fixFrench } from './frTypography';
import { lookupTerm } from './glossary';
import { htmlLang } from './locale';
import type { Place } from './places';
import { mergeClaims, statusLabel, type FeatureStatus } from './status';
import { TERMS, type Lang } from './plainTerms';
import { escapeHtml } from './text';

/** What a new copy of the data changes compared with the copy before it. */
export type ChangeState = FeatureStatus | 'conflict';

export interface FeatureChange {
  readonly placeId: string;
  readonly placeName: string;
  readonly termId: string;
  readonly from: ChangeState;
  readonly to: ChangeState;
}

export interface PlaceChanges {
  readonly added: readonly Place[];
  readonly removed: readonly Place[];
  readonly changed: readonly FeatureChange[];
}

export const NO_CHANGES: PlaceChanges = { added: [], removed: [], changed: [] };

const IDS = TERMS.map((t) => t.id);

function states(place: Place): ReadonlyMap<string, ChangeState> {
  return new Map(mergeClaims(IDS, place.claims).map((c) => [c.termId, c.conflict ? 'conflict' : c.status] as const));
}

/** Compares by place id and by what each feature resolves to (so a lost source counts as a change). */
export function diffPlaces(before: readonly Place[], after: readonly Place[]): PlaceChanges {
  const old = new Map(before.map((p) => [p.id, p] as const));
  const next = new Map(after.map((p) => [p.id, p] as const));
  const changed: FeatureChange[] = [];
  for (const place of after) {
    const prev = old.get(place.id);
    if (prev === undefined) continue;
    const a = states(prev);
    const b = states(place);
    for (const termId of IDS) {
      const from = a.get(termId) ?? 'unknown';
      const to = b.get(termId) ?? 'unknown';
      if (from !== to) changed.push({ placeId: place.id, placeName: place.name, termId, from, to });
    }
  }
  return {
    added: after.filter((p) => !old.has(p.id)),
    removed: before.filter((p) => !next.has(p.id)),
    changed,
  };
}

export function hasChanges(c: PlaceChanges): boolean {
  return c.added.length + c.removed.length + c.changed.length > 0;
}

function many(lang: Lang, n: number, one: string, other: string): string {
  const plural = lang === 'fr' ? n > 1 : n !== 1;
  return `${n} ${plural ? other : one}`;
}

/** One sentence, or null when nothing changed. */
export function changeSummary(c: PlaceChanges, lang: Lang): string | null {
  if (!hasChanges(c)) return null;
  const parts: string[] = [];
  if (lang === 'en') {
    if (c.added.length > 0) parts.push(many(lang, c.added.length, 'place added', 'places added'));
    if (c.removed.length > 0) parts.push(many(lang, c.removed.length, 'place removed', 'places removed'));
    if (c.changed.length > 0) parts.push(many(lang, c.changed.length, 'feature changed', 'features changed'));
    return `Data updated: ${parts.join(', ')}.`;
  }
  if (c.added.length > 0) parts.push(many(lang, c.added.length, 'lieu ajouté', 'lieux ajoutés'));
  if (c.removed.length > 0) parts.push(many(lang, c.removed.length, 'lieu retiré', 'lieux retirés'));
  if (c.changed.length > 0) parts.push(many(lang, c.changed.length, 'caractéristique modifiée', 'caractéristiques modifiées'));
  return fixFrench(`Données mises à jour : ${parts.join(', ')}.`);
}

function stateText(s: ChangeState, lang: Lang): string {
  return s === 'conflict' ? statusLabel('unknown', lang, true) : statusLabel(s, lang);
}

/** "Library: Elevator changed from unknown to reported as available." */
export function describeChange(c: FeatureChange, lang: Lang): string {
  const term = lookupTerm(c.termId, lang).term;
  const text =
    lang === 'fr'
      ? `${c.placeName} : ${term} est passé de « ${stateText(c.from, lang)} » à « ${stateText(c.to, lang)} ».`
      : `${c.placeName}: ${term} changed from ${stateText(c.from, lang)} to ${stateText(c.to, lang)}.`;
  return lang === 'fr' ? fixFrench(text) : text;
}

export const CHANGES_UI = {
  en: { more: (n: number): string => `And ${n} more changes.`, heading: 'What changed', added: 'Added', removed: 'Removed' },
  fr: { more: (n: number): string => `Et ${n} autres changements.`, heading: 'Ce qui a changé', added: 'Ajouté', removed: 'Retiré' },
} as const;

export const MAX_CHANGES_SHOWN = 20;

/** A status message with a collapsed list. Empty string when nothing changed. */
export function renderChanges(c: PlaceChanges, lang: Lang, limit = MAX_CHANGES_SHOWN): string {
  const summary = changeSummary(c, lang);
  if (summary === null) return '';
  const ui = CHANGES_UI[lang];
  const rows = [
    ...c.added.map((p) => `${ui.added}${lang === 'fr' ? ' :' : ':'} ${p.name}`),
    ...c.removed.map((p) => `${ui.removed}${lang === 'fr' ? ' :' : ':'} ${p.name}`),
    ...c.changed.map((x) => describeChange(x, lang)),
  ];
  const shown = rows.slice(0, Math.max(0, limit));
  const rest = rows.length - shown.length;
  const items = shown.map((r) => `<li>${escapeHtml(lang === 'fr' ? fixFrench(r) : r)}</li>`).join('');
  const more = rest > 0 ? `<p class="gl-note">${escapeHtml(ui.more(rest))}</p>` : '';
  return (
    `<div class="gl-changes" lang="${htmlLang(lang)}" role="status"><p>${escapeHtml(summary)}</p>` +
    `<details><summary>${escapeHtml(ui.heading)}</summary><ul class="gl-features">${items}</ul>${more}</details></div>`
  );
}
