import { fixFrench } from './frTypography';
import { claimFreshness, type Place } from './places';
import { TERMS, type Lang } from './plainTerms';
import { sourceNames } from './recordView';
import { effectiveStatus, type FeatureClaim } from './status';
import { escapeHtml } from './text';

/**
 * Tidying the records in one step: removing every record that cannot be reported, every record
 * more than two years old, every record of one source, or every place that holds no record.
 * Each choice says how much it would remove before it is pressed, and each can be undone.
 * Tidying only removes what is held. It never changes what a record says.
 */
export const TIDY_KINDS = ['not-usable', 'duplicates', 'old', 'source', 'empty-places'] as const;
export type TidyKind = (typeof TIDY_KINDS)[number];

export interface TidyPlan {
  readonly kind: TidyKind;
  /** The places and records that would be held afterwards. */
  readonly places: readonly Place[];
  /** Records that would be removed. */
  readonly records: number;
  /** Places that would lose at least one record. */
  readonly placesTouched: number;
  /** Places that would be removed. Only the "empty-places" kind removes places. */
  readonly placesRemoved: number;
}

const KNOWN: ReadonlySet<string> = new Set(TERMS.map((t) => t.id));

export function isTidyKind(value: unknown): value is TidyKind {
  return typeof value === 'string' && (TIDY_KINDS as readonly string[]).includes(value);
}

/**
 * What one kind of tidying would do. The places given are never changed.
 * - not-usable: records that say available or not available but cannot be reported.
 * - duplicates: records that are an exact copy of an earlier record of the same place. The first one is kept.
 * - old: records that can be reported and are more than two years old.
 * - source: every record that names the source, whether it can be reported or not.
 * - empty-places: places that hold no record at all.
 */
export function tidyPlan(places: readonly Place[], kind: TidyKind, today: string, source = ''): TidyPlan {
  if (kind === 'empty-places') {
    const kept = places.filter((p) => p.claims.length > 0);
    return { kind, places: kept, records: 0, placesTouched: 0, placesRemoved: places.length - kept.length };
  }
  const name = source.trim();
  let records = 0;
  let placesTouched = 0;
  const next = places.map((place) => {
    const seen = new Set<string>();
    const claims = place.claims.filter((claim) => {
      if (kind === 'duplicates') {
        const key = recordKey(claim);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }
      if (kind === 'source') return name === '' || claim.provenance === undefined || claim.provenance.source.trim() !== name;
      if (!KNOWN.has(claim.termId)) return true;
      if (kind === 'not-usable') return claim.status === 'unknown' || effectiveStatus(claim) !== 'unknown';
      return claimFreshness(claim, today) !== 'old';
    });
    if (claims.length === place.claims.length) return place;
    records += place.claims.length - claims.length;
    placesTouched += 1;
    return { ...place, claims };
  });
  return { kind, places: records === 0 ? places : next, records, placesTouched, placesRemoved: 0 };
}

/** Everything a record holds, as one text. Two records with the same text are exact copies of each other. */
function recordKey(claim: FeatureClaim): string {
  const p = claim.provenance;
  return JSON.stringify([claim.termId, claim.status, p === undefined ? null : [p.source.trim(), p.licence.trim(), p.date.trim(), p.tier ?? null, p.url ?? null]]);
}

/** true when the plan would remove something. */
export function tidyWouldChange(plan: TidyPlan): boolean {
  return plan.records > 0 || plan.placesRemoved > 0;
}

/** The source a list's value stands for: values are positions in the list of names. '' for anything else. */
export function tidySourceFromValue(places: readonly Place[], value: string): string {
  if (!/^\d{1,4}$/.test(value)) return '';
  return sourceNames(places)[Number(value)] ?? '';
}

