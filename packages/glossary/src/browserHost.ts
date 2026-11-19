import type { IndexStore } from './offlineIndex';
import type { Place } from './places';
import type { Lang } from './plainTerms';
import { recordsFromCsv, recordsToCsv } from './recordsCsv';
import type { ExportFile } from './textExport';

/**
 * The small pieces a browser page needs to host the place finder: where things are kept on the
 * device, today's date, which view the address asks for, saving a file and reading text aloud.
 * Each takes what it needs as an argument, so it can be tested without a browser. Nothing here
 * sends anything anywhere.
 */

/** The part of Storage that is used. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * A store that never throws. Browsers can refuse storage (private windows, a full disk, a policy).
 * Then values are kept in memory for this visit, so the page still works.
 */
export function safeStore(storage: StorageLike | null | undefined): IndexStore {
  const memory = new Map<string, string>();
  return {
    getItem(key: string): string | null {
      if (memory.has(key)) return memory.get(key) ?? null;
      try {
        return storage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    setItem(key: string, value: string): void {
      try {
        if (storage === null || storage === undefined) throw new Error('no storage');
        storage.setItem(key, value);
        memory.delete(key);
      } catch {
        memory.set(key, value);
      }
    },
  };
}

/** Gets the browser's storage, or null when the browser will not give it. */
export function openStorage(get: () => StorageLike | null | undefined): StorageLike | null {
  try {
    return get() ?? null;
  } catch {
    return null;
  }
}

/** The local calendar date as YYYY-MM-DD. */
export function todayIso(now: Date): string {
  const pad = (n: number, w: number): string => String(n).padStart(w, '0');
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1, 2)}-${pad(now.getDate(), 2)}`;
}

export const VIEWS = ['terms', 'places'] as const;
export type PageView = (typeof VIEWS)[number];

export const PLACES_HASH = '#places';

/**
 * The view an address asks for. "#places" is the places view, and so is "#places?…", because the
 * finder keeps its choices after the question mark. Anything else is the terms view.
 */
export function viewFromHash(hash: string): PageView {
  return hash === PLACES_HASH || hash.startsWith(`${PLACES_HASH}?`) ? 'places' : 'terms';
}

export function hashForView(view: PageView): string {
  return view === 'places' ? PLACES_HASH : '#terms';
}

/** The finder's own part of the address: what follows "#places?". Empty in any other view. */
export function finderHash(hash: string): string {
  return hash.startsWith(`${PLACES_HASH}?`) ? hash.slice(PLACES_HASH.length + 1) : '';
}

/** The address for the places view with the finder's choices. No question mark when there are none. */
export function withFinderHash(choices: string): string {
  const clean = choices.replace(/^[#?]+/, '');
  return clean === '' ? PLACES_HASH : `${PLACES_HASH}?${clean}`;
}

export const HOST_RECORDS_KEY = 'glossary-host-records';

/** The places kept on this device, or none. A stored table that cannot be read is ignored. */
export function loadStoredPlaces(store: IndexStore): readonly Place[] {
  const csv = store.getItem(HOST_RECORDS_KEY);
  if (csv === null || csv === '') return [];
  const result = recordsFromCsv(csv);
  return result.problems.length === 0 ? result.places : [];
}

/** Keeps the places on this device, each record with its own source, licence, date and tier. */
export function storePlaces(store: IndexStore, places: readonly Place[]): void {
  store.setItem(HOST_RECORDS_KEY, recordsToCsv(places));
}

/** What saving a file needs from the page. */
export interface DownloadHost {
  /** Makes an address for the text, such as URL.createObjectURL(new Blob([text], { type })). */
  createUrl(text: string, mime: string): string;
  revokeUrl(url: string): void;
  /** Starts the download, such as by clicking a link with the download attribute. */
  click(url: string, filename: string): void;
}

/** A file name with nothing but letters, digits, dots, dashes and underscores. Never empty. */
export function safeFilename(name: string): string {
  const clean = name.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[-.]+|-+$/g, '');
  return clean === '' ? 'file.txt' : clean.slice(0, 100);
}

/** Saves a file on the device. Returns false when the page could not do it; nothing is thrown. */
export function downloadFile(file: ExportFile, host: DownloadHost): boolean {
  let url = '';
  try {
    url = host.createUrl(file.text, file.mime);
    host.click(url, safeFilename(file.filename));
    return true;
  } catch {
    return false;
  } finally {
    if (url !== '') {
      try {
        host.revokeUrl(url);
      } catch {
        // The address goes away with the page.
      }
    }
  }
}

/** What reading aloud needs from the page. */
export interface SpeechHost {
  cancel(): void;
  speak(text: string, langTag: string): void;
}

export function speechTag(lang: Lang): string {
  return lang === 'fr' ? 'fr-CA' : 'en-CA';
}

/** Says the text in the language given, after stopping anything being said. Empty text only stops. */
export function speakText(text: string, lang: Lang, host: SpeechHost): boolean {
  try {
    host.cancel();
    const clean = text.replace(/\s+/g, ' ').trim();
    if (clean === '') return false;
    host.speak(clean, speechTag(lang));
    return true;
  } catch {
    return false;
  }
}
