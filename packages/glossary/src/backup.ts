import { parseSaved, serialiseSaved } from './favourites';
import { parseStoredState, serialiseState, type FinderState } from './filters';
import { fixFrench } from './frTypography';
import { parseNotes, serialiseNotes, type Notes } from './notes';
import { parseMust, serialiseMust, type MustHaves } from './mustHaves';
import { parseDays, serialiseDays, type DayPlan } from './dayPlan';
import { parseObservations, serialiseObservations, type Observations } from './observations';
import { parseReminders, serialiseReminders, type Reminders } from './reminders';
import { parseTags, serialiseTags, type Tags } from './placeTags';
import { parsePlan, serialisePlan, type PlanState } from './plan';
import type { Lang } from './plainTerms';
import { parseSearches, serialiseSearches, type SavedSearches } from './savedSearches';
import { parseLists, serialiseLists, type Lists } from './savedLists';
import { parseRecent, serialiseRecent, type RecentSearches } from './recentSearches';
import { escapeHtml } from './text';
import { parseView, serialiseView, type FinderView } from './view';
import { parseVisits, serialiseVisits, type Visits } from './visited';

/**
 * A file the person can keep to move their own choices to another device or browser: saved places, notes,
 * visit plan, visit marks, recent searches and list settings. It is made on this device, read back here, and
 * never sent anywhere. Reading is strict: every part is checked, and a bad file changes nothing.
 */
export const BACKUP_FORMAT = 'glossary-backup';
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_CHARS = 500_000;
export const BACKUP_MIME = 'application/json;charset=utf-8';

export interface BackupData {
  readonly saved: readonly string[];
  readonly notes: Notes;
  readonly plan: PlanState;
  readonly visits: Visits;
  readonly recent: RecentSearches;
  readonly lists: Lists;
  readonly searches: SavedSearches;
  readonly tags: Tags;
  readonly reminders: Reminders;
  readonly must: MustHaves;
  readonly days: DayPlan;
  /** What the person saw for themselves. A copy made before this was kept has none. */
  readonly seen?: Observations;
  readonly view: FinderView;
  readonly state: FinderState;
}

export interface Backup extends BackupData {
  readonly format: typeof BACKUP_FORMAT;
  readonly version: typeof BACKUP_VERSION;
  /** YYYY-MM-DD the file was made. */
  readonly date: string;
}

export const BACKUP_UI = {
  en: {
    heading: 'Your data on this device',
    intro: 'Your choices stay on this device. You can keep a copy as a file, or load a copy you made before.',
    export: 'Copy my data as a file',
    importLabel: 'Paste a copy of your data here',
    import: 'Load this copy',
    forget: 'Forget everything on this device',
    forgetSure: 'Yes, forget everything',
    forgetCancel: 'No, keep my data',
    forgetAsk: 'This removes your saved places, notes, tags, dates, plan, must-haves, week, visit marks, lists and searches from this device. It also removes what you saw. It cannot be undone.',
    forgotten: 'Everything was removed from this device.',
    errors: {
      'not-json': 'This is not a copy of your data. Nothing was changed.',
      'wrong-format': 'This is not a copy made by this page. Nothing was changed.',
      'wrong-version': 'This copy comes from a different version. Nothing was changed.',
      'too-large': 'This copy is too large. Nothing was changed.',
      empty: 'Paste a copy first. Nothing was changed.',
    },
    restored: (n: number): string => (n === 1 ? 'Loaded 1 item from the copy.' : `Loaded ${n} items from the copy.`),
    count: (n: number, what: string): string => `${n} ${what}`,
    kinds: { saved: 'saved places', notes: 'written notes', plan: 'places in the plan', visits: 'visit marks', recent: 'recent searches', lists: 'lists', searches: 'saved searches', tags: 'places with tags', reminders: 'dates to check again', must: 'must-have features', days: 'days planned', seen: 'notes of what you saw' },
    none: 'Nothing is kept on this device yet.',
    keeps: 'Kept on this device:',
  },
  fr: {
    heading: 'Vos données sur cet appareil',
    intro: 'Vos choix restent sur cet appareil. Vous pouvez garder une copie dans un fichier, ou charger une copie faite avant.',
    export: 'Copier mes données dans un fichier',
    importLabel: 'Collez ici une copie de vos données',
    import: 'Charger cette copie',
    forget: 'Tout oublier sur cet appareil',
    forgetSure: 'Oui, tout oublier',
    forgetCancel: 'Non, garder mes données',
    forgetAsk: 'Cela retire vos lieux enregistrés, notes, étiquettes, dates, plan, incontournables, semaine, marques de visite, listes et recherches de cet appareil. Cela retire aussi ce que vous avez vu. Cette action est définitive.',
    forgotten: 'Tout a été retiré de cet appareil.',
    errors: {
      'not-json': 'Ce texte n’est pas une copie de vos données. Rien n’a été changé.',
      'wrong-format': 'Ce texte n’est pas une copie faite par cette page. Rien n’a été changé.',
      'wrong-version': 'Cette copie vient d’une autre version. Rien n’a été changé.',
      'too-large': 'Cette copie est trop grande. Rien n’a été changé.',
      empty: 'Collez d’abord une copie. Rien n’a été changé.',
    },
    restored: (n: number): string => (n === 1 ? '1 élément chargé depuis la copie.' : `${n} éléments chargés depuis la copie.`),
    count: (n: number, what: string): string => `${n} ${what}`,
    kinds: { saved: 'lieux enregistrés', notes: 'notes écrites', plan: 'lieux dans le plan', visits: 'marques de visite', recent: 'recherches récentes', lists: 'listes', searches: 'recherches enregistrées', tags: 'lieux avec étiquettes', reminders: 'dates pour revoir', must: 'incontournables', days: 'jours prévus', seen: 'notes sur ce que vous avez vu' },
    none: 'Rien n’est gardé sur cet appareil pour le moment.',
    keeps: 'Gardé sur cet appareil\u00a0:',
  },
} as const;

