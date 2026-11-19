import { fixFrench } from './frTypography';
import type { Place } from './places';
import type { Lang } from './plainTerms';
import { isIsoDate } from './provenance';
import { recordsFromCsv, recordsToCsv } from './recordsCsv';
import { diffRecords, diffToText, renderDiff } from './recordsDiff';
import { escapeHtml } from './text';

/**
 * Copies of the records, kept on the device. A person can keep a copy before a large change, see
 * what differs from it later, and go back to it. A copy holds the records exactly as they were:
 * nothing is filled in, and a record that could not be reported still cannot be reported.
 */
export interface RecordSnapshot {
  readonly name: string;
  /** The day the copy was kept, YYYY-MM-DD. */
  readonly date: string;
  /** The records as a table, in the same form as a saved table of records. */
  readonly csv: string;
}

export const SNAPSHOTS_KEY = 'glossary-record-snapshots';
export const MAX_SNAPSHOTS = 5;
export const MAX_SNAPSHOT_NAME = 40;
export const MAX_SNAPSHOT_CHARS = 200_000;

export type SnapshotOutcome = 'added' | 'nothing' | 'name-taken' | 'full' | 'too-big' | 'bad-date';

/** The name as it is kept: spaces tidied, cut to the limit. An empty name becomes the date. */
export function snapshotName(typed: string, today: string): string {
  const clean = Array.from(typed.replace(/\s+/g, ' ').trim()).slice(0, MAX_SNAPSHOT_NAME).join('').trim();
  return clean === '' ? today : clean;
}

const sameName = (a: string, b: string): boolean => a.toLocaleLowerCase() === b.toLocaleLowerCase();

/** Keeps a copy of the places and their records. The list is returned as it was unless the outcome is "added". */
export function addSnapshot(
  list: readonly RecordSnapshot[],
  typed: string,
  places: readonly Place[],
  today: string,
): { readonly outcome: SnapshotOutcome; readonly snapshots: readonly RecordSnapshot[]; readonly name: string } {
  const name = snapshotName(typed, today);
  const refuse = (outcome: SnapshotOutcome) => ({ outcome, snapshots: list, name });
  if (!isIsoDate(today)) return refuse('bad-date');
  if (places.length === 0) return refuse('nothing');
  if (list.some((s) => sameName(s.name, name))) return refuse('name-taken');
  if (list.length >= MAX_SNAPSHOTS) return refuse('full');
  const csv = recordsToCsv(places);
  if (csv.length > MAX_SNAPSHOT_CHARS) return refuse('too-big');
  return { outcome: 'added', snapshots: [...list, { name, date: today, csv }], name };
}

/** The list without one copy. The same list when there is no such copy. */
export function removeSnapshot(list: readonly RecordSnapshot[], index: number): readonly RecordSnapshot[] {
  return list[index] === undefined ? list : list.filter((_, i) => i !== index);
}

/** The places and records a copy holds. Empty when the copy cannot be read. */
export function snapshotPlaces(snapshot: RecordSnapshot): readonly Place[] {
  const read = recordsFromCsv(snapshot.csv);
  return read.problems.length > 0 ? [] : read.places;
}

export function snapshotCounts(snapshot: RecordSnapshot): { readonly places: number; readonly records: number } {
  const places = snapshotPlaces(snapshot);
  return { places: places.length, records: places.reduce((n, p) => n + p.claims.length, 0) };
}

export function serialiseSnapshots(list: readonly RecordSnapshot[]): string {
  return JSON.stringify(list);
}

/**
 * Null unless the text is a JSON list. A copy is kept only when it is well formed, its table can
 * be read and holds at least one place, and its name is not already used. At most the limit are kept.
 */
export function parseSnapshots(json: string): readonly RecordSnapshot[] | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!Array.isArray(raw)) return null;
  const out: RecordSnapshot[] = [];
  for (const item of raw as unknown[]) {
    if (typeof item !== 'object' || item === null) continue;
    const { name, date, csv } = item as { name?: unknown; date?: unknown; csv?: unknown };
    if (typeof name !== 'string' || typeof date !== 'string' || typeof csv !== 'string') continue;
    if (!isIsoDate(date) || csv.length > MAX_SNAPSHOT_CHARS) continue;
    const clean = snapshotName(name, date);
    if (clean !== name || out.some((s) => sameName(s.name, clean))) continue;
    const snapshot: RecordSnapshot = { name, date, csv };
    if (snapshotPlaces(snapshot).length === 0) continue;
    out.push(snapshot);
    if (out.length >= MAX_SNAPSHOTS) break;
  }
  return out;
}

/** true when nothing differs between the copy and the records held: the same places, names and records. */
export function matchesSnapshot(snapshot: RecordSnapshot, places: readonly Place[]): boolean {
  return diffRecords(snapshotPlaces(snapshot), places, 'en').length === 0;
}

