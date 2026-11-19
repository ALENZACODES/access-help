import { fixFrench } from './frTypography';
import { lookupTerm } from './glossary';
import type { Place } from './places';
import { UNKNOWN_TOKEN } from './plainLanguage';
import { TERMS, type Lang } from './plainTerms';
import { effectiveStatus, mergeClaims } from './status';
import { escapeHtml } from './text';

/**
 * What is still unknown: for each place, the features with nothing that can be reported, and why.
 * It is a list of what to ask a place. Unknown never means a feature is missing, and nothing here
 * is filled in or guessed.
 */
export type GapReason = 'no-record' | 'not-usable' | 'disagree';

export interface Gap {
  readonly termId: string;
  readonly feature: string;
  /** no-record: nothing is held. not-usable: a record is held but cannot be reported. disagree: usable records disagree. */
  readonly reason: GapReason;
}

export interface GapRow {
  readonly placeId: string;
  readonly name: string;
  /** Index of the place in the list that was given. Used in control ids. */
  readonly index: number;
  readonly gaps: readonly Gap[];
  /** How many features were looked at. */
  readonly total: number;
}

const ALL: readonly string[] = TERMS.map((t) => t.id);
const KNOWN: ReadonlySet<string> = new Set(ALL);

/** The features to look at: the chosen ones the glossary knows, in glossary order, or every feature when none is chosen. */
export function gapScope(chosen: readonly string[]): readonly string[] {
  const picked = ALL.filter((id) => chosen.includes(id));
  return picked.length === 0 ? ALL : picked;
}

/** The unknown features of one place, in glossary order. */
export function placeGaps(place: Place, termIds: readonly string[], lang: Lang): readonly Gap[] {
  const ids = termIds.filter((id) => KNOWN.has(id));
  const out: Gap[] = [];
  mergeClaims(ids, place.claims).forEach((merged) => {
    if (merged.status !== 'unknown') return;
    const held = place.claims.filter((c) => c.termId === merged.termId && c.status !== 'unknown');
    const reason: GapReason = merged.conflict ? 'disagree' : held.some((c) => effectiveStatus(c) === 'unknown') ? 'not-usable' : 'no-record';
    out.push({ termId: merged.termId, feature: lookupTerm(merged.termId, lang).term, reason });
  });
  return out;
}

/** One row for each place with something unknown: most unknown first, then in the order given. */
export function gapRows(places: readonly Place[], chosen: readonly string[], lang: Lang): readonly GapRow[] {
  const scope = gapScope(chosen);
  return places
    .map((place, index): GapRow => ({ placeId: place.id, name: place.name, index, gaps: placeGaps(place, scope, lang), total: scope.length }))
    .filter((row) => row.gaps.length > 0)
    .sort((a, b) => b.gaps.length - a.gaps.length || a.index - b.index);
}

export interface GapTotals {
  readonly places: number;
  readonly gaps: number;
  readonly byReason: Readonly<Record<GapReason, number>>;
}

export function gapTotals(rows: readonly GapRow[]): GapTotals {
  const byReason: Record<GapReason, number> = { 'no-record': 0, 'not-usable': 0, disagree: 0 };
  for (const row of rows) for (const gap of row.gaps) byReason[gap.reason] += 1;
  return { places: rows.length, gaps: rows.reduce((n, r) => n + r.gaps.length, 0), byReason };
}

