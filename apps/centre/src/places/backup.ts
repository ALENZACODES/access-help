/**
 * A backup file of everything this App keeps on the device: packs, the
 * person's own observations, saved places with notes,  saved searches, day
 * notes, measures, asks, what places said, the person's own numbers, the place cards they received, and display settings.
 * It is made and read on the device. Nothing is sent.
 *
 * Restoring adds to what is already here and removes nothing. Every part of a
 * backup file goes through the same checks as a fresh load: packs are parsed
 * again, so an unrecognised status becomes UNKNOWN; observations go through the
 * export rules, so one without a source or an open licence is left out; saved
 * places are cleaned; day notes are cleaned and a day that already has a note
 * on the device keeps it; measures are cleaned and added only for an observation
 * that is saved and has none, and the same goes for asks and for what places
 * said. If any write fails, everything is put back as it was.
 */
import { ASKS_KEY, createAskStore, createToldStore, TOLD_KEY } from "./askStore.js";
import { createCardsStore, RECEIVED_CARDS_KEY } from "./cardsStore.js";
import { cleanPrefs, PREFS_KEY, savePrefs, type Prefs } from "../settings/prefs.js";
import { createDayNotesStore, DAY_NOTES_KEY } from "./dayNotesStore.js";
import {
  buildExport,
  cleanDayNotes,
  cleanMatchCriteria,
  hasMatchCriteria,
  mergeAskLogs,
  mergeMatchSetBooks,
  mergeMeasureBooks,
  mergeReceivedCards,
  readAskLog,
  readMatchSetBook,
  readMeasureBook,
  readReceivedCards,
  serializePack,
  type AskLog,
  type DayNotes,
  type MatchCriteria,
  type MatchSetBook,
  type MeasureBook,
  type ReceivedCardBook,
} from "./docs-bridge.js";
import { createMatchStore, MATCH_CURRENT_KEY, MATCH_SETS_KEY } from "./matchStore.js";
import { createMeasuresStore, MEASURES_KEY } from "./measuresStore.js";
import { parsePack } from "./pack.js";
import { cleanPresets, createPresetStore, PRESETS_KEY, type SearchPreset } from "./presets.js";
import { cleanSaved, createSavedStore, SAVED_KEY, type SavedPlace } from "./saved.js";
import {
  createDraftStore,
  createPackLibrary,
  DRAFTS_KEY,
  LIBRARY_KEY,
  MAX_DRAFTS,
  MAX_PACKS,
  PACK_KEY,
  type KeyValueStorage,
} from "./store.js";
import type { ParsedPack, PlaceRecord } from "./types.js";

export const BACKUP_APP = "the-app-device-backup";
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_CHARACTERS = 6_000_000;

export interface BackupFile {
  app: typeof BACKUP_APP;
  v: typeof BACKUP_VERSION;
  createdOn: string;
  /** Each entry is a pack file, as written by serializePack. */
  packs: string[];
  drafts: PlaceRecord[];
  saved: SavedPlace[];
  /** Saved searches. A backup made before saved searches existed has none. */
  presets: SearchPreset[];
  /** The person's notes for their days of observing, by day. A backup made before day notes existed has none. */
  dayNotes: DayNotes;
  /** What the person measured at their own observations. A backup made before measures existed has none. */
  measures: MeasureBook;
  /** The person's own list of the times they asked a place. A backup made before asks existed has none. */
  asks: AskLog;
  /** What places told the person, kept apart from what they measured. */
  told: MeasureBook;
  /** The numbers the person set to look through their places, and their named sets. */
  numbers: { current: MatchCriteria; sets: MatchSetBook };
  /** Place cards other people handed to the person. They stay apart from the person's own facts. */
  receivedCards: ReceivedCardBook;
  prefs: Prefs | null;
}