export const TIDY_UI = {
  en: {
    heading: 'Tidy the records',
    intro: 'Remove a whole group of records in one step. Each line says how much it would remove. You can undo the last step.',
    counts: {
      'not-usable': (n: number): string => (n === 1 ? '1 record cannot be reported.' : `${n} records cannot be reported.`),
      duplicates: (n: number): string => (n === 1 ? '1 record is an exact copy of another record.' : `${n} records are exact copies of another record.`),
      old: (n: number): string => (n === 1 ? '1 record is more than two years old.' : `${n} records are more than two years old.`),
      source: (n: number): string => (n === 1 ? '1 record comes from this source.' : `${n} records come from this source.`),
      'empty-places': (n: number): string => (n === 1 ? '1 place has no records.' : `${n} places have no records.`),
    },
    buttons: {
      'not-usable': 'Remove the records that cannot be reported',
      duplicates: 'Remove the exact copies',
      old: 'Remove the records more than two years old',
      source: 'Remove every record from this source',
      'empty-places': 'Remove the places with no records',
    },
    logs: {
      'not-usable': 'Removed the records that cannot be reported.',
      duplicates: 'Removed the records that were exact copies.',
      old: 'Removed the records more than two years old.',
      source: (source: string): string => `Removed every record from the source: ${source}.`,
      'empty-places': 'Removed the places with no records.',
    },
    sourceLabel: 'Source to remove',
    choose: 'Choose a source',
    chooseFirst: 'Choose a source to see how many records come from it.',
    noSources: 'No record names a source.',
    removedRecords: (records: number, places: number): string =>
      `Removed ${records === 1 ? '1 record' : `${records} records`} from ${places === 1 ? '1 place' : `${places} places`}.`,
    removedPlaces: (n: number): string => (n === 1 ? 'Removed 1 place.' : `Removed ${n} places.`),
    nothing: 'There was nothing to remove.',
    oldNote: 'An old record may still be right. Remove it only if you no longer want it reported.',
  },
  fr: {
    heading: 'Ranger les fiches',
    intro: 'Retirez tout un groupe de fiches en une étape. Chaque ligne dit combien elle retirerait. Vous pouvez annuler la dernière étape.',
    counts: {
      'not-usable': (n: number): string => (n === 1 ? '1 fiche ne peut pas être signalée.' : `${n} fiches ne peuvent pas être signalées.`),
      duplicates: (n: number): string => (n === 1 ? '1 fiche est la copie exacte d’une autre fiche.' : `${n} fiches sont des copies exactes d’une autre fiche.`),
      old: (n: number): string => (n === 1 ? '1 fiche date de plus de deux ans.' : `${n} fiches datent de plus de deux ans.`),
      source: (n: number): string => (n === 1 ? '1 fiche vient de cette source.' : `${n} fiches viennent de cette source.`),
      'empty-places': (n: number): string => (n === 1 ? '1 lieu n’a aucune fiche.' : `${n} lieux n’ont aucune fiche.`),
    },
    buttons: {
      'not-usable': 'Retirer les fiches qui ne peuvent pas être signalées',
      duplicates: 'Retirer les copies exactes',
      old: 'Retirer les fiches de plus de deux ans',
      source: 'Retirer toutes les fiches de cette source',
      'empty-places': 'Retirer les lieux sans fiche',
    },
    logs: {
      'not-usable': 'Fiches qui ne peuvent pas être signalées retirées.',
      duplicates: 'Copies exactes de fiches retirées.',
      old: 'Fiches de plus de deux ans retirées.',
      source: (source: string): string => `Toutes les fiches de la source retirées\u00a0: ${source}.`,
      'empty-places': 'Lieux sans fiche retirés.',
    },
    sourceLabel: 'Source à retirer',
    choose: 'Choisissez une source',
    chooseFirst: 'Choisissez une source pour voir combien de fiches en viennent.',
    noSources: 'Aucune fiche ne nomme une source.',
    removedRecords: (records: number, places: number): string =>
      `${records === 1 ? '1 fiche retirée' : `${records} fiches retirées`} de ${places === 1 ? '1 lieu' : `${places} lieux`}.`,
    removedPlaces: (n: number): string => (n === 1 ? '1 lieu retiré.' : `${n} lieux retirés.`),
    nothing: 'Il n’y avait rien à retirer.',
    oldNote: 'Une fiche ancienne peut encore être juste. Retirez-la seulement si vous ne voulez plus qu’elle soit signalée.',
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

export const TIDY_SOURCE_ID = 'gl-tidy-src';

export function tidyButtonId(kind: TidyKind): string {
  return `gl-tidy-${kind}`;
}

export function parseTidyButtonId(id: string): TidyKind | null {
  const m = /^gl-tidy-(.+)$/.exec(id);
  return m !== null && isTidyKind(m[1]) ? m[1] : null;
}

/** What to say after a tidying step. */
export function tidyMessage(plan: TidyPlan, lang: Lang): string {
  const ui = TIDY_UI[lang];
  if (!tidyWouldChange(plan)) return ui.nothing;
  return plan.kind === 'empty-places' ? ui.removedPlaces(plan.placesRemoved) : ui.removedRecords(plan.records, plan.placesTouched);
}

/** The line for the list of changes: what kind of tidying was done, with the source for that kind. */
export function tidyLogText(kind: string, source: string, lang: Lang): string {
  const ui = TIDY_UI[lang];
  if (!isTidyKind(kind)) return ui.nothing;
  return kind === 'source' ? fr(lang, ui.logs.source(source)) : ui.logs[kind];
}

export interface TidyPanelOptions {
  readonly lang: Lang;
  readonly places: readonly Place[];
  readonly today: string;
  /** The source chosen for the "source" kind, or ''. */
  readonly source: string;
  readonly message?: string | undefined;
}

/** The panel: one line and one button for each kind. A button is left out when it would remove nothing. */
export function renderTidy(o: TidyPanelOptions): string {
  const ui = TIDY_UI[o.lang];
  const row = (kind: TidyKind, count: number, extra = ''): string => {
    const button = count > 0 ? ` <button type="button" class="gl-btn" id="${tidyButtonId(kind)}">${escapeHtml(ui.buttons[kind])}</button>` : '';
    return `<li data-tidy="${kind}">${extra}<span>${escapeHtml(ui.counts[kind](count))}</span>${button}</li>`;
  };
  const plan = (kind: TidyKind): TidyPlan => tidyPlan(o.places, kind, o.today, o.source);
  const names = sourceNames(o.places);
  const chosen = names.indexOf(o.source.trim());
  const options =
    `<option value=""${chosen === -1 ? ' selected' : ''}>${escapeHtml(ui.choose)}</option>` +
    names.map((n, i) => `<option value="${i}"${i === chosen ? ' selected' : ''}>${escapeHtml(n)}</option>`).join('');
  const picker = `<label for="${TIDY_SOURCE_ID}">${escapeHtml(ui.sourceLabel)}</label><select id="${TIDY_SOURCE_ID}" class="gl-select">${options}</select> `;
  const sourceRow =
    names.length === 0
      ? `<li data-tidy="source"><span>${escapeHtml(ui.noSources)}</span></li>`
      : chosen === -1
        ? `<li data-tidy="source">${picker}<span>${escapeHtml(ui.chooseFirst)}</span></li>`
        : row('source', plan('source').records, picker);
  return (
    `<p>${escapeHtml(ui.intro)}</p><p role="status" data-gl-tidy-msg>${escapeHtml(o.message ?? '')}</p>` +
    `<ul class="gl-tidy">${row('not-usable', plan('not-usable').records)}${row('duplicates', plan('duplicates').records)}${row('old', plan('old').records)}${sourceRow}${row('empty-places', plan('empty-places').placesRemoved)}</ul>` +
    `<p class="gl-note">${escapeHtml(ui.oldNote)}</p>`
  );
}
