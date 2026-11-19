import { fixFrench } from './frTypography';
import { lookupTerm } from './glossary';
import type { Lang } from './plainTerms';
import { isIsoDate } from './provenance';
import { escapeHtml } from './text';

/**
 * A list of the changes a person made to the records on this device: records added and removed,
 * tables loaded, places renamed or joined, and steps undone. Records typed or changed by hand
 * are the person's own copy, so the list lets them see later what they changed and when.
 * It stays on this device and is cleared with the rest of the person's data.
 */
export const EDIT_KINDS = ['add', 'remove-record', 'remove-place', 'load', 'add-table', 'rename', 'join', 'undo'] as const;
export type EditKind = (typeof EDIT_KINDS)[number];

export interface EditEntry {
  /** YYYY-MM-DD the change was made. */
  readonly date: string;
  readonly kind: EditKind;
  /** A place name (for rename: the old name). '' when the kind has none. */
  readonly place: string;
  /** A feature id (add, remove-record) or the new name (rename). '' otherwise. */
  readonly detail: string;
  /** A count: places loaded, records added from a table, or records moved by a join. 0 otherwise. */
  readonly count: number;
}

export const MAX_EDIT_LOG = 100;
export const EDIT_LOG_KEY = 'glossary-edit-log';
const MAX_TEXT = 120;

export function isEditKind(value: unknown): value is EditKind {
  return typeof value === 'string' && (EDIT_KINDS as readonly string[]).includes(value);
}

const clip = (s: string): string => Array.from(s.replace(/\s+/g, ' ').trim()).slice(0, MAX_TEXT).join('');

/** A clean entry, or null when the date is not real or the kind is not known. */
export function makeEntry(date: string, kind: string, parts: { readonly place?: string; readonly detail?: string; readonly count?: number } = {}): EditEntry | null {
  if (!isIsoDate(date) || !isEditKind(kind)) return null;
  const n = parts.count ?? 0;
  return { date, kind, place: clip(parts.place ?? ''), detail: clip(parts.detail ?? ''), count: Number.isInteger(n) && n > 0 ? Math.min(n, 1_000_000) : 0 };
}

/** The log with one more entry at the end. The oldest entries are dropped past the limit. */
export function logEdit(log: readonly EditEntry[], entry: EditEntry | null): readonly EditEntry[] {
  if (entry === null) return log;
  const next = [...log, entry];
  return next.slice(Math.max(0, next.length - MAX_EDIT_LOG));
}

export function serialiseEditLog(log: readonly EditEntry[]): string {
  return JSON.stringify(log);
}

/** Null unless the text is a JSON list. Entries that are not well formed are dropped. */
export function parseEditLog(json: string): readonly EditEntry[] | null {
  try {
    const raw: unknown = JSON.parse(json);
    if (!Array.isArray(raw)) return null;
    let out: readonly EditEntry[] = [];
    for (const item of raw) {
      if (typeof item !== 'object' || item === null) continue;
      const e = item as { date?: unknown; kind?: unknown; place?: unknown; detail?: unknown; count?: unknown };
      if (typeof e.date !== 'string' || typeof e.kind !== 'string') continue;
      out = logEdit(
        out,
        makeEntry(e.date, e.kind, {
          place: typeof e.place === 'string' ? e.place : '',
          detail: typeof e.detail === 'string' ? e.detail : '',
          count: typeof e.count === 'number' ? e.count : 0,
        }),
      );
    }
    return out;
  } catch {
    return null;
  }
}