function readPrefs(storage: KeyValueStorage): Prefs | null {
  try {
    const raw = storage.getItem(PREFS_KEY);
    return raw === null ? null : cleanPrefs(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function createBackup(storage: KeyValueStorage, today: string): string {
  const file: BackupFile = {
    app: BACKUP_APP,
    v: BACKUP_VERSION,
    createdOn: today,
    packs: createPackLibrary(storage)
      .list()
      .map((pack) => serializePack(pack.records, pack.manifest)),
    drafts: createDraftStore(storage).list(),
    saved: createSavedStore(storage).list(),
    presets: createPresetStore(storage).list(),
    dayNotes: createDayNotesStore(storage).read(),
    measures: createMeasuresStore(storage).read(),
    asks: createAskStore(storage).read(),
    told: createToldStore(storage).read(),
    numbers: { current: createMatchStore(storage).current(), sets: createMatchStore(storage).sets() },
    receivedCards: createCardsStore(storage).read(),
    prefs: readPrefs(storage),
  };
  return JSON.stringify(file, null, 2);
}

export type RestoreFailure = "too-large" | "not-json" | "not-a-backup" | "unsupported-version" | "empty" | "storage-failed";

export interface RestoreSummary {
  packs: number;
  drafts: number;
  saved: number;
  presets: number;
  /** Day notes added. A day that already had a note on the device is left as it was. */
  dayNotes: number;
  /** Observations that gained measures. One that already had measures on the device keeps them. */
  measures: number;
  /** Asks added to the person's list. */
  asks: number;
  /** Observations that gained what a place said. */
  told: number;
  /** Named sets of numbers added. A set whose name is already on the device is left as it is. */
  numberSets: number;
  /** Received place cards added. A card that is already on the device is not added twice. */
  receivedCards: number;
  prefsRestored: boolean;
  /** Packs, observations, saved places, searches, or day notes in the file that could not be read or did not fit. */
  skipped: number;
}

export type RestoreResult = { ok: true; summary: RestoreSummary; prefs: Prefs | null } | { ok: false; code: RestoreFailure };

const KEYS = [LIBRARY_KEY, PACK_KEY, DRAFTS_KEY, SAVED_KEY, PRESETS_KEY, DAY_NOTES_KEY, MEASURES_KEY, ASKS_KEY, TOLD_KEY, MATCH_SETS_KEY, MATCH_CURRENT_KEY, RECEIVED_CARDS_KEY, PREFS_KEY] as const;

function snapshot(storage: KeyValueStorage): Map<string, string | null> {
  return new Map(KEYS.map((key) => [key, storage.getItem(key)]));
}

function rollback(storage: KeyValueStorage, before: ReadonlyMap<string, string | null>): void {
  for (const [key, value] of before) {
    try {
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
    } catch {
      /* the device refuses writes; nothing more can be done */
    }
  }
}

export function restoreBackup(text: string, storage: KeyValueStorage): RestoreResult {
  if (text.length > MAX_BACKUP_CHARACTERS) return { ok: false, code: "too-large" };
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, code: "not-json" };
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return { ok: false, code: "not-a-backup" };
  const file = value as Record<string, unknown>;
  if (file.app !== BACKUP_APP) return { ok: false, code: "not-a-backup" };
  if (file.v !== BACKUP_VERSION) return { ok: false, code: "unsupported-version" };

  let skipped = 0;

  const packs: ParsedPack[] = [];
  const packTexts = Array.isArray(file.packs) ? file.packs : [];
  for (const item of packTexts) {
    const parsed = typeof item === "string" ? parsePack(item) : null;
    if (parsed?.ok) packs.push(parsed.pack);
    else skipped += 1;
  }

  const draftInput = Array.isArray(file.drafts) ? (file.drafts as never[]) : [];
  const built = buildExport(draftInput);
  skipped += built.rejected.length + (draftInput.length - built.records.length - built.rejected.length);

  const savedInput = Array.isArray(file.saved) ? file.saved : [];
  const saved = cleanSaved(savedInput);
  skipped += savedInput.length - saved.length;

  const presetInput = Array.isArray(file.presets) ? file.presets : [];
  const presets = cleanPresets(presetInput);
  skipped += presetInput.length - presets.length;

  const noteInput = typeof file.dayNotes === "object" && file.dayNotes !== null && !Array.isArray(file.dayNotes) ? (file.dayNotes as Record<string, unknown>) : {};
  const dayNotes = cleanDayNotes(noteInput);
  skipped += Object.keys(noteInput).length - Object.keys(dayNotes).length;

  const measureRead = readMeasureBook(file.measures);
  skipped += measureRead.dropped;
  const askRead = readAskLog(file.asks);
  skipped += askRead.dropped;
  const toldRead = readMeasureBook(file.told);
  skipped += toldRead.dropped;
  const numbersInput = typeof file.numbers === "object" && file.numbers !== null && !Array.isArray(file.numbers) ? (file.numbers as Record<string, unknown>) : {};
  const numbersCurrent = cleanMatchCriteria(numbersInput.current);
  const setsRead = readMatchSetBook(numbersInput.sets);
  skipped += setsRead.dropped;
  const cardsRead = readReceivedCards(file.receivedCards);
  skipped += cardsRead.dropped;

  const prefs = file.prefs === null || file.prefs === undefined ? null : cleanPrefs(file.prefs);

  if (packs.length === 0 && built.records.length === 0 && saved.length === 0 && presets.length === 0 && Object.keys(dayNotes).length === 0 && measureRead.book.entries.length === 0 && askRead.log.entries.length === 0 && toldRead.book.entries.length === 0 && setsRead.book.sets.length === 0 && !hasMatchCriteria(numbersCurrent) && cardsRead.book.cards.length === 0 && prefs === null) {
    return { ok: false, code: "empty" };
  }

  const before = snapshot(storage);
  const library = createPackLibrary(storage);
  const drafts = createDraftStore(storage);
  const savedStore = createSavedStore(storage);
  const presetStore = createPresetStore(storage);
  const noteStore = createDayNotesStore(storage);
  let dayNotesAdded = 0;
  const measureStore = createMeasuresStore(storage);
  let measuresAdded = 0;
  const askStore = createAskStore(storage);
  const toldStore = createToldStore(storage);
  let asksAdded = 0;
  let toldAdded = 0;
  const matchStore = createMatchStore(storage);
  let setsAdded = 0;
  const cardsStore = createCardsStore(storage);
  let cardsAdded = 0;
  let presetsAdded = 0;
  let packsAdded = 0;
  let draftsAdded = 0;
  let savedAdded = 0;
  try {
    for (const pack of packs) {
      const result = library.save(pack);
      if (result.ok) packsAdded += 1;
      else if (result.reason === "too-many-packs") skipped += 1;
      else throw new Error(result.reason);
    }
    const knownDrafts = new Set(drafts.list().map((record) => record.id));
    for (const record of built.records) {
      if (knownDrafts.has(record.id)) continue;
      const result = drafts.add(record);
      if (result.ok) draftsAdded += 1;
      else if (result.reason === "too-many") skipped += 1;
      else throw new Error(result.reason);
    }
    const knownSaved = new Set(savedStore.list().map((entry) => entry.id));
    for (const entry of saved) {
      if (knownSaved.has(entry.id)) continue;
      const result = savedStore.add(entry);
      if (result.ok) savedAdded += 1;
      else if (result.reason === "too-many") skipped += 1;
      else throw new Error(result.reason);
    }
    const knownPresets = new Set(presetStore.list().map((entry) => entry.id));
    for (const entry of presets) {
      if (knownPresets.has(entry.id)) continue;
      const result = presetStore.add(entry);
      if (result.ok) presetsAdded += 1;
      else if (result.reason === "too-many") skipped += 1;
      else throw new Error(result.reason);
    }
    const knownNotes = noteStore.read();
    for (const [day, text] of Object.entries(dayNotes)) {
      if (day in knownNotes) continue;
      const result = noteStore.save(day, text);
      if (result.ok) dayNotesAdded += 1;
      else if (result.reason === "too-many" || result.reason === "not-a-day") skipped += 1;
      else throw new Error(result.reason);
    }
    if (measureRead.book.entries.length > 0) {
      // Measures belong to an observation, so they are added only for one that is saved after the restore.
      const merged = mergeMeasureBooks(measureStore.read(), measureRead.book, drafts.list().map((record) => record.id));
      if (merged.added > 0 && !measureStore.replace(merged.book).ok) throw new Error("measures");
      measuresAdded = merged.added;
      skipped += merged.skipped;
    }
    if (askRead.log.entries.length > 0) {
      const merged = mergeAskLogs(askStore.read(), askRead.log, drafts.list().map((record) => record.id));
      if (merged.added > 0 && !askStore.replace(merged.log).ok) throw new Error("asks");
      asksAdded = merged.added;
      skipped += merged.skipped;
    }
    if (toldRead.book.entries.length > 0) {
      const merged = mergeMeasureBooks(toldStore.read(), toldRead.book, drafts.list().map((record) => record.id));
      if (merged.added > 0 && !toldStore.replace(merged.book).ok) throw new Error("told");
      toldAdded = merged.added;
      skipped += merged.skipped;
    }
    if (setsRead.book.sets.length > 0) {
      const merged = mergeMatchSetBooks(matchStore.sets(), setsRead.book);
      if (merged.added > 0 && !matchStore.replaceSets(merged.book).ok) throw new Error("number sets");
      setsAdded = merged.added;
      skipped += merged.skipped;
    }
    // The numbers in use come back only when the device has none set, so a restore never changes what the person is looking at.
    if (hasMatchCriteria(numbersCurrent) && !hasMatchCriteria(matchStore.current()) && !matchStore.setCurrent(numbersCurrent).ok) throw new Error("numbers");
    if (cardsRead.book.cards.length > 0) {
      const merged = mergeReceivedCards(cardsStore.read(), cardsRead.book);
      if (merged.added > 0 && !cardsStore.replace(merged.book).ok) throw new Error("received cards");
      cardsAdded = merged.added;
      skipped += merged.skipped;
    }
    if (prefs !== null && !savePrefs(storage, prefs)) throw new Error("prefs");
  } catch {
    rollback(storage, before);
    return { ok: false, code: "storage-failed" };
  }

  return {
    ok: true,
    prefs,
    summary: { packs: packsAdded, drafts: draftsAdded, saved: savedAdded, presets: presetsAdded, dayNotes: dayNotesAdded, measures: measuresAdded, asks: asksAdded, told: toldAdded, numberSets: setsAdded, receivedCards: cardsAdded, prefsRestored: prefs !== null, skipped },
  };
}

export { MAX_DRAFTS, MAX_PACKS };
