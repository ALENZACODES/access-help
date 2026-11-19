import { fixFrench } from './frTypography';
import type { Place } from './places';
import { TERMS, type Lang } from './plainTerms';
import { placeRecords, recordText, type RecordRow } from './recordSources';
import type { FeatureClaim } from './status';
import { escapeHtml } from './text';

/**
 * What differs between two sets of records, record by record: records added, removed or changed,
 * and places added, removed or renamed. It compares what is held, exactly as it is held. It is
 * about the data only and says nothing about what a place is like.
 */
export const DIFF_KINDS = ['place-added', 'place-removed', 'place-renamed', 'record-added', 'record-removed', 'record-changed'] as const;
export type DiffKind = (typeof DIFF_KINDS)[number];

export interface DiffRow {
  readonly kind: DiffKind;
  readonly placeId: string;
  /** The place's name now, or its old name when the place was removed. */
  readonly name: string;
  /** The old name, for a place that was renamed. */
  readonly oldName?: string;
  /** The record as it was, for a record that was removed or changed. */
  readonly before?: RecordRow;
  /** The record as it is now, for a record that was added or changed. */
  readonly after?: RecordRow;
}

export type DiffCounts = Readonly<Record<DiffKind, number>>;

const KNOWN: ReadonlySet<string> = new Set(TERMS.map((t) => t.id));

/** Everything that makes a record what it is, as held. Two records with the same text are the same record. */
function signature(claim: FeatureClaim): string {
  const p = claim.provenance;
  return JSON.stringify([claim.status, p?.licence.trim() ?? null, p?.date.trim() ?? null, p?.tier ?? null, p?.url ?? null]);
}

/** Records about one feature from one source belong together: a change is a new version of the same record. */
function family(claim: FeatureClaim): string {
  return JSON.stringify([claim.termId, claim.provenance === undefined ? null : claim.provenance.source.trim()]);
}

interface Held {
  readonly row: RecordRow;
  readonly family: string;
  readonly signature: string;
}

function heldRecords(place: Place, lang: Lang): readonly Held[] {
  const rows = new Map(placeRecords(place, lang).map((r) => [r.claimIndex, r] as const));
  const out: Held[] = [];
  place.claims.forEach((claim, i) => {
    const row = rows.get(i);
    if (row === undefined || !KNOWN.has(claim.termId)) return;
    out.push({ row, family: family(claim), signature: signature(claim) });
  });
  return out;
}

function placeDiff(before: Place, after: Place, lang: Lang): readonly DiffRow[] {
  const out: DiffRow[] = [];
  if (before.name !== after.name) out.push({ kind: 'place-renamed', placeId: after.id, name: after.name, oldName: before.name });
  const was = heldRecords(before, lang);
  const now = heldRecords(after, lang);
  const families = [...new Set([...was, ...now].map((h) => h.family))];
  for (const fam of families) {
    const left = was.filter((h) => h.family === fam);
    const right = now.filter((h) => h.family === fam);
    // Records that are exactly the same on both sides are paired off first.
    for (let i = left.length - 1; i >= 0; i--) {
      const at = right.findIndex((h) => h.signature === left[i]?.signature);
      if (at === -1) continue;
      left.splice(i, 1);
      right.splice(at, 1);
    }
    const paired = Math.min(left.length, right.length);
    for (let i = 0; i < paired; i++) {
      const b = left[i];
      const a = right[i];
      if (b !== undefined && a !== undefined) out.push({ kind: 'record-changed', placeId: after.id, name: after.name, before: b.row, after: a.row });
    }
    for (const h of left.slice(paired)) out.push({ kind: 'record-removed', placeId: after.id, name: after.name, before: h.row });
    for (const h of right.slice(paired)) out.push({ kind: 'record-added', placeId: after.id, name: after.name, after: h.row });
  }
  return out;
}

/**
 * Every difference between two sets of records. Places are matched by their id. Places that were
 * removed come first, then each place of the new set in order, with its own differences.
 */
export function diffRecords(before: readonly Place[], after: readonly Place[], lang: Lang): readonly DiffRow[] {
  const out: DiffRow[] = [];
  const old = new Map(before.map((p) => [p.id, p] as const));
  const ids = new Set(after.map((p) => p.id));
  for (const place of before) {
    if (ids.has(place.id)) continue;
    out.push({ kind: 'place-removed', placeId: place.id, name: place.name });
    for (const h of heldRecords(place, lang)) out.push({ kind: 'record-removed', placeId: place.id, name: place.name, before: h.row });
  }
  for (const place of after) {
    const prior = old.get(place.id);
    if (prior === undefined) {
      out.push({ kind: 'place-added', placeId: place.id, name: place.name });
      for (const h of heldRecords(place, lang)) out.push({ kind: 'record-added', placeId: place.id, name: place.name, after: h.row });
    } else {
      out.push(...placeDiff(prior, place, lang));
    }
  }
  return out;
}

export function diffCounts(rows: readonly DiffRow[]): DiffCounts {
  const counts = Object.fromEntries(DIFF_KINDS.map((k) => [k, 0])) as Record<DiffKind, number>;
  for (const row of rows) counts[row.kind] += 1;
  return counts;
}