export type BackupError = keyof (typeof BACKUP_UI)['en']['errors'];

export type BackupResult = { readonly ok: true; readonly backup: Backup } | { readonly ok: false; readonly error: BackupError };

export function createBackup(data: BackupData, date: string): Backup {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, date, ...data };
}

export function serialiseBackup(backup: Backup): string {
  return JSON.stringify(backup, null, 2);
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** Runs one stored part through the same reader the finder uses for that part. A missing or bad part becomes its empty value. */
function part<T>(raw: unknown, parse: (json: string) => T | null, empty: T): T {
  if (raw === undefined) return empty;
  return parse(JSON.stringify(raw)) ?? empty;
}

export function parseBackup(text: string): BackupResult {
  if (text.trim() === '') return { ok: false, error: 'empty' };
  if (text.length > MAX_BACKUP_CHARS) return { ok: false, error: 'too-large' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'not-json' };
  }
  if (!isRecord(raw) || raw.format !== BACKUP_FORMAT) return { ok: false, error: 'wrong-format' };
  if (raw.version !== BACKUP_VERSION) return { ok: false, error: 'wrong-version' };
  const empty: FinderState = { features: [], query: '', hideNotAvailable: false };
  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      date: typeof raw.date === 'string' ? raw.date : '',
      saved: part(raw.saved, parseSaved, []),
      notes: part(raw.notes, parseNotes, {}),
      plan: part(raw.plan, parsePlan, {}),
      visits: part(raw.visits, parseVisits, {}),
      recent: part(raw.recent, parseRecent, []),
      lists: part(raw.lists, parseLists, []),
      searches: part(raw.searches, parseSearches, []),
      tags: part(raw.tags, parseTags, {}),
      reminders: part(raw.reminders, parseReminders, {}),
      must: part(raw.must, parseMust, []),
      days: part(raw.days, parseDays, {}),
      seen: part(raw.seen, parseObservations, []),
      view: part(raw.view, parseView, { sort: 'best', recentOnly: false, savedOnly: false }),
      state: part(raw.state, parseStoredState, empty),
    },
  };
}

export interface DataCounts {
  readonly saved: number;
  readonly notes: number;
  readonly plan: number;
  readonly visits: number;
  readonly recent: number;
  readonly lists: number;
  readonly searches: number;
  readonly tags: number;
  readonly reminders: number;
  readonly must: number;
  readonly days: number;
  readonly seen: number;
}

export function countData(data: Pick<BackupData, 'saved' | 'notes' | 'plan' | 'visits' | 'recent' | 'lists' | 'searches' | 'tags' | 'reminders' | 'must' | 'days' | 'seen'>): DataCounts {
  return {
    saved: data.saved.length,
    notes: Object.keys(data.notes).length,
    plan: Object.keys(data.plan).length,
    visits: Object.keys(data.visits).length,
    recent: data.recent.length,
    lists: data.lists.length,
    searches: data.searches.length,
    tags: Object.keys(data.tags).length,
    reminders: Object.keys(data.reminders).length,
    must: data.must.length,
    days: Object.keys(data.days).length,
    seen: (data.seen ?? []).length,
  };
}

