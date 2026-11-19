import { fixFrench } from './frTypography';
import { lookupTerm } from './glossary';
import { claimFreshness, daysBetween, type Place } from './places';
import { TERMS, type Lang } from './plainTerms';
import { effectiveStatus, statusLabel } from './status';
import { escapeHtml } from './text';

/**
 * The age of the records that can be reported. A record more than a year old may describe
 * something that has since changed, so the oldest ones are listed first, each with its source and
 * date. An old record is still reported as it is held: this list is a prompt to ask the place,
 * and it says nothing about what the place is like today.
 */
export interface RecordAgeCounts {
  /** Dated within the last year. */
  readonly current: number;
  /** More than one year old, up to two. */
  readonly aging: number;
  /** More than two years old. */
  readonly old: number;
  /** Records that can be reported. */
  readonly total: number;
}

export interface OldRecordRow {
  readonly placeId: string;
  readonly name: string;
  /** Index of the place in the list that was given. Used in control ids. */
  readonly index: number;
  readonly termId: string;
  readonly feature: string;
  readonly status: 'present' | 'absent';
  readonly source: string;
  readonly date: string;
  /** Whole days from the record's date to today. */
  readonly days: number;
  readonly age: 'aging' | 'old';
}

const KNOWN: ReadonlySet<string> = new Set(TERMS.map((t) => t.id));

/** How many usable records fall in each age band. Records that cannot be reported are not counted. */
export function recordAgeCounts(places: readonly Place[], today: string): RecordAgeCounts {
  const counts = { current: 0, aging: 0, old: 0, total: 0 };
  for (const place of places) {
    for (const claim of place.claims) {
      if (!KNOWN.has(claim.termId)) continue;
      const age = claimFreshness(claim, today);
      if (age === 'undated') continue;
      counts[age] += 1;
      counts.total += 1;
    }
  }
  return counts;
}

/** Every usable record more than a year old: oldest first, then in the order of the places and their records. */
export function oldRecordRows(places: readonly Place[], lang: Lang, today: string): readonly OldRecordRow[] {
  const out: OldRecordRow[] = [];
  places.forEach((place, index) => {
    for (const claim of place.claims) {
      if (!KNOWN.has(claim.termId) || claim.provenance === undefined) continue;
      const age = claimFreshness(claim, today);
      const status = effectiveStatus(claim);
      if ((age !== 'aging' && age !== 'old') || status === 'unknown') continue;
      out.push({
        placeId: place.id,
        name: place.name,
        index,
        termId: claim.termId,
        feature: lookupTerm(claim.termId, lang).term,
        status,
        source: claim.provenance.source.trim(),
        date: claim.provenance.date.trim(),
        days: daysBetween(claim.provenance.date, today) ?? 0,
        age,
      });
    }
  });
  return out.map((row, i) => ({ row, i })).sort((a, b) => b.row.days - a.row.days || a.i - b.i).map((x) => x.row);
}