export const SNAPSHOT_UI = {
  en: {
    heading: 'Copies of the records',
    intro: 'Keep a copy of the records as they are now. You can go back to a copy later. Copies stay on this device.',
    label: 'Name for the copy',
    hint: (max: number): string => `Optional. Without a name, the copy is named by its date. You can keep ${max} copies.`,
    add: 'Keep a copy now',
    none: 'No copies are kept.',
    item: (name: string, date: string): string => `${name}, kept on ${date}.`,
    holds: (places: number, records: number): string => `${places === 1 ? '1 place' : `${places} places`}, ${records === 1 ? '1 record' : `${records} records`}.`,
    diff: 'See what differs',
    diffLabel: (name: string): string => `See what differs from the copy: ${name}`,
    use: 'Go back to this copy',
    useLabel: (name: string): string => `Go back to this copy: ${name}`,
    remove: 'Remove this copy',
    removeLabel: (name: string): string => `Remove this copy: ${name}`,
    diffHeading: (name: string): string => `What differs from the copy: ${name}`,
    diffNote: 'This compares the copy with the records as they are now.',
    exportDiff: 'Save these differences as text',
    made: (date: string): string => `Made on ${date}.`,
    added: (name: string): string => `Kept a copy: ${name}.`,
    nothing: 'There are no records to copy.',
    nameTaken: 'A copy already has that name. Choose another name.',
    full: (max: number): string => `You can keep ${max} copies. Remove one first.`,
    tooBig: 'The records are too large to keep a copy here. Save them as a table instead.',
    removed: (name: string): string => `Removed the copy: ${name}.`,
    restored: (name: string): string => `The records are back to the copy: ${name}.`,
    same: 'The records already match that copy.',
    unreadable: 'That copy cannot be read. Nothing was changed.',
  },
  fr: {
    heading: 'Copies des fiches',
    intro: 'Gardez une copie des fiches telles qu’elles sont maintenant. Vous pourrez revenir à une copie plus tard. Les copies restent sur cet appareil.',
    label: 'Nom de la copie',
    hint: (max: number): string => `Facultatif. Sans nom, la copie porte sa date. Vous pouvez garder ${max} copies.`,
    add: 'Garder une copie maintenant',
    none: 'Aucune copie n’est gardée.',
    item: (name: string, date: string): string => `${name}, copie gardée le ${date}.`,
    holds: (places: number, records: number): string => `${places === 1 ? '1 lieu' : `${places} lieux`}, ${records === 1 ? '1 fiche' : `${records} fiches`}.`,
    diff: 'Voir ce qui diffère',
    diffLabel: (name: string): string => `Voir ce qui diffère de la copie\u00a0: ${name}`,
    use: 'Revenir à cette copie',
    useLabel: (name: string): string => `Revenir à cette copie\u00a0: ${name}`,
    remove: 'Retirer cette copie',
    removeLabel: (name: string): string => `Retirer cette copie\u00a0: ${name}`,
    diffHeading: (name: string): string => `Ce qui diffère de la copie\u00a0: ${name}`,
    diffNote: 'Ceci compare la copie avec les fiches telles qu’elles sont maintenant.',
    exportDiff: 'Enregistrer ces différences en texte',
    made: (date: string): string => `Fait le ${date}.`,
    added: (name: string): string => `Copie gardée\u00a0: ${name}.`,
    nothing: 'Il n’y a aucune fiche à copier.',
    nameTaken: 'Une copie porte déjà ce nom. Choisissez un autre nom.',
    full: (max: number): string => `Vous pouvez garder ${max} copies. Retirez-en une d’abord.`,
    tooBig: 'Les fiches sont trop volumineuses pour garder une copie ici. Enregistrez-les plutôt en tableau.',
    removed: (name: string): string => `Copie retirée\u00a0: ${name}.`,
    restored: (name: string): string => `Les fiches sont revenues à la copie\u00a0: ${name}.`,
    same: 'Les fiches correspondent déjà à cette copie.',
    unreadable: 'Cette copie ne peut pas être lue. Rien n’a été changé.',
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

/** What to say after trying to keep a copy. */
export function snapshotMessage(outcome: SnapshotOutcome, name: string, lang: Lang): string {
  const ui = SNAPSHOT_UI[lang];
  switch (outcome) {
    case 'added':
      return fr(lang, ui.added(name));
    case 'name-taken':
      return ui.nameTaken;
    case 'full':
      return ui.full(MAX_SNAPSHOTS);
    case 'too-big':
      return ui.tooBig;
    default:
      return ui.nothing;
  }
}

export const SNAPSHOT_IDS = { name: 'gl-snap-name', add: 'gl-snap-add', exportDiff: 'gl-snap-diff-export' } as const;
export const SNAPSHOT_MIME = 'text/plain;charset=utf-8';

export function snapshotDiffFilename(lang: Lang): string {
  return `copy-differences-${lang}.txt`;
}
export type SnapshotAction = 'diff' | 'use' | 'rm';

export function snapshotButtonId(action: SnapshotAction, index: number): string {
  return `gl-snap-${action}-${index}`;
}

export function parseSnapshotButtonId(id: string): { readonly action: SnapshotAction; readonly index: number } | null {
  const m = /^gl-snap-(diff|use|rm)-(\d+)$/.exec(id);
  return m === null ? null : { action: m[1] as SnapshotAction, index: Number(m[2]) };
}

/** "Before the spring update, kept on 2026-11-19. 4 places, 6 records." */
export function snapshotLine(snapshot: RecordSnapshot, lang: Lang): string {
  const ui = SNAPSHOT_UI[lang];
  const counts = snapshotCounts(snapshot);
  return `${ui.item(snapshot.name, snapshot.date)} ${ui.holds(counts.places, counts.records)}`;
}

/** What differs between one copy and the records held now: a heading, a note, then the differences. */
export function renderSnapshotDiff(snapshot: RecordSnapshot, places: readonly Place[], lang: Lang, canExport = false): string {
  const ui = SNAPSHOT_UI[lang];
  const rows = diffRecords(snapshotPlaces(snapshot), places, lang);
  const button =
    canExport && rows.length > 0 ? `<div class="gl-actions"><button type="button" class="gl-btn" id="${SNAPSHOT_IDS.exportDiff}">${escapeHtml(ui.exportDiff)}</button></div>` : '';
  return `<h4>${escapeHtml(fr(lang, ui.diffHeading(snapshot.name)))}</h4><p class="gl-note">${escapeHtml(ui.diffNote)}</p>${renderDiff(rows, lang)}${button}`;
}

/** What differs between one copy and the records held now, as plain text. */
export function snapshotDiffText(snapshot: RecordSnapshot, places: readonly Place[], lang: Lang, today: string): string {
  const ui = SNAPSHOT_UI[lang];
  return `${fr(lang, ui.diffHeading(snapshot.name))}\n${ui.made(today)}\n\n${ui.diffNote}\n\n${diffToText(diffRecords(snapshotPlaces(snapshot), places, lang), lang)}`;
}

export interface SnapshotPanelOptions {
  readonly lang: Lang;
  readonly snapshots: readonly RecordSnapshot[];
  /** The records held now. */
  readonly places: readonly Place[];
  readonly message?: string | undefined;
  /** The copy whose differences are shown, by position. */
  readonly showing?: number | null | undefined;
  /** false while some records are left out of the count: going back is then not offered. */
  readonly canRestore: boolean;
  /** true when the host takes files: the differences can then be saved. */
  readonly canExport?: boolean | undefined;
}

/** The panel: the name box and button, the last message, each copy with its buttons, and the differences asked for. */
export function renderSnapshots(o: SnapshotPanelOptions): string {
  const ui = SNAPSHOT_UI[o.lang];
  const lang = o.lang;
  const button = (action: SnapshotAction, i: number, text: string, label: string): string =>
    `<button type="button" class="gl-btn" id="${snapshotButtonId(action, i)}" aria-label="${escapeHtml(fr(lang, label))}">${escapeHtml(text)}</button>`;
  const items = o.snapshots
    .map(
      (s, i) =>
        `<li>${escapeHtml(snapshotLine(s, lang))}<div class="gl-actions">` +
        button('diff', i, ui.diff, ui.diffLabel(s.name)) +
        (o.canRestore ? button('use', i, ui.use, ui.useLabel(s.name)) : '') +
        button('rm', i, ui.remove, ui.removeLabel(s.name)) +
        `</div></li>`,
    )
    .join('');
  const shown = o.showing === null || o.showing === undefined ? undefined : o.snapshots[o.showing];
  return (
    `<p>${escapeHtml(ui.intro)}</p>` +
    `<label for="${SNAPSHOT_IDS.name}">${escapeHtml(ui.label)}</label>` +
    `<input type="text" id="${SNAPSHOT_IDS.name}" class="gl-input" maxlength="${MAX_SNAPSHOT_NAME}" autocomplete="off" aria-describedby="gl-snap-hint" value="">` +
    `<p class="gl-note" id="gl-snap-hint">${escapeHtml(ui.hint(MAX_SNAPSHOTS))}</p>` +
    `<div class="gl-actions"><button type="button" class="gl-btn" id="${SNAPSHOT_IDS.add}">${escapeHtml(ui.add)}</button></div>` +
    `<p role="status" data-gl-snap-msg>${escapeHtml(o.message ?? '')}</p>` +
    (o.snapshots.length === 0 ? `<p class="gl-note">${escapeHtml(ui.none)}</p>` : `<ul class="gl-snapshots">${items}</ul>`) +
    `<div data-gl-snap-diff>${shown === undefined ? '' : renderSnapshotDiff(shown, o.places, lang, o.canExport === true)}</div>`
  );
}