export function totalCount(counts: DataCounts): number {
  return counts.saved + counts.notes + counts.plan + counts.visits + counts.recent + counts.lists + counts.searches + counts.tags + counts.reminders + counts.must + counts.days + counts.seen;
}

/** "Kept on this device: 2 saved places, 1 notes ..." or a line saying nothing is kept. Kinds with none are left out. */
export function countsText(counts: DataCounts, lang: Lang): string {
  const ui = BACKUP_UI[lang];
  if (totalCount(counts) === 0) return ui.none;
  const parts = (Object.keys(ui.kinds) as (keyof DataCounts)[]).filter((k) => counts[k] > 0).map((k) => ui.count(counts[k], ui.kinds[k]));
  const text = `${ui.keeps} ${parts.join(', ')}.`;
  return lang === 'fr' ? fixFrench(text) : text;
}

export function restoredText(backup: Backup, lang: Lang): string {
  return BACKUP_UI[lang].restored(totalCount(countData(backup)));
}

export function backupFilename(date: string): string {
  return `glossary-backup-${date}.json`;
}

/** The storage keys' values for a backup, written the way the finder reads them back. */
export function backupToStorage(backup: Backup): Readonly<Record<'saved' | 'notes' | 'plan' | 'visits' | 'recent' | 'lists' | 'searches' | 'tags' | 'reminders' | 'must' | 'days' | 'seen' | 'view' | 'state', string>> {
  return {
    saved: serialiseSaved(backup.saved),
    notes: serialiseNotes(backup.notes),
    plan: serialisePlan(backup.plan),
    visits: serialiseVisits(backup.visits),
    recent: serialiseRecent(backup.recent),
    lists: serialiseLists(backup.lists),
    searches: serialiseSearches(backup.searches),
    tags: serialiseTags(backup.tags),
    reminders: serialiseReminders(backup.reminders),
    must: serialiseMust(backup.must),
    days: serialiseDays(backup.days),
    seen: serialiseObservations(backup.seen ?? []),
    view: serialiseView(backup.view),
    state: serialiseState(backup.state),
  };
}

export const BACKUP_IDS = {
  export: 'gl-backup-export',
  text: 'gl-backup-text',
  import: 'gl-backup-import',
  forget: 'gl-forget',
  forgetSure: 'gl-forget-sure',
  forgetCancel: 'gl-forget-cancel',
} as const;

export interface DataPanelOptions {
  readonly lang: Lang;
  readonly counts: DataCounts;
  readonly canExport: boolean;
  /** true while the "are you sure" question is showing. */
  readonly confirming: boolean;
  /** A message to show (what was loaded, or why nothing was). */
  readonly message: string;
}

/** The panel, collapsed until opened. It is drawn again after each action. */
export function renderDataPanel(o: DataPanelOptions): string {
  const ui = BACKUP_UI[o.lang];
  const exportButton = o.canExport ? `<button type="button" class="gl-btn" id="${BACKUP_IDS.export}">${escapeHtml(ui.export)}</button>` : '';
  const forget = o.confirming
    ? `<p role="alert">${escapeHtml(ui.forgetAsk)}</p><div class="gl-actions"><button type="button" class="gl-btn" id="${BACKUP_IDS.forgetSure}">${escapeHtml(ui.forgetSure)}</button>` +
      `<button type="button" class="gl-btn" id="${BACKUP_IDS.forgetCancel}">${escapeHtml(ui.forgetCancel)}</button></div>`
    : `<div class="gl-actions"><button type="button" class="gl-btn" id="${BACKUP_IDS.forget}">${escapeHtml(ui.forget)}</button></div>`;
  return (
    `<h3>${escapeHtml(ui.heading)}</h3><p>${escapeHtml(ui.intro)}</p><p class="gl-note">${escapeHtml(countsText(o.counts, o.lang))}</p>` +
    `<div class="gl-actions">${exportButton}</div>` +
    `<label for="${BACKUP_IDS.text}">${escapeHtml(ui.importLabel)}</label>` +
    `<textarea id="${BACKUP_IDS.text}" class="gl-textarea" rows="4" spellcheck="false"></textarea>` +
    `<div class="gl-actions"><button type="button" class="gl-btn" id="${BACKUP_IDS.import}">${escapeHtml(ui.import)}</button></div>` +
    `<p role="status" class="gl-note">${escapeHtml(o.message)}</p>${forget}`
  );
}
