/**
 * A short note a person can keep for a day of observing, such as the weather or who came along.
 * Pure functions over a plain map. The note is the person's own words and is never read for
 * meaning, never attached to a record, and never exported with the observations.
 */
import { isIsoDay } from '../presubmit/text.js';

export type DayNotes = Readonly<Record<string, string>>;

export const MAX_DAY_NOTE = 500;
export const MAX_DAY_NOTES = 366;

export function cleanNoteText(value: unknown): string {
  if (typeof value !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  const text = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\r\n?/g, '\n').trim();
  return Array.from(text).slice(0, MAX_DAY_NOTE).join('');
}

/** Keeps well-formed entries only: a real day as the key and non-empty text. The newest days win when there are too many. */
export function cleanDayNotes(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const entries: [string, string][] = [];
  for (const [day, text] of Object.entries(value as Record<string, unknown>)) {
    if (!isIsoDay(day)) continue;
    const clean = cleanNoteText(text);
    if (clean !== '') entries.push([day, clean]);
  }
  entries.sort((a, b) => b[0].localeCompare(a[0]));
  return Object.fromEntries(entries.slice(0, MAX_DAY_NOTES));
}

export type SetNoteResult = { ok: true; notes: Record<string, string> } | { ok: false; reason: 'not-a-day' | 'too-many' };

/** Sets or, for empty text, removes the note for a day. Returns a new map. */
export function setDayNote(notes: DayNotes, day: string, text: string): SetNoteResult {
  if (!isIsoDay(day)) return { ok: false, reason: 'not-a-day' };
  const clean = cleanNoteText(text);
  const next: Record<string, string> = { ...notes };
  if (clean === '') {
    delete next[day];
    return { ok: true, notes: next };
  }
  if (next[day] === undefined && Object.keys(next).length >= MAX_DAY_NOTES) return { ok: false, reason: 'too-many' };
  next[day] = clean;
  return { ok: true, notes: next };
}

export function dayNoteFor(notes: DayNotes, day: string): string {
  return notes[day] ?? '';
}

export function noteLength(text: string): number {
  return Array.from(cleanNoteText(text)).length;
}
