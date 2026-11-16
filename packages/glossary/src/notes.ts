/**
 * A person's own notes about places. Kept on this device. A note is never a source:
 * it does not change what is reported about a place, and unknown stays Unknown.
 */
export const MAX_NOTE_LENGTH = 500;
export const MAX_NOTES = 200;
export const NOTES_STORE_KEY = 'glossary-place-notes';

export type Notes = Readonly<Record<string, string>>;

/** Trims, cuts to the limit and removes control characters except new lines. */
export function cleanNote(text: string): string {
  // eslint-disable-next-line no-control-regex
  const kept = text.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '');
  return Array.from(kept.trim()).slice(0, MAX_NOTE_LENGTH).join('');
}

/** An empty note removes the entry. The oldest notes are dropped past MAX_NOTES. */
export function setNote(notes: Notes, placeId: string, text: string): Notes {
  const next: Record<string, string> = { ...notes };
  delete next[placeId];
  const clean = cleanNote(text);
  if (clean !== '') next[placeId] = clean;
  const ids = Object.keys(next);
  if (ids.length > MAX_NOTES) for (const id of ids.slice(0, ids.length - MAX_NOTES)) delete next[id];
  return next;
}

export function getNote(notes: Notes, placeId: string): string {
  return Object.prototype.hasOwnProperty.call(notes, placeId) ? (notes[placeId] ?? '') : '';
}

/** Keeps only notes for places that exist. */
export function pruneNotes(notes: Notes, ids: readonly string[]): Notes {
  const known = new Set(ids);
  return Object.fromEntries(Object.entries(notes).filter(([id]) => known.has(id)));
}

export function serialiseNotes(notes: Notes): string {
  return JSON.stringify(notes);
}

/** Null unless the text is a JSON object of strings. Bad entries are dropped. */
export function parseNotes(json: string): Notes | null {
  try {
    const raw: unknown = JSON.parse(json);
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
    let out: Notes = {};
    for (const [id, value] of Object.entries(raw)) {
      if (typeof value === 'string') out = setNote(out, id, value);
    }
    return out;
  } catch {
    return null;
  }
}

export const NOTE_UI = {
  en: {
    label: (name: string): string => `Your note about ${name} (kept on this device)`,
    hint: 'Only you can see this. It does not change what is reported.',
    copy: (name: string): string => `Copy ${name} as text`,
    copyShort: 'Copy as text',
    yourNote: 'Your note',
  },
  fr: {
    label: (name: string): string => `Votre note sur ${name} (gardée sur cet appareil)`,
    hint: 'Vous seul pouvez la voir. Elle ne change pas ce qui est signalé.',
    copy: (name: string): string => `Copier ${name} en texte`,
    copyShort: 'Copier en texte',
    yourNote: 'Votre note',
  },
} as const;