export const DIFF_UI = {
  en: {
    same: 'Nothing differs. The two sets of records are the same.',
    counts: {
      'place-added': (n: number): string => (n === 1 ? '1 place added.' : `${n} places added.`),
      'place-removed': (n: number): string => (n === 1 ? '1 place removed.' : `${n} places removed.`),
      'place-renamed': (n: number): string => (n === 1 ? '1 place renamed.' : `${n} places renamed.`),
      'record-added': (n: number): string => (n === 1 ? '1 record added.' : `${n} records added.`),
      'record-removed': (n: number): string => (n === 1 ? '1 record removed.' : `${n} records removed.`),
      'record-changed': (n: number): string => (n === 1 ? '1 record changed.' : `${n} records changed.`),
    },
    placeAdded: (name: string): string => `Place added: ${name}.`,
    placeRemoved: (name: string): string => `Place removed: ${name}.`,
    placeRenamed: (from: string, to: string): string => `Place renamed: ${from} is now ${to}.`,
    recordAdded: (place: string, record: string): string => `Record added for ${place}. ${record}`,
    recordRemoved: (place: string, record: string): string => `Record removed from ${place}. ${record}`,
    recordChanged: (place: string): string => `Record changed for ${place}.`,
    was: (record: string): string => `Before: ${record}`,
    now: (record: string): string => `Now: ${record}`,
    more: (n: number): string => (n === 1 ? 'And 1 more difference.' : `And ${n} more differences.`),
  },
  fr: {
    same: 'Rien ne diffère. Les deux ensembles de fiches sont les mêmes.',
    counts: {
      'place-added': (n: number): string => (n === 1 ? '1 lieu ajouté.' : `${n} lieux ajoutés.`),
      'place-removed': (n: number): string => (n === 1 ? '1 lieu retiré.' : `${n} lieux retirés.`),
      'place-renamed': (n: number): string => (n === 1 ? '1 lieu renommé.' : `${n} lieux renommés.`),
      'record-added': (n: number): string => (n === 1 ? '1 fiche ajoutée.' : `${n} fiches ajoutées.`),
      'record-removed': (n: number): string => (n === 1 ? '1 fiche retirée.' : `${n} fiches retirées.`),
      'record-changed': (n: number): string => (n === 1 ? '1 fiche modifiée.' : `${n} fiches modifiées.`),
    },
    placeAdded: (name: string): string => `Lieu ajouté\u00a0: ${name}.`,
    placeRemoved: (name: string): string => `Lieu retiré\u00a0: ${name}.`,
    placeRenamed: (from: string, to: string): string => `Lieu renommé\u00a0: ${from} s’appelle maintenant ${to}.`,
    recordAdded: (place: string, record: string): string => `Fiche ajoutée pour ${place}. ${record}`,
    recordRemoved: (place: string, record: string): string => `Fiche retirée de ${place}. ${record}`,
    recordChanged: (place: string): string => `Fiche modifiée pour ${place}.`,
    was: (record: string): string => `Avant\u00a0: ${record}`,
    now: (record: string): string => `Maintenant\u00a0: ${record}`,
    more: (n: number): string => (n === 1 ? 'Et 1 autre différence.' : `Et ${n} autres différences.`),
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

/** One sentence for each kind of difference that was found, in a fixed order. */
export function diffSummary(counts: DiffCounts, lang: Lang): readonly string[] {
  const ui = DIFF_UI[lang];
  return DIFF_KINDS.filter((k) => counts[k] > 0).map((k) => ui.counts[k](counts[k]));
}

/** One difference as plain text. A changed record gives the record before and the record now. */
export function diffRowText(row: DiffRow, lang: Lang): string {
  const ui = DIFF_UI[lang];
  const record = (r: RecordRow | undefined): string => (r === undefined ? '' : recordText(r, lang));
  switch (row.kind) {
    case 'place-added':
      return fr(lang, ui.placeAdded(row.name));
    case 'place-removed':
      return fr(lang, ui.placeRemoved(row.name));
    case 'place-renamed':
      return fr(lang, ui.placeRenamed(row.oldName ?? '', row.name));
    case 'record-added':
      return fr(lang, ui.recordAdded(row.name, record(row.after)));
    case 'record-removed':
      return fr(lang, ui.recordRemoved(row.name, record(row.before)));
    default:
      return fr(lang, `${ui.recordChanged(row.name)} ${ui.was(record(row.before))} ${ui.now(record(row.after))}`);
  }
}

/** Every difference as plain text lines: the counts, a blank line, then one line for each difference. */
export function diffToText(rows: readonly DiffRow[], lang: Lang): string {
  if (rows.length === 0) return `${DIFF_UI[lang].same}\n`;
  return `${diffSummary(diffCounts(rows), lang).join('\n')}\n\n${rows.map((r) => `- ${diffRowText(r, lang)}`).join('\n')}\n`;
}

export const MAX_DIFFS_SHOWN = 40;

/** The counts, then each difference. At most `limit` differences are shown, and the rest are counted. */
export function renderDiff(rows: readonly DiffRow[], lang: Lang, limit = MAX_DIFFS_SHOWN): string {
  const ui = DIFF_UI[lang];
  if (rows.length === 0) return `<p role="status">${escapeHtml(ui.same)}</p>`;
  const shown = rows.slice(0, Math.max(0, limit));
  const items = shown.map((r) => `<li data-diff="${r.kind}">${escapeHtml(diffRowText(r, lang))}</li>`).join('');
  const more = rows.length > shown.length ? `<p class="gl-note">${escapeHtml(ui.more(rows.length - shown.length))}</p>` : '';
  return `<p role="status">${escapeHtml(diffSummary(diffCounts(rows), lang).join(' '))}</p><ul class="gl-diff">${items}</ul>${more}`;
}
