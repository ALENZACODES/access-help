import { fixFrench } from './frTypography';
import { matchPlace, rankPlaces, type Place } from './places';
import { TERMS, type Lang } from './plainTerms';
import { escapeHtml } from './text';

/**
 * The features a person cannot do without on a trip. The choice is the person's own and stays on this device.
 * It only orders and counts. Unknown never counts as available, and no place is called accessible overall.
 */
export const MUST_STORE_KEY = 'glossary-must-haves';

export type MustHaves = readonly string[];

const KNOWN: ReadonlySet<string> = new Set(TERMS.map((t) => t.id));

/** Known feature ids only, once each, in glossary order. */
export function normaliseMust(ids: readonly string[]): MustHaves {
  const wanted = new Set(ids);
  return TERMS.map((t) => t.id).filter((id) => wanted.has(id));
}

export function toggleMust(must: MustHaves, id: string): MustHaves {
  if (!KNOWN.has(id)) return must;
  return normaliseMust(must.includes(id) ? must.filter((m) => m !== id) : [...must, id]);
}

export function serialiseMust(must: MustHaves): string {
  return JSON.stringify(must);
}

/** Null unless the text is a JSON list. Anything that is not a known feature is dropped. */
export function parseMust(json: string): MustHaves | null {
  try {
    const raw: unknown = JSON.parse(json);
    if (!Array.isArray(raw)) return null;
    return normaliseMust(raw.filter((x): x is string => typeof x === 'string'));
  } catch {
    return null;
  }
}

export interface MustLine {
  readonly placeId: string;
  readonly name: string;
  /** Index in the list that was given. Used in control ids. */
  readonly index: number;
  readonly total: number;
  readonly met: number;
  readonly notMet: number;
  readonly unknown: number;
}

/** Every loaded place counted against the must-haves, best first (see rankPlaces). Empty with no must-haves. */
export function mustLines(places: readonly Place[], must: MustHaves, lang: Lang): readonly MustLine[] {
  if (must.length === 0) return [];
  const where = new Map(places.map((p, i) => [p.id, i] as const));
  return rankPlaces(places, must, lang).map((m) => ({
    placeId: m.place.id,
    name: m.place.name,
    index: where.get(m.place.id) ?? 0,
    total: m.results.length,
    met: m.counts.met,
    notMet: m.counts.notMet,
    unknown: m.counts.unknown,
  }));
}

/** Counts for one place. Null with no must-haves. */
export function mustFor(place: Place, must: MustHaves): Omit<MustLine, 'placeId' | 'name' | 'index'> | null {
  if (must.length === 0) return null;
  const m = matchPlace(place, must);
  return { total: m.results.length, met: m.counts.met, notMet: m.counts.notMet, unknown: m.counts.unknown };
}

const s = (n: number): string => (n > 1 ? 's' : '');

/** "1 of 2 reported as available, 1 unknown." The parts that are zero are left out, except the first. */
export function mustCountsText(c: Pick<MustLine, 'total' | 'met' | 'notMet' | 'unknown'>, lang: Lang): string {
  if (lang === 'fr') {
    const parts = [`${c.met} sur ${c.total} signalée${s(c.met)} comme disponible${s(c.met)}`];
    if (c.notMet > 0) parts.push(`${c.notMet} signalée${s(c.notMet)} comme non disponible${s(c.notMet)}`);
    if (c.unknown > 0) parts.push(`${c.unknown} UNKNOWN`);
    return `${parts.join(', ')}.`;
  }
  const parts = [`${c.met} of ${c.total} reported as available`];
  if (c.notMet > 0) parts.push(`${c.notMet} reported as not available`);
  if (c.unknown > 0) parts.push(`${c.unknown} unknown`);
  return `${parts.join(', ')}.`;
}