export const EDITLOG_UI = {
  en: {
    heading: 'Changes made on this device',
    intro: 'The changes you made to the records. This list stays on this device.',
    none: 'No changes yet.',
    count: (n: number): string => (n === 1 ? '1 change' : `${n} changes`),
    on: (date: string, what: string): string => `${date}: ${what}`,
    exportLog: 'Save the list of changes as text',
    title: 'Changes made on this device',
    kinds: {
      add: (place: string, feature: string): string => `Added a record for ${place}: ${feature}.`,
      'remove-record': (place: string, feature: string): string => `Removed a record from ${place}: ${feature}.`,
      'remove-place': (place: string): string => `Removed ${place} and its records.`,
      load: (n: number): string => (n === 1 ? 'Loaded a table with 1 place.' : `Loaded a table with ${n} places.`),
      'add-table': (n: number): string => (n === 1 ? 'Added 1 record from a table.' : `Added ${n} records from a table.`),
      rename: (from: string, to: string): string => `Renamed ${from} to ${to}.`,
      join: (place: string, n: number): string => `Joined the entries for ${place}. Records moved: ${n}.`,
      undo: 'Undid the last change to the records.',
    },
  },
  fr: {
    heading: 'Changements faits sur cet appareil',
    intro: 'Les changements que vous avez faits aux fiches. Cette liste reste sur cet appareil.',
    none: 'Aucun changement pour le moment.',
    count: (n: number): string => (n === 1 ? '1 changement' : `${n} changements`),
    on: (date: string, what: string): string => `${date}\u00a0: ${what}`,
    exportLog: 'Enregistrer la liste des changements en texte',
    title: 'Changements faits sur cet appareil',
    kinds: {
      add: (place: string, feature: string): string => `Fiche ajoutée pour ${place}\u00a0: ${feature}.`,
      'remove-record': (place: string, feature: string): string => `Fiche retirée de ${place}\u00a0: ${feature}.`,
      'remove-place': (place: string): string => `${place} et ses fiches ont été retirés.`,
      load: (n: number): string => (n === 1 ? 'Tableau chargé avec 1 lieu.' : `Tableau chargé avec ${n} lieux.`),
      'add-table': (n: number): string => (n === 1 ? '1 fiche ajoutée à partir d’un tableau.' : `${n} fiches ajoutées à partir d’un tableau.`),
      rename: (from: string, to: string): string => `${from} a été renommé ${to}.`,
      join: (place: string, n: number): string => `Entrées réunies pour ${place}. Fiches déplacées\u00a0: ${n}.`,
      undo: 'Le dernier changement aux fiches a été annulé.',
    },
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

/** What one entry says, without its date. Feature ids are shown by name in the language asked for. */
export function entryWhat(e: EditEntry, lang: Lang): string {
  const k = EDITLOG_UI[lang].kinds;
  const feature = (): string => lookupTerm(e.detail, lang).term;
  switch (e.kind) {
    case 'add':
      return fr(lang, k.add(e.place, feature()));
    case 'remove-record':
      return fr(lang, k['remove-record'](e.place, feature()));
    case 'remove-place':
      return k['remove-place'](e.place);
    case 'load':
      return k.load(e.count);
    case 'add-table':
      return k['add-table'](e.count);
    case 'rename':
      return k.rename(e.place, e.detail);
    case 'join':
      return fr(lang, k.join(e.place, e.count));
    default:
      return k.undo;
  }
}

export function entryLine(e: EditEntry, lang: Lang): string {
  return fr(lang, EDITLOG_UI[lang].on(e.date, entryWhat(e, lang)));
}

export const EDITLOG_EXPORT_ID = 'gl-editlog-export';
export const EDITLOG_MIME = 'text/plain;charset=utf-8';
export const MAX_EDITS_SHOWN = 30;

export function editLogFilename(lang: Lang): string {
  return `changes-on-this-device-${lang}.txt`;
}

/** Every entry as plain text, newest first. */
export function editLogToText(log: readonly EditEntry[], lang: Lang): string {
  const ui = EDITLOG_UI[lang];
  const body = log.length === 0 ? ui.none : [...log].reverse().map((e) => `- ${entryLine(e, lang)}`).join('\n');
  return `${ui.title}\n\n${body}\n`;
}

/** The panel: the newest changes first, a count, and the save button when the host takes files. */
export function renderEditLog(log: readonly EditEntry[], lang: Lang, canExport: boolean, limit = MAX_EDITS_SHOWN): string {
  const ui = EDITLOG_UI[lang];
  const intro = `<p>${escapeHtml(ui.intro)}</p>`;
  if (log.length === 0) return `${intro}<p class="gl-note">${escapeHtml(ui.none)}</p>`;
  const shown = [...log].reverse().slice(0, Math.max(0, limit));
  const items = shown.map((e) => `<li>${escapeHtml(entryLine(e, lang))}</li>`).join('');
  const button = canExport ? `<div class="gl-actions"><button type="button" class="gl-btn" id="${EDITLOG_EXPORT_ID}">${escapeHtml(ui.exportLog)}</button></div>` : '';
  return `${intro}<p role="status">${escapeHtml(ui.count(log.length))}</p><ol class="gl-editlog" reversed>${items}</ol>${button}`;
}