export const GAPS_UI = {
  en: {
    heading: 'What is still unknown',
    intro: 'For each place, these are the features with nothing to report. Unknown does not mean a feature is missing. Ask the place.',
    scopeAll: 'This looks at every feature.',
    scopeChosen: (n: number): string => (n === 1 ? 'This looks at the 1 feature you chose.' : `This looks at the ${n} features you chose.`),
    noPlaces: 'There are no places in the list.',
    none: 'Every place has something reported for each of these features.',
    count: (gaps: number, places: number): string =>
      `${gaps === 1 ? '1 feature is unknown' : `${gaps} features are unknown`}, in ${places === 1 ? '1 place' : `${places} places`}.`,
    place: (name: string, n: number, total: number): string => `${name}: ${n} of ${total} unknown`,
    reasons: { 'no-record': 'no record', 'not-usable': 'a record that cannot be used', disagree: 'sources disagree' },
    gap: (feature: string, reason: string): string => `${feature} (${reason})`,
    more: (n: number): string => (n === 1 ? 'And 1 more place.' : `And ${n} more places.`),
    show: 'Show',
    showLabel: (name: string): string => `Show ${name} in the list`,
    exportList: 'Save this list as text',
    title: 'What is still unknown',
    made: (date: string): string => `Made on ${date}.`,
  },
  fr: {
    heading: `Ce qui est encore ${UNKNOWN_TOKEN}`,
    intro: `Pour chaque lieu, voici les caractéristiques sans rien à signaler. ${UNKNOWN_TOKEN} ne veut pas dire qu’une caractéristique manque. Demandez au lieu.`,
    scopeAll: 'Cette liste examine chaque caractéristique.',
    scopeChosen: (n: number): string => (n === 1 ? 'Cette liste examine 1 caractéristique, celle que vous avez choisie.' : `Cette liste examine les ${n} caractéristiques choisies.`),
    noPlaces: 'Il n’y a aucun lieu dans la liste.',
    none: 'Chaque lieu a quelque chose de signalé pour chacune de ces caractéristiques.',
    count: (gaps: number, places: number): string =>
      `${gaps === 1 ? `1 caractéristique est ${UNKNOWN_TOKEN}` : `${gaps} caractéristiques sont ${UNKNOWN_TOKEN}`}, dans ${places === 1 ? '1 lieu' : `${places} lieux`}.`,
    place: (name: string, n: number, total: number): string => `${name}\u00a0: ${n} sur ${total} ${UNKNOWN_TOKEN}`,
    reasons: { 'no-record': 'aucune fiche', 'not-usable': 'une fiche qui ne peut pas être utilisée', disagree: 'les sources ne concordent pas' },
    gap: (feature: string, reason: string): string => `${feature} (${reason})`,
    more: (n: number): string => (n === 1 ? 'Et 1 lieu de plus.' : `Et ${n} lieux de plus.`),
    show: 'Afficher',
    showLabel: (name: string): string => `Afficher ${name} dans la liste`,
    exportList: 'Enregistrer cette liste en texte',
    title: `Ce qui est encore ${UNKNOWN_TOKEN}`,
    made: (date: string): string => `Fait le ${date}.`,
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

/** "Ramp (no record)" */
export function gapText(gap: Gap, lang: Lang): string {
  const ui = GAPS_UI[lang];
  return ui.gap(gap.feature, ui.reasons[gap.reason]);
}

/** "Hall: 6 of 8 unknown" */
export function gapHeadText(row: GapRow, lang: Lang): string {
  return fr(lang, GAPS_UI[lang].place(row.name, row.gaps.length, row.total));
}

export function scopeText(chosen: readonly string[], lang: Lang): string {
  const ui = GAPS_UI[lang];
  const scope = gapScope(chosen);
  return scope.length === ALL.length ? ui.scopeAll : ui.scopeChosen(scope.length);
}

export const MAX_GAP_PLACES_SHOWN = 30;
export const GAPS_EXPORT_ID = 'gl-gaps-export';
export const GAPS_MIME = 'text/plain;charset=utf-8';

export function gapShowId(index: number): string {
  return `gl-gapshow-${index}`;
}

export function parseGapShowId(id: string): number | null {
  const m = /^gl-gapshow-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}

export function gapsFilename(lang: Lang): string {
  return `still-unknown-${lang}.txt`;
}

/** Every place with something unknown, as plain text. Nothing is cut short in the file. */
export function gapsToText(places: readonly Place[], chosen: readonly string[], lang: Lang, today: string): string {
  const ui = GAPS_UI[lang];
  const head = `${ui.title}\n${ui.made(today)}\n`;
  if (places.length === 0) return `${head}\n${ui.noPlaces}\n`;
  const rows = gapRows(places, chosen, lang);
  const scope = scopeText(chosen, lang);
  if (rows.length === 0) return `${head}\n${scope}\n${ui.none}\n`;
  const totals = gapTotals(rows);
  const body = rows.map((r) => `${gapHeadText(r, lang)}\n${r.gaps.map((g) => `- ${gapText(g, lang)}`).join('\n')}`).join('\n\n');
  return `${head}\n${ui.intro}\n${scope}\n${ui.count(totals.gaps, totals.places)}\n\n${body}\n`;
}

/** The panel: what is looked at, how much is unknown, then each place with its unknown features and a Show button. */
export function renderGaps(places: readonly Place[], chosen: readonly string[], lang: Lang, canExport: boolean, limit = MAX_GAP_PLACES_SHOWN): string {
  const ui = GAPS_UI[lang];
  if (places.length === 0) return `<p class="gl-note">${escapeHtml(ui.noPlaces)}</p>`;
  const scope = `<p class="gl-note">${escapeHtml(scopeText(chosen, lang))}</p>`;
  const rows = gapRows(places, chosen, lang);
  if (rows.length === 0) return `${scope}<p role="status">${escapeHtml(ui.none)}</p>`;
  const totals = gapTotals(rows);
  const shown = rows.slice(0, Math.max(0, limit));
  const items = shown
    .map((r) => {
      const gaps = r.gaps.map((g) => `<li data-reason="${g.reason}">${escapeHtml(gapText(g, lang))}</li>`).join('');
      const button = `<button type="button" class="gl-btn" id="${gapShowId(r.index)}" aria-label="${escapeHtml(fr(lang, ui.showLabel(r.name)))}">${escapeHtml(ui.show)}</button>`;
      return `<li><strong>${escapeHtml(gapHeadText(r, lang))}</strong> ${button}<ul>${gaps}</ul></li>`;
    })
    .join('');
  const more = rows.length > shown.length ? `<p class="gl-note">${escapeHtml(ui.more(rows.length - shown.length))}</p>` : '';
  const button = canExport ? `<div class="gl-actions"><button type="button" class="gl-btn" id="${GAPS_EXPORT_ID}">${escapeHtml(ui.exportList)}</button></div>` : '';
  return `<p>${escapeHtml(ui.intro)}</p>${scope}<p role="status">${escapeHtml(ui.count(totals.gaps, totals.places))}</p><ul class="gl-gaps">${items}</ul>${more}${button}`;
}