export const RECORDAGES_UI = {
  en: {
    heading: 'Older records',
    intro: 'These records are more than a year old. Things may have changed since then. Ask the place before you go.',
    none: 'No record that can be reported is more than a year old.',
    empty: 'There are no records that can be reported.',
    current: (n: number): string => (n === 1 ? '1 record is from the last year.' : `${n} records are from the last year.`),
    aging: (n: number): string => (n === 1 ? '1 record is between one and two years old.' : `${n} records are between one and two years old.`),
    old: (n: number): string => (n === 1 ? '1 record is more than two years old.' : `${n} records are more than two years old.`),
    line: (place: string, feature: string, reported: string): string => `${place}, ${feature}: ${reported}.`,
    from: (source: string, date: string): string => `${source}, dated ${date}.`,
    more: (n: number): string => (n === 1 ? 'And 1 more.' : `And ${n} more.`),
    show: 'Show',
    showLabel: (name: string): string => `Show ${name} in the list`,
    exportList: 'Save this list as text',
    title: 'Older records',
    made: (date: string): string => `Made on ${date}.`,
  },
  fr: {
    heading: 'Fiches plus anciennes',
    intro: 'Ces fiches datent de plus d’un an. Des choses ont pu changer depuis. Demandez au lieu avant d’y aller.',
    none: 'Aucune fiche qui peut être signalée ne date de plus d’un an.',
    empty: 'Il n’y a aucune fiche qui peut être signalée.',
    current: (n: number): string => (n === 1 ? '1 fiche date de la dernière année.' : `${n} fiches datent de la dernière année.`),
    aging: (n: number): string => (n === 1 ? '1 fiche date d’un à deux ans.' : `${n} fiches datent d’un à deux ans.`),
    old: (n: number): string => (n === 1 ? '1 fiche date de plus de deux ans.' : `${n} fiches datent de plus de deux ans.`),
    line: (place: string, feature: string, reported: string): string => `${place}, ${feature}\u00a0: ${reported}.`,
    from: (source: string, date: string): string => `${source}, date du ${date}.`,
    more: (n: number): string => (n === 1 ? 'Et 1 de plus.' : `Et ${n} de plus.`),
    show: 'Afficher',
    showLabel: (name: string): string => `Afficher ${name} dans la liste`,
    exportList: 'Enregistrer cette liste en texte',
    title: 'Fiches plus anciennes',
    made: (date: string): string => `Fait le ${date}.`,
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

/** "Hall, Ramp: reported as not available. Transit agency, dated 2025-03-04." */
export function oldRecordText(row: OldRecordRow, lang: Lang): string {
  const ui = RECORDAGES_UI[lang];
  return fr(lang, `${ui.line(row.name, row.feature, statusLabel(row.status, lang))} ${ui.from(row.source, row.date)}`);
}

/** One sentence for each age band that holds a record, newest band first. */
export function ageCountLines(counts: RecordAgeCounts, lang: Lang): readonly string[] {
  const ui = RECORDAGES_UI[lang];
  return [
    ...(counts.current > 0 ? [ui.current(counts.current)] : []),
    ...(counts.aging > 0 ? [ui.aging(counts.aging)] : []),
    ...(counts.old > 0 ? [ui.old(counts.old)] : []),
  ];
}

export const MAX_OLD_RECORDS_SHOWN = 30;
export const RECORDAGES_EXPORT_ID = 'gl-recages-export';
export const RECORDAGES_MIME = 'text/plain;charset=utf-8';

export function oldRecordShowId(index: number): string {
  return `gl-ageshow-${index}`;
}

export function parseOldRecordShowId(id: string): number | null {
  const m = /^gl-ageshow-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}

export function oldRecordsFilename(lang: Lang): string {
  return `older-records-${lang}.txt`;
}

/** The counts and every older record as plain text. Nothing is cut short in the file. */
export function oldRecordsToText(places: readonly Place[], lang: Lang, today: string): string {
  const ui = RECORDAGES_UI[lang];
  const counts = recordAgeCounts(places, today);
  const head = `${ui.title}\n${ui.made(today)}\n`;
  if (counts.total === 0) return `${head}\n${ui.empty}\n`;
  const rows = oldRecordRows(places, lang, today);
  const summary = ageCountLines(counts, lang).join('\n');
  if (rows.length === 0) return `${head}\n${summary}\n${ui.none}\n`;
  return `${head}\n${ui.intro}\n\n${summary}\n\n${rows.map((r) => `- ${oldRecordText(r, lang)}`).join('\n')}\n`;
}

/** The panel: how many records are in each age band, then the older ones, oldest first, with a Show button for each place. */
export function renderRecordAges(places: readonly Place[], lang: Lang, today: string, canExport: boolean, limit = MAX_OLD_RECORDS_SHOWN): string {
  const ui = RECORDAGES_UI[lang];
  const counts = recordAgeCounts(places, today);
  if (counts.total === 0) return `<p class="gl-note">${escapeHtml(ui.empty)}</p>`;
  const summary = `<ul class="gl-agecounts">${ageCountLines(counts, lang).map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`;
  const rows = oldRecordRows(places, lang, today);
  if (rows.length === 0) return `${summary}<p class="gl-note">${escapeHtml(ui.none)}</p>`;
  const shown = rows.slice(0, Math.max(0, limit));
  const seen = new Set<number>();
  const items = shown
    .map((r) => {
      // One Show button for each place, on its first row, so no id is used twice.
      const first = !seen.has(r.index);
      seen.add(r.index);
      const button = first
        ? ` <button type="button" class="gl-btn" id="${oldRecordShowId(r.index)}" aria-label="${escapeHtml(fr(lang, ui.showLabel(r.name)))}">${escapeHtml(ui.show)}</button>`
        : '';
      return `<li data-age="${r.age}">${escapeHtml(oldRecordText(r, lang))}${button}</li>`;
    })
    .join('');
  const more = rows.length > shown.length ? `<p class="gl-note">${escapeHtml(ui.more(rows.length - shown.length))}</p>` : '';
  const button = canExport ? `<div class="gl-actions"><button type="button" class="gl-btn" id="${RECORDAGES_EXPORT_ID}">${escapeHtml(ui.exportList)}</button></div>` : '';
  return `<p>${escapeHtml(ui.intro)}</p>${summary}<ul class="gl-oldrecords">${items}</ul>${more}${button}`;
}