export const MUST_UI = {
  en: {
    heading: 'Your must-haves',
    legend: 'Features you cannot do without',
    intro: 'Choose them to see the places in order. This only counts what the sources report.',
    prompt: 'Choose at least one feature above.',
    card: (counts: string): string => `Your must-haves: ${counts}`,
    line: (name: string, counts: string): string => `${name}: ${counts}`,
    count: (n: number): string => (n === 1 ? '1 place, best match first.' : `${n} places, best match first.`),
    show: 'Show',
    showLabel: (name: string): string => `Show ${name} in the list`,
    on: (feature: string): string => `Added ${feature} to your must-haves.`,
    off: (feature: string): string => `Removed ${feature} from your must-haves.`,
  },
  fr: {
    heading: 'Vos incontournables',
    legend: 'Caractéristiques dont vous ne pouvez pas vous passer',
    intro: 'Choisissez-les pour voir les lieux en ordre. Cela ne fait que compter ce que les sources signalent.',
    prompt: 'Choisissez au moins une caractéristique ci-dessus.',
    card: (counts: string): string => `Vos incontournables\u00a0: ${counts}`,
    line: (name: string, counts: string): string => `${name}\u00a0: ${counts}`,
    count: (n: number): string => (n === 1 ? '1 lieu, meilleure correspondance d’abord.' : `${n} lieux, meilleure correspondance d’abord.`),
    show: 'Afficher',
    showLabel: (name: string): string => `Afficher ${name} dans la liste`,
    on: (feature: string): string => `${feature} ajouté à vos incontournables.`,
    off: (feature: string): string => `${feature} retiré de vos incontournables.`,
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

export const MUST_ID_PREFIX = 'gl-must-';

export function mustId(termId: string): string {
  return `${MUST_ID_PREFIX}${termId}`;
}
/** The feature id in a checkbox id, or null for any other id or an unknown feature. */
export function parseMustId(id: string): string | null {
  if (!id.startsWith(MUST_ID_PREFIX)) return null;
  const term = id.slice(MUST_ID_PREFIX.length);
  return KNOWN.has(term) ? term : null;
}
export function parseMustShowId(id: string): number | null {
  const m = /^gl-mshow-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}

/** The words for a feature in one language. */
export function featureName(termId: string, lang: Lang): string {
  const t = TERMS.find((x) => x.id === termId);
  return t === undefined ? termId : t[lang].term;
}

export function mustLineText(line: MustLine, lang: Lang): string {
  return fr(lang, MUST_UI[lang].line(line.name, mustCountsText(line, lang)));
}

/** One line for a place card, or '' with no must-haves. */
export function renderMustCard(place: Place, must: MustHaves, lang: Lang): string {
  const c = mustFor(place, must);
  if (c === null) return '';
  return `<p class="gl-note" data-gl-must-card>${escapeHtml(fr(lang, MUST_UI[lang].card(mustCountsText(c, lang))))}</p>`;
}

/** The panel: a check box for each feature, then the places in order. */
export function renderMustPanel(must: MustHaves, lines: readonly MustLine[], lang: Lang): string {
  const ui = MUST_UI[lang];
  const boxes = TERMS.map(
    (t) =>
      `<li><input type="checkbox" id="${mustId(t.id)}"${must.includes(t.id) ? ' checked' : ''}> <label for="${mustId(t.id)}">${escapeHtml(t[lang].term)}</label></li>`,
  ).join('');
  const head = `<p>${escapeHtml(ui.intro)}</p><fieldset><legend>${escapeHtml(ui.legend)}</legend><ul class="gl-checks">${boxes}</ul></fieldset>`;
  if (must.length === 0) return `${head}<p class="gl-note">${escapeHtml(ui.prompt)}</p>`;
  const items = lines
    .map(
      (l) =>
        `<li>${escapeHtml(mustLineText(l, lang))} <button type="button" class="gl-btn" id="gl-mshow-${l.index}" aria-label="${escapeHtml(fr(lang, ui.showLabel(l.name)))}">${escapeHtml(ui.show)}</button></li>`,
    )
    .join('');
  return `${head}<p role="status">${escapeHtml(ui.count(lines.length))}</p><ol>${items}</ol>`;
}
